'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  MessageCircle, Send, X, Paperclip, 
  User, CheckCheck, Sparkles, LogIn
} from 'lucide-react';
import Link from 'next/link';
import { notifyChatSync, subscribeToChatSync } from '@/lib/chatSync';

const GUEST_STORAGE_KEY = 'autop_chat_guest';
const CLIENT_ID_KEY = 'autop_chat_client_id';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
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

  // État Invité (identifiant stable pour ne jamais perdre l'historique)
  const [guestInfo, setGuestInfo] = useState<{ name: string; email: string } | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState('');
  const [guestEmailInput, setGuestEmailInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMsgCountRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialisation de l'identifiant client persistant (localStorage)
  useEffect(() => {
    let storedClientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!storedClientId) {
      storedClientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(CLIENT_ID_KEY, storedClientId);
    }
    setClientId(storedClientId);

    if (!user) {
      const storedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
      if (storedGuest) {
        try { setGuestInfo(JSON.parse(storedGuest)); } catch {}
      }
    }
  }, [user]);

  // Écouter les événements d'ouverture de chat depuis le catalogue ou devis
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      setIsOpen(true);
      if (e.detail?.reference) {
        setReference(e.detail.reference);
        setContent(`Bonjour, je souhaite connaître le prix et la disponibilité pour la référence ${e.detail.reference} (${e.detail.name || ''})`);
      }
      setTimeout(() => inputRef.current?.focus(), 150);
    };
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  // Construction de l'URL avec mode=client explicite
  const getFetchUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('mode', 'client');
    if (user?.id) params.set('userId', user.id);
    if (guestInfo?.email) params.set('guestEmail', guestInfo.email);
    if (clientId) params.set('clientId', clientId);
    return `/api/chat?${params.toString()}`;
  }, [user, guestInfo, clientId]);

  // Récupération des messages avec accumulation sécurisée (zéro écrasement à vide)
  const fetchMessages = useCallback(() => {
    const url = getFetchUrl();
    fetch(url, { cache: 'no-store' })
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const serverMessages = res.data;

          setMessages(prev => {
            if (serverMessages.length === 0 && prev.length > 0) {
              return prev;
            }
            const serverMsgIds = new Set(serverMessages.map((m: any) => m.id));
            const pendingOptimistic = prev.filter(m => m.id?.startsWith('temp-') && !serverMsgIds.has(m.id));
            return [...serverMessages, ...pendingOptimistic];
          });

          const adminMsgCount = serverMessages.filter((m: any) => m.isAdmin).length;
          if (adminMsgCount > lastMsgCountRef.current && lastMsgCountRef.current > 0) {
            playNotificationSound();
            if (!isOpen) {
              setUnreadCount(count => count + (adminMsgCount - lastMsgCountRef.current));
            }
          }
          lastMsgCountRef.current = adminMsgCount;
        }
      })
      .catch(err => console.error('Client Chat fetch error:', err));
  }, [getFetchUrl, isOpen]);

  // 1. Polling automatique régulier (toutes les 2 secondes)
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // 2. Synchronisation instantanée inter-onglets (BroadcastChannel)
  useEffect(() => {
    const unsubscribe = subscribeToChatSync(() => {
      fetchMessages();
    });
    return unsubscribe;
  }, [fetchMessages]);

  // Réinitialiser le badge de notification non-lu
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Auto-scroll à chaque nouveau message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('Le fichier ne doit pas dépasser 4 Mo');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        data: reader.result as string,
        type: file.type
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestNameInput.trim() || !guestEmailInput.trim()) return;
    const info = {
      name: guestNameInput.trim(),
      email: guestEmailInput.trim().toLowerCase()
    };
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(info));
    setGuestInfo(info);
    setShowGuestForm(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = content.trim();
    if ((!textToSend && !attachment) || loading) return;

    setLoading(true);
    const currentRef = reference;
    const currentAttachment = attachment;

    const currentSenderName = user?.name 
      || guestInfo?.name 
      || (guestInfo?.email ? guestInfo.email.split('@')[0] : 'Client');

    // 1. Mise à jour instantanée de l'état local (Optimistic UI)
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      isAdmin: false,
      senderName: currentSenderName,
      content: currentAttachment ? (textToSend ? `${textToSend}\n\n📎 ${currentAttachment.name}` : `📎 ${currentAttachment.name}`) : textToSend,
      reference: currentRef,
      attachmentData: currentAttachment?.data,
      attachmentName: currentAttachment?.name,
      attachmentType: currentAttachment?.type,
      createdAt: new Date().toISOString(),
      pending: true
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setContent('');
    setReference(null);
    setAttachment(null);

    try {
      let finalContent = textToSend;
      if (currentAttachment) {
        finalContent = textToSend ? `${textToSend}\n\n📎 ${currentAttachment.name}` : `📎 ${currentAttachment.name}`;
      }

      const body: any = {
        mode: 'client',
        content: finalContent,
        reference: currentRef,
        attachment: currentAttachment ? { name: currentAttachment.name, data: currentAttachment.data, type: currentAttachment.type } : undefined,
        clientId: clientId || undefined,
        guestName: guestInfo?.name || undefined,
        guestEmail: guestInfo?.email || undefined
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success && data.data) {
        setMessages(prev => prev.map(m => m.id === tempId ? data.data : m));
        // Déclencher la mise à jour instantanée sur l'écran admin
        notifyChatSync();
      }
    } catch (err: any) {
      console.error('Chat send error:', err);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const clientName = user?.name || guestInfo?.name || null;

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" 
        className="hidden" 
        onChange={handleFileSelect} 
      />

      {/* ─── BOUTON FLOTTANT STYLE MESSENGER ──────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Ouvrir le Chat Messenger"
          className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#e8432f] to-[#d6301a] hover:from-[#f04e3b] hover:to-[#e8432f] rounded-full text-white shadow-[0_10px_30px_rgba(232,67,47,0.45)] transition-all duration-300 transform hover:scale-110 active:scale-95"
        >
          <MessageCircle className="w-7 h-7 transition-transform duration-300 group-hover:rotate-6" />
          
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] flex items-center justify-center bg-cyan-400 text-slate-950 text-[10px] font-black rounded-full px-1 shadow-lg ring-2 ring-[#0c1222] animate-bounce">
              {unreadCount}
            </span>
          ) : (
            <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-[#0c1222]" />
            </span>
          )}
        </button>
      )}

      {/* ─── FENÊTRE PRINCIPALE STYLE MESSENGER ───────────────────────────── */}
      {isOpen && (
        <div className="w-[390px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-80px)] bg-[#0f141f] border border-slate-700/70 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col backdrop-blur-xl animate-[fadeIn_0.2s_ease-out]">
          
          {/* ── HEADER MESSENGER ── */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#171d2c] to-[#121622] border-b border-slate-700/60 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#e8432f] to-[#ff7a59] flex items-center justify-center font-black text-white text-sm shadow-md ring-2 ring-red-500/30">
                  AP
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-[#0f141f]" />
              </div>
              <div>
                <h4 className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  Support Client AutoP
                </h4>
                <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  En ligne • Réponse en direct
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {guestInfo && !user && (
                <button
                  onClick={() => { localStorage.removeItem(GUEST_STORAGE_KEY); setGuestInfo(null); }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition text-[9px] font-bold"
                  title="Modifier mes informations"
                >
                  <User className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fermer le chat"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── FORMULAIRE INVITÉ OPTIONNEL ── */}
          {showGuestForm && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0c101a]/95">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e8432f]/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center mb-3 shadow-lg">
                <User className="w-6 h-6 text-[#e8432f]" />
              </div>
              <h3 className="text-white text-sm font-black uppercase tracking-wide mb-1">
                Vos coordonnées
              </h3>
              <p className="text-slate-400 text-[11px] text-center mb-5">
                Renseignez votre nom et email pour recevoir notre réponse sur votre messagerie.
              </p>

              <form onSubmit={handleGuestSubmit} className="w-full space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    placeholder="Ex: Mohamed Ben Salem"
                    value={guestNameInput}
                    onChange={e => setGuestNameInput(e.target.value)}
                    required
                    className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-[#e8432f] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Adresse Email *</label>
                  <input
                    type="email"
                    placeholder="Ex: mohamed@gmail.com"
                    value={guestEmailInput}
                    onChange={e => setGuestEmailInput(e.target.value)}
                    required
                    className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-[#e8432f] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#e8432f] to-[#d6301a] hover:from-[#f04e3b] hover:to-[#e8432f] text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-red-500/20 active:scale-[0.98]"
                >
                  Enregistrer et discuter
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuestForm(false)}
                  className="w-full py-2 text-slate-400 hover:text-white text-xs font-bold transition"
                >
                  Continuer en tant qu'invité direct
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-800 w-full text-center">
                <Link href="/connexion" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold transition">
                  <LogIn className="w-3.5 h-3.5" /> Déjà client ? Se connecter
                </Link>
              </div>
            </div>
          )}

          {/* ── FLUX DE CONVERSATION MESSENGER ── */}
          {!showGuestForm && (
            <>
              {/* Client Info Bar */}
              <div className="px-4 py-1.5 bg-[#121724] border-b border-slate-800 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold truncate">
                  <User className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">{clientName || 'Visiteur'} {user?.role === 'PROFESSIONAL' && '• PRO'}</span>
                </div>
                {!user && !guestInfo && (
                  <button
                    onClick={() => setShowGuestForm(true)}
                    className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase transition"
                  >
                    + Ajouter mon nom
                  </button>
                )}
                {(user || guestInfo) && (
                  <span className="text-[9px] text-emerald-400 font-mono">En direct</span>
                )}
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0a0d14]/70 scroll-smooth">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                      <Sparkles className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                      Bienvenue sur le Chat AutoP
                    </p>
                    <p className="text-slate-500 text-[10px] mt-1 max-w-[220px]">
                      Écrivez votre question ou référence de pièce, un conseiller vous répond immédiatement.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isAdminMsg = msg.isAdmin;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdminMsg ? 'items-start' : 'items-end'} animate-[fadeIn_0.15s_ease-out]`}
                      >
                        <div className="flex items-end gap-2 max-w-[85%]">
                          {isAdminMsg && (
                            <div className="w-6 h-6 rounded-full bg-[#e8432f] text-white flex items-center justify-center font-black text-[9px] shrink-0 mb-1 shadow-sm">
                              AP
                            </div>
                          )}

                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                              isAdminMsg
                                ? 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                                : 'bg-gradient-to-r from-[#e8432f] to-[#ff5722] text-white rounded-br-none shadow-red-500/10'
                            }`}
                          >
                            {/* Référence de pièce liée */}
                            {msg.reference && (
                              <div className="bg-black/35 rounded-lg px-2.5 py-1 mb-1.5 font-mono text-[10px] text-orange-300 font-bold uppercase flex items-center justify-between gap-2 border border-white/10">
                                <span>RÉF : {msg.reference}</span>
                              </div>
                            )}

                            <p className="leading-relaxed whitespace-pre-wrap select-text font-normal">{msg.content}</p>

                            {/* Pièce jointe */}
                            {msg.attachmentData && (
                              <div className="mt-2.5 pt-2 border-t border-white/15">
                                {msg.attachmentType?.startsWith('image/') ? (
                                  <img
                                    src={msg.attachmentData}
                                    alt={msg.attachmentName || 'Photo'}
                                    className="max-w-full rounded-xl border border-white/20 max-h-[160px] object-cover"
                                  />
                                ) : (
                                  <a
                                    href={msg.attachmentData}
                                    download={msg.attachmentName || 'fichier'}
                                    className="flex items-center gap-2 px-3 py-2 bg-black/30 hover:bg-black/40 rounded-xl transition text-[11px] font-semibold text-white"
                                  >
                                    <Paperclip className="w-3.5 h-3.5 shrink-0 text-cyan-300" />
                                    <span className="truncate max-w-[170px]">{msg.attachmentName || 'Télécharger le fichier'}</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Heure et statut */}
                        <div className={`flex items-center gap-1 text-[8px] text-slate-500 mt-1 uppercase font-bold px-1 ${isAdminMsg ? 'pl-8' : ''}`}>
                          <span>{msg.senderName}</span>
                          <span>•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {!isAdminMsg && <CheckCheck className="w-3 h-3 text-cyan-400 ml-0.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barre de référence active */}
              {reference && (
                <div className="px-4 py-2 bg-[#121724] border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-bold uppercase">
                    RÉF CONCERNÉE : <span className="font-mono text-orange-400">{reference}</span>
                  </span>
                  <button
                    onClick={() => setReference(null)}
                    className="text-red-400 hover:text-red-300 font-black uppercase text-[9px] px-1.5 py-0.5 hover:bg-red-500/10 rounded-md transition"
                  >
                    ✕ Retirer
                  </button>
                </div>
              )}

              {/* Aperçu de la pièce jointe */}
              {attachment && (
                <div className="px-4 py-2 bg-[#121724] border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2 text-cyan-300 font-semibold truncate">
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[240px]">{attachment.name}</span>
                  </div>
                  <button
                    onClick={() => setAttachment(null)}
                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-md transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ── ZONE DE SAISIE MESSENGER ── */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-800/80 bg-[#0f141f] flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 rounded-xl transition"
                  title="Joindre une photo ou document"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Écrivez votre message..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="flex-1 bg-slate-900/90 border border-slate-700/80 focus:border-[#e8432f] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-medium transition"
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading || (!content.trim() && !attachment)}
                  className="p-2.5 bg-gradient-to-r from-[#e8432f] to-[#d6301a] hover:from-[#f04e3b] hover:to-[#e8432f] text-white rounded-xl transition shadow-md shadow-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0"
                  title="Envoyer le message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
