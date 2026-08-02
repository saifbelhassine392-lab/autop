const fs = require('fs');
const path = require('path');
const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function scrapeBingImage(reference, brand) {
    return new Promise((resolve) => {
        const query = `${brand || ''} ${reference} piece auto`;
        const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
        
        https.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
            }
        }, (res) => {
            let html = '';
            res.on('data', chunk => html += chunk);
            res.on('end', () => {
                const regex = /murl&quot;:&quot;(https?:[^&]+)&quot;/g;
                let match = regex.exec(html);
                if (match && match[1]) {
                    resolve(match[1]);
                } else {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function getImageUrl(product) {
    try {
        const imgs = product.images ? JSON.parse(product.images) : [];
        if (imgs.length > 0) return imgs[0];
    } catch(e) {}
    return null;
}

async function main() {
    console.log("Jari el baht 3al références fel base de données...");
    try {
        const products = await prisma.product.findMany({
            select: { id: true, reference: true, images: true, brand: true, compatible: true }
        });

        console.log(`${products.length} articles l9inahom.`);

        // 1. Build a cross-reference map to share images
        let updatedCount = 0;
        for (const p of products) {
            let pImage = getImageUrl(p);
            
            // Si on a une image, on l'applique aux équivalences
            if (pImage) {
                try {
                    const compatibles = p.compatible ? JSON.parse(p.compatible) : [];
                    for (const compRef of compatibles) {
                        const targetProduct = products.find(prod => prod.reference === compRef && !getImageUrl(prod));
                        if (targetProduct) {
                            console.log(`[Cross-Ref] Attribution de l'image de ${p.reference} à l'équivalent ${targetProduct.reference}`);
                            await prisma.product.update({
                                where: { id: targetProduct.id },
                                data: { images: JSON.stringify([pImage]) }
                            });
                            targetProduct.images = JSON.stringify([pImage]);
                            updatedCount++;
                        }
                    }
                } catch(e) {}
            }
        }

        // 2. Scrape for missing images
        for (const p of products) {
            if (!p.reference) continue;
            let imageUrl = getImageUrl(p);

            if (!imageUrl) {
                // Try to find if any compatible product has an image
                try {
                    const compatibles = p.compatible ? JSON.parse(p.compatible) : [];
                    for (const compRef of compatibles) {
                        const sourceProduct = products.find(prod => prod.reference === compRef && getImageUrl(prod));
                        if (sourceProduct) {
                            imageUrl = getImageUrl(sourceProduct);
                            break;
                        }
                    }
                } catch(e) {}

                if (!imageUrl) {
                    console.log(`[?] Pas d'URL d'image en base pour ${p.reference}. Scraping Bing...`);
                    imageUrl = await scrapeBingImage(p.reference, p.brand);
                    await delay(500); 
                }
                
                if (imageUrl) {
                    await prisma.product.update({
                        where: { id: p.id },
                        data: { images: JSON.stringify([imageUrl]) }
                    });
                    p.images = JSON.stringify([imageUrl]);
                    console.log(`[+] Image trouvée et liée pour ${p.reference}`);
                } else {
                    console.log(`[-] Echec total pour l'image de la référence ${p.reference}.`);
                }
            }
        }
        
        console.log("Terminé !");
    } catch (error) {
        console.error("Erreur lors de la récupération des références:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
