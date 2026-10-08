'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Search, Package, TrendingUp, TrendingDown, RefreshCw,
  Building2, Calendar, ShoppingCart, ArrowDownRight, ArrowUpRight,
  Boxes, ShieldCheck, CheckCircle2, Clock, AlertCircle, FileText,
  Download, Printer, ChevronRight, Layers, ArrowLeftRight, DollarSign,
  Truck, Eye, Sparkles
} from 'lucide-react';

interface OdooProduct {
  id: number;
  name: string;
  reference: string;
  standardPrice: number;
  listPrice: number;
  stockAvailable: number;
  category: string;
}

interface PurchaseItem {
  id: number;
  date: string;
  rawDate: string;
  supplierName: string;
  orderReference: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  state: string;
  stateLabel: string;
  stateColor: string;
}

interface StockMovement {
  id: number;
  date: string;
  rawDate: string;
  productName: string;
  type: 'ACHAT' | 'VENTE' | 'TRANSFERT';
  typeLabel: string;
  typeBadge: string;
  reference: string;
  origin: string;
  sourceLocation: string;
  destLocation: string;
  quantity: number;
  quantityExpected: number;
  quantityDone: number;
  state: string;
  stateLabel: string;
  stateColor: string;
}

interface SummaryData {
  totalStock: number;
  lastPurchasePrice: number;
  lastSupplier: string;
  lastPurchaseDate: string;
  lastOrderReference: string;
  sellingPrice: number;
  totalPurchasedQty: number;
  totalPurchaseSpend: number;
  inMovesCount: number;
  outMovesCount: number;
  internalMovesCount: number;
}

const SAMPLE_REFS = [
  { ref: '7410GE', label: '7410GE (Pare-Choc AR)' },
  { ref: '001983381R', label: '001983381R (Cache Antib)' },
  { ref: '7414QV', label: '7414QV (Armature P/C)' },
  { ref: '0108EAZ00680N', label: '0108EAZ00680N (Mahindra KUV)' },
  { ref: '10010001', label: '10010001 (Huile Moteur B47)' },
  { ref: '13050004', label: '13050004 (Filtre Huile Champion)' },
  { ref: '04C103603C', label: '04C103603C (Carter Huile Polo)' },
];

