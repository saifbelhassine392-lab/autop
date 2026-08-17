const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanText(txt) {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

function resolveImageByReference(reference, sku) {
  const refsToTest = [];
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

function resolveImageByDesignation(name, category) {
  const text = cleanText(`${name || ''} ${category || ''}`);

  if (text.includes('plaquette') || text.includes('patin') || (text.includes('frein') && !text.includes('disque'))) {
    return '/images/categories/plaquettes-frein.jpg';
  }
  if (text.includes('disque') || text.includes('rotor')) {
    return '/images/categories/disque-frein.jpg';
  }
  if (text.includes('filtre') && (text.includes('air') || text.includes('admission'))) {
    return '/images/categories/filtre-air.jpg';
  }
  if (text.includes('filtre') && (text.includes('huile') || text.includes('oil'))) {
    return '/images/categories/filtre-huile.jpg';
  }
  if (text.includes('filtre') || text.includes('filtration')) {
    return '/images/categories/filtre-air.jpg';
  }
  if (text.includes('embrayage') || text.includes('clutch') || text.includes('butee d embrayage')) {
    return '/images/categories/kit-embrayage.jpg';
  }
  if (text.includes('triangle') || text.includes('bras de suspension') || text.includes('bras suspension') || text.includes('bras')) {
    return '/images/categories/triangle-suspension.jpg';
  }
  if (text.includes('biellette') || text.includes('bielle de suspension') || text.includes('bielle suspension') || text.includes('bielle de susp') || text.includes('bielle')) {
    return '/images/categories/biellette-suspension.jpg';
  }
  if (text.includes('rotule') || text.includes('direction')) {
    return '/images/categories/rotule-direction.jpg';
  }
  if (text.includes('amortisseur') || text.includes('jambe') || text.includes('strut')) {
    return '/images/categories/amortisseur.jpg';
  }
  if (text.includes('distribution') || text.includes('courroie') || text.includes('galet') || text.includes('pompe a eau')) {
    return '/images/categories/kit-distribution.jpg';
  }

  return '/images/categories/piece-auto-generique.jpg';
}

async function runEnrichment() {
  console.log('🔄 Démarrage de l\'enrichissement automatique des photos...');

  const products = await prisma.product.findMany({
    include: { category: true }
  });

  console.log(`📦 Nombre total d'articles dans la base : ${products.length}`);

  let refMatchCount = 0;
  let desigMatchCount = 0;
  let alreadyHadCount = 0;

  for (const p of products) {
    let hasValidImage = false;
    if (p.images && p.images !== '[]' && p.images.trim()) {
      try {
        const parsed = JSON.parse(p.images);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) hasValidImage = true;
      } catch {
        if (p.images.startsWith('http') || p.images.startsWith('/')) hasValidImage = true;
      }
    }

    if (hasValidImage) {
      alreadyHadCount++;
      continue;
    }

    // 1. Recherche par Référence
    const refImg = resolveImageByReference(p.reference, p.sku);
    let chosenImg = '';
    let matchType = '';

    if (refImg) {
      chosenImg = refImg;
      matchType = 'REFERENCE';
      refMatchCount++;
    } else {
      // 2. Recherche par Désignation (Fallback)
      chosenImg = resolveImageByDesignation(p.name, p.category?.name);
      matchType = 'DESIGNATION';
      desigMatchCount++;
    }

    await prisma.product.update({
      where: { id: p.id },
      data: {
        images: JSON.stringify([chosenImg])
      }
    });
  }

  console.log('\n================ RÉSULTATS ENRICHISSEMENT ================');
  console.log(`✅ Articles avec photo déjà existante : ${alreadyHadCount}`);
  console.log(`🎯 Articles associés par RÉFÉRENCE EXACTE : ${refMatchCount}`);
  console.log(`🏷️ Articles associés par DÉSIGNATION (Fallback) : ${desigMatchCount}`);
  console.log(`🎉 Total articles enrichis : ${refMatchCount + desigMatchCount}`);
  console.log('===========================================================\n');
}

runEnrichment()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
