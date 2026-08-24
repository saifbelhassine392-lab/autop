import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// IDs réels des admins hardcodés (pour résoudre les IDs fictifs)
const HARDCODED_ADMIN_IDS: Record<string, string> = {
  'admin-id':    'cms5ys5r2000111h9o9zxmrd4',
  'admin-id-fr': 'cms59idvc0000vrogaeuuq3h8',
};

function isAdminRole(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'ADMIN' || r === 'PROFESSIONAL';
}

// Récupérer la session admin depuis l'en-tête X-Admin-Profile (fallback localStorage)
async function getAdminFromHeader(req: NextRequest): Promise<{ id: string; name: string; role: string } | null> {
  const profileName = req.headers.get('X-Admin-Profile');
  if (!profileName) return null;
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'PROFESSIONAL'] } },
      select: { id: true, name: true, role: true }
    });
    if (adminUser) {
      return { id: adminUser.id, name: profileName, role: adminUser.role };
    }
  } catch (e) {}
  return null;
}

// Résoudre le senderId fictif vers un ID réel
function resolveSenderId(rawId: string | null | undefined): string | null {
  if (!rawId) return null;
  return HARDCODED_ADMIN_IDS[rawId] || rawId;
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const adminFromHeader = !session ? await getAdminFromHeader(req) : null;
    const user = session ? (session.user as any) : adminFromHeader;
    const userRole = session ? (session.user as any)?.role : adminFromHeader?.role;

    const { searchParams } = new URL(req.url);
    const targetConvKey = searchParams.get('convKey'); // 'user:ID' ou 'guest:email'
    const targetUserId = searchParams.get('userId');   // backward compat

    // ── ADMIN ──────────────────────────────────────────────────────────────
    if (user && isAdminRole(userRole)) {
      if (targetConvKey || targetUserId) {
        const key = targetConvKey || targetUserId!;
        let messages: any[];
        if (key.startsWith('guest:')) {
          const guestEmail = key.replace('guest:', '');
          messages = await prisma.chatMessage.findMany({
            where: { guestEmail },
            orderBy: { createdAt: 'asc' }
          });
        } else {
          const uid = key.replace('user:', '');
          messages = await prisma.chatMessage.findMany({
            where: { userId: uid },
            orderBy: { createdAt: 'asc' }
          });
        }
        return NextResponse.json({ success: true, data: messages });
      }

      // Liste toutes les conversations uniques (par userId ou guestEmail)
      const allMessages = await prisma.chatMessage.findMany({
        where: {
          OR: [
            { userId: { not: null } },
            { guestEmail: { not: null } }
          ]
        },
        include: {
          user: { select: { id: true, name: true, firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Dédupliquer par clé de conversation
      const seen = new Set<string>();
      const conversations: any[] = [];
      for (const msg of allMessages) {
        const key = msg.userId ? `user:${msg.userId}` : `guest:${msg.guestEmail}`;
        if (!seen.has(key)) {
          seen.add(key);
          conversations.push({
            convKey: key,
            userId: msg.userId,
            user: msg.user,
            guestEmail: msg.guestEmail,
            guestName: msg.guestName,
            lastMessage: msg
          });
        }
      }

      return NextResponse.json({ success: true, data: conversations });
    }

    // ── CLIENT CONNECTÉ ────────────────────────────────────────────────────
    if (session && session.user) {
      const userId = (session.user as any).id;
      // Résoudre si ID fictif
      const realUserId = HARDCODED_ADMIN_IDS[userId] || userId;
      const messages = await prisma.chatMessage.findMany({
        where: { userId: realUserId },
        orderBy: { createdAt: 'asc' }
      });
      return NextResponse.json({ success: true, data: messages });
    }

    // ── VISITEUR ANONYME (par guestEmail dans header ou param) ─────────────
    const guestEmail = searchParams.get('guestEmail');
    if (guestEmail) {
      const messages = await prisma.chatMessage.findMany({
        where: { guestEmail: guestEmail.toLowerCase() },
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

// ─── POST ─────────────────────────────────────────────────────────────────────
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
      // Pour envoi client authentifié ou admin
      userId: targetUserId,
      guestEmail: targetGuestEmail,
      senderName: providedSenderName,
      // Pour visiteurs anonymes
      guestName,
      guestEmail,
    } = body;

    if ((!content || content.trim() === '') && !attachment) {
      return NextResponse.json({ success: false, error: 'Le message est requis' }, { status: 400 });
    }

    // ── CAS 1 : ADMIN répond à un client ──────────────────────────────────
    if (sessionUser && isAdminRole(userRole)) {
      const activeProfile = req.headers.get('X-Admin-Profile') || providedSenderName || 'Admin';
      const rawSenderId = sessionUser.id;
      const resolvedSenderId = resolveSenderId(rawSenderId);

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
        // Répondre à un client authentifié
        messageData.userId = targetUserId;
      } else if (targetGuestEmail || (targetUserId && targetUserId.startsWith('guest:'))) {
        // Répondre à un visiteur anonyme
        const email = targetGuestEmail || targetUserId!.replace('guest:', '');
        messageData.guestEmail = email;
        // Récupérer le guestName depuis les messages existants
        const prevMsg = await prisma.chatMessage.findFirst({ where: { guestEmail: email } });
        messageData.guestName = prevMsg?.guestName || null;
      } else {
        return NextResponse.json({ success: false, error: 'Destinataire requis pour répondre' }, { status: 400 });
      }

      const message = await prisma.chatMessage.create({ data: messageData });
      return NextResponse.json({ success: true, data: message });
    }

    // ── CAS 2 : CLIENT CONNECTÉ envoie un message ─────────────────────────
    if (session && session.user) {
      const userId = (session.user as any).id;
      const realUserId = HARDCODED_ADMIN_IDS[userId] || userId;
      const senderName = (session.user as any).name ||
        `${(session.user as any).firstName || ''} ${(session.user as any).lastName || ''}`.trim() ||
        (session.user as any).email || 'Client';

      const message = await prisma.chatMessage.create({
        data: {
          userId: realUserId,
          senderId: realUserId,
          senderName,
          isAdmin: false,
          content: content || '',
          reference: reference || null,
          attachmentData: attachment?.data || null,
          attachmentName: attachment?.name || null,
          attachmentType: attachment?.type || null,
        }
      });
      return NextResponse.json({ success: true, data: message });
    }

    // ── CAS 3 : VISITEUR ANONYME (guestName + guestEmail fournis) ─────────
    if (guestName && guestEmail) {
      const normalizedEmail = guestEmail.toLowerCase().trim();
      const message = await prisma.chatMessage.create({
        data: {
          userId: null,
          senderId: null,
          senderName: guestName,
          isAdmin: false,
          content: content || '',
          reference: reference || null,
          guestName,
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
      error: 'Authentification requise ou nom/email invité manquant'
    }, { status: 401 });

  } catch (error: any) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
