'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Package, TrendingUp, TrendingDown, RefreshCw,
  Building2, Calendar, ShoppingCart, ArrowDownRight, ArrowUpRight,
  Boxes, ShieldCheck, CheckCircle2, Clock, AlertCircle, FileText,
  Download, Printer, ChevronRight, Layers, ArrowLeftRight, DollarSign,
  Truck, Eye, Sparkles, UploadCloud, FileSpreadsheet, ListFilter,
  Check, X, Filter, BarChart3, Award, Zap, HelpCircle, Users,
  Signal
} from 'lucide-react';
import * as XLSX from 'xlsx';

/* ─── Sparkline SVG (Corporate Monochrome) ─── */
function Sparkline({ data, width = 120, height = 32 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1;
  const pad = 3; const w = width - pad * 2; const h = height - pad * 2;
  const pts = data.map((v, i) => `${pad + (i / (data.length - 1)) * w},${pad + h - ((v - min) / range) * h}`);
  const last = pts[pts.length - 1].split(',');
  const fillPath = `M${pts[0].split(',')[0]},${pad + h} L${pts.join(' L')} L${last[0]},${pad + h} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="corpGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#corpGrad)" />
      <polyline points={pts.join(' ')} fill="none" stroke="#94A3B8" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill="#FFFFFF" />
    </svg>
  );
}

/* ─── Live Dot (Subtle Monochrome) ─── */
function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#94A3B8]" />
    </span>
  );
}

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

  // Live clock
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Sparkline data (sorted chronologically → most recent last)
  const purchaseSparkData = useMemo(() =>
    purchases.slice().sort((a, b) => a.rawDate < b.rawDate ? -1 : 1).map(p => p.unitPrice),
    [purchases]);
  const saleSparkData = useMemo(() =>
    sales.slice().sort((a, b) => a.rawDate < b.rawDate ? -1 : 1).map(s => s.unitPrice),
    [sales]);

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

      {/* ═══════ 1. TOP HEADER & SEARCH CONTROLS ═══════ */}
      <div className="bg-[#111622] border border-[#1F293D] rounded-xl shadow-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#07090E] border border-[#1F293D] flex items-center justify-center text-[#FFFFFF] shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-[#FFFFFF] tracking-tight">
                  Suivi de Stock &amp; Historique Odoo ERP
                </h1>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8] bg-[#07090E] border border-[#1F293D] px-2.5 py-0.5 rounded-md">
                  <LiveDot />
                  ERP Connecté
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">Interrogation temps réel ERP Odoo AUTOP — Achats, Ventes, Mouvements, Suivi par lot</p>
            </div>
          </div>

          {/* Clock + Mode switcher */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#07090E] border border-[#1F293D] rounded-lg text-xs font-mono text-[#94A3B8]">
              <Signal className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>{clock}</span>
            </div>
            <div className="flex items-center gap-1 bg-[#07090E] p-1 rounded-lg border border-[#1F293D]">
              {[
                { id: 'single', icon: <Search className="w-3.5 h-3.5" />, label: 'Recherche Unitaire' },
                { id: 'batch', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, label: 'Suivi par Lot' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setTrackerMode(m.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                    trackerMode === m.id
                      ? 'bg-[#1F293D] text-[#FFFFFF] border border-[#1F293D]'
                      : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#111622]'
                  }`}
                >
                  {m.icon} <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SINGLE SEARCH CONTROLS */}
        {trackerMode === 'single' && (
          <div className="mt-6 space-y-4">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Entrez une référence d'article (ex: 7410GE, 001983381R, 7414QV, 1306J5)..."
                  className="w-full pl-11 pr-4 py-3 bg-[#07090E] border border-[#1F293D] focus:border-[#EF4444] text-[#FFFFFF] placeholder-[#64748B] rounded-lg text-sm transition outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-[#94A3B8] hover:text-[#FFFFFF]"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {/* BOUTON D'ACTION UNIQUE EN ROUGE SIGNATURE AUTOP */}
              <button
                type="submit"
                disabled={loading || !searchTerm.trim()}
                className="px-6 py-3 bg-[#EF4444] hover:bg-[#DC2626] disabled:bg-[#1F293D] disabled:text-[#64748B] text-[#FFFFFF] rounded-lg font-bold uppercase tracking-wider text-xs md:text-sm flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
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
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1F293D]">
              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="font-semibold text-[#94A3B8] flex items-center gap-1 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
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
                    className={`px-2.5 py-1 rounded-md font-medium text-xs transition border ${
                      periodPreset === p.id
                        ? 'bg-[#1F293D] text-[#FFFFFF] border-[#1F293D]'
                        : 'bg-[#07090E] text-[#94A3B8] hover:text-[#FFFFFF] border-[#1F293D]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-[#07090E] px-2.5 py-1 rounded-md border border-[#1F293D]">
                  <span className="text-[#94A3B8] text-[11px]">Du :</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPeriodPreset('CUSTOM');
                    }}
                    className="bg-transparent text-[#FFFFFF] text-xs focus:outline-none font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-[#07090E] px-2.5 py-1 rounded-md border border-[#1F293D]">
                  <span className="text-[#94A3B8] text-[11px]">Au :</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPeriodPreset('CUSTOM');
                    }}
                    className="bg-transparent text-[#FFFFFF] text-xs focus:outline-none font-mono"
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
                    className="p-1 text-[#94A3B8] hover:text-[#FFFFFF]"
                    title="Effacer le filtre de dates"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fetchOdooData(searchTerm, startDate, endDate)}
                  className="px-3 py-1 bg-[#1F293D] hover:bg-[#2A374A] text-[#FFFFFF] font-medium rounded-md border border-[#1F293D] transition-all"
                >
                  Filtrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BATCH SEARCH CONTROLS */}
        {trackerMode === 'batch' && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Textarea for Multi References */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center justify-between">
                  <span>Coller la liste des références (une par ligne ou séparées par des virgules) :</span>
                  <span className="text-[#64748B] font-normal">Max 50 références</span>
                </label>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  rows={4}
                  placeholder="7410GE&#10;001983381R&#10;7414QV&#10;1306J5&#10;04C103603C"
                  className="w-full p-3 bg-[#07090E] border border-[#1F293D] focus:border-[#EF4444] rounded-lg text-[#FFFFFF] font-mono text-xs outline-none"
                />
              </div>

              {/* Excel File Upload Box */}
              <div className="flex flex-col justify-between p-4 bg-[#07090E] border border-dashed border-[#1F293D] rounded-lg text-center">
                <div>
                  <UploadCloud className="w-7 h-7 text-[#94A3B8] mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#FFFFFF] mb-1">Importer un fichier Excel / CSV</p>
                  <p className="text-[11px] text-[#94A3B8]">Formats acceptés : .xlsx, .xls, .csv</p>
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
                  className="mt-3 w-full py-2 bg-[#1F293D] hover:bg-[#2A374A] text-[#FFFFFF] rounded-md text-xs font-medium uppercase tracking-wider border border-[#1F293D] transition-all"
                >
                  Choisir un fichier
                </button>
              </div>
            </div>

            {/* Launch Batch Search Button & Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-[#1F293D]">
              <div className="text-xs text-[#94A3B8]">
                Références détectées : <strong className="text-[#FFFFFF]">{batchText.split(/[\n,;]+/).filter(s => s.trim().length >= 2).length}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchSearch()}
                  disabled={batchLoading}
                  className="px-6 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] disabled:bg-[#1F293D] disabled:text-[#64748B] text-[#FFFFFF] font-bold rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
                >
                  {batchLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Interrogation groupée ({batchProgress}%)...</span>
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
                    className="bg-[#07090E] hover:bg-[#1F293D] text-[#94A3B8] hover:text-[#FFFFFF] border border-[#1F293D] px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4 text-[#94A3B8]" />
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
        <div className="bg-[#111622] border border-[#1F293D] rounded-xl p-4 flex items-center gap-3 text-[#FFFFFF] text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-[#EF4444]" />
          <p className="flex-1 text-[#FFFFFF]">{error}</p>
          <button
            onClick={() => trackerMode === 'single' ? fetchOdooData(searchTerm) : handleBatchSearch()}
            className="px-3 py-1 bg-[#1F293D] hover:bg-[#2A374A] border border-[#1F293D] rounded-md text-xs font-semibold text-[#FFFFFF]"
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
          {/* 2. BLOC CONCLUSION & DECISION D'ACHAT (Terminal / SaaS Cards)             */}
          {/* ========================================================================= */}
          {decision && (
            <div className="bg-[#111622] border border-[#1F293D] rounded-xl shadow-lg p-6">
              {/* Header row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#07090E] border border-[#1F293D] flex items-center justify-center text-[#FFFFFF] shrink-0">
                    <Award className="w-5 h-5 text-[#94A3B8]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8]">SYNTHÈSE DÉCISIONNELLE ERP ODOO</span>
                    <h2 className="text-lg md:text-xl font-bold text-[#FFFFFF] tracking-tight">Indicateurs Clés &amp; Décision d'Achat</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { icon: <FileSpreadsheet className="w-4 h-4 text-[#94A3B8]" />, label: 'Excel', fn: exportSingleToExcel },
                    { icon: <Download className="w-4 h-4 text-[#94A3B8]" />, label: 'CSV', fn: exportSingleToCSV },
                    { icon: <Printer className="w-4 h-4 text-[#94A3B8]" />, label: 'Imprimer', fn: () => window.print() },
                  ].map(btn => (
                    <button
                      key={btn.label}
                      onClick={btn.fn}
                      className="bg-[#07090E] hover:bg-[#1F293D] text-[#94A3B8] hover:text-[#FFFFFF] border border-[#1F293D] px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
                    >
                      {btn.icon} {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── 3 KPI CARDS (Monochrome Corporate) ─── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

                {/* 1. MEILLEUR PRIX ACHAT */}
                <div className="bg-[#07090E] border border-[#1F293D] rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#94A3B8]" /> Meilleur Prix Achat
                      </span>
                      <span className="border border-[#1F293D] bg-[#111622] text-[#94A3B8] px-2 py-0.5 rounded text-[10px] font-mono">Top Achat</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#FFFFFF] font-mono tabular-nums">
                        {decision.bestPurchase?.price ? decision.bestPurchase.price.toFixed(3) : '0.000'}
                      </span>
                      <span className="text-xs text-[#94A3B8] font-bold">TND HT</span>
                    </div>
                    {purchaseSparkData.length >= 2 && (
                      <div className="mt-3 opacity-80">
                        <Sparkline data={purchaseSparkData} width={130} height={32} />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1F293D] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Fournisseur :</span>
                      <strong className="text-[#FFFFFF] font-bold truncate max-w-[140px]">{decision.bestPurchase?.supplier || 'N/A'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#94A3B8]">Date :</span>
                      <span className="font-mono text-[#94A3B8]">{decision.bestPurchase?.date || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#94A3B8]">N° PO :</span>
                      <span className="font-mono text-[#FFFFFF] font-semibold">{decision.bestPurchase?.orderReference || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. DERNIER PRIX ACHAT */}
                <div className="bg-[#07090E] border border-[#1F293D] rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#94A3B8]" /> Dernier Prix Achat
                      </span>
                      <span className="border border-[#1F293D] bg-[#111622] text-[#94A3B8] px-2 py-0.5 rounded text-[10px] font-mono">Récent</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#FFFFFF] font-mono tabular-nums">
                        {decision.lastPurchase?.price ? decision.lastPurchase.price.toFixed(3) : '0.000'}
                      </span>
                      <span className="text-xs text-[#94A3B8] font-bold">TND HT</span>
                    </div>
                    {purchaseSparkData.length >= 2 && (
                      <div className="mt-3 opacity-80">
                        <Sparkline data={purchaseSparkData} width={130} height={32} />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1F293D] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Fournisseur :</span>
                      <strong className="text-[#FFFFFF] font-bold truncate max-w-[140px]">{decision.lastPurchase?.supplier || 'N/A'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#94A3B8]">Date :</span>
                      <span className="font-mono text-[#94A3B8]">{decision.lastPurchase?.date || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#94A3B8]">N° PO :</span>
                      <span className="font-mono text-[#FFFFFF] font-semibold">{decision.lastPurchase?.orderReference || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. DERNIER PRIX VENTE */}
                <div className="bg-[#07090E] border border-[#1F293D] rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#94A3B8]" /> Dernier Prix Vente
                      </span>
                      <span className="border border-[#1F293D] bg-[#111622] text-[#94A3B8] px-2 py-0.5 rounded text-[10px] font-mono">Client</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#FFFFFF] font-mono tabular-nums">
                        {decision.lastSale?.price ? decision.lastSale.price.toFixed(3) : '0.000'}
                      </span>
                      <span className="text-xs text-[#94A3B8] font-bold">TND HT</span>
                    </div>
                    {saleSparkData.length >= 2 && (
                      <div className="mt-3 opacity-80">
                        <Sparkline data={saleSparkData} width={130} height={32} />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1F293D] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8]">Client :</span>
                      <strong className="text-[#FFFFFF] font-bold truncate max-w-[140px]">{decision.lastSale?.customer || 'N/A'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#94A3B8]">Date :</span>
                      <span className="font-mono text-[#94A3B8]">{decision.lastSale?.date || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#94A3B8]">N° SO :</span>
                      <span className="font-mono text-[#FFFFFF] font-semibold">{decision.lastSale?.orderReference || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Margin + Recommendation 2-col strip */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#07090E] border border-[#1F293D] rounded-xl flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#111622] border border-[#1F293D] flex items-center justify-center text-[#FFFFFF] shrink-0">
                    <TrendingUp className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Marge Brute Constatée</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-extrabold font-mono text-[#FFFFFF]">
                        {decision.marginAmount?.toFixed(3) || '0.000'} TND
                      </span>
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded border border-[#1F293D] bg-[#111622] text-[#94A3B8]">
                        {(decision.marginPercent || 0) > 0 ? '+' : ''}{decision.marginPercent?.toFixed(1) || '0'}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#07090E] border border-[#1F293D] rounded-xl flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#111622] border border-[#1F293D] flex items-center justify-center text-[#FFFFFF] shrink-0">
                    <Sparkles className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Recommandation Achat</span>
                    <span className="text-sm font-semibold text-[#FFFFFF] truncate block">{decision.recommendation}</span>
                    {decision.potentialSavings > 0 && (
                      <span className="text-[11px] text-[#94A3B8] font-mono">Gain potentiel : +{decision.potentialSavings.toFixed(3)} TND / pièce</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Detail Card */}
          {product && (
            <div className="bg-[#111622] border border-[#1F293D] rounded-xl shadow-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#07090E] border border-[#1F293D] flex items-center justify-center text-[#94A3B8] shrink-0">
                  <FileText className="w-5 h-5 text-[#94A3B8]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base md:text-lg font-bold text-[#FFFFFF] uppercase tracking-tight">
                      {product.name}
                    </span>
                    <span className="font-mono text-xs bg-[#07090E] text-[#94A3B8] px-2.5 py-0.5 rounded-md border border-[#1F293D]">
                      Réf: {product.reference}
                    </span>
                    {product.vehicleModel && (
                      <span className="text-xs bg-[#07090E] text-[#94A3B8] px-2.5 py-0.5 rounded-md border border-[#1F293D]">
                        {product.vehicleModel}
                      </span>
                    )}
                    {product.category && (
                      <span className="text-[11px] bg-[#07090E] text-[#94A3B8] px-2 py-0.5 rounded border border-[#1F293D]">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Fiche article Odoo ID #{product.id} • Stock dispo : <strong className="text-[#FFFFFF] font-mono">{product.stockAvailable} pcs</strong>
                  </p>
                </div>
              </div>

              {/* Quick KPIs on Product */}
              <div className="flex items-center gap-3 text-xs shrink-0">
                <div className="px-3.5 py-2 bg-[#07090E] rounded-lg border border-[#1F293D] text-center">
                  <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Stock</span>
                  <span className="text-base font-extrabold text-[#FFFFFF] font-mono">
                    {product.stockAvailable} pcs
                  </span>
                </div>
                <div className="px-3.5 py-2 bg-[#07090E] rounded-lg border border-[#1F293D] text-center">
                  <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Achats</span>
                  <span className="text-base font-extrabold text-[#FFFFFF] font-mono">{purchases.length}</span>
                </div>
                <div className="px-3.5 py-2 bg-[#07090E] rounded-lg border border-[#1F293D] text-center">
                  <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Ventes</span>
                  <span className="text-base font-extrabold text-[#FFFFFF] font-mono">{sales.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs for Single View */}
          <div className="border-b border-[#1F293D] flex items-center justify-between gap-4 flex-wrap pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('purchases')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm uppercase tracking-wider transition-all duration-200 ${
                  activeTab === 'purchases'
                    ? 'bg-[#1F293D] text-[#FFFFFF] border border-[#1F293D] font-bold'
                    : 'bg-[#07090E] text-[#94A3B8] hover:text-[#FFFFFF] border border-[#1F293D]'
                }`}
              >
                <Building2 className="w-4 h-4 text-[#94A3B8]" />
                <span>1. Achats Fournisseurs</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#111622] text-[#94A3B8] font-mono">
                  {purchases.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('sales')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm uppercase tracking-wider transition-all duration-200 ${
                  activeTab === 'sales'
                    ? 'bg-[#1F293D] text-[#FFFFFF] border border-[#1F293D] font-bold'
                    : 'bg-[#07090E] text-[#94A3B8] hover:text-[#FFFFFF] border border-[#1F293D]'
                }`}
              >
                <Users className="w-4 h-4 text-[#94A3B8]" />
                <span>2. Ventes Clients</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#111622] text-[#94A3B8] font-mono">
                  {sales.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('movements')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm uppercase tracking-wider transition-all duration-200 ${
                  activeTab === 'movements'
                    ? 'bg-[#1F293D] text-[#FFFFFF] border border-[#1F293D] font-bold'
                    : 'bg-[#07090E] text-[#94A3B8] hover:text-[#FFFFFF] border border-[#1F293D]'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 text-[#94A3B8]" />
                <span>3. Mouvements de Stock</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#111622] text-[#94A3B8] font-mono">
                  {movements.length}
                </span>
              </button>
            </div>

            {/* Supplier Filter for Purchases */}
            {activeTab === 'purchases' && uniqueSuppliers.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#94A3B8] font-medium">Filtrer par Fournisseur :</span>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="bg-[#07090E] border border-[#1F293D] text-[#FFFFFF] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#EF4444]"
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
            <div className="bg-[#111622] border border-[#1F293D] rounded-xl overflow-hidden shadow-lg">
              <div className="px-5 py-4 border-b border-[#1F293D] flex items-center justify-between bg-[#07090E]/40">
                <div>
                  <h3 className="font-bold text-[#FFFFFF] text-sm md:text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#94A3B8]" />
                    Historique des Commandes d'Achat Fournisseurs
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Coûts unitaires, montants totaux et dates exactes des réceptions dans Odoo ERP.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#94A3B8] font-medium">Dépense cumulée : </span>
                  <span className="text-sm font-extrabold text-[#FFFFFF] font-mono">
                    {filteredPurchases.reduce((acc, p) => acc + p.totalCost, 0).toFixed(3)} TND
                  </span>
                </div>
              </div>

              {filteredPurchases.length === 0 ? (
                <div className="p-12 text-center text-[#94A3B8]">
                  <Building2 className="w-10 h-10 mx-auto text-[#64748B] mb-3" />
                  <p className="font-semibold text-[#94A3B8]">Aucun achat enregistré sur cette période.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#94A3B8]">
                    <thead className="bg-[#07090E] text-[11px] font-bold uppercase text-[#94A3B8] tracking-wider border-b border-[#1F293D]">
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
                    <tbody className="divide-y divide-[#1F293D]/60">
                      {filteredPurchases.map((po, idx) => (
                        <tr key={po.id || idx} className="odd:bg-[#111622] even:bg-[#0E1420] hover:bg-[#161D2E] transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                              <span>{po.date}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#FFFFFF]">{po.supplierName}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                            {po.orderReference}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-md bg-[#07090E] border border-[#1F293D] font-mono text-[#FFFFFF]">
                              {po.quantity} pcs
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[#FFFFFF]">
                            {po.unitPrice.toFixed(3)} <span className="text-[#94A3B8] text-[10px]">TND</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#FFFFFF]">
                            {po.totalCost.toFixed(3)} <span className="text-[#94A3B8] text-[10px]">TND</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="border border-[#1F293D] bg-[#07090E] text-[#94A3B8] px-2.5 py-1 rounded text-xs font-mono">
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
            <div className="bg-[#111622] border border-[#1F293D] rounded-xl overflow-hidden shadow-lg">
              <div className="px-5 py-4 border-b border-[#1F293D] flex items-center justify-between bg-[#07090E]/40">
                <div>
                  <h3 className="font-bold text-[#FFFFFF] text-sm md:text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#94A3B8]" />
                    Historique des Ventes &amp; Dossiers Clients
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Prix de vente réels facturés aux clients et compagnies d'assurance dans Odoo.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#94A3B8] font-medium">Chiffre d'affaires cumulé : </span>
                  <span className="text-sm font-extrabold text-[#FFFFFF] font-mono">
                    {sales.reduce((acc, s) => acc + s.totalCost, 0).toFixed(3)} TND
                  </span>
                </div>
              </div>

              {sales.length === 0 ? (
                <div className="p-12 text-center text-[#94A3B8]">
                  <Users className="w-10 h-10 mx-auto text-[#64748B] mb-3" />
                  <p className="font-semibold text-[#94A3B8]">Aucune vente enregistrée pour cet article sur cette période.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#94A3B8]">
                    <thead className="bg-[#07090E] text-[11px] font-bold uppercase text-[#94A3B8] tracking-wider border-b border-[#1F293D]">
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
                    <tbody className="divide-y divide-[#1F293D]/60">
                      {sales.map((s, idx) => (
                        <tr key={s.id || idx} className="odd:bg-[#111622] even:bg-[#0E1420] hover:bg-[#161D2E] transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                              <span>{s.date}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#FFFFFF]">
                            {s.customerName}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                            {s.orderReference}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-md bg-[#07090E] border border-[#1F293D] font-mono text-[#FFFFFF]">
                              {s.quantity} pcs
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[#FFFFFF]">
                            {s.unitPrice.toFixed(3)} <span className="text-[#94A3B8] text-[10px]">TND</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#FFFFFF]">
                            {s.totalCost.toFixed(3)} <span className="text-[#94A3B8] text-[10px]">TND</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="border border-[#1F293D] bg-[#07090E] text-[#94A3B8] px-2.5 py-1 rounded text-xs font-mono">
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
            <div className="bg-[#111622] border border-[#1F293D] rounded-xl overflow-hidden shadow-lg">
              <div className="px-5 py-4 border-b border-[#1F293D] flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-sm md:text-base flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-[#94A3B8]" />
                    Synthèse des Mouvements de Stock (Achats & Ventes)
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Historique chronologique de tous les flux d'entrée et de sortie.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 font-mono text-[#FFFFFF] bg-[#07090E] border border-[#1F293D] px-2.5 py-1 rounded">
                    Entrée ({summary?.inMovesCount || 0})
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[#94A3B8] bg-[#07090E] border border-[#1F293D] px-2.5 py-1 rounded">
                    Sortie ({summary?.outMovesCount || 0})
                  </span>
                </div>
              </div>

              {movements.length === 0 ? (
                <div className="p-12 text-center text-[#94A3B8]">
                  <ArrowLeftRight className="w-10 h-10 mx-auto text-[#94A3B8]/30 mb-3" />
                  <p className="font-medium text-[#94A3B8]">Aucun mouvement de stock sur cette période.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#94A3B8]">
                    <thead className="bg-[#07090E] text-[11px] font-semibold uppercase text-[#94A3B8] tracking-wider border-b border-[#1F293D]">
                      <tr>
                        <th className="py-3 px-4">Date & Heure</th>
                        <th className="py-3 px-4">Type de Mouvement</th>
                        <th className="py-3 px-4">Réf Mouvement / Bon</th>
                        <th className="py-3 px-4">Document Source</th>
                        <th className="py-3 px-4">Origine → Destination</th>
                        <th className="py-3 px-4 text-center">Quantité</th>
                        <th className="py-3 px-4 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F293D]">
                      {movements.map((m, idx) => (
                        <tr key={m.id || idx} className="odd:bg-[#111622] even:bg-[#0D111A] hover:bg-[#1F293D]/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                              <span className="text-[#FFFFFF]">{m.date}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border border-[#1F293D] bg-[#07090E] text-[#94A3B8]">
                              {m.type === 'ACHAT' && <ArrowDownRight className="w-3 h-3 text-[#FFFFFF]" />}
                              {m.type === 'VENTE' && <ArrowUpRight className="w-3 h-3 text-[#FFFFFF]" />}
                              {m.type === 'TRANSFERT' && <ArrowLeftRight className="w-3 h-3 text-[#94A3B8]" />}
                              <span className="text-[#FFFFFF]">{m.typeLabel}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            {m.reference}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                            {m.origin || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-[11px] flex items-center gap-1.5 flex-wrap">
                              <span className="text-[#94A3B8] bg-[#07090E] px-2 py-0.5 rounded border border-[#1F293D] truncate max-w-[140px]" title={m.sourceLocation}>
                                {m.sourceLocation}
                              </span>
                              <span className="text-[#94A3B8] font-mono">→</span>
                              <span className="text-[#FFFFFF] bg-[#07090E] px-2 py-0.5 rounded border border-[#1F293D] font-medium truncate max-w-[140px]" title={m.destLocation}>
                                {m.destLocation}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-1 rounded font-mono text-xs bg-[#07090E] text-[#FFFFFF] border border-[#1F293D]">
                              {m.type === 'VENTE' ? `-${m.quantity}` : `+${m.quantity}`} pcs
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="bg-[#07090E] text-[#94A3B8] border border-[#1F293D] px-2.5 py-1 rounded text-xs font-mono">
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
        <div className="bg-[#111622] border border-[#1F293D] rounded-xl overflow-hidden shadow-lg space-y-4 p-5">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#1F293D]">
            <div>
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#94A3B8]" />
                Tableau Comparatif & Suivi par Lot ({batchResults.length} articles)
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Stock, meilleur prix d'achat, dernier prix de vente et synthèse groupée Odoo.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={batchFilterTerm}
                  onChange={(e) => setBatchFilterTerm(e.target.value)}
                  placeholder="Filtrer dans le lot..."
                  className="pl-9 pr-3 py-1.5 bg-[#07090E] border border-[#1F293D] rounded-lg text-xs text-[#FFFFFF] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#94A3B8]"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-[#94A3B8] cursor-pointer select-none bg-[#07090E] px-3 py-1.5 rounded-lg border border-[#1F293D]">
                <input
                  type="checkbox"
                  checked={batchStockOnly}
                  onChange={(e) => setBatchStockOnly(e.target.checked)}
                  className="rounded border-[#1F293D] bg-[#07090E] text-[#94A3B8] focus:ring-0"
                />
                <span>En stock uniquement</span>
              </label>

              <button
                type="button"
                onClick={exportBatchToExcel}
                className="bg-[#07090E] hover:bg-[#1F293D] text-[#FFFFFF] border border-[#1F293D] px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Export Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#94A3B8]">
              <thead className="bg-[#07090E] text-[11px] font-semibold uppercase text-[#94A3B8] tracking-wider border-b border-[#1F293D]">
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
              <tbody className="divide-y divide-[#1F293D]">
                {filteredBatchResults.map((item, idx) => (
                  <tr key={idx} className="odd:bg-[#111622] even:bg-[#0D111A] hover:bg-[#1F293D]/30 transition-colors">
                    <td className="py-3.5 px-3.5 font-mono font-medium text-white">
                      <span className="bg-[#07090E] px-2 py-1 rounded border border-[#1F293D] text-[#FFFFFF]">
                        {item.reference}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5">
                      <div className="font-medium text-[#FFFFFF]">{item.name}</div>
                      {item.vehicleModel && item.vehicleModel !== '-' && (
                        <span className="text-[10px] text-[#94A3B8] font-mono">{item.vehicleModel}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 bg-[#07090E] text-[#FFFFFF] border border-[#1F293D] px-2.5 py-1 rounded font-mono text-xs">
                        {item.stockAvailable} pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 font-mono">
                      {item.bestPurchasePrice > 0 ? (
                        <div>
                          <span className="font-medium text-[#FFFFFF]">{item.bestPurchasePrice.toFixed(3)} TND</span>
                          <div className="text-[10px] text-[#94A3B8] font-sans truncate max-w-[140px]" title={item.bestSupplier}>
                            {item.bestSupplier}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#94A3B8]/50">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono">
                      {item.lastPurchasePrice > 0 ? (
                        <div>
                          <span className="font-medium text-[#FFFFFF]">{item.lastPurchasePrice.toFixed(3)} TND</span>
                          <div className="text-[10px] text-[#94A3B8] font-sans truncate max-w-[140px]" title={item.lastSupplier}>
                            {item.lastSupplier}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#94A3B8]/50">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono">
                      {item.lastSellingPrice > 0 ? (
                        <div>
                          <span className="font-medium text-[#FFFFFF]">{item.lastSellingPrice.toFixed(3)} TND</span>
                          <div className="text-[10px] text-[#94A3B8] font-sans truncate max-w-[140px]" title={item.lastCustomer}>
                            {item.lastCustomer}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#94A3B8]/50">-</span>
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
                        className="p-1.5 rounded-lg bg-[#07090E] hover:bg-[#1F293D] text-[#94A3B8] hover:text-[#FFFFFF] border border-[#1F293D] transition"
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
