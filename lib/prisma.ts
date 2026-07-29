import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl() {
  const candidates = [
    path.join(process.cwd(), 'prisma', 'dev.db'),
    path.join(process.cwd(), 'dev.db'),
    path.join(process.cwd(), 'resources', 'app', 'prisma', 'dev.db'),
    path.join(process.cwd(), 'resources', 'app', 'dev.db'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const fileUrl = `file:${c.replace(/\\/g, '/')}`;
      console.log(`[Prisma] Found SQLite database at: ${c}`);
      return fileUrl;
    }
  }

  const defaultPath = path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
  return `file:${defaultPath}`;
}

const resolvedUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: resolvedUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
