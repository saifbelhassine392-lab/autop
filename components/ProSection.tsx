"use client";

import { useApp } from '@/lib/context';
import { Lock, FileText, Mail, MessageCircle, Edit3 } from 'lucide-react';

export default function ProSection() {
  const { setIsAdmin, setCurrentPage, setAdminSection } = useApp();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 mb-8 md:mb-10 shadow-xl shadow-black/25">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 md:gap-2.5 text-sm md:text-base font-black text-amber-400 uppercase tracking-wider">
          <Lock size={18} /> ESPACE COMMERCIAL (PRO)
        </div>
        <button
          onClick={() => { setIsAdmin(true); setCurrentPage('admin'); setAdminSection('reception'); }}
          className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-500 transition-all shadow-md shadow-red-600/25 active:scale-95 cursor-pointer"
        >
          ACCÈS PRIVÉ
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6">
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center shadow-inner">
          <div className="text-3xl md:text-4xl font-black text-emerald-400 mb-1 font-mono">12</div>
          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">DEMANDES EN ATTENTE</div>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center shadow-inner">
          <div className="text-3xl md:text-4xl font-black text-blue-400 mb-1 font-mono">8</div>
          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">EN PRÉPARATION</div>
        </div>
      </div>

      <div className="text-xs md:text-sm font-black text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
        TABLEAU COMPARATIF PRIX FOURNISSEURS
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800 mb-5 bg-slate-950/60">
        <table className="w-full border-collapse text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400">
              <th className="p-3 text-left font-black uppercase text-[10px] md:text-[11px] tracking-wider">DÉSIGNATION</th>
              <th className="p-3 text-left font-black uppercase text-[10px] md:text-[11px] tracking-wider">QTÉ</th>
              <th className="p-3 text-left font-black uppercase text-[10px] md:text-[11px] tracking-wider">RÉFÉRENCE</th>
              <th className="p-3 text-left font-black uppercase text-[10px] md:text-[11px] tracking-wider">DISPO</th>
              <th className="p-3 text-left font-black uppercase text-[10px] md:text-[11px] tracking-wider">MARQUE</th>
              <th className="p-3 text-left font-black uppercase text-[10px] md:text-[11px] tracking-wider">FOUR 1</th>
              <th className="p-3 text-left font-black uppercase text-[10px] md:text-[11px] tracking-wider">FOUR 2</th>
              <th className="p-3 text-left font-black uppercase text-[10px] md:text-[11px] tracking-wider">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            <tr className="hover:bg-slate-800/40 transition-colors">
              <td className="p-3 font-bold text-slate-100">Kit Embrayage</td>
              <td className="p-3 text-slate-300 font-mono">1</td>
              <td className="p-3 text-slate-300 font-mono font-bold">1611273080</td>
              <td className="p-3 text-emerald-400 font-black">OUI</td>
              <td className="p-3 text-slate-300 font-bold">ORIGINE</td>
              <td className="p-3 text-cyan-400 font-mono font-bold">210 HT</td>
              <td className="p-3 text-cyan-400 font-mono font-bold">241 HT</td>
              <td className="p-3">
                <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition border border-slate-700">
                  <Edit3 size={12} /> MODIFIER
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 flex-wrap mb-5 md:mb-0">
        <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition border border-slate-700 shadow-sm active:scale-95 cursor-pointer">
          <FileText size={14} /> GÉNÉRER PDF
        </button>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition shadow-md shadow-blue-600/25 active:scale-95 cursor-pointer">
          <Mail size={14} /> ENVOYER EMAIL
        </button>
        <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition shadow-md shadow-emerald-600/25 active:scale-95 cursor-pointer">
          <MessageCircle size={14} /> ENVOYER WHATSAPP
        </button>
      </div>

      <div className="text-center mt-6 md:hidden">
        <button
          onClick={() => { setIsAdmin(true); setCurrentPage('admin'); setAdminSection('reception'); }}
          className="w-full bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/25 active:scale-95"
        >
          ACCÉDER À L'ESPACE COMMERCIAL PRO
        </button>
      </div>
    </div>
  );
}