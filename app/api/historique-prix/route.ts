import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const referencesParam = searchParams.get('references');
    const source = searchParams.get('source');
    const q = searchParams.get('q') || searchParams.get('search');
    const liveOdoo = searchParams.get('liveOdoo') === 'true';

    const whereClause: any = {};

    if (source && source !== 'ALL') {
      whereClause.source = source.toUpperCase();
    }

    if (referencesParam) {
      const refs = referencesParam.split(',').map(r => r.trim().toUpperCase()).filter(Boolean);
      whereClause.reference = { in: refs };
    } else if (reference) {
      whereClause.reference = reference.trim().toUpperCase();
    } else if (q) {
      const cleanQ = q.trim().toUpperCase();
      whereClause.OR = [
        { reference: { contains: cleanQ } },
        { designation: { contains: q.trim() } },
        { brand: { contains: cleanQ } },
        { supplierName: { contains: q.trim() } },
        { sourceDetails: { contains: q.trim() } }
      ];
    }

    const histories = await prisma.partPriceHistory.findMany({
      where: whereClause,
      include: {
        supplier: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 200
    });

    // Si recherche en direct dans Odoo demandée
    let liveOdooResults: any[] = [];
    if (liveOdoo && reference) {
      try {
        const { searchOdooByReference } = await import('@/lib/odoo');
        liveOdooResults = await searchOdooByReference(reference);
      } catch (odooErr) {
        console.warn("[Historique Prix] Odoo live query skipped:", odooErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: histories,
      liveOdoo: liveOdooResults,
      sourcesCount: {
        odoo: histories.filter(h => h.source === 'ODOO').length,
        email: histories.filter(h => h.source === 'EMAIL').length,
        sheets: histories.filter(h => h.source === 'GOOGLE_SHEETS').length,
        b2b: histories.filter(h => h.source === 'B2B_ROBOT').length,
        devis: histories.filter(h => h.source === 'DEVIS_INTERNE' || !h.source).length,
      }
    });
  } catch (error) {
    console.error("Erreur API historique-prix GET:", error);
    return NextResponse.json({ success: false, error: "Erreur interne du serveur" }, { status: 500 });
  }
}

async function resolveSupplierId(supplierId?: string | null, supplierName?: string | null) {
  if (supplierId) {
    const supp = await prisma.supplier.findUnique({ where: { id: supplierId } }).catch(() => null);
    if (supp) return supp.id;
  }
  if (supplierName && supplierName.trim()) {
    const suppByName = await prisma.supplier.findFirst({
      where: { name: supplierName.trim() }
    }).catch(() => null);
    if (suppByName) return suppByName.id;
  }
  return null;
}

