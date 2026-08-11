import { NextResponse } from 'next/server';
import { searchOdooByReference } from '@/lib/odoo';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || searchParams.get('reference') || searchParams.get('ref') || '';

    if (!query.trim()) {
      return NextResponse.json({ success: false, error: "Référence ou mot-clé requis" }, { status: 400 });
    }

    const items = await searchOdooByReference(query);
    return NextResponse.json({
      success: true,
      data: {
        supplierName: "Odoo ERP (AUTOP)",
        query,
        count: items.length,
        items
      }
    });
  } catch (error: any) {
    console.error("[API Odoo Search] Erreur:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
