import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

const ODOO_DASH_PASSWORD = process.env.ODOO_DASH_PASSWORD || "AutopOdoo2026!Securite";
const AUTH_SALT = process.env.NEXTAUTH_SECRET || "autop_odoo_secure_salt_2026";

function isAuthorized(req: NextRequest): boolean {
  const expectedToken = crypto.createHmac('sha256', AUTH_SALT).update(ODOO_DASH_PASSWORD).digest('hex');
  const cookieToken = req.cookies.get('odoo_auth_token')?.value;
  const headerToken = req.headers.get('x-odoo-auth');
  const secretHeader = req.headers.get('x-odoo-password');

  if (cookieToken && cookieToken === expectedToken) return true;
  if (headerToken && headerToken === expectedToken) return true;
  if (secretHeader && secretHeader.trim() === ODOO_DASH_PASSWORD.trim()) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: 'Accès non autorisé. Authentification requise pour consulter le module Odoo.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || searchParams.get('ref') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  return handleSearch(query, startDate, endDate);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: 'Accès non autorisé. Authentification requise pour consulter le module Odoo.' },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (body.batch && Array.isArray(body.references)) {
    return handleBatchSearch(body.references);
  }
  const query = body.query || body.ref || '';
  const startDate = body.startDate || '';
  const endDate = body.endDate || '';
  return handleSearch(query, startDate, endDate);
}

