import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "b2bUrl" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "b2bLogin" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "b2bPassword" TEXT;`);
    return NextResponse.json({ success: true, message: "Migration B2B réussie sur la base de données !" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
