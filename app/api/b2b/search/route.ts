import { NextRequest, NextResponse } from 'next/server';
import https from "https";
import { getEquivalentsForRef, normalizeRef, searchDictionaryAndEquivalents } from '@/lib/equivalentsDictionary';

// Force TLS reject unauthorized to 0 globally for Tunisian HTTPS portals with custom SSL certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// HTTPS agent that ignores SSL certificate errors (needed for some TN portals)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Per-supplier cookie/token cache to avoid session cross-contamination
const supplierCookies: Record<string, string> = {};

const FAD_SECRET_KEY = "sictFvxSr4yr1DM8itxjYSrL0CvsDjeA";

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 3500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return res;
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Timeout' }), {
      status: 504,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    clearTimeout(id);
  }
}

function mergeSetCookies(existing: string, setCookie: string | null): string {
  const jar: Record<string, string> = {};
  for (const chunk of (existing || "").split(";")) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) jar[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  if (setCookie) {
    for (const part of setCookie.split(/,(?=\s*[^\s;,]+=)/)) {
      const m = part.match(/^\s*([^=]+)=([^;]*)/);
      if (m) jar[m[1].trim()] = m[2].trim();
    }
  }
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

function extractJsonArticles(data: unknown): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const obj = data as Record<string, unknown>;
  for (const key of ["items", "records", "data", "articles", "result", "listArticles", "content", "products"]) {
    const val = obj[key];
    if (Array.isArray(val)) return val;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const nested = val as Record<string, unknown>;
      if (Array.isArray(nested.items)) return nested.items;
      if (Array.isArray(nested.list)) return nested.list;
    }
  }
  if (obj.article && typeof obj.article === "object") return [obj.article];
  return [];
}

/** Références à tester : saisie, normalisée, OE / équivalences du dictionnaire (pas de refs fictives PH-/LPR-). */
function buildSupplierSearchRefs(query: string): string[] {
  const seen = new Set<string>();
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    seen.add(t);
    const n = normalizeRef(t);
    if (n.length >= 3) seen.add(n);
  };
  add(query);
  for (const eq of getEquivalentsForRef(query)) {
    if (eq.type === "OE" || eq.type === "CONCESSIONNAIRE") add(eq.reference);
  }
  for (const entry of searchDictionaryAndEquivalents(query)) {
    add(entry.oeReference);
    for (const eq of entry.equivalents) {
      if (eq.type === "OE" || eq.type === "CONCESSIONNAIRE") add(eq.reference);
      else if (eq.reference.length <= 16 && !eq.reference.startsWith("PH-") && !eq.reference.startsWith("LPR-")) {
        add(eq.reference);
      }
    }
  }
  return Array.from(seen).slice(0, 4);
}

function dedupeB2BItems(items: any[]): any[] {
  const map = new Map<string, any>();
  for (const it of items) {
    const key = `${normalizeRef(it.name || "")}|${(it.brand || "").toUpperCase()}|${it.supplierName || ""}`;
    const prev = map.get(key);
    if (!prev || (it.available && !prev.available) || (it.price > 0 && prev.price <= 0)) {
      map.set(key, it);
    }
  }
  return Array.from(map.values());
}

function pickBestB2BItem(items: any[]) {
  return items.find((i) => i.available && i.price > 0) || items.find((i) => i.available) || items.find((i) => i.price > 0) || items[0];
}

function packScrapeResult(items: any[]) {
  const list = dedupeB2BItems(items);
  if (list.length === 0) return null;
  const best = pickBestB2BItem(list);
  return {
    price: best.price,
    discount: best.discount,
    availability: best.availability,
    rawStock: best.rawStock,
    available: best.available,
    items: list,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STEQ  (b2bsteq.com)  — PHP session scraper
// ─────────────────────────────────────────────────────────────────────────────
function parseSTEQHtml(html: string) {
  const jsonMatch = html.match(/var ApiJsonItemAll = (\[.*?\]);/);
  if (!jsonMatch) return { price: 0, discount: 0, availability: "Non Disponible", items: [] };
  try {
    const items = JSON.parse(jsonMatch[1]);
    if (!Array.isArray(items) || items.length === 0)
      return { price: 0, discount: 0, availability: "Non Disponible", items: [] };
    const parsedItems = items.map((i: any) => ({
      name: i.ItemNumberEquiv || i.ItemNo || '',
      brand: (i.ItemBrandEquiv || i.ItemBrand || i.VendorNo || '').trim() || '—',
      price: parseFloat(i.UnitPrice) || 0,
      discount: parseFloat(i.MaxDiscount) || 0,
      availability: parseInt(i.Available) > 0 ? "Disponible" : "Sur Commande",
      rawStock: parseInt(i.Available) || 0,
      available: parseInt(i.Available) > 0,
      matchType: i.ItemNumberEquiv && i.ItemNo && normalizeRef(i.ItemNumberEquiv) !== normalizeRef(i.ItemNo) ? 'EQUIVALENCE' : 'DIRECT',
    }));
    let bestItem = parsedItems.find((i: any) => i.available);
    if (!bestItem) bestItem = parsedItems[0];
    return { price: bestItem.price, discount: bestItem.discount, availability: bestItem.availability, rawStock: bestItem.rawStock, available: bestItem.available, items: parsedItems };
  } catch (e) {
    return { price: 0, discount: 0, availability: "Erreur de lecture du catalogue", items: [] };
  }
}

async function scrapeSTEQ(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    const refsToTest = buildSupplierSearchRefs(query).slice(0, 3);
    const runSearch = async (cookie: string, qKey: string, searchType: string) => {
      const searchParams = new URLSearchParams();
      searchParams.append("MySearchType", searchType);
      searchParams.append("MySearchKey", qKey);
      searchParams.append("MySearchSubmit", "");
      const searchRes = await fetchWithTimeout("https://b2bsteq.com/form-recherche.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": cookie, "User-Agent": "Mozilla/5.0" },
        body: searchParams.toString(),
      }, 3000);
      const html = await searchRes.text();
      if (html.includes("VOTRE MOT DE PASSE") || html.includes("Se connecter")) {
        return { cookie, items: [] as any[], authFailed: true };
      }
      if (!html.includes("ApiJsonItemAll")) return { cookie, items: [] as any[], authFailed: false };
      return { cookie, items: parseSTEQHtml(html).items || [], authFailed: false };
    };

    let cookie = supplierCookies[supplierId] || "";
    const allItems: any[] = [];

    if (cookie) {
      for (const qKey of refsToTest) {
        let authFailed = false;
        for (const searchType of ["1", "3"]) {
          const r = await runSearch(cookie, searchType, qKey);
          cookie = r.cookie;
          authFailed = r.authFailed;
          allItems.push(...r.items);
        }
        if (authFailed) { cookie = ""; break; }
        if (allItems.some(i => i.available || i.price > 0)) break;
      }
      if (allItems.length > 0) {
        const packed = packScrapeResult(allItems);
        if (packed) return packed;
      }
    }

    const initialRes = await fetchWithTimeout("https://b2bsteq.com/", { method: "GET", headers: { "User-Agent": "Mozilla/5.0" } }, 3000);
    cookie = "";
    const initCookies = initialRes.headers.get("set-cookie") || "";
    const matchInit = initCookies.match(/PHPSESSID=[^;]+/);
    if (matchInit) cookie = matchInit[0];
    const loginParams = new URLSearchParams();
    loginParams.append("UserCode", b2bLogin);
    loginParams.append("UserPassword", b2bPassword);
    loginParams.append("UserSubmit", "» E N T R E R «");
    const loginRes = await fetchWithTimeout("https://b2bsteq.com/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0", "Cookie": cookie },
      body: loginParams.toString(), redirect: "manual",
    }, 3000);
    const loginCookies = loginRes.headers.get("set-cookie") || "";
    const matchLogin = loginCookies.match(/PHPSESSID=[^;]+/);
    if (matchLogin) cookie = matchLogin[0];

    for (const qKey of refsToTest) {
      for (const searchType of ["1", "3"]) {
        const r = await runSearch(cookie, searchType, qKey);
        allItems.push(...r.items);
      }
      if (allItems.some(i => i.available || i.price > 0)) break;
    }

    if (allItems.length === 0) {
      return { price: 0, discount: 0, availability: "Aucun résultat STEQ (réf. directe ni équivalence)", items: [] };
    }
    supplierCookies[supplierId] = cookie;
    const packed = packScrapeResult(allItems);
    return packed || { price: 0, discount: 0, availability: "Aucun résultat STEQ", items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, availability: `Erreur STEQ: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FAD  (pb.fadpro.tn / fadpro.tn)  — PocketBase API
// ─────────────────────────────────────────────────────────────────────────────
function mapFadArticle(i: any, searchedRef: string, matchedQuery: string) {
  const dispoRaw = String(i.dispo ?? i.disponibilite ?? i.disp ?? i.etatDispo ?? "").toUpperCase();
  const stockNum =
    parseInt(String(i.stock ?? i.quantite ?? i.qte ?? i.qty ?? i.quantiteStock ?? i.qteStock ?? 0), 10) || 0;
  const isDispo = dispoRaw === "S" || stockNum > 0 || i.enStock === true || i.available === true;
  const isArrivage = dispoRaw === "A";
  let availText = "Sur Commande";
  if (isDispo) availText = stockNum > 0 ? `Disponible (${stockNum} en stock)` : "Disponible en Stock";
  else if (isArrivage) availText = "En Arrivage";

  const brandRaw = i.marqueLibelle || i.marque || i.brand || i.fabricant || i.manufacturerName || i.fournisseur || "";
  const brand = String(brandRaw).trim() || "—";
  const ref = i.refFour || i.refOem || i.refOEM || i.reference || i.articleNumber || i.code || matchedQuery;
  const price = parseFloat(i.prixHT || i.prix || i.price || i.unitPrice || i.remiseVente || i.prixVente || 0) || 0;

  return {
    name: String(ref).trim(),
    brand,
    description: i.designation || i.libelle || i.itemNomFpur || "",
    price,
    discount: parseFloat(i.remise || i.discount || i.tauxRemise || 0) || 0,
    availability: availText,
    rawStock: stockNum || (isDispo ? 1 : 0),
    available: isDispo,
    matchType: normalizeRef(ref) === normalizeRef(searchedRef) ? "DIRECT" : "EQUIVALENCE",
  };
}

async function fadEnsureAuth(supplierId: string, b2bLogin: string, b2bPassword: string): Promise<string> {
  let authToken = supplierCookies[supplierId] || "";
  if (authToken) return authToken;
  const authRes = await fetchWithTimeout("https://pb.fadpro.tn/api/collections/users/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
    body: JSON.stringify({ identity: b2bLogin, password: b2bPassword }),
  }, 2500);
  if (!authRes.ok) return "";
  const authData = await authRes.json().catch(() => null);
  authToken = authData?.token || "";
  if (authToken) supplierCookies[supplierId] = authToken;
  return authToken;
}

function fadAuthHeaders(authToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    Accept: "application/json, text/plain, */*",
    secretKey: FAD_SECRET_KEY,
  };
  if (authToken) {
    headers.Authorization = authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`;
  }
  return headers;
}

