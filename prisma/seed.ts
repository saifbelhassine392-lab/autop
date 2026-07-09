import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@autop.tn' },
    update: {},
    create: {
      email: 'admin@autop.tn',
      name: 'Administrateur',
      password: adminPassword,
      role: Role.admin,
      phone: '+216 99 999 999',
    },
  })

  // Commerciaux
  const commerciaux = [
    { email: 'amine@autop.tn', name: 'Amine', color: 'green' },
    { email: 'saif@autop.tn', name: 'Saif', color: 'blue' },
    { email: 'saifallah@autop.tn', name: 'Saifallah', color: 'purple' },
  ]

  for (const comm of commerciaux) {
    const password = await bcrypt.hash('commercial123', 10)
    await prisma.user.upsert({
      where: { email: comm.email },
      update: {},
      create: {
        email: comm.email,
        name: comm.name,
        password: password,
        role: Role.admin,
      },
    })
  }

  // Catégories
  const categories = [
    { name: 'Freinage', slug: 'freinage', description: 'Plaquettes, disques, étriers...' },
    { name: 'Moteur', slug: 'moteur', description: 'Pistons, courroies, filtres...' },
    { name: 'Suspension', slug: 'suspension', description: 'Amortisseurs, ressorts...' },
    { name: 'Éclairage', slug: 'eclairage', description: 'Phares, feux, ampoules...' },
    { name: 'Carrosserie', slug: 'carrosserie', description: 'Pare-chocs, ailes, portes...' },
    { name: 'Électricité', slug: 'electricite', description: 'Batteries, alternateurs...' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }

  // Produits exemples
  const freinage = await prisma.category.findUnique({ where: { slug: 'freinage' } })
  const moteur = await prisma.category.findUnique({ where: { slug: 'moteur' } })

  if (freinage) {
    await prisma.product.createMany({
      skipDuplicates: true,
      data: [
        {
          name: 'Plaquettes de frein Bosch',
          slug: 'plaquettes-frein-bosch',
          description: 'Plaquettes de frein avant haute qualité',
          price: 89.9,
          oldPrice: 120.0,
          stock: 15,
          reference: 'BOSCH-PLA-001',
          brand: 'Bosch',
          compatible: ['Peugeot 206', 'Peugeot 307', 'Citroën C4'],
          categoryId: freinage.id,
          images: [],
        },
        {
          name: 'Disque de frein ventilé',
          slug: 'disque-frein-ventile',
          description: 'Disque de frein ventilé 280mm',
          price: 145.0,
          stock: 8,
          reference: 'DISQ-280-001',
          brand: 'TRW',
          compatible: ['Volkswagen Golf', 'Seat Leon'],
          categoryId: freinage.id,
          images: [],
        },
      ],
    })
  }

  if (moteur) {
    await prisma.product.createMany({
      skipDuplicates: true,
      data: [
        {
          name: 'Filtre à huile Mann',
          slug: 'filtre-huile-mann',
          description: 'Filtre à huile de qualité OEM',
          price: 35.5,
          stock: 30,
          reference: 'MANN-HU-001',
          brand: 'Mann-Filter',
          compatible: ['BMW Série 3', 'BMW Série 5'],
          categoryId: moteur.id,
          images: [],
        },
        {
          name: 'Courroie de distribution',
          slug: 'courroie-distribution',
          description: 'Kit courroie de distribution complet',
          price: 299.0,
          oldPrice: 350.0,
          stock: 5,
          reference: 'COUR-DIST-001',
          brand: 'Gates',
          compatible: ['Renault Clio', 'Dacia Logan'],
          categoryId: moteur.id,
          images: [],
        },
      ],
    })
  }

  console.log('✅ Seed completed!')
  console.log('Admin:', admin.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })