'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Package, TrendingUp, TrendingDown, RefreshCw,
  Building2, Calendar, ShoppingCart, ArrowDownRight, ArrowUpRight,
  Boxes, ShieldCheck, CheckCircle2, Clock, AlertCircle, FileText,
  Download, Printer, ChevronRight, Layers, ArrowLeftRight, DollarSign,
  Truck, Eye, Sparkles, UploadCloud, FileSpreadsheet, ListFilter,
  Check, X, Filter, BarChart3, Award, Zap, HelpCircle, Users
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface OdooProduct {
  id: number;
  name: string;
  reference: string;
  vehicleModel?: string;
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
  subtotal: number;
  totalCost: number;
  state: string;
  stateLabel: string;
  stateColor: string;
}

interface SaleItem {
  id: number;
  date: string;
  rawDate: string;
  customerName: string;
  orderReference: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
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

interface DecisionData {
  bestPurchase: {
    price: number;
    supplier: string;
    date: string;
    orderReference: string;
  } | null;
  lastPurchase: {
    price: number;
    supplier: string;
    date: string;
    orderReference: string;
  } | null;
  lastSale: {
    price: number;
    customer: string;
    date: string;
    orderReference: string;
  } | null;
  marginAmount: number;
  marginPercent: number;
  potentialSavings: number;
  recommendation: string;
}

interface SummaryData {
  totalStock: number;
  bestPurchasePrice: number;
  bestSupplier: string;
  lastPurchasePrice: number;
  lastSupplier: string;
  lastPurchaseDate: string;
  lastOrderReference: string;
  sellingPrice: number;
  lastCustomer: string;
  lastSaleDate: string;
  marginAmount: number;
  marginPercent: number;
  totalPurchasedQty: number;
  totalPurchaseSpend: number;
  totalSoldQty: number;
  totalSaleRevenue: number;
  inMovesCount: number;
  outMovesCount: number;
  internalMovesCount: number;
}

interface BatchItem {
  reference: string;
  queryRef: string;
  found: boolean;
  productId?: number;
  name: string;
  vehicleModel?: string;
  stockAvailable: number;
  bestPurchasePrice: number;
  bestSupplier: string;
  bestDate?: string;
  lastPurchasePrice: number;
  lastSupplier: string;
  lastPurchaseDate?: string;
  lastSellingPrice: number;
  lastCustomer: string;
  lastSaleDate?: string;
  status: string;
  purchaseCount?: number;
  saleCount?: number;
}

const SAMPLE_REFS = [
  { ref: '7410GE', label: '7410GE (Pare-Choc AR)' },
  { ref: '001983381R', label: '001983381R (Cache Antib)' },
  { ref: '7414QV', label: '7414QV (Armature P/C)' },
  { ref: '1306J5', label: '1306J5 (Bouchon Vase)' },
  { ref: '0108EAZ00680N', label: '0108EAZ00680N (Mahindra)' },
  { ref: '10010001', label: '10010001 (Huile B47)' },
  { ref: '04C103603C', label: '04C103603C (Carter Polo)' },
];

export default function OdooStockTracker({ initialRef = '' }: { initialRef?: string }) {
  // Mode selection: single search vs batch import
  const [trackerMode, setTrackerMode] = useState<'single' | 'batch'>('single');

  // Single Search State
  const [searchTerm, setSearchTerm] = useState(initialRef || '7410GE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales' | 'movements'>('purchases');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');

  // Period / Date Filters
  const [periodPreset, setPeriodPreset] = useState<'ALL' | '30D' | '90D' | '2026' | '2025' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [product, setProduct] = useState<OdooProduct | null>(null);
  const [allProducts, setAllProducts] = useState<OdooProduct[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [decision, setDecision] = useState<DecisionData | null>(null);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Batch Search State
  const [batchText, setBatchText] = useState<string>('7410GE\n001983381R\n7414QV\n1306J5\n04C103603C');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<BatchItem[]>([]);
  const [batchFilterTerm, setBatchFilterTerm] = useState('');
  const [batchStockOnly, setBatchStockOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Apply quick period preset
  const handlePresetChange = (preset: 'ALL' | '30D' | '90D' | '2026' | '2025' | 'CUSTOM') => {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === '30D') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === '90D') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === '2026') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    } else if (preset === '2025') {
      setStartDate('2025-01-01');
      setEndDate('2025-12-31');
    }
  };

