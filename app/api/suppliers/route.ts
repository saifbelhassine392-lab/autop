import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ensureCatalogSeeded } from '@/lib/autoSeed';

const DEFAULT_SUPPLIER_NAMES = [
  { name: 'FAD', contactName: 'Service Commercial', phone: '+216 71 000 001', city: 'Tunis' },
  { name: 'STEQ', contactName: 'Service Ventes', phone: '+216 71 000 002', city: 'Tunis' },
  { name: 'CDG', contactName: 'Comptoir de Gros', phone: '+216 71 000 003', city: 'Tunis' },
  { name: 'SAGAP', contactName: 'Service Clients', phone: '+216 71 000 004', city: 'Sousse' },
  { name: 'AAP', contactName: 'Auto Accessoires', phone: '+216 71 000 005', city: 'Sfax' },
  { name: 'PROPARTS', contactName: 'Pro Parts', phone: '+216 71 000 006', city: 'Tunis' },
  { name: 'ITALCAR', contactName: 'Service Pièces', phone: '+216 71 000 007', city: 'Tunis' },
  { name: 'CARGROS', contactName: 'Car Gros', phone: '+216 71 000 008', city: 'Tunis' },
  { name: 'ALPHA FORD', contactName: 'Magasin Pièces', phone: '+216 71 000 009', city: 'Tunis' },
  { name: 'GPG', contactName: 'Gros Pièces Auto', phone: '+216 71 000 010', city: 'Tunis' },
  { name: 'UNIVERS AUTO', contactName: 'Univers Auto', phone: '+216 71 000 011', city: 'Tunis' },
  { name: 'STE ROUTE X', contactName: 'Route X Auto', phone: '+216 71 000 012', city: 'Tunis' },
  { name: 'SOPIC', contactName: 'Sopic Auto', phone: '+216 71 000 013', city: 'Tunis' },
  { name: 'SOCOFA GROS', contactName: 'Socofa Gros', phone: '+216 71 000 014', city: 'Tunis' }
];

async function ensureDefaultSuppliersSeeded() {
  try {
    const count = await prisma.supplier.count();
    if (count === 0) {
      for (const s of DEFAULT_SUPPLIER_NAMES) {
        await prisma.supplier.create({
          data: {
            name: s.name,
            contactName: s.contactName,
            phone: s.phone,
            city: s.city,
            isActive: true
          }
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Could not seed default suppliers:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureDefaultSuppliersSeeded();
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { purchaseOrders: true } } }
    });

    return NextResponse.json({ success: true, data: suppliers });
  } catch (err) {
    console.error('Suppliers GET error:', err);
    return NextResponse.json({ success: false, error: 'Erreur récupération fournisseurs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userRole = user?.role ? String(user.role).toUpperCase() : null;

    // Si authentifié par session, vérifier le rôle. Sinon, autoriser la création administrative
    if (user && userRole !== 'ADMIN' && userRole !== 'PROFESSIONAL') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { name, contactName, phone, email, address, city, b2bUrl, b2bLogin, b2bPassword } = body;

    if (!name || !name.trim()) return NextResponse.json({ error: 'Le nom du fournisseur est requis' }, { status: 400 });

    const trimmedName = name.trim().toUpperCase();
    const existing = await prisma.supplier.findFirst({ where: { name: trimmedName } });
    if (existing) {
      return NextResponse.json({ error: `Le fournisseur "${trimmedName}" existe déjà !`, data: existing }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: trimmedName,
        contactName: contactName?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        b2bUrl: b2bUrl?.trim() || null,
        b2bLogin: b2bLogin?.trim() || null,
        b2bPassword: b2bPassword?.trim() || null,
        isActive: true
      }
    });

    return NextResponse.json({ success: true, data: supplier }, { status: 201 });
  } catch (err: any) {
    console.error('Supplier POST error:', err);
    return NextResponse.json({ error: `Erreur création fournisseur: ${err.message || String(err)}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Supplier DELETE error:', err);
    return NextResponse.json({ error: 'Erreur suppression fournisseur' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, contactName, phone, email, address, city, isActive, b2bUrl, b2bLogin, b2bPassword } = body;
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim().toUpperCase() } : {}),
        ...(contactName !== undefined ? { contactName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {}),
        ...(b2bUrl !== undefined ? { b2bUrl } : {}),
        ...(b2bLogin !== undefined ? { b2bLogin } : {}),
        ...(b2bPassword !== undefined ? { b2bPassword } : {})
      }
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Supplier PATCH error:', err);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du fournisseur' }, { status: 500 });
  }
}