async function handleSearch(query: string, startDate?: string, endDate?: string) {
  const rawQ = query.trim();
  if (!rawQ) {
    return NextResponse.json({
      success: false,
      error: "Veuillez fournir une référence ou un nom d'article à rechercher."
    }, { status: 400 });
  }

  const cleanNoSpaces = rawQ.replace(/[\s\-_.\/]+/g, "");

  try {
    // 1. Recherche exhaustive dans product.product (champs auto standard + custom Odoo AUTOP)
    const productDomain = [
      "|", "|", "|", "|", "|",
      ["default_code", "ilike", rawQ],
      ["default_code", "ilike", cleanNoSpaces],
      ["reference_piece", "ilike", rawQ],
      ["reference_piece", "ilike", cleanNoSpaces],
      ["reference_origine", "ilike", rawQ],
      ["name", "ilike", rawQ]
    ];

    const products = await callOdooKw("product.product", "search_read", [productDomain], {
      fields: [
        "id", "name", "default_code", "reference_piece", "reference_origine", 
        "reference_adaptable", "standard_price", "list_price", "qty_available", 
        "categ_id", "barcode", "vehicle_model_id"
      ],
      limit: 30
    }).catch(() => []) || [];

    const productIds = products.map((p: any) => p.id);

    // 2. Recherche dans purchase.order.line (Commandes confirmées d'achats)
    const poBaseDomain: any[] = productIds.length > 0 ? [
      "&",
      ["state", "in", ["purchase", "done"]],
      "|", "|",
      ["product_id", "in", productIds],
      ["name", "ilike", rawQ],
      ["name", "ilike", cleanNoSpaces]
    ] : [
      "&",
      ["state", "in", ["purchase", "done"]],
      "|",
      ["name", "ilike", rawQ],
      ["name", "ilike", cleanNoSpaces]
    ];

    const rawPoLines = await callOdooKw("purchase.order.line", "search_read", [poBaseDomain], {
      fields: [
        "id", "name", "product_id", "price_unit", "product_qty",
        "partner_id", "date_order", "order_id", "price_total",
        "price_subtotal", "state"
      ],
      limit: 150,
      order: "date_order desc"
    }).catch(() => []) || [];

    // 3. Recherche dans sale.order.line (Commandes confirmées de ventes clients)
    const soBaseDomain: any[] = productIds.length > 0 ? [
      "&",
      ["state", "in", ["sale", "done"]],
      "|", "|",
      ["product_id", "in", productIds],
      ["name", "ilike", rawQ],
      ["name", "ilike", cleanNoSpaces]
    ] : [
      "&",
      ["state", "in", ["sale", "done"]],
      "|",
      ["name", "ilike", rawQ],
      ["name", "ilike", cleanNoSpaces]
    ];

    const rawSoLines = await callOdooKw("sale.order.line", "search_read", [soBaseDomain], {
      fields: [
        "id", "name", "product_id", "price_unit", "product_uom_qty",
        "order_partner_id", "create_date", "order_id", "price_total",
        "price_subtotal", "state"
      ],
      limit: 100,
      order: "create_date desc"
    }).catch(() => []) || [];

    // 4. Recherche dans stock.move (Mouvements réels de stock)
    const moveBaseDomain: any[] = productIds.length > 0 ? [
      "&",
      ["state", "!=", "cancel"],
      "|", "|",
      ["product_id", "in", productIds],
      ["name", "ilike", rawQ],
      ["name", "ilike", cleanNoSpaces]
    ] : [
      "&",
      ["state", "!=", "cancel"],
      "|",
      ["name", "ilike", rawQ],
      ["name", "ilike", cleanNoSpaces]
    ];

    const rawMoves = await callOdooKw("stock.move", "search_read", [moveBaseDomain], {
      fields: [
        "id", "name", "product_id", "product_uom_qty", "quantity_done",
        "location_id", "location_dest_id", "state", "date", "reference",
        "picking_id", "origin"
      ],
      limit: 150,
      order: "date desc"
    }).catch(() => []) || [];

    // Formatage des Achats
    let purchaseHistory = rawPoLines.map((po: any) => {
      const supplierName = Array.isArray(po.partner_id) ? po.partner_id[1] : (po.partner_id || 'Fournisseur Inconnu');
      const orderRef = Array.isArray(po.order_id) ? po.order_id[1] : (po.order_id || `PO-${po.id}`);
      const productName = Array.isArray(po.product_id) ? po.product_id[1] : (po.name || rawQ);
      const qty = parseFloat(po.product_qty) || 0;
      const unitPrice = parseFloat(po.price_unit) || 0;
      const subtotal = parseFloat(po.price_subtotal) || (qty * unitPrice);
      const totalCost = parseFloat(po.price_total) || subtotal;

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
        subtotal,
        totalCost: subtotal > 0 ? subtotal : totalCost,
        state: po.state || 'purchase',
        stateLabel,
        stateColor
      };
    });

    // Formatage des Ventes
    let salesHistory = rawSoLines.map((so: any) => {
      const customerName = Array.isArray(so.order_partner_id) ? so.order_partner_id[1] : (so.order_partner_id || 'Client / Assureur');
      const orderRef = Array.isArray(so.order_id) ? so.order_id[1] : (so.order_id || `SO-${so.id}`);
      const productName = Array.isArray(so.product_id) ? so.product_id[1] : (so.name || rawQ);
      const qty = parseFloat(so.product_uom_qty) || 0;
      const unitPrice = parseFloat(so.price_unit) || 0;
      const subtotal = parseFloat(so.price_subtotal) || (qty * unitPrice);
      const totalCost = parseFloat(so.price_total) || subtotal;

      return {
        id: so.id,
        date: so.create_date ? new Date(so.create_date).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Non daté',
        rawDate: so.create_date || '',
        customerName,
        orderReference: orderRef,
        productName,
        quantity: qty,
        unitPrice,
        subtotal,
        totalCost,
        state: so.state || 'sale',
        stateLabel: so.state === 'done' ? 'Facturé / Clôturé' : 'Commande Validée',
        stateColor: 'emerald'
      };
    });

    // Formatage des mouvements de stock
    let stockMovements = rawMoves.map((m: any) => {
      const locSrc = Array.isArray(m.location_id) ? m.location_id[1] : (m.location_id || '');
      const locDest = Array.isArray(m.location_dest_id) ? m.location_dest_id[1] : (m.location_dest_id || '');
      const prodName = Array.isArray(m.product_id) ? m.product_id[1] : (m.name || rawQ);
      const moveRef = m.reference || (Array.isArray(m.picking_id) ? m.picking_id[1] : `MOVE-${m.id}`);
      const originDoc = m.origin || '';
      
      const qtyDone = parseFloat(m.quantity_done) || 0;
      const qtyExpected = parseFloat(m.product_uom_qty) || 0;
      const finalQty = qtyDone > 0 ? qtyDone : qtyExpected;

      let type: 'ACHAT' | 'VENTE' | 'TRANSFERT' = 'TRANSFERT';
      let typeLabel = 'Transfert Interne';
      let typeBadge = 'bg-blue-500/20 text-blue-400 border-blue-500/30';

      const srcLower = locSrc.toLowerCase();
      const destLower = locDest.toLowerCase();

      if (srcLower.includes('vendor') || srcLower.includes('fournisseur') || (destLower.includes('stock') && !srcLower.includes('stock')) || originDoc.startsWith('PO/')) {
        type = 'ACHAT';
        typeLabel = 'Entrée (Achat Fournisseur)';
        typeBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      } else if (destLower.includes('customer') || destLower.includes('client') || (srcLower.includes('stock') && !destLower.includes('stock')) || originDoc.startsWith('SO') || originDoc.startsWith('DS')) {
        type = 'VENTE';
        typeLabel = 'Sortie (Vente / Dossier Client)';
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

    // 5. Filtrage optionnel par Période (Date Début & Date Fin)
    if (startDate || endDate) {
      const startMs = startDate ? new Date(startDate).getTime() : 0;
      const endMs = endDate ? new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1) : Infinity;

      if (startMs > 0 || endMs < Infinity) {
        purchaseHistory = purchaseHistory.filter((p: any) => {
          const t = new Date(p.rawDate).getTime();
          return isNaN(t) || (t >= startMs && t <= endMs);
        });
        salesHistory = salesHistory.filter((s: any) => {
          const t = new Date(s.rawDate).getTime();
          return isNaN(t) || (t >= startMs && t <= endMs);
        });
        stockMovements = stockMovements.filter((m: any) => {
          const t = new Date(m.rawDate).getTime();
          return isNaN(t) || (t >= startMs && t <= endMs);
        });
      }
    }

    // 6. Calculs Indicateurs Clés (Meilleur Achat, Dernier Achat, Dernier Prix de Vente)
    const primaryProduct = products[0] || null;
    const totalStock = products.reduce((acc: number, p: any) => acc + (parseFloat(p.qty_available) || 0), 0);

    // Achats valides avec prix unitaire > 0
    const validPurchases = purchaseHistory.filter((p: any) => p.unitPrice > 0);
    const sortedByPrice = [...validPurchases].sort((a: any, b: any) => a.unitPrice - b.unitPrice);
    const sortedByDate = [...validPurchases].sort((a: any, b: any) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    // Meilleur prix d'achat historique
    const bestPurchaseItem = sortedByPrice[0] || null;
    const bestPurchase = bestPurchaseItem ? {
      price: bestPurchaseItem.unitPrice,
      supplier: bestPurchaseItem.supplierName,
      date: bestPurchaseItem.date,
      rawDate: bestPurchaseItem.rawDate,
      orderReference: bestPurchaseItem.orderReference
    } : null;

    // Dernier prix d'achat récent
    const lastPurchaseItem = sortedByDate[0] || purchaseHistory[0] || null;
    const lastPurchase = lastPurchaseItem ? {
      price: lastPurchaseItem.unitPrice || (primaryProduct ? parseFloat(primaryProduct.standard_price) || 0 : 0),
      supplier: lastPurchaseItem.supplierName || 'N/A',
      date: lastPurchaseItem.date || 'N/A',
      rawDate: lastPurchaseItem.rawDate || '',
      orderReference: lastPurchaseItem.orderReference || 'N/A'
    } : null;

    // Dernier prix de vente réel
    const validSales = salesHistory.filter((s: any) => s.unitPrice > 0);
    const sortedSalesByDate = [...validSales].sort((a: any, b: any) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
    const lastSaleItem = sortedSalesByDate[0] || null;
    const lastSale = lastSaleItem ? {
      price: lastSaleItem.unitPrice,
      customer: lastSaleItem.customerName,
      date: lastSaleItem.date,
      rawDate: lastSaleItem.rawDate,
      orderReference: lastSaleItem.orderReference
    } : {
      price: primaryProduct ? parseFloat(primaryProduct.list_price) || 0 : 0,
      customer: 'Catalogue',
      date: 'N/A',
      rawDate: '',
      orderReference: 'CATALOGUE'
    };

    // Marges et écarts de rentabilité
    const currentBuyPrice = lastPurchase ? lastPurchase.price : 0;
    const currentSellPrice = lastSale ? lastSale.price : 0;
    const bestBuyPrice = bestPurchase ? bestPurchase.price : currentBuyPrice;

    const marginAmount = currentSellPrice > currentBuyPrice ? (currentSellPrice - currentBuyPrice) : 0;
    const marginPercent = currentBuyPrice > 0 ? ((marginAmount / currentBuyPrice) * 100) : 0;
    const potentialSavings = (currentBuyPrice > bestBuyPrice && bestBuyPrice > 0) ? (currentBuyPrice - bestBuyPrice) : 0;

    const totalPurchasedQty = purchaseHistory.reduce((acc: number, po: any) => acc + (po.quantity || 0), 0);
    const totalPurchaseSpend = purchaseHistory.reduce((acc: number, po: any) => acc + (po.totalCost || 0), 0);
    const totalSoldQty = salesHistory.reduce((acc: number, so: any) => acc + (so.quantity || 0), 0);
    const totalSaleRevenue = salesHistory.reduce((acc: number, so: any) => acc + (so.totalCost || 0), 0);

    const inMovesCount = stockMovements.filter((m: any) => m.type === 'ACHAT').length;
    const outMovesCount = stockMovements.filter((m: any) => m.type === 'VENTE').length;
    const internalMovesCount = stockMovements.filter((m: any) => m.type === 'TRANSFERT').length;

    const displayRef = primaryProduct 
      ? (primaryProduct.reference_piece || primaryProduct.reference_origine || primaryProduct.default_code || rawQ.toUpperCase())
      : rawQ.toUpperCase();

    const vehicleModel = primaryProduct && Array.isArray(primaryProduct.vehicle_model_id) 
      ? primaryProduct.vehicle_model_id[1] 
      : '';

    return NextResponse.json({
      success: true,
      query: rawQ,
      period: { startDate: startDate || null, endDate: endDate || null },
      count: {
        products: products.length,
        purchases: purchaseHistory.length,
        sales: salesHistory.length,
        movements: stockMovements.length
      },
      product: primaryProduct ? {
        id: primaryProduct.id,
        name: primaryProduct.name,
        reference: displayRef,
        vehicleModel,
        standardPrice: lastPurchase ? lastPurchase.price : (parseFloat(primaryProduct.standard_price) || 0),
        listPrice: parseFloat(primaryProduct.list_price) || 0,
        stockAvailable: parseFloat(primaryProduct.qty_available) || 0,
        category: Array.isArray(primaryProduct.categ_id) ? primaryProduct.categ_id[1] : (primaryProduct.categ_id || 'Pièces')
      } : null,
      allProducts: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        reference: p.reference_piece || p.reference_origine || p.default_code || '',
        vehicleModel: Array.isArray(p.vehicle_model_id) ? p.vehicle_model_id[1] : '',
        standardPrice: parseFloat(p.standard_price) || 0,
        listPrice: parseFloat(p.list_price) || 0,
        stockAvailable: parseFloat(p.qty_available) || 0,
        category: Array.isArray(p.categ_id) ? p.categ_id[1] : (p.categ_id || '')
      })),
      decision: {
        bestPurchase,
        lastPurchase,
        lastSale,
        marginAmount,
        marginPercent,
        potentialSavings,
        recommendation: bestPurchase && lastPurchase && bestPurchase.price < lastPurchase.price
          ? `Privilégier le fournisseur "${bestPurchase.supplier}" (Meilleur prix historique à ${bestPurchase.price.toFixed(3)} TND, économie de ${potentialSavings.toFixed(3)} TND/pc par rapport au dernier achat).`
          : `Dernier prix d'achat à ${lastPurchase?.price.toFixed(3)} TND chez ${lastPurchase?.supplier}.`
      },
      summary: {
        totalStock,
        bestPurchasePrice: bestPurchase ? bestPurchase.price : 0,
        bestSupplier: bestPurchase ? bestPurchase.supplier : 'N/A',
        lastPurchasePrice: lastPurchase ? lastPurchase.price : 0,
        lastSupplier: lastPurchase ? lastPurchase.supplier : 'N/A',
        lastPurchaseDate: lastPurchase ? lastPurchase.date : 'N/A',
        lastOrderReference: lastPurchase ? lastPurchase.orderReference : 'N/A',
        sellingPrice: lastSale ? lastSale.price : 0,
        lastCustomer: lastSale ? lastSale.customer : 'N/A',
        lastSaleDate: lastSale ? lastSale.date : 'N/A',
        marginAmount,
        marginPercent,
        totalPurchasedQty,
        totalPurchaseSpend,
        totalSoldQty,
        totalSaleRevenue,
        inMovesCount,
        outMovesCount,
        internalMovesCount
      },
      purchaseHistory,
      salesHistory,
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

async function handleBatchSearch(references: string[]) {
  const cleanRefs = Array.from(new Set(
    references.map(r => String(r || '').trim()).filter(r => r.length >= 2)
  )).slice(0, 50); // Limite de 50 références par lot

  if (cleanRefs.length === 0) {
    return NextResponse.json({
      success: false,
      error: "Aucune référence valide fournie pour la recherche par lot."
    }, { status: 400 });
  }

  try {
    const results: any[] = [];

    // Recherche séquentielle rapide ou par petits lots pour préserver la session Odoo
    for (const ref of cleanRefs) {
      const cleanNoSpaces = ref.replace(/[\s\-_.\/]+/g, "");

      const pDomain = [
        "|", "|", "|", "|", "|",
        ["default_code", "ilike", ref],
        ["default_code", "ilike", cleanNoSpaces],
        ["reference_piece", "ilike", ref],
        ["reference_piece", "ilike", cleanNoSpaces],
        ["reference_origine", "ilike", ref],
        ["name", "ilike", ref]
      ];

      const prods = await callOdooKw("product.product", "search_read", [pDomain], {
        fields: ["id", "name", "default_code", "reference_piece", "reference_origine", "qty_available", "standard_price", "list_price", "vehicle_model_id"],
        limit: 1
      }).catch(() => []) || [];

      if (prods.length === 0) {
        results.push({
          reference: ref,
          found: false,
          name: "Non trouvé dans Odoo",
          vehicleModel: "-",
          stockAvailable: 0,
          bestPurchasePrice: 0,
          bestSupplier: "N/A",
          lastPurchasePrice: 0,
          lastSupplier: "N/A",
          lastSellingPrice: 0,
          lastCustomer: "N/A",
          status: "Non répertorié"
        });
        continue;
      }

      const p = prods[0];
      const [poLines, soLines] = await Promise.all([
        callOdooKw("purchase.order.line", "search_read", [[
          "&", ["state", "in", ["purchase", "done"]],
          ["product_id", "=", p.id]
        ]], { fields: ["id", "price_unit", "partner_id", "date_order", "order_id"], limit: 50 }).catch(() => []) || [],
        callOdooKw("sale.order.line", "search_read", [[
          "&", ["state", "in", ["sale", "done"]],
          ["product_id", "=", p.id]
        ]], { fields: ["id", "price_unit", "order_partner_id", "create_date", "order_id"], limit: 10, order: "create_date desc" }).catch(() => []) || []
      ]);

      const validPo = poLines.filter((x: any) => x.price_unit > 0);
      const sortedByDate = [...validPo].sort((a: any, b: any) => new Date(b.date_order).getTime() - new Date(a.date_order).getTime());
      const sortedByPrice = [...validPo].sort((a: any, b: any) => a.price_unit - b.price_unit);

      const bestPo = sortedByPrice[0] || null;
      const lastPo = sortedByDate[0] || null;
      const lastSo = soLines[0] || null;

      const stock = parseFloat(p.qty_available) || 0;
      const bestPrice = bestPo ? bestPo.price_unit : 0;
      const lastBuyPrice = lastPo ? lastPo.price_unit : (parseFloat(p.standard_price) || 0);
      const lastSellPrice = lastSo ? lastSo.price_unit : (parseFloat(p.list_price) || 0);

      results.push({
        reference: p.reference_piece || p.reference_origine || p.default_code || ref,
        queryRef: ref,
        found: true,
        productId: p.id,
        name: p.name,
        vehicleModel: Array.isArray(p.vehicle_model_id) ? p.vehicle_model_id[1] : "-",
        stockAvailable: stock,
        bestPurchasePrice: bestPrice,
        bestSupplier: bestPo && Array.isArray(bestPo.partner_id) ? bestPo.partner_id[1] : (bestPo?.partner_id || "N/A"),
        bestDate: bestPo ? bestPo.date_order : "",
        lastPurchasePrice: lastBuyPrice,
        lastSupplier: lastPo && Array.isArray(lastPo.partner_id) ? lastPo.partner_id[1] : (lastPo?.partner_id || "N/A"),
        lastPurchaseDate: lastPo ? lastPo.date_order : "",
        lastSellingPrice: lastSellPrice,
        lastCustomer: lastSo && Array.isArray(lastSo.order_partner_id) ? lastSo.order_partner_id[1] : (lastSo?.order_partner_id || "Catalogue"),
        lastSaleDate: lastSo ? lastSo.create_date : "",
        status: stock > 0 ? "En Stock" : "Rupture",
        purchaseCount: validPo.length,
        saleCount: soLines.length
      });
    }

    return NextResponse.json({
      success: true,
      batchCount: results.length,
      items: results,
      stats: {
        totalItems: results.length,
        foundCount: results.filter(r => r.found).length,
        inStockCount: results.filter(r => r.stockAvailable > 0).length,
        totalStockSum: results.reduce((acc, r) => acc + (r.stockAvailable || 0), 0)
      }
    });

  } catch (err: any) {
    console.error("[Odoo Batch Tracking API] Error:", err.message);
    return NextResponse.json({
      success: false,
      error: `Erreur lors de la recherche par lot Odoo : ${err.message}`
    }, { status: 500 });
  }
}
