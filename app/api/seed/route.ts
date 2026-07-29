import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

  return NextResponse.json({ message: "Admin créé", admin: { id: admin.id, email: admin.email } });
}