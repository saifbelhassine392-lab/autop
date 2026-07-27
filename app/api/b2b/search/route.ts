import { NextRequest, NextResponse } from 'next/server';
import https from "https";

// HTTPS agent that ignores SSL certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Per-supplier cookie cache to avoid session cross-contamination
const supplierCookies: Record<string, string> = {};

function parseSTEQHtml(html: string) {
  const jsonMatch = html.match(/var ApiJsonItemAll = (\[.*?\]);/);
  if (!jsonMatch) return { price: 0, discount: 0, availability: "Non Disponible", items: [] };

  try {
    const items = JSON.parse(jsonMatch[1]);
    if (!Array.isArray(items) || items.length === 0) {
      return { price: 0, discount: 0, availability: "Non Disponible", items: [] };
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
      available: bestItem.available,
      items: parsedItems
    };
  } catch (e) {
    return { price: 0, discount: 0, availability: "Erreur de lecture du catalogue", items: [] };
  }
}

async function scrapeSTEQ(supplierId: string, query: string, b2bLogin: string, b2bPassword: string) {
  try {
    let sessionCookie = supplierCookies[supplierId] || "";
    let html = "";
    let searchRes;

    // 1. Try search directly if cookie is cached
    if (sessionCookie) {
      console.log(`[STEQ Scraper] Test du cookie en cache pour le fournisseur ${supplierId}...`);
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

    // 2. Initial connection to get session cookie
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

    // 3. Perform search
    console.log("[STEQ Scraper] Soumission de la recherche...");
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
    
    // 4. Extract
    const jsonMatch = html.match(/var ApiJsonItemAll = (\[.*?\]);/);
    if (!jsonMatch) {
      if (html.includes("VOTRE MOT DE PASSE") || html.includes("UserPassword") || html.includes("Se connecter")) {
        throw new Error("Identifiants B2B invalides ou expirés pour STEQ.");
      }
      return { price: 0, discount: 0, availability: "Aucun résultat trouvé", items: [] };
    }

    // Cache valid cookie for this supplier
    supplierCookies[supplierId] = sessionCookie;
    console.log("[STEQ Scraper] Connexion réussie et cookie mis en cache.");

    return parseSTEQHtml(html);

  } catch (err: any) {
    console.error("STEQ Scrape Error:", err);
    return { price: 0, discount: 0, availability: `Erreur STEQ: ${err.message}`, items: [] };
  }
}

async function scrapeFAD(supplierId: string, query: string, b2bLogin: string, b2bPassword: string, b2bUrl?: string | null) {
  try {
    console.log(`[FAD Scraper] Connexion au portail FAD B2B (Code: ${b2bLogin})...`);
    
    // Attempt FAD B2B API Auth
    let authToken = supplierCookies[supplierId] || "";

    if (!authToken) {
      const authRes = await fetch("https://pb.fadpro.tn/api/collections/users/auth-with-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify({ identity: b2bLogin, password: b2bPassword }),
      });

      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData?.token) {
          authToken = authData.token;
          supplierCookies[supplierId] = authToken;
          console.log("[FAD Scraper] Connexion FAD réussie avec token mis en cache.");
        }
      }
    }

    if (authToken) {
      // Query FAD TecDoc / Articles API with auth token
      const searchRes = await fetch(`https://pb.fadpro.tn/api/tecdoc/articles?search=${encodeURIComponent(query)}`, {
        headers: {
          "Authorization": authToken,
          "User-Agent": "Mozilla/5.0"
        }
      });

      if (searchRes.ok) {
        const data = await searchRes.json();
        const articlesList = Array.isArray(data) ? data : (data?.items || data?.records || []);

        if (articlesList.length > 0) {
          const parsedItems = articlesList.map((i: any) => ({
            name: i.articleNumber || i.reference || query,
            brand: i.brand || i.marque || "FAD",
            price: parseFloat(i.price || i.unitPrice || i.prix) || 0,
            discount: parseFloat(i.discount || i.remise) || 0,
            availability: (i.stock || i.available) ? "Disponible en Stock" : "Sur Commande",
            rawStock: parseInt(i.stock || i.available) || 0,
            available: (i.stock || i.available || 0) > 0
          }));

          const bestItem = parsedItems.find((i: any) => i.available) || parsedItems[0];
          return {
            price: bestItem.price,
            discount: bestItem.discount,
            availability: bestItem.availability,
            rawStock: bestItem.rawStock,
            available: bestItem.available,
            items: parsedItems
          };
        }
      }
    }

    // Response if reference wasn't returned by search API
    return {
      price: 0,
      discount: 0,
      available: false,
      availability: `Compte FAD B2B actif (Code Client: ${b2bLogin}). Référence ${query} non disponible en direct.`,
      items: []
    };

  } catch (err: any) {
    console.error("FAD Scrape Error:", err);
    return {
      price: 0,
      discount: 0,
      available: false,
      availability: `Accès B2B FAD configuré (${b2bLogin}). Vérifiez l'accès sur ${b2bUrl || 'fadpro.tn'}.`,
      items: []
    };
  }
}

