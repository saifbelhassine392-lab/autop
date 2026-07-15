import { NextRequest, NextResponse } from 'next/server';
import https from "https";
import axios from 'axios';

// Create an HTTPS agent that ignores SSL certificate errors (for fetch)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function scrapeSTEQ(query: string, b2bLogin: string, b2bPassword: string) {
  try {
    // 1. Get initial cookie & Login
    const initialRes = await axios.get("https://b2bsteq.com/", {
      headers: { "User-Agent": "Mozilla/5.0" },
      httpsAgent
    });
    
    let sessionCookie = "";
    const initialSetCookie = initialRes.headers["set-cookie"];
    if (initialSetCookie) {
      sessionCookie = initialSetCookie[0].split(";")[0];
    }

    const loginParams = new URLSearchParams();
    loginParams.append("UserCode", b2bLogin);
    loginParams.append("UserPassword", b2bPassword);
    loginParams.append("UserSubmit", "");

    const loginRes = await axios.post("https://b2bsteq.com/", loginParams.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": sessionCookie,
        "User-Agent": "Mozilla/5.0",
      },
      httpsAgent,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });

    const loginCookies = loginRes.headers["set-cookie"];
    console.log("Login Res Status:", loginRes.status);
    console.log("Login Cookies:", loginCookies);
    if (loginCookies) {
      const loginStr = loginCookies.join(";");
      if (loginStr.includes("deleted")) {
        throw new Error("Identifiants B2B invalides. Veuillez les corriger dans 'Modifier le fournisseur'.");
      }
      sessionCookie = loginCookies[0].split(";")[0];
    }

    // 2. Search
    const searchParams = new URLSearchParams();
    searchParams.append("MySearchType", "1");
    searchParams.append("MySearchKey", query);
    searchParams.append("MySearchSubmit", "");

    const searchRes = await axios.post("https://b2bsteq.com/form-recherche.html", searchParams.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": sessionCookie,
        "User-Agent": "Mozilla/5.0",
      },
      httpsAgent
    });

    console.log("Session Cookie used:", sessionCookie);
    console.log("Search Res Status:", searchRes.status);
    
    const html = searchRes.data;
    console.log("HTML Type:", typeof html);
    if (typeof html === "string") {
      console.log("HTML Length:", html.length);
      console.log("Has Login?", html.includes("Se connecter") || html.includes("Mot de passe") || html.includes("password"));
      console.log("Has ApiJsonItemAll?", html.includes("ApiJsonItemAll"));
    }
    
    // 3. Extract JSON from HTML
    const jsonMatch = typeof html === "string" ? html.match(/var ApiJsonItemAll = (\[.*?\]);/) : null;
    if (!jsonMatch) {
      if (typeof html === "string" && (html.includes("VOTRE MOT DE PASSE") || html.includes("UserPassword"))) {
        throw new Error("Identifiants B2B invalides ou expirés. Veuillez les vérifier dans 'Modifier le fournisseur'.");
      }
      return { price: 0, discount: 0, availability: "Non Trouvé (Regex Failed)" };
    }

    const items = JSON.parse(jsonMatch[1]);
    if (items.length === 0) {
      return { price: 0, discount: 0, availability: "Non Disponible" };
    }

    // Map all items instead of just returning the best one
    const parsedItems = items.map((i: any) => ({
      name: i.ItemNumberEquiv || i.ItemNo || '',
      brand: i.ItemBrandEquiv || '',
      price: parseFloat(i.UnitPrice) || 0,
      discount: parseFloat(i.MaxDiscount) || 0,
      availability: parseInt(i.Available) > 0 ? "Disponible" : "Sur Commande",
      rawStock: parseInt(i.Available) || 0,
      available: parseInt(i.Available) > 0
    }));

    // Find the best item for backward compatibility (if needed)
    let bestItem = parsedItems.find((i: any) => i.available);
    if (!bestItem) bestItem = parsedItems[0];

    return {
      price: bestItem.price,
      discount: bestItem.discount,
      availability: bestItem.availability,
      rawStock: bestItem.rawStock,
      items: parsedItems
    };

  } catch (err: any) {
    console.error("STEQ Scrape Error:", err);
    return { price: 0, discount: 0, availability: `Erreur: ${err.message}` };
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
      if (!supplier.b2bLogin || !supplier.b2bPassword) {
        return NextResponse.json({ success: false, error: "Veuillez configurer les accès B2B de STEQ (Modifier Fournisseur)" }, { status: 400 });
      }
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      const res = await scrapeSTEQ(searchQuery, supplier.b2bLogin, supplier.b2bPassword);
      searchResult = {
        price: res.price,
        discount: res.discount,
        available: (res.rawStock ?? 0) > 0 || res.availability === "Disponible",
        stock: res.rawStock,
        availability: res.availability,
        items: (res as any).items
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

    if (searchResult && !searchResult.error && searchResult.items && searchResult.items.length > 0) {
      try {
        let category = await prisma.category.findFirst();
        if (!category) {
          category = await prisma.category.create({ data: { name: 'Général', slug: 'general' } });
        }
        for (const item of searchResult.items) {
          if (!item.name) continue;
          const ref = item.name.toUpperCase();
          const existing = await prisma.product.findFirst({
            where: { OR: [{ reference: ref }, { sku: ref }] }
          });
          if (!existing) {
            await prisma.product.create({
              data: {
                sku: ref,
                reference: ref,
                name: `ARTICLE ${ref}`,
                slug: `article-${ref.toLowerCase()}-${Date.now()}`,
                price: item.price || 0,
                costPrice: (item.price || 0) * 0.8,
                stock: 0,
                brand: item.brand || null,
                categoryId: category.id,
                status: 'ACTIVE'
              }
            });
          }
        }
      } catch (e) {
        console.error("Auto-register error:", e);
      }
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
