/**
 * AUTOP - Connecteur Odoo ERP (https://autop-soft.autop.tn)
 * Base : AUTOP_PRODUCTION
 * Utilisateur : seifeddine.belhessine@autop.tn
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const ODOO_CONFIG = {
  baseUrl: process.env.ODOO_URL || "https://autop-soft.autop.tn",
  db: process.env.ODOO_DB || "AUTOP_PRODUCTION",
  login: process.env.ODOO_LOGIN || "seifeddine.belhessine@autop.tn",
  password: process.env.ODOO_PASSWORD || "AUTOP2025-seib",
};

let cachedSessionCookie: string | null = null;
let cachedSessionExpiry: number = 0;

/**
 * Authentification à Odoo JSON-RPC avec mise en cache du session_id
 */
export async function getOdooSession(): Promise<{ cookie: string; uid: number; name: string }> {
  const now = Date.now();
  if (cachedSessionCookie && now < cachedSessionExpiry) {
    return { cookie: cachedSessionCookie, uid: 213, name: "Seifeddine Belhessine" };
  }

  try {
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
      throw new Error(`Erreur HTTP Odoo: ${authRes.status}`);
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
    cachedSessionExpiry = now + 1000 * 60 * 60 * 2; // Valide 2 heures

    return {
      cookie: sessionCookie,
      uid: authData.result.uid,
      name: authData.result.name || "Seifeddine Belhessine"
    };
  } catch (err: any) {
    console.error("[Odoo Client] Erreur d'authentification:", err.message);
    throw err;
  }
}

/**
 * Exécute un appel RPC call_kw sur un modèle Odoo
 */
export async function callOdooKw(model: string, method: string, args: any[] = [], kwargs: Record<string, any> = {}): Promise<any> {
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
      params: {
        model,
        method,
        args,
        kwargs
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Erreur RPC Odoo ${model}.${method}: HTTP ${res.status}`);
  }

  const data = await res.json().catch(() => null);
  if (data?.error) {
    // Si la session a expiré, on vide le cache et réessaie une fois
    if (String(data.error.data?.message || "").includes("Session expired") || String(data.error.message || "").includes("Session")) {
      cachedSessionCookie = null;
      const freshSession = await getOdooSession();
      const retryRes = await fetch(`${ODOO_CONFIG.baseUrl}/web/dataset/call_kw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": freshSession.cookie,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AUTOP/1.0"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params: { model, method, args, kwargs }
        })
      });
      const retryData = await retryRes.json().catch(() => null);
      if (retryData?.result !== undefined) return retryData.result;
    }
    throw new Error(`Erreur Odoo: ${data.error.data?.message || data.error.message}`);
  }

  return data?.result;
}

export interface OdooPriceResult {
  reference: string;
  name: string;
  designation: string;
  brand: string;
  purchasePrice: number; // Dernier prix d'achat HT
  sellingPrice: number;  // Prix de vente catalogue HT
  stock: number;         // Stock disponible en magasin
  supplierName?: string; // Dernier fournisseur identifié
  lastPurchaseDate?: string;
  orderReference?: string;
  source: 'ODOO';
}

/**
 * Recherche en direct dans Odoo par référence ou désignation
 */
