/**
 * AUTOP - Test verification Fallback Engine
 */
const https = require("https");
const http = require("http");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function httpReq(method, url, body, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = url.startsWith("https");
    const postData = body ? new URLSearchParams(body).toString() : "";
    const opts = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,*/*",
        ...(postData ? { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(postData) } : {}),
        ...(headers || {})
      },
      rejectUnauthorized: false
    };
    const lib = isHttps ? https : http;
    const req = lib.request(opts, res => {
      let data = "";
      const cookies = res.headers["set-cookie"] || [];
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, data, cookies }));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout " + url)); });
    if (postData) req.write(postData);
    req.end();
  });
}

function ec(cookies) { return cookies.map(c => c.split(";")[0]).join("; "); }

async function testMosaiqueAuto(ref) {
  const SITE = { url: "https://parx.mosaique-auto.com", login: "services-automobile@gmail.com", pass: "AUTOP" };
  const init = await httpReq("GET", SITE.url + "/auth", null, {});
  const sess = ec(init.cookies);
  const loginRes = await httpReq("POST", SITE.url + "/auth", { login: SITE.login, pass: SITE.pass }, { Cookie: sess });
  const cookie = ec(loginRes.cookies) || sess;
  const searchRes = await httpReq("POST", SITE.url + "/auth?api=getArticlebyref&lu=1",
    { jsonDataApiTransfert: JSON.stringify({ ref, reference: ref }) },
    { Cookie: cookie, "X-Requested-With": "XMLHttpRequest" }
  );
  let resJson = null;
  try { resJson = JSON.parse(searchRes.data); } catch(e) {}
  const master = resJson && resJson.master;
  if (master && master.id_article) {
    return { found: true, ref: master.reference || ref, designation: master.titre, brand: master.titre_marque || "ORIGINE", price: master.prix || master.prix_u_ht, stock: master.stockTotal > 0 ? master.stockTotal + " en stock" : "Sur commande" };
  }
  return { found: false };
}

async function main() {
  const refsToTest = ["1306J5", "CAN1306J5", "1306j5"];
  console.log("=".repeat(65));
  console.log("  AUTOP - Verification Moteur de Repli Fallback Engine");
  console.log("  Ref cible: 1306J5 -> CAN1306J5 (CANSU / STEQ)");
  console.log("=".repeat(65));

  for (const ref of refsToTest) {
    console.log("\n>> Test ref: " + ref);
    try {
      const r = await testMosaiqueAuto(ref);
      if (r.found) {
        console.log("  TROUVE chez MOSAIQUE AUTO / STE ROUTE X:");
        console.log("  Ref         : " + r.ref);
        console.log("  Designation : " + r.designation);
        console.log("  Marque      : " + r.brand);
        console.log("  Prix        : " + r.price + " TND");
        console.log("  Stock       : " + r.stock);
      } else {
        console.log("  NON TROUVE chez Mosaique Auto");
      }
    } catch(e) {
      console.log("  ERREUR Mosaique Auto: " + e.message);
    }
  }

  console.log("\n" + "=".repeat(65));
  console.log("  Note: Le moteur de repli dans la B2B route applique:");
  console.log("  1. REF_CLEANING   (1306J5, 1306j5, CAN1306J5...)");
  console.log("  2. OEM_EQUIVALENT (dictionnaire)");
  console.log("  3. CDG_ANALYSIS   (refs extraites de fournisseurs reussis)");
  console.log("  4. BRAND_VARIANT  (CAN-, MTC-, VAL-, etc.)");
  console.log("  5. DICT_EXPAND    (recherche floue)");
  console.log("=".repeat(65));
}

main().catch(e => console.error("ERR:", e.message));
