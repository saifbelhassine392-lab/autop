import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { fetchProductionDevis } from '@/lib/neonClient'

// GET - Mes devis (client) ou tous (admin)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const isDev = process.env.NODE_ENV !== 'production' || req.headers.get('host')?.includes('localhost')
  if (!session && !isDev) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const user = session?.user as any
    const where = (user && user.role !== 'ADMIN' && !isDev) ? { userId: user.id } : {}

    let devis: any[] = []
    try {
      devis = await prisma.devis.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true } },
          items: { include: { product: true } },
          managedBy: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    } catch (dbErr) {
      console.warn("Prisma TCP direct connection failed, using Neon HTTP fallback:", dbErr)
    }

    if (!devis || devis.length === 0) {
      devis = await fetchProductionDevis()
    }

    return NextResponse.json(devis)
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer un devis (client ou admin)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const user = session.user as any
    const body = await req.json()
    const { vehicleBrand, vehicleModel, vehicleYear, vehicleVin, notes, items, clientEmail, quoteId, managedByName } = body

    let targetUserId = user.id

    // Si c'est l'admin qui crée le devis pour un client
    if (user.role === 'ADMIN' && clientEmail) {
      const clientUser = await prisma.user.findFirst({
        where: { email: { equals: clientEmail, mode: 'insensitive' } }
      })
      if (!clientUser) {
        return NextResponse.json({ error: 'Aucun utilisateur client trouvé avec cet e-mail. Le client doit d\'abord s\'inscrire.' }, { status: 404 })
      }
      targetUserId = clientUser.id
    }

    // Chercher le profil admin actif
    let managedById = null;
    if (managedByName) {
      let profile = await prisma.adminProfile.findUnique({
        where: { name: managedByName }
      });
      if (!profile) {
        profile = await prisma.adminProfile.create({
          data: { name: managedByName }
        });
      }
      managedById = profile.id;
    }

    // Auto-enregistrement des nouveaux articles et association aux produits
    const devisItems = [];
    for (const item of items) {
      const name = item.name || item.designation || 'Nouvel Article';
      const reference = item.reference ? item.reference.trim().toUpperCase() : null;
      let productId = null;

      if (reference) {
        let product = await prisma.product.findFirst({
          where: { OR: [{ reference }, { sku: reference }] }
        });

        if (!product) {
          let category = await prisma.category.findFirst();
          if (!category) {
            category = await prisma.category.create({
              data: { name: 'Général', slug: 'general' }
            });
          }

          product = await prisma.product.create({
            data: {
              sku: reference,
              reference: reference,
              name: name,
              slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${reference.toLowerCase()}`,
              price: parseFloat(item.price || item.puHT) || 0,
              costPrice: (parseFloat(item.price || item.puHT) || 0) * 0.8,
              stock: 0,
              categoryId: category.id,
              status: 'ACTIVE'
            }
          });
        }
        productId = product.id;
      }

      devisItems.push({
        name,
        reference,
        price: parseFloat(item.price || item.puHT) || 0,
        quantity: parseInt(item.quantity || item.qty) || 1,
        discount: parseFloat(item.discount) || 0,
        productId
      });
    }

    const devis = await prisma.devis.create({
      data: {
        userId: targetUserId,
        vehicleBrand,
        vehicleModel,
        vehicleYear: parseInt(vehicleYear) || null,
        vehicleVin,
        notes,
        status: user.role === 'ADMIN' ? 'completed' : 'pending', // directement traité si fait par admin
        totalPrice: user.role === 'ADMIN' ? parseFloat(body.totalPrice) || 0 : 0,
        responseNote: user.role === 'ADMIN' ? body.responseNote || 'Proposition commerciale établie par l\'administrateur.' : null,
        items: {
          create: devisItems
        },
        managedById
      },
      include: { items: true },
    })

    // Si quoteId est transmis, vérifier s'il s'agit d'une demande de devis (Quote) ou d'un devis existant (Devis)
    if (quoteId) {
      const existingQuote = await prisma.quote.findUnique({ where: { id: quoteId } });
      if (existingQuote) {
        await prisma.quote.update({
          where: { id: quoteId },
          data: { 
            status: 'TREATED',
            ...(managedById ? { managedById } : {})
          }
        });
      } else {
        const existingDevis = await prisma.devis.findUnique({ where: { id: quoteId } });
        if (existingDevis) {
          await prisma.devisItem.deleteMany({ where: { devisId: quoteId } });
          const updatedDevis = await prisma.devis.update({
            where: { id: quoteId },
            data: {
              vehicleBrand,
              vehicleModel,
              vehicleYear: parseInt(vehicleYear) || null,
              vehicleVin,
              notes,
              totalPrice: user.role === 'ADMIN' ? parseFloat(body.totalPrice) || 0 : 0,
              responseNote: user.role === 'ADMIN' ? body.responseNote || 'Proposition commerciale mise à jour par l\'administrateur.' : null,
              items: { create: devisItems },
              ...(managedById ? { managedById } : {})
            },
            include: { items: true }
          });
          
          // Enregistrer aussi les offres dans PartPriceHistory lors d'une modification
          const priceHistoryData = [];
          for (let i = 0; i < items.length; i++) {
            const sourceItem = items[i];
            if (sourceItem.reference && sourceItem.offres && Array.isArray(sourceItem.offres)) {
              for (const offre of sourceItem.offres) {
                if (offre.supplierId || offre.purchasePrice || offre.sellingPrice) {
                  priceHistoryData.push({
                    reference: sourceItem.reference.trim().toUpperCase(),
                    isConcessionnaire: offre.type === 'ORIGINE',
                    supplierId: offre.supplierId || null,
                    purchasePrice: parseFloat(offre.purchasePrice) || null,
                    sellingPrice: parseFloat(offre.sellingPrice) || null,
                  });
                }
              }
            }
          }
          if (priceHistoryData.length > 0) {
            await prisma.partPriceHistory.createMany({ data: priceHistoryData }).catch(() => {});
          }

          return NextResponse.json(updatedDevis, { status: 200 });
        }
      }
    }

    // Insérer l'historique des prix via PartPriceHistory pour chaque offre
    const priceHistoryData = [];
    for (let i = 0; i < items.length; i++) {
      const sourceItem = items[i];
      if (sourceItem.reference && sourceItem.offres && Array.isArray(sourceItem.offres)) {
        for (const offre of sourceItem.offres) {
          if (offre.supplierId || offre.purchasePrice || offre.sellingPrice) {
            priceHistoryData.push({
              reference: sourceItem.reference.trim().toUpperCase(),
              isConcessionnaire: offre.type === 'ORIGINE',
              supplierId: offre.supplierId || null,
              purchasePrice: parseFloat(offre.purchasePrice) || null,
              sellingPrice: parseFloat(offre.sellingPrice) || null,
            });
          }
        }
      }
    }
    
    if (priceHistoryData.length > 0) {
      await prisma.partPriceHistory.createMany({
        data: priceHistoryData
      });
    }

    return NextResponse.json(devis, { status: 201 })
  } catch (error: any) {
    console.error('Error creating devis:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage ? `Erreur création devis : ${errorMessage}` : "Erreur création devis" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { devisId, managedByName } = body;

    if (!devisId) {
      return NextResponse.json({ error: 'Identifiant de devis requis' }, { status: 400 });
    }

    const data: any = {};

    if (managedByName !== undefined) {
      if (managedByName === null || managedByName === 'NON ASSIGNÉ') {
        data.managedById = null;
      } else {
        let profile = await prisma.adminProfile.findUnique({
          where: { name: managedByName }
        });
        if (!profile) {
          profile = await prisma.adminProfile.create({
            data: { name: managedByName }
          });
        }
        data.managedById = profile.id;
      }
    }

    const updatedDevis = await prisma.devis.update({
      where: { id: devisId },
      data,
      include: {
        managedBy: true,
        items: true
      }
    });

    return NextResponse.json({ success: true, data: updatedDevis });
  } catch (error) {
    console.error('Devis PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const user = session.user as any
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Identifiant du devis requis' }, { status: 400 })
    }

    const devis = await prisma.devis.findUnique({
      where: { id }
    })

    if (!devis) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && devis.userId !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    await prisma.devis.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Devis supprimé avec succès' })
  } catch (error: any) {
    console.error('Error deleting devis:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la suppression' }, { status: 500 })
  }
}