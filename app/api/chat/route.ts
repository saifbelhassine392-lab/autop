import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// IDs réels des admins hardcodés (pour résoudre les comptes de dev)
const HARDCODED_ADMIN_IDS: Record<string, string> = {
  'admin-id':    'cms5ys5r2000111h9o9zxmrd4',
  'admin-id-fr': 'cms59idvc0000vrogaeuuq3h8',
};

function isAdminRole(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'ADMIN' || r === 'PROFESSIONAL';
}

// Récupérer la session admin depuis NextAuth ou en-tête profil admin
async function getAdminFromHeaderOrSession(req: NextRequest, session: any): Promise<{ id: string; name: string; role: string } | null> {
  if (session?.user && isAdminRole((session.user as any).role)) {
    return {
      id: (session.user as any).id,
      name: (session.user as any).name || 'Admin',
      role: (session.user as any).role
    };
  }

  const profileName = req.headers.get('x-admin-profile') || req.headers.get('X-Admin-Profile');
  if (profileName) {
    try {
      const adminUser = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'PROFESSIONAL'] } },
        select: { id: true, name: true, firstName: true, lastName: true, role: true }
      });
      return {
        id: adminUser?.id || 'admin-root',
        name: profileName,
        role: adminUser?.role || 'ADMIN'
      };
    } catch (e) {
      return { id: 'admin-root', name: profileName, role: 'ADMIN' };
    }
  }

  return null;
}

// ─── GET /api/chat ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const adminUser = await getAdminFromHeaderOrSession(req, session);

    const { searchParams } = new URL(req.url);
    const targetConvKey = searchParams.get('convKey');
    const targetUserId = searchParams.get('userId');
    const clientGuestEmail = searchParams.get('guestEmail');
    const clientId = searchParams.get('clientId');

    // ── 1. CONSOLE ADMIN (Lecture de toutes les conversations ou d'un client spécifique) ──
    if (adminUser) {
      if (targetConvKey || targetUserId) {
        const key = (targetConvKey || (targetUserId ? `user:${targetUserId}` : '')).trim();
        let messages: any[] = [];

        if (key.startsWith('guest:')) {
          const email = key.replace('guest:', '').toLowerCase();
          messages = await prisma.chatMessage.findMany({
            where: {
              OR: [
                { guestEmail: email },
                { reference: { contains: email } }
              ]
            },
            orderBy: { createdAt: 'asc' }
          });
        } else if (key.startsWith('client:')) {
          const cId = key.replace('client:', '');
          messages = await prisma.chatMessage.findMany({
            where: {
              OR: [
                { senderId: cId },
                { userId: cId }
              ]
            },
            orderBy: { createdAt: 'asc' }
          });
        } else {
          const uid = key.replace('user:', '');
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

      // Récupérer toutes les conversations pour l'admin
      const allMessages = await prisma.chatMessage.findMany({
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

      const seen = new Set<string>();
      const conversations: any[] = [];

      for (const msg of allMessages) {
        // Clé unique pour grouper la conversation
        let key = '';
        if (msg.userId) {
          key = `user:${msg.userId}`;
        } else if (msg.guestEmail) {
          key = `guest:${msg.guestEmail.toLowerCase()}`;
        } else if (msg.senderId && !msg.isAdmin) {
          key = `client:${msg.senderId}`;
        } else {
          key = `guest:anonyme-${msg.id}`;
        }

        if (seen.has(key)) continue;
        seen.add(key);

        const clientFullName = msg.user?.name?.trim()
          || `${msg.user?.firstName || ''} ${msg.user?.lastName || ''}`.trim()
          || msg.guestName?.trim()
          || msg.user?.email
          || msg.guestEmail
          || msg.senderName
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
          guestName: msg.guestName || clientFullName,
          lastMessage: msg
        });
      }

      return NextResponse.json({ success: true, data: conversations });
    }

    // ── 2. CLIENT CONNECTÉ (Historique complet par compte) ───────────────────
    if (session?.user) {
      const rawUserId = (session.user as any).id;
      const realUserId = HARDCODED_ADMIN_IDS[rawUserId] || rawUserId;
      const userEmail = (session.user as any).email?.toLowerCase();

      const messages = await prisma.chatMessage.findMany({
        where: {
          OR: [
            { userId: realUserId },
            ...(userEmail ? [{ guestEmail: userEmail }] : []),
            ...(clientId ? [{ senderId: clientId }] : [])
          ]
        },
        orderBy: { createdAt: 'asc' }
      });

      return NextResponse.json({ success: true, data: messages });
    }

    // ── 3. VISITEUR NON CONNECTÉ (Historique par email ou clientId) ──────────
    if (clientGuestEmail || clientId) {
      const messages = await prisma.chatMessage.findMany({
        where: {
          OR: [
            ...(clientGuestEmail ? [{ guestEmail: clientGuestEmail.toLowerCase().trim() }] : []),
            ...(clientId ? [{ senderId: clientId }, { userId: clientId }] : [])
          ]
        },
        orderBy: { createdAt: 'asc' }
      });
      return NextResponse.json({ success: true, data: messages });
    }

    // Si aucune info d'identification, retourner une liste vide sans erreur
    return NextResponse.json({ success: true, data: [] });

  } catch (error: any) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}

