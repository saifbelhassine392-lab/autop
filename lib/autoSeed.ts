import { prisma } from '@/lib/prisma';
import catalogBackup from '@/prisma/catalog_backup.json';

let isSeeding = false;

export async function ensureCatalogSeeded() {
  if (isSeeding) return;

  try {
    const productCount = await prisma.product.count();
    const supplierCount = await prisma.supplier.count();

    if (productCount > 0 && supplierCount > 0) {
      return; // Déjà alimenté
    }

    isSeeding = true;
    console.log(`[AutoSeed] Base de données incomplète (Produits: ${productCount}, Fournisseurs: ${supplierCount}). Injection du catalogue complet...`);

    const { products, suppliers, categories } = catalogBackup as any;

    // 1. Injecter les catégories
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        await prisma.category.upsert({
          where: { id: cat.id },
          update: {},
          create: {
            id: cat.id,
            name: cat.name,
            slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            description: cat.description || null,
            icon: cat.icon || null
          }
        }).catch(() => {});
      }
    }

    // 2. Injecter les fournisseurs
    if (Array.isArray(suppliers)) {
      for (const s of suppliers) {
        await prisma.supplier.upsert({
          where: { id: s.id },
          update: {},
          create: {
            id: s.id,
            name: s.name,
            b2bUrl: s.b2bUrl || null,
            b2bLogin: s.b2bLogin || null,
            b2bPassword: s.b2bPassword || null,
            contactName: s.contactName || null,
            email: s.email || null,
            phone: s.phone || null,
            address: s.address || null,
            isActive: s.isActive !== undefined ? s.isActive : true
          }
        }).catch(() => {});
      }
    }

    // 3. Injecter les 2154 produits
    if (Array.isArray(products) && products.length > 0) {
      let firstCat = await prisma.category.findFirst();
      if (!firstCat) {
        firstCat = await prisma.category.create({
          data: { name: 'Général', slug: 'general' }
        });
      }

      // Traitement par lots (batch) de 100 produits pour éviter la saturation mémoire / timeout
      const batchSize = 100;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        await Promise.all(batch.map(p => {
          const ref = p.reference || p.sku || `REF-${Math.random()}`;
          return prisma.product.upsert({
            where: { id: p.id },
            update: {},
            create: {
              id: p.id,
              sku: p.sku || ref,
              name: p.name || `ARTICLE ${ref}`,
              slug: p.slug || `article-${ref.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
              description: p.description || null,
              price: p.price || 0,
              costPrice: p.costPrice || 0,
              oldPrice: p.oldPrice || null,
              stock: p.stock || 0,
              images: p.images || '[]',
              reference: ref,
              brand: p.brand || null,
              vehicleCompat: p.vehicleCompat || null,
              categoryId: p.categoryId || firstCat!.id,
              status: p.status || 'ACTIVE'
            }
          }).catch(() => {});
        }));
      }
    }

    const finalPCount = await prisma.product.count();
    const finalSCount = await prisma.supplier.count();
    console.log(`[AutoSeed] Injection réussie ! Produits en base: ${finalPCount}, Fournisseurs en base: ${finalSCount}`);

  } catch (err) {
    console.error("[AutoSeed] Erreur lors de l'auto-injection:", err);
  } finally {
    isSeeding = false;
  }
}
