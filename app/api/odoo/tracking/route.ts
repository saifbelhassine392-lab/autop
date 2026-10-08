import { NextRequest, NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const ODOO_CONFIG = {
  baseUrl: process.env.ODOO_URL || "https://autop-soft.autop.tn",
  db: process.env.ODOO_DB || "AUTOP_PRODUCTION",
  login: process.env.ODOO_LOGIN || "seifeddine.belhessine@autop.tn",
  password: process.env.ODOO_PASSWORD || "AUTOP2025-seib",
};

let cachedSessionCookie: string | null = null;
let cachedSessionExpiry: number = 0;

async function getOdooSession(): Promise<{ cookie: string; uid: number; name: string }> {
  const now = Date.now();
  if (cachedSessionCookie && now < cachedSessionExpiry) {
    return { cookie: cachedSessionCookie, uid: 213, name: "Seifeddine Belhessine" };
  }

  const authRes = await fetch(`${ODOO_CONFIG.baseUrl}/web/session/authenticate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AUTOP/1.0"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      params: {
        db: ODOO_CONFIG.db,
        login: ODOO_CONFIG.login,
        password: ODOO_CONFIG.password
      }
    })
  });

  if (!authRes.ok) {
    throw new Error(`HTTP ${authRes.status} lors de la connexion Odoo`);
  }

  const authData = await authRes.json().catch(() => null);
  if (!authData?.result?.uid) {
    const errDetail = authData?.error?.data?.message || authData?.error?.message || "Identifiants Odoo invalides";
    throw new Error(`Échec authentification Odoo: ${errDetail}`);
  }

  const setCookie = authRes.headers.get("set-cookie") || "";
  const matchSession = setCookie.match(/session_id=[^;]+/i);
  const sessionCookie = matchSession ? matchSession[0] : "";

  cachedSessionCookie = sessionCookie;
  cachedSessionExpiry = now + 1000 * 60 * 60 * 2; // 2 heures

  return {
    cookie: sessionCookie,
    uid: authData.result.uid,
    name: authData.result.name || "Seifeddine Belhessine"
  };
}

async function callOdooKw(model: string, method: string, args: any[] = [], kwargs: Record<string, any> = {}): Promise<any> {
  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const session = await getOdooSession();
      const res = await fetch(`${ODOO_CONFIG.baseUrl}/web/dataset/call_kw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": session.cookie,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AUTOP/1.0"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params: { model, method, args, kwargs }
        })
      });

      if (!res.ok) {
        throw new Error(`Erreur RPC Odoo ${model}.${method}: HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => null);
      if (data?.error) {
        const msg = String(data.error.data?.message || data.error.message || "");
        if (attempts < 2 && (msg.includes("Session") || msg.includes("Connection") || msg.includes("closed"))) {
          cachedSessionCookie = null;
          await new Promise(r => setTimeout(r, 400));
          continue;
        }
        throw new Error(`Erreur Odoo: ${msg}`);
      }

      return data?.result;
    } catch (err: any) {
      if (attempts < 2) {
        cachedSessionCookie = null;
        await new Promise(r => setTimeout(r, 400));
        continue;
      }
      throw err;
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || searchParams.get('ref') || '';
  return handleSearch(query);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const query = body.query || body.ref || '';
  return handleSearch(query);
}

async function handleSearch(query: string) {
  const rawQ = query.trim();
  if (!rawQ) {
    return NextResponse.json({
      success: false,
      error: "Veuillez fournir une référence ou un nom d'article à rechercher."
    }, { status: 400 });
  }

  const cleanNoSpaces = rawQ.replace(/[\s\-_.\/]+/g, "");

  try {
    // 1. Recherche dans product.product
    const productDomain = [
      "|", "|",
      ["default_code", "ilike", rawQ],
      ["default_code", "ilike", cleanNoSpaces],
      ["name", "ilike", rawQ]
    ];

    const products = await callOdooKw("product.product", "search_read", [productDomain], {
      fields: ["id", "name", "default_code", "standard_price", "list_price", "qty_available", "categ_id", "barcode"],
      limit: 15
    }).catch(() => []) || [];

    const productIds = products.map((p: any) => p.id);

    // 2. Recherche dans purchase.order.line (Historique d'achat par fournisseur - COMMANDES CONFIRMÉES UNIQUEMENT)
    const poDomain = productIds.length > 0 ? [
      "&",
      ["state", "in", ["purchase", "done"]],
      "|",
      ["product_id", "in", productIds],
      "|",
      ["name", "ilike", rawQ],
      ["name", "ilike", cleanNoSpaces]
    ] : [
      "&",
      ["state", "in", ["purchase", "done"]],
      "|",
      ["name", "ilike", rawQ],
      ["name", "ilike", cleanNoSpaces]
    ];

    const rawPoLines = await callOdooKw("purchase.order.line", "search_read", [poDomain], {
      fields: [
        "id", "name", "product_id", "price_unit", "product_qty",
        "partner_id", "date_order", "order_id", "price_total",
        "price_subtotal", "state"
      ],
      limit: 60,
      order: "date_order desc"
    }).catch(() => []) || [];

    // Formatage de l'historique d'achat (commandes confirmées)
    const purchaseHistory = rawPoLines.map((po: any) => {
      const supplierName = Array.isArray(po.partner_id) ? po.partner_id[1] : (po.partner_id || 'Fournisseur Inconnu');
      const orderRef = Array.isArray(po.order_id) ? po.order_id[1] : (po.order_id || `PO-${po.id}`);
      const productName = Array.isArray(po.product_id) ? po.product_id[1] : (po.name || rawQ);
      const qty = parseFloat(po.product_qty) || 0;
      const unitPrice = parseFloat(po.price_unit) || 0;
      const totalCost = parseFloat(po.price_subtotal) || (qty * unitPrice);

      let stateLabel = 'Bon Confirmé';
      let stateColor = 'emerald';
      if (po.state === 'done') {
        stateLabel = 'Livré / Clôturé';
        stateColor = 'blue';
      }

      return {
        id: po.id,
        date: po.date_order ? new Date(po.date_order).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Non daté',
        rawDate: po.date_order || '',
        supplierName,
        orderReference: orderRef,
        productName,
        quantity: qty,
        unitPrice,
        totalCost,
        state: po.state || 'purchase',
        stateLabel,
        stateColor
      };
    });

    // 3. Recherche dans stock.move (Mouvements réels de stock, exclut annulations)
    const moveDomain = productIds.length > 0 ? [
      "&",
      ["state", "!=", "cancel"],
      "|",
      ["product_id", "in", productIds],
      "|",
      ["name", "ilike", rawQ],
      ["name", "ilike", cleanNoSpaces]
    ] : [
      "&",
      ["state", "!=", "cancel"],
      "|",
      ["name", "ilike", rawQ],
      ["name", "ilike", cleanNoSpaces]
    ];

    const rawMoves = await callKw("stock.move", "search_read", [moveDomain], {
      fields: [
        "id", "name", "product_id", "product_uom_qty", "quantity_done",
        "location_id", "location_dest_id", "state", "date", "reference",
        "picking_id", "origin"
      ],
      limit: 60,
      order: "date desc"
    }).catch(() => []) || [];

    // Formatage des mouvements de stock
    const stockMovements = rawMoves.map((m: any) => {
      const locSrc = Array.isArray(m.location_id) ? m.location_id[1] : (m.location_id || '');
      const locDest = Array.isArray(m.location_dest_id) ? m.location_dest_id[1] : (m.location_dest_id || '');
      const prodName = Array.isArray(m.product_id) ? m.product_id[1] : (m.name || rawQ);
      const moveRef = m.reference || (Array.isArray(m.picking_id) ? m.picking_id[1] : `MOVE-${m.id}`);
      const originDoc = m.origin || '';
      
      const qtyDone = parseFloat(m.quantity_done) || 0;
      const qtyExpected = parseFloat(m.product_uom_qty) || 0;
      const finalQty = qtyDone > 0 ? qtyDone : qtyExpected;

      // Déduction du type de flux
      let type: 'ACHAT' | 'VENTE' | 'TRANSFERT' = 'TRANSFERT';
      let typeLabel = 'Transfert Interne';
      let typeBadge = 'bg-blue-500/20 text-blue-400 border-blue-500/30';

      const srcLower = locSrc.toLowerCase();
      const destLower = locDest.toLowerCase();

      if (srcLower.includes('vendor') || srcLower.includes('fournisseur') || (destLower.includes('stock') && !srcLower.includes('stock')) || originDoc.startsWith('PO/')) {
        type = 'ACHAT';
        typeLabel = 'Entrée (Achat Fournisseur)';
        typeBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      } else if (destLower.includes('customer') || destLower.includes('client') || (srcLower.includes('stock') && !destLower.includes('stock')) || originDoc.startsWith('SO')) {
        type = 'VENTE';
        typeLabel = 'Sortie (Vente Client / Dossier)';
        typeBadge = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      }

      let stateLabel = 'Validé / Réalisé';
      let stateColor = 'emerald';
      if (m.state === 'draft') {
        stateLabel = 'Brouillon';
        stateColor = 'slate';
      } else if (m.state === 'confirmed' || m.state === 'waiting') {
        stateLabel = 'En attente';
        stateColor = 'amber';
      } else if (m.state === 'assigned') {
        stateLabel = 'Prêt / Réservé';
        stateColor = 'cyan';
      } else if (m.state === 'cancel') {
        stateLabel = 'Annulé';
        stateColor = 'rose';
      }

      return {
        id: m.id,
        date: m.date ? new Date(m.date).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Non daté',
        rawDate: m.date || '',
        productName: prodName,
        type,
        typeLabel,
        typeBadge,
        reference: moveRef,
        origin: originDoc,
        sourceLocation: locSrc,
        destLocation: locDest,
        quantity: finalQty,
        quantityExpected: qtyExpected,
        quantityDone: qtyDone,
        state: m.state || 'done',
        stateLabel,
        stateColor
      };
    });

    // 4. Synthèse et KPIs
    const primaryProduct = products[0] || null;
    const totalStock = products.reduce((acc: number, p: any) => acc + (parseFloat(p.qty_available) || 0), 0);
    const lastPurchaseWithPrice = purchaseHistory.find((p: any) => p.unitPrice > 0) || purchaseHistory[0] || null;
    const lastPurchase = purchaseHistory[0] || null;

    const totalPurchasedQty = purchaseHistory.reduce((acc: number, po: any) => acc + (po.quantity || 0), 0);
    const totalPurchaseSpend = purchaseHistory.reduce((acc: number, po: any) => acc + (po.totalCost || 0), 0);

    const inMovesCount = stockMovements.filter((m: any) => m.type === 'ACHAT').length;
    const outMovesCount = stockMovements.filter((m: any) => m.type === 'VENTE').length;
    const internalMovesCount = stockMovements.filter((m: any) => m.type === 'TRANSFERT').length;

    return NextResponse.json({
      success: true,
      query: rawQ,
      count: {
        products: products.length,
        purchases: purchaseHistory.length,
        movements: stockMovements.length
      },
      product: primaryProduct ? {
        id: primaryProduct.id,
        name: primaryProduct.name,
        reference: primaryProduct.default_code || rawQ.toUpperCase(),
        standardPrice: lastPurchaseWithPrice && lastPurchaseWithPrice.unitPrice > 0 ? lastPurchaseWithPrice.unitPrice : (parseFloat(primaryProduct.standard_price) || 0),
        listPrice: parseFloat(primaryProduct.list_price) || 0,
        stockAvailable: parseFloat(primaryProduct.qty_available) || 0,
        category: Array.isArray(primaryProduct.categ_id) ? primaryProduct.categ_id[1] : (primaryProduct.categ_id || 'Pièces')
      } : null,
      allProducts: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        reference: p.default_code || '',
        standardPrice: parseFloat(p.standard_price) || 0,
        listPrice: parseFloat(p.list_price) || 0,
        stockAvailable: parseFloat(p.qty_available) || 0,
        category: Array.isArray(p.categ_id) ? p.categ_id[1] : (p.categ_id || '')
      })),
      summary: {
        totalStock,
        lastPurchasePrice: lastPurchaseWithPrice ? lastPurchaseWithPrice.unitPrice : (primaryProduct ? parseFloat(primaryProduct.standard_price) || 0 : 0),
        lastSupplier: lastPurchaseWithPrice ? lastPurchaseWithPrice.supplierName : (lastPurchase ? lastPurchase.supplierName : 'N/A'),
        lastPurchaseDate: lastPurchaseWithPrice ? lastPurchaseWithPrice.date : (lastPurchase ? lastPurchase.date : 'N/A'),
        lastOrderReference: lastPurchaseWithPrice ? lastPurchaseWithPrice.orderReference : (lastPurchase ? lastPurchase.orderReference : 'N/A'),
        sellingPrice: primaryProduct ? parseFloat(primaryProduct.list_price) || 0 : 0,
        totalPurchasedQty,
        totalPurchaseSpend,
        inMovesCount,
        outMovesCount,
        internalMovesCount
      },
      purchaseHistory,
      stockMovements
    });

  } catch (err: any) {
    console.error("[Odoo Tracking API] Error:", err.message);
    return NextResponse.json({
      success: false,
      error: `Erreur de connexion Odoo : ${err.message}`
    }, { status: 500 });
  }
}

async function callKw(model: string, method: string, args: any[] = [], kwargs: Record<string, any> = {}) {
  return callOdooKw(model, method, args, kwargs);
}
