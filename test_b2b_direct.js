/**
 * TEST ROBOT B2B - ref 1611273080
 * Scrape directement les fournisseurs B2B sans passer par NextAuth
 */

const https = require('https');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function httpReq(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = body ? (typeof body === 'string' ? body : new URLSearchParams(body).toString()) : '';
    const opts = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json,*/*',
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...headers
      },
      rejectUnauthorized: false
    };
    const req = https.request(opts, res => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data, cookies, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (postData) req.write(postData);
    req.end();
  });
}

function extractCookieStr(cookies) {
  return cookies.map(c => c.split(';')[0]).join('; ');
}

async function testSTEQ(ref) {
  console.log(`\n  [STEQ] Test ref=${ref}`);
  try {
    // Step 1: Get session
    const initRes = await httpReq('GET', 'https://b2bsteq.com/');
    const sessMatch = extractCookieStr(initRes.cookies);
    
    // Step 2: Login
    const loginRes = await httpReq('POST', 'https://b2bsteq.com/', 
      { UserCode: 'CL0016035', UserPassword: 'steq2024', UserSubmit: ' E N T R E R ' },
      { Cookie: sessMatch }
    );
    const loginCook = extractCookieStr(loginRes.cookies) || sessMatch;
    const authOk = !loginRes.data.includes('VOTRE MOT DE PASSE') && loginRes.data.includes('form-recherche');
    console.log(`    Auth: ${authOk ? '✅ OK' : '❌ Echec (données login incorrectes)'}`);
    
    if (authOk) {
      // Step 3: Search
      const searchRes = await httpReq('POST', 'https://b2bsteq.com/form-recherche.html',
        { MySearchType: '1', MySearchKey: ref, MySearchSubmit: '' },
        { Cookie: loginCook }
      );
      const hasResult = searchRes.data.includes('ApiJsonItemAll') || searchRes.data.includes('UnitPrice');
      console.log(`    Résultat: ${hasResult ? '✅ Articles trouvés' : '⚠️ Aucun résultat'}`);
      if (hasResult) {
        const jsonMatch = searchRes.data.match(/var\s+ApiJsonItemAll\s*=\s*(\[[\s\S]*?\]);/);
        if (jsonMatch) {
          try {
            const items = JSON.parse(jsonMatch[1]);
            items.slice(0, 3).forEach(it => {
              console.log(`      >> Ref=${it.ItemNo||it.ItemNumberEquiv} Brand=${it.ItemBrand||it.ItemBrandEquiv} Prix=${it.UnitPrice} Stock=${it.Available}`);
            });
          } catch(e) {}
        }
      }
    }
  } catch(err) {
    console.log(`    Erreur réseau STEQ: ${err.message}`);
  }
}

async function testFAD(ref) {
  console.log(`\n  [FAD - b2bfad.com.tn] Test ref=${ref}`);
  try {
    const initRes = await httpReq('GET', 'https://b2bfad.com.tn/');
    const sessMatch = extractCookieStr(initRes.cookies);
    const loginRes = await httpReq('POST', 'https://b2bfad.com.tn/',
      { UserCode: '3905', UserPassword: '7S@5512g', UserSubmit: ' E N T R E R ' },
      { Cookie: sessMatch }
    );
    const loginCook = extractCookieStr(loginRes.cookies) || sessMatch;
    const authOk = !loginRes.data.includes('VOTRE MOT DE PASSE');
    console.log(`    Auth FAD: ${authOk ? '✅ OK' : '❌ Echec login'}`);
    
    if (authOk) {
      const searchRes = await httpReq('POST', 'https://b2bfad.com.tn/form-recherche.html',
        { MySearchType: '1', MySearchKey: ref, MySearchSubmit: '' },
        { Cookie: loginCook }
      );
      const hasResult = searchRes.data.includes('ApiJsonItemAll') || searchRes.data.includes('UnitPrice');
      console.log(`    Résultat FAD: ${hasResult ? '✅ Articles trouvés' : '⚠️ Aucun résultat direct'}`);
      if (hasResult) {
        const jsonMatch = searchRes.data.match(/var\s+ApiJsonItemAll\s*=\s*(\[[\s\S]*?\]);/);
        if (jsonMatch) {
          try {
            const items = JSON.parse(jsonMatch[1]);
            items.slice(0, 3).forEach(it => {
              console.log(`      >> Ref=${it.ItemNo||it.ItemNumberEquiv} Brand=${it.ItemBrand} Prix=${it.UnitPrice} Stock=${it.Available}`);
            });
          } catch(e) {}
        }
      }
    }
  } catch(err) {
    console.log(`    Erreur réseau FAD: ${err.message}`);
  }
}

async function main() {
  const ref = '1611273080';
  console.log('═'.repeat(60));
  console.log(`TEST ROBOT B2B - Référence: ${ref}`);
  console.log('═'.repeat(60));
  console.log(`\nCette référence correspond à: FILTRE A HUILE PEUGEOT/CITROEN`);
  console.log(`(1611273080 = OE Peugeot/Citroen 1.6 HDi)\n`);

  await testSTEQ(ref);
  await testFAD(ref);

  console.log('\n' + '═'.repeat(60));
  console.log('FIN TESTS FOURNISSEURS');
  console.log('Note: Pour tester TOUS les 14 fournisseurs, utilisez');
  console.log('le Robot B2B dans l\'interface AUTOP après connexion.');
  console.log('═'.repeat(60));
}

main().catch(console.error);
