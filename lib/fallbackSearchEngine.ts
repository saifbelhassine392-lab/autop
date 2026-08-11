/**
 * ============================================================
 * AUTOP — Moteur de Recherche en Repli (Fallback Search Engine)
 * ============================================================
 * Gère automatiquement les références manquantes dans les catalogues
 * fournisseurs B2B en appliquant une cascade de méthodes de récupération.
 *
 * Méthodes disponibles (dans l'ordre d'exécution) :
 *   1. REF_CLEANING    — Variantes nettoyées de la référence originale
 *   2. OEM_EQUIVALENT  — Équivalences OEM via le dictionnaire centralisé
 *   3. CDG_ANALYSIS    — Apprendre des fournisseurs qui ont trouvé des résultats
 *   4. BRAND_VARIANT   — Préfixes de marques aftermarket tunisiennes
 *   5. DICTIONARY_EXPAND — Recherche floue dans le dictionnaire étendu
 *
 * Usage :
 *   const result = await runFallbackSearch(query, suppliers, triedRefs, firstPassResults, scraperFnMap);
 *   if (result.success) { console.log(result.items, result.logs); }
 */

import {
  generateRefVariants,
  getEquivalentsForRef,
  searchDictionaryAndEquivalents,
  normalizeRef,
  getTunisianBrandPrefixes,
} from '@/lib/equivalentsDictionary';

// ─────────────────────────────────────────────────────────────────────────────
// Types publics
// ─────────────────────────────────────────────────────────────────────────────

export type FallbackMethod =
  | 'REF_CLEANING'
  | 'OEM_EQUIVALENT'
  | 'CDG_ANALYSIS'
  | 'BRAND_VARIANT'
  | 'DICTIONARY_EXPAND';

export type FallbackOutcome = 'FOUND' | 'NOT_FOUND' | 'PARTIAL';

export interface FallbackLog {
  step: number;
  method: FallbackMethod;
  triedRef: string;
  supplierName: string;
  outcome: FallbackOutcome;
  itemsFound: number;
  detail: string;
  timestamp: string;
}