async function fadFetchArticles(ep: string, headers: Record<string, string>, body?: string): Promise<any[]> {
  try {
    const searchRes = await fetchWithTimeout(ep, {
      method: body ? "POST" : "GET",
      headers: body ? { ...headers, "Content-Type": "application/json" } : headers,
      body,
    }, 2500);
    if (!searchRes.ok) return [];
    const text = await searchRes.text();
    if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) return [];
    const data = JSON.parse(text);
    return extractJsonArticles(data);
  } catch {
    return [];
  }
}

async function scrapeFAD(supplierId: string, query: string, b2bLogin: string, b2bPassword: string, b2bUrl?: string | null) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const authToken = await fadEnsureAuth(supplierId, b2bLogin, b2bPassword);
    const headers = fadAuthHeaders(authToken);
    const refsToTest = buildSupplierSearchRefs(query).slice(0, 6);
    const items: any[] = [];

    await Promise.all(refsToTest.map(async (q) => {
      const safeRef = normalizeRef(q).replace(/[^A-Z0-9]/g, "");
      const getUrls = [
        `https://fadpro.tn:8095/fad/api/b2b/search?refFour=${encodeURIComponent(q)}`,
        `https://fadpro.tn:8095/fad/api/b2b/search?refOem=${encodeURIComponent(q)}`,
        `https://pb.fadpro.tn/api/tecdoc/articles?search=${encodeURIComponent(q)}&page=1&perPage=20`,
      ];
      if (safeRef.length >= 3) {
        getUrls.push(`https://pb.fadpro.tn/api/collections/articles/records?filter=(refFour~'${safeRef}')&perPage=20`);
      }
      
      await Promise.all(getUrls.map(async (ep) => {
        const articlesList = await fadFetchArticles(ep, headers);
        for (const i of articlesList) {
          items.push(mapFadArticle(i, query, q));
        }
      }));

      const postBody = JSON.stringify({ refFour: q, reference: q, refOem: q, search: q });
      await Promise.all([
        "https://fadpro.tn:8095/fad/api/b2b/search",
        "https://fadpro.tn:8095/fad/api/b2b/equivalence"
      ].map(async (postEp) => {
        const articlesList = await fadFetchArticles(postEp, headers, postBody);
        for (const i of articlesList) {
          items.push(mapFadArticle(i, query, q));
        }
      }));
    }));

    const packed = packScrapeResult(items);
    if (packed) return packed;

    return {
      price: 0,
      discount: 0,
      available: false,
      availability: `FAD B2B connecté (Code: ${b2bLogin}). Référence ${query} — non disponible dans le catalogue FAD.`,
      items: [],
    };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur FAD: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MOSAIQUE AUTO  — plateforme commune à UNIVERS AUTO & ROUTE X
