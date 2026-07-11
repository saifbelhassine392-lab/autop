import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    const body = await req.json();
    const { devisId, selectedFormat, fileBase64, fileName, shippingAddress, customerNote, modifiedItems, shippingMethod, paymentMethod } = body;

    if (!devisId) {
      return NextResponse.json({ success: false, error: 'ID Devis manquant' }, { status: 400 });
    }

    // Récupérer le devis
    const devis = await prisma.devis.findUnique({
      where: { id: devisId },
      include: { items: true }
    });

    if (!devis) {
      return NextResponse.json({ success: false, error: 'Devis introuvable' }, { status: 404 });
    }

    // Calculer le total et préparer les articles de la commande
    let subtotal = 0;
    let orderItemsData = [];

    if (modifiedItems && Array.isArray(modifiedItems) && modifiedItems.length > 0) {
      subtotal = modifiedItems.reduce((sum: number, item: any) => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQuantity = parseInt(item.quantity) || 1;
        const itemDiscount = parseFloat(item.discount) || 0;
        const itemTotal = itemPrice * itemQuantity * (1 - itemDiscount / 100);
        return sum + itemTotal;
      }, 0);

      orderItemsData = modifiedItems.map((item: any) => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQuantity = parseInt(item.quantity) || 1;
        const itemDiscount = parseFloat(item.discount) || 0;
        const itemTotal = itemPrice * itemQuantity * (1 - itemDiscount / 100);
        return {
          productId: item.productId || null,
          productName: item.name,
          sku: item.reference || 'N/A',
          price: itemPrice,
          quantity: itemQuantity,
          total: itemTotal
        };
      });
    } else {
      subtotal = devis.totalPrice || devis.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      orderItemsData = devis.items.map((item: any) => ({
        productId: item.productId || null,
        productName: item.name,
        sku: (item as any).reference || 'N/A',
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      }));
    }

    const actualShippingMethod = shippingMethod || 'standard';
    const isFreeMethod = actualShippingMethod === 'AU MAGASIN' || actualShippingMethod === 'PAR PROPRES MOYENS' || actualShippingMethod === 'POWER TRANSPORT';
    const shippingCost = isFreeMethod ? 0 : 7.90;

    const tax = (subtotal + shippingCost) * 0.19; // 19% TVA tunisienne
    const total = subtotal + shippingCost + tax;

    const orderCount = await prisma.order.count();
    const nextNumber = String(orderCount + 1).padStart(6, '0');
    const orderNumber = `CMD-${nextNumber}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: paymentMethod || 'CASH_ON_DELIVERY',
        shippingAddress: {
          street: shippingAddress || 'À spécifier',
          city: 'Tunis',
          zipCode: '2035',
          country: 'Tunisie',
          shippingMethod: actualShippingMethod
        },
        subtotal,
        shippingCost,
        tax,
        total,
        customerNote: customerNote || `Commande générée à partir du Devis #${devisId.slice(-6).toUpperCase()}`,
        items: {
          create: orderItemsData
        },
        statusHistory: {
          create: {
            status: 'PENDING',
            note: 'Bon de commande soumis par le client'
          }
        }
      },
      include: {
        items: true
      }
    });

    // Mettre à jour le devis pour refléter qu'il est commandé (completed)
    await prisma.devis.update({
      where: { id: devisId },
      data: { status: 'completed' }
    });

    // Envoyer l'e-mail de confirmation au comptoir et au client
    try {
      const itemsList = order.items.map(it => `<li>${it.productName} x ${it.quantity} - Price: ${it.price.toFixed(2)} TND</li>`).join('');
      const attachments = fileBase64 && fileName ? [{
        filename: fileName,
        content: fileBase64
      }] : [];

      await sendEmail({
        to: [user.email, 'comptoir.distribution@autop.tn'],
        subject: `Nouveau Bon de Commande AUTOP - #${order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">Bon de Commande Confirmé !</h2>
            <p>Bonjour,</p>
            <p>Le client <strong>${user.name || user.email}</strong> a validé son devis et généré un bon de commande.</p>
            <p><strong>Numéro de commande :</strong> ${order.orderNumber}</p>
            <p><strong>Adresse de livraison :</strong> ${shippingAddress || 'À spécifier'}</p>
            <p><strong>Note client :</strong> ${customerNote || 'Aucune'}</p>
            <h3 style="color: #1e293b;">Détails des articles commandés :</h3>
            <ul>
              ${itemsList}
            </ul>
            <p><strong>Montant Total TTC :</strong> ${order.total.toFixed(2)} TND (dont TVA 19%)</p>
            <p>Le Bon de Commande au format <strong>${selectedFormat.toUpperCase()}</strong> est joint à cet e-mail.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">AUTOP Tunisie - Comptoir de distribution.</p>
          </div>
        `,
        attachments
      });
    } catch (mailErr) {
      console.error('Failed to send order email:', mailErr);
    }

    return NextResponse.json({ success: true, data: order });
  } catch (err) {
    console.error('Order from devis error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur lors de la création de commande' }, { status: 500 });
  }
}
