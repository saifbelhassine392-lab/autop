const fs = require('fs');
const path = require('path');
const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const outputDir = path.join(__dirname, 'public', 'images', 'articles');

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

// Fonction pour télécharger l'image
function downloadImage(ref, imageUrl) {
    const filePath = path.join(outputDir, `${ref.replace(/[^a-zA-Z0-9_-]/g, '')}.jpg`);
    
    // Skip if already exists
    if (fs.existsSync(filePath)) {
        console.log(`[~] Taswirt el référence ${ref} mawjouda deja.`);
        return;
    }

    https.get(imageUrl, (response) => {
        if (response.statusCode === 200) {
            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`[+] Taswirt el référence ${ref} tsajlet mrigla!`);
            });
        } else {
            console.log(`[-] Ma l9ach taswira lel référence ${ref} (Status: ${response.statusCode})`);
        }
    }).on('error', (err) => {
        console.error(`[!] Erreur fel référence ${ref}:`, err.message);
    });
}

async function main() {
    console.log("Jari el baht 3al références fel base de données...");
    try {
        // Fetch products from DB
        const products = await prisma.product.findMany({
            select: { reference: true, images: true }
        });

        console.log(`${products.length} articles l9inahom.`);

        products.forEach((p) => {
            if (!p.reference) return;
            
            // Houni el lien mta3 el taswira (l'agent ynajem yrobutou m3a source wala API bech yjbdou wahdou)
            // On essaie de prendre la 1ere image stockée par Bing (images JSON array)
            let imageUrl = null;
            try {
                const imgs = p.images ? JSON.parse(p.images) : [];
                if (imgs.length > 0) imageUrl = imgs[0];
            } catch(e) {}

            if (imageUrl) {
                console.log(`Jari téléchargement taswira lel référence: ${p.reference}...`);
                downloadImage(p.reference, imageUrl);
            } else {
                console.log(`[!] Pas d'URL d'image trouvée pour la référence ${p.reference}, veuillez l'ajouter manuellement.`);
            }
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des références:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
