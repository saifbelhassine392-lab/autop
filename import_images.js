const fs = require('fs');
const path = require('path');
const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const outputDir = path.join(__dirname, 'public', 'images', 'articles');

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

function downloadImage(ref, imageUrl) {
    return new Promise((resolve) => {
        const filePath = path.join(outputDir, `${ref.replace(/[^a-zA-Z0-9_-]/g, '')}.jpg`);
        
        if (fs.existsSync(filePath)) {
            console.log(`[~] Taswirt el référence ${ref} mawjouda deja.`);
            return resolve();
        }

        https.get(imageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
            }
        }, (response) => {
            if (response.statusCode === 200 || response.statusCode === 301 || response.statusCode === 302) {
                if (response.statusCode !== 200) {
                     console.log(`[-] Redirect non géré pour ${ref}`);
                     return resolve();
                }
                const fileStream = fs.createWriteStream(filePath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`[+] Taswirt el référence ${ref} tsajlet mrigla!`);
                    resolve();
                });
            } else {
                console.log(`[-] Ma l9ach taswira lel référence ${ref} (Status: ${response.statusCode})`);
                resolve();
            }
        }).on('error', (err) => {
            console.error(`[!] Erreur fel référence ${ref}:`, err.message);
            resolve();
        });
    });
}

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

async function main() {
    console.log("Jari el baht 3al références fel base de données...");
    try {
        const products = await prisma.product.findMany({
            select: { id: true, reference: true, images: true, brand: true }
        });

        console.log(`${products.length} articles l9inahom.`);

        for (const p of products) {
            if (!p.reference) continue;
            
            const filePath = path.join(outputDir, `${p.reference.replace(/[^a-zA-Z0-9_-]/g, '')}.jpg`);
            if (fs.existsSync(filePath)) {
                console.log(`[~] Taswirt el référence ${p.reference} mawjouda deja.`);
                continue;
            }

            let imageUrl = null;
            try {
                const imgs = p.images ? JSON.parse(p.images) : [];
                if (imgs.length > 0) imageUrl = imgs[0];
            } catch(e) {}

            if (!imageUrl) {
                console.log(`[?] Pas d'URL d'image en base pour ${p.reference}. Scraping Bing...`);
                imageUrl = await scrapeBingImage(p.reference, p.brand);
                await delay(500); 
                
                if (imageUrl) {
                    await prisma.product.update({
                        where: { id: p.id },
                        data: { images: JSON.stringify([imageUrl]) }
                    });
                }
            }

            if (imageUrl) {
                console.log(`Jari téléchargement taswira lel référence: ${p.reference}...`);
                await downloadImage(p.reference, imageUrl);
            } else {
                console.log(`[!] Echec total pour trouver l'image de la référence ${p.reference}.`);
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
