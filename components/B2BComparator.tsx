"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '@/lib/context';
import {
  Search, Package, Upload, Download, FileSpreadsheet, RefreshCw,
  CheckCircle2, AlertTriangle, Clock, Layers, ArrowRight, ExternalLink,
  Car, Shield, Sparkles, Filter, Copy, Check, Plus, Trash2,
  ChevronDown, ChevronRight, HelpCircle, FileText, ArrowUpDown,
  LayoutGrid, List, Tag, Building2, SlidersHorizontal, CheckCircle, CheckSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';

export type SearchMode = 'SINGLE' | 'MULTI' | 'VEHICLE';

interface SupplierStatus {
  id: string;
  name: string;
  status: 'idle' | 'loading' | 'found' | 'info' | 'error';
  itemCount?: number;
  bestPrice?: number;
}

interface B2BItem {
  name: string;
  reference?: string;
  brand?: string;
  designation?: string;
  description?: string;
  price: number;
  prixHT?: number;
  discount: number;
  availability: string;
  rawStock: number;
  available: boolean;
  supplierName: string;
  fournisseur?: string;
  matchType?: 'DIRECT' | 'EQUIVALENCE' | 'FALLBACK';
  isFallback?: boolean;
}

interface MultiRefResult {
  ref: string;
  designation?: string;
  status: 'pending' | 'loading' | 'success' | 'not_found' | 'error';
  items: B2BItem[];
  bestItem?: B2BItem | null;
  errorMessage?: string;
}

export default function B2BComparator() {
  const { setAdminSection } = useApp();
  
  // ─── Modes & Navigation ──────────────────────────────────────────────────
  const [activeMode, setActiveMode] = useState<SearchMode>('SINGLE');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  
  // ─── Mode 1: Single Ref ──────────────────────────────────────────────────
  const [singleQuery, setSingleQuery] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<any>(null);
  const [singleFilter, setSingleFilter] = useState<'ALL' | 'DISPO' | 'COMMANDE'>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');
  const [itemSearchText, setItemSearchText] = useState<string>('');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'stock_desc' | 'brand_asc' | 'supplier_asc'>('price_asc');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [copiedItemKey, setCopiedItemKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ─── Mode 2: Multi-Refs / Import ─────────────────────────────────────────
  const [multiInputText, setMultiInputText] = useState('');
  const [multiRefsList, setMultiRefsList] = useState<string[]>([]);
  const [multiResults, setMultiResults] = useState<MultiRefResult[]>([]);
  const [multiRunning, setMultiRunning] = useState(false);
  const [multiProgress, setMultiProgress] = useState({ current: 0, total: 0 });
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [selectedForQuote, setSelectedForQuote] = useState<Record<string, B2BItem>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Mode 3: Vehicle + VIN ───────────────────────────────────────────────
  const [vinInput, setVinInput] = useState('');
  const [vinDecoding, setVinDecoding] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');
  const [partKeyword, setPartKeyword] = useState('');
  const [vehicleSchematics, setVehicleSchematics] = useState<any[]>([]);
  const [vehicleSearchLoading, setVehicleSearchLoading] = useState(false);

  // ─── Supplier Statuses ───────────────────────────────────────────────────
  const [supplierStatuses, setSupplierStatuses] = useState<Record<string, 'idle' | 'loading' | 'found' | 'info' | 'error'>>({});
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // ─── Load Suppliers & Pending Ref on Mount ──────────────────────────────
  const loadSuppliers = async (silent = false) => {
    if (!silent) setLoadingSuppliers(true);
    try {
      const res = await fetch('/api/suppliers');
      const d = await res.json();
      const sups = d.data || [];
      setSuppliers(sups);
      setSelectedSupplierIds(prev => {
        // Keep existing selections or select all if first load
        if (prev.length === 0) return sups.map((s: any) => s.id);
        const validIds = sups.map((s: any) => s.id);
        return prev.filter(id => validIds.includes(id));
      });
    } catch (err) {
      console.error("Error loading suppliers:", err);
    } finally {
      if (!silent) setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    loadSuppliers();

    // Listen for cross-component supplier updates
    const handleSuppliersUpdated = () => {
      loadSuppliers(true);
    };
    window.addEventListener('autop_suppliers_updated', handleSuppliersUpdated);

    // Handle incoming pending search ref from Parts Catalogue or other sections
    const pending = localStorage.getItem('robotB2B_pendingRef');
    if (pending) {
      localStorage.removeItem('robotB2B_pendingRef');
      setSingleQuery(pending);
      setActiveMode('SINGLE');
      setTimeout(() => {
        triggerSingleSearch(pending);
      }, 200);
    }

    const handleRefEvent = (e: any) => {
      if (e.detail) {
        setSingleQuery(e.detail);
        setActiveMode('SINGLE');
        triggerSingleSearch(e.detail);
      }
    };
    window.addEventListener('robotB2B_searchRef' as any, handleRefEvent);
    return () => {
      window.removeEventListener('robotB2B_searchRef' as any, handleRefEvent);
      window.removeEventListener('autop_suppliers_updated', handleSuppliersUpdated);
    };
  }, []);

  // ─── Helper: Toggle Suppliers ───────────────────────────────────────────
  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllSuppliers = () => {
    if (selectedSupplierIds.length === suppliers.length) {
      setSelectedSupplierIds([]);
    } else {
      setSelectedSupplierIds(suppliers.map(s => s.id));
    }
  };

  // ─── MODE 1: Execute Single Search ───────────────────────────────────────
  const triggerSingleSearch = async (queryText?: string) => {
    const q = (queryText || singleQuery).trim();
    if (!q) return;

    // Reset sub-filters so new search displays all matching results immediately
    setSingleFilter('ALL');
    setSelectedBrand('ALL');
    setSelectedSupplierFilter('ALL');
    setItemSearchText('');

    setSingleLoading(true);
    setSingleResult(null);

    // Initial loading states for selected suppliers
    const initialStatuses: Record<string, 'loading'> = {};
    selectedSupplierIds.forEach(id => { initialStatuses[id] = 'loading'; });
    setSupplierStatuses(initialStatuses);

    try {
      const res = await fetch('/api/b2b/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          supplierIds: selectedSupplierIds.length > 0 ? selectedSupplierIds : suppliers.map(s => s.id)
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setSingleResult(data.data);

        // Update individual supplier status indicators
        const newStatuses: Record<string, 'found' | 'info' | 'error'> = {};
        (data.data.suppliersBreakdown || []).forEach((bd: any) => {
          if (bd.items && bd.items.length > 0) {
            newStatuses[bd.supplierId] = 'found';
          } else if (bd.statusCode === 'ERROR' || bd.statusCode === 'TIMEOUT') {
            newStatuses[bd.supplierId] = 'error';
          } else {
            newStatuses[bd.supplierId] = 'info';
          }
        });
        setSupplierStatuses(prev => ({ ...prev, ...newStatuses }));
      } else {
        setSingleResult({
          error: data.error || "Aucun résultat trouvé",
          items: []
        });
      }
    } catch (err: any) {
      setSingleResult({
        error: `Erreur réseau: ${err.message}`,
        items: []
      });
    } finally {
      setSingleLoading(false);
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSingleSearch();
  };

  // ─── Helper function for accurate stock detection ──────────────────────────
  const isItemInStock = (item: B2BItem): boolean => {
    if (typeof item.rawStock === 'number' && item.rawStock > 0) return true;
    if (item.available === false || item.rawStock === 0) return false;
    
    const avail = (item.availability || '').toLowerCase().trim();
    if (
      avail.includes('hors stock') ||
      avail.includes('non disponible') ||
      avail.includes('sur commande') ||
      avail.includes('rupture') ||
      avail.includes('épuisé') ||
      avail.includes('epuise') ||
      avail.includes('non trouvé') ||
      avail.includes('non trouve')
    ) {
      return false;
    }
    
    if (avail.includes('en stock') || (avail.includes('disponible') && !avail.includes('non disponible'))) {
      return true;
    }
    
    return Boolean(item.available);
  };

  // ─── Stats & Filter Options Extraction ────────────────────────────────────
  const rawItems: B2BItem[] = useMemo(() => {
    return singleResult?.items || [];
  }, [singleResult]);

  const stockStats = useMemo(() => {
    let inStock = 0;
    let onOrder = 0;
    rawItems.forEach(it => {
      if (isItemInStock(it)) inStock++;
      else onOrder++;
    });
    return { total: rawItems.length, inStock, onOrder };
  }, [rawItems]);

  const availableBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    rawItems.forEach(it => {
      const b = (it.brand || 'ADAPTABLE').trim().toUpperCase();
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawItems]);

  const availableSuppliersList = useMemo(() => {
    const counts: Record<string, number> = {};
    rawItems.forEach(it => {
      const s = (it.supplierName || it.fournisseur || 'FOURNISSEUR').trim();
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawItems]);

  // Filter and sort items for Mode 1
  const processedSingleItems = useMemo(() => {
    let list = rawItems.filter(item => {
      const isDispo = isItemInStock(item);
      
      // 1. Filtre Disponibilité
      if (singleFilter === 'DISPO' && !isDispo) return false;
      if (singleFilter === 'COMMANDE' && isDispo) return false;

      // 2. Filtre Marque
      if (selectedBrand !== 'ALL') {
        const itemBrand = (item.brand || 'ADAPTABLE').trim().toUpperCase();
        if (itemBrand !== selectedBrand.toUpperCase()) return false;
      }

      // 3. Filtre Fournisseur
      if (selectedSupplierFilter !== 'ALL') {
        const itemSup = (item.supplierName || item.fournisseur || '').trim().toUpperCase();
        if (itemSup !== selectedSupplierFilter.toUpperCase()) return false;
      }

      // 4. Recherche textuelle dans les résultats
      if (itemSearchText.trim()) {
        const q = itemSearchText.trim().toUpperCase();
        const refMatch = (item.name || item.reference || '').toUpperCase().includes(q);
        const brandMatch = (item.brand || '').toUpperCase().includes(q);
        const descMatch = (item.designation || item.description || '').toUpperCase().includes(q);
        const supMatch = (item.supplierName || item.fournisseur || '').toUpperCase().includes(q);
        if (!refMatch && !brandMatch && !descMatch && !supMatch) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const priceA = a.price || a.prixHT || 0;
      const priceB = b.price || b.prixHT || 0;
      if (sortBy === 'price_asc') {
        if (priceA === 0) return 1;
        if (priceB === 0) return -1;
        return priceA - priceB;
      }
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'stock_desc') return (b.rawStock || 0) - (a.rawStock || 0);
      if (sortBy === 'brand_asc') return (a.brand || '').localeCompare(b.brand || '');
      if (sortBy === 'supplier_asc') return (a.supplierName || '').localeCompare(b.supplierName || '');
      return 0;
    });

    return list;
  }, [rawItems, singleFilter, selectedBrand, selectedSupplierFilter, itemSearchText, sortBy]);

  const copyItemInfo = (item: B2BItem, key: string) => {
    const text = `Réf: ${item.name || item.reference} | Marque: ${item.brand || 'N/A'} | Désignation: ${item.designation || item.description || 'Pièce'} | Fournisseur: ${item.supplierName || 'Fournisseur'} | Prix: ${(item.price || item.prixHT || 0).toFixed(3)} TND HT | Stock: ${item.rawStock > 0 ? item.rawStock : 'Sur commande'}`;
    navigator.clipboard.writeText(text);
    setCopiedItemKey(key);
    setToastMessage(`Offre ${item.name || item.reference} copiée dans le presse-papier !`);
    setTimeout(() => setCopiedItemKey(null), 2500);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddToQuote = (item: B2BItem) => {
    const singleQuoteItem = {
      reference: item.name || item.reference,
      designation: item.designation || item.description || `Article ${item.name}`,
      qty: 1,
      puHT: item.price || item.prixHT || 0,
      price: item.price || item.prixHT || 0,
      discount: item.discount || 0,
      supplierName: item.supplierName || 'Fournisseur B2B',
      partType: item.brand?.toUpperCase().includes('PEUGEOT') || item.brand?.toUpperCase().includes('CITROEN') || item.brand?.toUpperCase().includes('ORIGINE') ? 'ORIGINE' : 'ADAPTABLE',
      offres: [{
        type: item.brand?.toUpperCase().includes('PEUGEOT') || item.brand?.toUpperCase().includes('CITROEN') || item.brand?.toUpperCase().includes('ORIGINE') ? 'ORIGINE' : 'ADAPTABLE',
        supplierName: item.supplierName || 'Fournisseur B2B',
        purchasePrice: item.price || item.prixHT || 0,
        sellingPrice: parseFloat(((item.price || item.prixHT || 0) * 1.30).toFixed(3))
      }]
    };
    localStorage.setItem('quote_prefill_items', JSON.stringify([singleQuoteItem]));
    setToastMessage(`✓ Article ${item.name || item.reference} ajouté au devis !`);
    setTimeout(() => {
      setToastMessage(null);
      setAdminSection('creer-devis');
    }, 400);
  };

  // ─── MODE 2: Multi-References & Batch Execution ───────────────────────────
  const handleParseMultiInput = () => {
    const refs = multiInputText
      .split(/[\n,;]+/)
      .map(r => r.trim().toUpperCase().replace(/[\s\-_.\/]+/g, ""))
      .filter(r => r.length >= 2);
    
    // Deduplicate
    const uniqueRefs = Array.from(new Set(refs));
    setMultiRefsList(uniqueRefs);
    setMultiResults(uniqueRefs.map(ref => ({
      ref,
      status: 'pending',
      items: []
    })));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const extractedRefs: string[] = [];
        rows.forEach((row, idx) => {
          if (!row || row.length === 0) return;
          // Look across first 3 columns for reference-like strings
          for (let col = 0; col < Math.min(row.length, 3); col++) {
            const cell = String(row[col] || '').trim();
            if (cell && cell.length >= 2 && cell.length <= 30 && !cell.toLowerCase().includes('ref') && !cell.toLowerCase().includes('code')) {
              const clean = cell.replace(/[\s\-_.\/]+/g, "").toUpperCase();
              if (clean.length >= 2) extractedRefs.push(clean);
              break;
            }
          }
        });

        const unique = Array.from(new Set(extractedRefs));
        if (unique.length > 0) {
          setMultiInputText(unique.join('\n'));
          setMultiRefsList(unique);
          setMultiResults(unique.map(ref => ({
            ref,
            status: 'pending',
            items: []
          })));
        } else {
          alert("Aucune référence valide trouvée dans le fichier.");
        }
      } catch (err: any) {
        alert(`Erreur de lecture du fichier Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runBatchComparison = async () => {
    if (multiRefsList.length === 0 || multiRunning) return;

    setMultiRunning(true);
    setMultiProgress({ current: 0, total: multiRefsList.length });

    const updated = [...multiResults];

    for (let i = 0; i < multiRefsList.length; i++) {
      const targetRef = multiRefsList[i];
      setMultiProgress({ current: i + 1, total: multiRefsList.length });

      // Mark current as loading
      updated[i] = { ...updated[i], status: 'loading' };
      setMultiResults([...updated]);

      try {
        const res = await fetch('/api/b2b/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: targetRef,
            supplierIds: selectedSupplierIds.length > 0 ? selectedSupplierIds : suppliers.map(s => s.id)
          })
        });

        const data = await res.json();
        if (res.ok && data.success && data.data) {
          const items: B2BItem[] = data.data.items || [];
          const best = items.find(it => it.available && it.price > 0) || items.find(it => it.price > 0) || items[0] || null;
          
          updated[i] = {
            ref: targetRef,
            designation: best?.designation || best?.description || `Article ${targetRef}`,
            status: items.length > 0 ? 'success' : 'not_found',
            items,
            bestItem: best
          };

          // Auto-select best item for quote creation
          if (best) {
            setSelectedForQuote(prev => ({ ...prev, [targetRef]: best }));
          }
        } else {
          updated[i] = {
            ref: targetRef,
            status: 'not_found',
            items: [],
            errorMessage: data.error || 'Non trouvé'
          };
        }
      } catch (err: any) {
        updated[i] = {
          ref: targetRef,
          status: 'error',
          items: [],
          errorMessage: err.message
        };
      }

      setMultiResults([...updated]);
    }

    setMultiRunning(false);
  };

  const exportMultiToExcel = () => {
    if (multiResults.length === 0) return;

    const exportData = multiResults.map(r => {
      const best = r.bestItem;
      return {
        'Référence Recherchée': r.ref,
        'Désignation': r.designation || best?.designation || 'N/A',
        'Meilleur Fournisseur': best?.supplierName || best?.fournisseur || 'Non trouvé',
        'Marque': best?.brand || 'N/A',
        'Prix HT (TND)': best ? (best.price || best.prixHT || 0).toFixed(3) : '0.000',
        'Remise (%)': best ? `${best.discount || 0}%` : '0%',
        'Disponibilité': best?.availability || 'Sur commande / Hors stock',
        'Stock Réel': best?.rawStock || 0,
        'Total Offres': r.items.length
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparatif B2B");
    XLSX.writeFile(wb, `AUTOP_Comparatif_B2B_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const transferAllToQuote = () => {
    const itemsToTransfer = Object.values(selectedForQuote).map(item => ({
      reference: item.name || item.reference,
      designation: item.designation || item.description || `Article ${item.name}`,
      qty: 1,
      puHT: item.price || item.prixHT || 0,
      price: item.price || item.prixHT || 0,
      discount: item.discount || 0,
      supplierName: item.supplierName || 'Fournisseur B2B',
      partType: item.brand?.toUpperCase().includes('ORIGINE') ? 'ORIGINE' : 'ADAPTABLE',
      offres: [
        {
          type: item.brand?.toUpperCase().includes('ORIGINE') ? 'ORIGINE' : 'ADAPTABLE',
          supplierName: item.supplierName || 'Fournisseur B2B',
          purchasePrice: item.price || item.prixHT || 0,
          sellingPrice: parseFloat(((item.price || item.prixHT || 0) * 1.30).toFixed(3))
        }
      ]
    }));

    if (itemsToTransfer.length === 0) {
      alert("Aucune pièce disponible à transférer.");
      return;
    }

    // Pass data via localStorage or redirect
    localStorage.setItem('quote_prefill_items', JSON.stringify(itemsToTransfer));
    alert(`✅ ${itemsToTransfer.length} article(s) prêts ! Redirection vers la création de devis...`);
    setAdminSection('creer-devis');
  };

  // ─── MODE 3: Vehicle & VIN Decoder ────────────────────────────────────────
  const handleDecodeVin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const vin = vinInput.trim().toUpperCase();
    if (!vin || vin.length < 5) {
      alert("Veuillez saisir un numéro de châssis / VIN valide (min 5 caractères).");
      return;
    }

    setVinDecoding(true);
    setVehicleInfo(null);
    setVehicleSchematics([]);

    try {
      const res = await fetch('/api/catalog/headless-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVehicleInfo({
          vin: data.vin,
          brand: data.brand,
          model: data.model,
          year: data.year,
          engine: data.engine,
          sourceCatalog: data.sourceCatalog
        });
        setVehicleSchematics(data.nativeSchematics || []);
      } else {
        alert(data.error || "Impossible de décoder ce VIN.");
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setVinDecoding(false);
    }
  };

  const handleSearchVehiclePart = async (refOrKeyword: string) => {
    setSingleQuery(refOrKeyword);
    setActiveMode('SINGLE');
    triggerSingleSearch(refOrKeyword);
  };



  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      
      {/* ─── EN-TÊTE PRINCIPAL ROBOT B2B ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-600/30">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-100">
                ROBOT B2B MULTI-FOURNISSEURS
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600/20 text-red-400 border border-red-500/30">
                {suppliers.length} FOURNISSEURS CONNECTÉS
              </span>
            </div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">
              Comparateur en temps réel : FADPRO, STEQ, ROUTE X, MOSAIQUE, SAGAP, CDG, GPG, ITALCAR, PROPARTS, SOCOFA, AAP, etc.
            </p>
          </div>
        </div>

        {/* Action Toggle All Suppliers & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadSuppliers(false)}
            disabled={loadingSuppliers}
            title="Rafraîchir les fournisseurs et accès B2B"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSuppliers ? 'animate-spin text-red-400' : 'text-slate-400'}`} />
            <span>{loadingSuppliers ? 'CHARGEMENT...' : 'ACTUALISER'}</span>
          </button>
          <button
            onClick={toggleSelectAllSuppliers}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            {selectedSupplierIds.length === suppliers.length ? '✖ TOUT DÉCOCHER' : '✅ TOUT COCHER'}
          </button>
        </div>
      </div>

      {/* ─── SÉLECTION DES FOURNISSEURS ACTIFS (PILLS) ────────────────────────── */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            FOURNISSEURS INTERROGÉS EN DIRECT ({selectedSupplierIds.length} / {suppliers.length})
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">
            Cliquez pour activer/désactiver un portail B2B
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {suppliers.map(sup => {
            const isChecked = selectedSupplierIds.includes(sup.id);
            const status = supplierStatuses[sup.id] || 'idle';
            return (
              <button
                key={sup.id}
                type="button"
                onClick={() => toggleSupplier(sup.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase border transition-all ${
                  isChecked
                    ? 'bg-slate-800 text-slate-100 border-red-500/50 shadow-sm shadow-red-500/10'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  status === 'loading' ? 'bg-amber-400 animate-ping' :
                  status === 'found' ? 'bg-emerald-400' :
                  status === 'error' ? 'bg-rose-500' :
                  isChecked ? 'bg-red-500' : 'bg-slate-600'
                }`} />
                <span>{sup.name}</span>
                {status === 'loading' && <span className="text-[9px] text-amber-400 font-normal">...</span>}
                {status === 'found' && <span className="text-[9px] text-emerald-400 font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── ONGLET MODES DE RECHERCHE (LES 3 OPTIONS) ───────────────────────── */}
      <div className="flex border-b border-slate-800 gap-3">
        <button
          onClick={() => setActiveMode('SINGLE')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl text-xs font-black uppercase tracking-wider transition-all border-t border-x ${
            activeMode === 'SINGLE'
              ? 'bg-slate-900 text-white border-slate-700 border-b-2 border-b-red-500 shadow-lg'
              : 'bg-slate-950/40 text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4 text-red-500" />
          <span>1. RÉFÉRENCE UNIQUE</span>
        </button>

        <button
          onClick={() => setActiveMode('MULTI')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl text-xs font-black uppercase tracking-wider transition-all border-t border-x ${
            activeMode === 'MULTI'
              ? 'bg-slate-900 text-white border-slate-700 border-b-2 border-b-red-500 shadow-lg'
              : 'bg-slate-950/40 text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-red-500" />
          <span>2. MULTI-RÉFÉRENCES / IMPORT EXCEL</span>
        </button>

        <button
          onClick={() => setActiveMode('VEHICLE')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl text-xs font-black uppercase tracking-wider transition-all border-t border-x ${
            activeMode === 'VEHICLE'
              ? 'bg-slate-900 text-white border-slate-700 border-b-2 border-b-red-500 shadow-lg'
              : 'bg-slate-950/40 text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Car className="w-4 h-4 text-red-500" />
          <span>3. VÉHICULE & N° DE CHÂSSIS (VIN)</span>
        </button>
      </div>

      {/* ─── CONTENU MODE 1 : RÉFÉRENCE UNIQUE ────────────────────────────────── */}
      {activeMode === 'SINGLE' && (
        <div className="space-y-6">
          {/* Formulaire de recherche */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <form onSubmit={handleSingleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={singleQuery}
                  onChange={e => setSingleQuery(e.target.value)}
                  placeholder="EX: 1306J5, 1611273080, CAN1306J5, KIT EMBRAYAGE..."
                  className="w-full bg-slate-950 text-slate-100 font-bold border border-slate-800 pl-12 pr-4 h-12 rounded-xl text-sm focus:outline-none focus:border-red-500 uppercase tracking-wide placeholder:normal-case placeholder:text-slate-500"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={singleLoading || !singleQuery.trim()}
                className="px-8 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 h-12 cursor-pointer"
              >
                {singleLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>RECHERCHE EN COURS...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>LANCER LE COMPARATEUR</span>
                  </>
                )}
              </button>
            </form>

            {/* Suggestions rapides */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                EXEMPLES RAPIDES :
              </span>
              {['1306J5', 'CAN1306J5', '1611273080', '7401AX', '6208E6', '424917', 'VKMA03257'].map(exampleRef => (
                <button
                  key={exampleRef}
                  type="button"
                  onClick={() => {
                    setSingleQuery(exampleRef);
                    triggerSingleSearch(exampleRef);
                  }}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 rounded-lg text-[10px] font-mono font-bold transition-colors"
                >
                  {exampleRef}
                </button>
              ))}
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/60 shadow-2xl shadow-emerald-500/20 text-slate-100 px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* KPI Summary Cards */}
          {singleResult && rawItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  MEILLEUR PRIX ACHAT HT
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {singleResult.price ? `${Number(singleResult.price).toFixed(3)}` : '—'}
                  </span>
                  <span className="text-xs font-bold text-emerald-500">TND HT</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  Prix le plus avantageux identifié
                </span>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  DISPONIBILITÉ RÉELLE
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-black uppercase ${
                    stockStats.inStock > 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {stockStats.inStock > 0 ? `🟢 ${stockStats.inStock} EN STOCK` : '🟡 SUR COMMANDE'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  {stockStats.inStock} disponible(s) • {stockStats.onOrder} sur commande
                </span>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  TOTAL ARTICLES TROUVÉS
                </span>
                <span className="text-2xl font-black font-mono text-cyan-400">
                  {rawItems.length}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  {availableBrands.length} marque(s) • {availableSuppliersList.length} fournisseur(s)
                </span>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  REMISE MAX CONSTATÉE
                </span>
                <span className="text-2xl font-black font-mono text-rose-400">
                  {singleResult.discount ? `${singleResult.discount}%` : '0%'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  Remise tarifaire distributeur
                </span>
              </div>
            </div>
          )}

          {/* Filter Bar & Controls */}
          {singleResult && rawItems.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              {/* Row 1: Search in Results + Availability Tabs + View Mode */}
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
                {/* Search input inside results */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={itemSearchText}
                    onChange={e => setItemSearchText(e.target.value)}
                    placeholder="Filtrer résultats (réf, désignation, marque...)"
                    className="w-full bg-slate-950 text-slate-200 text-xs font-semibold border border-slate-800 pl-9 pr-3 h-10 rounded-xl focus:outline-none focus:border-red-500 placeholder:text-slate-500"
                  />
                  {itemSearchText && (
                    <button
                      onClick={() => setItemSearchText('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Availability Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSingleFilter('ALL')}
                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                      singleFilter === 'ALL'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    TOUT ({stockStats.total})
                  </button>
                  <button
                    onClick={() => setSingleFilter('DISPO')}
                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                      singleFilter === 'DISPO'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>🟢 EN STOCK</span>
                    <span className="bg-slate-900/60 px-1.5 py-0.5 rounded text-[10px]">{stockStats.inStock}</span>
                  </button>
                  <button
                    onClick={() => setSingleFilter('COMMANDE')}
                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                      singleFilter === 'COMMANDE'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>🟡 SUR COMMANDE</span>
                    <span className="bg-slate-900/60 px-1.5 py-0.5 rounded text-[10px]">{stockStats.onOrder}</span>
                  </button>
                </div>

                {/* View Switch */}
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setViewMode('GRID')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
                      viewMode === 'GRID'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Vue Grille de Cartes"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>GRILLE</span>
                  </button>
                  <button
                    onClick={() => setViewMode('TABLE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
                      viewMode === 'TABLE'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Vue Tableau Comparateur"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>TABLEAU</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Dropdown Filters (Marque, Fournisseur, Tri) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
                {/* Brand Filter */}
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="flex-1">
                    <select
                      value={selectedBrand}
                      onChange={e => setSelectedBrand(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 h-10 outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="ALL">TOUTES LES MARQUES ({rawItems.length})</option>
                      {availableBrands.map(b => (
                        <option key={b.name} value={b.name}>
                          {b.name} ({b.count} article{b.count > 1 ? 's' : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Supplier Filter */}
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="flex-1">
                    <select
                      value={selectedSupplierFilter}
                      onChange={e => setSelectedSupplierFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 h-10 outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="ALL">TOUS LES FOURNISSEURS ({availableSuppliersList.length})</option>
                      {availableSuppliersList.map(s => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.count} article{s.count > 1 ? 's' : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 h-10 outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="price_asc">PRIX CROISSANT (MOINS CHER)</option>
                      <option value="price_desc">PRIX DÉCROISSANT</option>
                      <option value="stock_desc">STOCK DISPONIBLE</option>
                      <option value="brand_asc">PAR MARQUE (A-Z)</option>
                      <option value="supplier_asc">PAR FOURNISSEUR (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips Reset */}
              {(selectedBrand !== 'ALL' || selectedSupplierFilter !== 'ALL' || singleFilter !== 'ALL' || itemSearchText.trim()) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400">Filtres actifs :</span>
                  {selectedBrand !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold text-[11px]">
                      Marque: {selectedBrand}
                      <button onClick={() => setSelectedBrand('ALL')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {selectedSupplierFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold text-[11px]">
                      Fournisseur: {selectedSupplierFilter}
                      <button onClick={() => setSelectedSupplierFilter('ALL')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {singleFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-[11px]">
                      {singleFilter === 'DISPO' ? 'En Stock' : 'Sur Commande'}
                      <button onClick={() => setSingleFilter('ALL')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  {itemSearchText.trim() && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[11px]">
                      Texte: "{itemSearchText}"
                      <button onClick={() => setItemSearchText('')} className="hover:text-white">✕</button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedBrand('ALL');
                      setSelectedSupplierFilter('ALL');
                      setSingleFilter('ALL');
                      setItemSearchText('');
                    }}
                    className="text-[10px] text-red-400 hover:text-red-300 font-black uppercase underline ml-1"
                  >
                    Réinitialiser tout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results Container */}
          {singleResult && (
            <div className="space-y-4">
              {singleResult.error && (
                <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-5 text-center text-rose-300 font-bold uppercase text-xs">
                  {singleResult.error}
                </div>
              )}

              {processedSingleItems.length === 0 && !singleResult.error && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
                  <p className="text-slate-300 font-bold text-sm uppercase">
                    Aucun article ne correspond aux filtres sélectionnés.
                  </p>
                  <p className="text-slate-500 text-xs font-semibold">
                    Essayez d'élargir la marque, le statut de stock ou le fournisseur.
                  </p>
                </div>
              )}

              {/* ─── VUE 1 : GRILLE DE CARTES PREMIUM ────────────────────────────── */}
              {viewMode === 'GRID' && processedSingleItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processedSingleItems.map((item, idx) => {
                    const isAvailable = isItemInStock(item);
                    const itemKey = `${item.name || item.reference}-${item.supplierName}-${idx}`;
                    const isCopied = copiedItemKey === itemKey;
                    const priceVal = item.price || item.prixHT || 0;
                    const isDirect = item.matchType === 'DIRECT';

                    return (
                      <div
                        key={itemKey}
                        className={`bg-slate-900/95 border rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden ${
                          isAvailable
                            ? 'border-emerald-500/40 shadow-emerald-500/5 hover:border-emerald-400/60'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Glow accent */}
                        <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-2xl pointer-events-none ${
                          isAvailable ? 'bg-emerald-500/10' : 'bg-amber-500/5'
                        }`} />

                        <div>
                          {/* Supplier & Match Badge */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 text-slate-200 border border-slate-800 text-xs font-black uppercase">
                              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{item.supplierName || item.fournisseur || 'FOURNISSEUR'}</span>
                            </div>

                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                              isDirect
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                : 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                            }`}>
                              {isDirect ? '🎯 DIRECT' : '🔄 TECDOC / ÉQUIV'}
                            </span>
                          </div>

                          {/* Reference & Brand Header */}
                          <div className="flex items-baseline justify-between gap-2 mb-1.5">
                            <div>
                              <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wider">
                                RÉFÉRENCE
                              </span>
                              <span className="text-lg font-black font-mono text-red-400 uppercase tracking-wide">
                                {item.name || item.reference}
                              </span>
                            </div>

                            <span className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-black uppercase tracking-wider">
                              {item.brand || 'ADAPTABLE'}
                            </span>
                          </div>

                          {/* Detailed Real Designation */}
                          <div className="mb-3">
                            <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wider">
                              DÉSIGNATION ARTICLE
                            </span>
                            <p className="text-xs text-slate-100 font-bold leading-relaxed line-clamp-2 mt-0.5">
                              {item.designation || item.description || `Article ${item.name || item.reference}`}
                            </p>
                          </div>
                        </div>

                        {/* Pricing, Stock & Actions Footer */}
                        <div className="pt-3 border-t border-slate-800/80 mt-2 space-y-3">
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-black block mb-0.5">
                                DISPONIBILITÉ
                              </span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                                isAvailable
                                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                {item.rawStock > 0 ? `En stock (${item.rawStock})` : item.availability || 'Sur commande'}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 uppercase font-black block">
                                PRIX ACHAT HT
                              </span>
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="text-xl font-black font-mono text-emerald-400">
                                  {priceVal > 0 ? priceVal.toFixed(3) : '—'}
                                </span>
                                {priceVal > 0 && <span className="text-[10px] font-bold text-emerald-500">TND</span>}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => copyItemInfo(item, itemKey)}
                              className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>COPIÉ !</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>COPIER OFFRE</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleAddToQuote(item)}
                              className="py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                              title="Ajouter au devis"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ DEVIS</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ─── VUE 2 : TABLEAU COMPARATEUR DÉTAILLÉ ───────────────────────── */}
              {viewMode === 'TABLE' && processedSingleItems.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-3.5 px-4">Fournisseur</th>
                          <th className="py-3.5 px-4">Type</th>
                          <th className="py-3.5 px-4">Référence</th>
                          <th className="py-3.5 px-4">Marque</th>
                          <th className="py-3.5 px-4">Désignation</th>
                          <th className="py-3.5 px-4">Disponibilité</th>
                          <th className="py-3.5 px-4 text-right">Prix Achat HT</th>
                          <th className="py-3.5 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs font-bold">
                        {processedSingleItems.map((item, idx) => {
                          const isAvailable = isItemInStock(item);
                          const itemKey = `table-${item.name || item.reference}-${item.supplierName}-${idx}`;
                          const isCopied = copiedItemKey === itemKey;
                          const priceVal = item.price || item.prixHT || 0;
                          const isDirect = item.matchType === 'DIRECT';

                          return (
                            <tr
                              key={itemKey}
                              className={`hover:bg-slate-800/40 transition-colors ${
                                isAvailable ? 'bg-emerald-950/10' : ''
                              }`}
                            >
                              <td className="py-3 px-4 text-slate-200 uppercase whitespace-nowrap">
                                <span className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-black">
                                  {item.supplierName || item.fournisseur || 'FOURNISSEUR'}
                                </span>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                  isDirect
                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                    : 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                                }`}>
                                  {isDirect ? 'DIRECT' : 'TECDOC'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-black text-red-400 whitespace-nowrap">
                                {item.name || item.reference}
                              </td>
                              <td className="py-3 px-4 text-slate-200 uppercase whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                                  {item.brand || 'ADAPTABLE'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-300 max-w-xs truncate font-medium">
                                {item.designation || item.description || `Article ${item.name || item.reference}`}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-black uppercase ${
                                  isAvailable
                                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                  {item.rawStock > 0 ? `Stock (${item.rawStock})` : item.availability || 'Sur commande'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-black text-emerald-400 whitespace-nowrap text-sm">
                                {priceVal > 0 ? `${priceVal.toFixed(3)} TND` : 'SUR DEMANDE'}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => copyItemInfo(item, itemKey)}
                                    className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs transition-all"
                                    title="Copier les détails"
                                  >
                                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => handleAddToQuote(item)}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-black uppercase transition-all shadow-md shadow-red-600/30 flex items-center gap-1"
                                    title="Ajouter au devis"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>DEVIS</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── CONTENU MODE 2 : MULTI-RÉFÉRENCES & IMPORT EXCEL ─────────────────── */}
      {activeMode === 'MULTI' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-red-500" />
                  IMPORT DE LISTE DE RÉFÉRENCES (PAR LOT)
                </h3>
                <p className="text-slate-400 text-xs font-semibold uppercase mt-0.5">
                  Collez vos références ou importez directement votre fichier Excel / CSV
                </p>
              </div>

              {/* Upload Button */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>IMPORTER FICHIER EXCEL</span>
                </button>
              </div>
            </div>

            {/* Textarea for Multi-Refs */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                SAISISSEZ OU COLLEZ UNE LISTE DE RÉFÉRENCES (UNE PAR LIGNE OU SÉPARÉES PAR VIRGULES) :
              </label>
              <textarea
                rows={4}
                value={multiInputText}
                onChange={e => setMultiInputText(e.target.value)}
                placeholder="1306J5&#10;1611273080&#10;7401AX&#10;6208E6&#10;424917"
                className="w-full bg-slate-950 text-slate-100 font-mono text-xs border border-slate-800 p-4 rounded-xl focus:outline-none focus:border-red-500 uppercase leading-relaxed"
              />
            </div>

            {/* Launch Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleParseMultiInput}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Valider la liste ({multiRefsList.length} refs)
                </button>

                {multiRefsList.length > 0 && (
                  <button
                    type="button"
                    onClick={runBatchComparison}
                    disabled={multiRunning}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/30 flex items-center gap-2"
                  >
                    {multiRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>COMPARAISON ({multiProgress.current}/{multiProgress.total})...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>LANCER LA COMPARAISON PAR LOT</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {multiResults.some(r => r.status === 'success') && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={exportMultiToExcel}
                    className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>EXPORTER EXCEL (.XLSX)</span>
                  </button>

                  <button
                    type="button"
                    onClick={transferAllToQuote}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/30 flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>CRÉER LE DEVIS GLOBAL</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Multi-Results Table */}
          {multiResults.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  SYNTHÈSE MULTI-RÉFÉRENCES ({multiResults.length} ARTICLES)
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {multiResults.filter(r => r.status === 'success').length} TROUVÉ(S) · {multiResults.filter(r => r.status === 'not_found').length} NON TROUVÉ(S)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950/90 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">RÉFÉRENCE</th>
                      <th className="px-4 py-3">DÉSIGNATION / MARQUE</th>
                      <th className="px-4 py-3">MEILLEUR FOURNISSEUR</th>
                      <th className="px-4 py-3 text-right">PRIX ACHAT HT</th>
                      <th className="px-4 py-3 text-center">STOCK / DISPO</th>
                      <th className="px-4 py-3 text-center">OFFRES</th>
                      <th className="px-4 py-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {multiResults.map(row => {
                      const isExpanded = expandedRef === row.ref;
                      const best = row.bestItem;
                      const hasStock = best?.available || (best?.rawStock || 0) > 0;

                      return (
                        <React.Fragment key={row.ref}>
                          <tr className="hover:bg-slate-800/40 transition-colors">
                            {/* Ref */}
                            <td className="px-4 py-3 font-mono font-black text-red-400 text-sm">
                              {row.ref}
                            </td>

                            {/* Designation */}
                            <td className="px-4 py-3 font-semibold text-slate-200 uppercase max-w-xs truncate">
                              {row.designation || best?.designation || 'Article'}
                              {best?.brand && <span className="block text-[10px] text-slate-500">{best.brand}</span>}
                            </td>

                            {/* Best Supplier */}
                            <td className="px-4 py-3 font-black text-slate-100 uppercase">
                              {best ? (
                                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                                  {best.supplierName}
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>

                            {/* Price */}
                            <td className="px-4 py-3 font-mono font-black text-right text-emerald-400 text-sm">
                              {best && (best.price || best.prixHT || 0) > 0
                                ? `${(best.price || best.prixHT || 0).toFixed(3)} TND`
                                : '—'}
                            </td>

                            {/* Dispo */}
                            <td className="px-4 py-3 text-center">
                              {row.status === 'loading' ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto text-amber-400" />
                              ) : row.status === 'not_found' ? (
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Non trouvé</span>
                              ) : hasStock ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                                  {best?.rawStock ? `En stock (${best.rawStock})` : 'Disponible'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-950/40 text-amber-400 border border-amber-500/30">
                                  Sur commande
                                </span>
                              )}
                            </td>

                            {/* Offers Count */}
                            <td className="px-4 py-3 text-center">
                              {row.items.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setExpandedRef(isExpanded ? null : row.ref)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 rounded-lg text-[10px] font-black uppercase transition-colors"
                                >
                                  <span>{row.items.length} offres</span>
                                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>

                            {/* Action Single */}
                            <td className="px-4 py-3 text-right">
                              {best && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSingleQuery(row.ref);
                                    setActiveMode('SINGLE');
                                    triggerSingleSearch(row.ref);
                                  }}
                                  className="text-[10px] font-black uppercase text-slate-400 hover:text-red-400 p-1 rounded"
                                  title="Détail complet"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 inline" />
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Nested Offers Table */}
                          {isExpanded && row.items.length > 0 && (
                            <tr className="bg-slate-950/80">
                              <td colSpan={7} className="p-4">
                                <div className="space-y-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                                    COMPARAISON DÉTAILLÉE DES {row.items.length} FOURNISSEURS POUR "{row.ref}" :
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                    {row.items.map((subItem, sIdx) => (
                                      <div
                                        key={sIdx}
                                        className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs"
                                      >
                                        <div>
                                          <div className="font-black text-slate-200 uppercase">
                                            {subItem.supplierName}
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-mono">
                                            {subItem.name} ({subItem.brand || 'Marque'})
                                          </div>
                                          <div className="text-[9px] text-emerald-400 font-bold">
                                            {subItem.availability}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-mono font-black text-emerald-400">
                                            {(subItem.price || subItem.prixHT || 0).toFixed(3)} TND
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedForQuote(prev => ({ ...prev, [row.ref]: subItem }));
                                              alert(`Fournisseur ${subItem.supplierName} sélectionné pour ${row.ref}`);
                                            }}
                                            className="text-[9px] font-black uppercase bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded mt-1 hover:bg-red-600 hover:text-white transition-colors"
                                          >
                                            Choisir cette offre
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CONTENU MODE 3 : VÉHICULE & DÉCODEUR CHÂSSIS VIN ─────────────────── */}
      {activeMode === 'VEHICLE' && (
        <div className="space-y-6">
          {/* VIN Decoder Search Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Car className="w-4 h-4 text-red-500" />
                DÉCODAGE N° DE CHÂSSIS (VIN) & SÉLECTION VÉHICULE
              </h3>
              <p className="text-slate-400 text-xs font-semibold uppercase mt-0.5">
                Saisissez le VIN (17 caractères) pour identifier la motorisation et trouver les pièces compatibles
              </p>
            </div>

            <form onSubmit={handleDecodeVin} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={vinInput}
                onChange={e => setVinInput(e.target.value)}
                placeholder="EX: VF36D9HZC9L013574, WDD2040451A342772..."
                className="flex-1 bg-slate-950 text-slate-100 font-mono font-bold border border-slate-800 px-4 h-12 rounded-xl text-sm focus:outline-none focus:border-red-500 uppercase tracking-widest placeholder:normal-case placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={vinDecoding || !vinInput.trim()}
                className="px-8 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 h-12"
              >
                {vinDecoding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>DÉCODAGE VIN...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>DÉCODER CHÂSSIS</span>
                  </>
                )}
              </button>
            </form>

            {/* VIN Quick Examples */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-black uppercase text-slate-500">EXEMPLES :</span>
              {[
                { label: 'PEUGEOT 407 1.6 HDi', vin: 'VF36D9HZC9L013574' },
                { label: 'MERCEDES CLASSE C 220 CDI', vin: 'WDD2040451A342772' },
                { label: 'SUZUKI CELERIO 1.0', vin: 'MA3TFC62S00309625' },
              ].map(ex => (
                <button
                  key={ex.vin}
                  type="button"
                  onClick={() => {
                    setVinInput(ex.vin);
                    handleDecodeVin();
                  }}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 rounded-lg text-[10px] font-mono font-bold transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Info Card */}
          {vehicleInfo && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white uppercase">{vehicleInfo.brand}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-base font-bold text-slate-200 uppercase">{vehicleInfo.model}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-semibold mt-1">
                    MOTEUR : <span className="text-red-400 font-mono font-bold">{vehicleInfo.engine}</span> · ANNÉE : <span className="text-slate-200">{vehicleInfo.year}</span> · VIN : <span className="font-mono text-cyan-400">{vehicleInfo.vin}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-3 py-1 rounded-full border border-slate-700">
                    Source : {vehicleInfo.sourceCatalog || 'Catalogue OE Direct'}
                  </span>
                </div>
              </div>

              {/* Part Category Quick Filter */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  CHOISIR UNE CATÉGORIE DE PIÈCES OU RECHERCHER :
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    'TOUS',
                    'Carrosserie & Éclairage',
                    'Freinage & ABS',
                    'Moteur & Distribution',
                    'Transmission & Embrayage',
                    'Châssis & Suspension',
                    'Refroidissement & Clim',
                    'Électricité & Calculateurs'
                  ].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all border ${
                        selectedCategory === cat
                          ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Free part search input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={partKeyword}
                    onChange={e => setPartKeyword(e.target.value)}
                    placeholder="OU SAISISSEZ UNE PIÈCE (EX: DISQUE DE FREIN, PHARE, 1306J5)..."
                    className="flex-1 bg-slate-950 text-slate-100 font-bold border border-slate-800 px-4 h-11 rounded-xl text-xs focus:outline-none focus:border-red-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchVehiclePart(partKeyword || vehicleInfo.model)}
                    disabled={!partKeyword.trim()}
                    className="px-6 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Comparer chez les 11 fournisseurs
                  </button>
                </div>
              </div>

              {/* Schematics & Parts List */}
              {vehicleSchematics.length > 0 && (
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
                    PIÈCES D'ORIGINE DÉTECTÉES POUR CE VÉHICULE :
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicleSchematics
                      .filter(sec => selectedCategory === 'TOUS' || sec.category === selectedCategory)
                      .flatMap(sec => sec.oeItems || [])
                      .filter(item => !partKeyword.trim() || item.designation?.toLowerCase().includes(partKeyword.toLowerCase()) || item.ref?.toLowerCase().includes(partKeyword.toLowerCase()))
                      .map((item, i) => (
                        <div
                          key={i}
                          className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex justify-between items-center gap-3 hover:border-slate-700 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-red-400 text-sm">{item.ref}</span>
                              <span className="text-[10px] text-slate-500 uppercase">Pos {item.pos || i + 1}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-200 uppercase mt-0.5 line-clamp-2">
                              {item.designation}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSearchVehiclePart(item.ref)}
                            className="px-3.5 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-1"
                          >
                            <span>COMPARER B2B</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
