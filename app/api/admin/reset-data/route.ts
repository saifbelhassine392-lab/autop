import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    const isAuthorized = user.role === 'ADMIN' || user.role === 'PROFESSIONAL';
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { target = 'ALL' } = body;

    let deletedDevis = 0;
    let deletedQuotes = 0;
    let deletedOrders = 0;
    let deletedPurchaseOrders = 0;

    if (target === 'ALL' || target === 'DEVIS' || target === 'ALL_DEVIS') {
      const res = await prisma.devis.deleteMany({});
      deletedDevis = res.count;
    }

    if (target === 'ALL' || target === 'QUOTES' || target === 'ALL_DEVIS') {
      const res = await prisma.quote.deleteMany({});
      deletedQuotes = res.count;
    }

    if (target === 'ALL' || target === 'ORDERS') {
      const res = await prisma.order.deleteMany({});
      deletedOrders = res.count;
    }

    if (target === 'ALL' || target === 'PURCHASE_ORDERS') {
      const res = await prisma.purchaseOrder.deleteMany({});
      deletedPurchaseOrders = res.count;
    }

    return NextResponse.json({
      success: true,
      message: 'Réinitialisation effectuée avec succès.',
      summary: {
        devis: deletedDevis,
        demandes: deletedQuotes,
        commandesClients: deletedOrders,
        commandesFournisseurs: deletedPurchaseOrders
      }
    });
  } catch (error: any) {
    console.error('Reset data error:', error);
    return NextResponse.json({ error: 'Erreur lors de la réinitialisation des données: ' + error.message }, { status: 500 });
  }
}
