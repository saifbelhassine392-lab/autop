import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed...');

  // ============================================
  // UTILISATEURS
  // ============================================
  const adminPassword = await bcrypt.hash('admin123', 12);
  const userPassword = await bcrypt.hash('user123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@autop.fr' },
    update: {},
    create: {
      email: 'admin@autop.fr',
      password: adminPassword,
      firstName: 'Administrateur',
      lastName: 'AUTOP',
      phone: '+33600000000',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@garage.fr' },
    update: {},
    create: {
      email: 'pro@garage.fr',
      password: userPassword,
      firstName: 'Jean',
      lastName: 'Dupont',
      phone: '+33612345678',
      role: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      password: userPassword,
      firstName: 'Marie',
      lastName: 'Martin',
      phone: '+33687654321',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Utilisateurs créés');

  // ============================================
  // ADRESSES
  // ============================================
  for (const addr of [
    {
      userId: customer.id,
      label: 'Domicile',
      street: '12 Rue de Paris',
      city: 'Lyon',
      zipCode: '69001',
      country: 'France',
      isDefault: true,
    },
    {
      userId: proUser.id,
      label: 'Garage',
      street: '45 Avenue des Champs',
      city: 'Marseille',
      zipCode: '13001',
      country: 'France',
      isDefault: true,
    },
  ]) {
    try { await prisma.address.create({ data: addr }); } catch (e) {}
  }

  // ============================================
  // CATÉGORIES
  // ============================================
  const categories = [
    { name: 'Freinage', slug: 'freinage', description: 'Disques, plaquettes, étriers...', icon: 'CircleDot' },
    { name: 'Moteur', slug: 'moteur', description: 'Pistons, joints, courroies...', icon: 'Cog' },
    { name: 'Échappement', slug: 'echappement', description: 'Silencieux, catalyseurs, collecteurs...', icon: 'Wind' },
    { name: 'Suspension', slug: 'suspension', description: 'Amortisseurs, ressorts, triangles...', icon: 'ArrowUpDown' },
    { name: 'Transmission', slug: 'transmission', description: 'Embrayages, boîtes de vitesses...', icon: 'Settings' },
    { name: 'Électricité', slug: 'electricite', description: 'Batteries, alternateurs, démarreurs...', icon: 'Zap' },
    { name: 'Carrosserie', slug: 'carrosserie', description: 'Pare-chocs, ailes, portes...', icon: 'Shield' },
    { name: 'Éclairage', slug: 'eclairage', description: 'Phares, feux, ampoules LED...', icon: 'Lightbulb' },
    { name: 'Filtration', slug: 'filtration', description: 'Filtres à huile, air, habitacle...', icon: 'Filter' },
    { name: 'Climatisation', slug: 'climatisation', description: 'Compresseurs, condenseurs...', icon: 'Thermometer' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log('✅ Catégories créées');

  // ============================================
  // MARQUES
  // ============================================
  const brands = [
    { name: 'Bosch', slug: 'bosch', country: 'Allemagne' },
    { name: 'Valeo', slug: 'valeo', country: 'France' },
    { name: 'Continental', slug: 'continental', country: 'Allemagne' },
    { name: 'Brembo', slug: 'brembo', country: 'Italie' },
    { name: 'NGK', slug: 'ngk', country: 'Japon' },
    { name: 'Mann-Filter', slug: 'mann-filter', country: 'Allemagne' },
    { name: 'Michelin', slug: 'michelin', country: 'France' },
    { name: 'Delphi', slug: 'delphi', country: 'Royaume-Uni' },
    { name: 'Denso', slug: 'denso', country: 'Japon' },
    { name: 'TRW', slug: 'trw', country: 'Allemagne' },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: { ...brand, isActive: true },
    });
  }

  console.log('✅ Marques créées');

  // ============================================
  // CONSTRUCTEURS VÉHICULES
  // ============================================
  const makes = [
    { name: 'Renault', slug: 'renault', country: 'France' },
    { name: 'Peugeot', slug: 'peugeot', country: 'France' },
    { name: 'Citroën', slug: 'citroen', country: 'France' },
    { name: 'BMW', slug: 'bmw', country: 'Allemagne' },
    { name: 'Mercedes-Benz', slug: 'mercedes-benz', country: 'Allemagne' },
    { name: 'Volkswagen', slug: 'volkswagen', country: 'Allemagne' },
    { name: 'Toyota', slug: 'toyota', country: 'Japon' },
    { name: 'Ford', slug: 'ford', country: 'États-Unis' },
  ];

  for (const make of makes) {
    await prisma.vehicleMake.upsert({
      where: { slug: make.slug },
      update: {},
      create: make,
    });
  }

  // Modèles pour Renault
  const renault = await prisma.vehicleMake.findUnique({ where: { slug: 'renault' } });
  if (renault) {
    const models = [
      { name: 'Clio', slug: 'clio' },
      { name: 'Captur', slug: 'captur' },
      { name: 'Mégane', slug: 'megane' },
      { name: 'Scénic', slug: 'scenic' },
      { name: 'Duster', slug: 'duster' },
    ];
    for (const model of models) {
      await prisma.vehicleModel.upsert({
        where: { makeId_slug: { makeId: renault.id, slug: model.slug } },
        update: {},
        create: { ...model, makeId: renault.id },
      });
    }
  }

  console.log('✅ Véhicules créés');

  // ============================================
  // PRODUITS (exemples)
  // ============================================
  const freinage = await prisma.category.findUnique({ where: { slug: 'freinage' } });
  const moteur = await prisma.category.findUnique({ where: { slug: 'moteur' } });
  const electricite = await prisma.category.findUnique({ where: { slug: 'electricite' } });
  const brembo = await prisma.brand.findUnique({ where: { slug: 'brembo' } });
  const bosch = await prisma.brand.findUnique({ where: { slug: 'bosch' } });
  const valeo = await prisma.brand.findUnique({ where: { slug: 'valeo' } });

  const products = [
    {
      sku: 'BRK-280-BREMBO',
      name: 'Disque de frein avant Brembo Ø280mm',
      slug: 'disque-frein-avant-brembo-280',
      description: 'Disque de frein avant haute performance Brembo. Diamètre 280mm, épaisseur 24mm. Compatible avec de nombreux modèles. Traitement anti-corrosion, usinage de précision pour un freinage optimal.',
      shortDesc: 'Disque de frein avant Ø280mm - Haute performance',
      price: 89.90,
      comparePrice: 119.00,
      stock: 45,
      categoryId: freinage?.id || '',
      brandId: brembo?.id,
      status: 'ACTIVE',
      isFeatured: true,
      metaTitle: 'Disque de frein Brembo Ø280mm | AUTOP',
      metaDesc: 'Disque de frein avant Brembo de qualité premium. Livraison rapide et prix compétitif.',
    },
    {
      sku: 'PLAQ-BREMBO-CERAMIC',
      name: 'Plaquettes de frein céramique Brembo',
      slug: 'plaquettes-frein-ceramique-brembo',
      description: 'Plaquettes de frein céramique Brembo. Réduction des poussières de freinage de 50%. Durée de vie prolongée. Faible bruit et excellente tenue à haute température.',
      shortDesc: 'Plaquettes céramique - Faible poussière',
      price: 54.90,
      stock: 120,
      categoryId: freinage?.id || '',
      brandId: brembo?.id,
      status: 'ACTIVE',
      isFeatured: true,
      metaTitle: 'Plaquettes frein céramique Brembo | AUTOP',
      metaDesc: 'Plaquettes de frein céramique haute qualité. Compatible multi-marques.',
    },
    {
      sku: 'BAT-VARTA-60AH',
      name: 'Batterie Varta Blue Dynamic 60Ah',
      slug: 'batterie-varta-blue-dynamic-60ah',
      description: 'Batterie Varta Blue Dynamic 60Ah / 540A. Technologie PowerFrame® pour un démarrage fiable même par grand froid. Durée de vie prolongée. Dimensions standard L242 x W175 x H190mm.',
      shortDesc: 'Batterie 60Ah 540A - Démarrage froid garanti',
      price: 129.90,
      comparePrice: 159.00,
      stock: 25,
      categoryId: electricite?.id || '',
      brandId: valeo?.id,
      status: 'ACTIVE',
      isNew: true,
      metaTitle: 'Batterie Varta 60Ah Blue Dynamic | AUTOP',
      metaDesc: 'Batterie Varta Blue Dynamic 60Ah. Livraison rapide et installation possible.',
    },
    {
      sku: 'FILT-MANN-HU7029Z',
      name: 'Filtre à huile Mann-Filter HU 7029 z',
      slug: 'filtre-huile-mann-hu7029z',
      description: 'Filtre à huile Mann-Filter HU 7029 z. Filtration optimale des particules. Haute capacité de rétention. Compatible avec huiles minérales et synthétiques.',
      shortDesc: 'Filtre à huile premium - Haute filtration',
      price: 12.90,
      stock: 200,
      categoryId: moteur?.id || '',
      brandId: bosch?.id,
      status: 'ACTIVE',
      metaTitle: 'Filtre huile Mann-Filter HU7029z | AUTOP',
      metaDesc: 'Filtre à huile Mann-Filter de qualité OEM. Livraison 24-48h.',
    },
    {
      sku: 'BOUGIE-NGK-BKR6E',
      name: 'Bougie d\'allumage NGK BKR6E (x4)',
      slug: 'bougie-allumage-ngk-bkr6e',
      description: 'Jeu de 4 bougies d\'allumage NGK BKR6E. Électrode en nickel pour une longévité accrue. Performance stable dans toutes les conditions. Pré-gappées et prêtes à l\'emploi.',
      shortDesc: 'Jeu de 4 bougies NGK - Performance stable',
      price: 34.90,
      stock: 80,
      categoryId: moteur?.id || '',
      brandId: bosch?.id,
      status: 'ACTIVE',
      metaTitle: 'Bougies allumage NGK BKR6E x4 | AUTOP',
      metaDesc: 'Jeu de 4 bougies NGK BKR6E. Qualité constructeur au meilleur prix.',
    },
  ];

  for (const product of products) {
    if (!product.categoryId) continue;
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }

  console.log('✅ Produits créés');

  // ============================================
  // BANNERS
  // ============================================
  for (const b of [
    {
      title: 'Promo Freinage Été 2026',
      subtitle: 'Jusqu\'à -30% sur les disques et plaquettes',
      image: '/banners/freinage-promo.jpg',
      link: '/categorie/freinage',
      linkText: 'Découvrir les offres',
      position: 'home_hero',
      sortOrder: 1,
      isActive: true,
    },
    {
      title: 'Nouvelle Gamme Batteries',
      subtitle: 'Varta, Bosch, Exide - Toutes marques disponibles',
      image: '/banners/batteries-nouveau.jpg',
      link: '/categorie/electricite',
      linkText: 'Voir les batteries',
      position: 'home_hero',
      sortOrder: 2,
      isActive: true,
    },
  ]) {
    try { await prisma.banner.create({ data: b }); } catch (e) {}
  }

  // ============================================
  // PARAMÈTRES
  // ============================================
  const settings = [
    { key: 'site_name', value: 'AUTOP', group: 'general' },
    { key: 'site_description', value: 'Votre partenaire pièces auto depuis 2024', group: 'general' },
    { key: 'contact_email', value: 'contact@autop.tn', group: 'general' },
    { key: 'contact_phone', value: '+33 1 23 45 67 89', group: 'general' },
    { key: 'shipping_free_threshold', value: '99.00', group: 'shipping' },
    { key: 'shipping_standard_cost', value: '7.90', group: 'shipping' },
    { key: 'shipping_express_cost', value: '14.90', group: 'shipping' },
    { key: 'tax_rate', value: '20.00', group: 'payment' },
    { key: 'currency', value: 'EUR', group: 'payment' },
    { key: 'quote_validity_days', value: '30', group: 'general' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('✅ Paramètres créés');

  // ============================================
  // REVIEWS
  // ============================================
  const disque = await prisma.product.findUnique({ where: { sku: 'BRK-280-BREMBO' } });
  if (disque && customer) {
    await prisma.review.upsert({
      where: { userId_productId: { userId: customer.id, productId: disque.id } },
      update: {},
      create: {
        userId: customer.id,
        productId: disque.id,
        rating: 5,
        title: 'Excellent produit',
        comment: 'Disque de très bonne qualité, montage parfait sur ma Clio IV. Freinage nettement amélioré par rapport à l\'original.',
        isVerified: true,
        isApproved: true,
      },
    });
  }

  console.log('\n🎉 Seed terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });