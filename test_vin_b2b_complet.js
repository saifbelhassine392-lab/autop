/**
 * TEST COMPLET: VIN + B2B Robot 1611273080
 * Exécuter avec: node test_vin_b2b_complet.js
 */

const https = require('https');
const http = require('http');

// Ignore SSL errors for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const postData = typeof body === 'string' ? body : JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'AUTOP-Test/1.0',
        ...headers
      },
      rejectUnauthorized: false
    };
    
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('Timeout 25s')); });
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  AUTOP - TEST COMPLET VIN + ROBOT B2B');
  console.log('═'.repeat(60));

  // ═══════════════════════════════════════════════════════
  // TEST 1: VIN MA3TFC62S00309625 (Suzuki Alto/Celerio India)
  // ═══════════════════════════════════════════════════════
  console.log('\n▶ TEST 1: VIN Identification MA3TFC62S00309625');
  console.log('  Attendu: SUZUKI ALTO / A-STAR / CELERIO (MA3TFC)');
  
  try {
    const vinRes = await httpPost(
      'https://autopb2b.vercel.app/api/catalog/headless-render',
      { vin: 'MA3TFC62S00309625' }
    );
    
    if (vinRes.status === 200 && vinRes.data.success) {
      console.log(`  ✅ Brand   : ${vinRes.data.brand}`);
      console.log(`  ✅ Modèle  : ${vinRes.data.model}`);
      console.log(`  ✅ Moteur  : ${vinRes.data.engine}`);
      console.log(`  ✅ Année   : ${vinRes.data.year}`);
      console.log(`  ✅ Source  : ${vinRes.data.sourceCatalog}`);
      console.log(`  ✅ Sections: ${(vinRes.data.nativeSchematics || []).length} schémas chargés`);
      
      if (vinRes.data.brand === 'SUZUKI') {
        console.log('\n  🎉 RÉSULTAT: PARFAIT ! Suzuki Indien identifié correctement');
      } else {
        console.log(`\n  ❌ ERREUR: Brand = ${vinRes.data.brand} (attendu: SUZUKI)`);
      }
    } else {
      console.log(`  ❌ HTTP ${vinRes.status}: ${JSON.stringify(vinRes.data).substring(0, 200)}`);
    }
  } catch (err) {
    console.log(`  ❌ Erreur réseau: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // TEST 2: VIN Peugeot 407 (test de régression)
  // ═══════════════════════════════════════════════════════
  console.log('\n▶ TEST 2: VIN Peugeot 407 (régression) VF36D9HZC9L013574');
  try {
    const vinRes2 = await httpPost(
      'https://autopb2b.vercel.app/api/catalog/headless-render',
      { vin: 'VF36D9HZC9L013574' }
    );
    if (vinRes2.data.success) {
      console.log(`  Brand: ${vinRes2.data.brand} | Model: ${vinRes2.data.model}`);
      console.log(vinRes2.data.brand === 'PEUGEOT' ? '  ✅ Peugeot OK' : '  ❌ Erreur Peugeot');
    }
  } catch (err) { console.log(`  Erreur: ${err.message}`); }

  // ═══════════════════════════════════════════════════════
  // TEST 3: Robot B2B ref=1611273080 via Suppliers direct scrape
  // ═══════════════════════════════════════════════════════
  console.log('\n▶ TEST 3: Robot B2B - Référence 1611273080');
  console.log('  Note: B2B requiert session NextAuth → test via scraping direct STEQ');
  
  // Test direct STEQ scraping (public endpoint if exists)
  try {
    const steqRes = await httpPost(
      'https://autopb2b.vercel.app/api/b2b/scrape-test',
      { supplier: 'STEQ', ref: '1611273080' }
    );
    console.log(`  STEQ: ${JSON.stringify(steqRes.data).substring(0, 300)}`);
  } catch (err) {
    console.log(`  STEQ direct: Non disponible (${err.message})`);
  }

  // ═══════════════════════════════════════════════════════
  // TEST 4: Dictionnaire d'équivalences pour 1611273080
  // ═══════════════════════════════════════════════════════
  console.log('\n▶ TEST 4: Équivalences pour 1611273080');
  try {
    const eqRes = await httpPost(
      'https://autopb2b.vercel.app/api/equivalents',
      { reference: '1611273080' }
    );
    console.log(`  HTTP ${eqRes.status}: ${JSON.stringify(eqRes.data).substring(0, 300)}`);
  } catch (err) {
    console.log(`  Erreur: ${err.message}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  FIN DES TESTS');
  console.log('═'.repeat(60) + '\n');
}

runTests().catch(console.error);
