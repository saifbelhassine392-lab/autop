import { NextResponse } from 'next/server';
import { fetchAndParseGoogleSheet } from '@/lib/googleSheets';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { url, sheetUrl, previewOnly, defaultSupplier, sheetName } = body;
    const targetUrl = url || sheetUrl;

    if (!targetUrl) {
      return NextResponse.json({ success: false, error: "URL Google Sheets requise" }, { status: 400 });
    }

    const parsed = await fetchAndParseGoogleSheet(targetUrl, defaultSupplier || "Google Sheets");

    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: true,
        data: parsed
      });
    }

    // Sauvegarde dans PartPriceHistory
    let imported = 0;
    let updated = 0;

    for (const item of parsed.items) {
      if (!item.reference) continue;

      const ref = item.reference.trim().toUpperCase();
      const suppName = item.supplierName || defaultSupplier || "Google Sheets";
      const costPrice = item.purchasePrice || 0;
      const sellPrice = item.sellingPrice || (costPrice ? costPrice * 1.25 : 0);
      const stock = item.stock || 0;
      const discount = item.discount || 0;
      const desig = item.designation || `Article ${ref}`;
      const brand = (item.brand || "ADAPTABLE").toUpperCase().trim();

      const existing = await prisma.partPriceHistory.findFirst({
        where: {
          reference: ref,
          source: "GOOGLE_SHEETS",
          supplierName: suppName
        }
      });

      if (existing) {
        await prisma.partPriceHistory.update({
          where: { id: existing.id },
          data: {
            purchasePrice: costPrice,
            sellingPrice: sellPrice,
            discount,
            stock,
            designation: desig,
            brand,
            sourceDetails: sheetName ? `Feuille : ${sheetName}` : "Google Sheets",
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
            purchasePrice: costPrice,
            sellingPrice: sellPrice,
            discount,
            stock,
            supplierName: suppName,
            source: "GOOGLE_SHEETS",
            sourceDetails: sheetName ? `Feuille : ${sheetName}` : "Google Sheets"
          }
        });
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronisation Google Sheets réussie : ${imported} ajoutés, ${updated} mis à jour.`,
      data: {
        imported,
        updated,
        total: parsed.items.length
      }
    });
  } catch (error: any) {
    console.error("[API Sheets Import] Erreur:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
