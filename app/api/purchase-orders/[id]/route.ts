import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSIONAL')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { status, notes, totalAmount } = body;

    const currentPO = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!currentPO) {
      return NextResponse.json({ error: 'Bon de commande introuvable' }, { status: 404 });
    }

    // Si le nouveau statut est RECEIVED (livré) et qu'il n'était pas déjà livré
    if (status === 'RECEIVED' && currentPO.status !== 'RECEIVED') {
      for (const item of currentPO.items) {
        if (item.reference) {
          const product = await prisma.product.findUnique({
            where: { reference: item.reference }
          });

          if (product) {
            await prisma.product.update({
              where: { id: product.id },
              data: {
                stock: product.stock + item.quantity
              }
            });
          }
        }
      }
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount) || 0;

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { items: true, supplier: true }
    });

    return NextResponse.json({ success: true, data: updatedPO });
  } catch (err) {
    console.error('Update PO error:', err);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSIONAL')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id } = params;
    await prisma.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Bon de commande fournisseur supprimé' });
  } catch (err: any) {
    console.error('Delete PO error:', err);
    return NextResponse.json({ error: 'Erreur lors de la suppression: ' + err.message }, { status: 500 });
  }
}