export async function searchOdooByReference(query: string): Promise<OdooPriceResult[]> {
  const cleanQ = query.trim().replace(/[\s\-_.\/]+/g, "");
  if (!cleanQ) return [];

  const results: OdooPriceResult[] = [];

  try {
    // 1. Recherche dans product.product (articles et stocks)
    const productDomain = [
      "|", "|",
      ["default_code", "ilike", query.trim()],
      ["default_code", "ilike", cleanQ],
      ["name", "ilike", query.trim()]
    ];

    const products = await callOdooKw("product.product", "search_read", [productDomain], {
      fields: ["name", "default_code", "standard_price", "list_price", "qty_available", "seller_ids"],
      limit: 15
    }).catch(() => []);

    // 2. Recherche dans purchase.order.line (historique des commandes d'achats fournisseurs)
    const poDomain = [
      "|",
      ["name", "ilike", query.trim()],
      ["name", "ilike", cleanQ]
    ];

    const poLines = await callOdooKw("purchase.order.line", "search_read", [poDomain], {
      fields: ["name", "product_id", "price_unit", "product_qty", "partner_id", "date_order", "order_id"],
      limit: 15,
      order: "date_order desc"
    }).catch(() => []);

    // Map purchase lines by product reference or title
    const poMap: Record<string, any> = {};
    if (Array.isArray(poLines)) {
      for (const line of poLines) {
        const prodName = Array.isArray(line.product_id) ? line.product_id[1] : (line.name || "");
        if (!poMap[prodName]) {
          poMap[prodName] = line;
        }
      }
    }

    if (Array.isArray(products) && products.length > 0) {
      for (const p of products) {
        const ref = String(p.default_code || "").trim() || query.trim().toUpperCase();
        const relatedPo = poMap[p.name] || poLines.find((l: any) => l.name && l.name.includes(ref));
        
        const purchasePrice = relatedPo ? parseFloat(relatedPo.price_unit) || parseFloat(p.standard_price) || 0 : (parseFloat(p.standard_price) || 0);
        const sellingPrice = parseFloat(p.list_price) || 0;
        const stock = parseInt(p.qty_available || 0, 10) || 0;
        const supplierName = relatedPo && Array.isArray(relatedPo.partner_id) ? relatedPo.partner_id[1] : "AUTOP Magasin";

        results.push({
          reference: ref,
          name: p.name || `Article ${ref}`,
          designation: p.name || `Article ${ref}`,
          brand: "ORIGINE / ODOO",
          purchasePrice,
          sellingPrice,
          stock,
          supplierName,
          lastPurchaseDate: relatedPo?.date_order || undefined,
          orderReference: relatedPo && Array.isArray(relatedPo.order_id) ? relatedPo.order_id[1] : undefined,
          source: 'ODOO'
        });
      }
    } else if (Array.isArray(poLines) && poLines.length > 0) {
      // Si l'article n'a pas de fiche article mais a des lignes d'achat
      for (const line of poLines) {
        const title = line.name || (Array.isArray(line.product_id) ? line.product_id[1] : query);
        const supp = Array.isArray(line.partner_id) ? line.partner_id[1] : "Fournisseur Odoo";
        
        results.push({
          reference: query.trim().toUpperCase(),
          name: title,
          designation: title,
          brand: "ODOO",
          purchasePrice: parseFloat(line.price_unit) || 0,
          sellingPrice: (parseFloat(line.price_unit) || 0) * 1.25,
          stock: parseInt(line.product_qty || 0, 10) || 0,
          supplierName: supp,
          lastPurchaseDate: line.date_order,
          orderReference: Array.isArray(line.order_id) ? line.order_id[1] : undefined,
          source: 'ODOO'
        });
      }
    }

    return results;
  } catch (err: any) {
    console.warn("[Odoo Client] searchOdooByReference error:", err.message);
    return [];
  }
}

/**
 * Synchronisation globale des articles et prix depuis Odoo vers AUTOP
 */
