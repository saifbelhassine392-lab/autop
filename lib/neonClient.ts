import { neon } from '@neondatabase/serverless';

const rawUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '';
const connectionString = (rawUrl && rawUrl.startsWith('postgresql'))
  ? rawUrl
  : "postgresql://neondb_owner:npg_8WEqwMUlL2yP@ep-noisy-king-adp4rgrl.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

export const neonSql = neon(connectionString);

export async function fetchProductionDevis() {
  try {
    const rows: any[] = await neonSql`
      SELECT 
        d.id, d."createdAt", d."updatedAt", d."vehicleBrand", d."vehicleModel", d."vehicleYear", d."vehicleVin", d.notes, d.status, d."totalPrice", d."userId", d."managedById",
        u.name as "userName", u.email as "userEmail", u.phone as "userPhone"
      FROM "Devis" d
      LEFT JOIN "User" u ON d."userId" = u.id
      ORDER BY d."createdAt" DESC
    `;

    const devisList = [];
    for (const r of rows) {
      const items: any[] = await neonSql`
        SELECT id, name, reference, quantity, price, discount
        FROM "DevisItem"
        WHERE "devisId" = ${r.id}
      `;

      devisList.push({
        id: r.id,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        vehicleBrand: r.vehicleBrand,
        vehicleModel: r.vehicleModel,
        vehicleYear: r.vehicleYear,
        vehicleVin: r.vehicleVin,
        notes: r.notes,
        status: r.status,
        totalPrice: parseFloat(r.totalPrice) || 0,
        clientEmail: r.userEmail || '',
        clientName: r.userName || '',
        user: {
          name: r.userName,
          email: r.userEmail,
          phone: r.userPhone
        },
        items: items.map(it => ({
          ...it,
          price: parseFloat(it.price) || 0
        }))
      });
    }

    return devisList;
  } catch (err) {
    console.error("Neon Direct HTTP error:", err);
    return [];
  }
}

export async function fetchProductionQuotes(clientEmail?: string) {
  try {
    let rows: any[] = [];
    if (clientEmail) {
      rows = await neonSql`
        SELECT 
          q.id, q."createdAt", q.brand, q.model, q.vin, q.remarks, q.status, q."clientName", q."clientEmail", q."managedById",
          m.name as "managedByName"
        FROM "Quote" q
        LEFT JOIN "AdminProfile" m ON q."managedById" = m.id
        WHERE LOWER(q."clientEmail") = ${clientEmail.trim().toLowerCase()}
        ORDER BY q."createdAt" DESC
      `;
    } else {
      rows = await neonSql`
        SELECT 
          q.id, q."createdAt", q.brand, q.model, q.vin, q.remarks, q.status, q."clientName", q."clientEmail", q."managedById",
          m.name as "managedByName"
        FROM "Quote" q
        LEFT JOIN "AdminProfile" m ON q."managedById" = m.id
        ORDER BY q."createdAt" DESC
      `;
    }

    const quotes = [];
    for (const r of rows) {
      const items: any[] = await neonSql`
        SELECT id, reference, designation, quantity
        FROM "QuoteItem"
        WHERE "quoteId" = ${r.id}
      `;

      quotes.push({
        id: r.id,
        createdAt: r.createdAt,
        brand: r.brand,
        model: r.model,
        vin: r.vin,
        remarks: r.remarks,
        status: r.status,
        clientName: r.clientName,
        clientEmail: r.clientEmail,
        vehicleBrand: r.brand,
        vehicleModel: r.model,
        managedById: r.managedById,
        managedBy: r.managedByName ? { id: r.managedById, name: r.managedByName } : null,
        items: items.map(it => ({
          id: it.id,
          reference: it.reference,
          designation: it.designation,
          quantity: parseInt(it.quantity) || 1
        }))
      });
    }

    return quotes;
  } catch (err) {
    console.error("Neon Direct HTTP Quotes error:", err);
    return [];
  }
}

