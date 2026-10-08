import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const ODOO_DASH_PASSWORD = process.env.ODOO_DASH_PASSWORD || "AutopOdoo2026!Securite";
const AUTH_SALT = process.env.NEXTAUTH_SECRET || "autop_odoo_secure_salt_2026";

function getExpectedToken(): string {
  return crypto.createHmac('sha256', AUTH_SALT).update(ODOO_DASH_PASSWORD).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { password, action } = body;

    // Handle logout action
    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Déconnexion réussie' });
      response.cookies.set('odoo_auth_token', '', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
      });
      return response;
    }

    // Handle password validation
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Veuillez saisir un mot de passe.' },
        { status: 400 }
      );
    }

    if (password.trim() !== ODOO_DASH_PASSWORD.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe incorrect. Accès refusé.' },
        { status: 401 }
      );
    }

    const token = getExpectedToken();
    const response = NextResponse.json({
      success: true,
      message: 'Authentification réussie',
      token
    });

    // Set secure HttpOnly session cookie valid for 24h
    response.cookies.set('odoo_auth_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 heures
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const cookieToken = req.cookies.get('odoo_auth_token')?.value;
  const headerToken = req.headers.get('x-odoo-auth');
  const expectedToken = getExpectedToken();

  const isAuthenticated = Boolean(
    (cookieToken && cookieToken === expectedToken) ||
    (headerToken && headerToken === expectedToken)
  );

  return NextResponse.json({ authenticated: isAuthenticated });
}