export async function POST(request: Request) {
  try {
    const { supplierId, query, reference } = await request.json();
    const searchQuery = (query || reference || '').trim();

    if (!supplierId || !searchQuery) {
      return NextResponse.json({ success: false, error: "Fournisseur et référence de recherche requis" }, { status: 400 });
    }

    const { prisma } = await import('@/lib/prisma');
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Fournisseur introuvable" }, { status: 404 });
    }

    let searchResult: any = null;
    const supName = supplier.name.toUpperCase();
    const b2bUrl = (supplier.b2bUrl || '').toLowerCase();

    // Direct supplier B2B routing logic
    if (supName.includes("STEQ") || b2bUrl.includes("steq")) {
      if (!supplier.b2bLogin || !supplier.b2bPassword) {
        return NextResponse.json({ success: false, error: "Veuillez configurer les accès B2B (Login et Mot de passe) pour STEQ dans Modifier Fournisseur" }, { status: 400 });
      }
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      const res = await scrapeSTEQ(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword);
      searchResult = {
        price: res.price,
        discount: res.discount,
        available: (res.rawStock ?? 0) > 0 || res.availability === "Disponible",
        stock: res.rawStock,
        availability: res.availability,
        items: res.items
      };
    } else if (supName.includes("FAD") || b2bUrl.includes("fad")) {
      if (!supplier.b2bLogin || !supplier.b2bPassword) {
        return NextResponse.json({ success: false, error: "Veuillez configurer les accès B2B (Login et Mot de passe) pour FAD dans Modifier Fournisseur" }, { status: 400 });
      }
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      const res = await scrapeFAD(supplier.id, searchQuery, supplier.b2bLogin, supplier.b2bPassword, supplier.b2bUrl);
      searchResult = {
        price: res.price,
        discount: res.discount,
        available: res.available,
        stock: res.rawStock,
        availability: res.availability,
        items: res.items
      };
    } else if (supplier.b2bLogin && supplier.b2bPassword) {
      // General custom B2B configuration handling for other suppliers
      searchResult = {
        price: 0,
        discount: 0,
        available: false,
        availability: `Accès B2B configuré pour ${supplier.name} (Identifiant: ${supplier.b2bLogin})`,
        portalUrl: supplier.b2bUrl || undefined,
        items: []
      };
    } else {
      searchResult = { 
        error: `Veuillez renseigner le site B2B, l'identifiant et le mot de passe dans 'Modifier Fournisseur' pour ${supplier.name}` 
      };
    }

    if (searchResult && searchResult.error) {
      return NextResponse.json({ success: false, error: searchResult.error }, { status: 400 });
    }

    // Auto-register discovered products into database if any match
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
                slug: `article-${ref.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
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

  } catch (error: any) {
    console.error("B2B API Error:", error);
    return NextResponse.json({ success: false, error: `Erreur serveur: ${error.message}` }, { status: 500 });
  }
}
