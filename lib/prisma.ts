import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Utiliser la connexion directe (non-poolée) pour éviter les timeouts Neon en local
// Fallback sur DATABASE_URL si DATABASE_URL_UNPOOLED n'est pas défini
const datasourceUrl = process.env.DATABASE_URL_UNPOOLED
  ? `${process.env.DATABASE_URL_UNPOOLED}&connect_timeout=15&pool_timeout=15`
  : process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: datasourceUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;