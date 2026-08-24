"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import {
  Inbox, Clock, FileText, ShoppingBag, MessageSquare,
  FilePlus, FileDown, Send,
  UserPlus, List, ClipboardList,
  Package, PlusCircle, Edit, BarChart2, TrendingUp,
  LogOut, ChevronRight, Receipt, ShieldCheck
} from 'lucide-react';
import { subscribeQuotesSync } from '@/lib/syncEvents';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.error('Audio beep failed', e);
  }
};

type SidebarItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

const sections: SidebarSection[] = [
  {
    title: "VUE D'ENSEMBLE",
    items: [
      { id: 'tableau-bord', label: 'TABLEAU DE BORD', icon: BarChart2 },
    ]
  },
  {
    title: "DEMANDES CLIENTS",
    items: [
      { id: 'reception', label: 'RÉCEPTION DEMANDES', icon: Inbox, badge: 3, badgeColor: 'bg-red-600 text-white' },
      { id: 'traitement', label: 'EN TRAITEMENT', icon: Clock, badge: 5, badgeColor: 'bg-amber-500 text-white' },
      { id: 'devis-gen', label: 'DEVIS GÉNÉRÉS', icon: FileText, badge: 12, badgeColor: 'bg-emerald-600 text-white' },
      { id: 'bons', label: 'BONS DE COMMANDE', icon: ShoppingBag, badge: 8, badgeColor: 'bg-indigo-600 text-white' },
      { id: 'chat-interne', label: 'CHAT INTERNE / PRIX', icon: MessageSquare, badgeColor: 'bg-rose-600 text-white' },
    ]
  },
  {
    title: "GESTION DEVIS",
    items: [
      { id: 'creer-devis', label: 'CRÉER / MODIFIER DEVIS', icon: FilePlus },
      { id: 'generer-pdf', label: 'GÉNÉRER PDF', icon: FileDown },
      { id: 'envoi', label: 'ENVOI EMAIL / WHATSAPP', icon: Send },
    ]
  },
  {
    title: "FOURNISSEURS",
    items: [
      { id: 'ajouter-fournisseur', label: 'AJOUTER FOURNISSEUR', icon: UserPlus },
      { id: 'liste-fournisseurs', label: 'LISTE FOURNISSEURS', icon: List },
      { id: 'consultation-fournisseur', label: 'CONSULTATION FOURNISSEUR', icon: ClipboardList },
      { id: 'robot-b2b', label: '🤖 ROBOT B2B', icon: Package },
      { id: 'parts-catalogue', label: '🚗 PARTS CATALOGUE (VIN)', icon: ShoppingBag },
      { id: 'suivi-po', label: 'SUIVI PO & LIVRAISONS', icon: Clock },
      { id: 'historique-achat', label: "HISTORIQUE D'ACHATS", icon: ClipboardList },
    ]
  },
  {
    title: "GESTION ARTICLES",
    items: [
      { id: 'ajouter-article', label: 'AJOUTER ARTICLE', icon: PlusCircle },
      { id: 'modifier-article', label: 'MODIFIER / SUPPRIMER', icon: Edit },
      { id: 'liste-articles', label: 'LISTE COMPLÈTE', icon: Package },
    ]
  },
  {
    title: "COMPTABILITÉ & STATS",
    items: [
      { id: 'comptabilite', label: 'SERVICE COMPTABILITÉ', icon: Receipt },
      { id: 'chiffre', label: "CHIFFRE D'AFFAIRES", icon: TrendingUp },
    ]
  }
];

