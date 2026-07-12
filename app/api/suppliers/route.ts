import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { purchaseOrders: true } } }
    });
    return NextResponse.json({ success: true, data: suppliers });
  } catch (err) {
    console.error('Suppliers GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PROFESSIONAL')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { name, contactName, phone, email, address, city, b2bUrl, b2bLogin, b2bPassword } = body;

    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: { name, contactName, phone, email, address, city, b2bUrl, b2bLogin, b2bPassword }
    });
    return NextResponse.json({ success: true, data: supplier }, { status: 201 });
  } catch (err) {
    console.error('Supplier POST error:', err);
    return NextResponse.json({ error: 'Erreur création fournisseur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    const body = await req.json();
    const { id, name, contactName, phone, email, address, city, isActive } = body;
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const updated = await prisma.supplier.update({
      where: { id },
      data: { name, contactName, phone, email, address, city, isActive }
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Supplier PATCH error:', err);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}
