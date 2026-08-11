/**
 * Script de test complet pour valider toutes les 5 références avec l'API B2B Mosaique Auto
 */

const https = require('https');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testAllRequestedRefs() {
  console.log("=================================================");
  console.log("  TEST COMPLET DES 5 RÉFÉRENCES DEMANDÉES (B2B)  ");
  console.log("=================================================");

  const refs = ['508768', '1611266580', '1306j5', '1336ax', '1611273080'];
  
  // Test direct avec l'API Mosaique Auto
  const site = { name: 'STE ROUTE X', url: 'https://parx.mosaique-auto.com', login: 'services-automobile@gmail.com', pass: 'AUTOP' };

  for (const ref of refs) {
    console.log(`\n▶ TEST RÉFÉRENCE: "${ref}"`);
    
    try {
      const u = new URL(site.url);
      const baseUrl = `${u.protocol}//${u.host}`;
      
      // Cookie init
      const initRes = await fetch(`${baseUrl}/auth`, { headers: { "User-Agent": "Mozilla/5.0" } });
      const initCookie = (initRes.headers.get("set-cookie") || "").match(/PHPSESSID=[^;]+/)?.[0] || "";
      
      // Login
      const loginRes = await fetch(`${baseUrl}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": initCookie, "User-Agent": "Mozilla/5.0" },
        body: new URLSearchParams({ login: site.login, pass: site.pass }).toString()
      });
      const cookie = (loginRes.headers.get("set-cookie") || "").match(/PHPSESSID=[^;]+/)?.[0] || initCookie;

      const searchRefs = [ref, ref.toUpperCase(), ref.toLowerCase()];
      if (ref === '1611266580') searchRefs.push('623332500', '832427', '2051Z0', '1611273080');
      if (ref === '1306j5' || ref === '1306J5') searchRefs.push('1306J5', 'CAN1306J5', '03025');
      if (ref === '1336ax' || ref === '1336AX') searchRefs.push('1336AX', '5397XS', '941063');
      if (ref === '508768') searchRefs.push('508768', '1607326880', '508755');

      let found = false;
      for (const rKey of searchRefs) {
        const rSearch = await fetch(`${baseUrl}/auth?api=getArticlebyref&lu=1`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": cookie,
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest"
          },
          body: new URLSearchParams({ jsonDataApiTransfert: JSON.stringify({ ref: rKey, reference: rKey }) }).toString()
        });

        if (rSearch.ok) {
          const resJson = await rSearch.json().catch(() => null);
          const master = resJson?.master;
          if (master && master.id_article) {
            found = true;
            console.log(`  ✅ TROUVÉ CHEZ ${site.name} (via ${rKey}):`);
            console.log(`     Ref/Désignation : ${master.titre}`);
            console.log(`     Marque          : ${master.titre_marque || 'ORIGINE'}`);
            console.log(`     Prix            : ${master.prix || master.prix_u_ht} TND`);
            console.log(`     Stock           : ${master.stockTotal > 0 ? master.stockTotal + ' en stock' : 'Sur commande / Hors stock'}`);
            break;
          }
        }
      }

      if (!found) {
        console.log(`  ❌ Aucun article trouvé pour ${ref}`);
      }

    } catch (e) {
      console.log(`  ❌ Erreur test: ${e.message}`);
    }
  }

  console.log("\n=================================================");
  console.log("  FIN DES TESTS DE VALIDATION B2B               ");
  console.log("=================================================");
}

testAllRequestedRefs();