//    (uag.mosaique-auto.com / parx.mosaique-auto.com)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeMosaiqueAuto(supplierId: string, query: string, b2bLogin: string, b2bPassword: string, b2bUrl: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const baseUrl = b2bUrl.replace(/\/$/, '');
    let cookie = supplierCookies[supplierId] || "";

    if (!cookie) {
      // 1. GET initial session
      const r1 = await fetch(`${baseUrl}/`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const initCookie = r1.headers.get("set-cookie") || "";
      const matchInit = initCookie.match(/PHPSESSID=[^;]+/i);
      const sessCookie = matchInit ? matchInit[0] : "";

      // 2. POST /auth login
      const formBody = new URLSearchParams({ login: b2bLogin, pass: b2bPassword });
      const authRes = await fetch(`${baseUrl}/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
          "Cookie": sessCookie
        },
        body: formBody.toString()
      });

      const authCookies = authRes.headers.get("set-cookie") || sessCookie;
      const matchAuth = authCookies.match(/PHPSESSID=[^;]+/i);
      cookie = matchAuth ? matchAuth[0] : sessCookie;
      if (cookie) supplierCookies[supplierId] = cookie;
    }

    const items: any[] = [];

    // 1. Direct article search by ref (getArticlebyref)
    try {
      const artRes = await fetch(`${baseUrl}/?api=getArticlebyref&lu=1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": cookie,
          "User-Agent": "Mozilla/5.0",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: new URLSearchParams({ jsonDataApiTransfert: JSON.stringify({ ref: query }) }).toString()
      });
      if (artRes.ok) {
        const artJson = await artRes.json();
        const master = artJson?.master;
        if (master && (master.prix_u_ht || master.prix || master.titre)) {
          const price = parseFloat(master.prix_u_ht || master.prix || 0) || 0;
          const stock = parseInt(master.stockTotal || master.etat || 0) || 0;
          items.push({
            name: master.titre || query,
            brand: master.titre_marque || "ORIGINE",
            price: price,
            discount: parseFloat(master.remise || 0) || 0,
            availability: stock > 0 ? "Disponible en Stock" : "Sur Commande",
            rawStock: stock,
            available: stock > 0
          });
        }
      }
    } catch {}

    // 2. TecDoc cross-reference search (recherchetecdoc)
    try {
      const postUrl = `${baseUrl}/?api=recherchetecdoc&lu=1`;
      const payload = {
        action: "loadData",
        filter: { ref: query, reference: query, search: query, q: query },
        data: { ref: query, reference: query, search: query }
      };

      const searchRes = await fetch(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": cookie,
          "User-Agent": "Mozilla/5.0",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: new URLSearchParams({ jsonDataApiTransfert: JSON.stringify(payload) }).toString()
      });

      if (searchRes.ok) {
        const json = await searchRes.json();
        const master = json.master || json;
        const catalogsParts = master.catalogsParts?.list || [];
        const rawList = Array.isArray(catalogsParts) ? catalogsParts.flat() : [];
        const validArticles = rawList.filter((item: any) => item && (item.marque || item.titre || item.refsearch));

        for (const i of validArticles.slice(0, 10)) {
          const price = parseFloat(i.price || i.prix || i.pu_ht || 0) || 0;
          const stock = parseInt(i.stock || i.qte || i.qty || 0) || 0;
          items.push({
            name: i.titre || i.refsearch || i.reference || query,
            brand: i.marque || "MOSAIQUE-AUTO",
            price: price,
            discount: parseFloat(i.remise || 0) || 0,
            availability: stock > 0 ? "Disponible en Stock" : "Sur Commande",
            rawStock: stock,
            available: stock > 0
          });
        }
      }
    } catch {}

    if (items.length > 0) {
      const best = items.find((i: any) => i.available && i.price > 0) || items.find((i: any) => i.price > 0) || items[0];
      return {
        price: best.price,
        discount: best.discount,
        availability: best.availability,
        rawStock: best.rawStock,
        available: best.available,
        items: items
      };
    }

    return { price: 0, discount: 0, available: false, availability: `Portail Mosaique-Auto connecté. Référence ${query} non trouvée.`, items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur Mosaique-Auto: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SAGAP  (b2b.sagap.tn)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeSAGAP(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let token = supplierCookies[supplierId] || "";

    if (!token) {
      // SAGAP uses NuxtJS - try Laravel Sanctum / Nuxt API auth patterns
      const loginAttempts = [
        { url: "https://b2b.sagap.tn/api/auth/login", body: { email: b2bLogin, password: b2bPassword } },
        { url: "https://b2b.sagap.tn/api/login", body: { email: b2bLogin, password: b2bPassword } },
        { url: "https://b2b.sagap.tn/api/v1/auth/login", body: { email: b2bLogin, password: b2bPassword } },
        { url: "https://b2b.sagap.tn/api/sanctum/token", body: { email: b2bLogin, password: b2bPassword, device_name: "autop" } },
      ];
      for (const attempt of loginAttempts) {
        try {
          const r = await fetch(attempt.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
            body: JSON.stringify(attempt.body),
          });
          if (r.ok) {
            const d = await r.json().catch(() => null);
            if (d) {
              token = d?.token || d?.access_token || d?.data?.token || d?.data?.access_token || "";
              if (token) break;
            }
          }
        } catch {}
      }
      if (token) supplierCookies[supplierId] = token;
    }

    const authHeader: Record<string, string> = token && !token.includes("=")
      ? { "Authorization": `Bearer ${token}` }
      : (token ? { "Cookie": token } : {});

    // Try multiple SAGAP search endpoints
    const searchEndpoints = [
      `https://b2b.sagap.tn/api/products/search?query=${encodeURIComponent(query)}`,
      `https://b2b.sagap.tn/api/articles?search=${encodeURIComponent(query)}`,
      `https://b2b.sagap.tn/api/catalogue?ref=${encodeURIComponent(query)}`,
      `https://b2b.sagap.tn/api/search?q=${encodeURIComponent(query)}`,
    ];

    for (const endpoint of searchEndpoints) {
      try {
        const r = await fetch(endpoint, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json", ...authHeader }
        });
        if (r.ok) {
          const text = await r.text();
          if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            const articles = Array.isArray(data) ? data : (data?.data || data?.items || data?.products || []);
            if (articles.length > 0) {
              const parsedItems = articles.slice(0, 20).map((i: any) => ({
                name: i.reference || i.ref || i.partNumber || query,
                brand: i.brand || i.marque || i.manufacturer || "",
                price: parseFloat(i.price || i.prix || i.unitPrice || 0) || 0,
                discount: parseFloat(i.discount || i.remise || 0) || 0,
                availability: parseInt(i.stock || i.qty || 0) > 0 ? "Disponible" : "Sur Commande",
                rawStock: parseInt(i.stock || i.qty || 0),
                available: parseInt(i.stock || i.qty || 0) > 0
              }));
              const best = parsedItems.find((i: any) => i.available) || parsedItems[0];
              return { price: best.price, discount: best.discount, availability: best.availability, rawStock: best.rawStock, available: best.available, items: parsedItems };
            }
          }
        }
      } catch {}
    }

    return { price: 0, discount: 0, available: false, availability: `SAGAP B2B connecté (${b2bLogin}). Référence ${query} non trouvée dans le catalogue.`, items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur SAGAP: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CDG  (cdgros.com)
// ─────────────────────────────────────────────────────────────────────────────
function parseCDGSearchHtml(html: string, query: string): any[] {
  const items: any[] = [];
  const qNorm = normalizeRef(query);

  const jsonMatch = html.match(/var\s+(?:articles|items|products|data|liste)\s*=\s*(\[[\s\S]*?\])\s*;/i);
  if (jsonMatch) {
    try {
      const articles = JSON.parse(jsonMatch[1]);
      if (Array.isArray(articles)) {
        for (const i of articles) {
          items.push(mapCDGArticle(i, query));
        }
      }
    } catch {}
  }

  const trParts = html.split(/<tr[\s>]/i).slice(1);
  for (const tr of trParts) {
    const tds = Array.from(tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
      m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    if (tds.length < 2) continue;
    const rowNorm = normalizeRef(tds.join(" "));
    const refCell = tds.find((t) => normalizeRef(t).length >= 4);
    if (!refCell) continue;
    if (qNorm.length >= 4 && !rowNorm.includes(qNorm) && !tds.some((t) => normalizeRef(t) === qNorm)) continue;

    const priceMatch = tds.join(" ").match(/(\d+[.,]\d{2,3})/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 0;
    const stockMatch = tds.join(" ").match(/(?:stock|dispo|qt[eé])\s*[:\s]*(\d+)/i);
    const stock = stockMatch ? parseInt(stockMatch[1], 10) : 0;
    const dispoText = tds.join(" ").toLowerCase();
    const available = stock > 0 || dispoText.includes("disponible") || dispoText.includes("en stock");

    items.push({
      name: refCell,
      brand: tds[1] && tds[1] !== refCell ? tds[1] : tds[0] || "—",
      price,
      discount: 0,
      availability: available ? (stock > 0 ? `Disponible (${stock} en stock)` : "Disponible en Stock") : "Sur Commande",
      rawStock: stock,
      available,
    });
  }
  return items;
}

function mapCDGArticle(i: any, query: string) {
  const stock = parseInt(String(i.stock ?? i.qty ?? i.Stock ?? i.quantite ?? i.Dispo ?? 0), 10) || 0;
  const available = stock > 0 || i.disponible === true || String(i.dispo || "").toUpperCase() === "S";
  return {
    name: i.reference || i.ref || i.code || i.CodeArticle || i.Ref || query,
    brand: i.brand || i.marque || i.Marque || i.MarqueLibelle || "—",
    price: parseFloat(i.price || i.prix || i.Prix || i.PrixVente || i.PrixHT || 0) || 0,
    discount: parseFloat(i.discount || i.remise || i.Remise || 0) || 0,
    availability: available ? (stock > 0 ? `Disponible (${stock} en stock)` : "Disponible en Stock") : "Sur Commande",
    rawStock: stock,
    available,
  };
}

async function scrapeCDG(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const baseUrl = "http://cdgros.com";
    let cookie = supplierCookies[supplierId] || "";

    const ensureSession = async () => {
      const r1 = await fetch(`${baseUrl}/Site_CDG25/login.php`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      const html1 = await r1.text();
      cookie = mergeSetCookies("", r1.headers.get("set-cookie"));
      const formAction = html1.match(/action="([^"]+)"/)?.[1] || "/Site_CDG25/login.php";
      const wdJson = html1.match(/name="WD_JSON_PROPRIETE_"\s+value="([^"]*)"/)?.[1] || "";

      const loginBody = new URLSearchParams({
        WD_JSON_PROPRIETE_: wdJson,
        WD_BUTTON_CLICK_: "",
        WD_ACTION_: "",
        A3: b2bLogin,
        A3_DEB: "0",
        _A3_OCC: "1",
      });
      if (b2bPassword) loginBody.set("A4", b2bPassword);

      const r2 = await fetch(`${baseUrl}${formAction.startsWith("/") ? formAction : `/${formAction}`}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookie,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: `${baseUrl}/Site_CDG25/login.php`,
        },
        body: loginBody.toString(),
        redirect: "manual",
      });
      cookie = mergeSetCookies(cookie, r2.headers.get("set-cookie"));
      const loc = r2.headers.get("location");
      if (loc && (r2.status === 301 || r2.status === 302)) {
        const follow = await fetch(loc.startsWith("http") ? loc : `${baseUrl}${loc}`, {
          headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0" },
          redirect: "manual",
        });
        cookie = mergeSetCookies(cookie, follow.headers.get("set-cookie"));
      }
      if (cookie) supplierCookies[supplierId] = cookie;
    };

    if (!cookie) await ensureSession();

    const refsToTest = buildSupplierSearchRefs(query).slice(0, 3);
    const allItems: any[] = [];

    await Promise.all(refsToTest.map(async (q) => {
      const searchUrls = [
        `${baseUrl}/Site_CDG25/recherche.php?ref=${encodeURIComponent(q)}`,
        `${baseUrl}/Site_CDG25/ajax_recherche.php?ref=${encodeURIComponent(q)}`,
      ];

      await Promise.all(searchUrls.map(async (searchUrl) => {
        const r = await fetch(searchUrl, {
          headers: {
            Cookie: cookie,
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest",
            Referer: `${baseUrl}/Site_CDG25/`,
          },
        }).catch(() => null);
        if (!r || !r.ok) return;
        const text = await r.text();

        if (text.trim().startsWith("[") || text.trim().startsWith("{")) {
          try {
            const data = JSON.parse(text);
            for (const i of extractJsonArticles(data)) {
              allItems.push(mapCDGArticle(i, q));
            }
          } catch {}
        }

        allItems.push(...parseCDGSearchHtml(text, q));
      }));
    }));

    const packed = packScrapeResult(allItems);
    if (packed) return packed;

    if (!cookie) {
      return { price: 0, discount: 0, available: false, availability: "Erreur CDG: session B2B non établie.", items: [] };
    }

    return {
      price: 0,
      discount: 0,
      available: false,
      availability: `CDG B2B connecté (Code: ${b2bLogin}). Référence ${query} — non disponible / non trouvée (réf. et équivalences testées).`,
      items: [],
    };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur CDG: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. GPG  (gpgb2b.tn)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeGPG(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let token = supplierCookies[supplierId] || "";

    if (!token) {
      // GPG uses NuxtJS + Laravel backend - try multiple auth endpoints
      const loginAttempts = [
        { url: "https://gpgb2b.tn/api/auth/login", body: { email: b2bLogin, password: b2bPassword } },
        { url: "https://gpgb2b.tn/api/login", body: { email: b2bLogin, password: b2bPassword } },
        { url: "https://gpgb2b.tn/api/v1/login", body: { email: b2bLogin, password: b2bPassword } },
        { url: "https://gpgb2b.tn/api/sanctum/token", body: { email: b2bLogin, password: b2bPassword, device_name: "autop" } },
      ];
      for (const attempt of loginAttempts) {
        try {
          const r = await fetch(attempt.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
            body: JSON.stringify(attempt.body),
          });
          if (r.ok) {
            const d = await r.json().catch(() => null);
            if (d) {
              token = d?.token || d?.access_token || d?.data?.token || "";
              if (token) break;
            }
          }
        } catch {}
      }
      if (token) supplierCookies[supplierId] = token;
    }

    const authHdr: Record<string, string> = token && !token.includes("=")
      ? { "Authorization": `Bearer ${token}` }
      : (token ? { "Cookie": token } : {});

    const searchEndpoints = [
      `https://gpgb2b.tn/api/products?search=${encodeURIComponent(query)}`,
      `https://gpgb2b.tn/api/articles?search=${encodeURIComponent(query)}`,
      `https://gpgb2b.tn/api/catalogue?ref=${encodeURIComponent(query)}`,
      `https://gpgb2b.tn/api/search?q=${encodeURIComponent(query)}`,
    ];

    for (const endpoint of searchEndpoints) {
      try {
        const r = await fetch(endpoint, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json", ...authHdr }
        });
        if (r.ok) {
          const text = await r.text();
          if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            const articles = Array.isArray(data) ? data : (data?.data || data?.items || []);
            if (articles.length > 0) {
              const parsedItems = articles.slice(0, 20).map((i: any) => ({
                name: i.reference || i.ref || i.partNumber || query,
                brand: i.brand || i.marque || "",
                price: parseFloat(i.price || i.prix || 0) || 0,
                discount: parseFloat(i.discount || 0) || 0,
                availability: parseInt(i.stock || i.qty || 0) > 0 ? "Disponible" : "Sur Commande",
                rawStock: parseInt(i.stock || i.qty || 0),
                available: parseInt(i.stock || i.qty || 0) > 0
              }));
              const best = parsedItems.find((i: any) => i.available) || parsedItems[0];
              return { price: best.price, discount: best.discount, availability: best.availability, rawStock: best.rawStock, available: best.available, items: parsedItems };
            }
          }
        }
      } catch {}
    }

    return { price: 0, discount: 0, available: false, availability: `GPG B2B connecté (${b2bLogin}). Référence ${query} non trouvée.`, items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur GPG: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ITALCAR  (41.224.59.218:8081)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeITALCAR(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const baseUrl = "https://41.224.59.218:8081";
    let cookie = supplierCookies[supplierId] || "";

    if (!cookie) {
      // Step 1: GET login page for CSRF token
      const r1 = await fetch(`${baseUrl}/Account/Login`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const html1 = await r1.text();
      const csrf = html1.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1] || "";
      const initCookie = r1.headers.get("set-cookie") || "";

      // Step 2: POST login — field is "Name" (not Username)
      const r2 = await fetch(`${baseUrl}/Account/Login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": initCookie,
          "User-Agent": "Mozilla/5.0"
        },
        body: new URLSearchParams({ Name: b2bLogin, Password: b2bPassword, __RequestVerificationToken: csrf }).toString(),
        redirect: "manual",
      });
      const sessRaw = r2.headers.get("set-cookie") || "";
      const sessMatch = sessRaw.match(/ASP\.NET_SessionId=[^;]+/);
      if (sessMatch) {
        cookie = sessMatch[0];
        supplierCookies[supplierId] = cookie;
      }
    }

    if (!cookie) {
      return { price: 0, discount: 0, available: false, availability: "ITALCAR: Authentification échouée", items: [] };
    }

    // Step 3: Search using PROPARTS-style controllers (same ASP.NET MVC pattern)
    const results: any[] = [];
    const searchEndpoints = [
      { url: `${baseUrl}/Recherche/FindItembyOrigine`, body: { code: query, origine: query } },
      { url: `${baseUrl}/Recherche/FindItembyCodeArticle`, body: { code: query, codeArticle: query } },
      { url: `${baseUrl}/Article/Search`, body: { q: query, ref: query } },
    ];

    for (const ep of searchEndpoints) {
      try {
        const r = await fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookie,
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest"
          },
          body: new URLSearchParams(ep.body as any).toString()
        });
        if (r.ok) {
          const data = await r.json().catch(() => null);
          if (Array.isArray(data) && data.length > 0) {
            results.push(...data);
          }
        }
      } catch {}
    }

    if (results.length > 0) {
      const parsedItems = results.slice(0, 20).map((i: any) => {
        const rawStock = parseInt(i.Stock || i.Dispo || i.Disponible || i.qty || 0) || 0;
        const price = parseFloat(i.Prix || i.Price || i.prix || i.UnitPrice || 0) || 0;
        return {
          name: i.ItemNo || i.CodeArticle || i.Reference || i.ref || query,
          brand: i.Marque || i.Brand || i.marque || "ITALCAR",
          description: i.Description || i.Designation || "",
          price, discount: parseFloat(i.Remise || i.Discount || 0) || 0,
          availability: rawStock > 0 ? "Disponible en Stock" : "Sur Commande",
          rawStock, available: rawStock > 0
        };
      });
      const best = parsedItems.find((i: any) => i.available) || parsedItems[0];
      return { price: best.price, discount: best.discount, availability: best.availability, rawStock: best.rawStock, available: best.available, items: parsedItems };
    }

    return { price: 0, discount: 0, available: false, availability: `ITALCAR B2B actif (${b2bLogin}). Référence ${query} non trouvée.`, items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur ITALCAR: ${err.message}`, items: [] };
  }
}

async function scrapePROPARTS(supplierId: string, query: string, b2bLogin: string, b2bPassword: string, b2bUrl?: string | null) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let baseUrl = "http://41.226.37.212:8090";
    if (b2bUrl) {
      try { baseUrl = new URL(b2bUrl).origin; } catch {}
    }

    let cookie = supplierCookies[supplierId] || "";

    if (!cookie) {
      // Step 1: GET Login page for verification token & session cookie
      const r1 = await fetch(`${baseUrl}/Home/Login`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const html1 = await r1.text();
      const tokenMatch = html1.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);
      const token = tokenMatch ? tokenMatch[1] : "";
      const setCookie = r1.headers.get("set-cookie") || "";

      // Step 2: POST credentials with ASP.NET token
      const body = new URLSearchParams({
        username: b2bLogin,
        pwd: b2bPassword,
        __RequestVerificationToken: token
      });

      const r2 = await fetch(`${baseUrl}/Home/Login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": setCookie,
          "User-Agent": "Mozilla/5.0"
        },
        body: body.toString(),
        redirect: "manual"
      });

      cookie = r2.headers.get("set-cookie") || setCookie;
      if (cookie) supplierCookies[supplierId] = cookie;
    }

    const refsToTest = buildSupplierSearchRefs(query).slice(0, 6);
    let rawItems: any[] = [];

    for (const qRef of refsToTest) {
      await fetchWithTimeout(`${baseUrl}/Recherche/SaveMot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": cookie,
          "User-Agent": "Mozilla/5.0",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: new URLSearchParams({ mot: qRef }).toString()
      }, 2000).catch(() => null);

      const [resOrigine, resCode] = await Promise.all([
        fetchWithTimeout(`${baseUrl}/Recherche/FindItembyOrigine`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookie,
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest"
          },
          body: new URLSearchParams({ code: qRef, origine: qRef, ref: qRef }).toString()
        }, 2500).catch(() => null),
        fetchWithTimeout(`${baseUrl}/Recherche/FindItembyCodeArticle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookie,
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest"
          },
          body: new URLSearchParams({ code: qRef, codeArticle: qRef, ref: qRef }).toString()
        }, 2500).catch(() => null)
      ]);

      if (resOrigine && resOrigine.ok) {
        const text1 = await resOrigine.text().catch(() => "");
        if (text1.trim().startsWith("[")) {
          try {
            const data1 = JSON.parse(text1);
            if (Array.isArray(data1)) rawItems.push(...data1);
          } catch {}
        }
      }
      if (resCode && resCode.ok) {
        const text2 = await resCode.text().catch(() => "");
        if (text2.trim().startsWith("[")) {
          try {
            const data2 = JSON.parse(text2);
            if (Array.isArray(data2)) rawItems.push(...data2);
          } catch {}
        }
      }
      if (rawItems.length > 0) break;
    }

    if (rawItems.length > 0) {
      const parsedItems = rawItems.slice(0, 20).map((i: any) => {
        const rawStock = parseInt(i.Stock || i.Dispo || i.Disponible || i.Vente || 0) || 0;
        const price = parseFloat(i.Prix || i.PrixVente || i.UnitPrice || i.Price || 0) || 0;
        const discount = parseFloat(i.Remise || i.Discount || 0) || 0;
        const itemRef = i.ItemNo || i.CodeArticle || i.Reference || query;
        return {
          name: itemRef,
          brand: i.Marque || i.Brand || i.VendorNo || "PROPARTS",
          description: i.Description || "",
          price: price,
          discount: discount,
          availability: rawStock > 0 ? "Disponible en Stock" : "Sur Commande",
          rawStock: rawStock,
          available: rawStock > 0,
          matchType: normalizeRef(itemRef) === normalizeRef(query) ? "DIRECT" : "EQUIVALENCE"
        };
      });

      const best = parsedItems.find((i: any) => i.available) || parsedItems[0];
      return {
        price: best.price,
        discount: best.discount,
        availability: best.availability,
        rawStock: best.rawStock,
        available: best.available,
        items: parsedItems
      };
    }

    return { price: 0, discount: 0, available: false, availability: `PROPARTS B2B actif (Code: ${b2bLogin}). Référence ${query} non trouvée.`, items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur PROPARTS: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. SOCOFA GROS  (espacepro.socofagros.com)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeSOCOFA(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let token = supplierCookies[supplierId] || "";
    if (!token) {
      const loginRes = await fetch("https://espacepro.socofagros.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ email: b2bLogin, password: b2bPassword }),
      });
      if (loginRes.ok) {
        const text = await loginRes.text();
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          try {
            const d = JSON.parse(text);
            token = d?.token || d?.access_token || d?.data?.token || "";
          } catch {}
        }
      }
      if (!token) {
        // Try form login at /auth
        const formRes = await fetch("https://espacepro.socofagros.com/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
          body: JSON.stringify({ username: b2bLogin, email: b2bLogin, password: b2bPassword }),
          redirect: "manual",
        });
        if (formRes.ok) {
          const fd = await formRes.json().catch(() => null);
          token = fd?.token || fd?.access_token || "";
        }
        if (!token) {
          const c = formRes.headers.get("set-cookie") || "";
          const m = c.match(/(?:session|auth|PHPSESSID|token)[^;]+/i);
          if (m) token = m[0];
        }
      }
      if (token) supplierCookies[supplierId] = token;
    }
    const authHdr: Record<string, string> = token && !token.includes("=") ? { "Authorization": `Bearer ${token}` } : { "Cookie": token };
    const refsToTest = buildSupplierSearchRefs(query).slice(0, 6);
    const items: any[] = [];

    await Promise.all(refsToTest.map(async (q) => {
      try {
        const searchRes = await fetchWithTimeout(`https://espacepro.socofagros.com/api/products?search=${encodeURIComponent(q)}`, {
          headers: { "User-Agent": "Mozilla/5.0", ...authHdr }
        }, 2500).catch(() => null);
        if (searchRes && searchRes.ok) {
          const text = await searchRes.text().catch(() => "");
          if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            const data = JSON.parse(text);
            const articles = Array.isArray(data) ? data : (data?.data || data?.items || []);
            articles.forEach((i: any) => {
              const stock = parseInt(i.stock || i.qty || 0) || 0;
              const price = parseFloat(i.price || i.prix || 0) || 0;
              items.push({
                name: i.reference || i.ref || i.code || q,
                brand: i.brand || i.marque || "SOCOFA",
                price,
                discount: parseFloat(i.discount || 0) || 0,
                availability: stock > 0 ? "Disponible en Stock" : "Sur Commande",
                rawStock: stock,
                available: stock > 0,
                matchType: normalizeRef(i.reference || q) === normalizeRef(query) ? "DIRECT" : "EQUIVALENCE"
              });
            });
          }
        }
      } catch {}
    }));

    const packed = packScrapeResult(items);
    if (packed) return packed;
    return { price: 0, discount: 0, available: false, availability: `SOCOFA B2B actif (${b2bLogin}). Référence ${query} non trouvée.`, items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur SOCOFA: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. AFRICA  (aap.tn)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeAFRICA(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let token = supplierCookies[supplierId] || "";

    if (!token) {
      // AAP uses Angular + Java Tomcat backend - try JHipster / Spring Boot patterns
      const loginAttempts = [
        { url: "https://aap.tn/api/authenticate", body: { username: b2bLogin, password: b2bPassword, rememberMe: false } },
        { url: "https://aap.tn/api/auth/token", body: { username: b2bLogin, password: b2bPassword } },
        { url: "https://aap.tn/api/v1/auth/login", body: { username: b2bLogin, password: b2bPassword } },
        { url: "https://aap.tn/api/auth", body: { login: b2bLogin, password: b2bPassword } },
      ];
      for (const attempt of loginAttempts) {
        try {
          const r = await fetch(attempt.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
            body: JSON.stringify(attempt.body),
          });
          if (r.ok) {
            const d = await r.json().catch(() => null);
            if (d) {
              token = d?.id_token || d?.token || d?.access_token || d?.data?.token || "";
              if (token) break;
            }
          }
        } catch {}
      }
      if (token) supplierCookies[supplierId] = token;
    }

    const authHdr: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};
    const searchEndpoints = [
      `https://aap.tn/api/articles?search=${encodeURIComponent(query)}`,
      `https://aap.tn/api/pieces?reference=${encodeURIComponent(query)}`,
      `https://aap.tn/api/catalogue?q=${encodeURIComponent(query)}`,
    ];

    for (const endpoint of searchEndpoints) {
      try {
        const r = await fetch(endpoint, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json", ...authHdr }
        });
        if (r.ok) {
          const text = await r.text();
          if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            const articles = Array.isArray(data) ? data : (data?.data || data?.items || data?.content || []);
            if (articles.length > 0) {
              const parsedItems = articles.slice(0, 20).map((i: any) => ({
                name: i.reference || i.ref || i.code || query,
                brand: i.brand || i.marque || i.manufacturer || "",
                price: parseFloat(i.price || i.prix || i.unitPrice || 0) || 0,
                discount: parseFloat(i.discount || i.remise || 0) || 0,
                availability: parseInt(i.stock || i.qty || i.quantity || 0) > 0 ? "Disponible" : "Sur Commande",
                rawStock: parseInt(i.stock || i.qty || i.quantity || 0),
                available: parseInt(i.stock || i.qty || i.quantity || 0) > 0
              }));
              const best = parsedItems.find((i: any) => i.available) || parsedItems[0];
              return { price: best.price, discount: best.discount, availability: best.availability, rawStock: best.rawStock, available: best.available, items: parsedItems };
            }
          }
        }
      } catch {}
    }

    return { price: 0, discount: 0, available: false, availability: `AFRICA AUTO PARTS B2B connecté (Code: ${b2bLogin}). Référence ${query} non trouvée.`, items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur AFRICA: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. ALPHA FORD  (commandes.alphafordpro.tn)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeALPHAFORD(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let cookie = supplierCookies[supplierId] || "";
    if (!cookie) {
      const loginParams = new URLSearchParams({ username: b2bLogin, password: b2bPassword });
      const loginRes = await fetch("https://commandes.alphafordpro.tn/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0" },
        body: loginParams.toString(), redirect: "manual",
      });
      const c = loginRes.headers.get("set-cookie") || "";
      const m = c.match(/(?:PHPSESSID|session|auth)[^;]+/i);
      if (m) cookie = m[0];
      if (cookie) supplierCookies[supplierId] = cookie;
    }
    const searchRes = await fetch(`https://commandes.alphafordpro.tn/search?q=${encodeURIComponent(query)}`, {
      headers: { "Cookie": cookie, "User-Agent": "Mozilla/5.0" }
    });
    if (searchRes.ok) {
      const data = await searchRes.json().catch(() => null);
      if (data) {
        const articles = Array.isArray(data) ? data : (data?.data || data?.items || []);
        if (articles.length > 0) {
          const parsedItems = articles.slice(0, 20).map((i: any) => ({
            name: i.reference || i.ref || query,
            brand: i.brand || i.marque || "FORD",
            price: parseFloat(i.price || i.prix || 0) || 0,
            discount: parseFloat(i.discount || 0) || 0,
            availability: parseInt(i.stock || i.qty || 0) > 0 ? "Disponible" : "Sur Commande",
            rawStock: parseInt(i.stock || i.qty || 0),
            available: parseInt(i.stock || i.qty || 0) > 0
          }));
          const best = parsedItems.find((i: any) => i.available) || parsedItems[0];
          return { price: best.price, discount: best.discount, availability: best.availability, rawStock: best.rawStock, available: best.available, items: parsedItems };
        }
      }
    }
    return { price: 0, discount: 0, available: false, availability: `ALPHA FORD B2B actif (${b2bLogin}). Référence ${query} non trouvée.`, items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur ALPHA FORD: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. SOPIC  (sopiq.tn)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeSOPIC(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let token = supplierCookies[supplierId] || "";

    if (!token) {
      // SOPIC is Vue.js + Java Tomcat Spring Security
      // Spring Security default login endpoint accepts POST /login with username/password form
      const r1 = await fetch("https://sopiq.tn/", { headers: { "User-Agent": "Mozilla/5.0" } });
      const jsession = r1.headers.get("set-cookie")?.match(/JSESSIONID=[^;]+/)?.[0] || "";

      const loginAttempts = [
        // Java Spring Security form login
        { url: "https://sopiq.tn/j_spring_security_check", type: "form", body: { j_username: b2bLogin, j_password: b2bPassword } },
        { url: "https://sopiq.tn/login", type: "form", body: { username: b2bLogin, password: b2bPassword } },
        // REST API attempts
        { url: "https://sopiq.tn/api/token", type: "json", body: { username: b2bLogin, password: b2bPassword } },
        { url: "https://sopiq.tn/api/authenticate", type: "json", body: { username: b2bLogin, password: b2bPassword } },
        { url: "https://sopiq.tn/api/auth/login", type: "json", body: { email: b2bLogin, password: b2bPassword } },
      ];

      for (const attempt of loginAttempts) {
        try {
          const headers: Record<string, string> = {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json, text/html",
            ...(jsession ? { "Cookie": jsession } : {})
          };
          let body: string;
          if (attempt.type === "form") {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            body = new URLSearchParams(attempt.body as any).toString();
          } else {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(attempt.body);
          }
          const r = await fetch(attempt.url, { method: "POST", headers, body, redirect: "manual" });
          const respCookie = r.headers.get("set-cookie") || "";
          const loc = r.headers.get("location") || "";
          if ((r.status === 302 || r.status === 301) && !loc.includes("error")) {
            token = respCookie.match(/JSESSIONID=[^;]+/)?.[0] || jsession;
            if (token) break;
          }
          if (r.ok) {
            const text = await r.text().catch(() => "");
            if (text.trim().startsWith('{')) {
              const d = JSON.parse(text);
              token = d?.token || d?.access_token || d?.data?.token || "";
              if (token) break;
            }
          }
        } catch {}
      }
      if (token) supplierCookies[supplierId] = token;
    }

    const authHdr: Record<string, string> = token && !token.includes("=")
      ? { "Authorization": `Bearer ${token}` }
      : (token ? { "Cookie": token } : {});

    const searchEndpoints = [
      `https://sopiq.tn/api/products/search?q=${encodeURIComponent(query)}`,
      `https://sopiq.tn/api/articles?ref=${encodeURIComponent(query)}`,
      `https://sopiq.tn/api/catalogue?search=${encodeURIComponent(query)}`,
      `https://sopiq.tn/catalogue?ref=${encodeURIComponent(query)}`,
    ];

    for (const endpoint of searchEndpoints) {
      try {
        const r = await fetch(endpoint, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json", ...authHdr }
        });
        if (r.ok) {
          const text = await r.text();
          if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            const articles = Array.isArray(data) ? data : (data?.data || data?.items || data?.content || []);
            if (articles.length > 0) {
              const parsedItems = articles.slice(0, 20).map((i: any) => ({
                name: i.reference || i.ref || query,
                brand: i.brand || i.marque || "",
                price: parseFloat(i.price || i.prix || i.unitPrice || 0) || 0,
                discount: parseFloat(i.discount || i.remise || 0) || 0,
                availability: parseInt(i.stock || i.qty || i.quantity || 0) > 0 ? "Disponible" : "Sur Commande",
                rawStock: parseInt(i.stock || i.qty || i.quantity || 0),
                available: parseInt(i.stock || i.qty || i.quantity || 0) > 0
              }));
              const best = parsedItems.find((i: any) => i.available) || parsedItems[0];
              return { price: best.price, discount: best.discount, availability: best.availability, rawStock: best.rawStock, available: best.available, items: parsedItems };
            }
          }
        }
      } catch {}
    }

    return { price: 0, discount: 0, available: false, availability: `SOPIC B2B connecté (${b2bLogin}). Référence ${query} non trouvée.`, items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur SOPIC: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. CAR GROS / ENNAKL  (eyeconnect.ennakl.com:4200)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeCARGROS(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const base = "https://eyeconnect.ennakl.com:4200";
    let token = supplierCookies[supplierId] || "";

    if (!token) {
      // Ennakl/CARGROS Angular app — try multiple auth endpoints
      const loginAttempts = [
        { url: `${base}/api/auth/login`, body: { username: b2bLogin, password: b2bPassword } },
        { url: `${base}/api/login`, body: { username: b2bLogin, password: b2bPassword } },
        { url: `${base}/api/users/login`, body: { username: b2bLogin, password: b2bPassword, login: b2bLogin } },
        { url: `${base}/api/v1/auth/login`, body: { username: b2bLogin, password: b2bPassword } },
        { url: `${base}/api/account/login`, body: { username: b2bLogin, password: b2bPassword } },
      ];
      for (const attempt of loginAttempts) {
        try {
          const r = await fetch(attempt.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
            body: JSON.stringify(attempt.body)
          });
          if (r.ok) {
            const d = await r.json().catch(() => null);
            if (d) {
              token = d?.token || d?.access_token || d?.data?.token || d?.jwt || "";
              if (token) break;
            }
          }
        } catch {}
      }
      if (token) supplierCookies[supplierId] = token;
    }

    const authHdr: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};
    const searchEndpoints = [
      `${base}/api/articles?search=${encodeURIComponent(query)}`,
      `${base}/api/pieces?ref=${encodeURIComponent(query)}`,
      `${base}/api/catalogue?q=${encodeURIComponent(query)}`,
      `${base}/api/products?search=${encodeURIComponent(query)}`,
    ];

    for (const endpoint of searchEndpoints) {
      try {
        const r = await fetch(endpoint, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json", ...authHdr }
        });
        if (r.ok) {
          const text = await r.text();
          if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            const articles = Array.isArray(data) ? data : (data?.data || data?.items || data?.content || []);
            if (articles.length > 0) {
              const parsedItems = articles.slice(0, 20).map((i: any) => ({
                name: i.reference || i.ref || query,
                brand: i.brand || i.marque || "",
                price: parseFloat(i.price || i.prix || 0) || 0,
                discount: parseFloat(i.discount || 0) || 0,
                availability: parseInt(i.stock || i.qty || 0) > 0 ? "Disponible" : "Sur Commande",
                rawStock: parseInt(i.stock || i.qty || 0),
                available: parseInt(i.stock || i.qty || 0) > 0
              }));
              const best = parsedItems.find((i: any) => i.available) || parsedItems[0];
              return { price: best.price, discount: best.discount, availability: best.availability, rawStock: best.rawStock, available: best.available, items: parsedItems };
            }
          }
        }
      } catch {}
    }

    return { price: 0, discount: 0, available: false, availability: `CAR GROS/ENNAKL B2B connecté (Code: ${b2bLogin}). Référence ${query} non trouvée.`, items: [] };
  } catch (err: any) {
    return { price: 0, discount: 0, available: false, availability: `Erreur CAR GROS: ${err.message}`, items: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCHER — route chaque fournisseur vers le bon scraper
// ─────────────────────────────────────────────────────────────────────────────
async function searchSingleSupplier(supplier: any, searchQuery: string) {
  const supName = (supplier.name || '').toUpperCase().trim();
  const b2bUrl = (supplier.b2bUrl || '').toLowerCase();

  if (!supplier.b2bLogin || !supplier.b2bPassword) {
    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      available: false,
      price: 0, discount: 0,
      availability: `Identifiants B2B non configurés pour ${supplier.name}`,
      items: []
    };
  }

  let raw: any;

  if (supName.includes("STEQ") || b2bUrl.includes("steq")) {
    raw = await scrapeSTEQ(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else if (supName.includes("FAD") || b2bUrl.includes("fad")) {
    raw = await scrapeFAD(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword, supplier.b2bUrl);
  } else if (b2bUrl.includes("mosaique-auto") || supName.includes("UNIVERS AUTO") || supName.includes("ROUTE X")) {
    raw = await scrapeMosaiqueAuto(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword, supplier.b2bUrl);
  } else if (supName.includes("SAGAP") || b2bUrl.includes("sagap")) {
    raw = await scrapeSAGAP(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else if (supName.includes("CDG") || b2bUrl.includes("cdg")) {
    raw = await scrapeCDG(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else if (supName.includes("GPG") || b2bUrl.includes("gpg")) {
    raw = await scrapeGPG(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else if (supName.includes("ITALCAR") || b2bUrl.includes("italcar") || b2bUrl.includes("41.224.59.218")) {
    raw = await scrapeITALCAR(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else if (supName.includes("PROPARTS") || b2bUrl.includes("proparts") || b2bUrl.includes("41.226.37.212")) {
    raw = await scrapePROPARTS(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else if (supName.includes("SOCOFA") || b2bUrl.includes("socofa")) {
    raw = await scrapeSOCOFA(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else if (supName.includes("AFRICA") || supName.includes("AAP") || b2bUrl.includes("aap.tn")) {
    raw = await scrapeAFRICA(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else if (supName.includes("ALPHA FORD") || b2bUrl.includes("alphaford")) {
    raw = await scrapeALPHAFORD(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else if (supName.includes("SOPIC") || b2bUrl.includes("sopiq")) {
    raw = await scrapeSOPIC(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else if (supName.includes("CAR GROS") || supName.includes("CARGROS") || b2bUrl.includes("ennakl")) {
    raw = await scrapeCARGROS(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
  } else {
    // Fournisseur avec identifiants mais sans robot spécifique — on signale
    raw = {
      price: 0, discount: 0, available: false,
      statusCode: 'NOT_CONFIGURED',
      statusReason: `ℹ️ B2B configuré pour ${supplier.name} — robot en cours d'intégration`,
      availability: `B2B configuré pour ${supplier.name} — robot en cours d'intégration.`,
      items: []
    };
  }

  const items = (raw.items || []).map((it: any) => ({ ...it, supplierName: supplier.name, supplierId: supplier.id }));
  const hasItems = items.length > 0;
  const isAvailable = raw.available || items.some((i: any) => i.available || i.rawStock > 0);

  let statusCode = raw.statusCode;
  let statusReason = raw.statusReason;
  if (!statusCode) {
    if (hasItems && isAvailable) {
      statusCode = 'SUCCESS';
      statusReason = '✓ Article disponible chez le fournisseur';
    } else if (hasItems) {
      statusCode = 'NO_STOCK';
      statusReason = 'ℹ️ Sur commande / Hors stock';
    } else {
      statusCode = 'NOT_FOUND';
      statusReason = 'ℹ️ Référence non trouvée dans le catalogue direct';
    }
  }

  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    price: raw.price || 0,
    discount: raw.discount || 0,
    available: isAvailable,
    stock: raw.rawStock || 0,
    statusCode,
    statusReason,
    availability: raw.availability || statusReason,
    portalUrl: supplier.b2bUrl || undefined,
    items
  };
}

function supplierSearchTimeoutMs(name: string): number {
  return 6000;
}
async function searchSingleSupplierWithTimeout(supplier: any, searchQuery: string, timeoutMs?: number): Promise<any> {
  const effectiveTimeout = timeoutMs ?? supplierSearchTimeoutMs(supplier.name);

  const executeSearch = async () => {
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          supplierId: supplier.id,
          supplierName: supplier.name,
          price: 0,
          discount: 0,
          available: false,
          stock: 0,
          statusCode: 'TIMEOUT',
          statusReason: `⚠️ Temps de réponse dépassé (${effectiveTimeout / 1000}s)`,
          availability: `Portail ${supplier.name} (Timeout ${effectiveTimeout / 1000}s) — Temps de réponse dépassé.`,
          portalUrl: supplier.b2bUrl || undefined,
          items: []
        });
      }, effectiveTimeout);
    });

    try {
      return await Promise.race([
        searchSingleSupplier(supplier, searchQuery),
        timeoutPromise
      ]);
    } catch (err: any) {
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        price: 0,
        discount: 0,
        available: false,
        stock: 0,
        statusCode: 'ERROR',
        statusReason: `⚠️ Erreur ${supplier.name}: ${err.message || 'Problème de connexion'}`,
        availability: `Erreur ${supplier.name}: ${err.message || String(err)}`,
        portalUrl: supplier.b2bUrl || undefined,
        items: []
      };
    }
  };

  return await executeSearch();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/b2b/search
// ─────────────────────────────────────────────────────────────────────────────
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Non authentifié. Connexion requise pour la recherche B2B.' }, { status: 401 });
    }

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const body = await request.json().catch(() => ({}));
    const { 
      supplierId: rawSupplierId, 
      query, 
      reference, 
      vin, 
      designation, 
      brand: searchBrand, 
      make, 
      model, 
      engine 
    } = body;
    
    const supplierId = rawSupplierId || 'ALL';
    let searchQuery = (query || reference || designation || '').trim();
    
    // VIN Integration
    let vinInfo: any = null;
    if (vin && vin.length >= 5) {
      try {
        // Simple VIN resolution logic inline to avoid extra hop
        const cleanVin = vin.trim().toUpperCase();
        if (cleanVin.startsWith('VF3')) vinInfo = { brand: 'PEUGEOT', model: '407' };
        else if (cleanVin.startsWith('VF7')) vinInfo = { brand: 'CITROËN', model: 'C4' };
        else if (cleanVin.startsWith('WDD')) vinInfo = { brand: 'MERCEDES-BENZ', model: 'CLASSE C' };
        else if (cleanVin.startsWith('WVW')) vinInfo = { brand: 'VOLKSWAGEN', model: 'GOLF' };
        else if (cleanVin.startsWith('VF1')) vinInfo = { brand: 'RENAULT', model: 'MEGANE' };
        
        if (vinInfo && !searchQuery) {
          searchQuery = `${vinInfo.brand} ${vinInfo.model}`;
        }
      } catch (vinErr) {
        console.warn("[B2B Search] VIN Resolution error:", vinErr);
      }
    }

    if (!searchQuery && (make || model)) {
      searchQuery = `${make || ''} ${model || ''}`.trim();
    }

    if (!searchQuery) {
      return NextResponse.json({ success: false, error: "Critère de recherche requis (Référence, Désignation ou Véhicule)" }, { status: 400 });
    }

    const { prisma } = await import('@/lib/prisma');
    const { searchDictionaryAndEquivalents, getEquivalentsForRef } = await import('@/lib/equivalentsDictionary');
    let searchResult: any = null;

    if (supplierId === 'ALL' || supplierId === 'TOUS') {
      let suppliers: any[] = [];
      try {
        suppliers = await prisma.supplier.findMany({ where: { isActive: true } });
      } catch (dbErr) {
        console.warn("[B2B Search] Prisma error loading suppliers:", dbErr);
        suppliers = [];
      }

      // Prioritize DB saved logins/passwords first; fall back to defaults only if DB string is empty
      const preparedSuppliers = suppliers.map(s => {
        let l = s.b2bLogin?.trim();
        let p = s.b2bPassword?.trim();
        if (!l) {
          const supUpper = (s.name || '').toUpperCase();
          if (supUpper.includes('FAD')) l = '3905';
          else if (supUpper.includes('STEQ')) l = 'CL0016035';
          else if (supUpper.includes('CDG')) l = '4112329';
          else if (supUpper.includes('SAGAP')) l = 'ibrahim.ayadi@autop.tn';
          else if (supUpper.includes('AAP')) l = '410138';
          else if (supUpper.includes('PROPARTS')) l = 'C0667';
          else if (supUpper.includes('ITALCAR')) l = 'SSE01';
          else if (supUpper.includes('CARGROS')) l = 'DPE00114';
          else if (supUpper.includes('ALPHA FORD')) l = 'AUTOP/STE DE SERVICE AUTOMOBILE';
          else if (supUpper.includes('GPG') || supUpper.includes('UNIVERS') || supUpper.includes('ROUTE X')) l = 'services-automobile@gmail.com';
          else if (supUpper.includes('SOPIC')) l = 'amine@autop.tn';
          else if (supUpper.includes('SOCOFA')) l = 'Amine.benomrane@autop.tn';
          else l = 'AUTOP';
        }
        if (!p) {
          if (l === '3905') p = '7S@5512g';
          else p = 'password123';
        }
        return { ...s, b2bLogin: l, b2bPassword: p };
      });

      console.log(`[B2B Search] Recherche pour "${searchQuery}" sur ${preparedSuppliers.length} fournisseurs B2B...`);

      // 1. Recherche Directe
      let allResults = await Promise.all(
        preparedSuppliers.map(s => searchSingleSupplierWithTimeout(s, searchQuery, 7000))
      );

      let liveSupplierItems: any[] = [];
      allResults.forEach(r => { if (r.items && Array.isArray(r.items)) liveSupplierItems.push(...r.items); });

      // 2. FALLBACK AUTOMATIQUE AUX ÉQUIVALENCES
      // Si aucun article DISPONIBLE n'est trouvé, on tente les équivalences
      const hasAvailable = liveSupplierItems.some(i => i.available || i.rawStock > 0);
      
      if (!hasAvailable && searchQuery.length >= 4) {
        console.log(`[B2B Search] Aucun stock direct pour ${searchQuery}. Tentative par Équivalences...`);
        const equivalents = getEquivalentsForRef(searchQuery);
        const eqRefs = equivalents
          .filter(e => e.reference !== searchQuery)
          .map(e => e.reference)
          .slice(0, 5); // Limiter pour ne pas saturer

        if (eqRefs.length > 0) {
          const eqResults = await Promise.all(
            preparedSuppliers.flatMap(s => 
              eqRefs.map(ref => searchSingleSupplierWithTimeout(s, ref, 5000))
            )
          );
          
          eqResults.forEach(r => { 
            if (r.items && Array.isArray(r.items)) {
              r.items.forEach((it: any) => {
                liveSupplierItems.push({ ...it, matchType: 'EQUIVALENCE' });
              });
            }
          });
        }
      }

      const combinedItems: any[] = [...liveSupplierItems];

      // 1. Croiser avec la base de données interne Product et PartPriceHistory
      try {
        const qUpper = searchQuery.toUpperCase();
        
        // Recherche multi-critères en DB
        const dbProducts = await prisma.product.findMany({
          where: {
            OR: [
              { reference: { contains: qUpper } },
              { sku: { contains: qUpper } },
              { name: { contains: qUpper } },
              { brand: { contains: searchBrand?.toUpperCase() || qUpper } },
              { vehicleCompat: { contains: model?.toUpperCase() || make?.toUpperCase() || qUpper } }
            ],
            status: 'ACTIVE'
          },
          take: 20
        });

        dbProducts.forEach(p => {
          combinedItems.push({
            name: p.reference || p.sku,
            brand: p.brand || 'CATALOGUE AUTOP',
            price: p.price || 0,
            discount: 0,
            availability: (p.stock || 0) > 0 ? `Disponible (Stock: ${p.stock})` : 'Sur Commande',
            rawStock: p.stock || 0,
            available: (p.stock || 0) > 0,
            isFallback: true,
            supplierName: 'CATALOGUE GÉNÉRAL AUTOP'
          });
        });

        const histories = await prisma.partPriceHistory.findMany({
          where: {
            OR: [
              { reference: { contains: qUpper } },
              { supplierName: { contains: qUpper } }
            ]
          },
          take: 15
        });

        histories.forEach(h => {
          combinedItems.push({
            name: h.reference,
            brand: h.type === 'ORIGINE' || h.isConcessionnaire ? 'ORIGINE CONCESSIONNAIRE' : 'ADAPTABLE',
            price: h.sellingPrice || h.purchasePrice || 0,
            discount: 0,
            availability: 'Offre Historique Enregistrée',
            rawStock: 1,
            available: true,
            isFallback: true,
            supplierName: h.supplierName || 'Fournisseur'
          });
        });
      } catch (errDb) {
        console.warn("[B2B Search] Local DB Search fallback error:", errDb);
      }

      // 2. Croiser avec le dictionnaire d'équivalence centralisé (en secours)
      const dictEntries = searchDictionaryAndEquivalents(searchQuery);
      dictEntries.forEach(entry => {
        entry.equivalents.forEach(eq => {
          combinedItems.push({
            name: eq.reference,
            brand: eq.brand,
            price: eq.estimatedPrice || 0,
            discount: 0,
            availability: 'Dictionnaire d\'Équivalents',
            rawStock: 1,
            available: false,
            isFallback: true,
            supplierName: `DICTIONNAIRE (${entry.category})`
          });
        });
      });

      // Sélection prioritaire du meilleur prix fournisseur réel en stock ou en arrivage
      const realLiveItems = combinedItems.filter(i => !i.isFallback && i.price > 0);
      const availableLiveItem = realLiveItems.find(i => i.available || i.rawStock > 0 || i.availability?.includes('Stock') || i.availability?.includes('Arrivage'));
      const bestItem = availableLiveItem || realLiveItems[0] || combinedItems.find(i => i.price > 0) || combinedItems[0];

      searchResult = {
        isMultiSupplier: true,
        price: bestItem ? bestItem.price : 0,
        discount: bestItem ? bestItem.discount : 0,
        available: bestItem ? (bestItem.available || Boolean(bestItem.rawStock > 0)) : false,
        stock: bestItem ? bestItem.rawStock : 0,
        availability: bestItem ? (bestItem.availability || (bestItem.available ? 'Disponible' : 'Sur Commande')) : 'Résultats extraits des fournisseurs',
        items: combinedItems,
        suppliersBreakdown: allResults
      };

    } else {
      let supplier: any = null;
      try {
        supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      } catch (dbErr) {
        console.warn("[B2B Search] Supplier find error:", dbErr);
      }
      if (!supplier) return NextResponse.json({ success: false, error: "Fournisseur introuvable" }, { status: 404 });
      if (!supplier.b2bLogin) supplier.b2bLogin = 'AUTOP';
      if (!supplier.b2bPassword) supplier.b2bPassword = 'password123';
      searchResult = await searchSingleSupplierWithTimeout(supplier, searchQuery, 10000);
    }

    if (searchResult?.error) {
      return NextResponse.json({ success: false, error: searchResult.error }, { status: 400 });
    }

    // Auto-register discovered products into database without data loss
    if (searchResult?.items?.length > 0) {
      try {
        const { saveDiscoveredParts } = await import('@/lib/catalogStorage');
        await saveDiscoveredParts(searchResult.items);
      } catch (e) {
        console.error("Auto-register error:", e);
      }
    }


    return NextResponse.json({ success: true, data: searchResult });

  } catch (error: any) {
    console.error("B2B API Error:", error);
    return NextResponse.json({ success: false, error: `Erreur serveur: ${error.message}` }, { status: 500 });
  }
}
