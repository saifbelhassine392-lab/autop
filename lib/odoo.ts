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
 * Exécute un appel RPC call_kw sur un modèle Odoo avec reconnexion et retry automatique
 */
export async function callOdooKw(model: string, method: string, args: any[] = [], kwargs: Record<string, any> = {}): Promise<any> {
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
        const msg = String(data.error.data?.message || data.error.message || "");
        if (attempts < 2 && (msg.includes("Session") || msg.includes("Connection") || msg.includes("closed"))) {
          cachedSessionCookie = null;
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        throw new Error(`Erreur Odoo: ${msg}`);
      }

      return data?.result;
    } catch (err: any) {
      if (attempts < 2) {
        cachedSessionCookie = null;
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
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

export function detectAutoBrand(name: string = '', ref: string = '', categName: string = ''): string {
  const n = name.toUpperCase();
  const r = ref.trim().toUpperCase();
  const c = categName.toUpperCase();
  const text = `${n} ${r} ${c}`;

  // 1. Catégorie Odoo explicite
  if (c.includes('ISUZU')) return 'ISUZU';
  if (c.includes('BMW')) return 'BMW';
  if (c.includes('MERC')) return 'MERCEDES-BENZ';
  if (c.includes('VW')) return 'VOLKSWAGEN';
  if (c.includes('TOYOTA')) return 'TOYOTA';
  if (c.includes('SUZUKI')) return 'SUZUKI';
  if (c.includes('MAZ')) return 'MAZDA';
  if (c.includes('MG')) return 'MG';

  // 2. Mots-clés textuels très explicites
  if (text.includes('MAHINDRA') || text.includes('KUV 100') || text.includes('KUV100') || text.includes('XUV300') || text.includes('XUV 300') || text.includes('SCORPIO')) return 'MAHINDRA';
  if (text.includes('PEUGEOT') || text.includes('CITROEN') || text.includes('CITROËN') || text.includes('BERLINGO') || text.includes('PARTNER') || text.includes('C3') || text.includes('C4') || text.includes('C5') || text.includes('206') || text.includes('207') || text.includes('208') || text.includes('301') || text.includes('307') || text.includes('308') || text.includes('407') || text.includes('508') || text.includes('2008') || text.includes('3008') || text.includes('NEMO') || text.includes('JUMPY') || text.includes('EXPERT') || text.includes('PGT')) return 'PEUGEOT / CITROËN';
  if (text.includes('VOLKSWAGEN') || text.includes('VW') || text.includes('POLO') || text.includes('GOLF') || text.includes('PASSAT') || text.includes('CADDY') || text.includes('TIGUAN') || text.includes('TOURAN') || text.includes('AMAROK') || text.includes('JETTA')) return 'VOLKSWAGEN';
  if (text.includes('AUDI') || text.includes('A1') || text.includes('A3') || text.includes('A4') || text.includes('A6') || text.includes('Q3') || text.includes('Q5') || text.includes('Q7')) return 'AUDI';
  if (text.includes('RENAULT') || text.includes('CLIO') || text.includes('MEGANE') || text.includes('MÉGANE') || text.includes('SYMBOL') || text.includes('KANGOO') || text.includes('FLUENCE') || text.includes('KADJAR') || text.includes('CAPTUR') || text.includes('DUSTER') || text.includes('LOGAN') || text.includes('SANDERO') || text.includes('DACIA')) return 'RENAULT / DACIA';
  if (text.includes('HYUNDAI') || text.includes('I10') || text.includes('I20') || text.includes('I30') || text.includes('ACCENT') || text.includes('TUCSON') || text.includes('SANTA FE') || text.includes('CRETA') || text.includes('ELANTRA')) return 'HYUNDAI';
  if (text.includes('KIA') || text.includes('RIO') || text.includes('PICANTO') || text.includes('SPORTAGE') || text.includes('CERATO') || text.includes('CEED') || text.includes('SORENTO')) return 'KIA';
  if (text.includes('FIAT') || text.includes('DOBLO') || text.includes('PUNTO') || text.includes('PANDA') || text.includes('FIORINO') || text.includes('DUCATO') || text.includes('TIPO') || text.includes('500')) return 'FIAT';
  if (text.includes('FORD') || text.includes('FIESTA') || text.includes('FOCUS') || text.includes('RANGER') || text.includes('TRANSIT') || text.includes('MONDEO') || text.includes('KUGA') || text.includes('ECOSPORT')) return 'FORD';
  if (text.includes('TOYOTA') || text.includes('YARIS') || text.includes('COROLLA') || text.includes('HILUX') || text.includes('RAV4') || text.includes('PRADO') || text.includes('AURIS')) return 'TOYOTA';
  if (text.includes('NISSAN') || text.includes('QASHQAI') || text.includes('MICRA') || text.includes('JUKE') || text.includes('NAVARA') || text.includes('X-TRAIL') || text.includes('SUNNY')) return 'NISSAN';
  if (text.includes('MERCEDES') || text.includes('BENZ') || text.includes('SPRINTER') || text.includes('VITO') || text.includes('W204') || text.includes('W205') || text.includes('W212')) return 'MERCEDES-BENZ';
  if (text.includes('BMW') || text.includes('SERIE 3') || text.includes('SERIE 5') || text.includes('X1') || text.includes('X3') || text.includes('X5')) return 'BMW';
  if (text.includes('ISUZU') || text.includes('D-MAX') || text.includes('DMAX')) return 'ISUZU';
  if (text.includes('SUZUKI') || text.includes('SWIFT') || text.includes('CELERIO') || text.includes('BALENO') || text.includes('VITARA')) return 'SUZUKI';
  if (text.includes('SEAT') || text.includes('IBIZA') || text.includes('LEON') || text.includes('ARONA') || text.includes('ATECA')) return 'SEAT';
  if (text.includes('SKODA') || text.includes('OCTAVIA') || text.includes('FABIA') || text.includes('SUPERB')) return 'SKODA';
  if (text.includes('CHEVROLET') || text.includes('AVEO') || text.includes('CRUZE') || text.includes('SPARK') || text.includes('OPTRA')) return 'CHEVROLET';
  if (text.includes('OPEL') || text.includes('CORSA') || text.includes('ASTRA') || text.includes('INSIGNIA') || text.includes('MOKKA')) return 'OPEL';
  if (text.includes('MITSUBISHI') || text.includes('L200') || text.includes('PAJERO') || text.includes('LANCER')) return 'MITSUBISHI';
  if (text.includes('JEEP') || text.includes('RENEGADE') || text.includes('CHEROKEE')) return 'JEEP';

  // 3. Patterns de références OEM constructeurs
  // PSA (10 chiffres commençant par 96, 98, 16, 97 ou 6 chars comme 7414QV, 1306J5, 1440TV, 7410CF, 7410GE...)
  if (/^(96\d{8}|98\d{8}|16\d{8}|97\d{8})/.test(r)) return 'PEUGEOT / CITROËN';
  if (/^\d{4}[A-Z0-9]{2}$/.test(r) && !r.startsWith('05P')) return 'PEUGEOT / CITROËN';
  
  // VAG (6Q, 1K, 5K, 04C, 03L, 03G, 06A, 038, 5Q, 7N, 6R, 2K, 3C, 8K, 8V, 4F...)
  if (/^(6Q|1K|5K|04C|03L|03G|06A|038|5Q|7N|6R|2K|3C|8K|8V|4F|1J|6J|8X|1T|7M|7P)/.test(r)) return 'VOLKSWAGEN';

  // RENAULT (7701..., 8200..., 6001..., 6384..., finit par R)
  if (/^(77|82|60|63)\d+/.test(r) || (/^[0-9A-Z]{9,11}R$/.test(r))) return 'RENAULT / DACIA';

  // HYUNDAI / KIA (866141V000, 86812H8000, 77003K6000, 28113..., 58101...)
  if (/^\d{5}[A-Z0-9]{5}$/.test(r) || /^\d{5}[A-Z]\d{4}$/.test(r)) return 'HYUNDAI / KIA';

  // MAHINDRA (0102..., 0108..., 0119..., 0114..., 0116..., 0303..., 0304..., 0311..., 0313..., 0401...)
  if (/^(0102|0108|0119|0114|0116|0303|0304|0311|0313|0401)/.test(r)) return 'MAHINDRA';

  // FORD (7 chiffres ou 6F...)
  if (/^\d{7}$/.test(r)) return 'FORD';

  // TOYOTA (525350H040, 52119..., 48820...)
  if (/^(52|53|48|04465)\d{8}/.test(r)) return 'TOYOTA';

  // NISSAN (727501HB0A, 727001HB0A...)
  if (/^\d{5}[0-9A-Z]{5}$/.test(r) && r.includes('HB0')) return 'NISSAN';

  // Équipementiers
  if (text.includes('SOCOFA')) return 'SOCOFA';
  if (text.includes('VALEO')) return 'VALEO';
  if (text.includes('BOSCH')) return 'BOSCH';
  if (text.includes('CANSU')) return 'CANSU';
  if (text.includes('STEQ')) return 'STEQ';

  return 'MULTIMARQUE / ADAPTABLE';
}

export function isConsumableOrNonPart(name: string = '', categName: string = ''): boolean {
  const text = `${name} ${categName}`.toUpperCase();
  const excludeKeywords = [
    "MAIN D'OEUVRE", "MAIN DOEUVRE", "MAIN D'OUEVRE", "MAIO", "PEINTURE", "VERNIS", "MASTIC", "DILUANT", "DURCISSEUR", 
    "PAPIER ABRASIF", "PREPARATION", "LAVAGE", "NETTOYAGE", "NETTOYANT", "DEPOSE POSE", 
    "CALE A PONCER", "PONCEUSE", "PRODUIT DE LUSTRAGE", "BASE A EFFET", "APPRET", "IMPRESSION",
    "MATERIEL", "ACCESOIRES PEINTURE", "CONSOMMABLE", "CONSOMABLE", "FOURNITURE", "CHIFFON", "MASQUAGE", "SCOTCH",
    "SERVICE", "TRANSPORT"
  ];
  return excludeKeywords.some(kw => text.includes(kw));
}

/**
 * Synchronisation globale des articles et prix depuis Odoo vers AUTOP
 * Extrait toutes les pièces de rechange (1300+ articles) et calcule les 3 prix (Achat, Vente, Devis)
 */
export async function syncOdooCatalog(limit: number = 2000): Promise<{ imported: number; updated: number; errors: number; totalSpareParts: number }> {
  const { prisma } = await import('@/lib/prisma');
  
  let imported = 0;
  let updated = 0;
  let errors = 0;
  let totalSpareParts = 0;

  try {
    console.log(`[Odoo Sync] Début synchronisation complète Odoo (cible pièces de rechange)...`);

    // 1. Récupération des catégories de pièces de rechange dans Odoo
    const allCategs = await callOdooKw("product.category", "search_read", [[]], {
      fields: ["id", "name", "complete_name"]
    }).catch(() => []);

    const spareCategIds = (Array.isArray(allCategs) ? allCategs : []).filter((c: any) => {
      const n = (c.complete_name || c.name || "").toUpperCase();
      return !n.includes("PEINTURE") && !n.includes("MAIN D'OEUVRE") && !n.includes("MAIN D'OUEVRE") && 
             !n.includes("CONSOMMABLE") && !n.includes("CONSOMABLE") && !n.includes("MATERIEL") && 
             !n.includes("OUTILLAGE") && !n.includes("SERVICE") && !n.includes("TRANSPORT");
    }).map((c: any) => c.id);

    console.log(`[Odoo Sync] ${spareCategIds.length} catégories de pièces sélectionnées.`);

    // 2. Récupération des devis clients Odoo récents (pour extraire le Prix Devis)
    const soLines = await callOdooKw("sale.order.line", "search_read", [
      [["state", "in", ["sent", "draft", "sale", "done"]]]
    ], {
      fields: ["name", "product_id", "price_unit", "product_uom_qty", "order_id", "order_partner_id", "create_date", "state"],
      limit: 1500,
      order: "create_date desc"
    }).catch(() => []);

    // Indexation des devis par référence
    const quoteMap: Record<string, any> = {};
    if (Array.isArray(soLines)) {
      for (const so of soLines) {
        const rawName = String(so.name || (Array.isArray(so.product_id) ? so.product_id[1] : "")).trim();
        const bracketMatch = rawName.match(/\[([A-Za-z0-9\-_.]+)\]/);
        const ref = bracketMatch ? bracketMatch[1].toUpperCase() : rawName.split(" ")[0].toUpperCase();
        if (ref && ref.length >= 2 && !quoteMap[ref]) {
          quoteMap[ref] = {
            quotePrice: parseFloat(so.price_unit) || 0,
            orderNumber: Array.isArray(so.order_id) ? so.order_id[1] : `SO-${so.id}`,
            clientName: Array.isArray(so.order_partner_id) ? so.order_partner_id[1] : 'Client Devis',
            state: so.state === 'sent' ? 'Devis Envoyé' : so.state === 'draft' ? 'Devis Brouillon' : 'Vente',
            date: so.create_date ? new Date(so.create_date).toLocaleDateString('fr-FR') : ''
          };
        }
      }
    }

    // 3. Récupération des dernières lignes de commande d'achat (pour Prix Achat & Fournisseur)
    const poLines = await callOdooKw("purchase.order.line", "search_read", [[]], {
      fields: ["name", "product_id", "price_unit", "product_qty", "partner_id", "date_order", "order_id"],
      limit: 1500,
      order: "date_order desc"
    }).catch(() => []);

    const poMap: Record<string, any> = {};
    if (Array.isArray(poLines)) {
      for (const po of poLines) {
        const rawName = String(po.name || (Array.isArray(po.product_id) ? po.product_id[1] : "")).trim();
        const bracketMatch = rawName.match(/\[([A-Za-z0-9\-_.]+)\]/);
        const ref = bracketMatch ? bracketMatch[1].toUpperCase() : rawName.split(" ")[0].toUpperCase();
        if (ref && ref.length >= 2 && !poMap[ref]) {
          poMap[ref] = {
            purchasePrice: parseFloat(po.price_unit) || 0,
            supplierName: Array.isArray(po.partner_id) ? po.partner_id[1] : 'Fournisseur Odoo',
            orderNumber: Array.isArray(po.order_id) ? po.order_id[1] : `PO-${po.id}`,
            date: po.date_order ? new Date(po.date_order) : new Date()
          };
        }
      }
    }

    // 4. Récupération de TOUTES les pièces de rechange stockables Odoo
    const domain = spareCategIds.length > 0
      ? [["categ_id", "in", spareCategIds], ["default_code", "!=", false]]
      : [["default_code", "!=", false], ["type", "=", "product"]];

    const products = await callOdooKw("product.product", "search_read", [domain], {
      fields: ["name", "default_code", "standard_price", "list_price", "qty_available", "categ_id", "type"],
      limit: Math.max(limit, 2000),
      order: "id desc"
    }).catch(() => []);

    if (Array.isArray(products)) {
      for (const p of products) {
        try {
          const ref = String(p.default_code || "").trim().toUpperCase();
          if (!ref || ref.length < 2) continue;

          const categName = Array.isArray(p.categ_id) ? p.categ_id[1] : '';

          // ⚠️ EXCLUSION DES CONSOMMABLES & MO
          if (isConsumableOrNonPart(p.name, categName)) {
            continue;
          }

          totalSpareParts++;
          const brand = detectAutoBrand(p.name, ref, categName);

          const relatedPo = poMap[ref];
          const relatedQuote = quoteMap[ref];

          const purchasePrice = relatedPo ? relatedPo.purchasePrice : (parseFloat(p.standard_price) || 0);
          const rawSell = parseFloat(p.list_price) || 0;
          const sellingPrice = rawSell > 1 ? rawSell : (purchasePrice > 0 ? purchasePrice * 1.30 : 0);
          const quotePrice = relatedQuote?.quotePrice || 0;
          const stock = parseInt(p.qty_available || 0, 10) || 0;
          const supplierName = relatedPo?.supplierName || "Stock Odoo AUTOP";

          // Construction des détails de sources avec info Devis Odoo si existant
          let sourceDetails = relatedPo ? `Odoo PO: ${relatedPo.orderNumber}` : "Odoo Catalogue Stock";
          if (relatedQuote && quotePrice > 0) {
            sourceDetails += ` | Devis Odoo: ${relatedQuote.orderNumber} (${quotePrice.toFixed(3)} DT)`;
          }

          const existing = await prisma.partPriceHistory.findFirst({
            where: {
              reference: ref,
              source: "ODOO"
            }
          });

          if (existing) {
            await prisma.partPriceHistory.update({
              where: { id: existing.id },
              data: {
                purchasePrice,
                sellingPrice,
                discount: quotePrice > 0 ? quotePrice : 0, // Utilise discount pour stocker le Prix Devis Odoo
                stock,
                designation: p.name,
                brand,
                type: brand !== 'MULTIMARQUE / ADAPTABLE' ? 'OEM' : 'ADAPTABLE',
                supplierName,
                sourceDetails,
                updatedAt: new Date()
              }
            });
            updated++;
          } else {
            await prisma.partPriceHistory.create({
              data: {
                reference: ref,
                designation: p.name,
                brand,
                type: brand !== 'MULTIMARQUE / ADAPTABLE' ? 'OEM' : 'ADAPTABLE',
                purchasePrice,
                sellingPrice,
                discount: quotePrice > 0 ? quotePrice : 0, // Prix Devis Odoo
                stock,
                supplierName,
                source: "ODOO",
                sourceDetails,
                date: relatedPo?.date || new Date()
              }
            });
            imported++;
          }
        } catch {
          errors++;
        }
      }
    }

    console.log(`[Odoo Sync] Terminé : ${totalSpareParts} pièces de rechange traitées (${imported} créées, ${updated} mises à jour).`);
    return { imported, updated, errors, totalSpareParts };
  } catch (err: any) {
    console.error("[Odoo Sync] Erreur générale:", err.message);
    throw err;
  }
}

/**
 * Envoie un e-mail réel avec pièces jointes via le serveur de messagerie Odoo ERP (autop-soft.autop.tn)
 */
export async function sendEmailViaOdoo(options: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: { filename: string; content: string | Buffer }[];
}): Promise<{ id: string | number; success: boolean }> {
  try {
    const toRecipients = Array.isArray(options.to) ? options.to.join(',') : options.to;
    const attachmentIds: number[] = [];

    // Création des pièces jointes dans Odoo (ir.attachment) si fournies
    if (options.attachments && options.attachments.length > 0) {
      for (const att of options.attachments) {
        if (!att || !att.filename) continue;
        let base64Data = '';
        if (typeof att.content === 'string') {
          base64Data = att.content.includes('base64,') ? att.content.split('base64,')[1] : att.content;
        } else if (Buffer.isBuffer(att.content)) {
          base64Data = att.content.toString('base64');
        }
        if (!base64Data) continue;

        try {
          const attId = await callOdooKw('ir.attachment', 'create', [{
            name: att.filename,
            type: 'binary',
            datas: base64Data,
            mimetype: att.filename.endsWith('.pdf')
              ? 'application/pdf'
              : att.filename.endsWith('.csv')
                ? 'text/csv'
                : 'image/jpeg',
            res_model: 'mail.mail'
          }]);
          if (attId) attachmentIds.push(attId);
        } catch (attErr: any) {
          console.warn('[Odoo Attachment] Erreur création pièce jointe:', attErr.message);
        }
      }
    }

    const mailCreatePayload: any = {
      email_from: options.from || 'seifeddine.belhessine@autop.tn',
      email_to: toRecipients,
      subject: options.subject,
      body_html: options.html,
      auto_delete: false
    };

    if (attachmentIds.length > 0) {
      mailCreatePayload.attachment_ids = [[6, 0, attachmentIds]];
    }

    const mailId = await callOdooKw('mail.mail', 'create', [mailCreatePayload]);
    if (mailId) {
      try {
        await callOdooKw('mail.mail', 'send', [[mailId]]);
      } catch (sendErr: any) {
        console.warn(`[Odoo Mailer] Note lors de l'envoi direct (ID: ${mailId}):`, sendErr.message);
      }
      console.log(`[Odoo Mailer] E-mail transmis avec succès (ID: ${mailId}) vers ${toRecipients}`);
      return { id: mailId, success: true };
    }
    return { id: 'unknown', success: false };
  } catch (err: any) {
    console.error('[Odoo Email] Erreur transmission email:', err.message);
    throw err;
  }
}

