import { NextRequest, NextResponse } from 'next/server';
import https from "https";
import axios from 'axios';

// Create an HTTPS agent that ignores SSL certificate errors (for fetch)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

let cachedCookie: string | null = null;

function parseSTEQHtml(html: string) {
  const jsonMatch = html.match(/var ApiJsonItemAll = (\[.*?\]);/);
  if (!jsonMatch) return { price: 0, discount: 0, availability: "Non Disponible" };

  const items = JSON.parse(jsonMatch[1]);
  if (items.length === 0) {
    return { price: 0, discount: 0, availability: "Non Disponible" };
  }

  const parsedItems = items.map((i: any) => ({
    name: i.ItemNumberEquiv || i.ItemNo || '',
    brand: i.ItemBrandEquiv || '',
    price: parseFloat(i.UnitPrice) || 0,
    discount: parseFloat(i.MaxDiscount) || 0,
    availability: parseInt(i.Available) > 0 ? "Disponible" : "Sur Commande",
    rawStock: parseInt(i.Available) || 0,
    available: parseInt(i.Available) > 0
  }));

  let bestItem = parsedItems.find((i: any) => i.available);
  if (!bestItem) bestItem = parsedItems[0];

  return {
    price: bestItem.price,
    discount: bestItem.discount,
    availability: bestItem.availability,
    rawStock: bestItem.rawStock,
    items: parsedItems
  };
}

async function scrapeSTEQ(query: string, b2bLogin: string, b2bPassword: string) {
  try {
    let sessionCookie = cachedCookie || "";
    let html = "";
    let searchRes;

    // 1. Tenter la recherche directement si on a un cookie en cache
    if (sessionCookie) {
      console.log("[STEQ Scraper] Essai avec le cookie de session en cache...");
      const searchParams = new URLSearchParams();
      searchParams.append("MySearchType", "1");
      searchParams.append("MySearchKey", query);
      searchParams.append("MySearchSubmit", "");

      searchRes = await fetch("https://b2bsteq.com/form-recherche.html", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": sessionCookie,
          "User-Agent": "Mozilla/5.0",
        },
        body: searchParams.toString(),
      });

      html = await searchRes.text();
      const isLoggedOut = html.includes("VOTRE MOT DE PASSE") || html.includes("UserPassword") || html.includes("Se connecter");
      
      if (!isLoggedOut && html.includes("ApiJsonItemAll")) {
        console.log("[STEQ Scraper] Cookie en cache valide ! Recherche réussie.");
        return parseSTEQHtml(html);
      }
      console.log("[STEQ Scraper] Cookie en cache expiré ou invalide. Re-connexion requise.");
    }

    // 2. Connexion initiale pour récupérer le cookie si nécessaire
    console.log("[STEQ Scraper] Connexion initiale à b2bsteq.com...");
    const initialRes = await fetch("https://b2bsteq.com/", {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    
    sessionCookie = "";
    const initCookies = initialRes.headers.get("set-cookie") || "";
    if (initCookies.includes("PHPSESSID")) {
      const match = initCookies.match(/PHPSESSID=[^;]+/);
      if (match) sessionCookie = match[0];
    }

    console.log("[STEQ Scraper] Soumission des identifiants...");
    const loginParams = new URLSearchParams();
    loginParams.append("UserCode", b2bLogin);
    loginParams.append("UserPassword", b2bPassword);
    loginParams.append("UserSubmit", "“ E N T R E R ”");

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

    // 3. Recherche après connexion
    console.log("[STEQ Scraper] Recherche...");
    const searchParams = new URLSearchParams();
    searchParams.append("MySearchType", "1");
    searchParams.append("MySearchKey", query);
    searchParams.append("MySearchSubmit", "");

    searchRes = await fetch("https://b2bsteq.com/form-recherche.html", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": sessionCookie,
        "User-Agent": "Mozilla/5.0",
      },
      body: searchParams.toString(),
    });

    html = await searchRes.text();
    
    // 4. Extraction
    const jsonMatch = html.match(/var ApiJsonItemAll = (\[.*?\]);/);
    if (!jsonMatch) {
      if (html.includes("VOTRE MOT DE PASSE") || html.includes("UserPassword") || html.includes("Se connecter")) {
        throw new Error("Identifiants B2B invalides ou expirés. Veuillez les vérifier dans 'Modifier le fournisseur'.");
      }
      return { price: 0, discount: 0, availability: "Non Trouvé (Regex Failed)" };
    }

    // Mettre en cache le cookie fonctionnel
    cachedCookie = sessionCookie;
    console.log("[STEQ Scraper] Connexion réussie et cookie mis en cache.");

    return parseSTEQHtml(html);

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

    if (supName.includes("STEQ") || supplier.b2bUrl?.includes("steq")) {
      if (!supplier.b2bLogin || !supplier.b2bPassword) {
        return NextResponse.json({ success: false, error: "Veuillez configurer les accès B2B (Login et Mot de passe) dans Modifier Fournisseur" }, { status: 400 });
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
    } else if (supplier.b2bLogin && supplier.b2bPassword) {
      // Pour les autres portails B2B configurés avec identifiants
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      try {
        const res = await scrapeSTEQ(searchQuery, supplier.b2bLogin, supplier.b2bPassword);
        if (res && res.price > 0) {
          searchResult = {
            price: res.price,
            discount: res.discount,
            available: (res.rawStock ?? 0) > 0 || res.availability === "Disponible",
            stock: res.rawStock,
            availability: res.availability,
            items: (res as any).items
          };
        } else {
          searchResult = {
            price: 0,
            discount: 0,
            available: false,
            availability: "Accès B2B connecté sur le portail fournisseur (" + (supplier.b2bUrl || supplier.name) + ")",
            portalUrl: supplier.b2bUrl
          };
        }
      } catch (err: any) {
        searchResult = { error: `Accès B2B configuré pour ${supplier.name}. Veuillez vérifier la connexion au portail ${supplier.b2bUrl || ''}` };
      }
    } else {
      searchResult = { error: `Veuillez renseigner le site B2B, l'identifiant et le mot de passe dans 'Modifier Fournisseur' pour ${supplier.name}` };
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
