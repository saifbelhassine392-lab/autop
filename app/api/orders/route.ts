import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/utils';
import { orderSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const where: any = {};
    if (userRole === 'CUSTOMER' || userRole === 'PROFESSIONAL' || userRole === 'client' || userRole === 'pro') {
      where.userId = userId;
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
            select: { firstName: true, lastName: true, email: true, name: true },
          },
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

    const userId = (session.user as any).id;

    const body = await req.json();
    const result = orderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Panier vide' }, { status: 400 });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

    const settings = await prisma.setting.findMany({
      where: { key: { in: ['shipping_free_threshold', 'shipping_standard_cost', 'tax_rate'] } },
    });

    const freeThreshold = parseFloat(settings.find(s => s.key === 'shipping_free_threshold')?.value || '99');
    const isFreeMethod = body.shippingMethod === 'AU MAGASIN' || body.shippingMethod === 'PAR PROPRES MOYENS' || body.shippingMethod === 'POWER TRANSPORT';
    const shippingCost = (subtotal >= freeThreshold || isFreeMethod) ? 0 : parseFloat(settings.find(s => s.key === 'shipping_standard_cost')?.value || '7.90');
    const taxRate = parseFloat(settings.find(s => s.key === 'tax_rate')?.value || '20');

    const tax = (subtotal + shippingCost) * (taxRate / 100);
    const total = subtotal + shippingCost + tax;

    const orderCount = await prisma.order.count();
    const nextNumber = String(orderCount + 1).padStart(6, '0');
    const orderNumber = `CMD-${nextNumber}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        shippingAddress: {
          ...(body.shippingAddress || {}),
          shippingMethod: body.shippingMethod || 'standard'
        },
        billingAddress: body.billingAddress || body.shippingAddress,
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            price: item.product.price,
            quantity: item.quantity,
            total: Number(item.product.price) * item.quantity,
          })),
        },
        subtotal,
        shippingCost,
        discount: 0,
        tax,
        total,
        paymentMethod: body.paymentMethod,
        paymentStatus: 'PENDING',
        status: 'PENDING',
        customerNote: body.customerNote,
        statusHistory: {
          create: {
            status: 'PENDING',
            note: 'Commande créée',
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

    await prisma.cartItem.deleteMany({ where: { userId } });

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
    const { orderId, status, trackingNote, paymentStatus, isPaid } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Données manquantes' }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (trackingNote !== undefined) data.customerNote = trackingNote || null;
    if (paymentStatus) data.paymentStatus = paymentStatus;
    if (isPaid !== undefined) data.isPaid = isPaid;

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
      data
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur lors de la mise à jour' }, { status: 500 });
  }
}