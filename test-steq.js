process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const https = require('https');

async function scrapeSTEQ(query) {
  try {
    const initialRes = await fetch("https://b2bsteq.com/", {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    
    let sessionCookie = "";
    const initCookies = initialRes.headers.get("set-cookie") || "";
    if (initCookies.includes("PHPSESSID")) {
      const match = initCookies.match(/PHPSESSID=[^;]+/);
      if (match) sessionCookie = match[0];
    }

    const loginParams = new URLSearchParams();
    loginParams.append("UserCode", "CL0016035");
    loginParams.append("UserPassword", "STEQ484630925");
    loginParams.append("UserSubmit", "");

    const loginRes = await fetch("https://b2bsteq.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "Cookie": sessionCookie,
      },
      body: loginParams.toString(),
      redirect: "manual",
    });

    const loginCookies = loginRes.headers.get("set-cookie") || "";
    if (loginCookies.includes("PHPSESSID")) {
      const match = loginCookies.match(/PHPSESSID=[^;]+/);
      if (match) sessionCookie = match[0];
    }

    const searchParams = new URLSearchParams();
    searchParams.append("MySearchType", "1");
    searchParams.append("MySearchKey", query);
    searchParams.append("MySearchSubmit", "");

    const searchRes = await fetch("https://b2bsteq.com/form-recherche.html", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": sessionCookie,
        "User-Agent": "Mozilla/5.0",
      },
      body: searchParams.toString(),
    });

    const html = await searchRes.text();
    console.log("HTML length:", html.length);
    const jsonMatch = html.match(/var ApiJsonItemAll = (\[.*?\]);/);
    if (!jsonMatch) {
      const fs = require('fs');
      fs.writeFileSync("test_result.html", html);
      console.log("Regex Failed. Saved HTML to test_result.html");
      return { price: 0, discount: 0, availability: "Non Trouvé (Regex Failed)" };
    }

    const items = JSON.parse(jsonMatch[1]);
    console.log("Items found:", items.length);
    if (items.length > 0) console.log(items[0]);
    if (items.length === 0) {
      return { price: 0, discount: 0, availability: "Non Disponible" };
    }

    let bestItem = items.find((i) => parseInt(i.Available) > 0);
    if (!bestItem) bestItem = items[0];

    return {
      price: parseFloat(bestItem.UnitPrice) || 0,
      discount: parseFloat(bestItem.MaxDiscount) || 0,
      availability: parseInt(bestItem.Available) > 0 ? "Disponible" : "Sur Commande",
      rawStock: parseInt(bestItem.Available) || 0,
      name: bestItem.Name
    };

  } catch (err) {
    console.error("STEQ Scrape Error:", err);
    return { price: 0, discount: 0, availability: "Erreur Connexion" };
  }
}

scrapeSTEQ("1306J5").then(console.log);