export interface FallbackResult {
  success: boolean;
  originalQuery: string;
  finalRef: string;
  foundAt: string[];
  items: any[];
  logs: FallbackLog[];
  totalAttemptsCount: number;
  totalSuppliersContacted: number;
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const MAX_CDG_ANALYSIS_REFS = 3;
const MAX_OEM_REFS = 6;
const FALLBACK_TIMEOUT_MS = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internes
// ─────────────────────────────────────────────────────────────────────────────

function makeLog(
  step: number,
  method: FallbackMethod,
  triedRef: string,
  supplierName: string,
  outcome: FallbackOutcome,
  itemsFound: number,
  detail: string
): FallbackLog {
  return { step, method, triedRef, supplierName, outcome, itemsFound, detail, timestamp: new Date().toISOString() };
}

/**
 * Extrait les références réelles depuis les items retournés par un fournisseur qui a réussi.
 * Utile pour CDG_ANALYSIS : si CDG trouve "CAN1306J5", on réutilise cette ref chez STEQ.
 */
function extractRefsFromSuccessfulResults(results: any[]): string[] {
  const seen = new Set<string>();
  for (const r of results) {
    const items: any[] = r.items || [];
    for (const it of items) {
      const ref = String(it.reference || it.name || '').trim().toUpperCase();
      if (ref && ref.length >= 3) seen.add(ref);
      const n = normalizeRef(ref);
      if (n && n.length >= 3) seen.add(n);
    }
  }
  return Array.from(seen).slice(0, MAX_CDG_ANALYSIS_REFS);
}

function getFailedSupplierIds(allResults: any[]): Set<string> {
  const failed = new Set<string>();
  for (const r of allResults) {
    if (!r.items?.length || r.statusCode === 'NOT_FOUND' || r.statusCode === 'TIMEOUT' || r.statusCode === 'ERROR') {
      if (r.supplierId) failed.add(r.supplierId);
      if (r.supplierName) failed.add(r.supplierName);
    }
  }
  return failed;
}

async function callSupplierScraper(
  supplier: any,
  ref: string,
  scraperFn: (supplierId: string, query: string, login: string, password: string, url?: string | null) => Promise<any>
): Promise<any> {
  try {
    const timeoutPromise = new Promise<any>((resolve) =>
      setTimeout(() => resolve({ items: [], available: false, price: 0, availability: 'Timeout repli' }), FALLBACK_TIMEOUT_MS)
    );
    const searchPromise = scraperFn(
      supplier.id,
      ref,
      supplier.b2bLogin,
      supplier.b2bPassword,
      supplier.b2bUrl || null
    );
    return await Promise.race([searchPromise, timeoutPromise]);
  } catch {
    return { items: [], available: false, price: 0, availability: 'Erreur repli' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Moteur principal — point d'entrée public
// ─────────────────────────────────────────────────────────────────────────────

export async function runFallbackSearch(
  originalQuery: string,
  suppliers: any[],
  alreadyTriedRefs: string[],
  firstPassResults: any[],
  scraperFnMap: Map<string, (supplierId: string, query: string, login: string, password: string, url?: string | null) => Promise<any>>
): Promise<FallbackResult> {
  const startTime = Date.now();
  const logs: FallbackLog[] = [];
  const allFoundItems: any[] = [];
  const foundAtSuppliers = new Set<string>();
  let stepCounter = 0;
  let totalAttempts = 0;

  const triedRefs = new Set<string>(alreadyTriedRefs.map(r => normalizeRef(r)));

  const successfulResults = firstPassResults.filter(r =>
    r.items?.length > 0 && (r.available || r.items.some((i: any) => i.available || i.price > 0))
  );

  const failedSupplierIds = getFailedSupplierIds(firstPassResults);
  const failedSuppliers = suppliers.filter(s =>
    failedSupplierIds.has(s.id) || failedSupplierIds.has(s.name)
  );

  if (failedSuppliers.length === 0) {
    return {
      success: false, originalQuery, finalRef: originalQuery, foundAt: [], items: [],
      logs: [], totalAttemptsCount: 0, totalSuppliersContacted: 0, durationMs: 0,
    };
  }

  const tryRef = async (ref: string, supplier: any, method: FallbackMethod, detail: string): Promise<boolean> => {
    const refNorm = normalizeRef(ref);
    if (triedRefs.has(refNorm)) return false;
    triedRefs.add(refNorm);
    totalAttempts++;

    const scraperKey = (supplier.name || '').toUpperCase();
    const scraperFn = scraperFnMap.get(scraperKey) || scraperFnMap.get('DEFAULT');
    if (!scraperFn) {
      logs.push(makeLog(++stepCounter, method, ref, supplier.name, 'NOT_FOUND', 0, `Pas de scraper configuré pour ${supplier.name}`));
      return false;
    }

    const result = await callSupplierScraper(supplier, ref, scraperFn);
    const foundItems = (result.items || []).map((it: any) => ({
      ...it,
      supplierName: supplier.name,
      supplierId: supplier.id,
      fallbackMethod: method,
      fallbackRef: ref,
      originalQuery,
      matchType: 'FALLBACK',
    }));

    const itemsWithStock = foundItems.filter((i: any) => i.price > 0 || i.available || i.rawStock > 0);
    const found = itemsWithStock.length > 0;

    logs.push(makeLog(
      ++stepCounter, method, ref, supplier.name,
      found ? 'FOUND' : (foundItems.length > 0 ? 'PARTIAL' : 'NOT_FOUND'),
      foundItems.length, detail
    ));

    if (found) {
      allFoundItems.push(...foundItems);
      foundAtSuppliers.add(supplier.name);
    }

    return found;
  };

  // ─── ÉTAPE 1 : REF_CLEANING ───────────────────────────────────────────────
  {
    const variants = generateRefVariants(originalQuery).filter(v => !triedRefs.has(normalizeRef(v)));
    console.log(`[Fallback:REF_CLEANING] ${variants.length} variantes pour "${originalQuery}" sur ${failedSuppliers.length} fournisseurs`);

    for (const variant of variants) {
      let anyFound = false;
      for (const supplier of failedSuppliers) {
        const found = await tryRef(variant, supplier, 'REF_CLEANING', `Variante nettoyée "${originalQuery}" → "${variant}"`);
        if (found) { anyFound = true; break; }
      }
      if (anyFound) break; // Une variante suffit pour passer à l'étape suivante
    }
  }

  // ─── ÉTAPE 2 : OEM_EQUIVALENT ────────────────────────────────────────────
  {
    const equivalents = getEquivalentsForRef(originalQuery);
    const oemRefs = equivalents.map(e => e.reference).filter(r => !triedRefs.has(normalizeRef(r))).slice(0, MAX_OEM_REFS);
    console.log(`[Fallback:OEM_EQUIVALENT] ${oemRefs.length} équivalences OEM pour "${originalQuery}"`);

    for (const oemRef of oemRefs) {
      const eqEntry = equivalents.find(e => e.reference === oemRef);
      for (const supplier of failedSuppliers) {
        await tryRef(oemRef, supplier, 'OEM_EQUIVALENT', `Équivalence OE → "${oemRef}" (${eqEntry?.brand || '?'} - ${eqEntry?.type || '?'})`);
      }
    }
  }

  // ─── ÉTAPE 3 : CDG_ANALYSIS ──────────────────────────────────────────────
  if (successfulResults.length > 0) {
    const cdgRefs = extractRefsFromSuccessfulResults(successfulResults).filter(r => !triedRefs.has(normalizeRef(r)));
    const sourceNames = successfulResults.map(r => r.supplierName).filter(Boolean).join(', ');
    console.log(`[Fallback:CDG_ANALYSIS] ${cdgRefs.length} refs extraites de [${sourceNames}]`);

    for (const cdgRef of cdgRefs) {
      for (const supplier of failedSuppliers) {
        await tryRef(cdgRef, supplier, 'CDG_ANALYSIS', `Ref "${cdgRef}" extraite depuis [${sourceNames}] — cross-test sur fournisseur en échec`);
      }
    }
  }

  // ─── ÉTAPE 4 : BRAND_VARIANT ─────────────────────────────────────────────
  {
    const prefixes = getTunisianBrandPrefixes();
    const alnum = originalQuery.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const hasKnownPrefix = prefixes.some(({ prefix }) => alnum.startsWith(prefix));
    const brandVariants: { ref: string; brand: string }[] = [];

    if (!hasKnownPrefix) {
      for (const { prefix, brand } of prefixes.slice(0, 6)) {
        const v = `${prefix}${alnum}`;
        if (!triedRefs.has(normalizeRef(v))) brandVariants.push({ ref: v, brand });
      }
    } else {
      for (const { prefix, brand } of prefixes) {
        if (alnum.startsWith(prefix) && alnum.length > prefix.length + 3) {
          const stripped = alnum.slice(prefix.length);
          if (!triedRefs.has(normalizeRef(stripped))) brandVariants.push({ ref: stripped, brand: `ORIGINE (sans ${brand})` });
        }
      }
    }

    console.log(`[Fallback:BRAND_VARIANT] ${brandVariants.length} variantes marque aftermarket`);
    for (const { ref, brand } of brandVariants) {
      for (const supplier of failedSuppliers) {
        await tryRef(ref, supplier, 'BRAND_VARIANT', `Variante marque "${brand}" → "${ref}"`);
      }
    }
  }

  // ─── ÉTAPE 5 : DICTIONARY_EXPAND ─────────────────────────────────────────
  {
    const dictEntries = searchDictionaryAndEquivalents(originalQuery);
    const allEqRefs: { ref: string; brand: string; category: string }[] = [];
    for (const entry of dictEntries.slice(0, 5)) {
      for (const eq of (entry.equivalents || []).slice(0, 4)) {
        if (eq.reference && !triedRefs.has(normalizeRef(eq.reference))) {
          allEqRefs.push({ ref: eq.reference, brand: eq.brand, category: entry.category });
        }
      }
    }

    console.log(`[Fallback:DICTIONARY_EXPAND] ${allEqRefs.length} refs dictionnaire étendu`);
    for (const { ref, brand, category } of allEqRefs) {
      for (const supplier of failedSuppliers) {
        await tryRef(ref, supplier, 'DICTIONARY_EXPAND', `Dictionnaire étendu (${category}) → "${ref}" (${brand})`);
      }
    }
  }

  // ─── Résultat final ───────────────────────────────────────────────────────
  const success = allFoundItems.length > 0;
  const bestItem = allFoundItems.find(i => i.available && i.price > 0)
    || allFoundItems.find(i => i.price > 0)
    || allFoundItems[0];
  const finalRef = bestItem?.reference || bestItem?.name || originalQuery;
  const durationMs = Date.now() - startTime;

  console.log(
    `[Fallback] ✅ ${durationMs}ms | ${totalAttempts} tentatives | ${success
      ? `SUCCÈS — ${allFoundItems.length} articles chez [${Array.from(foundAtSuppliers).join(', ')}]`
      : 'AUCUN RÉSULTAT'}`
  );

  return {
    success, originalQuery, finalRef,
    foundAt: Array.from(foundAtSuppliers),
    items: allFoundItems,
    logs, totalAttemptsCount: totalAttempts,
    totalSuppliersContacted: failedSuppliers.length,
    durationMs,
  };
}

/**
 * Génère un résumé textuel lisible du journal de repli pour le front-end.
 */
export function formatFallbackSummary(result: FallbackResult): string {
  if (!result.logs.length) return '';
  const successLogs = result.logs.filter(l => l.outcome === 'FOUND');
  const methods = [...new Set(result.logs.map(l => l.method))].join(', ');

  if (result.success && successLogs.length > 0) {
    const first = successLogs[0];
    return `✅ [REPLI ${first.method}] Référence "${first.triedRef}" trouvée chez ${first.supplierName} (${first.itemsFound} article(s)). Méthodes testées: ${methods}. Tentatives: ${result.totalAttemptsCount} en ${result.durationMs}ms.`;
  }
  return `🔍 [REPLI] Aucun résultat après ${result.totalAttemptsCount} tentatives. Méthodes: ${methods}. Durée: ${result.durationMs}ms.`;
}