async function upsertProductCatalog(reference: string, designation?: string | null, price?: number | null, costPrice?: number | null) {
  if (!reference) return;
  const refUpper = reference.trim().toUpperCase();
  try {
    const existing = await prisma.product.findFirst({
      where: { OR: [{ reference: refUpper }, { sku: refUpper }] }
    });

    const sellPrice = price && price > 0 ? price : (existing?.price || 0);
    const costP = costPrice && costPrice > 0 ? costPrice : (existing?.costPrice || (sellPrice * 0.8));

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          price: sellPrice,
          costPrice: costP,
          ...(designation ? { name: designation } : {})
        }
      });
    } else {
      let category = await prisma.category.findFirst();
      if (!category) {
        category = await prisma.category.create({
          data: { name: 'Général', slug: 'general' }
        });
      }

      const prodName = designation || `ARTICLE ${refUpper}`;
      const slug = `${prodName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${refUpper.toLowerCase()}-${Date.now()}`;

      await prisma.product.create({
        data: {
          sku: refUpper,
          reference: refUpper,
          name: prodName,
          slug,
          price: sellPrice,
          costPrice: costP,
          stock: 0,
          categoryId: category.id,
          status: 'ACTIVE'
        }
      });
    }
  } catch (err) {
    console.warn(`[Catalog Sync Warning] Could not sync product ${refUpper}:`, err);
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
        const validSupplierId = await resolveSupplierId(o.supplierId, suppName);

        const purchasePrice = parseFloat(o.purchasePrice) || 0;
        const sellingPrice = parseFloat(o.sellingPrice) || purchasePrice;

        const existing = await prisma.partPriceHistory.findFirst({
          where: { reference: refUpper, supplierName: suppName, type }
        });

        if (existing) {
          await prisma.partPriceHistory.update({
            where: { id: existing.id },
            data: {
              supplierId: validSupplierId,
              purchasePrice,
              sellingPrice
            }
          });
        } else {
          await prisma.partPriceHistory.create({
            data: {
              reference: refUpper,
              supplierId: validSupplierId,
              supplierName: suppName,
              purchasePrice,
              sellingPrice,
              type,
              isConcessionnaire
            }
          });
        }

        // Auto-enrichissement du catalogue général (Product)
        await upsertProductCatalog(refUpper, o.designation || o.name, sellingPrice, purchasePrice);
        results.push(refUpper);
      }
      return NextResponse.json({ success: true, message: 'Offres enregistrées et catalogue enrichi avec succès', references: results });
    }

    // Support pour sauvegarde groupée (Synthèse meilleures offres)
    if (data.syntheseList && Array.isArray(data.syntheseList)) {
      const results = [];
      for (const item of data.syntheseList) {
        const { reference, designation, pvp, bestOemPrice, oemSupplierName, bestAdaptablePrice, adaptableSupplierName } = item;
        if (!reference) continue;
        const refUpper = reference.trim().toUpperCase();

        let maxPrice = 0;

        // 1. PVP (Concessionnaire)
        if (pvp !== undefined && pvp !== null && pvp !== '') {
          const pvpVal = parseFloat(pvp) || 0;
          if (pvpVal > maxPrice) maxPrice = pvpVal;
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
          if (oemVal > maxPrice) maxPrice = oemVal;
          const suppName = oemSupplierName?.trim() || 'OEM Supplier';
          const validSuppId = await resolveSupplierId(null, suppName);
          const existingOem = await prisma.partPriceHistory.findFirst({
            where: { reference: refUpper, type: 'OEM' }
          });
          if (existingOem) {
            await prisma.partPriceHistory.update({
              where: { id: existingOem.id },
              data: { sellingPrice: oemVal, purchasePrice: oemVal, supplierName: suppName, supplierId: validSuppId }
            });
          } else {
            await prisma.partPriceHistory.create({
              data: { reference: refUpper, sellingPrice: oemVal, purchasePrice: oemVal, supplierName: suppName, supplierId: validSuppId, type: 'OEM', isConcessionnaire: false }
            });
          }
        }

        // 3. Meilleur Adaptable
        if (bestAdaptablePrice !== undefined && bestAdaptablePrice !== null && bestAdaptablePrice !== '') {
          const adVal = parseFloat(bestAdaptablePrice) || 0;
          if (adVal > maxPrice) maxPrice = adVal;
          const suppName = adaptableSupplierName?.trim() || 'Adaptable Supplier';
          const validSuppId = await resolveSupplierId(null, suppName);
          const existingAd = await prisma.partPriceHistory.findFirst({
            where: { reference: refUpper, type: 'ADAPTABLE', isConcessionnaire: false }
          });
          if (existingAd) {
            await prisma.partPriceHistory.update({
              where: { id: existingAd.id },
              data: { sellingPrice: adVal, purchasePrice: adVal, supplierName: suppName, supplierId: validSuppId }
            });
          } else {
            await prisma.partPriceHistory.create({
              data: { reference: refUpper, sellingPrice: adVal, purchasePrice: adVal, supplierName: suppName, supplierId: validSuppId, type: 'ADAPTABLE', isConcessionnaire: false }
            });
          }
        }

        // Auto-enrichissement du catalogue général (Product)
        await upsertProductCatalog(refUpper, designation, maxPrice);
        results.push(refUpper);
      }
      return NextResponse.json({ success: true, message: 'Synthèse enregistrée et catalogue enrichi avec succès', references: results });
    }

    // Sauvegarde individuelle (Comportement classique)
    const { reference, designation, supplierId, supplierName, purchasePrice, sellingPrice, isConcessionnaire, type } = data;

    if (!reference) {
      return NextResponse.json({ success: false, error: "Référence requise" }, { status: 400 });
    }

    const refUpper = reference.trim().toUpperCase();
    const validSupplierId = await resolveSupplierId(supplierId, supplierName);

    let existingHistory;
    if (validSupplierId) {
      existingHistory = await prisma.partPriceHistory.findFirst({
        where: { reference: refUpper, supplierId: validSupplierId }
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
          supplierId: validSupplierId,
          type: type || existingHistory.type
        }
      });
    } else {
      record = await prisma.partPriceHistory.create({
        data: {
          reference: refUpper,
          supplierId: validSupplierId,
          supplierName,
          purchasePrice,
          sellingPrice,
          type: type || (isConcessionnaire ? 'PVP' : 'ADAPTABLE'),
          isConcessionnaire: !!isConcessionnaire
        }
      });
    }

    // Auto-enrichissement du catalogue général (Product)
    await upsertProductCatalog(refUpper, designation, sellingPrice, purchasePrice);

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
