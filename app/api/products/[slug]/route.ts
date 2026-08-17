import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
      include: {
        category: true,
        brandModel: true,
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: { name: true, image: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Produit non trouve' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('Product detail error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await prisma.product.delete({
      where: { slug: params.slug }
    });
    return NextResponse.json({ success: true, message: 'Article supprimé avec succès' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await req.json();
    const rawImage = body.imageUrl || body.image;
    let imagesVal: string | undefined = undefined;
    if (Array.isArray(body.images)) {
      imagesVal = JSON.stringify(body.images);
    } else if (body.images && typeof body.images === 'string') {
      imagesVal = body.images.startsWith('[') ? body.images : JSON.stringify([body.images]);
    } else if (rawImage && typeof rawImage === 'string') {
      imagesVal = rawImage.trim() ? JSON.stringify([rawImage.trim()]) : '[]';
    }

    const product = await prisma.product.update({
      where: { slug: params.slug },
      data: {
        name: body.name,
        price: parseFloat(body.price) || 0,
        costPrice: parseFloat(body.costPrice) || 0,
        stock: parseInt(body.stock) || 0,
        brand: body.brand || null,
        vehicleCompat: body.vehicleCompat || null,
        reference: body.reference || null,
        status: body.status || 'ACTIVE',
        ...(imagesVal !== undefined ? { images: imagesVal } : {})
      }
    });
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ success: false, error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}