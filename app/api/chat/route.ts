import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const HARDCODED_ADMIN_IDS: Record<string, string> = {
  'admin-id':    'cms5ys5r2000111h9o9zxmrd4',
  'admin-id-fr': 'cms59idvc0000vrogaeuuq3h8',
};

// ─── GET /api/chat ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);

    const mode = searchParams.get('mode'); // 'admin' | 'client'
    const targetConvKey = searchParams.get('convKey');
    const targetUserId = searchParams.get('userId');
    const clientGuestEmail = searchParams.get('guestEmail');
    const clientId = searchParams.get('clientId');
    const adminProfileHeader = req.headers.get('x-admin-profile') || req.headers.get('X-Admin-Profile');

    const isAdminSession = session?.user && ['ADMIN', 'PROFESSIONAL'].includes(((session.user as any).role || '').toUpperCase());
    const isAdminRequest = mode === 'admin' || (Boolean(adminProfileHeader) && mode !== 'client');

    // ─────────────────────────────────────────────────────────────────────────
    // 1. MODE ADMIN CONSOLE (Liste des conversations ou messages d'un client)
    // ─────────────────────────────────────────────────────────────────────────
    if (isAdminRequest || (isAdminSession && mode !== 'client' && (targetConvKey || !targetUserId))) {
      // 1.A. Récupérer les messages d'un client spécifique
      if (targetConvKey || targetUserId) {
        const key = (targetConvKey || (targetUserId ? `user:${targetUserId}` : '')).trim();
        let messages: any[] = [];

        if (key.startsWith('guest:')) {
          const email = key.replace('guest:', '').toLowerCase().trim();
          messages = await prisma.chatMessage.findMany({
            where: { guestEmail: email },
            orderBy: { createdAt: 'asc' }
          });
        } else if (key.startsWith('client:')) {
          const cId = key.replace('client:', '').trim();
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
          const uid = key.replace('user:', '').trim();
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

      // 1.B. Récupérer la liste complète des conversations
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
        let key = '';
        if (msg.userId) {
          key = `user:${msg.userId}`;
        } else if (msg.guestEmail) {
          key = `guest:${msg.guestEmail.toLowerCase()}`;
        } else if (msg.senderId && !msg.isAdmin) {
          key = `client:${msg.senderId}`;
        } else {
          key = `guest:visiteur-${msg.id}`;
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
          user: msg.user ? { ...msg.user, displayName: clientFullName } : null,
          displayName: clientFullName,
          guestEmail: msg.guestEmail,
          guestName: msg.guestName || clientFullName,
          lastMessage: msg
        });
      }

      return NextResponse.json({ success: true, data: conversations });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. MODE CLIENT WIDGET (Toujours renvoyer les messages du client demandeur)
    // ─────────────────────────────────────────────────────────────────────────
    const sessionUserId = (session?.user as any)?.id;
    const resolvedSessionUserId = sessionUserId ? (HARDCODED_ADMIN_IDS[sessionUserId] || sessionUserId) : null;
    const sessionUserEmail = (session?.user as any)?.email?.toLowerCase();
    const explicitUserId = targetUserId ? (HARDCODED_ADMIN_IDS[targetUserId] || targetUserId) : null;

    const effectiveUserId = explicitUserId || resolvedSessionUserId;
    const effectiveEmail = clientGuestEmail?.toLowerCase().trim() || sessionUserEmail;

    const orConditions: any[] = [];
    if (effectiveUserId) orConditions.push({ userId: effectiveUserId });
    if (effectiveEmail) orConditions.push({ guestEmail: effectiveEmail });
    if (clientId) {
      orConditions.push({ senderId: clientId });
      orConditions.push({ userId: clientId });
    }

    let clientMessages: any[] = [];
    if (orConditions.length > 0) {
      clientMessages = await prisma.chatMessage.findMany({
        where: { OR: orConditions },
        orderBy: { createdAt: 'asc' }
      });
    }

    return NextResponse.json({ success: true, data: clientMessages });

  } catch (error: any) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}

// ─── POST /api/chat ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const {
      content,
      reference,
      attachment,
      mode, // 'admin' | 'client'
      // Côté Admin (cible)
      convKey: targetConvKey,
      userId: targetUserId,
      guestEmail: targetGuestEmail,
      senderName: providedSenderName,
      // Côté Client
      clientId,
      guestName,
      guestEmail,
    } = body;

    const trimmedContent = (content || '').trim();
    if (!trimmedContent && !attachment) {
      return NextResponse.json({ success: false, error: 'Le contenu du message est requis' }, { status: 400 });
    }

    const adminProfileHeader = req.headers.get('x-admin-profile') || req.headers.get('X-Admin-Profile');
    const isAdminSession = session?.user && ['ADMIN', 'PROFESSIONAL'].includes(((session.user as any).role || '').toUpperCase());
    const isAdminAction = mode === 'admin' || (Boolean(adminProfileHeader) && mode !== 'client');

    // ─────────────────────────────────────────────────────────────────────────
    // CAS 1 : ENVOI PAR L'ADMINISTRATEUR (RÉPONSE DANS LA CONSOLE ADMIN)
    // ─────────────────────────────────────────────────────────────────────────
    if (isAdminAction) {
      const activeAdminName = adminProfileHeader || (session?.user as any)?.name || providedSenderName || 'Support AutoP';
      const adminSenderId = (session?.user as any)?.id || 'admin-root';
      const conv = (targetConvKey || targetUserId || '').trim();

      let targetUid: string | null = null;
      let targetEmail: string | null = null;
      let targetGName: string | null = null;

      if (conv.startsWith('guest:')) {
        targetEmail = conv.replace('guest:', '').toLowerCase().trim();
      } else if (conv.startsWith('client:')) {
        targetUid = conv.replace('client:', '').trim();
      } else if (conv.startsWith('user:')) {
        targetUid = conv.replace('user:', '').trim();
      } else if (targetUserId) {
        targetUid = targetUserId.replace('user:', '').trim();
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
          senderId: adminSenderId,
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

    // ─────────────────────────────────────────────────────────────────────────
    // CAS 2 : ENVOI PAR LE CLIENT (WIDGET CLIENT)
    // ─────────────────────────────────────────────────────────────────────────
    let clientUid: string | null = null;
    let clientName = 'Client';
    let clientEmail: string | null = (guestEmail || '').toLowerCase().trim() || null;

    if (session?.user) {
      const rawUid = (session.user as any).id;
      clientUid = HARDCODED_ADMIN_IDS[rawUid] || rawUid;

      if (clientUid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: clientUid },
          select: { id: true, name: true, firstName: true, lastName: true, email: true }
        });

        clientName = dbUser?.name?.trim()
          || `${dbUser?.firstName || ''} ${dbUser?.lastName || ''}`.trim()
          || (session.user as any).name?.trim()
          || (session.user as any).email
          || 'Client';

        clientEmail = dbUser?.email?.toLowerCase() || (session.user as any).email?.toLowerCase() || clientEmail;
      }
    } else {
      clientName = (guestName || '').trim() || (clientEmail ? clientEmail.split('@')[0] : 'Client Invité');
    }

    const clientSenderId = clientUid || clientId || (clientEmail ? `guest_${clientEmail}` : `anon_${Date.now()}`);

    const message = await prisma.chatMessage.create({
      data: {
        userId: clientUid,
        senderId: clientSenderId,
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

  } catch (error: any) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
