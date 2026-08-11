import { prisma } from '@/lib/prisma';
import { neonSql } from '@/lib/neonClient';

/**
 * Save extracted VIN catalog path tree and metadata to PostgreSQL / Prisma without data loss.
 */
export async function saveVinCatalogToDb(data: {
  vin: string;
  brand: string;
  model: string;
  year?: number;
  engine?: string;
  sourceCatalog?: string;
  treeJson: unknown;
}) {
  const cleanVin = data.vin.trim().toUpperCase();
  const treeStr = typeof data.treeJson === 'string' ? data.treeJson : JSON.stringify(data.treeJson);

  // 1. Prisma (SQLite / standard DB)
  try {
    await prisma.vehicleVinCatalog.upsert({
      where: { vin: cleanVin },
      update: {
        brand: data.brand,
        model: data.model,
        year: data.year,
        engine: data.engine,
        sourceCatalog: data.sourceCatalog || 'PARTSLINK24',
        treeJson: treeStr,
      },
      create: {
        vin: cleanVin,
        brand: data.brand,
        model: data.model,
        year: data.year,
        engine: data.engine,
        sourceCatalog: data.sourceCatalog || 'PARTSLINK24',
        treeJson: treeStr,
      },
    });
  } catch (err) {
    console.warn('[CatalogStorage] Prisma VIN save error:', err);
  }

  // 2. Direct Neon Postgres (Cloud)
  try {
    await neonSql`
      INSERT INTO "VehicleVinCatalog" (id, vin, brand, model, year, engine, "sourceCatalog", "treeJson", "createdAt", "updatedAt")
      VALUES (${'vin_' + cleanVin}, ${cleanVin}, ${data.brand}, ${data.model}, ${data.year || null}, ${data.engine || null}, ${data.sourceCatalog || 'PARTSLINK24'}, ${treeStr}, NOW(), NOW())
      ON CONFLICT (vin) DO UPDATE SET
        brand = EXCLUDED.brand,
        model = EXCLUDED.model,
        "treeJson" = EXCLUDED."treeJson",
        "updatedAt" = NOW()
    `;
  } catch (err) {
    // Non-blocking if table or cloud neon schema doesn't exist yet
  }
}

/**
 * Get saved VIN catalog path tree from PostgreSQL / Prisma.
 */
export async function getVinCatalogFromDb(vin: string) {
  const cleanVin = vin.trim().toUpperCase();
  try {
    const record = await prisma.vehicleVinCatalog.findUnique({
      where: { vin: cleanVin },
    });
    if (record && record.brand && record.brand !== 'INCONNU' && !record.brand.startsWith('VÉHICULE') && !record.brand.startsWith('GÉNÉRIQUE')) {
      return {
        ...record,
        treeJson: JSON.parse(record.treeJson),
      };
    }
  } catch (err) {
    console.warn('[CatalogStorage] Prisma VIN read error:', err);
  }
  return null;
}

/**
 * Save newly discovered parts and equivalents into database.
 */
export async function saveDiscoveredParts(items: Array<{
  name: string;
  brand?: string;
  price?: number;
  supplierName?: string;
  equivalents?: Array<{ reference: string; brand: string; type?: string }>;
}>) {
  if (!items || items.length === 0) return;

  try {
    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: 'Général', slug: 'general' },
      });
    }

    for (const item of items) {
      if (!item.name) continue;
      const ref = item.name.trim().toUpperCase();

      // Upsert Product record
      const existing = await prisma.product.findFirst({
        where: { OR: [{ reference: ref }, { sku: ref }] },
      });

      if (!existing && item.price && item.price > 0) {
        await prisma.product.create({
          data: {
            sku: ref,
            reference: ref,
            name: `ARTICLE ${ref}`,
            slug: `article-${ref.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
            price: item.price,
            costPrice: item.price * 0.8,
            stock: 0,
            brand: item.brand || null,
            categoryId: category.id,
            status: 'ACTIVE',
          },
        }).catch(() => null);
      }

      // Record price history entry
      if (item.price && item.price > 0) {
        await prisma.partPriceHistory.create({
          data: {
            reference: ref,
            type: item.brand?.toUpperCase().includes('ORIGINE') ? 'ORIGINE' : 'ADAPTABLE',
            supplierName: item.supplierName || item.brand || 'B2B Supplier',
            purchasePrice: item.price * 0.8,
            sellingPrice: item.price,
          },
        }).catch(() => null);
      }

      // Save equivalents
      if (item.equivalents && Array.isArray(item.equivalents)) {
        for (const eq of item.equivalents) {
          if (!eq.reference) continue;
          const eqRef = eq.reference.trim().toUpperCase();
          await prisma.discoveredEquivalence.upsert({
            where: {
              oeReference_eqReference: {
                oeReference: ref,
                eqReference: eqRef,
              },
            },
            update: {
              eqBrand: eq.brand || null,
              category: eq.type || 'EQUIVALENT',
            },
            create: {
              oeReference: ref,
              eqReference: eqRef,
              eqBrand: eq.brand || null,
              category: eq.type || 'EQUIVALENT',
              source: 'SCRAPER',
            },
          }).catch(() => null);
        }
      }
    }
  } catch (err) {
    console.error('[CatalogStorage] saveDiscoveredParts error:', err);
  }
}
