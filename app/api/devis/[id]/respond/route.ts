import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    const { items, responseNote, totalPrice } = await req.json()

    // Mettre à jour les items avec les prix proposés
    for (const item of items) {
      await prisma.devisItem.update({
        where: { id: item.id },
        data: {
          price: item.price,
          productId: item.productId || null,
        },
      })
    }

    const devis = await prisma.devis.update({
      where: { id: params.id },
      data: {
        status: 'completed',
        totalPrice,
        responseNote,
      },
      include: { items: { include: { product: true } }, user: true },
    })

    return NextResponse.json(devis)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}