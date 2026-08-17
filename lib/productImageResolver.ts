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

/**
 * Résolveur d'image strict :
 * - Retourne l'image officielle par référence ou image personnalisée uploadée
 * - Retourne null si aucune image exacte n'existe
 */
export function resolveProductImage(product: {
  reference?: string | null;
  sku?: string | null;
  name?: string | null;
  images?: string | string[] | null;
}): string | null {
  // 1. Image personnalisée ou explicite valide
  if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
    const img = product.images[0];
    if (img && !img.includes('/images/categories/')) return img;
  }
  if (typeof product.images === 'string' && product.images.trim() && product.images !== '[]') {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) {
        if (!parsed[0].includes('/images/categories/')) return parsed[0];
      } else if (typeof parsed === 'string' && parsed.trim()) {
        if (!parsed.includes('/images/categories/')) return parsed;
      }
    } catch {
      if ((product.images.startsWith('http') || product.images.startsWith('/')) && !product.images.includes('/images/categories/')) {
        return product.images;
      }
    }
  }

  // 2. Recherche par Référence exacte
  return resolveImageByExactReference(product.reference, product.sku);
}
