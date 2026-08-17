import fs from 'fs';
import path from 'path';

/**
 * 1. Recherche d'image par RÉFÉRENCE EXACTE / NORMALISÉE
 */
export function resolveImageByExactReference(reference?: string | null, sku?: string | null): string | null {
  const refsToTest: string[] = [];
  if (reference) {
    const r = reference.trim();
    refsToTest.push(r);
    refsToTest.push(r.toUpperCase());
    refsToTest.push(r.replace(/[\s\-_.]/g, '').toUpperCase());
  }
  if (sku) {
    const s = sku.trim();
    refsToTest.push(s);
    refsToTest.push(s.toUpperCase());
    refsToTest.push(s.replace(/[\s\-_.]/g, '').toUpperCase());
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

function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * 2. Recherche d'image par DÉSIGNATION PRÉCISE & COMPLÈTE
 */
export function resolveImageByDesignation(name?: string | null): string {
  if (!name) return '/images/categories/piece-auto-generique.jpg';
  const n = normalizeText(name);

  // 1. Plaquettes de frein & Garnitures
  if (n.includes('plaquette') || n.includes('patin') || n.includes('garniture') || (n.includes('frein') && !n.includes('disque'))) {
    return '/images/categories/plaquettes-frein.jpg';
  }

  // 2. Disque de frein & Tambour
  if (n.includes('disque') || n.includes('rotor') || n.includes('tambour')) {
    return '/images/categories/disque-frein.jpg';
  }

  // 3. Filtres à huile
  if (n.includes('filtre') && (n.includes('huile') || n.includes('oil'))) {
    return '/images/categories/filtre-huile.jpg';
  }

  // 4. Autres filtres (Air, Carburant, Essence, Pollen, Habitacle, Gazole)
  if (n.includes('filtre') || n.includes('cartouche') || n.includes('carburant') || n.includes('essence') || n.includes('pollen') || n.includes('habitacle') || n.includes('gazole') || n.includes('gasoil')) {
    return '/images/categories/filtre-air.jpg';
  }

  // 5. Kit Embrayage & Butée
  if (n.includes('embrayage') || n.includes('clutch') || n.includes('butee') || n.includes('volant moteur')) {
    return '/images/categories/kit-embrayage.jpg';
  }

  // 6. Biellette de suspension & Barre stabilisatrice
  if (n.includes('biellette') || (n.includes('bielle') && (n.includes('suspension') || n.includes('stab')))) {
    return '/images/categories/biellette-suspension.jpg';
  }

  // 7. Rotule de direction & Crémaillère
  if (n.includes('rotule') || n.includes('direction') || n.includes('cremaillere')) {
    return '/images/categories/rotule-direction.jpg';
  }

  // 8. Triangle & Bras de suspension
  if (n.includes('triangle') || n.includes('bras') || n.includes('silentbloc') || n.includes('silent bloc')) {
    return '/images/categories/triangle-suspension.jpg';
  }

  // 9. Amortisseur & Ressort
  if (n.includes('amortisseur') || n.includes('strut') || n.includes('jambe de force') || n.includes('ressort')) {
    return '/images/categories/amortisseur.jpg';
  }

  // 10. Kit distribution & Courroie
  if (n.includes('distribution') || n.includes('distrib') || n.includes('courroie') || n.includes('chaine') || n.includes('galet') || n.includes('tendeur')) {
    return '/images/categories/kit-distribution.jpg';
  }

  return '/images/categories/piece-auto-generique.jpg';
}

/**
 * Résolveur d'image complet :
 * 1. Image personnalisée uploadée
 * 2. Image officielle par Référence exacte (Priorité 1)
 * 3. Image par Désignation précise et vérifiée (Priorité 2)
 * 4. Image de pièce auto générique haute définition (Fallback)
 */
export function resolveProductImage(product: {
  reference?: string | null;
  sku?: string | null;
  name?: string | null;
  images?: string | string[] | null;
}): string {
  // 1. Image personnalisée ou explicite valide
  if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
    const img = product.images[0];
    if (img && img.trim()) return img;
  }
  if (typeof product.images === 'string' && product.images.trim() && product.images !== '[]') {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) {
        return parsed[0];
      } else if (typeof parsed === 'string' && parsed.trim()) {
        return parsed;
      }
    } catch {
      if (product.images.startsWith('http') || product.images.startsWith('/')) {
        return product.images;
      }
    }
  }

  // 2. Priorité 1 : Recherche par Référence exacte
  const byRef = resolveImageByExactReference(product.reference, product.sku);
  if (byRef) return byRef;

  // 3. Priorité 2 : Recherche par Désignation précise avec Fallback automatique
  return resolveImageByDesignation(product.name);
}
