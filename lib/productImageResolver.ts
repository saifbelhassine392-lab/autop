import fs from 'fs';
import path from 'path';

/**
 * Normalise une chaîne pour la recherche par mots clés
 */
function cleanText(txt: string): string {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * 1. Recherche d'image par RÉFÉRENCE EXACTE / NORMALISÉE
 */
export function resolveImageByReference(reference?: string | null, sku?: string | null): string | null {
  const refsToTest: string[] = [];
  if (reference) {
    refsToTest.push(reference.trim());
    refsToTest.push(reference.trim().toUpperCase());
    refsToTest.push(reference.trim().replace(/[\s\-_.]/g, '').toUpperCase());
  }
  if (sku) {
    refsToTest.push(sku.trim());
    refsToTest.push(sku.trim().toUpperCase());
    refsToTest.push(sku.trim().replace(/[\s\-_.]/g, '').toUpperCase());
  }

  const exts = ['.jpg', '.png', '.jpeg', '.webp', '.jfif', '.JPG', '.PNG'];

  for (const ref of refsToTest) {
    if (!ref) continue;
    for (const ext of exts) {
      const relPath = `/images/articles/${ref}${ext}`;
      const absPath = path.join(process.cwd(), 'public', 'images', 'articles', `${ref}${ext}`);
      try {
        if (fs.existsSync(absPath)) {
          return relPath;
        }
      } catch {}
    }
  }

  return null;
}

/**
 * 2. Recherche d'image par DÉSIGNATION (FALLBACK)
 */
export function resolveImageByDesignation(name?: string | null, category?: string | null): string {
  const text = cleanText(`${name || ''} ${category || ''}`);

  // Plaquettes de frein
  if (text.includes('plaquette') || text.includes('patin') || (text.includes('frein') && !text.includes('disque'))) {
    return '/images/categories/plaquettes-frein.jpg';
  }

  // Disques de frein
  if (text.includes('disque') || text.includes('rotor')) {
    return '/images/categories/disque-frein.jpg';
  }

  // Filtre à air
  if (text.includes('filtre') && (text.includes('air') || text.includes('admission'))) {
    return '/images/categories/filtre-air.jpg';
  }

  // Filtre à huile
  if (text.includes('filtre') && (text.includes('huile') || text.includes('oil'))) {
    return '/images/categories/filtre-huile.jpg';
  }

  // Filtre à carburant / gasoil
  if (text.includes('filtre') && (text.includes('gasoil') || text.includes('gazole') || text.includes('carburant') || text.includes('essence') || text.includes('diesel'))) {
    return '/images/categories/filtre-air.jpg'; // or specific
  }

  // Filtre habitacle
  if (text.includes('filtre') && (text.includes('habitacle') || text.includes('pollen') || text.includes('clim'))) {
    return '/images/categories/filtre-air.jpg';
  }

  // Filtre générique
  if (text.includes('filtre') || text.includes('filtration')) {
    return '/images/categories/filtre-air.jpg';
  }

  // Kit d'embrayage
  if (text.includes('embrayage') || text.includes('clutch') || text.includes('butee d embrayage') || text.includes('volant moteur')) {
    return '/images/categories/kit-embrayage.jpg';
  }

  // Triangle / Bras de suspension
  if (text.includes('triangle') || text.includes('bras de suspension') || text.includes('bras suspension') || text.includes('bras oscillant') || text.includes('wishbone')) {
    return '/images/categories/triangle-suspension.jpg';
  }

  // Biellette de suspension / barre stabilisatrice
  if (text.includes('biellette') || text.includes('bielle de suspension') || text.includes('bielle suspension') || text.includes('bielle de susp') || text.includes('stabilisatrice')) {
    return '/images/categories/biellette-suspension.jpg';
  }

  // Rotule de direction ou suspension
  if (text.includes('rotule') || text.includes('direction') || text.includes('embout de biellette') || text.includes('axial')) {
    return '/images/categories/rotule-direction.jpg';
  }

  // Amortisseurs / Suspension
  if (text.includes('amortisseur') || text.includes('jambe') || text.includes('ressort') || text.includes('coupelle') || text.includes('strut')) {
    return '/images/categories/amortisseur.jpg';
  }

  // Kit de distribution / Courroie
  if (text.includes('distribution') || text.includes('courroie') || text.includes('galet') || text.includes('tendeur') || text.includes('pompe a eau')) {
    return '/images/categories/kit-distribution.jpg';
  }

  // Par défaut : Pièce mécanique de qualité
  return '/images/categories/piece-auto-generique.jpg';
}

/**
 * Résolveur complet : 1. Référence -> 2. Désignation Fallback
 */
export function resolveProductImage(product: {
  reference?: string | null;
  sku?: string | null;
  name?: string | null;
  images?: string | string[] | null;
  category?: { name?: string } | null;
}): string {
  // A. Si une image spécifique est déjà explicitement renseignée et valide
  if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
    return product.images[0];
  }
  if (typeof product.images === 'string' && product.images.trim() && product.images !== '[]') {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) return parsed[0];
      if (typeof parsed === 'string' && parsed.trim()) return parsed;
    } catch {
      if (product.images.startsWith('http') || product.images.startsWith('/')) {
        return product.images;
      }
    }
  }

  // 1. Recherche par Référence
  const refImage = resolveImageByReference(product.reference, product.sku);
  if (refImage) return refImage;

  // 2. Recherche par Désignation (Fallback)
  return resolveImageByDesignation(product.name, product.category?.name);
}
