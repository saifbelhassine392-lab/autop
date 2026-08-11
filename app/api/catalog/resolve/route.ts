import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { vin } = await req.json();
    const cleanVin = (vin || 'VF36D9HZC9L013574').trim().toUpperCase();

    if (!cleanVin || cleanVin.length < 5) {
      return NextResponse.json({ success: false, error: 'Code VIN invalide' }, { status: 400 });
    }

    // Determine Brand & Service Name based on VIN prefix
    let brand = 'UNKNOWN';
    let model = 'VÉHICULE NON SPÉCIFIÉ';
    let service = 'vw_parts';

    if (cleanVin.startsWith('VF3')) {
      brand = 'PEUGEOT';
      model = 'PEUGEOT 407 1.6 HDi (DAM 11873CJ)';
      service = 'peugeot_parts';
    } else if (cleanVin.startsWith('VF7')) {
      brand = 'CITROËN';
      model = 'CITROËN C4 II / C5 III';
      service = 'citroen_parts';
    } else if (cleanVin.startsWith('WDD') || cleanVin.startsWith('WDB')) {
      brand = 'MERCEDES-BENZ';
      model = 'MERCEDES-BENZ CLASSE C (W204) C 220 CDI';
      service = 'mb_parts';
    } else if (cleanVin.startsWith('WVW') || cleanVin.startsWith('WAU') || cleanVin.startsWith('ZZZ')) {
      brand = 'VOLKSWAGEN / AUDI';
      model = 'VOLKSWAGEN GOLF VII / PASSAT';
      service = 'vw_parts';
    } else if (cleanVin.startsWith('WBA') || cleanVin.startsWith('WBS')) {
      brand = 'BMW';
      model = 'BMW SÉRIE 3 / 5';
      service = 'bmw_parts';
    } else if (cleanVin.startsWith('VF1')) {
      brand = 'RENAULT';
      model = 'RENAULT MÉGANE / CLIO';
      service = 'renault_parts';
    } else if (cleanVin.startsWith('ZFA')) {
      brand = 'FIAT';
      model = 'FIAT PUNTO / DUCATO';
      service = 'fiat_parts';
    } else if (cleanVin.startsWith('KMH') || cleanVin.startsWith('KNA')) {
      brand = 'HYUNDAI / KIA';
      model = 'HYUNDAI TUCSON / KIA SPORTAGE';
      service = 'hyundai_parts';
    } else if (cleanVin.startsWith('LZW')) {
      brand = 'CHEVROLET';
      model = 'CHEVROLET CAPTIVA II / GROOVE 1.5 Turbo (SGMW)';
      service = 'chevrolet_parts';
    } else if (cleanVin.startsWith('LVV')) {
      brand = 'CHERY';
      model = 'CHERY TIGGO / ARRIZO 1.5 L';
      service = 'chery_parts';
    } else if (cleanVin.startsWith('L56') || cleanVin.startsWith('LHG') || cleanVin.startsWith('LBV')) {
      brand = 'GEELY';
      model = 'GEELY GX3 / COOLRAY / EMGRAND 1.5 L';
      service = 'geely_parts';
    } else if (cleanVin.startsWith('LVS') || cleanVin.startsWith('LZY')) {
      brand = 'MG';
      model = 'MG ZS / MG 3 / MG 5';
      service = 'mg_parts';
    } else if (cleanVin.startsWith('LTV') || cleanVin.startsWith('LSV')) {
      brand = 'HAVAL / GREAT WALL';
      model = 'HAVAL H6 / JOLION / WINGLE';
      service = 'haval_parts';
    } else if (cleanVin.startsWith('MA3') || cleanVin.startsWith('JS1')) {
      brand = 'SUZUKI';
      model = 'SUZUKI SWIFT / DZIRE / CELERIO';
      service = 'suzuki_parts';
    } else if (cleanVin.startsWith('MA1')) {
      brand = 'MAHINDRA';
      model = 'MAHINDRA KUV100 / XUV500';
      service = 'mahindra_parts';
    } else {
      brand = `VÉHICULE (${cleanVin.substring(0, 3)})`;
      model = `VÉHICULE IDENTIFIÉ PAR VIN (${cleanVin.substring(0, 3)})`;
      service = 'vw_parts';
    }

    // Exact Deep Link URLs bypassing home/search pages
    const partslinkDeepUrl = `https://www.partslink24.com/pl24-app/${service}/${cleanVin}/0/vehicle`;
    const partslinkSsoUrl = `https://www.partslink24.com/partslink24/user/login.do?redirectUrl=${encodeURIComponent(`/partslink24/launchCatalog.do?service=${service}&redirect=${encodeURIComponent(partslinkDeepUrl)}`)}&org=fr-247756&username=Gesinistre2&password=${encodeURIComponent('AuT@p2025')}`;
    
    const partsnumberDeepUrl = `https://login.partsnumber.com/portal/webclient/index.html?desktopId=pn&action=start-session#/catalog?vin=${cleanVin}`;
    
    const partsouqDeepUrl = `https://partsouq.com/en/search/all?q=${cleanVin}`;

    return NextResponse.json({
      success: true,
      vin: cleanVin,
      brand,
      model,
      service,
      recommendedCatalog: 'partslink24',
      platforms: [
        {
          id: 'partslink24',
          name: 'Partslink24',
          status: 'AVAILABLE',
          account: 'fr-247756 / Gesinistre2',
          deepUrl: partslinkDeepUrl,
          ssoUrl: partslinkSsoUrl
        },
        {
          id: 'partsnumber',
          name: 'PartsNumber',
          status: 'AVAILABLE',
          account: 'autopacc1 / autopacc2',
          deepUrl: partsnumberDeepUrl
        },
        {
          id: 'partsouq',
          name: 'PartSouq',
          status: 'AVAILABLE',
          account: 'Libre',
          deepUrl: partsouqDeepUrl
        }
      ]
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
