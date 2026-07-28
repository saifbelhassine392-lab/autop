import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return new NextResponse('URL manquante', { status: 400 });
    }

    // Server-to-server fetch bypassing browser X-Frame-Options / CORS restrictions
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    let html = await response.text();

    // Inject base tag so relative assets load properly from target site
    const baseUrl = new URL(targetUrl).origin;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head><base href="${baseUrl}/" target="_self">`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD><base href="${baseUrl}/" target="_self">`);
    }

    // Return HTML with X-Frame-Options headers removed
    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(html, {
      status: response.status,
      headers
    });

  } catch (err: any) {
    return new NextResponse(`Erreur proxy frame: ${err.message}`, { status: 500 });
  }
}
