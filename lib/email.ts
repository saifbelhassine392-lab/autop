import { Resend } from 'resend';
import { sendEmailViaOdoo } from './odoo';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: {
    filename: string;
    content: string | Buffer;
  }[];
}

export const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'saifbelhassine392@gmail.com';

export async function sendEmail({ to, subject, html, from, attachments }: EmailOptions) {
  // Nettoyage et validation stricte des pièces jointes
  const validAttachments = Array.isArray(attachments)
    ? attachments.filter((att) => {
        if (!att || !att.filename) return false;
        const cnt: any = att.content;
        if (typeof cnt === 'string') return cnt.trim().length > 0;
        if (Buffer.isBuffer(cnt)) return cnt.length > 0;
        return Boolean(cnt);
      })
    : [];

  const finalAttachments = validAttachments.length > 0 ? validAttachments : undefined;

  // 1. Essai via Resend si clé d'API valide configurée
  if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder')) {
    try {
      const emailPayload: any = {
        from: from || process.env.EMAIL_FROM || 'AUTOP <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      };

      if (finalAttachments && finalAttachments.length > 0) {
        emailPayload.attachments = finalAttachments;
      }

      const { data, error } = await resend.emails.send(emailPayload);
      if (!error && data?.id) {
        console.log('[Resend] E-mail transmis avec succès:', data.id);
        return { id: data.id, success: true, provider: 'resend' };
      }
      console.warn('[Resend] Échec envoi, basculement vers le serveur Odoo ERP:', error?.message);
    } catch (resendErr: any) {
      console.warn('[Resend] Erreur, basculement vers le serveur Odoo ERP:', resendErr.message);
    }
  }

  // 2. Transport Prioritaire / Fallback Garanti : Serveur de Messagerie Odoo ERP (autop-soft.autop.tn)
  try {
    const odooResult = await sendEmailViaOdoo({
      to,
      subject,
      html,
      from: from || 'seifeddine.belhessine@autop.tn',
      attachments: finalAttachments
    });
    console.log(`✅ [Email AUTOP] E-mail réel envoyé via Odoo (ID: ${odooResult.id}) à destination de :`, to);
    return { id: odooResult.id, success: true, provider: 'odoo' };
  } catch (odooErr: any) {
    console.error('❌ [Email AUTOP] Erreur fatale transmission email:', odooErr.message);
    return { id: 'error', success: false, error: odooErr.message };
  }
}

export function orderConfirmationTemplate(orderNumber: string, total: number, items: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0ea5e9;">Confirmation de commande</h1>
      <p>Bonjour,</p>
      <p>Votre commande <strong>${orderNumber}</strong> a bien ete recue.</p>
      <p>Montant total: <strong>${total.toFixed(2)} EUR</strong></p>
      <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
        ${items}
      </div>
      <p>Nous vous tiendrons informe de l'avancement de votre commande.</p>
      <p style="color: #666;">L'equipe AUTOP</p>
    </div>
  `;
}

export function quoteEmailTemplate(quoteNumber: string, total: number, validUntil: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0ea5e9;">Votre devis AUTOP</h1>
      <p>Bonjour,</p>
      <p>Veuillez trouver ci-joint votre devis <strong>${quoteNumber}</strong>.</p>
      <p>Montant total TTC: <strong>${total.toFixed(2)} EUR</strong></p>
      <p>Ce devis est valable jusqu'au <strong>${validUntil}</strong>.</p>
      <p style="color: #666;">L'equipe AUTOP</p>
    </div>
  `;
}