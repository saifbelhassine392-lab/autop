/**
 * AUTOP - Moteur d'extraction et de parsing des devis fournisseurs par Email
 */

export interface ParsedQuoteItem {
  reference: string;
  designation: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalHT: number;
  availability?: string;
}

export interface ParsedEmailQuote {
  supplierName: string;
  quoteNumber?: string;
  date?: string;
  rawText: string;
  items: ParsedQuoteItem[];
  totalHT?: number;
}

/**
 * Nettoie une chaîne de prix tunisienne (ex: "8,740 DT", "15.469 TND", "1 250,500")
 */
export function parseTunisianPrice(val: string): number {
  if (!val) return 0;
  const clean = val
    .replace(/[^\d.,]/g, "")
    .replace(/\s+/g, "");
  
  if (!clean) return 0;

  // Si format avec virgule (ex: 8,740)
  if (clean.includes(",") && !clean.includes(".")) {
    return parseFloat(clean.replace(",", ".")) || 0;
  }
  
  // Si format avec point et virgule (ex: 1.250,500 ou 1,250.500)
  if (clean.includes(",") && clean.includes(".")) {
    if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
      return parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0;
    } else {
      return parseFloat(clean.replace(/,/g, "")) || 0;
    }
  }

  return parseFloat(clean) || 0;
}

/**
 * Détecte le fournisseur à partir du texte de l'email
 */
export function detectSupplierFromEmail(text: string): string {
  const upper = text.toUpperCase();
  if (upper.includes("FAD") || upper.includes("FADPRO")) return "FAD";
  if (upper.includes("SOCOFA") || upper.includes("SOCOFAGROS")) return "SOCOFA GROS";
  if (upper.includes("STEQ") || upper.includes("STE DE L'EQUIPEMENT")) return "STEQ";
  if (upper.includes("PROPARTS")) return "PROPARTS";
  if (upper.includes("ROUTE X") || upper.includes("PARX") || upper.includes("MOSAIQUE")) return "STE ROUTE X";
  if (upper.includes("CDG") || upper.includes("COMPTOIR DE GROS")) return "CDG";
  if (upper.includes("SAGAP")) return "SAGAP";
  if (upper.includes("AAP") || upper.includes("AFRICA AUTO")) return "AFRICA AUTO PARTS";
  if (upper.includes("ALPHA FORD") || upper.includes("FORD")) return "ALPHA FORD";
  if (upper.includes("ITALCAR") || upper.includes("FIAT")) return "ITALCAR";
  if (upper.includes("GPG")) return "GPG";
  if (upper.includes("SOPIC")) return "SOPIC";
  if (upper.includes("CAR GROS") || upper.includes("CARGROS") || upper.includes("ENNAKL")) return "CAR GROS";
  if (upper.includes("UNIVERS AUTO") || upper.includes("UAG")) return "UNIVERS AUTO";
  return "Fournisseur Email";
}

/**
 * Analyse le corps d'un email de devis ou un tableau texte
 */
