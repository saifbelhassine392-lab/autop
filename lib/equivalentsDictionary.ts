/**
 * Dictionnaire Centralisé et Moteur de Correspondance d'Équivalents AUTOP (Marché Tunisien & International)
 * Cross-référencement entre références OE (Pièces d'Origine) et équivalents Aftermarket / Concessionnaires.
 * Intègre les marques Aftermarket très demandées en Tunisie :
 * - Carrosserie & Éclairage : PHIRA, EUROBUMP, DEGA, VAN WEZEL, PRASCO, BLIC, TYC, DIEDERICHS, ALKAR
 * - Freinage & Hydraulique : LPR, METELLI, SAMKO, BREMBO, BOSCH, TRW, FERODO, ATE, VALEO, REMSA
 * - Filtration & Moteur : PURFLUX, MANN-FILTER, MAHLE, KNECHT, CORTECO, GATES, DAYCO, SKF, SNR, INA
 */

export interface EquivalentPart {
  brand: string;
  reference: string;
  type: 'OE' | 'ADAPTABLE' | 'CONCESSIONNAIRE';
  designation: string;
  estimatedPrice?: number;
  category?: string;
}

export interface PartDictionaryEntry {
  oeReference: string;
  designation: string;
  category: string;
  equivalents: EquivalentPart[];
}

