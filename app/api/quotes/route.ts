import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, ADMIN_NOTIFICATION_EMAIL } from '@/lib/email';
import { fetchProductionQuotes } from '@/lib/neonClient';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    const isAdmin = user.role === 'ADMIN';

    const where = isAdmin ? {} : {
      clientEmail: user.email?.trim().toLowerCase()
    };

    let quotes: any[] = [];
    try {
      quotes = await prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { items: true, managedBy: true }
      });
    } catch (dbErr) {
      console.warn("Prisma error in GET quotes:", dbErr);
    }

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
      fileName,
      photoName
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
        photoName,
        chassisPhoto: body.chassisPhoto,
        chassisPhotoName: body.chassisPhotoName,
        fileBase64,
        fileName,
        fileFormat,
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

    // Envoi automatique de l'e-mail réel de confirmation au client ET à l'administrateur
    try {
      const itemsRowsHtml = (items || []).map((item: any, idx: number) => `
        <tr style="border-bottom: 1px solid #f1f5f9; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 10px 12px; font-weight: bold; font-family: monospace; color: #dc2626;">${item.reference || 'N/A'}</td>
          <td style="padding: 10px 12px; color: #1e293b;">${item.designation || 'Pièce détachée'}</td>
          <td style="padding: 10px 12px; text-align: center; font-weight: bold; color: #0f172a;">${item.quantity || 1}</td>
        </tr>
      `).join('');
      
      const attachments: any[] = [];
      if (fileBase64 && fileName) {
        attachments.push({
          filename: fileName,
          content: Buffer.from(fileBase64, 'base64')
        });
      }
      if (photo && photo.includes('base64,')) {
        const base64Data = photo.split(',')[1];
        attachments.push({
          filename: photoName || `photo-${Date.now()}.jpg`,
          content: Buffer.from(base64Data, 'base64')
        });
      }
      if (body.chassisPhoto && body.chassisPhoto.includes('base64,')) {
        const base64Data = body.chassisPhoto.split(',')[1];
        attachments.push({
          filename: body.chassisPhotoName || `chassis-${Date.now()}.jpg`,
          content: Buffer.from(base64Data, 'base64')
        });
      }

      const hasAttachments = attachments.length > 0;
      const refFormatted = `#DEVIS-${newQuote.id.slice(-6).toUpperCase()}`;

      await sendEmail({
        to: [clientEmail, ADMIN_NOTIFICATION_EMAIL],
        subject: `🚗 [AUTOP] Demande de Devis ${refFormatted} - ${brand} ${model} (${(items || []).length} pièce(s))`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: #ffffff; padding: 20px 24px;">
              <h2 style="margin: 0; font-size: 22px; letter-spacing: 0.5px;">AUTOP TUNISIE</h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.95;">Comptoir de Distribution de Pièces de Rechange — Charguia 2</p>
              <div style="margin-top: 12px; display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px;">
                RÉFÉRENCE : ${refFormatted}
              </div>
            </div>

            <div style="padding: 24px;">
              <p style="font-size: 15px; margin-top: 0;">Bonjour <strong>${clientName}</strong>,</p>
              <p style="color: #475569; line-height: 1.5;">
                Nous vous confirmons la bonne réception de votre demande de devis pour le véhicule <strong>${brand} ${model}</strong>.
              </p>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 18px 0; font-size: 13px;">
                <div style="margin-bottom: 6px;"><strong>👤 Client :</strong> ${clientName} (${clientEmail})</div>
                <div style="margin-bottom: 6px;"><strong>🚗 Véhicule :</strong> ${brand} ${model}</div>
                ${vin ? `<div style="margin-bottom: 6px;"><strong>🆔 Châssis (VIN) :</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${vin}</code></div>` : ''}
                ${remarks ? `<div><strong>📝 Remarques :</strong> ${remarks}</div>` : ''}
              </div>

              <h3 style="color: #dc2626; border-bottom: 2px solid #fee2e2; padding-bottom: 8px; margin: 24px 0 12px 0; font-size: 15px;">
                📦 LISTE DES PIÈCES DEMANDÉES (${(items || []).length}) :
              </h3>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #1e293b; color: #ffffff; text-align: left;">
                    <th style="padding: 10px 12px;">RÉFÉRENCE</th>
                    <th style="padding: 10px 12px;">DÉSIGNATION</th>
                    <th style="padding: 10px 12px; text-align: center;">QTÉ</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRowsHtml}
                </tbody>
              </table>

              ${hasAttachments ? `<p style="color: #0369a1; font-weight: bold; background: #e0f2fe; padding: 10px 14px; border-radius: 6px; font-size: 12px;">📎 Fichiers joints à cet e-mail : ${attachments.length} document(s) / photo(s).</p>` : ''}

              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; line-height: 1.6;">
                Notre équipe commerciale traite votre demande en temps réel.<br/>
                Pour toute question urgente, contactez notre comptoir :<br/>
                📞 <strong>+216 98 774 525</strong> / <strong>+216 95 576 525</strong>
              </div>
            </div>

            <div style="background: #0f172a; color: #94a3b8; padding: 14px; text-align: center; font-size: 11px;">
              AUTOP Tunisie · Pièces de rechange neuves & certifiées · Charguia 2, Tunis
            </div>
          </div>
        `,
        attachments: hasAttachments ? attachments : undefined
      });
    } catch (mailError: any) {
      console.error('Email confirmation send failed:', mailError?.message || mailError);
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

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const user = session.user as any
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Identifiant de demande requis' }, { status: 400 })
    }

    const quote = await prisma.quote.findUnique({
      where: { id }
    })

    if (!quote) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && quote.clientEmail?.trim().toLowerCase() !== user.email?.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    await prisma.quote.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Demande supprimée avec succès' })
  } catch (error: any) {
    console.error('Error deleting quote:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la suppression' }, { status: 500 })
  }
}