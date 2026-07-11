import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;

    // Si l'utilisateur est ADMIN, on lui montre toutes les demandes de devis
    if (user.role === 'ADMIN') {
      // Auto-initialisation des profils admin s'ils n'existent pas
      const adminProfilesCount = await prisma.adminProfile.count();
      if (adminProfilesCount === 0) {
        await prisma.adminProfile.createMany({
          data: [
            { name: 'SAIF' },
            { name: 'AMINE' },
            { name: 'SAIFALLAH' }
          ],
          skipDuplicates: true
        });
      }

      const quotes = await prisma.quote.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          managedBy: true
        }
      });
      return NextResponse.json(quotes);
    }

    // Sinon (client ou pro), on filtre par son adresse e-mail
    const quotes = await prisma.quote.findMany({
      where: {
        clientEmail: user.email || ''
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true
      }
    });
    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Quotes GET error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      clientName, 
      clientEmail, 
      brand, 
      model, 
      vin, 
      mileage, 
      remarks, 
      photo, 
      items,
      fileBase64,
      fileFormat,
      fileName
    } = body;

    if (!clientName || !clientEmail) {
      return NextResponse.json({ error: 'Nom et Email requis' }, { status: 400 });
    }

    const newQuote = await prisma.quote.create({
      data: {
        clientName,
        clientEmail,
        brand,
        model,
        vin,
        mileage: parseFloat(mileage) || 0,
        remarks,
        photo,
        status: 'PENDING',
        items: {
          create: (items || []).map((item: any) => ({
            reference: item.reference || '',
            designation: item.designation || '',
            quantity: parseInt(item.quantity) || 1,
          })),
        },
      },
      include: {
        items: true,
      }
    });

    // Envoi automatique de l'e-mail de confirmation au client ET au service comptoir
    try {
      const itemsListText = (items || []).map((item: any) => `<li>${item.designation} (Réf: ${item.reference || 'N/A'}) x ${item.quantity}</li>`).join('');
      
      const attachments = fileBase64 && fileName ? [{
        filename: fileName,
        content: fileBase64
      }] : [];

      await sendEmail({
        to: [clientEmail, 'comptoir.distribution@autop.tn'],
        subject: `Confirmation de votre demande de devis AUTOP - #${newQuote.id.slice(-6).toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <div style="text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
              <h2 style="color: #dc2626; margin: 0;">AUTOP TUNISIE</h2>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Demande de devis enregistrée</p>
            </div>
            <p>Bonjour <strong>${clientName}</strong>,</p>
            <p>Nous vous confirmons la bonne réception de votre demande de devis pour le véhicule <strong>${brand} ${model}</strong>.</p>
            ${vin ? `<p><strong>Numéro VIN (Châssis) :</strong> <code style="background: #f4f4f5; padding: 2px 6px; border-radius: 4px;">${vin}</code></p>` : ''}
            ${remarks ? `<p><strong>Remarques :</strong> ${remarks}</p>` : ''}
            <h3 style="color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Pièces demandées :</h3>
            <ul>
              ${itemsListText}
            </ul>
            <p>Le document récapitulatif a été joint à cet e-mail au format <strong>${(fileFormat || 'pdf').toUpperCase()}</strong>.</p>
            <p>Notre équipe commerciale étudie actuellement votre demande et reviendra vers vous très rapidement avec nos meilleures propositions de tarifs.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">AUTOP Tunisie - Pièces de rechange neuves de qualité.</p>
          </div>
        `,
        attachments
      });
    } catch (mailError) {
      console.error('Email confirmation send failed:', mailError);
    }

    return NextResponse.json(newQuote, { status: 201 });
  } catch (error) {
    console.error('Quotes POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors du traitement' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { quoteId, managedByName, status } = body;

    if (!quoteId) {
      return NextResponse.json({ error: 'Identifiant de demande requis' }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;

    if (managedByName !== undefined) {
      if (managedByName === null || managedByName === 'NON ASSIGNÉ') {
        data.managedById = null;
      } else {
        let profile = await prisma.adminProfile.findUnique({
          where: { name: managedByName }
        });
        if (!profile) {
          profile = await prisma.adminProfile.create({
            data: { name: managedByName }
          });
        }
        data.managedById = profile.id;
      }
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data,
      include: {
        managedBy: true,
        items: true
      }
    });

    return NextResponse.json({ success: true, data: updatedQuote });
  } catch (error) {
    console.error('Quotes PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la mise à jour' }, { status: 500 });
  }
}