import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const referencesParam = searchParams.get('references');

    if (referencesParam) {
      const refs = referencesParam.split(',').map(r => r.trim().toUpperCase()).filter(Boolean);
      const histories = await prisma.partPriceHistory.findMany({
        where: {
          reference: { in: refs }
        },
        include: {
          supplier: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
      return NextResponse.json({ success: true, data: histories });
    }

    if (!reference) {
      const histories = await prisma.partPriceHistory.findMany({
        include: {
          supplier: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
      return NextResponse.json({ success: true, data: histories });
    }

    const histories = await prisma.partPriceHistory.findMany({
      where: {
        reference: {
          equals: reference,
          mode: 'insensitive'
        }
      },
      include: {
        supplier: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, data: histories });
  } catch (error) {
    console.error("Erreur API historique-prix GET:", error);
    return NextResponse.json({ success: false, error: "Erreur interne du serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Support pour sauvegarde groupée des offres (Depuis le devis ou la synthèse)
    if (data.offresList && Array.isArray(data.offresList)) {
      const results = [];
      for (const o of data.offresList) {
        if (!o.reference) continue;
        const refUpper = o.reference.trim().toUpperCase();
        const type = o.type === 'ORIGINE' ? 'OEM' : (o.type || 'ADAPTABLE');
        const isConcessionnaire = type === 'OEM' || type === 'PVP' || type === 'CONCESSIONNAIRE';
        const suppName = o.supplierName || 'Fournisseur';

        const existing = await prisma.partPriceHistory.findFirst({
          where: { reference: refUpper, supplierName: suppName, type }
        });

        if (existing) {
          await prisma.partPriceHistory.update({
            where: { id: existing.id },
            data: {
              purchasePrice: parseFloat(o.purchasePrice) || 0,
              sellingPrice: parseFloat(o.sellingPrice) || parseFloat(o.purchasePrice) || 0
            }
          });
        } else {
          await prisma.partPriceHistory.create({
            data: {
              reference: refUpper,
              supplierId: o.supplierId || null,
              supplierName: suppName,
              purchasePrice: parseFloat(o.purchasePrice) || 0,
              sellingPrice: parseFloat(o.sellingPrice) || parseFloat(o.purchasePrice) || 0,
              type,
              isConcessionnaire
            }
          });
        }
        results.push(refUpper);
      }
      return NextResponse.json({ success: true, message: 'Offres enregistrées en historique', references: results });
    }

    // Support pour sauvegarde groupée (Synthèse meilleures offres)
    if (data.syntheseList && Array.isArray(data.syntheseList)) {
      const results = [];
      for (const item of data.syntheseList) {
        const { reference, pvp, bestOemPrice, oemSupplierName, bestAdaptablePrice, adaptableSupplierName } = item;
        if (!reference) continue;
        const refUpper = reference.trim().toUpperCase();

        // 1. PVP (Concessionnaire)
        if (pvp !== undefined && pvp !== null && pvp !== '') {
          const pvpVal = parseFloat(pvp) || 0;
          const existingPvp = await prisma.partPriceHistory.findFirst({
            where: { reference: refUpper, isConcessionnaire: true }
          });
          if (existingPvp) {
            await prisma.partPriceHistory.update({
              where: { id: existingPvp.id },
              data: { sellingPrice: pvpVal, type: 'PVP' }
            });
          } else {
            await prisma.partPriceHistory.create({
              data: { reference: refUpper, sellingPrice: pvpVal, isConcessionnaire: true, type: 'PVP', supplierName: 'Concessionnaire' }
            });
          }
        }

        // 2. Meilleur OEM
        if (bestOemPrice !== undefined && bestOemPrice !== null && bestOemPrice !== '') {
          const oemVal = parseFloat(bestOemPrice) || 0;
          const suppName = oemSupplierName?.trim() || 'OEM Supplier';
          const existingOem = await prisma.partPriceHistory.findFirst({
            where: { reference: refUpper, type: 'OEM' }
          });
          if (existingOem) {
            await prisma.partPriceHistory.update({
              where: { id: existingOem.id },
              data: { sellingPrice: oemVal, purchasePrice: oemVal, supplierName: suppName }
            });
          } else {
            await prisma.partPriceHistory.create({
              data: { reference: refUpper, sellingPrice: oemVal, purchasePrice: oemVal, supplierName: suppName, type: 'OEM', isConcessionnaire: false }
            });
          }
        }

        // 3. Meilleur Adaptable
        if (bestAdaptablePrice !== undefined && bestAdaptablePrice !== null && bestAdaptablePrice !== '') {
          const adVal = parseFloat(bestAdaptablePrice) || 0;
          const suppName = adaptableSupplierName?.trim() || 'Adaptable Supplier';
          const existingAd = await prisma.partPriceHistory.findFirst({
            where: { reference: refUpper, type: 'ADAPTABLE', isConcessionnaire: false }
          });
          if (existingAd) {
            await prisma.partPriceHistory.update({
              where: { id: existingAd.id },
              data: { sellingPrice: adVal, purchasePrice: adVal, supplierName: suppName }
            });
          } else {
            await prisma.partPriceHistory.create({
              data: { reference: refUpper, sellingPrice: adVal, purchasePrice: adVal, supplierName: suppName, type: 'ADAPTABLE', isConcessionnaire: false }
            });
          }
        }

        results.push(refUpper);
      }
      return NextResponse.json({ success: true, message: 'Synthèse enregistrée avec succès en base de données', references: results });
    }

    // Sauvegarde individuelle (Comportement classique)
    const { reference, supplierId, supplierName, purchasePrice, sellingPrice, isConcessionnaire, type } = data;

    if (!reference) {
      return NextResponse.json({ success: false, error: "Référence requise" }, { status: 400 });
    }

    const refUpper = reference.trim().toUpperCase();
    let existingHistory;

    if (supplierId) {
      existingHistory = await prisma.partPriceHistory.findFirst({
        where: { reference: refUpper, supplierId }
      });
    } else if (isConcessionnaire) {
      existingHistory = await prisma.partPriceHistory.findFirst({
        where: { reference: refUpper, isConcessionnaire: true }
      });
    }

    let record;
    if (existingHistory) {
      record = await prisma.partPriceHistory.update({
        where: { id: existingHistory.id },
        data: {
          purchasePrice: purchasePrice ?? existingHistory.purchasePrice,
          sellingPrice: sellingPrice ?? existingHistory.sellingPrice,
          supplierName: supplierName ?? existingHistory.supplierName,
          type: type || existingHistory.type
        }
      });
    } else {
      record = await prisma.partPriceHistory.create({
        data: {
          reference: refUpper,
          supplierId,
          supplierName,
          purchasePrice,
          sellingPrice,
          type: type || (isConcessionnaire ? 'PVP' : 'ADAPTABLE'),
          isConcessionnaire: !!isConcessionnaire
        }
      });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("Erreur API historique-prix POST:", error);
    return NextResponse.json({ success: false, error: "Erreur interne du serveur" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const data = await request.json();
    const { id, reference, supplierId, supplierName, purchasePrice, sellingPrice, type } = data;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID requis" }, { status: 400 });
    }

    const updated = await prisma.partPriceHistory.update({
      where: { id },
      data: {
        ...(reference ? { reference: reference.trim().toUpperCase() } : {}),
        ...(supplierId !== undefined ? { supplierId } : {}),
        ...(supplierName !== undefined ? { supplierName } : {}),
        ...(purchasePrice !== undefined ? { purchasePrice: parseFloat(purchasePrice) || 0 } : {}),
        ...(sellingPrice !== undefined ? { sellingPrice: parseFloat(sellingPrice) || 0 } : {}),
        ...(type !== undefined ? { type, isConcessionnaire: type === 'OEM' || type === 'PVP' || type === 'CONCESSIONNAIRE' } : {})
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Erreur API historique-prix PATCH:", error);
    return NextResponse.json({ success: false, error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: "ID requis" }, { status: 400 });
    }

    await prisma.partPriceHistory.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Entrée supprimée" });
  } catch (error) {
    console.error("Erreur API historique-prix DELETE:", error);
    return NextResponse.json({ success: false, error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