export function parseEmailQuoteText(rawText: string, defaultSupplier?: string): ParsedEmailQuote {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const supplierName = defaultSupplier || detectSupplierFromEmail(rawText);

  // Recherche d'un numéro de devis
  const quoteMatch = rawText.match(/(?:devis|offre|facture|cotation|commande|n°|ref)\s*[:#\s]*([A-Za-z0-9\-_/]{4,20})/i);
  const quoteNumber = quoteMatch ? quoteMatch[1] : undefined;

  // Recherche d'une date
  const dateMatch = rawText.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
  const date = dateMatch ? dateMatch[1] : undefined;

  const items: ParsedQuoteItem[] = [];

  for (const line of lines) {
    // Ignorer les en-têtes ou lignes de salutation
    const lower = line.toLowerCase();
    if (
      lower.startsWith("bonjour") ||
      lower.startsWith("cordialement") ||
      lower.startsWith("merci") ||
      lower.startsWith("objet") ||
      lower.startsWith("de :") ||
      lower.startsWith("à :") ||
      lower.startsWith("total") ||
      lower.startsWith("tva") ||
      lower.startsWith("remise globale")
    ) {
      continue;
    }

    // Séparateurs possibles : Tabulations, Points-virgules, Multi-espaces, Pipes '|'
    let parts: string[] = [];
    if (line.includes("\t")) {
      parts = line.split("\t").map(p => p.trim()).filter(Boolean);
    } else if (line.includes(";")) {
      parts = line.split(";").map(p => p.trim()).filter(Boolean);
    } else if (line.includes("|")) {
      parts = line.split("|").map(p => p.trim()).filter(Boolean);
    } else {
      // Espaces multiples
      parts = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
    }

    // Cas 1 : Ligne tabulaire structurée (au moins 2 colonnes)
    if (parts.length >= 2) {
      let ref = "";
      let desig = "";
      let brand = "";
      let qty = 1;
      let price = 0;
      let discount = 0;

      // Détecter quelle colonne est la référence
      const refIdx = parts.findIndex(p => /^[A-Za-z0-9\-_.\/]{3,20}$/.test(p) && !p.toLowerCase().includes("dt") && !p.toLowerCase().includes("tnd"));
      if (refIdx !== -1) {
        ref = parts[refIdx].toUpperCase();
        
        // Les prix sont souvent dans les dernières colonnes
        const priceMatches = parts.map(p => parseTunisianPrice(p)).filter(p => p > 0);
        if (priceMatches.length > 0) {
          price = priceMatches[0];
        }

        // Quantité
        const qtyMatch = parts.find(p => /^\d{1,4}$/.test(p) && parseInt(p, 10) > 0 && parseInt(p, 10) < 500 && p !== ref);
        if (qtyMatch) {
          qty = parseInt(qtyMatch, 10);
        }

        // Remise
        const remiseMatch = parts.find(p => p.includes("%") || (/^\d{1,2}(?:[.,]\d+)?$/.test(p) && parseFloat(p) <= 60 && parseFloat(p) !== price));
        if (remiseMatch) {
          discount = parseTunisianPrice(remiseMatch);
        }

        // Désignation
        const desigPart = parts.find((p, i) => i !== refIdx && !priceMatches.includes(parseTunisianPrice(p)) && p.length > 3);
        if (desigPart) {
          desig = desigPart;
        } else {
          desig = `Article ${ref}`;
        }

        // Marque connue
        const brandMatch = parts.find(p => ["VALEO", "BOSCH", "GATES", "VERNET", "FEBI", "TRICLO", "CANSU", "SASIC", "DAYCO", "SKF", "ORIGINE", "VAICO", "FARE", "EKIM"].includes(p.toUpperCase()));
        if (brandMatch) brand = brandMatch.toUpperCase();

        if (ref && (price > 0 || desig)) {
          items.push({
            reference: ref,
            designation: desig,
            brand: brand || supplierName,
            quantity: qty,
            unitPrice: price,
            discount,
            totalHT: (price * qty) * (1 - discount / 100),
            availability: "Devis Email Reçu"
          });
          continue;
        }
      }
    }

    // Cas 2 : Ligne texte libre (ex: "1306J5 - Bouchon de radiateur - 8.740 DT x 2")
    const refMatchFree = line.match(/\b([A-Z0-9]{3,15}(?:[.\-_][A-Z0-9]{1,10})*)\b/i);
    const priceMatchFree = line.match(/(\d+[.,]\d{2,3})\s*(?:DT|TND|€|\$|HT)?/i);

    if (refMatchFree && priceMatchFree) {
      const candidateRef = refMatchFree[1].toUpperCase();
      const candidatePrice = parseTunisianPrice(priceMatchFree[1]);

      if (candidatePrice > 0 && candidateRef.length >= 3 && !/^(TEL|FAX|MAIL|DEVIS|AUTOP|PRIX|TOTAL|PAGE|DATE)$/i.test(candidateRef)) {
        let desig = line
          .replace(refMatchFree[0], "")
          .replace(priceMatchFree[0], "")
          .replace(/[-–—:|xX*]/g, " ")
          .trim();

        items.push({
          reference: candidateRef,
          designation: desig || `Article ${candidateRef}`,
          brand: supplierName,
          quantity: 1,
          unitPrice: candidatePrice,
          discount: 0,
          totalHT: candidatePrice,
          availability: "Devis Email Reçu"
        });
      }
    }
  }

  const totalHT = items.reduce((acc, it) => acc + it.totalHT, 0);

  return {
    supplierName,
    quoteNumber,
    date,
    rawText,
    items,
    totalHT: Math.round(totalHT * 1000) / 1000
  };
}
