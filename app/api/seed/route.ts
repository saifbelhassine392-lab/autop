import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureCatalogSeeded } from "@/lib/autoSeed";

export const dynamic = 'force-dynamic';

export async function GET() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@autop.tn" },
    update: {},
    create: {
      email: "admin@autop.tn",
      name: "Admin AUTOP",
      password: hashedPassword,
      role: "admin",
    },
  });

  await ensureCatalogSeeded();

  const productCount = await prisma.product.count();
  const supplierCount = await prisma.supplier.count();

  return NextResponse.json({
    message: "Base de données alimentée avec succès",
    admin: { id: admin.id, email: admin.email },
    stats: { products: productCount, suppliers: supplierCount }
  });
}