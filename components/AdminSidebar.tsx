"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import {
  Inbox, Clock, FileText, ShoppingBag,
  FilePlus, FileDown, Send,
  Building2, UserPlus, List, ClipboardList,
  Package, PlusCircle, Edit, BarChart2, TrendingUp,
  LogOut, ChevronRight, Receipt
} from 'lucide-react';

type SidebarItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
};

type SidebarSection = {
  title: string;
  color: string;
  items: SidebarItem[];
};

const sections: SidebarSection[] = [
  {
    title: "DEMANDES CLIENTS",
    color: "text-red-400",
    items: [
      { id: 'reception', label: 'RÉCEPTION DEMANDES', icon: Inbox, badge: 3, badgeColor: 'bg-red-500' },
      { id: 'traitement', label: 'EN TRAITEMENT', icon: Clock, badge: 5, badgeColor: 'bg-blue-500' },
      { id: 'devis-gen', label: 'DEVIS GÉNÉRÉS', icon: FileText, badge: 12, badgeColor: 'bg-green-500' },
      { id: 'bons', label: 'BONS DE COMMANDE', icon: ShoppingBag, badge: 8, badgeColor: 'bg-purple-500' },
    ]
  },
  {
    title: "GESTION DEVIS",
    color: "text-amber-400",
    items: [
      { id: 'creer-devis', label: 'CRÉER / MODIFIER DEVIS', icon: FilePlus },
      { id: 'generer-pdf', label: 'GÉNÉRER PDF', icon: FileDown },
      { id: 'envoi', label: 'ENVOI EMAIL / WHATSAPP', icon: Send },
    ]
  },
  {
    title: "FOURNISSEURS",
    color: "text-green-400",
    items: [
      { id: 'ajouter-fournisseur', label: 'AJOUTER FOURNISSEUR', icon: UserPlus },
      { id: 'liste-fournisseurs', label: 'LISTE FOURNISSEURS', icon: List },
      { id: 'consultation-fournisseur', label: 'CONSULTATION FOURNISSEUR', icon: ClipboardList },
      { id: 'suivi-po', label: 'SUIVI PO & LIVRAISONS', icon: Clock },
    ]
  },
  {
    title: "GESTION ARTICLES",
    color: "text-cyan-400",
    items: [
      { id: 'ajouter-article', label: 'AJOUTER ARTICLE', icon: PlusCircle },
      { id: 'modifier-article', label: 'MODIFIER / SUPPRIMER', icon: Edit },
      { id: 'liste-articles', label: 'LISTE COMPLÈTE', icon: Package },
    ]
  },
  {
    title: "COMPTABILITÉ",
    color: "text-purple-400",
    items: [
      { id: 'comptabilite', label: 'SERVICE COMPTABILITÉ', icon: Receipt }
    ]
  },
  {
    title: "STATISTIQUES",
    color: "text-pink-400",
    items: [
      { id: 'tableau-bord', label: 'TABLEAU DE BORD', icon: BarChart2 },
      { id: 'chiffre', label: "CHIFFRE D'AFFAIRES", icon: TrendingUp },
    ]
  }
];

export default function AdminSidebar() {
  const { adminSection, setAdminSection } = useApp();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [counts, setCounts] = useState({ reception: 0, traitement: 0, devisGen: 0, bons: 0 });

  const fetchBadgeCounts = () => {
    fetch('/api/quotes')
      .then(r => r.json())
      .then(d => {
        const qList = Array.isArray(d) ? d : d.data || [];
        const reception = qList.filter((q: any) => q.status === 'pending' || q.status === 'En attente').length;
        const traitement = qList.filter((q: any) => q.status === 'in_progress' || q.status === 'En traitement').length;
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
  };

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const getBadgeValue = (id: string) => {
    if (id === 'reception') return counts.reception;
    if (id === 'traitement') return counts.traitement;
    if (id === 'devis-gen') return counts.devisGen;
    if (id === 'bons') return counts.bons;
    return undefined;
  };

  return (
    <aside className="carbon-pattern border-r border-red-600/20 w-[260px] hidden md:flex flex-col overflow-hidden h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      {/* Logo Header */}
      <div className="flex flex-col items-center justify-center py-5 px-4 border-b border-slate-800/85 bg-slate-950/70 backdrop-blur-md">
        <div className="w-32 h-16 relative mb-2">
          <Image src="/logo.png" alt="AUTOP Logo" fill style={{ objectFit: 'contain' }} priority />
        </div>
        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[2px]">CONSOLE ADMIN</div>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-950/50 border-b border-slate-800/85 backdrop-blur-md">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-xs truncate">{user?.name?.toUpperCase() || 'ADMIN'}</p>
          <p className="text-slate-500 text-[9px] truncate">{user?.email}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section, idx) => (
          <div key={idx}>
            <div className={`text-[9px] font-black uppercase tracking-[2px] mb-1.5 px-2 ${section.color}`}>
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = adminSection === item.id;
              const badgeVal = getBadgeValue(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setAdminSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide mb-0.5 transition-all duration-150 group ${
                    isActive
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {badgeVal !== undefined && badgeVal > 0 && (
                    <span className={`${item.badgeColor} text-white text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center`}>
                      {badgeVal}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: '/connexion' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:bg-red-600/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          DÉCONNEXION
        </button>
      </div>
    </aside>
  );
}