import { NextRequest, NextResponse } from 'next/server';
import { callOdooKw } from '@/lib/odoo';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawRef = searchParams.get('reference') || searchParams.get('ref') || searchParams.get('query') || '';
    const cleanRef = rawRef.trim().toUpperCase();

    if (!cleanRef) {
      return NextResponse.json({ success: false, error: 'Référence requise' }, { status: 400 });
    }

    const noSpaceRef = cleanRef.replace(/[\s\-_]/g, '');

    // 1. Recherche dans Odoo purchase.order.line (Achats Fournisseurs)
    let odooPurchases: any[] = [];
    try {
      const poLines = await callOdooKw('purchase.order.line', 'search_read', [
        ['|', '|', ['name', 'ilike', cleanRef], ['name', 'ilike', noSpaceRef], ['product_id.default_code', 'ilike', cleanRef]],
        ['id', 'name', 'product_id', 'price_unit', 'product_qty', 'partner_id', 'date_order', 'order_id', 'state']
      ], { limit: 50, order: 'date_order desc' });

      if (Array.isArray(poLines)) {
        odooPurchases = poLines.map((po: any) => ({
          id: po.id,
          date: po.date_order ? new Date(po.date_order).toLocaleDateString('fr-FR') : '-',
          rawDate: po.date_order,
          supplierName: Array.isArray(po.partner_id) ? po.partner_id[1] : 'Fournisseur Inconnu',
          orderNumber: Array.isArray(po.order_id) ? po.order_id[1] : `PO-${po.id}`,
          designation: po.name || '',
          quantity: po.product_qty || 1,
          purchasePrice: parseFloat(po.price_unit) || 0,
          state: po.state === 'purchase' ? 'Validé' : po.state === 'done' ? 'Reçu' : 'Brouillon'
        }));
      }
    } catch (poErr: any) {
      console.warn('[Odoo History] Erreur lecture purchase.order.line:', poErr.message);
    }

    // 2. Recherche dans Odoo sale.order.line (Ventes & Devis Clients)
    let odooSales: any[] = [];
    try {
      const soLines = await callOdooKw('sale.order.line', 'search_read', [
        ['|', '|', ['name', 'ilike', cleanRef], ['name', 'ilike', noSpaceRef], ['product_id.default_code', 'ilike', cleanRef]],
        ['id', 'name', 'product_id', 'price_unit', 'product_uom_qty', 'order_partner_id', 'order_id', 'create_date', 'state']
      ], { limit: 50, order: 'create_date desc' });

      if (Array.isArray(soLines)) {
        odooSales = soLines.map((so: any) => {
          let stateLabel = 'Devis';
          let isQuote = false;
          let isSent = false;

          if (so.state === 'sent') {
            stateLabel = 'Devis Envoyé';
            isQuote = true;
            isSent = true;
          } else if (so.state === 'draft') {
            stateLabel = 'Devis Brouillon';
            isQuote = true;
          } else if (so.state === 'sale') {
            stateLabel = 'Vente Confirmée';
          } else if (so.state === 'done') {
            stateLabel = 'Vente Livrée / Facturée';
          } else if (so.state === 'cancel') {
            stateLabel = 'Devis Annulé';
          }

          return {
            id: so.id,
            date: so.create_date ? new Date(so.create_date).toLocaleDateString('fr-FR') : '-',
            rawDate: so.create_date,
            clientName: Array.isArray(so.order_partner_id) ? so.order_partner_id[1] : 'Client Comptoir',
            orderNumber: Array.isArray(so.order_id) ? so.order_id[1] : `SO-${so.id}`,
            designation: so.name || '',
            quantity: so.product_uom_qty || 1,
            sellingPrice: parseFloat(so.price_unit) || 0,
            state: stateLabel,
            rawState: so.state,
            isQuote,
            isSent
          };
        });
      }
    } catch (soErr: any) {
      console.warn('[Odoo History] Erreur lecture sale.order.line:', soErr.message);
    }

    // 3. Recherche dans Odoo account.move.line (Factures Ventes)
    try {
      if (odooSales.length < 5) {
        const invLines = await callOdooKw('account.move.line', 'search_read', [
          ['|', '|', ['name', 'ilike', cleanRef], ['name', 'ilike', noSpaceRef], ['product_id.default_code', 'ilike', cleanRef]],
          ['id', 'name', 'product_id', 'price_unit', 'quantity', 'partner_id', 'move_id', 'date', 'parent_state']
        ], { limit: 15, order: 'date desc' });

        if (Array.isArray(invLines)) {
          invLines.forEach((inv: any) => {
            const price = parseFloat(inv.price_unit) || 0;
            if (price > 0 && !odooSales.some(s => s.orderNumber === (Array.isArray(inv.move_id) ? inv.move_id[1] : ''))) {
              odooSales.push({
                id: inv.id,
                date: inv.date ? new Date(inv.date).toLocaleDateString('fr-FR') : '-',
                rawDate: inv.date,
                clientName: Array.isArray(inv.partner_id) ? inv.partner_id[1] : 'Client Facturé',
                orderNumber: Array.isArray(inv.move_id) ? inv.move_id[1] : `FA-${inv.id}`,
                designation: inv.name || '',
                quantity: inv.quantity || 1,
                sellingPrice: price,
                state: inv.parent_state === 'posted' ? 'Facture Validée' : 'Facture Brouillon',
                rawState: inv.parent_state,
                isQuote: false,
                isSent: false
              });
            }
          });
        }
      }
    } catch (invErr: any) {
      console.warn('[Odoo History] Erreur lecture account.move.line:', invErr.message);
    }

    // 4. Recherche dans Odoo product.product / product.template (Fiche article, catalogue & stock)
    let masterProduct: any = null;
    try {
      const products = await callOdooKw('product.product', 'search_read', [
        ['|', '|', ['default_code', 'ilike', cleanRef], ['default_code', 'ilike', noSpaceRef], ['name', 'ilike', cleanRef]],
        ['id', 'default_code', 'name', 'standard_price', 'list_price', 'qty_available']
      ], { limit: 1 });

      if (Array.isArray(products) && products.length > 0) {
        masterProduct = {
          id: products[0].id,
          reference: products[0].default_code || cleanRef,
          name: products[0].name,
          standardPrice: parseFloat(products[0].standard_price) || 0,
          listPrice: parseFloat(products[0].list_price) || 0,
          stock: products[0].qty_available || 0
        };
      }
    } catch (prodErr: any) {
      console.warn('[Odoo History] Erreur lecture product.product:', prodErr.message);
    }

    // 5. Recherche complémentaire dans la base locale PartPriceHistory
    let localHistory: any[] = [];
    try {
      localHistory = await prisma.partPriceHistory.findMany({
        where: {
          OR: [
            { reference: { equals: cleanRef } },
            { reference: { equals: noSpaceRef } }
          ]
        },
        orderBy: { updatedAt: 'desc' },
        take: 15
      });
    } catch (dbErr) {
      console.warn('[Odoo History] Erreur lecture local DB:', dbErr);
    }

    // Synthèse et calcul des métriques
    const validPurchases = odooPurchases.filter(p => p.purchasePrice > 0);
    const latestPurchase = validPurchases.length > 0 ? validPurchases[0] : odooPurchases[0] || null;

    const validSales = odooSales.filter(s => s.sellingPrice > 0);
    const latestSale = validSales.length > 0 ? validSales[0] : odooSales[0] || null;

    const lastPurchasePrice = latestPurchase?.purchasePrice || masterProduct?.standardPrice || 0;
    const lastSellingPrice = latestSale?.sellingPrice || (masterProduct?.listPrice && masterProduct.listPrice > 1 ? masterProduct.listPrice : 0) || (lastPurchasePrice > 0 ? lastPurchasePrice * 1.30 : 0);
    const lastSupplier = latestPurchase?.supplierName || (localHistory.length > 0 ? localHistory[0].supplierName : null);
    const lastPurchaseDate = latestPurchase?.date || (localHistory.length > 0 ? new Date(localHistory[0].updatedAt).toLocaleDateString('fr-FR') : null);

    const lastClient = latestSale?.clientName || null;
    const lastSaleDate = latestSale?.date || null;
    const lastQuoteNumber = latestSale?.orderNumber || null;
    const lastQuoteStatus = latestSale?.state || null;

    const hasPurchases = odooPurchases.length > 0 || (localHistory.some(h => h.purchasePrice > 0));
    const hasSalesOrQuotes = odooSales.length > 0;
    const hasHistory = hasPurchases || hasSalesOrQuotes || (masterProduct && (masterProduct.standardPrice > 0 || masterProduct.stock > 0 || masterProduct.listPrice > 1)) || localHistory.length > 0;

    return NextResponse.json({
      success: true,
      reference: cleanRef,
      hasHistory,
      hasPurchases,
      hasSalesOrQuotes,
      summary: {
        lastSupplier: hasPurchases ? lastSupplier : null,
        lastPurchasePrice: hasPurchases ? lastPurchasePrice : 0,
        lastPurchaseDate,
        lastClient: hasSalesOrQuotes ? lastClient : null,
        lastSellingPrice: hasSalesOrQuotes || lastSellingPrice > 0 ? lastSellingPrice : 0,
        lastSaleDate,
        lastQuoteNumber,
        lastQuoteStatus,
        totalPurchasesCount: odooPurchases.length,
        totalSalesCount: odooSales.length,
        stockOdoo: masterProduct?.stock ?? 0,
        articleName: masterProduct?.name || latestSale?.designation || latestPurchase?.designation || (localHistory.length > 0 ? localHistory[0].designation : cleanRef)
      },
      purchases: odooPurchases,
      sales: odooSales,
      localHistory: localHistory.map(h => ({
        id: h.id,
        source: h.source,
        sourceDetails: h.sourceDetails,
        supplierName: h.supplierName,
        purchasePrice: h.purchasePrice,
        sellingPrice: h.sellingPrice,
        stock: h.stock,
        discount: h.discount,
        date: new Date(h.date || h.updatedAt).toLocaleDateString('fr-FR')
      })),
      masterProduct
    });

  } catch (error: any) {
    console.error('[API Odoo Purchase History] Erreur:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

