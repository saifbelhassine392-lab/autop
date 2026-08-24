'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare, Send, X, Paperclip, Image as ImageIcon, User } from 'lucide-react';

const GUEST_STORAGE_KEY = 'autop_chat_guest';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
};

export default function ClientChatWidget() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attachment, setAttachment] = useState<{ name: string; data: string; type: string } | null>(null);

  // Mode invité (non connecté)
  const [guestInfo, setGuestInfo] = useState<{ name: string; email: string } | null>(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState('');
  const [guestEmailInput, setGuestEmailInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMsgCountRef = useRef(0);

  // Ne pas afficher pour les admins
  const isAdmin = user?.role && ['ADMIN', 'PROFESSIONAL'].includes(user.role.toUpperCase());
  if (isAdmin) return null;

  // Charger l'info invité depuis localStorage au démarrage
  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY);
      if (stored) {
        try { setGuestInfo(JSON.parse(stored)); } catch {}
      }
    }
  }, [user]);

  // Ouvrir le chat via événement customisé (depuis catalogue, devis, etc.)
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      setIsOpen(true);
      if (e.detail?.reference) {
        setReference(e.detail.reference);
        setContent(`Bonjour, je souhaite connaître le prix de la référence ${e.detail.reference} (${e.detail.name || ''})`);
      }
    };
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  // Construire les paramètres de fetch selon le type de session
  const getFetchParams = useCallback(() => {
    if (user && !isAdmin) {
      // Client connecté → GET /api/chat (session gérée côté serveur)
      return { url: '/api/chat', init: {} };
    }
    if (guestInfo) {
      // Invité → GET /api/chat?guestEmail=xxx
      return { url: `/api/chat?guestEmail=${encodeURIComponent(guestInfo.email)}`, init: {} };
    }
    return null;
  }, [user, isAdmin, guestInfo]);

  // Fetch messages
  const fetchMessages = useCallback(() => {
    const params = getFetchParams();
    if (!params) return;

    fetch(params.url, params.init)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const newMessages = res.data || [];
          setMessages(newMessages);
          const adminMsgCount = newMessages.filter((m: any) => m.isAdmin).length;
          if (adminMsgCount > lastMsgCountRef.current && lastMsgCountRef.current > 0) {
            playNotificationSound();
            if (!isOpen) setUnreadCount(prev => prev + (adminMsgCount - lastMsgCountRef.current));
          }
          lastMsgCountRef.current = adminMsgCount;
        }
      })
      .catch(err => console.error(err));
  }, [getFetchParams, isOpen]);

  // Polling toutes les 2s dès qu'on a une identité
  useEffect(() => {
    if (!user && !guestInfo) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [fetchMessages, user, guestInfo]);

  useEffect(() => { if (isOpen) setUnreadCount(0); }, [isOpen]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Fichier max 2 Mo'); return; }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: file.name, data: reader.result as string, type: file.type });
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestNameInput.trim() || !guestEmailInput.trim()) return;
    const info = { name: guestNameInput.trim(), email: guestEmailInput.trim().toLowerCase() };
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(info));
    setGuestInfo(info);
    setShowGuestForm(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !attachment) return;

    // Si pas de session et pas d'info invité, montrer le formulaire
    if (!user && !guestInfo) {
      setShowGuestForm(true);
      return;
    }

    setLoading(true);
    try {
      let messageContent = content;
      if (attachment) {
        messageContent = content ? `${content}\n\n📎 ${attachment.name}` : `📎 ${attachment.name}`;
      }

      const body: any = {
        content: messageContent,
        reference,
        attachment: attachment ? { name: attachment.name, data: attachment.data, type: attachment.type } : undefined,
      };

      // Ajouter les infos invité si non connecté
      if (!user && guestInfo) {
        body.guestName = guestInfo.name;
        body.guestEmail = guestInfo.email;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setContent('');
        setReference(null);
        setAttachment(null);
      } else {
        alert('Erreur: ' + (data.error || "Impossible d'envoyer le message"));
      }
    } catch (err: any) {
      alert('Erreur de connexion: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Nom affiché dans le header
  const displayName = user?.name || user?.email || guestInfo?.name || null;

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFileSelect} />

      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 rounded-full text-white shadow-[0_8px_32px_rgba(239,68,68,0.35)] transition-all duration-300 transform hover:scale-105"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-cyan-500 text-white text-[9px] font-black rounded-full px-1 shadow-lg animate-bounce">
              {unreadCount}
            </span>
          ) : (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
            </span>
          )}
        </button>
      )}

      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="w-[380px] h-[520px] bg-[#0c1222]/95 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-md">
          {/* Header */}
          <div className="p-4 bg-slate-950/70 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center font-bold text-white text-xs shadow-lg">
                A
              </div>
              <div>
                <h4 className="text-white text-xs font-black uppercase tracking-wider">SUPPORT AUTOP</h4>
                <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse inline-block" /> En ligne · Réponse rapide
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {guestInfo && !user && (
                <button
                  onClick={() => { localStorage.removeItem(GUEST_STORAGE_KEY); setGuestInfo(null); setMessages([]); }}
                  className="text-slate-500 hover:text-slate-300 text-[8px] font-bold uppercase transition"
                  title="Changer d'identité"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition p-1 hover:bg-slate-800 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Formulaire invité (avant de chatter) */}
          {showGuestForm && (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-white text-xs font-black uppercase tracking-wider mb-1">Identifiez-vous</h3>
              <p className="text-slate-400 text-[9px] uppercase tracking-wider mb-5 text-center">Pour démarrer la conversation, renseignez vos coordonnées</p>
              <form onSubmit={handleGuestSubmit} className="w-full space-y-3">
                <input
                  type="text"
                  placeholder="Votre nom complet *"
                  value={guestNameInput}
                  onChange={e => setGuestNameInput(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-semibold"
                />
                <input
                  type="email"
                  placeholder="Votre adresse email *"
                  value={guestEmailInput}
                  onChange={e => setGuestEmailInput(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-semibold"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl transition tracking-wider"
                >
                  DÉMARRER LA CONVERSATION
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuestForm(false)}
                  className="w-full py-2 text-slate-500 hover:text-slate-300 text-[9px] uppercase font-bold transition"
                >
                  Annuler
                </button>
              </form>
            </div>
          )}

          {/* Accueil si pas identifié et pas de formulaire */}
          {!showGuestForm && !user && !guestInfo && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600/20 to-orange-500/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-white text-xs font-black uppercase tracking-wider mb-2">CHAT AVEC AUTOP</h3>
              <p className="text-slate-400 text-[9px] uppercase tracking-wider mb-6">Demandez un prix, disponibilité ou renseignement sur n'importe quelle pièce</p>
              <button
                onClick={() => setShowGuestForm(true)}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-2xl transition tracking-wider shadow-lg shadow-red-600/25"
              >
                COMMENCER →
              </button>
            </div>
          )}

          {/* Conversation */}
          {!showGuestForm && (user || guestInfo) && (
            <>
              {/* Badge identité invité */}
              {!user && guestInfo && (
                <div className="px-4 py-1.5 bg-slate-900/50 border-b border-slate-800/40 flex items-center gap-1.5">
                  <User className="w-2.5 h-2.5 text-slate-500" />
                  <span className="text-[8px] text-slate-500 font-bold uppercase">{guestInfo.name} · {guestInfo.email}</span>
                </div>
              )}

              {/* Corps messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-14 h-14 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6 text-slate-600" />
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Aucun message</p>
                    <p className="text-slate-600 text-[9px] uppercase mt-1">Écrivez un message pour commencer</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.isAdmin ? 'items-start' : 'items-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                        msg.isAdmin
                          ? 'bg-slate-800 text-slate-100 rounded-tl-none'
                          : 'bg-red-600 text-white rounded-tr-none shadow shadow-red-500/20'
                      }`}>
                        {msg.reference && (
                          <div className="bg-black/35 rounded-lg px-2 py-1 mb-1.5 font-mono text-[9px] text-orange-300 font-bold uppercase">
                            Réf : {msg.reference}
                          </div>
                        )}
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        {msg.attachmentData && (
                          <div className="mt-2">
                            {msg.attachmentType?.startsWith('image/') ? (
                              <img src={msg.attachmentData} alt={msg.attachmentName || ''} className="max-w-full rounded-lg" />
                            ) : (
                              <a href={msg.attachmentData} download={msg.attachmentName || 'download'} className="flex items-center gap-1.5 px-3 py-2 bg-black/20 hover:bg-black/30 rounded-lg transition text-xs font-semibold">
                                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate max-w-[150px]">{msg.attachmentName || 'Pièce jointe'}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[8px] text-slate-500 mt-1 uppercase font-bold tracking-wide">
                        {msg.senderName} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Indicateur de référence */}
              {reference && (
                <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-900 flex items-center justify-between text-[9px]">
                  <span className="text-slate-400 font-bold uppercase">RÉF : <span className="font-mono text-orange-400">{reference}</span></span>
                  <button onClick={() => setReference(null)} className="text-red-400 hover:text-red-300 transition font-black uppercase text-[8px]">×</button>
                </div>
              )}

              {/* Aperçu pièce jointe */}
              {attachment && (
                <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[9px]">
                    {attachment.type.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5 text-cyan-400" /> : <Paperclip className="w-3.5 h-3.5 text-cyan-400" />}
                    <span className="text-slate-300 font-bold uppercase truncate max-w-[200px]">{attachment.name}</span>
                  </div>
                  <button onClick={() => setAttachment(null)} className="text-red-400 hover:text-red-300 transition"><X className="w-3 h-3" /></button>
                </div>
              )}

              {/* Formulaire envoi */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800/60 bg-slate-950/40 flex items-center gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-cyan-400 transition rounded-lg hover:bg-slate-800/50" title="Joindre">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  placeholder="Écrivez votre message..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-semibold"
                  disabled={loading}
                />
                <button type="submit" disabled={loading || (!content.trim() && !attachment)} className="p-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition disabled:opacity-40">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
