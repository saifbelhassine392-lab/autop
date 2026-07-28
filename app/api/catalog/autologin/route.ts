import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { catalog, vin } = await req.json();
    const targetVin = (vin || 'WDD2040451A342772').trim().toUpperCase();

    if (catalog === 'partslink24') {
      // Partslink24 SSO / Auto-login parameters
      const loginUrl = "https://www.partslink24.com/partslink24/user/login.do";
      const redirectUrl = `/partslink24/launchCatalog.do?service=vw_parts&redirect=%2Fp5%2Flatest%2Fp5.html%23%252Fp5vwag%7Evw_parts%7Efr%7E${encodeURIComponent(targetVin)}`;
      
      const ssoUrl = `${loginUrl}?redirectUrl=${encodeURIComponent(redirectUrl)}&org=fr-247756&username=Gesinistre2&password=${encodeURIComponent('AuT@p2025')}`;
      
      return NextResponse.json({
        success: true,
        catalog: 'partslink24',
        vin: targetVin,
        url: ssoUrl,
        credentials: { org: 'fr-247756', user: 'Gesinistre2' }
      });
    }

    if (catalog === 'partsnumber') {
      const pnUrl = `https://login.partsnumber.com/portal/webclient/index.html?desktopId=pn&action=start-session#/`;
      return NextResponse.json({
        success: true,
        catalog: 'partsnumber',
        vin: targetVin,
        url: pnUrl,
        credentials: { user: 'autopacc1', pass: 'autopacc2' }
      });
    }

    // Default: PartSouq free VIN decoder
    const psUrl = `https://partsouq.com/en/search/all?q=${encodeURIComponent(targetVin)}`;
    return NextResponse.json({
      success: true,
      catalog: 'partsouq',
      vin: targetVin,
      url: psUrl
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
