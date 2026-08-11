import { NextResponse } from 'next/server';
import { syncOdooCatalog, getOdooSession } from '@/lib/odoo';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = parseInt(body.limit || 300, 10);

    const result = await syncOdooCatalog(limit);
    return NextResponse.json({
      success: true,
      message: `Synchronisation Odoo terminée avec succès : ${result.imported} ajoutés, ${result.updated} mis à jour.`,
      data: result
    });
  } catch (error: any) {
    console.error("[API Odoo Sync] Erreur:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message || "Erreur de synchronisation avec Odoo ERP"
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getOdooSession();
    return NextResponse.json({
      success: true,
      status: "CONNECTED",
      database: "AUTOP_PRODUCTION",
      user: session.name,
      uid: session.uid
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      status: "DISCONNECTED",
      error: error.message
    }, { status: 500 });
  }
}
