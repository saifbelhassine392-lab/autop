const { PrismaClient } = require('@prisma/client');
const https = require('https');

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
                    // Force HTTPS to avoid mixed content in browser if needed, but modern browsers might block mixed content.
                    let imgUrl = match[1].replace('http://', 'https://');
                    resolve(imgUrl);
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
    console.log("Démarrage du peuplement complet de la base de données (Images)...");
    try {
        const products = await prisma.product.findMany({
            select: { id: true, reference: true, images: true, brand: true, compatible: true }
        });

        console.log(`${products.length} articles trouvés.`);

        // 1. Cross-pollinisation d'abord
        let crossCount = 0;
        for (const p of products) {
            let pImage = getImageUrl(p);
            if (pImage) {
                try {
                    const compatibles = p.compatible ? JSON.parse(p.compatible) : [];
                    for (const compRef of compatibles) {
                        const targetProduct = products.find(prod => prod.reference === compRef && !getImageUrl(prod));
                        if (targetProduct) {
                            await prisma.product.update({
                                where: { id: targetProduct.id },
                                data: { images: JSON.stringify([pImage]) }
                            });
                            targetProduct.images = JSON.stringify([pImage]);
                            crossCount++;
                        }
                    }
                } catch(e) {}
            }
        }
        console.log(`[Cross-Ref] ${crossCount} équivalences mises à jour.`);

        // 2. Scraping pour les manquants
        let scrapeCount = 0;
        let failCount = 0;
        for (const p of products) {
            if (!p.reference) continue;
            let imageUrl = getImageUrl(p);

            if (!imageUrl) {
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
                    console.log(`[Scraping] Recherche pour ${p.reference}...`);
                    imageUrl = await scrapeBingImage(p.reference, p.brand);
                    await delay(300); // polite scraping
                }
                
                if (imageUrl) {
                    await prisma.product.update({
                        where: { id: p.id },
                        data: { images: JSON.stringify([imageUrl]) }
                    });
                    p.images = JSON.stringify([imageUrl]);
                    scrapeCount++;
                    console.log(`[+] OK : ${p.reference}`);
                } else {
                    failCount++;
                    console.log(`[-] Echec : ${p.reference}`);
                }
            }
        }
        
        console.log(`Terminé ! Scraping: ${scrapeCount} OK, ${failCount} Echecs.`);
    } catch (error) {
        console.error("Erreur lors de l'exécution:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
