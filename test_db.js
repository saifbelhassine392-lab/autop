const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const suppliers = await prisma.supplier.findMany({
            select: { id: true, name: true }
        });
        console.log("Suppliers in DB:", suppliers);
    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
