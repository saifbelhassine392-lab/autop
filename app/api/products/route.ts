export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { ensureCatalogSeeded } from '@/lib/autoSeed';



export async function GET(req: NextRequest) {
  try {
    await ensureCatalogSeeded();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const statusParam = searchParams.get('status');
    const limitParam = searchParams.get('limit');

    const where: any = {};
    if (statusParam !== 'ALL') {
      where.status = 'ACTIVE';
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { reference: { contains: search } },
        { description: { contains: search } },
        { brand: { contains: search } },
        { compatible: { contains: search } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    const take = limitParam ? parseInt(limitParam) : undefined;

    const products = await prisma.product.findMany({
      where,
      take,
      include: {
        category: { select: { name: true } },
      },
      orderBy: { reference: 'asc' },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur', details: error.message || String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const reference = body.reference ? body.reference.trim().toUpperCase() : ('REF-' + Date.now());
    const sku = body.sku ? body.sku.trim().toUpperCase() : reference;
    const name = body.name || body.designation || `ARTICLE ${reference}`;
    const slug = body.slug || (slugify(name) + '-' + reference.toLowerCase());

    let categoryId = body.categoryId;
    if (!categoryId) {
      let category = await prisma.category.findFirst();
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: 'Général',
            slug: 'general',
          }
        });
      }
      categoryId = category.id;
    }

    const price = parseFloat(body.price) || parseFloat(body.sellingPrice) || 0;
    const costPrice = parseFloat(body.costPrice) || (price * 0.8);

    const rawImage = body.imageUrl || body.image;
    let imagesVal = '[]';
    if (Array.isArray(body.images)) {
      imagesVal = JSON.stringify(body.images);
    } else if (body.images && typeof body.images === 'string') {
      imagesVal = body.images.startsWith('[') ? body.images : JSON.stringify([body.images]);
    } else if (rawImage && typeof rawImage === 'string' && rawImage.trim()) {
      imagesVal = JSON.stringify([rawImage.trim()]);
    }

    const existing = await prisma.product.findFirst({
      where: { OR: [{ reference }, { sku }] }
    });

    let product;
    if (existing) {
      product = await prisma.product.update({
        where: { id: existing.id },
        data: {
          name,
          price: price > 0 ? price : existing.price,
          costPrice: costPrice > 0 ? costPrice : existing.costPrice,
          stock: body.stock !== undefined ? parseInt(body.stock) : existing.stock,
          description: body.description || existing.description,
          brand: body.brand || existing.brand,
          status: body.status || existing.status,
          ...(rawImage || body.images !== undefined ? { images: imagesVal } : {}),
        },
        include: { category: true }
      });
    } else {
      product = await prisma.product.create({
        data: {
          sku,
          name,
          slug: slug + '-' + Date.now(),
          description: body.description,
          price,
          costPrice,
          oldPrice: parseFloat(body.oldPrice) || null,
          stock: parseInt(body.stock) || parseInt(body.stockQty) || 0,
          images: imagesVal,
          reference,
          brand: body.brand,
          vehicleCompat: body.vehicleCompat || null,
          categoryId,
          status: body.status || 'ACTIVE',
        },
        include: {
          category: true,
        },
      });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Create/update product error:', error);
    return NextResponse.json({ error: `Erreur gestion produit: ${error.message || String(error)}` }, { status: 500 });
  }
}