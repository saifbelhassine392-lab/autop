import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// IDs réels des admins hardcodés (pour résoudre les IDs fictifs de dev)
const HARDCODED_ADMIN_IDS: Record<string, string> = {
  'admin-id':    'cms5ys5r2000111h9o9zxmrd4',
  'admin-id-fr': 'cms59idvc0000vrogaeuuq3h8',
};

function isAdminRole(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'ADMIN' || r === 'PROFESSIONAL';
}

// Récupérer la session admin depuis l'en-tête X-Admin-Profile (fallback localStorage profil local)
async function getAdminFromHeader(req: NextRequest): Promise<{ id: string; name: string; role: string } | null> {
  const profileName = req.headers.get('X-Admin-Profile');
  if (!profileName) return null;
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'PROFESSIONAL'] } },
      select: { id: true, name: true, firstName: true, lastName: true, role: true }
    });
    if (adminUser) {
      return { id: adminUser.id, name: profileName, role: adminUser.role };
    }
  } catch (e) {}
  return null;
}

function resolveSenderId(rawId: string | null | undefined): string | null {
  if (!rawId) return null;
  return HARDCODED_ADMIN_IDS[rawId] || rawId;
}

// ─── GET /api/chat ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const adminFromHeader = !session ? await getAdminFromHeader(req) : null;
    const user = session ? (session.user as any) : adminFromHeader;
    const userRole = session ? (session.user as any)?.role : adminFromHeader?.role;

    const { searchParams } = new URL(req.url);
    const targetConvKey = searchParams.get('convKey'); // 'user:ID' ou 'guest:email'
    const targetUserId = searchParams.get('userId');   // compatibilité

    // ── 1. VUE ADMIN ─────────────────────────────────────────────────────────
    if (user && isAdminRole(userRole)) {
      if (targetConvKey || targetUserId) {
        const key = targetConvKey || (targetUserId ? `user:${targetUserId}` : '');
        let messages: any[];

        if (key.startsWith('guest:')) {
          const guestEmail = key.replace('guest:', '').toLowerCase();
          messages = await prisma.chatMessage.findMany({
            where: { guestEmail },
            orderBy: { createdAt: 'asc' }
          });
        } else {
          const uid = key.replace('user:', '');
          // Récupérer les messages par userId ou si l'utilisateur a un email associé
          const targetUser = await prisma.user.findUnique({
            where: { id: uid },
            select: { id: true, email: true }
          });

          messages = await prisma.chatMessage.findMany({
            where: {
              OR: [
                { userId: uid },
                ...(targetUser?.email ? [{ guestEmail: targetUser.email.toLowerCase() }] : [])
              ]
            },
            orderBy: { createdAt: 'asc' }
          });
        }
        return NextResponse.json({ success: true, data: messages });
      }

      // Récupérer toutes les conversations avec les profils utilisateurs complets
      const allMessages = await prisma.chatMessage.findMany({
        where: {
          OR: [
            { userId: { not: null } },
            { guestEmail: { not: null } }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Dédupliquer et structurer par conversation
      const seen = new Set<string>();
      const conversations: any[] = [];

      for (const msg of allMessages) {
        const key = msg.userId ? `user:${msg.userId}` : `guest:${msg.guestEmail?.toLowerCase()}`;
        if (!key || seen.has(key)) continue;
        seen.add(key);

        // Nom d'affichage propre du client (priorité nom complet du compte)
        const clientFullName = msg.user?.name?.trim()
          || `${msg.user?.firstName || ''} ${msg.user?.lastName || ''}`.trim()
          || msg.guestName?.trim()
          || msg.user?.email
          || msg.guestEmail
          || 'Client';

        conversations.push({
          convKey: key,
          userId: msg.userId,
          user: msg.user ? {
            ...msg.user,
            displayName: clientFullName
          } : null,
          displayName: clientFullName,
          guestEmail: msg.guestEmail,
          guestName: msg.guestName,
          lastMessage: msg
        });
      }

      return NextResponse.json({ success: true, data: conversations });
    }

    // ── 2. VUE CLIENT CONNECTÉ ───────────────────────────────────────────────
    if (session && session.user) {
      const userId = (session.user as any).id;
      const realUserId = HARDCODED_ADMIN_IDS[userId] || userId;
      const userEmail = (session.user as any).email?.toLowerCase();

      const messages = await prisma.chatMessage.findMany({
        where: {
          OR: [
            { userId: realUserId },
            ...(userEmail ? [{ guestEmail: userEmail }] : [])
          ]
        },
        orderBy: { createdAt: 'asc' }
      });
      return NextResponse.json({ success: true, data: messages });
    }

    // ── 3. VUE VISITEUR INVITÉ ───────────────────────────────────────────────
    const guestEmail = searchParams.get('guestEmail');
    if (guestEmail) {
      const messages = await prisma.chatMessage.findMany({
        where: { guestEmail: guestEmail.toLowerCase().trim() },
        orderBy: { createdAt: 'asc' }
      });
      return NextResponse.json({ success: true, data: messages });
    }

    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
  } catch (error: any) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST /api/chat ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const adminFromHeader = !session ? await getAdminFromHeader(req) : null;
    const sessionUser = session ? (session.user as any) : adminFromHeader;
    const userRole = session ? (session.user as any)?.role : adminFromHeader?.role;

    const body = await req.json();
    const {
      content,
      reference,
      attachment,
      // Côté Admin pour cibler un client
      userId: targetUserId,
      guestEmail: targetGuestEmail,
      senderName: providedSenderName,
      // Côté Invité
      guestName,
      guestEmail,
    } = body;

    if ((!content || content.trim() === '') && !attachment) {
      return NextResponse.json({ success: false, error: 'Le message est requis' }, { status: 400 });
    }

    // ── CAS 1 : ADMIN RÉPOND À UN CLIENT ─────────────────────────────────────
    if (sessionUser && isAdminRole(userRole)) {
      const activeProfile = req.headers.get('X-Admin-Profile') || providedSenderName || 'Support AutoP';
      const resolvedSenderId = resolveSenderId(sessionUser.id);

      let messageData: any = {
        senderId: resolvedSenderId,
        senderName: activeProfile,
        isAdmin: true,
        content: content || '',
        reference: reference || null,
        attachmentData: attachment?.data || null,
        attachmentName: attachment?.name || null,
        attachmentType: attachment?.type || null,
      };

      if (targetUserId && !targetUserId.startsWith('guest:')) {
        const cleanUid = targetUserId.replace('user:', '');
        messageData.userId = cleanUid;
        // Lier aussi l'email pour synchronisation complète
        const targetUser = await prisma.user.findUnique({ where: { id: cleanUid }, select: { email: true } });
        if (targetUser?.email) messageData.guestEmail = targetUser.email.toLowerCase();
      } else if (targetGuestEmail || (targetUserId && targetUserId.startsWith('guest:'))) {
        const email = (targetGuestEmail || targetUserId!.replace('guest:', '')).toLowerCase().trim();
        messageData.guestEmail = email;
        const prevMsg = await prisma.chatMessage.findFirst({ where: { guestEmail: email } });
        messageData.guestName = prevMsg?.guestName || null;
      } else {
        return NextResponse.json({ success: false, error: 'Destinataire requis pour répondre' }, { status: 400 });
      }

      const message = await prisma.chatMessage.create({ data: messageData });
      return NextResponse.json({ success: true, data: message });
    }

    // ── CAS 2 : CLIENT CONNECTÉ ENVOIE UN MESSAGE ────────────────────────────
    if (session && session.user && !isAdminRole(userRole)) {
      const userId = (session.user as any).id;
      const realUserId = HARDCODED_ADMIN_IDS[userId] || userId;

      const dbUser = await prisma.user.findUnique({
        where: { id: realUserId },
        select: { id: true, name: true, firstName: true, lastName: true, email: true }
      });

      const clientDisplayName = dbUser?.name?.trim()
        || `${dbUser?.firstName || ''} ${dbUser?.lastName || ''}`.trim()
        || (session.user as any).name?.trim()
        || (session.user as any).email
        || 'Client';

      const clientEmail = dbUser?.email?.toLowerCase() || (session.user as any).email?.toLowerCase() || null;

      const message = await prisma.chatMessage.create({
        data: {
          userId: realUserId,
          senderId: realUserId,
          senderName: clientDisplayName,
          isAdmin: false,
          content: content || '',
          reference: reference || null,
          guestEmail: clientEmail,
          guestName: clientDisplayName,
          attachmentData: attachment?.data || null,
          attachmentName: attachment?.name || null,
          attachmentType: attachment?.type || null,
        }
      });
      return NextResponse.json({ success: true, data: message });
    }

    // ── CAS 3 : VISITEUR INVITÉ ENVOIE UN MESSAGE ────────────────────────────
    if (guestName && guestEmail) {
      const normalizedEmail = guestEmail.toLowerCase().trim();
      const message = await prisma.chatMessage.create({
        data: {
          userId: null,
          senderId: null,
          senderName: guestName.trim(),
          isAdmin: false,
          content: content || '',
          reference: reference || null,
          guestName: guestName.trim(),
          guestEmail: normalizedEmail,
          attachmentData: attachment?.data || null,
          attachmentName: attachment?.name || null,
          attachmentType: attachment?.type || null,
        }
      });
      return NextResponse.json({ success: true, data: message });
    }

    return NextResponse.json({
      success: false,
      error: 'Veuillez vous connecter ou renseigner vos coordonnées pour envoyer un message'
    }, { status: 401 });

  } catch (error: any) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
