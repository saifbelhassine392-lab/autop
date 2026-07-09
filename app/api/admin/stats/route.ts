import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function GET() {
  const session = await getServerSession()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const [totalOrders, totalDevis, totalProducts, totalUsers, orders] = await Promise.all([
      prisma.order.count(),
      prisma.devis.count(),
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.findMany({ where: { isPaid: true } }),
    ])

    const revenue = orders.reduce((sum, order) => sum + order.total, 0)

    return NextResponse.json({
      totalOrders,
      totalDevis,
      totalProducts,
      totalUsers,
      revenue,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}