  // Fetch single article data from Odoo API
  const fetchOdooData = async (queryToSearch: string, sDate = startDate, eDate = endDate) => {
    const q = queryToSearch.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      params.set('q', q);
      if (sDate) params.set('startDate', sDate);
      if (eDate) params.set('endDate', eDate);

      const res = await fetch(`/api/odoo/tracking?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la récupération des données Odoo.');
      }

      setProduct(data.product);
      setAllProducts(data.allProducts || []);
      setSummary(data.summary);
      setDecision(data.decision || null);
      setPurchases(data.purchaseHistory || []);
      setSales(data.salesHistory || []);
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
      fetchOdooData('7410GE');
    }
  }, [initialRef]);

  // Submit search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOdooData(searchTerm, startDate, endDate);
  };

  // Batch search submit
  const handleBatchSearch = async (refsToSearch?: string[]) => {
    let list = refsToSearch;
    if (!list) {
      list = batchText
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(s => s.length >= 2);
    }

    if (!list || list.length === 0) {
      setError("Veuillez saisir au moins une référence d'article.");
      return;
    }

    setBatchLoading(true);
    setBatchProgress(10);
    setError(null);

    try {
      const res = await fetch('/api/odoo/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true, references: list })
      });
      setBatchProgress(70);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors du traitement par lot.');
      }

      setBatchResults(data.items || []);
      setBatchProgress(100);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la recherche par lot.');
    } finally {
      setBatchLoading(false);
    }
  };

  // Handle Excel file upload for batch
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const extractedRefs: string[] = [];
        rows.forEach(row => {
          if (Array.isArray(row)) {
            row.forEach(cell => {
              const val = String(cell || '').trim();
              if (val && val.length >= 3 && !val.toLowerCase().includes('ref') && !val.toLowerCase().includes('code') && !val.toLowerCase().includes('article')) {
                extractedRefs.push(val);
              }
            });
          }
        });

        const unique = Array.from(new Set(extractedRefs)).slice(0, 50);
        if (unique.length > 0) {
          setBatchText(unique.join('\n'));
          handleBatchSearch(unique);
        } else {
          setError("Aucune référence valide trouvée dans le fichier importé.");
        }
      } catch (err: any) {
        setError(`Erreur de lecture du fichier Excel/CSV : ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filter single purchases
  const uniqueSuppliers = Array.from(new Set(purchases.map(p => p.supplierName).filter(Boolean)));
  const filteredPurchases = supplierFilter === 'ALL'
    ? purchases
    : purchases.filter(p => p.supplierName === supplierFilter);

  // Filter batch items
  const filteredBatchResults = batchResults.filter(item => {
    const matchesTerm = !batchFilterTerm ||
      item.reference.toLowerCase().includes(batchFilterTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(batchFilterTerm.toLowerCase()) ||
      item.vehicleModel?.toLowerCase().includes(batchFilterTerm.toLowerCase()) ||
      item.bestSupplier.toLowerCase().includes(batchFilterTerm.toLowerCase());
    const matchesStock = !batchStockOnly || item.stockAvailable > 0;
    return matchesTerm && matchesStock;
  });

  // Export Single to Excel (.xlsx)
  const exportSingleToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Synthese & Decision
    const summaryData = [
      ['RAPPORT DE SUIVI ODOO ERP - AUTOP'],
      ['Référence', product?.reference || searchTerm],
      ['Nom Article', product?.name || 'N/A'],
      ['Modèle Véhicule', product?.vehicleModel || 'N/A'],
      ['Catégorie', product?.category || 'Pièces'],
      ['Stock Actuel Magasin', `${summary?.totalStock || 0} pcs`],
      [''],
      ['INDICATEURS CLES & DECISION D\'ACHAT'],
      ['Meilleur Prix d\'Achat Historique', `${decision?.bestPurchase?.price?.toFixed(3) || '0.000'} TND HT`],
      ['Fournisseur Meilleur Prix', decision?.bestPurchase?.supplier || 'N/A'],
      ['Date Meilleur Achat', decision?.bestPurchase?.date || 'N/A'],
      ['N° Bon Commande (Meilleur)', decision?.bestPurchase?.orderReference || 'N/A'],
      [''],
      ['Dernier Prix d\'Achat Récent', `${decision?.lastPurchase?.price?.toFixed(3) || '0.000'} TND HT`],
      ['Fournisseur Dernier Achat', decision?.lastPurchase?.supplier || 'N/A'],
      ['Date Dernier Achat', decision?.lastPurchase?.date || 'N/A'],
      ['N° Bon Commande (Dernier)', decision?.lastPurchase?.orderReference || 'N/A'],
      [''],
      ['Dernier Prix de Vente Client', `${decision?.lastSale?.price?.toFixed(3) || '0.000'} TND HT`],
      ['Client / Assureur', decision?.lastSale?.customer || 'N/A'],
      ['Date Dernière Vente', decision?.lastSale?.date || 'N/A'],
      ['N° Commande Vente (SO)', decision?.lastSale?.orderReference || 'N/A'],
      [''],
      ['Marge Brute Constatée', `${decision?.marginAmount?.toFixed(3) || '0.000'} TND (${decision?.marginPercent?.toFixed(1) || '0'}%)`],
      ['Économie Potentielle Achat', `${decision?.potentialSavings?.toFixed(3) || '0.000'} TND/pc`],
      ['Recommandation Achat', decision?.recommendation || 'N/A']
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthèse & Décision');

    // Sheet 2: Achats
    if (purchases.length > 0) {
      const purchasesData = purchases.map(p => ({
        'Date': p.date,
        'Fournisseur': p.supplierName,
        'N° Bon Commande (PO)': p.orderReference,
        'Article': p.productName,
        'Quantité': p.quantity,
        'Prix Unitaire HT (TND)': p.unitPrice,
        'Total Achat HT (TND)': p.totalCost,
        'Statut Odoo': p.stateLabel
      }));
      const wsPurchases = XLSX.utils.json_to_sheet(purchasesData);
      XLSX.utils.book_append_sheet(wb, wsPurchases, 'Achats Fournisseurs');
    }

    // Sheet 3: Ventes
    if (sales.length > 0) {
      const salesData = sales.map(s => ({
        'Date': s.date,
        'Client / Assureur': s.customerName,
        'N° Commande (SO)': s.orderReference,
        'Article': s.productName,
        'Quantité': s.quantity,
        'Prix Unitaire Vente HT (TND)': s.unitPrice,
        'Total Vente HT (TND)': s.totalCost,
        'Statut Odoo': s.stateLabel
      }));
      const wsSales = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, wsSales, 'Ventes Clients');
    }

    // Sheet 4: Mouvements
    if (movements.length > 0) {
      const movesData = movements.map(m => ({
        'Date': m.date,
        'Type': m.typeLabel,
        'Référence Mouvement': m.reference,
        'Document Origine': m.origin,
        'Emplacement Source': m.sourceLocation,
        'Emplacement Destination': m.destLocation,
        'Quantité': m.quantity,
        'Statut': m.stateLabel
      }));
      const wsMoves = XLSX.utils.json_to_sheet(movesData);
      XLSX.utils.book_append_sheet(wb, wsMoves, 'Mouvements Stock');
    }

    XLSX.writeFile(wb, `Odoo_Suivi_Stock_${searchTerm}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export Batch to Excel (.xlsx)
  const exportBatchToExcel = () => {
    if (batchResults.length === 0) return;
    const wb = XLSX.utils.book_new();

    const data = batchResults.map((item, idx) => ({
      'N°': idx + 1,
      'Référence': item.reference,
      'Nom Article': item.name,
      'Véhicule': item.vehicleModel || '-',
      'Stock Magasin': item.stockAvailable,
      'Meilleur Prix Achat HT (TND)': item.bestPurchasePrice,
      'Fournisseur Meilleur Prix': item.bestSupplier,
      'Date Meilleur Achat': item.bestDate || '-',
      'Dernier Prix Achat HT (TND)': item.lastPurchasePrice,
      'Fournisseur Dernier Achat': item.lastSupplier,
      'Date Dernier Achat': item.lastPurchaseDate || '-',
      'Dernier Prix Vente HT (TND)': item.lastSellingPrice,
      'Dernier Client / Assureur': item.lastCustomer,
      'Date Dernière Vente': item.lastSaleDate || '-',
      'Statut Stock': item.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Suivi Groupé Odoo');
    XLSX.writeFile(wb, `Odoo_Suivi_Groupe_${batchResults.length}_Articles_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export CSV
  const exportSingleToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'HISTORIQUE DES ACHATS PAR FOURNISSEUR (ODOO ERP)\n';
    csvContent += 'Date;Fournisseur;N Bon Commande;Article;Qte;Prix Unitaire HT (TND);Total HT (TND);Statut\n';
    purchases.forEach(p => {
      csvContent += `"${p.date}";"${p.supplierName}";"${p.orderReference}";"${p.productName}";${p.quantity};${p.unitPrice.toFixed(3)};${p.totalCost.toFixed(3)};"${p.stateLabel}"\n`;
    });

    csvContent += '\nHISTORIQUE DES VENTES CLIENTS (ODOO ERP)\n';
    csvContent += 'Date;Client;N Commande SO;Article;Qte;Prix Vente HT (TND);Total HT (TND);Statut\n';
    sales.forEach(s => {
      csvContent += `"${s.date}";"${s.customerName}";"${s.orderReference}";"${s.productName}";${s.quantity};${s.unitPrice.toFixed(3)};${s.totalCost.toFixed(3)};"${s.stateLabel}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Odoo_Suivi_${searchTerm}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Boxes className="w-6 h-6" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
                Suivi de Stock & Historique Odoo
                <span className="text-xs bg-red-600 text-white px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase">
                  ERP Live
                </span>
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-400">
              Interrogation temps réel de l'ERP Odoo AUTOP : Historique d'achat par fournisseur, ventes clients, mouvements et suivi par lot.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0 self-start lg:self-auto">
            <button
              onClick={() => setTrackerMode('single')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                trackerMode === 'single'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Recherche Unitaire</span>
            </button>
            <button
              onClick={() => setTrackerMode('batch')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                trackerMode === 'batch'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import & Suivi par Lot</span>
            </button>
          </div>
        </div>

        {/* SINGLE SEARCH CONTROLS */}
        {trackerMode === 'single' && (
          <div className="mt-5 space-y-3.5 relative z-10">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Entrez une référence d'article (ex: 7410GE, 001983381R, 7414QV, 1306J5)..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/90 border border-slate-700 hover:border-slate-600 focus:border-red-500 rounded-xl text-white font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-sm md:text-base transition shadow-inner"
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
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs md:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-red-600/20 shrink-0"
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
            </form>

            {/* Date Range & Period Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="font-bold text-slate-400 flex items-center gap-1 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-red-500" />
                  Période :
                </span>
                {[
                  { id: 'ALL', label: 'Tout l\'historique' },
                  { id: '30D', label: '30 derniers jours' },
                  { id: '90D', label: '90 jours' },
                  { id: '2026', label: 'Année 2026' },
                  { id: '2025', label: 'Année 2025' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetChange(p.id as any)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      periodPreset === p.id
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[11px]">Du :</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPeriodPreset('CUSTOM');
                    }}
                    className="bg-transparent text-white text-xs focus:outline-none font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[11px]">Au :</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPeriodPreset('CUSTOM');
                    }}
                    className="bg-transparent text-white text-xs focus:outline-none font-mono"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setPeriodPreset('ALL');
                      fetchOdooData(searchTerm, '', '');
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Effacer le filtre de dates"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fetchOdooData(searchTerm, startDate, endDate)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg border border-slate-700"
                >
                  Filtrer
                </button>
              </div>
            </div>

            {/* Quick Sample Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
              <span className="font-semibold text-slate-500 shrink-0">Exemples rapides :</span>
              {SAMPLE_REFS.map((s) => (
                <button
                  key={s.ref}
                  type="button"
                  onClick={() => {
                    setSearchTerm(s.ref);
                    fetchOdooData(s.ref, startDate, endDate);
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
        )}

        {/* BATCH SEARCH CONTROLS */}
        {trackerMode === 'batch' && (
          <div className="mt-5 space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Textarea for Multi References */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Coller la liste des références (une par ligne ou séparées par des virgules) :</span>
                  <span className="text-slate-500 font-normal">Max 50 références</span>
                </label>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  rows={4}
                  placeholder="7410GE&#10;001983381R&#10;7414QV&#10;1306J5&#10;04C103603C"
                  className="w-full p-3 bg-slate-950/90 border border-slate-700 focus:border-red-500 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              {/* Excel File Upload Box */}
              <div className="flex flex-col justify-between p-4 bg-slate-950/80 border border-dashed border-slate-700 rounded-xl text-center">
                <div>
                  <UploadCloud className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-white mb-1">Importer un fichier Excel / CSV</p>
                  <p className="text-[11px] text-slate-400">Formats acceptés : .xlsx, .xls, .csv</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-700 transition"
                >
                  Choisir un fichier
                </button>
              </div>
            </div>

            {/* Launch Batch Search Button & Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Références détectées : <strong className="text-white">{batchText.split(/[\n,;]+/).filter(s => s.trim().length >= 2).length}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchSearch()}
                  disabled={batchLoading}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-red-600/20"
                >
                  {batchLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Interrogation groupée en cours ({batchProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Lancer le suivi par lot</span>
                    </>
                  )}
                </button>

                {batchResults.length > 0 && (
                  <button
                    type="button"
                    onClick={exportBatchToExcel}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Excel Lot (.xlsx)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <p className="flex-1">{error}</p>
          <button
            onClick={() => trackerMode === 'single' ? fetchOdooData(searchTerm) : handleBatchSearch()}
            className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 border border-rose-600/50 rounded-lg text-xs font-bold text-white uppercase"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SINGLE SEARCH VIEW                                                       */}
      {/* ========================================================================= */}
      {trackerMode === 'single' && hasSearched && !loading && (
        <>
          {/* ========================================================================= */}
          {/* 4. BLOC CONCLUSION & DECISION D'ACHAT (MEILLEUR PRIX ACHAT & VENTE)      */}
          {/* ========================================================================= */}
          {decision && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/30 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-inner">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                      SYNTHÈSE DÉCISIONNELLE ERP ODOO
                    </span>
                    <h2 className="text-lg md:text-xl font-black text-white">
                      Conclusion & Indicateurs Clés de Rentabilité
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={exportSingleToExcel}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
                    title="Télécharger la fiche complète au format Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={exportSingleToCSV}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer / PDF</span>
                  </button>
                </div>
              </div>

              {/* 3 Pillars of Decision: Best Buy, Last Buy, Last Sell */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                {/* 1. MEILLEUR PRIX ACHAT */}
                <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 md:p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      Meilleur Prix d'Achat
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      Top Économie
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-emerald-400 font-mono">
                        {decision.bestPurchase?.price ? decision.bestPurchase.price.toFixed(3) : '0.000'}
                      </span>
                      <span className="text-xs text-emerald-400 font-bold">TND HT</span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Fournisseur :</span>
                        <strong className="text-white font-bold">{decision.bestPurchase?.supplier || 'N/A'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Date de commande :</span>
                        <span className="font-mono text-slate-300">{decision.bestPurchase?.date || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>N° Bon Commande :</span>
                        <span className="font-mono text-blue-400 font-bold">{decision.bestPurchase?.orderReference || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. DERNIER PRIX ACHAT */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <Truck className="w-4 h-4" />
                      Dernier Prix d'Achat
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                      Réception Récente
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white font-mono">
                        {decision.lastPurchase?.price ? decision.lastPurchase.price.toFixed(3) : '0.000'}
                      </span>
                      <span className="text-xs text-blue-400 font-bold">TND HT</span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Fournisseur :</span>
                        <strong className="text-white font-bold">{decision.lastPurchase?.supplier || 'N/A'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Date de commande :</span>
                        <span className="font-mono text-slate-300">{decision.lastPurchase?.date || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>N° Bon Commande :</span>
                        <span className="font-mono text-blue-400 font-bold">{decision.lastPurchase?.orderReference || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. DERNIER PRIX VENTE */}
                <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 md:p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      Dernier Prix de Vente
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                      Facturation Client
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-amber-400 font-mono">
                        {decision.lastSale?.price ? decision.lastSale.price.toFixed(3) : '0.000'}
                      </span>
                      <span className="text-xs text-amber-400 font-bold">TND HT</span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Client / Assureur :</span>
                        <strong className="text-white font-bold truncate max-w-[150px]">{decision.lastSale?.customer || 'N/A'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Date de vente :</span>
                        <span className="font-mono text-slate-300">{decision.lastSale?.date || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>N° Commande (SO) :</span>
                        <span className="font-mono text-amber-400 font-bold">{decision.lastSale?.orderReference || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendation Strip */}
              <div className="mt-4 p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-2 text-slate-300">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-slate-400">Recommandation Achat :</span>
                  <span className="text-white font-bold">{decision.recommendation}</span>
                </div>
                {decision.potentialSavings > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-black">
                    Gain potentiel : +{decision.potentialSavings.toFixed(3)} TND / pièce
                  </span>
                )}
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
                    {product.vehicleModel && (
                      <span className="text-xs bg-blue-950/80 text-blue-300 px-2.5 py-0.5 rounded-md font-bold border border-blue-800">
                        {product.vehicleModel}
                      </span>
                    )}
                    {product.category && (
                      <span className="text-[11px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded font-medium">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Fiche article Odoo ID #{product.id} • Stock dispo : <strong className={product.stockAvailable > 0 ? 'text-emerald-400' : 'text-slate-400'}>{product.stockAvailable} pcs</strong>
                  </p>
                </div>
              </div>

              {/* Quick KPIs on Product */}
              <div className="flex items-center gap-3 text-xs shrink-0">
                <div className="px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Stock</span>
                  <span className={`text-base font-black ${product.stockAvailable > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {product.stockAvailable} pcs
                  </span>
                </div>
                <div className="px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Achats</span>
                  <span className="text-base font-black text-white">{purchases.length}</span>
                </div>
                <div className="px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Ventes</span>
                  <span className="text-base font-black text-amber-400">{sales.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs for Single View */}
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
                <span>1. Achats Fournisseurs</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 font-black">
                  {purchases.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('sales')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition ${
                  activeTab === 'sales'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>2. Ventes Clients</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/30 font-black">
                  {sales.length}
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
                <span>3. Mouvements de Stock</span>
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

          {/* TAB 1: Achats Fournisseurs */}
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
                  <span className="text-sm font-black text-white font-mono">
                    {filteredPurchases.reduce((acc, p) => acc + p.totalCost, 0).toFixed(3)} TND
                  </span>
                </div>
              </div>

              {filteredPurchases.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                  <p className="font-semibold text-slate-300">Aucun achat enregistré sur cette période.</p>
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
                              po.stateColor === 'blue' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                              'bg-slate-800 text-slate-300'
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

          {/* TAB 2: Ventes Clients */}
          {activeTab === 'sales' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    Historique des Ventes & Dossiers Clients
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Prix de vente réels facturés aux clients et compagnies d'assurance dans Odoo.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium">Chiffre d'affaires cumulé : </span>
                  <span className="text-sm font-black text-amber-400 font-mono">
                    {sales.reduce((acc, s) => acc + s.totalCost, 0).toFixed(3)} TND
                  </span>
                </div>
              </div>

              {sales.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                  <p className="font-semibold text-slate-300">Aucune vente enregistrée pour cet article sur cette période.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Date Vente</th>
                        <th className="py-3 px-4">Client / Assureur</th>
                        <th className="py-3 px-4">N° Commande (SO)</th>
                        <th className="py-3 px-4 text-center">Quantité</th>
                        <th className="py-3 px-4 text-right">Prix Unitaire Vente HT</th>
                        <th className="py-3 px-4 text-right">Total Vente HT</th>
                        <th className="py-3 px-4 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {sales.map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-slate-800/50 transition">
                          <td className="py-3.5 px-4 font-mono text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{s.date}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {s.customerName}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">
                            {s.orderReference}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-slate-200">
                            <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700">
                              {s.quantity} pcs
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-300">
                            {s.unitPrice.toFixed(3)} <span className="text-slate-400 text-[10px]">TND</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-white">
                            {s.totalCost.toFixed(3)} <span className="text-slate-400 text-[10px]">TND</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              {s.stateLabel}
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

          {/* TAB 3: Mouvements de Stock */}
          {activeTab === 'movements' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-red-500" />
                    Synthèse des Mouvements de Stock (Achats & Ventes)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Historique chronologique de tous les flux d'entrée et de sortie.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Entrée ({summary?.inMovesCount || 0})
                  </span>
                  <span className="flex items-center gap-1 font-bold text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Sortie ({summary?.outMovesCount || 0})
                  </span>
                </div>
              </div>

              {movements.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <ArrowLeftRight className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                  <p className="font-semibold text-slate-300">Aucun mouvement de stock sur cette période.</p>
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
                        <th className="py-3 px-4">Origine ➔ Destination</th>
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
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

      {/* ========================================================================= */}
      {/* BATCH SEARCH RESULTS VIEW                                                */}
      {/* ========================================================================= */}
      {trackerMode === 'batch' && batchResults.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-5">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Tableau Comparatif & Suivi par Lot ({batchResults.length} articles)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Stock, meilleur prix d'achat, dernier prix de vente et synthèse groupée Odoo.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={batchFilterTerm}
                  onChange={(e) => setBatchFilterTerm(e.target.value)}
                  placeholder="Filtrer dans le lot..."
                  className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={batchStockOnly}
                  onChange={(e) => setBatchStockOnly(e.target.checked)}
                  className="rounded text-red-600 focus:ring-0"
                />
                <span>En stock uniquement</span>
              </label>

              <button
                type="button"
                onClick={exportBatchToExcel}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Référence</th>
                  <th className="py-3 px-3.5">Article & Véhicule</th>
                  <th className="py-3 px-3 text-center">Stock</th>
                  <th className="py-3 px-3.5">Meilleur Achat (Fournisseur)</th>
                  <th className="py-3 px-3.5">Dernier Achat (Fournisseur)</th>
                  <th className="py-3 px-3.5">Dernière Vente (Client)</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredBatchResults.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-3.5 font-mono font-bold text-white">
                      <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        {item.reference}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5">
                      <div className="font-bold text-slate-200">{item.name}</div>
                      {item.vehicleModel && item.vehicleModel !== '-' && (
                        <span className="text-[10px] text-blue-400 font-semibold">{item.vehicleModel}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                        item.stockAvailable > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {item.stockAvailable} pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 font-mono">
                      {item.bestPurchasePrice > 0 ? (
                        <div>
                          <span className="font-bold text-emerald-400">{item.bestPurchasePrice.toFixed(3)} TND</span>
                          <div className="text-[10px] text-slate-400 font-sans truncate max-w-[140px]" title={item.bestSupplier}>
                            {item.bestSupplier}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono">
                      {item.lastPurchasePrice > 0 ? (
                        <div>
                          <span className="font-bold text-white">{item.lastPurchasePrice.toFixed(3)} TND</span>
                          <div className="text-[10px] text-slate-400 font-sans truncate max-w-[140px]" title={item.lastSupplier}>
                            {item.lastSupplier}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono">
                      {item.lastSellingPrice > 0 ? (
                        <div>
                          <span className="font-bold text-amber-400">{item.lastSellingPrice.toFixed(3)} TND</span>
                          <div className="text-[10px] text-slate-400 font-sans truncate max-w-[140px]" title={item.lastCustomer}>
                            {item.lastCustomer}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm(item.reference);
                          setTrackerMode('single');
                          fetchOdooData(item.reference);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition"
                        title="Voir la fiche détaillée Odoo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
