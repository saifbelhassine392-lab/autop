import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// IDs réels des admins hardcodés en base
const HARDCODED_ADMIN_IDS: Record<string, string> = {
  'admin-id':    'cms5ys5r2000111h9o9zxmrd4', // admin@autop.tn
  'admin-id-fr': 'cms59idvc0000vrogaeuuq3h8', // admin@autop.fr
};

// Helper: check if user is admin (handles all role variants)
function isAdminRole(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'ADMIN' || r === 'PROFESSIONAL';
}

// Helper: résoudre un senderId fictif vers un ID réel en DB
function resolveAdminSenderId(userId: string): string | null {
  return HARDCODED_ADMIN_IDS[userId] || null;
}

// Helper: vérifier l'en-tête X-Admin-Profile pour les sessions localStorage
async function getAdminFromHeader(req: NextRequest): Promise<{ id: string; name: string; role: string } | null> {
  const profileName = req.headers.get('X-Admin-Profile');
  if (!profileName) return null;

  // Essayer de trouver un admin en DB par son rôle
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'PROFESSIONAL'] } },
      select: { id: true, name: true, role: true }
    });
    if (adminUser) {
      return {
        id: adminUser.id,
        name: profileName, // Utiliser le nom du profil local (SAIF/AMINE/etc.)
        role: adminUser.role
      };
    }
  } catch (e) {
    // Ignorer les erreurs DB
  }
  return null;
}

// GET - Charger les conversations / messages
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Fallback: vérifier le header admin si pas de session
    const adminFromHeader = !session ? await getAdminFromHeader(req) : null;

    if (!session && !adminFromHeader) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const user = session ? (session.user as any) : adminFromHeader;
    const userRole = session ? (session.user as any).role : adminFromHeader?.role;
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    // Si admin
    if (isAdminRole(userRole)) {
      if (targetUserId) {
        // Charger tous les messages pour cet utilisateur
        const messages = await prisma.chatMessage.findMany({
          where: { userId: targetUserId },
          orderBy: { createdAt: 'asc' }
        });
        return NextResponse.json({ success: true, data: messages });
      } else {
        // Liste de toutes les conversations actives (utilisateurs uniques ayant envoyé/reçu des messages)
        const conversations = await prisma.chatMessage.findMany({
          distinct: ['userId'],
          orderBy: { userId: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });

        // Pour chaque conversation, récupérer le dernier message
        const data = await Promise.all(
          conversations.map(async (c) => {
            const lastMsg = await prisma.chatMessage.findFirst({
              where: { userId: c.userId },
              orderBy: { createdAt: 'desc' }
            });
            return {
              userId: c.userId,
              user: c.user,
              lastMessage: lastMsg
            };
          })
        );

        // Trier par date du dernier message descendant
        data.sort((a: any, b: any) => {
          return new Date(b.lastMessage?.createdAt || 0).getTime() - new Date(a.lastMessage?.createdAt || 0).getTime();
        });

        return NextResponse.json({ success: true, data });
      }
    } else {
      // Si client normal : charger uniquement ses propres messages
      const userId = (user as any).id;
      const messages = await prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      });
      return NextResponse.json({ success: true, data: messages });
    }
  } catch (error: any) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Envoyer un message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Fallback: vérifier le header admin si pas de session
    const adminFromHeader = !session ? await getAdminFromHeader(req) : null;

    if (!session && !adminFromHeader) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const user = session ? (session.user as any) : adminFromHeader;
    const userRole = session ? (session.user as any).role : adminFromHeader?.role;
    const body = await req.json();
    const { content, reference, userId, senderName: providedSenderName, attachment } = body;

    if ((!content || content.trim() === '') && !attachment) {
      return NextResponse.json({ success: false, error: 'Le contenu du message ou une pièce jointe est requis' }, { status: 400 });
    }

    let finalUserId = user.id;
    let isAdmin = false;

    if (isAdminRole(userRole)) {
      isAdmin = true;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Identifiant client requis pour répondre' }, { status: 400 });
      }
      finalUserId = userId;
    }

    // Résoudre le senderId — si l'ID est fictif, utiliser le vrai ID en DB
    let resolvedSenderId: string | null = user.id;
    if (resolvedSenderId && HARDCODED_ADMIN_IDS[resolvedSenderId]) {
      resolvedSenderId = HARDCODED_ADMIN_IDS[resolvedSenderId];
    }
    // Si toujours pas résolu, tenter de trouver un admin en DB
    if (isAdmin && (!resolvedSenderId || !HARDCODED_ADMIN_IDS[user.id] && !await prisma.user.findUnique({ where: { id: resolvedSenderId || '' } }).catch(() => null))) {
      const fallbackAdmin = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'PROFESSIONAL'] } },
        select: { id: true }
      });
      resolvedSenderId = fallbackAdmin?.id || null;
    }

    // For admin replies, use the provided senderName (active profile name like SAIF/AMINE/SAIFALLAH)
    const resolvedSenderName = isAdmin && providedSenderName
      ? providedSenderName
      : user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur';

    const message = await prisma.chatMessage.create({
      data: {
        userId: finalUserId,
        senderId: resolvedSenderId,
        senderName: resolvedSenderName,
        isAdmin,
        content: content || '',
        reference: reference || null,
        attachmentData: attachment?.data || null,
        attachmentName: attachment?.name || null,
        attachmentType: attachment?.type || null
      }
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
