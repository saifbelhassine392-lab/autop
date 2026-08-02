import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { reference, imageUrl } = await req.json();

    if (!reference || !imageUrl) {
      return NextResponse.json({ error: 'Référence ou URL manquante' }, { status: 400 });
    }

    const uppercaseRef = reference.toUpperCase().trim();

    // Find the main product
    const product = await prisma.product.findFirst({
      where: { reference: uppercaseRef }
    });

    let updatedMain = null;
    if (product) {
      updatedMain = await prisma.product.update({
        where: { id: product.id },
        data: { images: JSON.stringify([imageUrl]) }
      });
    }

    // Find equivalent products that have this reference in their compatible array
    // Since compatible is a stringified JSON array, we can use contains
    const equivalents = await prisma.product.findMany({
      where: {
        compatible: {
          contains: uppercaseRef
        }
      }
    });

    let updatedEquivalents = 0;
    for (const eq of equivalents) {
      // Precise check to ensure it's not a partial match in JSON string
      try {
        const compArr = JSON.parse(eq.compatible || '[]');
        if (compArr.includes(uppercaseRef)) {
          await prisma.product.update({
            where: { id: eq.id },
            data: { images: JSON.stringify([imageUrl]) }
          });
          updatedEquivalents++;
        }
      } catch (e) {}
    }

    if (!product && updatedEquivalents === 0) {
       return NextResponse.json({ success: false, message: 'Référence introuvable en base.' });
    }

    return NextResponse.json({ 
      success: true, 
      product: updatedMain, 
      updatedEquivalents 
    });

  } catch (error: any) {
    console.error('Bulk image update error:', error);
    return NextResponse.json({ error: 'Erreur serveur', details: error.message }, { status: 500 });
  }
}
