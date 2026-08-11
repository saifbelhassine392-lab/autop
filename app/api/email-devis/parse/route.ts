import { NextResponse } from 'next/server';
import { parseEmailQuoteText } from '@/lib/emailQuoteParser';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawText = String(body.text || body.content || body.rawText || '').trim();
    const defaultSupplier = body.supplierName || body.supplier || undefined;

    if (!rawText) {
      return NextResponse.json({ success: false, error: "Contenu du devis ou email requis" }, { status: 400 });
    }

    const parsed = parseEmailQuoteText(rawText, defaultSupplier);
    return NextResponse.json({
      success: true,
      data: parsed
    });
  } catch (error: any) {
    console.error("[API Email Parse] Erreur:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
