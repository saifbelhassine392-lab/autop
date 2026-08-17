import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveProductImage } from '@/lib/productImageResolver';

export async function POST() {
  try {
    const products = await prisma.product.findMany({
      include: { category: true }
    });

    let updatedCount = 0;

    for (const p of products) {
      let hasValidImage = false;
      if (p.images && p.images !== '[]' && p.images.trim()) {
        try {
          const parsed = JSON.parse(p.images);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) hasValidImage = true;
        } catch {
          if (p.images.startsWith('http') || p.images.startsWith('/')) hasValidImage = true;
        }
      }

      if (!hasValidImage) {
        const resolved = resolveProductImage({
          reference: p.reference,
          sku: p.sku,
          name: p.name,
          category: p.category
        });

        await prisma.product.update({
          where: { id: p.id },
          data: {
            images: JSON.stringify([resolved])
          }
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      total: products.length,
      enriched: updatedCount,
      message: `${updatedCount} articles enrichis avec succès.`
    });
  } catch (error: any) {
    console.error('Erreur auto-enrichissement:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
