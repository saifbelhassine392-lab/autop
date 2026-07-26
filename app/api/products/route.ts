import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';

async function fetchAndSaveProductImage(productId: string, reference: string, brand?: string) {
  try {
    const query = `${brand || ''} ${reference} piece auto`;
    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
      }
    });
    const html = await res.text();
    const regex = /murl&quot;:&quot;(https?:[^&]+)&quot;/g;
    let match;
    const imgUrls: string[] = [];
    while ((match = regex.exec(html)) !== null && imgUrls.length < 3) {
      imgUrls.push(match[1]);
    }
    
    if (imgUrls.length > 0) {
      await prisma.product.update({
        where: { id: productId },
        data: { images: imgUrls }
      });
      console.log(`[Image Fetcher] Saved ${imgUrls.length} images for product ${reference}`);
    }
  } catch (e) {
    console.error("[Image Fetcher] Error fetching image for", reference, e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const where: any = { status: 'ACTIVE' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
      },
      orderBy: { reference: 'asc' },
    });

    // Start background image searches for products lacking images (limit to 5 per request to prevent rate limiting)
    let count = 0;
    for (const product of products) {
      if ((!product.images || product.images.length === 0) && count < 5) {
        fetchAndSaveProductImage(product.id, product.reference || '', product.brand || '').catch(console.error);
        count++;
      }
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Auto-fill SKU and slug if not provided
    const reference = body.reference || 'REF-' + Date.now();
    const sku = body.sku || reference;
    const name = body.name || body.designation;
    const slug = body.slug || (slugify(name) + '-' + reference);

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

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        slug,
        description: body.description,
        price: parseFloat(body.price) || parseFloat(body.sellingPrice) || 0,
        costPrice: parseFloat(body.costPrice) || 0,
        oldPrice: parseFloat(body.oldPrice) || parseFloat(body.costPrice) || null,
        stock: parseInt(body.stock) || parseInt(body.stockQty) || 0,
        images: body.images || [],
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

    return NextResponse.json(product);
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Erreur creation produit' }, { status: 500 });
  }
}