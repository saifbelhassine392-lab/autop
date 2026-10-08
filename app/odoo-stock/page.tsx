import type { Metadata } from 'next';
import Header from '@/components/Header';
import OdooStockTracker from '@/components/OdooStockTracker';
import Link from 'next/link';
import { ChevronRight, Home, Boxes, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: "Suivi de Stock & Historique Odoo ERP | AUTOP",
  description: "Suivi en direct du stock, de l'historique d'achat par fournisseur et de la synthèse des mouvements depuis l'ERP Odoo AUTOP.",
};

export default function OdooStockPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-100 flex flex-col antialiased">
      {/* Top Main Navigation Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white flex items-center gap-1 transition">
            <Home className="w-3.5 h-3.5" />
            <span>Accueil</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-red-500 font-bold flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5" />
            <span>Suivi Stock Odoo ERP</span>
          </span>
        </nav>

        {/* Odoo Stock Tracker Component */}
        <OdooStockTracker />
      </main>

      {/* Footer minimaliste */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} AUTOP Tunisie — Connecteur ERP Odoo v16/v17 (autop-soft.autop.tn)</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              XML-RPC & JSON-RPC Connecté
            </span>
            <span>•</span>
            <span>Utilisateur : seifeddine.belhessine@autop.tn</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
