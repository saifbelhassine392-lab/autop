import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl() {
  const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  const candidates = [
    path.join(process.cwd(), 'prisma', 'dev.db'),
    path.join(process.cwd(), 'dev.db'),
    path.join(process.cwd(), 'resources', 'app', 'prisma', 'dev.db'),
    path.join(process.cwd(), 'resources', 'app', 'dev.db'),
  ];

  let foundFile = '';
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      foundFile = c;
      break;
    }
  }

  if (isVercel && foundFile) {
    const tmpDbPath = '/tmp/dev.db';
    try {
      if (!fs.existsSync(tmpDbPath)) {
        fs.copyFileSync(foundFile, tmpDbPath);
        console.log(`[Prisma] Copied database to writable /tmp/dev.db`);
      }
      return `file:${tmpDbPath}`;
    } catch (err) {
      console.warn("[Prisma] Could not copy to /tmp, fallback to read-only mode:", err);
      const safeUrl = foundFile.replace(/\\/g, '/');
      return `file:${safeUrl}?mode=ro`;
    }
  }

  if (foundFile) {
    const safeUrl = foundFile.replace(/\\/g, '/');
    return `file:${safeUrl}`;
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
