import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/utils';
import { orderSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = (session.user as any).email;
    const userRole = (session.user as any).role;
    const isAdmin = userRole === 'ADMIN';

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    const where: any = {};
    if (!isAdmin) {
      where.OR = [
        { userId: userId },
        { user: { email: userEmail } }
      ];
    }
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: { firstName: true, lastName: true, email: true, name: true, phone: true },
          },
          managedBy: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Orders GET error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const sessionUser = session.user as any;
    let userId = sessionUser.id;

    // S'assurer que l'utilisateur existe dans la base de données
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: sessionUser.email }
        ]
      }
    });

    if (!dbUser && sessionUser.email) {
      dbUser = await prisma.user.create({
        data: {
          email: sessionUser.email.toLowerCase(),
          name: sessionUser.name || sessionUser.email.split('@')[0],
          role: sessionUser.role || 'CUSTOMER',
          status: 'ACTIVE'
        }
      });
      userId = dbUser.id;
    } else if (dbUser) {
      userId = dbUser.id;
    }

    const body = await req.json();
    const result = orderSchema.safeParse(body);

    if (!result.success) {
      console.warn("Validation error in Order POST:", result.error);
      return NextResponse.json({ success: false, error: 'Données de livraison ou commande invalides' }, { status: 400 });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0 && (!body.items || body.items.length === 0)) {
      return NextResponse.json({ success: false, error: 'Votre panier est vide' }, { status: 400 });
    }

    let subtotal = 0;
    let orderItemsCreateData: any[] = [];

    if (cartItems.length > 0) {
      subtotal = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
      orderItemsCreateData = cartItems.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku || item.product.reference || 'N/A',
        price: item.product.price,
        quantity: item.quantity,
        total: Number(item.product.price) * item.quantity,
      }));
    } else if (body.items && Array.isArray(body.items)) {
      subtotal = body.items.reduce((sum: number, it: any) => sum + (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 1), 0);
      orderItemsCreateData = body.items.map((it: any) => ({
        productId: it.productId || null,
        productName: it.name || it.productName || 'Article',
        sku: it.sku || it.reference || 'N/A',
        price: parseFloat(it.price) || 0,
        quantity: parseInt(it.quantity) || 1,
        total: (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 1),
      }));
    }

    const settings = await prisma.setting.findMany({
      where: { key: { in: ['shipping_free_threshold', 'shipping_standard_cost', 'tax_rate'] } },
    }).catch(() => []);

    const freeThreshold = parseFloat(settings.find(s => s.key === 'shipping_free_threshold')?.value || '99');
    const isFreeMethod = body.shippingMethod === 'AU MAGASIN' || body.shippingMethod === 'PAR PROPRES MOYENS' || body.shippingMethod === 'POWER TRANSPORT';
    const shippingCost = (subtotal >= freeThreshold || isFreeMethod) ? 0 : parseFloat(settings.find(s => s.key === 'shipping_standard_cost')?.value || '7.90');
    const taxRate = parseFloat(settings.find(s => s.key === 'tax_rate')?.value || '19');

    const tax = (subtotal + shippingCost) * (taxRate / 100);
    const total = subtotal + shippingCost + tax;

    const orderCount = await prisma.order.count();
    const nextNumber = String(orderCount + 1).padStart(6, '0');
    const orderNumber = `CMD-${nextNumber}`;

    const serializedShippingAddress = typeof body.shippingAddress === 'string'
      ? body.shippingAddress
      : JSON.stringify({
          ...(typeof body.shippingAddress === 'object' ? body.shippingAddress : {}),
          shippingMethod: body.shippingMethod || 'standard'
        });

    const serializedBillingAddress = typeof body.billingAddress === 'string'
      ? body.billingAddress
      : (body.billingAddress ? JSON.stringify(body.billingAddress) : serializedShippingAddress);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        shippingAddress: serializedShippingAddress,
        billingAddress: serializedBillingAddress,
        items: {
          create: orderItemsCreateData,
        },
        subtotal,
        shippingCost,
        discount: 0,
        tax,
        total,
        paymentMethod: body.paymentMethod || 'CASH_ON_DELIVERY',
        paymentStatus: 'PENDING',
        status: 'PENDING',
        customerNote: body.customerNote || null,
        statusHistory: {
          create: {
            status: 'PENDING',
            note: 'Commande créée avec succès',
          },
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (cartItems.length > 0) {
      await prisma.cartItem.deleteMany({ where: { userId } }).catch(() => {});
    }

    for (const item of cartItems) {
      if (item.product.trackStock) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        });
      } else {
        await prisma.product.update({
          where: { id: item.productId },
          data: { soldCount: { increment: item.quantity } },
        });
      }
    }

    return NextResponse.json({ success: true, data: order, message: 'Commande créée avec succès' });
  } catch (error) {
    console.error('Order POST error:', error);
    return NextResponse.json({ success: false, error: 'Erreur création commande' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    const isAuthorized = user.role === 'ADMIN' || user.role === 'PROFESSIONAL';
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, status, trackingNote, paymentStatus, isPaid, managedByName } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Données manquantes' }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (trackingNote !== undefined) data.customerNote = trackingNote || null;
    if (paymentStatus) data.paymentStatus = paymentStatus;
    if (isPaid !== undefined) data.isPaid = isPaid;

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

    if (status) {
      data.statusHistory = {
        create: {
          status,
          note: trackingNote || `Statut mis à jour à ${status}`,
        }
      };
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        managedBy: true,
        items: true,
        user: true
      }
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur lors de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'PROFESSIONAL') {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Identifiant bon de commande requis' }, { status: 400 });
    }

    await prisma.order.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Bon de commande supprimé avec succès' });
  } catch (error: any) {
    console.error('Order DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}