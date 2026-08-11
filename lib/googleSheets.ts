/**
 * AUTOP - Connecteur et importateur Google Sheets pour stock et prix
 */

import { parseTunisianPrice } from './emailQuoteParser';

export interface SheetRowItem {
  reference: string;
  designation?: string;
  brand?: string;
  supplierName?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  discount?: number;
  stock?: number;
}

export interface ParsedSheetResult {
  sheetTitle?: string;
  headers: string[];
  totalRows: number;
  items: SheetRowItem[];
  errors: string[];
}

/**
 * Convertit une URL Google Sheets en URL d'export CSV directe
 */
export function getGoogleSheetCsvUrl(url: string): string {
  const cleanUrl = url.trim();

  // Si c'est déjà un export CSV
  if (cleanUrl.includes("export?format=csv") || cleanUrl.endsWith(".csv")) {
    return cleanUrl;
  }

  // Extraire l'ID du Google Sheet : /spreadsheets/d/{SHEET_ID}/...
  const idMatch = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    throw new Error("Format d'URL Google Sheets invalide. Exemple: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit");
  }

  const sheetId = idMatch[1];
  // Extraire le gid (identifiant de la feuille) si présent
  const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : "0";

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

/**
 * Parse une chaîne CSV en lignes et colonnes
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let inQuotes = false;
    let currentCell = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === ';') && !inQuotes) {
        row.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    rows.push(row);
  }

  return rows;
}

/**
 * Télécharge et analyse un Google Sheet
 */
export async function fetchAndParseGoogleSheet(sheetUrl: string, defaultSupplier: string = "Google Sheets"): Promise<ParsedSheetResult> {
  const csvUrl = getGoogleSheetCsvUrl(sheetUrl);

  const res = await fetch(csvUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AUTOP/1.0"
    }
  });

  if (!res.ok) {
    if (res.status === 404 || res.status === 403 || res.status === 401) {
      throw new Error("Impossible d'accéder au Google Sheet. Assurez-vous que le document est partagé avec 'Toute personne disposant du lien' en lecture.");
    }
    throw new Error(`Erreur téléchargement Google Sheet: HTTP ${res.status}`);
  }

  const csvText = await res.text();
  const rawRows = parseCSV(csvText);

  if (rawRows.length === 0) {
    return { headers: [], totalRows: 0, items: [], errors: ["La feuille de calcul est vide."] };
  }

  // Première ligne = En-têtes
  const headers = rawRows[0].map(h => h.toLowerCase().trim());
  const dataRows = rawRows.slice(1);

  // Détection des indices des colonnes
  const colRef = headers.findIndex(h => h.includes("ref") || h.includes("code") || h.includes("article") || h.includes("sku") || h.includes("num"));
  const colDesig = headers.findIndex(h => h.includes("desig") || h.includes("nom") || h.includes("libelle") || h.includes("description") || h.includes("titre"));
  const colBrand = headers.findIndex(h => h.includes("marq") || h.includes("brand") || h.includes("fabricant"));
  const colSupplier = headers.findIndex(h => h.includes("fourn") || h.includes("supplier") || h.includes("distributeur"));
  const colCost = headers.findIndex(h => h.includes("achat") || h.includes("cout") || h.includes("cost") || h.includes("prix achat") || h.includes("pu ht"));
  const colPrice = headers.findIndex(h => h.includes("vente") || h.includes("pv") || h.includes("prix vente") || (h.includes("prix") && !h.includes("achat")));
  const colStock = headers.findIndex(h => h.includes("stock") || h.includes("qte") || h.includes("quantite") || h.includes("dispo"));
  const colDiscount = headers.findIndex(h => h.includes("remise") || h.includes("discount"));

  const items: SheetRowItem[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, idx) => {
    // Si la ligne est vide
    if (!row.some(cell => cell.trim().length > 0)) return;

    const rawRef = colRef !== -1 && row[colRef] ? row[colRef] : row[0];
    const cleanRef = String(rawRef || "").trim().toUpperCase().replace(/[\s\-_.\/]+/g, "");

    if (!cleanRef || cleanRef.length < 2) {
      return;
    }

    const designation = colDesig !== -1 && row[colDesig] ? row[colDesig].trim() : `Article ${cleanRef}`;
    const brand = colBrand !== -1 && row[colBrand] ? row[colBrand].trim().toUpperCase() : "ADAPTABLE";
    const supplierName = colSupplier !== -1 && row[colSupplier] ? row[colSupplier].trim() : defaultSupplier;
    const purchasePrice = colCost !== -1 && row[colCost] ? parseTunisianPrice(row[colCost]) : 0;
    const sellingPrice = colPrice !== -1 && row[colPrice] ? parseTunisianPrice(row[colPrice]) : (purchasePrice ? purchasePrice * 1.25 : 0);
    const stock = colStock !== -1 && row[colStock] ? parseInt(row[colStock].replace(/[^\d]/g, ""), 10) || 0 : 0;
    const discount = colDiscount !== -1 && row[colDiscount] ? parseTunisianPrice(row[colDiscount]) : 0;

    items.push({
      reference: cleanRef,
      designation,
      brand,
      supplierName,
      purchasePrice,
      sellingPrice,
      discount,
      stock
    });
  });

  return {
    headers: rawRows[0],
    totalRows: items.length,
    items,
    errors
  };
}
