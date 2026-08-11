import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { supplierName, quoteNumber, items, date } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Aucun article à importer" }, { status: 400 });
    }

    const suppName = (supplierName || "Fournisseur Email").trim();
    let imported = 0;
    let updated = 0;

    const recordDate = date ? new Date(date) : new Date();

    for (const item of items) {
      const ref = String(item.reference || '').trim().toUpperCase();
      if (!ref) continue;

      const price = parseFloat(item.unitPrice || item.price || 0) || 0;
      const discount = parseFloat(item.discount || 0) || 0;
      const desig = item.designation || `Article ${ref}`;
      const brand = (item.brand || suppName).toUpperCase().trim();
      const qty = parseInt(item.quantity || item.stock || 1, 10) || 1;

      const existing = await prisma.partPriceHistory.findFirst({
        where: {
          reference: ref,
          source: "EMAIL",
          supplierName: suppName
        }
      });

      if (existing) {
        await prisma.partPriceHistory.update({
          where: { id: existing.id },
          data: {
            purchasePrice: price,
            sellingPrice: price * 1.25,
            discount,
            stock: qty,
            designation: desig,
            brand,
            sourceDetails: quoteNumber ? `Devis Email #${quoteNumber}` : "Devis par Email",
            date: recordDate,
            updatedAt: new Date()
          }
        });
        updated++;
      } else {
        await prisma.partPriceHistory.create({
          data: {
            reference: ref,
            designation: desig,
            brand,
            type: "ADAPTABLE",
            purchasePrice: price,
            sellingPrice: price * 1.25,
            discount,
            stock: qty,
            supplierName: suppName,
            source: "EMAIL",
            sourceDetails: quoteNumber ? `Devis Email #${quoteNumber}` : "Devis par Email",
            date: recordDate
          }
        });
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import terminé : ${imported} ajoutés, ${updated} mis à jour.`,
      data: { imported, updated, total: items.length }
    });
  } catch (error: any) {
    console.error("[API Email Import] Erreur:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