export default function OdooStockTracker({ initialRef = '' }: { initialRef?: string }) {
  const [searchTerm, setSearchTerm] = useState(initialRef || '7410GE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'purchases' | 'movements' | 'all'>('purchases');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');

  const [product, setProduct] = useState<OdooProduct | null>(null);
  const [allProducts, setAllProducts] = useState<OdooProduct[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchOdooData = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/odoo/tracking?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la récupération des données Odoo.');
      }

      setProduct(data.product);
      setAllProducts(data.allProducts || []);
      setSummary(data.summary);
      setPurchases(data.purchaseHistory || []);
      setMovements(data.stockMovements || []);
      setSupplierFilter('ALL');
    } catch (err: any) {
      setError(err.message || 'Impossible de joindre le serveur Odoo ERP.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      fetchOdooData(initialRef);
    } else {
      // Auto-load 7410GE for immediate live display
      fetchOdooData('7410GE');
    }
  }, [initialRef]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOdooData(searchTerm);
  };

  // Extract unique suppliers for filter
  const uniqueSuppliers = Array.from(new Set(purchases.map(p => p.supplierName).filter(Boolean)));
  const filteredPurchases = supplierFilter === 'ALL'
    ? purchases
    : purchases.filter(p => p.supplierName === supplierFilter);

  // Export to CSV
  const exportToCSV = () => {
    if (purchases.length === 0 && movements.length === 0) return;
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Purchases section
    csvContent += 'HISTORIQUE ACHATS PAR FOURNISSEUR\n';
    csvContent += 'Date;Fournisseur;N Bon Commande;Article;Qte;Prix Unitaire HT (TND);Total HT (TND);Statut\n';
    purchases.forEach(p => {
      csvContent += `"${p.date}";"${p.supplierName}";"${p.orderReference}";"${p.productName}";${p.quantity};${p.unitPrice.toFixed(3)};${p.totalCost.toFixed(3)};"${p.stateLabel}"\n`;
    });

    csvContent += '\nSYNTHESE DES MOUVEMENTS DE STOCK\n';
    csvContent += 'Date;Type;Reference;Origine;Emplacement Source;Emplacement Destination;Qte;Statut\n';
    movements.forEach(m => {
      csvContent += `"${m.date}";"${m.typeLabel}";"${m.reference}";"${m.origin}";"${m.sourceLocation}";"${m.destLocation}";${m.quantity};"${m.stateLabel}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Odoo_Suivi_Stock_${searchTerm}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Boxes className="w-6 h-6" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                Suivi de Stock & Historique Odoo
                <span className="text-xs bg-red-600 text-white px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase">
                  ERP Live
                </span>
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-400">
              Interrogation temps réel de l'ERP Odoo AUTOP : Historique d'achat par fournisseur et synthèse des flux.
            </p>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl text-xs shrink-0 self-start md:self-auto">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-semibold">Instance :</span>
            <span className="font-mono text-emerald-400 font-bold">autop-soft.autop.tn</span>
            <span className="text-slate-500 text-[10px]">|</span>
            <span className="text-slate-400 font-medium">AUTOP_PRODUCTION</span>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-5 relative z-10">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Entrez une référence d'article (ex: 001983381R, 7414QV, 13050004)..."
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/90 border border-slate-700 hover:border-slate-600 focus:border-red-500 rounded-xl text-white font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm md:text-base transition shadow-inner"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-500 hover:text-slate-300"
                >
                  Effacer
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className="px-6 py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs md:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-red-600/20 shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Interrogation Odoo...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Rechercher</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sample Pills */}
        <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-400">
          <span className="font-semibold text-slate-500 shrink-0">Exemples rapides :</span>
          {SAMPLE_REFS.map((s) => (
            <button
              key={s.ref}
              type="button"
              onClick={() => {
                setSearchTerm(s.ref);
                fetchOdooData(s.ref);
              }}
              className={`px-2.5 py-1 rounded-lg border transition font-mono ${
                searchTerm === s.ref
                  ? 'bg-red-500/20 border-red-500 text-red-300 font-bold'
                  : 'bg-slate-800/80 border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <p className="flex-1">{error}</p>
          <button
            onClick={() => fetchOdooData(searchTerm)}
            className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 border border-rose-600/50 rounded-lg text-xs font-bold text-white uppercase"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {hasSearched && !loading && (
        <>
          {/* KPI Banner */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Stock Actuel */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Stock Actuel Magasin
                  </span>
                  <div className={`p-2 rounded-xl ${summary.totalStock > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${summary.totalStock > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {summary.totalStock}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold uppercase">
                    {summary.totalStock > 1 ? 'unités en stock' : 'unité en stock'}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  {summary.totalStock > 0 ? (
                    <span className="text-emerald-400 font-semibold">● Disponible immédiatement</span>
                  ) : (
                    <span className="text-amber-400 font-semibold">○ Rupture physique en magasin</span>
                  )}
                </div>
              </div>

              {/* Card 2: Dernier Prix d'Achat & Fournisseur */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Dernier Prix Achat HT
                  </span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl md:text-3xl font-black text-white">
                    {summary.lastPurchasePrice > 0 ? summary.lastPurchasePrice.toFixed(3) : '0.000'}
                  </span>
                  <span className="text-xs text-blue-400 font-bold">TND HT</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-400 truncate flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">
                    {summary.lastSupplier !== 'N/A' ? (
                      <strong className="text-slate-200">{summary.lastSupplier}</strong>
                    ) : (
                      'Fournisseur non répertorié'
                    )}
                  </span>
                </div>
              </div>

              {/* Card 3: Prix Vente Catalogue */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Prix Vente Catalogue
                  </span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl md:text-3xl font-black text-amber-400">
                    {summary.sellingPrice > 0 ? summary.sellingPrice.toFixed(3) : '0.000'}
                  </span>
                  <span className="text-xs text-amber-400/80 font-bold">TND HT</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  <span>Marge brute indicative : </span>
                  <strong className="text-slate-200">
                    {summary.sellingPrice > summary.lastPurchasePrice && summary.lastPurchasePrice > 0
                      ? `+${(summary.sellingPrice - summary.lastPurchasePrice).toFixed(3)} TND (${(((summary.sellingPrice - summary.lastPurchasePrice) / summary.lastPurchasePrice) * 100).toFixed(0)}%)`
                      : 'N/A'}
                  </strong>
                </div>
              </div>

              {/* Card 4: Total Flux Mouvements */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Activité & Flux (Odoo)
                  </span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <ArrowDownRight className="w-4 h-4" />
                    <span className="text-lg font-black">{summary.inMovesCount}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Entrées</span>
                  </div>
                  <div className="text-slate-700 font-bold">|</div>
                  <div className="flex items-center gap-1 text-rose-400">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-lg font-black">{summary.outMovesCount}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Sorties</span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  Total commandes d'achat : <strong className="text-white">{purchases.length}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Product Detail Card */}
          {product && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base md:text-lg font-black text-white uppercase tracking-tight">
                      {product.name}
                    </span>
                    <span className="font-mono text-xs bg-slate-800 text-red-400 px-2.5 py-0.5 rounded-md font-bold border border-slate-700">
                      Réf: {product.reference}
                    </span>
                    {product.category && (
                      <span className="text-[11px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded font-medium">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Fiche article Odoo ID #{product.id} • Stock dispo : {product.stockAvailable} pcs
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={exportToCSV}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 transition"
                  title="Exporter les données en CSV"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 transition"
                  title="Imprimer cette fiche"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer</span>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('purchases')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition ${
                  activeTab === 'purchases'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>1. Historique d'Achat par Fournisseur</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 font-black">
                  {purchases.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('movements')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition ${
                  activeTab === 'movements'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>2. Synthèse des Mouvements (Ventes / Achats)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 font-black">
                  {movements.length}
                </span>
              </button>
            </div>

            {/* Supplier Filter for Purchases */}
            {activeTab === 'purchases' && uniqueSuppliers.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-semibold">Filtrer par Fournisseur :</span>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-red-500"
                >
                  <option value="ALL">Tous les fournisseurs ({purchases.length})</option>
                  {uniqueSuppliers.map(s => (
                    <option key={s} value={s}>
                      {s} ({purchases.filter(p => p.supplierName === s).length})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* TAB 1: Historique d'Achat par Fournisseur */}
          {activeTab === 'purchases' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-red-500" />
                    Historique des Commandes d'Achat Fournisseurs
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Coûts unitaires, montants totaux et dates exactes des réceptions dans Odoo ERP.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium">Dépense cumulée : </span>
                  <span className="text-sm font-black text-white">
                    {filteredPurchases.reduce((acc, p) => acc + p.totalCost, 0).toFixed(3)} TND
                  </span>
                </div>
              </div>

              {filteredPurchases.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                  <p className="font-semibold text-slate-300">Aucun historique d'achat enregistré dans Odoo pour cette référence.</p>
                  <p className="text-xs text-slate-500 mt-1">Vérifiez la référence ou recherchez par mot-clé.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Date Exacte</th>
                        <th className="py-3 px-4">Fournisseur</th>
                        <th className="py-3 px-4">N° Bon Commande (PO)</th>
                        <th className="py-3 px-4 text-center">Quantité</th>
                        <th className="py-3 px-4 text-right">Prix Unitaire HT</th>
                        <th className="py-3 px-4 text-right">Total Achat HT</th>
                        <th className="py-3 px-4 text-center">Statut Odoo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredPurchases.map((po, idx) => (
                        <tr key={po.id || idx} className="hover:bg-slate-800/50 transition">
                          <td className="py-3.5 px-4 font-mono text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{po.date}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                              <span>{po.supplierName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-blue-400 font-semibold">
                            {po.orderReference}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-slate-200">
                            <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700">
                              {po.quantity} pcs
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                            {po.unitPrice.toFixed(3)} <span className="text-slate-400 text-[10px]">TND</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400">
                            {po.totalCost.toFixed(3)} <span className="text-slate-400 text-[10px]">TND</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              po.stateColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                              po.stateColor === 'amber' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              po.stateColor === 'blue' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                              'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}>
                              {po.stateLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Synthèse des Mouvements de Stock */}
          {activeTab === 'movements' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-red-500" />
                    Synthèse des Mouvements de Stock (Achats & Ventes)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Historique chronologique de tous les flux d'entrée (réceptions fournisseurs) et de sortie (livraisons clients).
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Entrée Réception ({summary?.inMovesCount || 0})
                  </span>
                  <span className="flex items-center gap-1 font-bold text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Sortie Expédition ({summary?.outMovesCount || 0})
                  </span>
                </div>
              </div>

              {movements.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <ArrowLeftRight className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                  <p className="font-semibold text-slate-300">Aucun mouvement de stock trouvé pour cette référence dans Odoo.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Date & Heure</th>
                        <th className="py-3 px-4">Type de Mouvement</th>
                        <th className="py-3 px-4">Réf Mouvement / Bon</th>
                        <th className="py-3 px-4">Document Source</th>
                        <th className="py-3 px-4">Emplacement Origine ➔ Destination</th>
                        <th className="py-3 px-4 text-center">Quantité</th>
                        <th className="py-3 px-4 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {movements.map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-slate-800/50 transition">
                          <td className="py-3.5 px-4 font-mono text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{m.date}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${m.typeBadge}`}>
                              {m.type === 'ACHAT' && <ArrowDownRight className="w-3 h-3" />}
                              {m.type === 'VENTE' && <ArrowUpRight className="w-3 h-3" />}
                              {m.type === 'TRANSFERT' && <ArrowLeftRight className="w-3 h-3" />}
                              <span>{m.typeLabel}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-white">
                            {m.reference}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-blue-400">
                            {m.origin || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-[11px] flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[140px]" title={m.sourceLocation}>
                                {m.sourceLocation}
                              </span>
                              <span className="text-red-500 font-bold">➔</span>
                              <span className="text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-semibold truncate max-w-[140px]" title={m.destLocation}>
                                {m.destLocation}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-md font-mono font-black text-xs ${
                              m.type === 'ACHAT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              m.type === 'VENTE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {m.type === 'VENTE' ? `-${m.quantity}` : `+${m.quantity}`} pcs
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.stateColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                              m.stateColor === 'cyan' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                              m.stateColor === 'amber' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {m.stateLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Initial state / waiting for search */}
      {!hasSearched && !loading && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <Boxes className="w-12 h-12 text-red-500/60 mx-auto mb-3 animate-bounce" />
          <h3 className="text-lg font-bold text-white mb-1">Prêt pour la recherche Odoo ERP</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Saisissez une référence ou cliquez sur l'un des exemples ci-dessus pour interroger en direct le stock, les achats et les mouvements Odoo.
          </p>
        </div>
      )}
    </div>
  );
}
