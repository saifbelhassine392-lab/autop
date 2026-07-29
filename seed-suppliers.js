const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const suppliers = [
  { name: 'FAD' },
  { name: 'STEQ' },
  { name: 'CDG' },
  { name: 'SAGAP' },
  { name: 'AAP' },
  { name: 'PROPARTS' },
  { name: 'ITALCAR' },
  { name: 'CARGROS' },
  { name: 'ALPHA FORD' },
  { name: 'GPG' },
  { name: 'UNIVERS AUTO' },
  { name: 'STE ROUTE X' },
  { name: 'SOPIC' },
  { name: 'SOCOFA GROS' }
];

async function main() {
  for (const s of suppliers) {
    const exists = await prisma.supplier.findFirst({
      where: { name: s.name }
    });
    if (!exists) {
      await prisma.supplier.create({
        data: {
          name: s.name,
          isActive: true
        }
      });
      console.log(`Created supplier: ${s.name}`);
    } else {
      console.log(`Supplier already exists: ${s.name}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
