import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: sessionUser.id },
          { email: sessionUser.email }
        ]
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        addresses: {
          orderBy: { isDefault: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('User profile GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la récupération du profil' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const sessionUser = session.user as any;
    const body = await req.json();
    const { name, firstName, lastName, phone, address, currentPassword, newPassword } = body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: sessionUser.id },
          { email: sessionUser.email }
        ]
      },
      include: { addresses: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    // Gestion du changement de mot de passe sécurisé
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' }, { status: 400 });
      }

      if (user.password) {
        if (!currentPassword) {
          return NextResponse.json({ error: 'Veuillez saisir votre mot de passe actuel pour le modifier.' }, { status: 400 });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return NextResponse.json({ error: 'Le mot de passe actuel est incorrect.' }, { status: 400 });
        }
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    // Mise à jour ou création de l'adresse par défaut si renseignée
    if (address && (address.street || address.city)) {
      const defaultAddr = user.addresses?.find(a => a.isDefault) || user.addresses?.[0];
      if (defaultAddr) {
        await prisma.address.update({
          where: { id: defaultAddr.id },
          data: {
            label: address.label || 'Adresse Principale',
            street: address.street || defaultAddr.street,
            city: address.city || defaultAddr.city,
            zipCode: address.zipCode || defaultAddr.zipCode,
            country: address.country || defaultAddr.country || 'Tunisie',
            isDefault: true
          }
        });
      } else {
        await prisma.address.create({
          data: {
            userId: user.id,
            label: address.label || 'Adresse Principale',
            street: address.street || '',
            city: address.city || '',
            zipCode: address.zipCode || '2035',
            country: address.country || 'Tunisie',
            isDefault: true
          }
        });
      }
    }

    // Récupérer les adresses à jour
    const updatedAddresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: { isDefault: 'desc' }
    });

    return NextResponse.json({
      success: true,
      message: 'Vos informations ont été mises à jour avec succès.',
      data: {
        ...updatedUser,
        addresses: updatedAddresses
      }
    });
  } catch (error: any) {
    console.error('User profile update error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour des informations: ' + error.message }, { status: 500 });
  }
}