export async function saveProductionQuote(quote: {
  id: string;
  clientName: string;
  clientEmail: string;
  brand: string;
  model: string;
  vin?: string;
  mileage?: number;
  remarks?: string;
  photo?: string;
  photoName?: string;
  items?: { reference: string; designation: string; quantity: number }[];
}) {
  try {
    const createdAt = new Date();
    await neonSql`
      INSERT INTO "Quote" (
        "id", "createdAt", "brand", "model", "vin", "mileage", "remarks", "photo", "photoName", "status", "clientName", "clientEmail"
      ) VALUES (
        ${quote.id}, ${createdAt}, ${quote.brand || ''}, ${quote.model || ''}, ${quote.vin || ''}, 
        ${quote.mileage || 0}, ${quote.remarks || ''}, ${quote.photo || null}, ${quote.photoName || null}, 
        ${'PENDING'}, ${quote.clientName}, ${quote.clientEmail.trim().toLowerCase()}
      )
      ON CONFLICT ("id") DO UPDATE SET
        "clientName" = EXCLUDED."clientName",
        "clientEmail" = EXCLUDED."clientEmail",
        "brand" = EXCLUDED."brand",
        "model" = EXCLUDED."model",
        "vin" = EXCLUDED."vin",
        "remarks" = EXCLUDED."remarks",
        "status" = EXCLUDED."status"
    `;

    if (quote.items && quote.items.length > 0) {
      for (let i = 0; i < quote.items.length; i++) {
        const it = quote.items[i];
        const itemId = `${quote.id}_item_${i + 1}`;
        await neonSql`
          INSERT INTO "QuoteItem" ("id", "reference", "designation", "quantity", "quoteId")
          VALUES (${itemId}, ${it.reference || ''}, ${it.designation || ''}, ${it.quantity || 1}, ${quote.id})
          ON CONFLICT ("id") DO NOTHING
        `;
      }
    }

    console.log(`[Neon Sync] Quote ${quote.id} saved in Neon Postgres`);
    return true;
  } catch (err: any) {
    console.error("[Neon Sync] Error saving quote to Neon:", err.message);
    return false;
  }
}

export async function updateProductionQuote(quoteId: string, data: { status?: string; managedByName?: string }) {
  try {
    let managedById: string | null = null;
    if (data.managedByName && data.managedByName !== 'NON ASSIGNÉ') {
      const existingProfile = await neonSql`
        SELECT id FROM "AdminProfile" WHERE name = ${data.managedByName} LIMIT 1
      `;
      if (existingProfile.length > 0) {
        managedById = existingProfile[0].id;
      } else {
        const newProfId = `prof_${Date.now()}`;
        await neonSql`
          INSERT INTO "AdminProfile" ("id", "name", "role")
          VALUES (${newProfId}, ${data.managedByName}, ${'ADMIN'})
          ON CONFLICT ("name") DO NOTHING
        `;
        managedById = newProfId;
      }
    }

    if (data.status && managedById !== undefined) {
      await neonSql`
        UPDATE "Quote"
        SET "status" = ${data.status}::"QuoteStatus", "managedById" = ${managedById}
        WHERE "id" = ${quoteId}
      `;
    } else if (data.status) {
      await neonSql`
        UPDATE "Quote"
        SET "status" = ${data.status}::"QuoteStatus"
        WHERE "id" = ${quoteId}
      `;
    } else if (managedById !== undefined) {
      await neonSql`
        UPDATE "Quote"
        SET "managedById" = ${managedById}
        WHERE "id" = ${quoteId}
      `;
    }

    return true;
  } catch (err: any) {
    console.error("[Neon Sync] Error updating quote in Neon:", err.message);
    return false;
  }
}

export async function deleteProductionQuote(quoteId: string) {
  try {
    await neonSql`DELETE FROM "QuoteItem" WHERE "quoteId" = ${quoteId}`;
    await neonSql`DELETE FROM "Quote" WHERE "id" = ${quoteId}`;
    return true;
  } catch (err: any) {
    console.error("[Neon Sync] Error deleting quote from Neon:", err.message);
    return false;
  }
}
