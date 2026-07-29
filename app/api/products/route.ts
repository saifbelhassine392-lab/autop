import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { ensureCatalogSeeded } from '@/lib/autoSeed';

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
        data: { images: JSON.stringify(imgUrls) }
      });
      console.log(`[Image Fetcher] Saved ${imgUrls.length} images for product ${reference}`);
    }
  } catch (e) {
    console.error("[Image Fetcher] Error fetching image for", reference, e);
  }
}

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

    // Start background image searches for products lacking images (limit to 5 per request to prevent rate limiting)
    let count = 0;
    for (const product of products) {
      if ((!product.images || product.images.length === 0) && count < 5) {
        fetchAndSaveProductImage(product.id, product.reference || '', product.brand || '').catch(console.error);
        count++;
      }
    }

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
          images: Array.isArray(body.images) ? JSON.stringify(body.images) : (body.images || '[]'),
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