export default function AdminSidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const { adminSection, setAdminSection } = useApp();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  useEffect(() => {
    setActiveProfile(localStorage.getItem('activeAdminProfile'));
    const handleProfileChange = () => {
      setActiveProfile(localStorage.getItem('activeAdminProfile'));
    };
    window.addEventListener('active-profile-changed', handleProfileChange);
    return () => window.removeEventListener('active-profile-changed', handleProfileChange);
  }, []);

  const [counts, setCounts] = useState({ reception: 0, traitement: 0, devisGen: 0, bons: 0, chat: 0 });

  const fetchBadgeCounts = () => {
    fetch('/api/quotes')
      .then(r => r.json())
      .then(d => {
        const qList = Array.isArray(d) ? d : d.data || [];
        const reception = qList.filter((q: any) => q.status?.toUpperCase() === 'PENDING' || q.status === 'En attente' || q.status === 'pending').length;
        const traitement = qList.filter((q: any) => q.status?.toUpperCase() === 'IN_PROGRESS' || q.status === 'En traitement' || q.status === 'in_progress').length;
        setCounts(prev => ({ ...prev, reception, traitement }));
      })
      .catch(() => {});

    fetch('/api/devis')
      .then(r => r.json())
      .then(d => {
        const dList = Array.isArray(d) ? d : d.data || [];
        setCounts(prev => ({ ...prev, devisGen: dList.length }));
      })
      .catch(() => {});

    fetch('/api/orders')
      .then(r => r.json())
      .then(d => {
        const oList = d.data || [];
        setCounts(prev => ({ ...prev, bons: oList.length }));
      })
      .catch(() => {});

    fetch('/api/chat')
      .then(r => r.json())
      .then(d => {
        if (d && d.success && Array.isArray(d.data)) {
          const chatCount = d.data.filter((c: any) => c.lastMessage && !c.lastMessage.isAdmin).length;
          setCounts(prev => {
            if (chatCount > prev.chat) {
              playNotificationSound();
            }
            return { ...prev, chat: chatCount };
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBadgeCounts();
    const unsubscribe = subscribeQuotesSync(fetchBadgeCounts, 3000);
    return () => unsubscribe();
  }, []);

  const getBadgeValue = (id: string) => {
    if (id === 'reception') return counts.reception;
    if (id === 'traitement') return counts.traitement;
    if (id === 'devis-gen') return counts.devisGen;
    if (id === 'bons') return counts.bons;
    if (id === 'chat-interne') return counts.chat;
    return undefined;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`bg-white border-r border-[#dcedf2] w-[256px] flex flex-col h-screen z-50 shadow-sm transition-transform duration-300 ease-in-out fixed inset-y-0 left-0 md:sticky md:top-0 md:flex ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-[#dcedf2] bg-white">
          <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#e8432f] to-[#b8281a] flex items-center justify-center font-bold text-white text-[15px] shrink-0 shadow-sm">
            A
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[15px] text-[#111318] tracking-[0.01em] leading-tight font-sans">
              AUTOP
            </div>
            <div className="text-[10px] font-bold text-[#6c757d] uppercase tracking-[0.08em] mt-0.5">
              Console admin
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="mx-3.5 my-3.5 px-3 py-2.5 bg-[#f8f9fa] border border-[#dcedf2] rounded-[10px] flex items-center gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="w-[30px] h-[30px] rounded-[7px] bg-[#f8d7da] text-[#e8432f] flex items-center justify-center font-bold text-[12px] shrink-0">
            {(activeProfile || user?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-bold text-[#111318] truncate">
              {activeProfile || user?.name || 'Saif'}
            </div>
            <div className="text-[10.5px] font-semibold text-[#6c757d]">
              Admin
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('activeAdminProfile');
              window.dispatchEvent(new Event('active-profile-changed'));
            }}
            className="text-[10px] font-bold text-[#495057] hover:border-[#e8432f] hover:text-[#e8432f] border border-[#dcedf2] rounded-[5px] px-2 py-0.5 bg-white transition cursor-pointer shrink-0 shadow-2xs"
            title="Changer de profil"
          >
            Changer
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-1 px-3 space-y-3.5 scrollbar-thin scrollbar-thumb-[#dcedf2]">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#6c757d] px-2.5 pt-2 pb-1">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = adminSection === item.id;
                const badgeVal = getBadgeValue(item.id);
                const isGreenBadge = item.id === 'devis-gen';
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setAdminSection(item.id);
                      if (onClose) onClose();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[7px] text-[12.5px] font-semibold transition-colors group cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#e8432f] text-white font-bold shadow-sm'
                        : 'text-[#495057] hover:bg-[#f8f9fa] hover:text-[#111318]'
                    }`}
                  >
                    <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${
                      isActive ? 'bg-white' : 'bg-current opacity-70'
                    }`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badgeVal !== undefined && badgeVal > 0 && (
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : isGreenBadge
                          ? 'bg-[#059669] text-white'
                          : 'bg-[#e8432f] text-white'
                      }`}>
                        {badgeVal}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout Footer */}
        <div className="p-3 border-t border-[#dcedf2] bg-white">
          <button
            onClick={() => signOut({ callbackUrl: '/connexion' })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[7px] text-[12px] font-bold uppercase tracking-wider text-[#6c757d] hover:text-[#e8432f] hover:bg-[#f8d7da]/30 border border-transparent hover:border-[#dcedf2] transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>DÉCONNEXION</span>
          </button>
        </div>
      </aside>
    </>
  );
}