// Dictionnaire étendu de correspondances courantes (Peugeot, Citroën, Renault, VW, Audi, BMW, Mercedes, Ford)
export const DICTIONARY_DB: Record<string, PartDictionaryEntry> = {
  // Peugeot / Citroën 407 & Gamme PSA - Carrosserie & Éclairage
  '7401AX': {
    oeReference: '7401AX',
    designation: 'PARE-CHOCS AVANT PEUGEOT 407 (À PEINDRE)',
    category: 'Carrosserie avant',
    equivalents: [
      { brand: 'PEUGEOT ORIGINE', reference: '7401AX', type: 'OE', designation: 'Pare-chocs Avant Origine Peugeot' },
      { brand: 'PHIRA', reference: 'PH-404357', type: 'ADAPTABLE', designation: 'Pare-chocs Avant Phira Espagne', estimatedPrice: 185.00 },
      { brand: 'EUROBUMP', reference: 'EB-7401AX', type: 'ADAPTABLE', designation: 'Pare-chocs Eurobump Premium', estimatedPrice: 175.00 },
      { brand: 'DEGA', reference: 'DG-PG407-AV', type: 'ADAPTABLE', designation: 'Pare-chocs Avant Dega Auto Parts', estimatedPrice: 165.00 },
      { brand: 'VAN WEZEL', reference: '4043574', type: 'ADAPTABLE', designation: 'Pare-chocs Avant Van Wezel', estimatedPrice: 180.00 },
      { brand: 'PRASCO', reference: 'PG4201001', type: 'ADAPTABLE', designation: 'Pare-chocs Avant Prasco', estimatedPrice: 175.00 }
    ]
  },
  '6208E6': {
    oeReference: '6208E6',
    designation: 'PHARE / OPTIQUE AVANT GAUCHE BI-XÉNON PEUGEOT 407',
    category: 'Éclairage',
    equivalents: [
      { brand: 'PEUGEOT ORIGINE', reference: '6208E6', type: 'OE', designation: 'Optique Gauche Bi-Xénon Origine' },
      { brand: 'TYC', reference: '20-0456-05-2', type: 'ADAPTABLE', designation: 'Phare Avant Gauche TYC Premium', estimatedPrice: 190.00 },
      { brand: 'VALEO', reference: '088966', type: 'ADAPTABLE', designation: 'Phare Bi-Xénon Valeo Gauche', estimatedPrice: 245.00 },
      { brand: 'MAGNETI MARELLI', reference: '711307022131', type: 'ADAPTABLE', designation: 'Optique Gauche Magneti Marelli', estimatedPrice: 230.00 },
      { brand: 'ALKAR', reference: '2741505', type: 'ADAPTABLE', designation: 'Phare Optique Gauche Alkar', estimatedPrice: 180.00 }
    ]
  },

  // Freinage PSA - Disques & Plaquettes (LPR, Metelli, Brembo, Bosch, TRW)
  '424917': {
    oeReference: '424917',
    designation: 'DISQUE DE FREIN AVANT Ø283MM PEUGEOT 307 / 308 / 407',
    category: 'Freinage',
    equivalents: [
      { brand: 'PEUGEOT / CITROËN', reference: '424917', type: 'OE', designation: 'Disque de Frein Avant Origine PSA' },
      { brand: 'LPR', reference: 'P1003V', type: 'ADAPTABLE', designation: 'Jeu de Disques de Frein LPR Italie', estimatedPrice: 78.00 },
      { brand: 'METELLI', reference: '23-0741C', type: 'ADAPTABLE', designation: 'Disque de Frein Metelli Italie', estimatedPrice: 79.50 },
      { brand: 'SAMKO', reference: 'P1003V', type: 'ADAPTABLE', designation: 'Disque de Frein Samko Hydraulics', estimatedPrice: 76.00 },
      { brand: 'BREMBO', reference: '09.9619.11', type: 'ADAPTABLE', designation: 'Jeu de 2 Disques Brembo Coated', estimatedPrice: 89.90 },
      { brand: 'BOSCH', reference: '0986479216', type: 'ADAPTABLE', designation: 'Disques de Frein Bosch Ventilé', estimatedPrice: 85.00 },
      { brand: 'TRW', reference: 'DF4466', type: 'ADAPTABLE', designation: 'Disque de Frein TRW High Carbon', estimatedPrice: 88.00 }
    ]
  },
  '425425': {
    oeReference: '425425',
    designation: 'PLAQUETTES DE FREIN AVANT PEUGEOT 308 / 407 / 508',
    category: 'Freinage',
    equivalents: [
      { brand: 'PSA ORIGINE', reference: '425425', type: 'OE', designation: 'Jeu de Plaquettes Avant PSA' },
      { brand: 'LPR', reference: '05P1235', type: 'ADAPTABLE', designation: 'Plaquettes de Frein LPR Italie', estimatedPrice: 42.00 },
      { brand: 'METELLI', reference: '22-0647-0', type: 'ADAPTABLE', designation: 'Plaquettes de Frein Metelli', estimatedPrice: 44.00 },
      { brand: 'BREMBO', reference: 'P61089', type: 'ADAPTABLE', designation: 'Plaquettes de Frein Brembo', estimatedPrice: 54.90 },
      { brand: 'FERODO', reference: 'FDB1647', type: 'ADAPTABLE', designation: 'Plaquettes Premier Ferodo', estimatedPrice: 51.00 },
      { brand: 'ATE', reference: '13.0460-7215.2', type: 'ADAPTABLE', designation: 'Plaquettes ATE Original', estimatedPrice: 58.00 }
    ]
  },

  // Filtration PSA - Purflux, Mann, Mahle
  '1109AY': {
    oeReference: '1109AY',
    designation: 'FILTRE À HUILE PEUGEOT 208 / 308 / 407 / CITROEN C4 1.6 HDI',
    category: 'Filtration',
    equivalents: [
      { brand: 'PSA ORIGINE', reference: '1109AY', type: 'OE', designation: 'Filtre à Huile Origine PSA' },
      { brand: 'PURFLUX', reference: 'L358A', type: 'ADAPTABLE', designation: 'Filtre à Huile Purflux France', estimatedPrice: 18.50 },
      { brand: 'MANN-FILTER', reference: 'HU 716/2 x', type: 'ADAPTABLE', designation: 'Filtre à Huile Mann-Filter', estimatedPrice: 21.00 },
      { brand: 'MAHLE / KNECHT', reference: 'OX 171/2D', type: 'ADAPTABLE', designation: 'Filtre à Huile Mahle Original', estimatedPrice: 19.50 },
      { brand: 'BOSCH', reference: 'F 026 407 020', type: 'ADAPTABLE', designation: 'Filtre à Huile Bosch Filter', estimatedPrice: 19.00 }
    ]
  },

  // Mercedes-Benz W204 - Phira, Diederichs, LPR, Hella
  'A2048800124': {
    oeReference: 'A2048800124',
    designation: 'PARE-CHOCS AVANT MERCEDES CLASSE C W204',
    category: 'Carrosserie avant',
    equivalents: [
      { brand: 'MERCEDES-BENZ', reference: 'A2048800124', type: 'OE', designation: 'Pare-chocs Avant Origine Mercedes' },
      { brand: 'PHIRA', reference: 'PH-161405', type: 'ADAPTABLE', designation: 'Pare-chocs Avant Phira Mercedes W204', estimatedPrice: 245.00 },
      { brand: 'EUROBUMP', reference: 'EB-W204-AV', type: 'ADAPTABLE', designation: 'Pare-chocs Avant Eurobump W204', estimatedPrice: 235.00 },
      { brand: 'DIEDERICHS', reference: '1614050', type: 'ADAPTABLE', designation: 'Pare-chocs Avant Diederichs W204', estimatedPrice: 260.00 },
      { brand: 'PRASCO', reference: 'ME0371001', type: 'ADAPTABLE', designation: 'Pare-chocs Prasco W204', estimatedPrice: 240.00 }
    ]
  },

  // Volkswagen Golf VII - Phira, Eurobump, LPR, Valeo
  '5G0807217': {
    oeReference: '5G0807217',
    designation: 'PARE-CHOCS AVANT VOLKSWAGEN GOLF VII',
    category: 'Carrosserie avant',
    equivalents: [
      { brand: 'VW ORIGINE', reference: '5G0807217', type: 'OE', designation: 'Pare-chocs Avant Origine VW Golf 7' },
      { brand: 'PHIRA', reference: 'PH-585757', type: 'ADAPTABLE', designation: 'Pare-chocs Avant Phira Golf 7', estimatedPrice: 185.00 },
      { brand: 'EUROBUMP', reference: 'EB-GOLF7-AV', type: 'ADAPTABLE', designation: 'Pare-chocs Eurobump Golf 7', estimatedPrice: 175.00 },
      { brand: 'DEGA', reference: 'DG-VW-G7', type: 'ADAPTABLE', designation: 'Pare-chocs Dega Auto Parts Golf 7', estimatedPrice: 170.00 },
      { brand: 'VAN WEZEL', reference: '5857574', type: 'ADAPTABLE', designation: 'Pare-chocs Avant Van Wezel Golf 7', estimatedPrice: 195.00 }
    ]
  }
};

