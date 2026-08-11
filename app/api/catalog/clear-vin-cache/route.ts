import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { neonSql } from '@/lib/neonClient';

/**
 * DELETE /api/catalog/clear-vin-cache
 * Clears cached VIN entries that were incorrectly identified (INCONNU brand)
 * or a specific VIN if provided
 */
export async function DELETE(req: Request) {
  try {
    const { vin } = await req.json().catch(() => ({}));

    if (vin) {
      // Clear specific VIN
      const cleanVin = vin.trim().toUpperCase();
      await prisma.vehicleVinCatalog.deleteMany({ where: { vin: cleanVin } }).catch(() => null);
      await neonSql`DELETE FROM "VehicleVinCatalog" WHERE vin = ${cleanVin}`.catch(() => null);
      return NextResponse.json({ success: true, message: `Cache VIN supprimé pour: ${cleanVin}` });
    } else {
      // Clear all INCONNU/bad entries
      const deleted = await prisma.vehicleVinCatalog.deleteMany({
        where: { OR: [{ brand: 'INCONNU' }, { brand: 'MARUTI SUZUKI' }, { engine: 'À IDENTIFIER VIA PARTSOUQ' }] }
      }).catch(() => ({ count: 0 }));
      await neonSql`DELETE FROM "VehicleVinCatalog" WHERE brand = 'INCONNU' OR brand = 'MARUTI SUZUKI'`.catch(() => null);
      return NextResponse.json({ success: true, message: `${deleted?.count || 0} entrées incorrectes supprimées du cache` });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
