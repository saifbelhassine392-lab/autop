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
    title: "COMPTABILITÉ",
    items: [
      { id: 'comptabilite', label: 'SERVICE COMPTABILITÉ', icon: Receipt }
    ]
  },
  {
    title: "STATISTIQUES",
    items: [
      { id: 'tableau-bord', label: 'TABLEAU DE BORD', icon: BarChart2 },
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
    const interval = setInterval(fetchBadgeCounts, 15000);
    return () => clearInterval(interval);
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
      
      <aside className={`bg-[#0e1117] border-r border-slate-800 w-[270px] flex flex-col h-screen z-50 shadow-2xl transition-transform duration-300 ease-in-out fixed inset-y-0 left-0 md:sticky md:top-0 md:flex ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Logo Header */}
        <div className="flex flex-col items-center justify-center pt-5 pb-4 px-4 border-b border-slate-800/80 bg-[#0e1117]">
          <div className="w-36 h-12 relative mb-2">
            <Image src="/logo.png" alt="AUTOP Logo" fill style={{ objectFit: 'contain' }} priority />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest border border-slate-700/80 shadow-inner">
            <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
            <span>CONSOLE ADMIN</span>
          </div>
        </div>

        {/* User Info Card */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-rose-500 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md shadow-red-600/30">
                {(activeProfile || user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-slate-100 font-black text-xs truncate uppercase tracking-tight">
                  {activeProfile || user?.name || 'ADMIN'}
                </p>
                <p className="text-slate-400 text-[10px] truncate font-medium">{user?.email || 'admin@autop.tn'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('activeAdminProfile');
                window.dispatchEvent(new Event('active-profile-changed'));
              }}
              className="text-[9px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded-lg border border-red-500/30 transition-colors shrink-0"
              title="Changer d'utilisateur"
            >
              Changer
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-2.5 py-1">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = adminSection === item.id;
                const badgeVal = getBadgeValue(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setAdminSection(item.id);
                      if (onClose) onClose();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-tight transition-all duration-150 group ${
                      isActive
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 font-black border border-red-500'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 font-semibold'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-400'
                    }`} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {badgeVal !== undefined && badgeVal > 0 && (
                      <span className={`${
                        isActive 
                          ? 'bg-white text-red-600' 
                          : item.badgeColor || 'bg-slate-800 text-slate-300'
                      } text-[10px] px-2 py-0.5 rounded-full font-black min-w-[20px] text-center shadow-xs shrink-0`}>
                        {badgeVal}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 ml-1 shrink-0 text-white" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0e1117]">
          <button
            onClick={() => signOut({ callbackUrl: '/connexion' })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
            <span>DÉCONNEXION</span>
          </button>
        </div>
      </aside>
    </>
  );
}