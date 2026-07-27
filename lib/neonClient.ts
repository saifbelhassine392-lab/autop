import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "postgresql://neondb_owner:npg_8WEqwMUlL2yP@ep-noisy-king-adp4rgrl.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

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
        SELECT id, name, reference, quantity, price, "partType", "supplierName", "isConcessionnaire"
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

export async function fetchProductionQuotes() {
  try {
    const rows: any[] = await neonSql`
      SELECT 
        q.id, q."createdAt", q.brand, q.model, q.vin, q.remarks, q.status, q."clientName", q."clientEmail", q."managedById",
        m.name as "managedByName"
      FROM "Quote" q
      LEFT JOIN "AdminProfile" m ON q."managedById" = m.id
      ORDER BY q."createdAt" DESC
    `;

    const quotes = [];
    for (const r of rows) {
      const items: any[] = await neonSql`
        SELECT id, name, reference, quantity
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
        items
      });
    }

    return quotes;
  } catch (err) {
    console.error("Neon Direct HTTP Quotes error:", err);
    return [];
  }
}