export async function syncOdooCatalog(limit: number = 300): Promise<{ imported: number; updated: number; errors: number }> {
  const { prisma } = await import('@/lib/prisma');
  
  let imported = 0;
  let updated = 0;
  let errors = 0;

  try {
    console.log(`[Odoo Sync] Début synchronisation Odoo (limite: ${limit})...`);

    // 1. Récupération des dernières lignes de commande d'achat
    const poLines = await callOdooKw("purchase.order.line", "search_read", [[]], {
      fields: ["name", "product_id", "price_unit", "product_qty", "partner_id", "date_order", "order_id"],
      limit,
      order: "date_order desc"
    }).catch(() => []);

    if (Array.isArray(poLines)) {
      for (const line of poLines) {
        try {
          const rawName = String(line.name || (Array.isArray(line.product_id) ? line.product_id[1] : "")).trim();
          const bracketMatch = rawName.match(/\[([A-Za-z0-9\-_.]+)\]/);
          const ref = bracketMatch ? bracketMatch[1].toUpperCase() : rawName.split(" ")[0].toUpperCase();
          
          if (!ref || ref.length < 2) continue;

          const price = parseFloat(line.price_unit) || 0;
          const qty = parseInt(line.product_qty || 0, 10) || 0;
          const supplierName = Array.isArray(line.partner_id) ? line.partner_id[1] : "Fournisseur Odoo";
          const orderRef = Array.isArray(line.order_id) ? line.order_id[1] : undefined;

          // Upsert dans PartPriceHistory
          const existing = await prisma.partPriceHistory.findFirst({
            where: {
              reference: ref,
              source: "ODOO",
              supplierName: supplierName
            }
          });

          if (existing) {
            await prisma.partPriceHistory.update({
              where: { id: existing.id },
              data: {
                purchasePrice: price,
                sellingPrice: price * 1.25,
                stock: qty,
                designation: rawName,
                sourceDetails: orderRef ? `Odoo PO: ${orderRef}` : "Odoo Achat",
                date: line.date_order ? new Date(line.date_order) : new Date(),
                updatedAt: new Date()
              }
            });
            updated++;
          } else {
            await prisma.partPriceHistory.create({
              data: {
                reference: ref,
                designation: rawName,
                brand: "ODOO",
                type: "ADAPTABLE",
                purchasePrice: price,
                sellingPrice: price * 1.25,
                stock: qty,
                supplierName: supplierName,
                source: "ODOO",
                sourceDetails: orderRef ? `Odoo PO: ${orderRef}` : "Odoo Achat",
                date: line.date_order ? new Date(line.date_order) : new Date()
              }
            });
            imported++;
          }
        } catch {
          errors++;
        }
      }
    }

    // 2. Récupération des articles standards Odoo
    const products = await callOdooKw("product.product", "search_read", [[["default_code", "!=", false]]], {
      fields: ["name", "default_code", "standard_price", "list_price", "qty_available"],
      limit,
      order: "write_date desc"
    }).catch(() => []);

    if (Array.isArray(products)) {
      for (const p of products) {
        try {
          const ref = String(p.default_code || "").trim().toUpperCase();
          if (!ref) continue;

          const costPrice = parseFloat(p.standard_price) || 0;
          const sellPrice = parseFloat(p.list_price) || (costPrice * 1.25);
          const stock = parseInt(p.qty_available || 0, 10) || 0;

          const existing = await prisma.partPriceHistory.findFirst({
            where: {
              reference: ref,
              source: "ODOO",
              supplierName: "Stock Odoo AUTOP"
            }
          });

          if (existing) {
            await prisma.partPriceHistory.update({
              where: { id: existing.id },
              data: {
                purchasePrice: costPrice,
                sellingPrice: sellPrice,
                stock,
                designation: p.name,
                sourceDetails: "Odoo Catalogue Stock",
                updatedAt: new Date()
              }
            });
            updated++;
          } else {
            await prisma.partPriceHistory.create({
              data: {
                reference: ref,
                designation: p.name,
                brand: "ODOO",
                type: "ADAPTABLE",
                purchasePrice: costPrice,
                sellingPrice: sellPrice,
                stock,
                supplierName: "Stock Odoo AUTOP",
                source: "ODOO",
                sourceDetails: "Odoo Catalogue Stock"
              }
            });
            imported++;
          }
        } catch {
          errors++;
        }
      }
    }

    console.log(`[Odoo Sync] Terminé : ${imported} ajoutés, ${updated} mis à jour, ${errors} erreurs.`);
    return { imported, updated, errors };
  } catch (err: any) {
    console.error("[Odoo Sync] Erreur générale:", err.message);
    throw err;
  }
}