// ─── POST /api/chat ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const adminUser = await getAdminFromHeaderOrSession(req, session);

    const body = await req.json();
    const {
      content,
      reference,
      attachment,
      // Côté Admin (ciblage)
      userId: targetUserId,
      guestEmail: targetGuestEmail,
      convKey: targetConvKey,
      senderName: providedSenderName,
      // Côté Client / Visiteur
      guestName,
      guestEmail,
      clientId,
    } = body;

    const trimmedContent = (content || '').trim();
    if (!trimmedContent && !attachment) {
      return NextResponse.json({ success: false, error: 'Le contenu du message ou une pièce jointe est requis' }, { status: 400 });
    }

    // ── CAS 1 : RÉPONSE DE L'ADMINISTRATEUR ──────────────────────────────────
    if (adminUser) {
      const activeAdminName = adminUser.name || providedSenderName || 'Support AutoP';
      const conv = (targetConvKey || targetUserId || '').trim();

      let targetUid: string | null = null;
      let targetEmail: string | null = null;
      let targetGName: string | null = null;

      if (conv.startsWith('guest:')) {
        targetEmail = conv.replace('guest:', '').toLowerCase().trim();
      } else if (conv.startsWith('client:')) {
        targetUid = conv.replace('client:', '');
      } else if (conv.startsWith('user:')) {
        targetUid = conv.replace('user:', '');
      } else if (targetUserId) {
        targetUid = targetUserId.replace('user:', '');
      } else if (targetGuestEmail) {
        targetEmail = targetGuestEmail.toLowerCase().trim();
      }

      if (targetUid) {
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUid },
          select: { email: true, name: true, firstName: true, lastName: true }
        });
        if (targetUser) {
          targetEmail = targetUser.email?.toLowerCase() || targetEmail;
          targetGName = targetUser.name || `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim();
        }
      }

      const message = await prisma.chatMessage.create({
        data: {
          userId: targetUid,
          senderId: adminUser.id,
          senderName: activeAdminName,
          isAdmin: true,
          content: trimmedContent,
          reference: reference || null,
          guestEmail: targetEmail,
          guestName: targetGName,
          attachmentData: attachment?.data || null,
          attachmentName: attachment?.name || null,
          attachmentType: attachment?.type || null,
        }
      });

      return NextResponse.json({ success: true, data: message });
    }

    // ── CAS 2 : MESSAGE ENVOYÉ PAR UN CLIENT CONNECTÉ ───────────────────────
    if (session?.user && !adminUser) {
      const rawUserId = (session.user as any).id;
      const realUserId = HARDCODED_ADMIN_IDS[rawUserId] || rawUserId;

      const dbUser = await prisma.user.findUnique({
        where: { id: realUserId },
        select: { id: true, name: true, firstName: true, lastName: true, email: true }
      });

      const clientName = dbUser?.name?.trim()
        || `${dbUser?.firstName || ''} ${dbUser?.lastName || ''}`.trim()
        || (session.user as any).name?.trim()
        || (session.user as any).email
        || 'Client';

      const clientEmail = dbUser?.email?.toLowerCase() || (session.user as any).email?.toLowerCase() || null;

      const message = await prisma.chatMessage.create({
        data: {
          userId: realUserId,
          senderId: realUserId,
          senderName: clientName,
          isAdmin: false,
          content: trimmedContent,
          reference: reference || null,
          guestEmail: clientEmail,
          guestName: clientName,
          attachmentData: attachment?.data || null,
          attachmentName: attachment?.name || null,
          attachmentType: attachment?.type || null,
        }
      });

      return NextResponse.json({ success: true, data: message });
    }

    // ── CAS 3 : MESSAGE ENVOYÉ PAR UN VISITEUR (INVITÉ) ─────────────────────
    const finalGuestName = (guestName || '').trim() || (guestEmail ? guestEmail.split('@')[0] : 'Visiteur');
    const finalGuestEmail = (guestEmail || '').toLowerCase().trim() || null;
    const finalSenderId = clientId || (finalGuestEmail ? `guest_${finalGuestEmail}` : `anon_${Date.now()}`);

    const message = await prisma.chatMessage.create({
      data: {
        userId: null,
        senderId: finalSenderId,
        senderName: finalGuestName,
        isAdmin: false,
        content: trimmedContent,
        reference: reference || null,
        guestName: finalGuestName,
        guestEmail: finalGuestEmail,
        attachmentData: attachment?.data || null,
        attachmentName: attachment?.name || null,
        attachmentType: attachment?.type || null,
      }
    });

    return NextResponse.json({ success: true, data: message });

  } catch (error: any) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