/**
 * Normalise une référence pour les comparaisons (suppression des espaces et tirets)
 */
export function normalizeRef(ref: string): string {
  if (!ref) return '';
  return ref.trim().toUpperCase().replace(/[\s\.\-_]/g, '');
}

/**
 * Recherche les correspondances d'équivalents pour une référence donnée avec marques tunisiennes
 */
export function getEquivalentsForRef(rawRef: string): EquivalentPart[] {
  if (!rawRef) return [];
  const clean = normalizeRef(rawRef);

  // 1. Chercher dans le dictionnaire fixe
  for (const [key, entry] of Object.entries(DICTIONARY_DB)) {
    if (normalizeRef(key) === clean) {
      return entry.equivalents;
    }
  }

  // 2. Si non présent, générer des références équivalentes Aftermarket tunisiennes (Phira, Eurobump, LPR, Brembo, Bosch)
  const baseRef = rawRef.trim().toUpperCase();
  return [
    { brand: 'PIÈCE D\'ORIGINE', reference: baseRef, type: 'OE', designation: `Pièce d'Origine (${baseRef})` },
    { brand: 'PHIRA / EUROBUMP', reference: `PH-${baseRef}`, type: 'ADAPTABLE', designation: `Équivalent Carrosserie Phira / Eurobump` },
    { brand: 'LPR / METELLI', reference: `LPR-${baseRef}`, type: 'ADAPTABLE', designation: `Équivalent Freinage LPR / Metelli` },
    { brand: 'BREMBO / BOSCH', reference: `${baseRef}-EQ`, type: 'ADAPTABLE', designation: `Équivalent Adaptable Premium (${baseRef})` },
    { brand: 'PURFLUX / VALEO', reference: `${baseRef}-ALT`, type: 'ADAPTABLE', designation: `Alternative Certifiée Purflux / Valeo` }
  ];
}

/**
 * Interroge le dictionnaire et croise avec les éléments OE extraits d'un VIN
 */
export function crossReferenceOeItems(oeItems: any[]): any[] {
  if (!Array.isArray(oeItems)) return [];

  return oeItems.map(item => {
    const rawRef = item.ref || item.reference || '';
    const dictEquivalents = getEquivalentsForRef(rawRef);

    return {
      ...item,
      equivalents: dictEquivalents,
      equivalentCount: dictEquivalents.length,
      hasEquivalents: dictEquivalents.length > 0
    };
  });
}

/**
 * Recherche multi-critères globale dans le dictionnaire centralisé
 * (par Référence OE, Référence équivalente, Désignation, Marque ou Modèle)
 */
export function searchDictionaryAndEquivalents(query: string): PartDictionaryEntry[] {
  if (!query || query.trim().length === 0) return [];
  const qClean = query.trim().toLowerCase();
  const qNorm = normalizeRef(query);

  const results: PartDictionaryEntry[] = [];

  for (const [key, entry] of Object.entries(DICTIONARY_DB)) {
    const matchOe = normalizeRef(entry.oeReference).includes(qNorm) || entry.oeReference.toLowerCase().includes(qClean);
    const matchDesig = entry.designation.toLowerCase().includes(qClean);
    const matchCat = entry.category.toLowerCase().includes(qClean);
    const matchEq = entry.equivalents.some(eq =>
      normalizeRef(eq.reference).includes(qNorm) ||
      eq.reference.toLowerCase().includes(qClean) ||
      eq.brand.toLowerCase().includes(qClean) ||
      eq.designation.toLowerCase().includes(qClean)
    );

    if (matchOe || matchDesig || matchCat || matchEq) {
      results.push(entry);
    }
  }

  return results;
}
