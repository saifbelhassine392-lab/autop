import { NextRequest, NextResponse } from 'next/server';
import https from "https";

// Create an HTTPS agent that ignores SSL certificate errors (for fetch)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function scrapeSTEQ(query: string) {
  try {
    // 1. Get initial cookie & Login
    const initialRes = await fetch("https://b2bsteq.com/", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      cache: 'no-store'
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
      cache: 'no-store'
    });

    const loginCookies = loginRes.headers.get("set-cookie") || "";
    if (loginCookies.includes("PHPSESSID")) {
      const match = loginCookies.match(/PHPSESSID=[^;]+/);
      if (match) sessionCookie = match[0];
    }

    // 2. Search
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
      cache: 'no-store'
    });

    const html = await searchRes.text();

    // 3. Extract JSON from HTML
    const jsonMatch = html.match(/var ApiJsonItemAll = (\[.*?\]);/);
    if (!jsonMatch) {
      return { price: 0, discount: 0, availability: "Non Trouvé (Regex Failed)" };
    }

    const items = JSON.parse(jsonMatch[1]);
    if (items.length === 0) {
      return { price: 0, discount: 0, availability: "Non Disponible" };
    }

    // Find the best item (preferably one with Available > 0, otherwise the first one)
    let bestItem = items.find((i: any) => parseInt(i.Available) > 0);
    if (!bestItem) bestItem = items[0];

    return {
      price: parseFloat(bestItem.UnitPrice) || 0,
      discount: parseFloat(bestItem.MaxDiscount) || 0,
      availability: parseInt(bestItem.Available) > 0 ? "Disponible" : "Sur Commande",
      rawStock: parseInt(bestItem.Available) || 0
    };

  } catch (err: any) {
    console.error("STEQ Scrape Error:", err);
    return { price: 0, discount: 0, availability: "Erreur Connexion" };
  }
}

export async function POST(request: Request) {
  try {
    const { supplierId, query, reference } = await request.json();
    const searchQuery = query || reference;

    if (!supplierId || !searchQuery) {
      return NextResponse.json({ success: false, error: "Fournisseur et recherche requis" }, { status: 400 });
    }

    const { prisma } = await import('@/lib/prisma');
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Fournisseur introuvable" }, { status: 404 });
    }

    let searchResult = null;
    const supName = supplier.name.toUpperCase();

    if (supName === "STEQ") {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      const res = await scrapeSTEQ(searchQuery);
      searchResult = {
        price: res.price,
        discount: res.discount,
        available: (res.rawStock ?? 0) > 0 || res.availability === "Disponible",
        stock: res.rawStock
      };
    }
    else if (supName === "FAD") searchResult = { error: "Scraper FAD en cours d'intégration." };
    else if (supName === "CDG") searchResult = { error: "Scraper CDG en cours d'intégration." };
    else if (supName === "SAGAP") searchResult = { error: "Scraper SAGAP en cours d'intégration." };
    else if (supName === "AAP") searchResult = { error: "Scraper AAP en cours d'intégration." };
    else if (supName === "PROPARTS") searchResult = { error: "Scraper PROPARTS en cours d'intégration." };
    else if (supName === "ITALCAR") searchResult = { error: "Scraper ITALCAR en cours d'intégration." };
    else if (supName === "CARGROS") searchResult = { error: "Scraper CARGROS en cours d'intégration." };
    else if (supName === "ALPHA FORD") searchResult = { error: "Scraper ALPHA FORD en cours d'intégration." };
    else if (supName === "GPG") searchResult = { error: "Scraper GPG en cours d'intégration." };
    else if (supName === "UNIVERS AUTO") searchResult = { error: "Scraper UNIVERS AUTO en cours d'intégration." };
    else if (supName === "STE ROUTE X") searchResult = { error: "Scraper STE ROUTE X en cours d'intégration." };
    else if (supName === "SOPIC") searchResult = { error: "Scraper SOPIC en cours d'intégration." };
    else if (supName === "SOCOFA GROS") searchResult = { error: "Scraper SOCOFA GROS en cours d'intégration." };
    else {
      searchResult = { error: `Robot B2B non configuré pour ${supplier.name}` };
    }

    if (searchResult && searchResult.error) {
      return NextResponse.json({ success: false, error: searchResult.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: searchResult
    });

  } catch (error) {
    console.error("B2B API Error:", error);
    return NextResponse.json({ success: false, error: "Erreur interne" }, { status: 500 });
  }
}
