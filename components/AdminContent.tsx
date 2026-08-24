"use client";

import { useApp } from '@/lib/context';
import { useSession } from 'next-auth/react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { searchDictionaryAndEquivalents, getEquivalentsForRef, validateCriticalPartCompatibility } from '@/lib/equivalentsDictionary';
import ModalSyntheseOffres from './ModalSyntheseOffres';
import ModalFicheArticle from './ModalFicheArticle';
import {
  Search, Edit3, MessageSquare, FileText, Mail, Phone,
  Plus, Trash2, Save, X, Send,
  Building2, UserPlus, List, ClipboardList, Package,
  CheckCircle, AlertTriangle, Printer, Clock,
  ShoppingBag, BarChart2, Download, Receipt, Paperclip, Upload, PlusCircle, Loader2,
  RefreshCw, FileSpreadsheet, Database, Sparkles, CheckCircle2, ExternalLink, Layers, Eye
} from 'lucide-react';
import { notifyQuotesSync, subscribeQuotesSync } from '@/lib/syncEvents';

// ─── Input style helper ───────────────────────────────────────────────────────
const inputCls = "w-full bg-slate-950/80 text-slate-100 font-semibold border border-slate-800 text-xs px-4 h-10 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 uppercase placeholder:text-slate-500 transition-colors";
const labelCls = "block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5";
const cardCls = "bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 mb-5 w-full shadow-2xl backdrop-blur-md";

// ─── SECTION: RÉCEPTION DEMANDES ──────────────────────────────────────────────
interface SectionReceptionProps {
  onTreatQuote?: (q: any) => void;
}

function SectionReception({ onTreatQuote }: SectionReceptionProps) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TOUS STATUTS');
  const [assigneeFilter, setAssigneeFilter] = useState('TOUS LES PROFILS');
  const [loading, setLoading] = useState(true);

  const fetchQuotes = (isBackground = false) => {
    if (!isBackground) setLoading(true);
    fetch('/api/quotes').then(r => r.json()).then(d => {
      setQuotes(Array.isArray(d) ? d : d.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuotes();
    const unsubscribe = subscribeQuotesSync(() => fetchQuotes(true), 3000);
    return () => unsubscribe();
  }, []);

  const handleAssignProfile = async (quoteId: string, name: string) => {
    try {
      const res = await fetch('/api/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, managedByName: name })
      });
      if (res.ok) {
        notifyQuotesSync();
        fetchQuotes(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = quotes.filter(q => {
    const matchesSearch = 
      q.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      q.brand?.toLowerCase().includes(search.toLowerCase()) ||
      q.id?.includes(search);
    
    let matchesStatus = true;
    if (statusFilter === 'EN ATTENTE') {
      matchesStatus = q.status !== 'TREATED';
    } else if (statusFilter === 'TRAITÉ') {
      matchesStatus = q.status === 'TREATED';
    }

    let matchesAssignee = true;
    const assigneeName = q.managedBy?.name?.toUpperCase() || 'NON ASSIGNÉ';
    if (assigneeFilter !== 'TOUS LES PROFILS') {
      matchesAssignee = assigneeName === assigneeFilter;
    }

    return matchesSearch && matchesStatus && matchesAssignee;
  });

  return (
    <div className="max-w-[1180px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-1">
        <h2 className="text-xl font-black uppercase tracking-widest text-slate-100 flex items-center gap-2 font-sans">
          <FileText className="w-5 h-5 text-red-500" />
          DEMANDES CLIENTS EN ATTENTE
        </h2>
        <button
          onClick={async () => {
            if (confirm("⚠️ CONFIRMATION : Réinitialiser la liste et remettre le compteur des devis et demandes à zéro ?")) {
              try {
                const res = await fetch('/api/admin/reset-data', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ target: 'ALL_DEVIS' })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                  notifyQuotesSync();
                  alert("✅ Compteur remis à zéro : Toutes les demandes et devis ont été réinitialisés.");
                  fetchQuotes();
                } else {
                  alert(data.error || "Erreur lors de la réinitialisation");
                }
              } catch (e: any) {
                alert("Erreur: " + e.message);
              }
            }
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-sm"
          title="Remettre le compteur des devis et demandes à zéro"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Remise à zéro compteur
        </button>
      </div>
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-6">Traitez les demandes reçues en temps réel</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par client, véhicule, n° demande..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 text-slate-100 font-semibold border border-slate-800 pl-10 pr-4 h-11 rounded-xl text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-colors uppercase placeholder:normal-case placeholder:text-slate-500"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-950 text-slate-200 font-bold text-xs px-3 h-11 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 cursor-pointer transition-colors"
          >
            <option value="TOUS STATUTS">TOUS STATUTS</option>
            <option value="EN ATTENTE">EN ATTENTE</option>
            <option value="TRAITÉ">TRAITÉ</option>
          </select>
          <select 
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="bg-slate-950 text-slate-200 font-bold text-xs px-3 h-11 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 cursor-pointer transition-colors"
          >
            <option value="TOUS LES PROFILS">TOUS LES PROFILS</option>
            <option value="SAIF">TÂCHES SAIF</option>
            <option value="AMINE">TÂCHES AMINE</option>
            <option value="SAIFALLAH">TÂCHES SAIFALLAH</option>
            <option value="NON ASSIGNÉ">NON ASSIGNÉ</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">CHARGEMENT...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 font-bold uppercase tracking-widest text-xs">AUCUNE DEMANDE TROUVÉE</div>
      ) : (
        filtered.map((q) => (
          <div key={q.id} className={cardCls}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-red-500 text-xs tracking-wider">#{q.id?.slice(-6).toUpperCase()}</span>
                  <span className="text-slate-600 font-mono text-xs">·</span>
                  <span className="text-xs text-slate-400 font-bold">{q.createdAt ? new Date(q.createdAt).toLocaleDateString('fr-FR') : ''}</span>
                </div>
                <h4 className="font-black text-slate-100 uppercase text-base mt-1 tracking-wide">{q.clientName}</h4>
                <div className="text-xs text-slate-400 lowercase tracking-normal mt-0.5 font-sans">
                  {q.clientEmail}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Sélecteur de profil admin */}
                <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
                  <span className="text-[9.5px] text-slate-400 font-black uppercase tracking-wider">Assigné à :</span>
                  <select
                    value={q.managedBy?.name?.toUpperCase() || 'NON ASSIGNÉ'}
                    onChange={(e) => handleAssignProfile(q.id, e.target.value)}
                    className="bg-transparent text-slate-200 text-xs font-black uppercase outline-none cursor-pointer"
                  >
                    <option value="NON ASSIGNÉ" className="bg-slate-900 text-slate-400">NON ASSIGNÉ</option>
                    <option value="SAIF" className="bg-slate-900 text-slate-100">SAIF</option>
                    <option value="AMINE" className="bg-slate-900 text-slate-100">AMINE</option>
                    <option value="SAIFALLAH" className="bg-slate-900 text-slate-100">SAIFALLAH</option>
                  </select>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                  q.status === 'TREATED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>{q.status === 'TREATED' ? 'TRAITÉ' : 'EN ATTENTE'}</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 mb-4 w-full">
              <div className="text-xs font-black text-slate-100 uppercase mb-1 tracking-wide">{q.brand} {q.model} {q.vin && <span className="text-slate-400 font-mono font-normal">· VIN: {q.vin}</span>}</div>
              <div className="text-xs text-slate-300 uppercase leading-relaxed">
                {q.items?.map((it: any) => `${it.designation} (x${it.quantity})`).join(' · ')}
              </div>
              {q.remarks && <div className="text-xs text-amber-400/90 mt-1.5 uppercase font-medium">NOTE: {q.remarks}</div>}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
              {q.status !== 'TREATED' && (
                <button 
                  onClick={() => onTreatQuote && onTreatQuote(q)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/30 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> CRÉER DEVIS
                </button>
              )}
              <a 
                href={`https://wa.me/${q.phone || '21698774525'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-emerald-500/30"
              >
                <Phone className="w-3.5 h-3.5" /> CONTACTER
              </a>
              <a 
                href={`mailto:${q.clientEmail}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-blue-500/30"
              >
                <Mail className="w-3.5 h-3.5" /> <span>ENVOYER EMAIL</span>
              </a>
              <button 
                onClick={async () => {
                  if (confirm("Supprimer cette demande ?")) {
                    try {
                      const res = await fetch(`/api/quotes?id=${q.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        notifyQuotesSync();
                        fetchQuotes();
                      } else {
                        alert("Erreur lors de la suppression");
                      }
                    } catch (e: any) {
                      alert("Erreur: " + e.message);
                    }
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-rose-500/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> SUPPRIMER
              </button>
              {q.photo && (
                 <a 
                   href={q.photo} 
                   download={q.photoName || `photo-${q.id}.jpg`}
                   className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700"
                 >
                   <Paperclip className="w-3.5 h-3.5" /> PIÈCE (IMAGE)
                 </a>
              )}
              {q.chassisPhoto && (
                 <a 
                   href={q.chassisPhoto} 
                   download={q.chassisPhotoName || `chassis-${q.id}.jpg`}
                   className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700"
                 >
                   <Paperclip className="w-3.5 h-3.5" /> CARTE GRISE
                 </a>
              )}
              {q.fileBase64 && (
                 <a 
                   href={`data:${q.fileFormat === 'excel' || q.fileFormat === 'csv' ? 'text/csv' : 'application/pdf'};base64,${q.fileBase64}`} 
                   download={q.fileName || `demande-${q.id}.${q.fileFormat === 'excel' || q.fileFormat === 'csv' ? 'csv' : 'pdf'}`}
                   className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600/15 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-indigo-500/30"
                 >
                   <Download className="w-3.5 h-3.5" /> DEVIS CLIENT
                 </a>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── SECTION: CRÉER / MODIFIER DEVIS ─────────────────────────────────────────
interface SectionCreerDevisProps {
  quoteToLoad?: any;
  onClearQuote?: () => void;
}

function SectionCreerDevis({ quoteToLoad, onClearQuote }: SectionCreerDevisProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState<any[]>([
    { designation: '', reference: '', qty: 1, puHT: 0, discount: 0 }
  ]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [vin, setVin] = useState('');
  const [notes, setNotes] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [activeSuggestRow, setActiveSuggestRow] = useState<number | null>(null);
  const [activeSuggestField, setActiveSuggestField] = useState<'ref' | 'desc' | null>(null);
  const [showSynthese, setShowSynthese] = useState(false);
  const [searchingB2BIndex, setSearchingB2BIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/products', { cache: 'no-store' }).then(r => r.json()).then(d => {
      setCatalogue(Array.isArray(d) ? d : d.data || []);
    }).catch(() => {});
    fetch('/api/suppliers').then(r => r.json()).then(d => {
      setSuppliers(Array.isArray(d) ? d : (d.data || []));
    }).catch(() => {});
  }, []);

  const getSuggestions = (text: string, field: 'ref' | 'desc') => {
    if (!text || text.length < 1) return [];
    return catalogue.filter(p => {
      const target = field === 'ref' ? p.reference : p.name;
      return target?.toLowerCase().includes(text.toLowerCase());
    }).slice(0, 8);
  };

  const fetchPriceHistory = async (reference: string, index: number) => {
    if (!reference) return;
    try {
      const res = await fetch(`/api/historique-prix?reference=${encodeURIComponent(reference)}`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setItems(prev => prev.map((it, idx) => {
          if (idx !== index) return it;
          const loadedOffres = data.data.map((h: any) => ({
            type: h.isConcessionnaire ? 'ORIGINE' : 'ADAPTABLE',
            supplierId: h.supplierId || '',
            purchasePrice: h.purchasePrice || 0,
            sellingPrice: h.sellingPrice || 0,
          }));
          return { ...it, offres: loadedOffres };
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const savePriceHistory = async (reference: string, isConcessionnaire: boolean, data: any) => {
    if (!reference) return;
    try {
      await fetch('/api/historique-prix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, isConcessionnaire, ...data })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleB2BSearch = async (index: number) => {
    const it = items[index];
    const ref = (it?.reference || it?.designation || '').trim();
    if (!ref) {
      alert("Veuillez renseigner la référence de la pièce.");
      return;
    }

    setSearchingB2BIndex(index);
    try {
      const res = await fetch('/api/b2b/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: 'ALL', query: ref })
      });
      const data = await res.json();
      
      if (data.success && data.data) {
        const searchData = data.data;
        const b2bItems = searchData.items || [];
        if (b2bItems.length === 0) {
          alert(`Aucune offre B2B trouvée chez vos fournisseurs pour "${ref}".`);
          return;
        }

        const newOffres = b2bItems.map((bItem: any) => {
          const supp = suppliers.find((s: any) => s.name.toUpperCase() === (bItem.supplierName || '').toUpperCase());
          const pAchat = bItem.price || 0;
          const pVente = parseFloat((pAchat * 1.30).toFixed(3));
          return {
            type: 'ADAPTABLE',
            supplierId: supp?.id || '',
            supplierName: `${bItem.supplierName || 'B2B'} (${bItem.brand || 'MARQUE'})`,
            purchasePrice: pAchat,
            sellingPrice: pVente
          };
        });

        const updatedItems = [...items];
        updatedItems[index].offres = [...(updatedItems[index].offres || []), ...newOffres];
        setItems(updatedItems);

        alert(`✅ ${b2bItems.length} offre(s) B2B multi-fournisseurs trouvée(s) et ajoutée(s) à la ligne ${index + 1} !`);
      } else {
        alert(data.error || data.data?.error || "Erreur lors de la recherche B2B.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur de connexion à l'API B2B.");
    } finally {
      setSearchingB2BIndex(null);
    }
  };

  // Charger la demande de devis ou devis généré si sélectionné
  useEffect(() => {
    if (quoteToLoad) {
      setClientName(quoteToLoad.clientName || quoteToLoad.user?.name || '');
      setClientEmail(quoteToLoad.clientEmail || quoteToLoad.user?.email || '');
      const vBrand = quoteToLoad.vehicleBrand || quoteToLoad.brand || '';
      const vModel = quoteToLoad.vehicleModel || quoteToLoad.model || '';
      setVehicle(`${vBrand} ${vModel}`.trim());
      setVin(quoteToLoad.vehicleVin || quoteToLoad.vin || '');
      setNotes(quoteToLoad.notes || `Devis #${quoteToLoad.id?.slice(-6).toUpperCase()}`);
      if (Array.isArray(quoteToLoad.items) && quoteToLoad.items.length > 0) {
        setItems(quoteToLoad.items.map((it: any) => ({
          designation: it.designation || it.name || '',
          reference: it.reference || '',
          qty: it.quantity || it.qty || 1,
          puHT: it.price || it.puHT || 0,
          discount: it.discount || 0,
          offres: it.offres || []
        })));
      }
    }
  }, [quoteToLoad]);

  const addLine = () => setItems(prev => [...prev, { designation: '', reference: '', qty: 1, puHT: 0, discount: 0, offres: [] }]);
  const removeLine = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, val: any) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const subtotalHT = items.reduce((sum, it) => {
    const lineTotal = it.qty * it.puHT;
    const lineDiscount = lineTotal * (it.discount / 100);
    return sum + (lineTotal - lineDiscount);
  }, 0);
  const globalDiscountAmt = subtotalHT * (globalDiscount / 100);
  const afterDiscount = subtotalHT - globalDiscountAmt;
  const tva = afterDiscount * 0.19;
  const totalTTC = afterDiscount + tva;

  const handleApplySynthese = (updatedRows: any[]) => {
    setItems(prev => prev.map(it => {
      const refUpper = (it.reference || '').trim().toUpperCase();
      const desUpper = (it.designation || '').trim().toUpperCase();

      const match = updatedRows.find((r: any) => {
        const rRef = (r.reference || '').trim().toUpperCase();
        const rDes = (r.designation || '').trim().toUpperCase();
        return (refUpper && rRef === refUpper) || (desUpper && rDes === desUpper);
      });

      if (!match) return it;

      const newSellingPrice = parseFloat(String(match.sellingPrice)) || 0;
      const purchasePrice = parseFloat(String(match.purchasePrice)) || 0;
      const type = match.selectOem ? 'ORIGINE' : (match.selectAdaptable ? 'ADAPTABLE' : (it.partType || 'ADAPTABLE'));
      const suppName = match.supplierName || (match.selectOem ? match.oemSupplierName : match.adaptableSupplierName) || '';

      const updatedOffres = [...(it.offres || [])];
      const oIdx = updatedOffres.findIndex((o: any) => o.type === type);
      if (oIdx >= 0) {
        updatedOffres[oIdx].sellingPrice = newSellingPrice;
        updatedOffres[oIdx].purchasePrice = purchasePrice;
        if (suppName) updatedOffres[oIdx].supplierName = suppName;
      } else {
        updatedOffres.push({ type, supplierId: '', supplierName: suppName, purchasePrice, sellingPrice: newSellingPrice });
      }

      return { 
        ...it, 
        puHT: newSellingPrice, 
        price: newSellingPrice, 
        partType: type, 
        supplierName: suppName,
        offres: updatedOffres 
      };
    }));
    alert("✅ Rapport de devis validé ! Le Prix de vente HT, la rubrique (ORIGINE/ADAPTABLE) et le fournisseur ont été enregistrés dans le devis.");
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleSaveDevis = async (sendNotification = false) => {
    if (!clientName.trim()) { alert('LE NOM DU CLIENT EST REQUIS.'); return; }
    if (!clientEmail.trim()) { alert('L\'EMAIL DU CLIENT EST REQUIS.'); return; }
    if (items.length === 0 || items.every(it => !it.designation.trim())) {
      alert('VEUILLEZ RENSEIGNER AU MOINS UN ARTICLE.');
      return;
    }

    setSaving(true);
    setSaved(false);

    try {
      // 1. Sauvegarder toutes les offres fournisseurs configurées dans l'historique d'article DB
      const allOffresToSave: any[] = [];
      items.forEach(it => {
        if (it.reference && it.offres && it.offres.length > 0) {
          it.offres.forEach((o: any) => {
            const supp = suppliers.find(s => s.id === o.supplierId);
            allOffresToSave.push({
              reference: it.reference,
              type: o.type,
              supplierId: o.supplierId,
              supplierName: supp?.name || o.supplierName || 'Fournisseur',
              purchasePrice: o.purchasePrice,
              sellingPrice: o.sellingPrice
            });
          });
        }
      });

      if (allOffresToSave.length > 0) {
        fetch('/api/historique-prix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offresList: allOffresToSave })
        }).catch(err => console.error('Erreur sauvegarde automatique historique offres:', err));
      }

      const activeAdminProfile = typeof window !== 'undefined' ? localStorage.getItem('activeAdminProfile') : null;
      const response = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: clientEmail.trim(),
          vehicleBrand: vehicle.split(' ')[0] || 'Générique',
          vehicleModel: vehicle.split(' ').slice(1).join(' ') || 'N/A',
          vehicleYear: 2024,
          vehicleVin: vin,
          notes: notes,
          totalPrice: totalTTC,
          responseNote: `Proposition commerciale établie par l'administrateur.\nRemise globale de ${globalDiscount}%.`,
          items: items.filter(it => it.designation.trim()),
          quoteId: quoteToLoad?.id || null,
          managedByName: activeAdminProfile || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur de création");
      }

      notifyQuotesSync();
      setSaved(true);
      alert(`✅ DEVIS ENREGISTRÉ AVEC SUCCÈS ! ${sendNotification ? 'E-mail de confirmation envoyé au client.' : ''}`);
      
      // Reset form
      setClientName('');
      setClientEmail('');
      setVehicle('');
      setVin('');
      setNotes('');
      setItems([{ designation: '', reference: '', qty: 1, puHT: 0, discount: 0, offres: [] }]);
      setGlobalDiscount(0);
      
      if (onClearQuote) onClearQuote();
      setTimeout(() => setSaved(false), 5000);

    } catch (err: any) {
      console.error(err);
      alert(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSynthese = async () => {
    const allOffresToSave: any[] = [];
    items.forEach(it => {
      if (it.reference && it.offres && it.offres.length > 0) {
        it.offres.forEach((o: any) => {
          const supp = suppliers.find(s => s.id === o.supplierId);
          allOffresToSave.push({
            reference: it.reference,
            type: o.type,
            supplierId: o.supplierId,
            supplierName: supp?.name || o.supplierName || 'Fournisseur',
            purchasePrice: o.purchasePrice,
            sellingPrice: o.sellingPrice
          });
        });
      }
    });

    if (allOffresToSave.length > 0) {
      try {
        await fetch('/api/historique-prix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offresList: allOffresToSave })
        });
      } catch (err) {
        console.error("Erreur sauvegarde des offres avant synthèse:", err);
      }
    }

    setShowSynthese(true);
  };

  const handleImportSupplierOffersFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rows.length < 2) {
        alert("Fichier vide ou format non reconnu.");
        return;
      }

      const normalize = (s: any) => String(s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const headers = rows[0].map(normalize);
      const findColIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

      const colRef = findColIndex(['ref', 'code', 'article', 'part']);
      const colDes = findColIndex(['desig', 'nom', 'name', 'libelle']);
      const colAchat = findColIndex(['achat', 'cost', 'prixachat', 'pa']);
      const colPvp = findColIndex(['pvp', 'comptoir', 'public', 'concessionnaire']);
      const colVente = findColIndex(['vente', 'pv', 'prixvente', 'price']);
      const colType = findColIndex(['type', 'rubrique', 'origine', 'adaptable', 'oem']);
      const colSupp = findColIndex(['fourn', 'supplier', 'fournisseur', 'marque']);

      const importedItems: any[] = [];
      const historyPayload: any[] = [];
      const productPayload: any[] = [];

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every((c: any) => String(c).trim() === '')) continue;

        const reference = String(colRef >= 0 ? row[colRef] : row[0] || '').trim().toUpperCase();
        const designation = String(colDes >= 0 ? row[colDes] : row[1] || '').trim();

        if (!reference && !designation) continue;

        const purchasePrice = parseFloat(String(colAchat >= 0 ? row[colAchat] : row[2] || 0)) || 0;
        const pvpPrice = parseFloat(String(colPvp >= 0 ? row[colPvp] : 0)) || 0;
        let sellingPrice = parseFloat(String(colVente >= 0 ? row[colVente] : 0)) || 0;

        const rawType = String(colType >= 0 ? row[colType] : '').toUpperCase();
        const type = rawType.includes('ORIG') || rawType.includes('CONC') || rawType.includes('OEM') ? 'ORIGINE' : 'ADAPTABLE';

        if (!sellingPrice || sellingPrice === 0) {
          if (type === 'ADAPTABLE') {
            sellingPrice = parseFloat((purchasePrice * 1.30).toFixed(3));
          } else {
            sellingPrice = pvpPrice > 0 ? pvpPrice : purchasePrice;
          }
        }

        const supplierName = String(colSupp >= 0 ? row[colSupp] : 'FOURNISSEUR IMPORTÉ').trim().toUpperCase() || 'FOURNISSEUR IMPORTÉ';

        importedItems.push({
          reference: reference || 'SANS-REF',
          designation: designation || 'Article',
          qty: 1,
          quantity: 1,
          puHT: sellingPrice,
          price: sellingPrice,
          partType: type,
          supplierName: supplierName,
          offres: [
            {
              type,
              supplierId: '',
              supplierName,
              purchasePrice,
              sellingPrice
            }
          ]
        });

        historyPayload.push({
          reference: reference || 'SANS-REF',
          designation,
          supplierName,
          type,
          isConcessionnaire: type === 'ORIGINE',
          purchasePrice,
          sellingPrice,
          pvp: pvpPrice
        });

        productPayload.push({
          reference: reference || 'SANS-REF',
          name: designation || 'Article',
          price: sellingPrice,
          costPrice: purchasePrice,
          stock: 10
        });
      }

      if (importedItems.length === 0) {
        alert("Aucun article valide trouvé dans le fichier.");
        return;
      }

      // 1. Post to history API immediately
      fetch('/api/historique-prix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offresList: historyPayload })
      }).catch(err => console.error("Erreur historique:", err));

      // 2. Register missing products in stock DB
      fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productPayload })
      }).catch(err => console.error("Erreur bulk products:", err));

      // 3. Append to current devis items
      setItems(prev => {
        const filteredPrev = prev.filter(it => it.reference?.trim() || it.designation?.trim());
        return [...filteredPrev, ...importedItems];
      });

      alert(`✅ IMPORTATION RÉUSSIE ! ${importedItems.length} article(s) et offre(s) fournisseur ajoutés au devis et enregistrés en base et dans l'historique !`);

    } catch (err: any) {
      console.error(err);
      alert(`Erreur lors de la lecture du fichier : ${err.message}`);
    }
  };

  const devisSeq = quoteToLoad?.id ? `#${quoteToLoad.id.slice(-6).toUpperCase()}` : 'NOUVEAU';

  return (
    <div className="max-w-[1180px] mx-auto pb-10">
      {/* Page Header */}
      <div className="mb-6">
        <div className="font-mono text-[10.5px] font-bold text-[#e8432f] tracking-[0.12em] uppercase mb-1.5">
          DEVIS {devisSeq}
        </div>
        <h1 className="text-[22px] font-bold text-[#000000] tracking-tight font-sans">
          Créer / modifier un devis
        </h1>
        <p className="text-[#495057] text-[12.5px] font-semibold mt-1">
          Gérez et modifiez les devis de vos clients en toute simplicité
        </p>
      </div>

      {/* Card 1: Informations Client */}
      <div className="bg-[#f8f9fa] border border-[#dcedf2] rounded-[10px] mb-5 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dcedf2] bg-[#f1f3f5]">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#000000] flex items-center gap-2">
            <span className="w-[3px] h-[12px] bg-[#e8432f] rounded-[2px] inline-block" />
            Informations client
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#111318] mb-1.5">
                Nom client <span className="text-[#e8432f]">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Nom complet du client"
                className="w-full bg-white border border-[#dcedf2] rounded-[7px] px-3 py-2.5 text-[13px] font-semibold text-[#000000] focus:border-[#e8432f] focus:ring-2 focus:ring-[#e8432f]/10 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#111318] mb-1.5">
                Email client <span className="text-[#e8432f]">*</span>
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                placeholder="email@client.com"
                className="w-full bg-white border border-[#dcedf2] rounded-[7px] px-3 py-2.5 text-[13px] font-semibold text-[#000000] focus:border-[#e8432f] focus:ring-2 focus:ring-[#e8432f]/10 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#111318] mb-1.5">
                Véhicule
              </label>
              <input
                type="text"
                value={vehicle}
                onChange={e => setVehicle(e.target.value)}
                placeholder="Ex: Peugeot 208 1.2"
                className="w-full bg-white border border-[#dcedf2] rounded-[7px] px-3 py-2.5 text-[13px] font-semibold text-[#000000] focus:border-[#e8432f] focus:ring-2 focus:ring-[#e8432f]/10 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#111318] mb-1.5 font-mono">
                Numéro VIN
              </label>
              <input
                type="text"
                value={vin}
                onChange={e => setVin(e.target.value)}
                placeholder="VIN / N° de Châssis"
                className="w-full bg-white border border-[#dcedf2] rounded-[7px] px-3 py-2.5 text-[12.5px] font-semibold font-mono text-[#000000] tracking-wider uppercase focus:border-[#e8432f] focus:ring-2 focus:ring-[#e8432f]/10 outline-none transition"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#111318] mb-1.5">
                Notes / observations
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes additionnelles ou références internes..."
                className="w-full bg-white border border-[#dcedf2] rounded-[7px] p-2.5 text-[13px] font-semibold text-[#000000] focus:border-[#e8432f] focus:ring-2 focus:ring-[#e8432f]/10 outline-none transition resize-y min-h-[56px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Lignes du Devis */}
      <div className="bg-[#f8f9fa] border border-[#dcedf2] rounded-[10px] mb-5 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-[#dcedf2] bg-[#f1f3f5] gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#000000] flex items-center gap-2">
            <span className="w-[3px] h-[12px] bg-[#e8432f] rounded-[2px] inline-block" />
            Lignes du devis
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:border-[#e8432f] hover:text-[#e8432f] text-[#111318] text-[11.5px] font-bold rounded-[7px] border border-[#dcedf2] transition cursor-pointer shadow-sm">
              <Upload className="w-3.5 h-3.5" />
              Importer offres fournisseur
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportSupplierOffersFile} className="hidden" />
            </label>
            <button
              onClick={handleOpenSynthese}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:border-[#e8432f] hover:text-[#e8432f] text-[#111318] text-[11.5px] font-bold rounded-[7px] border border-[#dcedf2] transition shadow-sm"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Comparer meilleures offres
            </button>
            <button
              onClick={async () => {
                const allOffresToSave: any[] = [];
                items.forEach(it => {
                  if (it.reference && it.offres && it.offres.length > 0) {
                    it.offres.forEach((o: any) => {
                      const supp = suppliers.find(s => s.id === o.supplierId);
                      allOffresToSave.push({
                        reference: it.reference,
                        designation: it.designation,
                        type: o.type,
                        supplierId: o.supplierId,
                        supplierName: supp?.name || o.supplierName || 'Fournisseur',
                        purchasePrice: o.purchasePrice,
                        sellingPrice: o.sellingPrice
                      });
                    });
                  }
                });

                if (allOffresToSave.length === 0) {
                  alert("Aucune offre fournisseur renseignée dans les lignes du devis.");
                  return;
                }

                try {
                  const res = await fetch('/api/historique-prix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ offresList: allOffresToSave })
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert(`✅ ${allOffresToSave.length} offre(s) enregistrée(s) avec succès dans l'historique et la synthèse !`);
                  } else {
                    alert(data.error || "Erreur lors de l'enregistrement des offres");
                  }
                } catch (err) {
                  console.error(err);
                  alert("Erreur de connexion.");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e8432f] hover:bg-[#d13a27] text-white text-[11.5px] font-bold rounded-[7px] border border-[#e8432f] transition shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              ✓ Enregistrer toutes les offres
            </button>
            <button
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-[#dcedf2] text-[#6c757d] hover:border-[#e8432f] hover:text-[#e8432f] text-[11.5px] font-bold rounded-[7px] transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              + Ajouter ligne
            </button>
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#dcedf2]">
                <th className="text-left text-[10px] font-bold uppercase tracking-[0.06em] text-[#111318] pb-2.5 px-2 w-[28%]">
                  Désignation
                </th>
                <th className="text-left text-[10px] font-bold uppercase tracking-[0.06em] text-[#111318] pb-2.5 px-2 w-[26%]">
                  Référence
                </th>
                <th className="text-center text-[10px] font-bold uppercase tracking-[0.06em] text-[#111318] pb-2.5 px-2 w-[70px]">
                  Qté
                </th>
                <th className="text-right text-[10px] font-bold uppercase tracking-[0.06em] text-[#111318] pb-2.5 px-2 w-[110px]">
                  P.U. HT
                </th>
                <th className="text-right text-[10px] font-bold uppercase tracking-[0.06em] text-[#111318] pb-2.5 px-2 w-[90px]">
                  Remise %
                </th>
                <th className="text-right text-[10px] font-bold uppercase tracking-[0.06em] text-[#111318] pb-2.5 px-2 w-[120px]">
                  Total HT
                </th>
                <th className="w-[40px] pb-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const lineTotal = it.qty * it.puHT;
                const discounted = lineTotal - lineTotal * (it.discount / 100);
                return (
                  <React.Fragment key={i}>
                    <tr className="border-b border-[#e9ecef] hover:bg-white/60 transition-colors">
                      {/* Désignation */}
                      <td className="py-2.5 px-2 relative">
                        <input
                          type="text"
                          value={it.designation}
                          onChange={e => {
                            updateLine(i, 'designation', e.target.value);
                            setActiveSuggestRow(i);
                            setActiveSuggestField('desc');
                          }}
                          onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('desc'); }}
                          onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                          placeholder="Désignation article..."
                          className="w-full bg-white border border-[#dcedf2] rounded-[6px] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#000000] focus:border-[#e8432f] outline-none"
                        />
                        {activeSuggestRow === i && activeSuggestField === 'desc' && getSuggestions(it.designation, 'desc').length > 0 && (
                          <div className="absolute left-2 z-50 mt-1 min-w-[240px] bg-white border border-[#dcedf2] rounded-[8px] max-h-48 overflow-y-auto shadow-xl">
                            {getSuggestions(it.designation, 'desc').map((p: any) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  updateLine(i, 'designation', p.name || '');
                                  updateLine(i, 'reference', p.reference || '');
                                  if (p.price) updateLine(i, 'puHT', p.price);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-[#f8f9fa] text-xs font-semibold text-[#111318] border-b border-[#e9ecef] last:border-0 flex items-center justify-between gap-2"
                              >
                                <span className="truncate max-w-[150px]">{p.name}</span>
                                <span className="text-[#e8432f] font-mono text-[10px] shrink-0 font-bold">{p.reference}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Référence */}
                      <td className="py-2.5 px-2 relative">
                        <input
                          type="text"
                          value={it.reference}
                          onChange={e => {
                            updateLine(i, 'reference', e.target.value);
                            setActiveSuggestRow(i);
                            setActiveSuggestField('ref');
                          }}
                          onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('ref'); }}
                          onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                          placeholder="RÉF."
                          className="w-full bg-white border border-[#dcedf2] rounded-[6px] px-2.5 py-1.5 text-[11.5px] font-mono font-semibold text-[#000000] uppercase focus:border-[#e8432f] outline-none"
                        />
                        {activeSuggestRow === i && activeSuggestField === 'ref' && getSuggestions(it.reference, 'ref').length > 0 && (
                          <div className="absolute left-2 z-50 mt-1 min-w-[240px] bg-white border border-[#dcedf2] rounded-[8px] max-h-48 overflow-y-auto shadow-xl">
                            {getSuggestions(it.reference, 'ref').map((p: any) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  updateLine(i, 'reference', p.reference || '');
                                  updateLine(i, 'designation', p.name || '');
                                  if (p.price) updateLine(i, 'puHT', p.price);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-[#f8f9fa] text-xs font-semibold text-[#111318] border-b border-[#e9ecef] last:border-0 flex items-center justify-between gap-2"
                              >
                                <span className="text-[#e8432f] font-mono font-bold text-[10px] shrink-0">{p.reference}</span>
                                <span className="text-[#6c757d] text-[10.5px] truncate">{p.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {it.reference && (() => {
                          const match = catalogue.find(x => x.reference?.toUpperCase() === it.reference?.toUpperCase());
                          return match ? (
                            <span className="text-[9.5px] text-[#059669] font-bold block mt-0.5 uppercase tracking-wider">
                              ✓ DISPO (STOCK: {match.stock})
                            </span>
                          ) : (
                            <span className="text-[9.5px] text-[#d97706] font-bold block mt-0.5 uppercase tracking-wider">
                              ⚡ NOUVEAU (SERA CRÉÉ)
                            </span>
                          );
                        })()}
                      </td>

                      {/* Qté */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          value={it.qty}
                          min={1}
                          onChange={e => updateLine(i, 'qty', parseFloat(e.target.value) || 1)}
                          className="w-[56px] text-center bg-white border border-[#dcedf2] rounded-[6px] px-2 py-1.5 text-[12.5px] font-semibold text-[#000000] focus:border-[#e8432f] outline-none"
                        />
                      </td>

                      {/* P.U. HT */}
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          value={it.puHT || ''}
                          min={0}
                          step={0.001}
                          onChange={e => updateLine(i, 'puHT', parseFloat(e.target.value) || 0)}
                          placeholder="0.000"
                          className="w-[88px] text-right bg-white border border-[#dcedf2] rounded-[6px] px-2 py-1.5 text-[12.5px] font-mono font-semibold text-[#000000] focus:border-[#e8432f] outline-none"
                        />
                      </td>

                      {/* Remise % */}
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          value={it.discount || ''}
                          min={0}
                          max={100}
                          step={1}
                          onChange={e => updateLine(i, 'discount', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-[64px] text-right bg-white border border-[#dcedf2] rounded-[6px] px-2 py-1.5 text-[12.5px] font-semibold text-[#000000] focus:border-[#e8432f] outline-none"
                        />
                      </td>

                      {/* Total HT */}
                      <td className="py-2.5 px-2 text-right">
                        <span className="font-mono font-bold text-[#d97706] text-[13px]">
                          {discounted.toFixed(3)} TND
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => removeLine(i)}
                          className="w-7 h-7 rounded-[6px] border border-[#dcedf2] bg-white text-[#6c757d] hover:border-[#e8432f] hover:text-[#e8432f] inline-flex items-center justify-center font-bold transition"
                          title="Supprimer la ligne"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>

                    {/* HISTORIQUE PIÈCES FOURNISSEURS / B2B */}
                    <tr className="border-b border-[#dcedf2] bg-[#f8f9fa]">
                      <td colSpan={7} className="px-3 pb-3.5 pt-1">
                        <div className="bg-white border border-[#dcedf2] rounded-[8px] p-3.5 shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                            <div className="text-[11px] font-bold text-[#000000] flex items-center gap-2">
                              <span>📦 Historique achat / vente fournisseurs</span>
                              <span className="text-[#6c757d] font-normal text-[10.5px]">(optionnel)</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => {
                                  const newOffres = [...(it.offres || []), { type: 'ADAPTABLE', supplierId: '', purchasePrice: 0, discount: 0, sellingPrice: 0 }];
                                  updateLine(i, 'offres', newOffres);
                                }}
                                className="px-2.5 py-1.5 bg-white border border-[#dcedf2] hover:border-[#e8432f] text-[#111318] text-[11px] font-bold rounded-[6px] transition flex items-center gap-1 shadow-sm"
                              >
                                <Plus className="w-3 h-3" /> Ajouter offre fournisseur
                              </button>
                              <button
                                onClick={async () => {
                                  if (!it.reference) {
                                    alert("Veuillez d'abord renseigner la référence de l'article.");
                                    return;
                                  }
                                  if (!it.offres || it.offres.length === 0) {
                                    alert("Aucune offre à enregistrer pour cet article.");
                                    return;
                                  }

                                  const offresToSave = it.offres.map((o: any) => {
                                    const supp = suppliers.find(s => s.id === o.supplierId);
                                    return {
                                      reference: it.reference.trim().toUpperCase(),
                                      type: o.type === 'ORIGINE' ? 'OEM' : (o.type || 'ADAPTABLE'),
                                      supplierId: o.supplierId || null,
                                      supplierName: supp?.name || o.supplierName || 'Fournisseur',
                                      purchasePrice: parseFloat(o.purchasePrice) || 0,
                                      sellingPrice: parseFloat(o.sellingPrice) || 0
                                    };
                                  });

                                  try {
                                    const res = await fetch('/api/historique-prix', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ offresList: offresToSave })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      alert(`✅ ${it.offres.length} offre(s) de l'article (${it.reference}) enregistrée(s) dans l'historique et la synthèse !`);
                                    } else {
                                      alert(data.error || "Erreur lors de l'enregistrement des offres");
                                    }
                                  } catch (err) {
                                    console.error(err);
                                    alert("Erreur de connexion.");
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-[#e8432f] hover:bg-[#d13a27] text-white text-[11px] font-bold rounded-[6px] border border-[#e8432f] transition flex items-center gap-1 shadow-sm"
                              >
                                <Save className="w-3 h-3" /> ✓ Enregistrer offres de cet article
                              </button>
                              <button
                                onClick={() => handleB2BSearch(i)}
                                disabled={searchingB2BIndex === i}
                                className="px-2.5 py-1.5 bg-white border border-[#4a3ab8] text-[#4a3ab8] hover:bg-[#4a3ab8] hover:text-white text-[11px] font-bold rounded-[6px] transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                              >
                                {searchingB2BIndex === i ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin text-[#4a3ab8]" />
                                    <span>RECHERCHE B2B...</span>
                                  </>
                                ) : (
                                  '🔗 Chercher avec DAV / B2B'
                                )}
                              </button>
                              {it.reference && (
                                <button
                                  onClick={() => fetchPriceHistory(it.reference, i)}
                                  className="px-2 py-1 bg-[#f1f3f5] hover:bg-[#e9ecef] text-[#495057] text-[10.5px] font-bold rounded-[6px] border border-[#dcedf2] transition"
                                >
                                  Historique Existant
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Offres Rows */}
                          {it.offres && it.offres.length > 0 && (
                            <div className="space-y-2 mt-2">
                              <div className="grid grid-cols-12 gap-2 text-[9.5px] font-bold uppercase tracking-wider text-[#6c757d] px-2 pb-1 border-b border-[#e9ecef]">
                                <div className="col-span-2">Type</div>
                                <div className="col-span-3">Fournisseur</div>
                                <div className="col-span-2 text-right">Achat HT</div>
                                <div className="col-span-1 text-center">Rem %</div>
                                <div className="col-span-2 text-right">Vente HT</div>
                                <div className="col-span-2 text-center">Action</div>
                              </div>
                              {it.offres.map((offre: any, oIdx: number) => (
                                <div key={oIdx} className="grid grid-cols-12 gap-2 items-center bg-[#f8f9fa] p-2 rounded-[6px] border border-[#dcedf2]">
                                  <div className="col-span-2">
                                    <select
                                      className="w-full bg-white border border-[#dcedf2] rounded-[5px] px-2 py-1 text-[11px] font-bold text-[#111318] focus:outline-none"
                                      value={offre.type || 'ADAPTABLE'}
                                      onChange={e => {
                                        const newType = e.target.value;
                                        const newOffres = [...it.offres];
                                        newOffres[oIdx].type = newType;
                                        const pAchat = parseFloat(newOffres[oIdx].purchasePrice) || 0;
                                        const disc = parseFloat(newOffres[oIdx].discount) || 0;
                                        if (newType === 'ADAPTABLE' && pAchat > 0) {
                                          newOffres[oIdx].sellingPrice = parseFloat((pAchat * 1.30).toFixed(3));
                                        } else if (newType === 'ORIGINE' || newType === 'CONCESSIONNAIRE') {
                                          if (pAchat > 0) {
                                            newOffres[oIdx].sellingPrice = disc > 0 ? parseFloat((pAchat / (1 - disc / 100)).toFixed(3)) : pAchat;
                                          }
                                        }
                                        updateLine(i, 'offres', newOffres);
                                      }}
                                    >
                                      <option value="ORIGINE">ORIGINE</option>
                                      <option value="CONCESSIONNAIRE">CONCESSIONNAIRE</option>
                                      <option value="ADAPTABLE">ADAPTABLE</option>
                                    </select>
                                  </div>
                                  <div className="col-span-3">
                                    <select
                                      className="w-full bg-white border border-[#dcedf2] rounded-[5px] px-2 py-1 text-[11px] font-semibold text-[#111318] focus:outline-none"
                                      value={offre.supplierId || ''}
                                      onChange={async e => {
                                        if (e.target.value === 'NEW_SUPPLIER') {
                                          const name = prompt("Entrez le nom du nouveau fournisseur à enregistrer :");
                                          if (name && name.trim()) {
                                            try {
                                              const res = await fetch('/api/suppliers', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ name: name.trim().toUpperCase() })
                                              });
                                              const data = await res.json();
                                              if ((data.success || res.ok) && data.data) {
                                                setSuppliers(prev => [...prev, data.data]);
                                                const newOffres = [...it.offres];
                                                newOffres[oIdx].supplierId = data.data.id;
                                                newOffres[oIdx].supplierName = data.data.name;
                                                updateLine(i, 'offres', newOffres);
                                                return;
                                              }
                                            } catch (err) {
                                              console.error(err);
                                            }
                                          }
                                          return;
                                        }
                                        const newOffres = [...it.offres];
                                        newOffres[oIdx].supplierId = e.target.value;
                                        const supp = suppliers.find(s => s.id === e.target.value);
                                        if (supp) newOffres[oIdx].supplierName = supp.name;
                                        updateLine(i, 'offres', newOffres);
                                      }}
                                    >
                                      <option value="">Fournisseur...</option>
                                      {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                      ))}
                                      <option value="NEW_SUPPLIER" className="font-bold text-[#059669]">+ Créer nouveau fournisseur...</option>
                                    </select>
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      type="number"
                                      placeholder="Achat HT"
                                      className="w-full bg-white border border-[#dcedf2] rounded-[5px] px-2 py-1 text-right text-[11px] font-mono font-semibold"
                                      value={offre.purchasePrice || ''}
                                      onChange={e => {
                                        const pVal = parseFloat(e.target.value) || 0;
                                        const newOffres = [...it.offres];
                                        newOffres[oIdx].purchasePrice = pVal;
                                        const disc = parseFloat(newOffres[oIdx].discount) || 0;
                                        if (newOffres[oIdx].type === 'ADAPTABLE') {
                                          newOffres[oIdx].sellingPrice = parseFloat((pVal * 1.30).toFixed(3));
                                        } else if (newOffres[oIdx].type === 'ORIGINE' || newOffres[oIdx].type === 'CONCESSIONNAIRE') {
                                          newOffres[oIdx].sellingPrice = pVal > 0 ? (disc > 0 ? parseFloat((pVal / (1 - disc / 100)).toFixed(3)) : pVal) : 0;
                                        }
                                        updateLine(i, 'offres', newOffres);
                                      }}
                                    />
                                  </div>
                                  <div className="col-span-1">
                                    <input
                                      type="number"
                                      placeholder="%"
                                      className="w-full bg-white border border-[#dcedf2] rounded-[5px] px-1 py-1 text-center text-[11px] font-semibold"
                                      value={offre.discount || ''}
                                      onChange={e => {
                                        const disc = parseFloat(e.target.value) || 0;
                                        const newOffres = [...it.offres];
                                        newOffres[oIdx].discount = disc;
                                        if (newOffres[oIdx].type === 'ORIGINE' || newOffres[oIdx].type === 'CONCESSIONNAIRE') {
                                          const sVal = parseFloat(newOffres[oIdx].sellingPrice) || 0;
                                          const pVal = parseFloat(newOffres[oIdx].purchasePrice) || 0;
                                          if (sVal > 0) {
                                            newOffres[oIdx].purchasePrice = parseFloat((sVal * (1 - disc / 100)).toFixed(3));
                                          } else if (pVal > 0) {
                                            newOffres[oIdx].sellingPrice = disc > 0 ? parseFloat((pVal / (1 - disc / 100)).toFixed(3)) : pVal;
                                          }
                                        }
                                        updateLine(i, 'offres', newOffres);
                                      }}
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <input
                                      type="number"
                                      placeholder="Vente HT"
                                      className="w-full bg-white border border-[#dcedf2] rounded-[5px] px-2 py-1 text-right text-[11px] font-mono font-semibold"
                                      value={offre.sellingPrice || ''}
                                      onChange={e => {
                                        const sVal = parseFloat(e.target.value) || 0;
                                        const newOffres = [...it.offres];
                                        newOffres[oIdx].sellingPrice = sVal;
                                        if (newOffres[oIdx].type === 'ORIGINE' || newOffres[oIdx].type === 'CONCESSIONNAIRE') {
                                          const disc = parseFloat(newOffres[oIdx].discount) || 0;
                                          if (sVal > 0) {
                                            newOffres[oIdx].purchasePrice = parseFloat((sVal * (1 - disc / 100)).toFixed(3));
                                          }
                                        }
                                        updateLine(i, 'offres', newOffres);
                                      }}
                                    />
                                  </div>
                                  <div className="col-span-2 flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => {
                                        updateLine(i, 'puHT', offre.sellingPrice);
                                        updateLine(i, 'partType', offre.type);
                                        updateLine(i, 'supplierName', offre.supplierName);
                                      }}
                                      className="px-2 py-1 bg-[#059669] hover:bg-[#047857] text-white text-[10px] font-bold rounded-[5px] transition uppercase shadow-sm"
                                    >
                                      Choisir
                                    </button>
                                    <button
                                      onClick={() => {
                                        const newOffres = it.offres.filter((_: any, idx: number) => idx !== oIdx);
                                        updateLine(i, 'offres', newOffres);
                                      }}
                                      className="p-1 text-[#dc2626] hover:bg-[#dc2626]/10 rounded-[5px] transition"
                                      title="Supprimer cette offre"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 3: Récapitulatif et Action Bar */}
      <div className="bg-[#f8f9fa] border border-[#dcedf2] rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dcedf2] bg-[#f1f3f5]">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#000000] flex items-center gap-2">
            <span className="w-[3px] h-[12px] bg-[#e8432f] rounded-[2px] inline-block" />
            Récapitulatif
          </div>
        </div>

        <div className="p-5 bg-white flex flex-col sm:flex-row justify-between gap-8">
          <div className="w-full sm:w-[220px]">
            <label className="block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#111318] mb-1.5">
              Remise globale (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={globalDiscount}
              onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)}
              className="w-full bg-white border border-[#dcedf2] rounded-[7px] px-3 py-2 text-[13px] font-semibold text-[#000000] focus:border-[#e8432f] outline-none"
            />
          </div>

          <div className="w-full sm:w-[340px] space-y-2">
            <div className="flex justify-between text-[12.5px] font-bold text-[#495057]">
              <span>Sous-total HT</span>
              <span className="font-mono text-[#000000]">{subtotalHT.toFixed(3)} TND</span>
            </div>
            {globalDiscount > 0 && (
              <div className="flex justify-between text-[12.5px] font-bold text-[#e8432f]">
                <span>Remise globale ({globalDiscount}%)</span>
                <span className="font-mono">-{globalDiscountAmt.toFixed(3)} TND</span>
              </div>
            )}
            <div className="flex justify-between text-[12.5px] font-bold text-[#495057]">
              <span>Après remise HT</span>
              <span className="font-mono text-[#000000]">{afterDiscount.toFixed(3)} TND</span>
            </div>
            <div className="flex justify-between text-[12.5px] font-bold text-[#495057]">
              <span>TVA 19%</span>
              <span className="font-mono text-[#000000]">{tva.toFixed(3)} TND</span>
            </div>
            <div className="border-t-2 border-[#dcedf2] mt-2 pt-3 flex justify-between items-baseline">
              <span className="text-[14px] font-bold text-[#000000] uppercase tracking-wide font-sans">
                Total TTC
              </span>
              <span className="font-mono font-bold text-[22px] text-[#d97706]">
                {totalTTC.toFixed(3)} TND
              </span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-[#f1f3f5] border-t border-[#dcedf2] px-5 py-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:border-[#e8432f] hover:text-[#e8432f] text-[#111318] text-[12px] font-bold rounded-[7px] border border-[#dcedf2] transition shadow-sm"
          >
            🖨 Imprimer / PDF
          </button>
          <button
            onClick={() => handleSaveDevis(true)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#2a5fb8] text-[#2a5fb8] hover:bg-[#2a5fb8] hover:text-white text-[12px] font-bold rounded-[7px] transition shadow-sm disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5" />
            {saving ? 'Envoi...' : '✉ Envoyer email client'}
          </button>

          <div className="flex-1" />

          {saved && (
            <span className="text-[#059669] text-[12px] font-bold flex items-center gap-1.5 mr-2">
              <CheckCircle className="w-4 h-4" /> Devis enregistré
            </span>
          )}

          <button
            onClick={() => handleSaveDevis(false)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#e8432f] hover:bg-[#d13a27] text-white text-[12px] font-bold rounded-[7px] border border-[#e8432f] transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Enregistrement...' : '💾 Enregistrer devis'}
          </button>
        </div>
      </div>

      {showSynthese && (
        <ModalSyntheseOffres
          quoteNumber={quoteToLoad?.id ? quoteToLoad.id.slice(-6).toUpperCase() : undefined}
          items={items}
          suppliers={suppliers}
          onClose={() => setShowSynthese(false)}
          onApply={handleApplySynthese}
        />
      )}
    </div>
  );
}

// ─── SECTION: AJOUTER FOURNISSEUR ────────────────────────────────────────────
function SectionAjouterFournisseur() {
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '', city: '', b2bUrl: '', b2bLogin: '', b2bPassword: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name) { setError('LE NOM DU FOURNISSEUR EST REQUIS'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setSaved(true);
        setForm({ name: '', contactName: '', phone: '', email: '', address: '', city: '', b2bUrl: '', b2bLogin: '', b2bPassword: '' });
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        setError(d.error || 'ERREUR LORS DE LA CRÉATION');
      }
    } catch (e) {
      setError('ERREUR RÉSEAU');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-green-400" /> AJOUTER FOURNISSEUR
      </h2>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-5">ENREGISTREZ UN NOUVEAU FOURNISSEUR DANS LA BASE</p>

      <div className={cardCls}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'NOM FOURNISSEUR *', key: 'name', type: 'text', placeholder: 'EX: EUROPIECES TUNISIE' },
            { label: 'CONTACT / RESPONSABLE', key: 'contactName', type: 'text', placeholder: 'NOM DU CONTACT' },
            { label: 'TÉLÉPHONE', key: 'phone', type: 'tel', placeholder: 'EX: 98 XXX XXX' },
            { label: 'EMAIL', key: 'email', type: 'email', placeholder: 'contact@fournisseur.tn' },
            { label: 'ADRESSE', key: 'address', type: 'text', placeholder: 'ADRESSE COMPLÈTE' },
            { label: 'VILLE', key: 'city', type: 'text', placeholder: 'EX: TUNIS' },
          ].map(f => (
            <div key={f.key}>
              <label className={labelCls}>{f.label}</label>
              <input type={f.type} placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className={f.key === 'email' ? "w-full bg-white text-zinc-900 font-semibold border border-zinc-200 text-sm px-3 h-10 rounded-lg border border-zinc-200 focus:outline-none focus:border-green-500" : inputCls.replace('focus:border-zinc-300', 'focus:border-green-500')} />
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-6">
          <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-4">ACCÈS B2B (MÉMO ET ROBOT)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'LIEN DU SITE B2B', key: 'b2bUrl', type: 'text', placeholder: 'https://...' },
              { label: 'LOGIN / UTILISATEUR', key: 'b2bLogin', type: 'text', placeholder: 'Identifiant B2B' },
              { label: 'MOT DE PASSE B2B', key: 'b2bPassword', type: 'text', placeholder: 'Mot de passe B2B' },
            ].map(f => (
              <div key={f.key}>
                <label className={labelCls}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-white text-zinc-950 font-semibold text-sm px-3 h-10 rounded-lg border border-zinc-200 focus:outline-none focus:border-cyan-500 placeholder:text-zinc-600" />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-400 text-xs font-black uppercase">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
        {saved && (
          <div className="mt-4 flex items-center gap-2 text-green-400 text-xs font-black uppercase">
            <CheckCircle className="w-4 h-4" /> FOURNISSEUR ENREGISTRÉ AVEC SUCCÈS !
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={() => setForm({ name: '', contactName: '', phone: '', email: '', address: '', city: '', b2bUrl: '', b2bLogin: '', b2bPassword: '' })}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-50 hover:bg-slate-700 text-zinc-950 rounded-xl text-[11px] font-black uppercase border border-zinc-200 transition">
            <X className="w-3.5 h-3.5" /> RÉINITIALISER
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[11px] font-black uppercase transition disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {saving ? 'ENREGISTREMENT...' : 'ENREGISTRER FOURNISSEUR'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION: LISTE FOURNISSEURS ─────────────────────────────────────────────
function SectionListeFournisseurs() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(d => {
      setSuppliers(d.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('SUPPRIMER CE FOURNISSEUR ?')) return;
    await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' });
    setSuppliers(p => p.filter(s => s.id !== id));
  };

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
        <List className="w-5 h-5 text-green-400" /> LISTE FOURNISSEURS
      </h2>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-5">GÉREZ ET MODIFIEZ VOS FOURNISSEURS ENREGISTRÉS</p>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" placeholder="RECHERCHER UN FOURNISSEUR..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-zinc-600">CHARGEMENT...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-zinc-600">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="uppercase font-bold text-sm">AUCUN FOURNISSEUR ENREGISTRÉ</p>
          <p className="text-xs text-zinc-600 mt-1 uppercase">UTILISEZ "AJOUTER FOURNISSEUR" DANS LE MENU GAUCHE</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(s => (
            <div key={s.id} className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center text-zinc-950 font-black text-sm">
                  {s.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-zinc-950 uppercase text-sm">{s.name}</p>
                  <p className="text-[10px] text-slate-405 uppercase">{s.contactName && `CONTACT: ${s.contactName} · `}{s.phone && `TÉL: ${s.phone}`}</p>
                  <p className="text-[10px] text-zinc-600 uppercase">{s.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${s.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {s.isActive ? 'ACTIF' : 'INACTIF'}
                </span>
                <button onClick={() => setEditingSupplier(s)} className="text-zinc-500 hover:text-green-400 transition p-1.5" title="Modifier">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(s.id)} className="text-zinc-600 hover:text-red-400 transition p-1.5" title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-zinc-950 uppercase mb-4">MODIFIER LE FOURNISSEUR</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className={labelCls}>NOM FOURNISSEUR *</label>
                <input type="text" value={editingSupplier.name} onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>CONTACT / RESPONSABLE</label>
                <input type="text" value={editingSupplier.contactName || ''} onChange={e => setEditingSupplier({ ...editingSupplier, contactName: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>TÉLÉPHONE</label>
                <input type="text" value={editingSupplier.phone || ''} onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>EMAIL</label>
                <input type="email" value={editingSupplier.email || ''} onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })} className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" />
              </div>
              <div>
                <label className={labelCls}>ADRESSE</label>
                <input type="text" value={editingSupplier.address || ''} onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>VILLE</label>
                <input type="text" value={editingSupplier.city || ''} onChange={e => setEditingSupplier({ ...editingSupplier, city: e.target.value })} className={inputCls} />
              </div>

              <div className="pt-4 mt-2 border-t border-zinc-200">
                <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-3">ACCÈS B2B (MÉMO ET ROBOT)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>LIEN DU SITE B2B</label>
                    <input type="url" placeholder="https://" value={editingSupplier.b2bUrl || ''} onChange={e => setEditingSupplier({ ...editingSupplier, b2bUrl: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>LOGIN / UTILISATEUR</label>
                    <input type="text" value={editingSupplier.b2bLogin || ''} onChange={e => setEditingSupplier({ ...editingSupplier, b2bLogin: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>MOT DE PASSE B2B</label>
                    <input type="text" value={editingSupplier.b2bPassword || ''} onChange={e => setEditingSupplier({ ...editingSupplier, b2bPassword: e.target.value })} className={inputCls} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-200">
                <input type="checkbox" checked={editingSupplier.isActive} onChange={e => setEditingSupplier({ ...editingSupplier, isActive: e.target.checked })} id="edit-supplier-active" className="rounded" />
                <label htmlFor="edit-supplier-active" className="font-bold text-zinc-950 uppercase select-none">FOURNISSEUR ACTIF</label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingSupplier(null)} className="flex-1 py-2.5 bg-zinc-50 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider">ANNULER</button>
              <button 
                onClick={async () => {
                  setUpdating(true);
                  const res = await fetch('/api/suppliers', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editingSupplier)
                  });
                  if (res.ok) {
                    setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? editingSupplier : s));
                    setEditingSupplier(null);
                  } else {
                    alert('Erreur lors de la mise à jour');
                  }
                  setUpdating(false);
                }}
                disabled={updating}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
              >
                ENREGISTRER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SECTION: CONSULTATION FOURNISSEUR + BON DE COMMANDE ─────────────────────
function SectionConsultationFournisseur() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'order' | 'comparison'>('order');

  // Tab 1: Bon de commande
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [items, setItems] = useState([{ reference: '', designation: '', quantity: 1, unitPrice: 0, discount: 0, tva: 19 }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<any>(null);

  // Tab 2: Comparateur & Consultation
  const [compItems, setCompItems] = useState([{ reference: '', designation: '', quantity: 1 }]);
  const [selectedSuppIds, setSelectedSuppIds] = useState<string[]>([]);
  // Prices mapping: { [supplierId]: { [itemIndex]: { price: number, discount: number } } }
  const [compPrices, setCompPrices] = useState<Record<string, Record<number, { price: number, discount: number }>>>({});
  const [b2bLoading, setB2bLoading] = useState(false);

  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [activeSuggestRow, setActiveSuggestRow] = useState<number | null>(null);
  const [activeSuggestField, setActiveSuggestField] = useState<'ref' | 'desc' | null>(null);

  const getSuggestions = (text: string, field: 'ref' | 'desc') => {
    if (!text || text.length < 1) return [];
    return catalogue.filter(p => {
      const target = field === 'ref' ? p.reference : p.name;
      return target?.toLowerCase().includes(text.toLowerCase());
    }).slice(0, 8);
  };

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(d => setSuppliers(d.data || []));
    fetch('/api/products').then(r => r.json()).then(d => setCatalogue(Array.isArray(d) ? d : d.data || []));
  }, []);

  const addLine = () => setItems(p => [...p, { reference: '', designation: '', quantity: 1, unitPrice: 0, discount: 0, tva: 19 }]);
  const removeLine = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) =>
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  // Calculations for PO
  const subtotalHT = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
  const totalDiscount = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice * (it.discount / 100)), 0);
  const totalHTNet = subtotalHT - totalDiscount;
  const totalTva = items.reduce((sum, it) => {
    const net = (it.quantity * it.unitPrice) * (1 - it.discount / 100);
    return sum + (net * (it.tva / 100));
  }, 0);
  const totalTTC = totalHTNet + totalTva;

  const handleCreateOrder = async () => {
    if (!selectedSupplier) { alert('VEUILLEZ SÉLECTIONNER UN FOURNISSEUR'); return; }
    if (items.every(it => !it.designation)) { alert('VEUILLEZ RENSEIGNER AU MOINS UN ARTICLE'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          items: items.filter(it => it.designation).map(it => ({
            ...it,
            total: it.quantity * it.unitPrice * (1 - it.discount / 100)
          })),
          notes,
          status: 'DRAFT'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSavedOrder(data.data);
      }
    } finally { setSaving(false); }
  };

  // PDF download for PO
  const handleDownloadPO_PDF = async () => {
    const supp = suppliers.find(s => s.id === selectedSupplier);
    if (!supp) { alert("VEUILLEZ SÉLECTIONNER UN FOURNISSEUR"); return; }
    
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("AUTOP TUNISIE", 20, 24);
    doc.setFontSize(10);
    doc.text("BON DE COMMANDE FOURNISSEUR", 20, 31);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Commande : #BC-${new Date().getTime().toString().slice(-6)}`, 140, 20);
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 140, 26);

    autoTable(doc, {
      startY: 65,
      head: [["Information Fournisseur", "Détail"]],
      body: [
        ["Fournisseur", supp.name || ""],
        ["Téléphone", supp.phone || "N/A"],
        ["Email", supp.email || "N/A"],
        ["Adresse / Ville", `${supp.address || ''} ${supp.city || ''}`.trim() || "N/A"],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 15,
      head: [["Réf", "Désignation", "Qté", "P.U. HT", "Remise %", "TVA %", "Total TTC"]],
      body: items.map((it: any) => {
        const net = it.unitPrice * (1 - it.discount / 100);
        const ttc = net * (1 + it.tva / 100);
        return [
          it.reference || "N/A",
          it.designation,
          it.quantity.toString(),
          it.unitPrice.toFixed(3),
          `${it.discount}%`,
          `${it.tva}%`,
          (it.quantity * ttc).toFixed(3)
        ];
      }),
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 10,
      body: [
        ["TOTAL BRUT HT", `${subtotalHT.toFixed(3)} TND`],
        ["TOTAL REMISE", `-${totalDiscount.toFixed(3)} TND`],
        ["TOTAL NET HT", `${totalHTNet.toFixed(3)} TND`],
        ["TOTAL TVA", `${totalTva.toFixed(3)} TND`],
        ["TOTAL TTC", `${totalTTC.toFixed(3)} TND`],
      ],
      theme: "plain",
      styles: { halign: "right", fontStyle: "bold" },
    });

    doc.save(`Bon_Commande_${supp.name.replace(/\s+/g, '_')}.pdf`);
  };

  // Excel/CSV download for PO
  const handleDownloadPO_Excel = () => {
    const supp = suppliers.find(s => s.id === selectedSupplier);
    if (!supp) { alert("VEUILLEZ SÉLECTIONNER UN FOURNISSEUR"); return; }

    let csv = "REFERENCE;DESIGNATION;QUANTITE;PRIX UNITAIRE HT;REMISE %;TVA %;TOTAL TTC\n";
    items.forEach((it: any) => {
      const net = it.unitPrice * (1 - it.discount / 100);
      const ttc = net * (1 + it.tva / 100);
      csv += `${it.reference || "N/A"};${it.designation};${it.quantity};${it.unitPrice.toFixed(3)};${it.discount};${it.tva};${(it.quantity * ttc).toFixed(3)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Bon_Commande_${supp.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const supplier = suppliers.find(s => s.id === selectedSupplier);

  // Comparateur actions
  const addCompLine = () => setCompItems(p => [...p, { reference: '', designation: '', quantity: 1 }]);
  const removeCompLine = (i: number) => setCompItems(p => p.filter((_, idx) => idx !== i));
  const updateCompItem = (i: number, field: string, val: any) =>
    setCompItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const handleToggleSupplier = (id: string) => {
    setSelectedSuppIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePriceChange = (suppId: string, itemIdx: number, field: 'price' | 'discount', val: number) => {
    setCompPrices(prev => ({
      ...prev,
      [suppId]: {
        ...(prev[suppId] || {}),
        [itemIdx]: {
          price: prev[suppId]?.[itemIdx]?.price ?? 0,
          discount: prev[suppId]?.[itemIdx]?.discount ?? 0,
          [field]: val
        }
      }
    }));
  };

  // Trouver le prix le plus bas pour une ligne
  const getLowestPriceInfo = (itemIdx: number) => {
    let minPrice = Infinity;
    let bestSuppId = '';
    selectedSuppIds.forEach(id => {
      const obj = compPrices[id]?.[itemIdx] || { price: 0, discount: 0 };
      const p = obj.price * (1 - obj.discount / 100);
      if (p > 0 && p < minPrice) {
        minPrice = p;
        bestSuppId = id;
      }
    });
    return { minPrice: minPrice === Infinity ? null : minPrice, bestSuppId };
  };

  const handleGeneratePOFromComparison = (suppId: string) => {
    const supp = suppliers.find(s => s.id === suppId);
    if (!supp) return;

    setSelectedSupplier(suppId);
    setItems(compItems.map((item, idx) => {
      const obj = compPrices[suppId]?.[idx] || { price: 0, discount: 0 };
      return {
        reference: item.reference,
        designation: item.designation,
        quantity: item.quantity,
        unitPrice: obj.price,
        discount: obj.discount,
        tva: 19
      };
    }));
    setNotes(`Généré à partir du tableau comparatif. Meilleur prix fournisseur.`);
    setActiveTab('order');
    alert(`✅ ARTICLES CHARGÉS DANS L'ONGLET BON DE COMMANDE POUR : ${supp.name.toUpperCase()}`);
  };

  const handleB2BSearch = async () => {
    if (selectedSuppIds.length === 0) {
      alert('VEUILLEZ SÉLECTIONNER AU MOINS UN FOURNISSEUR POUR LA RECHERCHE B2B');
      return;
    }
    const itemsToSearch = compItems.map((it, idx) => ({ ...it, idx })).filter(it => it.reference.trim() !== '');
    if (itemsToSearch.length === 0) {
      alert('VEUILLEZ RENSEIGNER AU MOINS UNE RÉFÉRENCE ARTICLE');
      return;
    }

    setB2bLoading(true);
    try {
      const searchTasks: Promise<any>[] = [];
      for (const suppId of selectedSuppIds) {
        for (const item of itemsToSearch) {
          searchTasks.push((async () => {
            try {
              const res = await fetch('/api/b2b/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplierId: suppId, reference: item.reference })
              });
              const data = await res.json();
              if (data.success && data.data) {
                const { price, discount, available } = data.data;
                if (available || price > 0) {
                  setCompPrices(prev => ({
                    ...prev,
                    [suppId]: {
                      ...(prev[suppId] || {}),
                      [item.idx]: { price, discount: discount || 0 }
                    }
                  }));
                }
              }
            } catch (err) {
              console.error(`Error searching B2B for ${item.reference} at ${suppId}`, err);
            }
          })());
        }
      }
      await Promise.all(searchTasks);
    } finally {
      setB2bLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-green-400" /> CONSULTATION FOURNISSEURS
      </h2>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-4">LANCEZ DES CONSULTATIONS ET CRÉEZ VOS BONS DE COMMANDE</p>

      {/* Onglets */}
      <div className="flex gap-2 mb-4 border-b border-zinc-200 pb-3">
        <button
          onClick={() => setActiveTab('order')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition ${
            activeTab === 'order' ? 'bg-green-600 text-zinc-950' : 'bg-white text-zinc-500 hover:text-zinc-950 border border-zinc-200'
          }`}
        >
          📝 Bon de Commande
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition ${
            activeTab === 'comparison' ? 'bg-green-600 text-zinc-950' : 'bg-white text-zinc-500 hover:text-zinc-950 border border-zinc-200'
          }`}
        >
          📊 Comparateur de Prix
        </button>
      </div>

      {activeTab === 'order' && (
        <div className="space-y-4">
          {savedOrder && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-400 font-black uppercase text-sm">
                <CheckCircle className="w-5 h-5" /> BON DE COMMANDE #{savedOrder.orderNumber} CRÉÉ !
              </div>
              <button onClick={() => setSavedOrder(null)} className="text-zinc-500 hover:text-zinc-950">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sélection fournisseur */}
          <div className={cardCls}>
            <div className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-3">SÉLECTION FOURNISSEUR</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>FOURNISSEUR *</label>
                <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}
                  className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal">
                  <option value="">-- CHOISIR UN FOURNISSEUR --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              {supplier && (
                <div className="bg-white p-4 rounded-xl border border-zinc-200 mb-4 w-full">
                  <p className="font-black text-zinc-950 uppercase">{supplier.name}</p>
                  {supplier.phone && <p className="text-zinc-500 uppercase font-sans">TÉL: {supplier.phone}</p>}
                  {supplier.email && <p className="text-zinc-500 font-sans">{supplier.email}</p>}
                  {supplier.city && <p className="text-zinc-600 uppercase">{supplier.city}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Articles */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400">ARTICLES À COMMANDER</div>
              <button onClick={addLine}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-black uppercase rounded-lg transition">
                <Plus className="w-3.5 h-3.5" /> AJOUTER LIGNE
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white text-zinc-950 font-bold text-xs px-3 h-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer transition-colors">
                    <th className="px-3 py-2.5 text-left rounded-l-lg">RÉFÉRENCE</th>
                    <th className="px-3 py-2.5 text-left">DÉSIGNATION *</th>
                    <th className="px-3 py-2.5 text-center">QTÉ</th>
                    <th className="px-3 py-2.5 text-right">P.U. HT (TND)</th>
                    <th className="px-3 py-2.5 text-right">REMISE %</th>
                    <th className="px-3 py-2.5 text-right">TVA %</th>
                    <th className="px-3 py-2.5 text-right">TOTAL TTC</th>
                    <th className="px-3 h-10 rounded-r-lg"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => {
                    const net = it.unitPrice * (1 - it.discount / 100);
                    const lineTTC = net * (1 + it.tva / 100) * it.quantity;
                    return (
                      <tr key={i} className="border-b border-zinc-200/50">
                        <td className="px-2 py-2 relative">
                          <input type="text" value={it.reference} 
                            onChange={e => {
                              updateItem(i, 'reference', e.target.value);
                              setActiveSuggestRow(i);
                              setActiveSuggestField('ref');
                            }}
                            onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('ref'); }}
                            onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                            className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" placeholder="RÉF." />
                          {activeSuggestRow === i && activeSuggestField === 'ref' && getSuggestions(it.reference, 'ref').length > 0 && (
                            <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-white border border-zinc-200 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
                              {getSuggestions(it.reference, 'ref').map((p: any) => (
                                <button key={p.id} type="button"
                                  onClick={() => {
                                    updateItem(i, 'reference', p.reference || '');
                                    updateItem(i, 'designation', p.name || '');
                                    if (p.costPrice) updateItem(i, 'unitPrice', p.costPrice);
                                    else if (p.price) updateItem(i, 'unitPrice', p.price);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between gap-2">
                                  <span className="text-red-400 font-mono font-bold shrink-0">{p.reference}</span>
                                  <span className="text-zinc-500 text-[10px] truncate">{p.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {it.reference && (() => {
                            const match = catalogue.find(x => x.reference?.toUpperCase() === it.reference?.toUpperCase());
                            return match ? (
                              <span className="text-[9px] text-green-400 font-black block mt-0.5 uppercase tracking-wider">✓ DISPO (STOCK: {match.stock})</span>
                            ) : (
                              <span className="text-[9px] text-amber-500 font-black block mt-0.5 uppercase tracking-wider">⚡ NOUVEAU (SERA CRÉÉ)</span>
                            );
                          })()}
                        </td>
                        <td className="px-2 py-2 relative">
                          <input type="text" value={it.designation} 
                            onChange={e => {
                              updateItem(i, 'designation', e.target.value);
                              setActiveSuggestRow(i);
                              setActiveSuggestField('desc');
                            }}
                            onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('desc'); }}
                            onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                            className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" placeholder="DÉSIGNATION" />
                          {activeSuggestRow === i && activeSuggestField === 'desc' && getSuggestions(it.designation, 'desc').length > 0 && (
                            <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-white border border-zinc-200 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
                              {getSuggestions(it.designation, 'desc').map((p: any) => (
                                <button key={p.id} type="button"
                                  onClick={() => {
                                    updateItem(i, 'reference', p.reference || '');
                                    updateItem(i, 'designation', p.name || '');
                                    if (p.costPrice) updateItem(i, 'unitPrice', p.costPrice);
                                    else if (p.price) updateItem(i, 'unitPrice', p.price);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between gap-2">
                                  <span className="text-zinc-950 truncate max-w-[140px]">{p.name}</span>
                                  <span className="text-red-400 font-mono text-[9px] shrink-0">{p.reference}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.quantity} min={1} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-14 bg-white text-zinc-900 border border-zinc-200 font-bold text-xs px-2 h-10 rounded border border-zinc-200 focus:outline-none text-center" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.unitPrice} min={0} step={0.001} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-white text-zinc-900 border border-zinc-200 font-bold text-xs px-2 h-10 rounded border border-zinc-200 focus:outline-none text-right" placeholder="0.000" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.discount} min={0} max={100} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-white text-zinc-900 border border-zinc-200 font-bold text-xs px-2 h-10 rounded border border-zinc-200 focus:outline-none text-center" placeholder="0" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.tva} min={0} max={100} onChange={e => updateItem(i, 'tva', parseFloat(e.target.value) || 19)}
                            className="w-16 bg-white text-zinc-900 border border-zinc-200 font-bold text-xs px-2 h-10 rounded border border-zinc-200 focus:outline-none text-center" placeholder="19" />
                        </td>
                        <td className="px-2 py-2 text-right font-black text-cyan-400">{lineTTC.toFixed(3)} TND</td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => removeLine(i)} className="text-zinc-600 hover:text-red-400 p-1 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-3 pt-3 border-t border-zinc-200">
              <div className="text-right space-y-1 text-xs">
                <p className="text-slate-450 uppercase font-bold">TOTAL BRUT HT : <span className="text-zinc-950 font-mono font-black ml-2">{subtotalHT.toFixed(3)} TND</span></p>
                <p className="text-red-400 uppercase font-bold">TOTAL REMISE : <span className="font-mono font-black ml-2">-{totalDiscount.toFixed(3)} TND</span></p>
                <p className="text-slate-450 uppercase font-bold">TOTAL NET HT : <span className="text-zinc-950 font-mono font-black ml-2">{totalHTNet.toFixed(3)} TND</span></p>
                <p className="text-slate-450 uppercase font-bold">TOTAL TVA : <span className="text-zinc-950 font-mono font-black ml-2">{totalTva.toFixed(3)} TND</span></p>
                <p className="text-amber-450 uppercase font-black text-base border-t border-zinc-200 pt-1.5 mt-1.5">TOTAL TTC : <span className="font-mono ml-2">{totalTTC.toFixed(3)} TND</span></p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className={cardCls}>
            <label className={labelCls}>NOTES / CONDITIONS</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" placeholder="Délai de livraison, conditions paiement..." />
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button onClick={handleDownloadPO_PDF} disabled={!selectedSupplier}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase transition disabled:opacity-50 font-sans"
            >
              <Download className="w-3.5 h-3.5" /> TÉLÉCHARGER PO (PDF)
            </button>
            <button onClick={handleDownloadPO_Excel} disabled={!selectedSupplier}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[11px] font-black uppercase transition disabled:opacity-50 font-sans"
            >
              <Download className="w-3.5 h-3.5" /> TÉLÉCHARGER PO (EXCEL)
            </button>
            <button onClick={handleCreateOrder} disabled={saving}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-zinc-950 rounded-xl text-[11px] font-black uppercase transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'CRÉATION...' : 'CRÉER & ENREGISTRER PO'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-4">
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-3 border-b border-zinc-200 pb-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400">1. SÉLECTIONNER LES FOURNISSEURS À COMPARER</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSuppIds(suppliers.filter(s => s.b2bLogin && s.b2bPassword).map(s => s.id))}
                  className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-zinc-950 text-[10px] font-black uppercase rounded-lg transition"
                >
                  ✅ TOUT SÉLECTIONNER B2B
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSuppIds([])}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-zinc-950 text-[10px] font-black uppercase rounded-lg transition"
                >
                  ✖ EFFACER
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {suppliers.filter(s => s.b2bLogin && s.b2bPassword).length > 0 ? (
                suppliers.filter(s => s.b2bLogin && s.b2bPassword).map(s => (
                  <label key={s.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-zinc-200 cursor-pointer text-xs font-black uppercase text-zinc-950 hover:border-cyan-500/50 select-none">
                    <input type="checkbox" checked={selectedSuppIds.includes(s.id)} onChange={() => handleToggleSupplier(s.id)} className="rounded border-zinc-200 text-cyan-600 focus:ring-cyan-500 bg-white" />
                    🤖 {s.name}
                  </label>
                ))
              ) : (
                <p className="text-zinc-600 font-bold uppercase text-[10px]">Aucun fournisseur B2B configuré. Veuillez renseigner les identifiants dans la fiche fournisseur.</p>
              )}
            </div>
          </div>

          <div className={cardCls}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400">2. SAISIR LES ARTICLES À CONSULTER</div>
              <div className="flex gap-2">
                <button onClick={handleB2BSearch} disabled={b2bLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-zinc-950 text-[11px] font-black uppercase rounded-lg transition disabled:opacity-50 font-sans shadow-[0_0_15px_rgba(8,145,178,0.4)]">
                  {b2bLoading ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  {b2bLoading ? 'RECHERCHE EN COURS...' : 'ROBOT B2B'}
                </button>
                <button onClick={addCompLine} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-black uppercase rounded-lg transition font-sans">
                  <Plus className="w-3.5 h-3.5" /> AJOUTER LIGNE
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white text-zinc-950 font-bold text-xs px-3 h-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer transition-colors">
                    <th className="px-3 py-2.5 text-left rounded-l-lg">DÉSIGNATION ARTICLE *</th>
                    <th className="px-3 py-2.5 text-left">RÉFÉRENCE</th>
                    <th className="px-3 py-2.5 text-center">QTÉ</th>
                    <th className="px-3 py-2.5 text-center rounded-r-lg">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {compItems.map((it, i) => (
                    <tr key={i} className="border-b border-zinc-200/50">
                      <td className="px-2 py-2 relative">
                        <input type="text" value={it.designation} 
                          onChange={e => {
                            updateCompItem(i, 'designation', e.target.value);
                            setActiveSuggestRow(i);
                            setActiveSuggestField('desc');
                          }} 
                          onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('desc'); }}
                          onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                          className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" placeholder="DÉSIGNATION ARTICLE" />
                        {activeSuggestRow === i && activeSuggestField === 'desc' && getSuggestions(it.designation, 'desc').length > 0 && (
                          <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-white border border-zinc-200 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
                            {getSuggestions(it.designation, 'desc').map((p: any) => (
                              <button key={p.id} type="button"
                                onClick={() => {
                                  updateCompItem(i, 'reference', p.reference || '');
                                  updateCompItem(i, 'designation', p.name || '');
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between gap-2">
                                <span className="text-zinc-950 truncate max-w-[140px]">{p.name}</span>
                                <span className="text-red-400 font-mono text-[9px] shrink-0">{p.reference}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 relative">
                        <input type="text" value={it.reference} 
                          onChange={e => {
                            updateCompItem(i, 'reference', e.target.value);
                            setActiveSuggestRow(i);
                            setActiveSuggestField('ref');
                          }} 
                          onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('ref'); }}
                          onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                          className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" placeholder="RÉF." />
                        {activeSuggestRow === i && activeSuggestField === 'ref' && getSuggestions(it.reference, 'ref').length > 0 && (
                          <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-white border border-zinc-200 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
                            {getSuggestions(it.reference, 'ref').map((p: any) => (
                              <button key={p.id} type="button"
                                onClick={() => {
                                  updateCompItem(i, 'reference', p.reference || '');
                                  updateCompItem(i, 'designation', p.name || '');
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between gap-2">
                                <span className="text-red-400 font-mono font-bold shrink-0">{p.reference}</span>
                                <span className="text-zinc-500 text-[10px] truncate">{p.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {it.reference && (() => {
                          const match = catalogue.find(x => x.reference?.toUpperCase() === it.reference?.toUpperCase());
                          return match ? (
                            <span className="text-[9px] text-green-400 font-black block mt-0.5 uppercase tracking-wider">✓ DISPO (STOCK: {match.stock})</span>
                          ) : (
                            <span className="text-[9px] text-amber-500 font-black block mt-0.5 uppercase tracking-wider">⚡ NOUVEAU (SERA CRÉÉ)</span>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" value={it.quantity} min={1} onChange={e => updateCompItem(i, 'quantity', parseInt(e.target.value) || 1)} className="w-14 bg-white text-zinc-900 border border-zinc-200 font-bold text-xs px-2 h-10 rounded border border-zinc-200 focus:outline-none text-center tabular-nums" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeCompLine(i)} className="text-zinc-600 hover:text-red-400 p-1 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedSuppIds.length > 0 && compItems.some(it => it.designation) && (
            <div className={cardCls}>
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-4 border-b border-zinc-200 pb-2">3. TABLEAU COMPARATIF DES OFFRES</div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-white text-zinc-950 font-bold text-xs px-3 h-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer transition-colors">
                      <th className="px-4 py-3">ARTICLE</th>
                      {selectedSuppIds.map(id => {
                        const s = suppliers.find(x => x.id === id);
                        return <th key={id} className="px-4 py-3 text-center text-zinc-950">{s?.name.toUpperCase()}</th>;
                      })}
                      <th className="px-4 py-3 text-right text-green-450">MEILLEURE OFFRE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compItems.map((it, idx) => {
                      if (!it.designation) return null;
                      const { minPrice, bestSuppId } = getLowestPriceInfo(idx);
                      return (
                        <tr key={idx} className="border-b border-slate-855 hover:bg-white/10">
                          <td className="px-4 py-3">
                            <span className="font-bold text-zinc-950 uppercase">{it.designation}</span>
                            {it.reference && <span className="block text-[10px] text-zinc-500">REF: {it.reference.toUpperCase()}</span>}
                          </td>
                          {selectedSuppIds.map(id => {
                            const valObj = compPrices[id]?.[idx] || { price: 0, discount: 0 };
                            const isCheapest = bestSuppId === id && minPrice !== null;
                            return (
                              <td key={id} className={`px-4 py-3 text-center transition ${isCheapest ? 'bg-green-500/10' : ''}`}>
                                <div className="flex flex-col gap-1 items-center justify-center">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-zinc-600 font-bold uppercase">P.U.</span>
                                    <input type="number" min={0} step={0.001} value={valObj.price || ''} onChange={e => handlePriceChange(id, idx, 'price', parseFloat(e.target.value) || 0)} className="w-20 bg-white text-zinc-900 border border-zinc-200 font-bold text-center text-xs px-1.5 py-1 rounded border border-slate-350 focus:outline-none tabular-nums" placeholder="0.000" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-zinc-600 font-bold uppercase">REM%</span>
                                    <input type="number" min={0} max={100} step={1} value={valObj.discount || ''} onChange={e => handlePriceChange(id, idx, 'discount', parseFloat(e.target.value) || 0)} className="w-20 bg-white text-zinc-900 border border-zinc-200 font-bold text-center text-xs px-1.5 py-1 rounded border border-slate-350 focus:outline-none tabular-nums" placeholder="0%" />
                                  </div>
                                  {valObj.price > 0 && (
                                    <span className="text-[9px] text-cyan-400 font-mono font-bold mt-0.5">NET: {(valObj.price * (1 - valObj.discount / 100)).toFixed(3)} DT</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-right font-black text-green-400 text-sm">
                            {minPrice ? `${minPrice.toFixed(3)} TND` : '-'}
                            {minPrice && (
                              <span className="block text-[9px] text-slate-450 uppercase font-sans">
                                PAR: {suppliers.find(x => x.id === bestSuppId)?.name}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Ligne Totaux par Fournisseur */}
                    <tr className="bg-white text-zinc-950 font-bold text-xs px-3 h-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer transition-colors">
                      <td className="px-4 py-3.5 text-slate-450 uppercase text-[10px]">TOTAL DE LA CONSULTATION</td>
                      {selectedSuppIds.map(id => {
                        const total = compItems.reduce((sum, it, idx) => {
                          const obj = compPrices[id]?.[idx] || { price: 0, discount: 0 };
                          const price = obj.price * (1 - obj.discount / 100);
                          return sum + (it.quantity * price);
                        }, 0);
                        return (
                          <td key={id} className="px-4 py-3.5 text-center text-sm text-cyan-400">
                            {total.toFixed(3)} TND
                            <button onClick={() => handleGeneratePOFromComparison(id)} className="block mx-auto mt-2 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[8px] uppercase tracking-wide transition font-black">
                              Commander chez lui
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3.5 text-right text-zinc-600">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SECTION: GESTION STOCK ET ARTICLES ─────────────────────────────────────
function SectionGestionArticles() {
  const { adminSection } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Formulaire manuel
  const [form, setForm] = useState({
    reference: '',
    name: '',
    brand: '',
    vehicleCompat: '',
    imageUrl: '',
    costPrice: 0,
    price: 0,
    stock: 0,
    description: ''
  });

  // Mode Édition
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // CSV
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Bulk Image Upload Modal state
  const [showBulkImageModal, setShowBulkImageModal] = useState(false);
  const [bulkImageFiles, setBulkImageFiles] = useState<File[]>([]);
  const [bulkImageProgress, setBulkImageProgress] = useState(0);
  const [bulkImageStatus, setBulkImageStatus] = useState<string>('');

  const handleBulkImageUpload = async () => {
    if (bulkImageFiles.length === 0) return;
    setBulkImageStatus('uploading');
    setBulkImageProgress(10);
    try {
      const formData = new FormData();
      bulkImageFiles.forEach(file => formData.append('files', file));
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      setBulkImageProgress(100);
      if (res.ok) {
        alert(`${bulkImageFiles.length} photo(s) importees !`);
        setBulkImageStatus('done');
        setShowBulkImageModal(false);
        setBulkImageFiles([]);
        fetchProducts();
      } else {
        alert("Erreur lors de l'importation.");
        setBulkImageStatus('');
      }
    } catch {
      alert("Erreur reseau.");
      setBulkImageStatus('');
    }
  };

  const [selectedProductForDetails, setSelectedProductForDetails] = useState<any | null>(null);

  const getProductImageUrl = (p: any): string => {
    if (!p) return '/images/categories/piece-auto-generique.jpg';
    if (p.imageUrl) return p.imageUrl;
    if (p.image) return p.image;
    if (Array.isArray(p.images) && p.images.length > 0 && p.images[0]) {
      return p.images[0];
    }
    if (typeof p.images === 'string' && p.images.trim() && p.images !== '[]') {
      try {
        const parsed = JSON.parse(p.images);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]) {
          return parsed[0];
        }
        if (typeof parsed === 'string' && parsed.trim()) {
          return parsed;
        }
      } catch {
        if (p.images.startsWith('http') || p.images.startsWith('/')) {
          return p.images;
        }
      }
    }
    const name = (p.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (name.includes('plaquette') || name.includes('patin') || name.includes('garniture') || (name.includes('frein') && !name.includes('disque'))) {
      return '/images/categories/plaquettes-frein.jpg';
    }
    if (name.includes('disque') || name.includes('rotor') || name.includes('tambour')) {
      return '/images/categories/disque-frein.jpg';
    }
    if (name.includes('filtre') && (name.includes('huile') || name.includes('oil'))) {
      return '/images/categories/filtre-huile.jpg';
    }
    if (name.includes('filtre') || name.includes('cartouche') || name.includes('carburant') || name.includes('essence') || name.includes('pollen') || name.includes('habitacle') || name.includes('gazole') || name.includes('gasoil')) {
      return '/images/categories/filtre-air.jpg';
    }
    if (name.includes('embrayage') || name.includes('clutch') || name.includes('butee') || name.includes('volant')) {
      return '/images/categories/kit-embrayage.jpg';
    }
    if (name.includes('biellette') || (name.includes('bielle') && (name.includes('suspension') || name.includes('stab')))) {
      return '/images/categories/biellette-suspension.jpg';
    }
    if (name.includes('rotule') || name.includes('direction') || name.includes('cremaillere')) {
      return '/images/categories/rotule-direction.jpg';
    }
    if (name.includes('triangle') || name.includes('bras') || name.includes('silentbloc')) {
      return '/images/categories/triangle-suspension.jpg';
    }
    if (name.includes('amortisseur') || name.includes('strut') || name.includes('jambe') || name.includes('ressort')) {
      return '/images/categories/amortisseur.jpg';
    }
    if (name.includes('distribution') || name.includes('distrib') || name.includes('courroie') || name.includes('chaine') || name.includes('galet')) {
      return '/images/categories/kit-distribution.jpg';
    }
    return '/images/categories/piece-auto-generique.jpg';
  };

  const [enriching, setEnriching] = useState(false);
  const handleAutoEnrichImages = async () => {
    setEnriching(true);
    try {
      const res = await fetch('/api/products/auto-enrich-images', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Succès : ${data.enriched || 0} articles enrichis automatiquement !`);
        fetchProducts();
      } else {
        alert(`Erreur : ${data.error || 'Impossible d\'enrichir'}`);
      }
    } catch {
      alert('Erreur réseau lors de l\'enrichissement.');
    } finally {
      setEnriching(false);
    }
  };

  const fetchProducts = () => {
    setLoading(true);
    fetch('/api/products').then(r => r.json()).then(d => {
      setProducts(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, [adminSection]);

  const handleManualSubmit = async () => {
    if (!form.reference.trim() || !form.name.trim()) {
      setError('LA RÉFÉRENCE ET LA DÉSIGNATION SONT REQUISES.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setSuccess('ARTICLE ENREGISTRÉ EN STOCK AVEC SUCCÈS !');
        setForm({
          reference: '',
          name: '',
          brand: '',
          vehicleCompat: '',
          imageUrl: '',
          costPrice: 0,
          price: 0,
          stock: 0,
          description: ''
        });
        fetchProducts();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        const err = await res.json();
        setError(err.error || 'Erreur lors de la création de l\'article.');
      }
    } catch (e) {
      setError('Une erreur réseau est survenue.');
    }
  };

  const handleEditSubmit = async () => {
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/products/${editingProduct.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingProduct.name,
          reference: editingProduct.reference,
          brand: editingProduct.brand,
          vehicleCompat: editingProduct.vehicleCompat,
          stock: editingProduct.stock,
          costPrice: editingProduct.costPrice,
          price: editingProduct.price,
          imageUrl: editingProduct.imageUrl
        })
      });
      if (res.ok) {
        alert('ARTICLE MIS À JOUR AVEC SUCCÈS !');
        setEditingProduct(null);
        fetchProducts();
      } else {
        alert('Erreur lors de la mise à jour.');
      }
    } catch (e) {
      alert('Erreur serveur.');
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('VOULEZ-VOUS VRAIMENT RETIRER CET ARTICLE DU STOCK ?')) return;
    try {
      const res = await fetch(`/api/products/${slug}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchProducts();
      } else {
        alert('Erreur lors de la suppression.');
      }
    } catch (e) {
      alert('Erreur serveur.');
    }
  };

  // Parsing CSV / XLSX via SheetJS
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const XLSX = await import('xlsx');
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Convert to array of arrays (keep raw values)
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (rows.length < 2) { setCsvPreview([]); return; }

        // Normalize header: strip accents, uppercase, trim whitespace
        const normalize = (s: any) =>
          String(s).toUpperCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ');

        const headerRaw: string[] = (rows[0] as any[]).map((h: any) => normalize(h));

        const findCol = (...keys: string[]) =>
          headerRaw.findIndex(h => keys.some(k => h.includes(k)));

        const refIdx   = findCol('REFERENCE', 'REF');
        const desIdx   = findCol('DESIGNATION', 'LIBELLE', 'NOM', 'ARTICLE');
        const qteIdx   = findCol('QTE', 'QUANT', 'STOCK');
        const mrqIdx   = findCol('MARQUE', 'BRAND');
        const vehIdx   = findCol('VEHICULE', 'CONCERNEE', 'COMPAT');
        const coutIdx  = findCol('COUT', 'REVIENT', 'ACHAT');
        const venteIdx = findCol('PRIX VENTE', 'VENTE', 'PV', 'PRIX');
        const imgIdx   = findCol('URL_IMAGE', 'URL', 'IMAGE', 'PHOTO', 'LIEN', 'IMG', 'PICTURE');

        const parseNum = (v: any) => {
          const n = parseFloat(String(v).replace(',', '.').replace(/\s/g, '').replace(/[^\d.-]/g, ''));
          return isNaN(n) ? 0 : n;
        };

        const parsed: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as any[];
          const reference   = refIdx !== -1 ? String(row[refIdx]  || '').trim() : '';
          const designation = desIdx !== -1 ? String(row[desIdx]  || '').trim() : '';
          if (!reference) continue;

          parsed.push({
            reference,
            designation:   designation || 'ARTICLE ' + reference,
            stock:         qteIdx   !== -1 ? parseInt(String(row[qteIdx] || '0')) || 0 : 0,
            brand:         mrqIdx   !== -1 ? String(row[mrqIdx]  || '').trim() : '',
            vehicleCompat: vehIdx   !== -1 ? String(row[vehIdx]  || '').trim() : '',
            costPrice:     coutIdx  !== -1 ? parseNum(row[coutIdx])  : 0,
            sellingPrice:  venteIdx !== -1 ? parseNum(row[venteIdx]) : 0,
            imageUrl:      imgIdx   !== -1 ? String(row[imgIdx]  || '').trim() : '',
          });
        }
        setCsvPreview(parsed);
      } catch (err) {
        console.error('Erreur parsing fichier:', err);
        alert('Erreur lors de la lecture du fichier. Vérifiez le format (xlsx ou csv).');
        setCsvFile(null);
        setCsvPreview([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLaunchImport = async () => {
    if (csvPreview.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: csvPreview })
      });
      if (res.ok) {
        alert(`✅ IMPORTATION DE ${csvPreview.length} ARTICLES RÉUSSIE AVEC SUCCÈS !`);
        setCsvPreview([]);
        setCsvFile(null);
        fetchProducts();
      } else {
        alert('Erreur lors de l\'importation des articles.');
      }
    } catch (e) {
      alert('Erreur de communication avec le serveur.');
    } finally {
      setImporting(false);
    }
  };

  const filtered = products.filter(p =>
    p.reference?.toLowerCase().includes(search.toLowerCase()) ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase()) ||
    p.vehicleCompat?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* ─── AJOUTER ARTICLE ─── */}
      {adminSection === 'ajouter-article' && (
        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" /> AJOUTER UN NOUVEL ARTICLE
          </h2>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-5">SÉLECTIONNEZ LE MODE D'ENTRÉE DES NOUVELLES PIÈCES</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulaire Saisie manuelle */}
            <div className={cardCls}>
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-4 border-b border-zinc-200 pb-2">SAISIE MANUELLE</div>
              
              {error && <p className="text-red-500 font-bold text-xs uppercase mb-3 font-mono">⚠️ {error}</p>}
              {success && <p className="text-green-400 font-bold text-xs uppercase mb-3 font-mono">✅ {success}</p>}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>RÉFÉRENCE *</label>
                    <input type="text" className={inputCls} placeholder="EX: 432551-A" value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>DÉSIGNATION ARTICLE *</label>
                    <input type="text" className={inputCls} placeholder="EX: FILTRE À HUILE" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>MARQUE</label>
                    <input type="text" className={inputCls} placeholder="EX: BOSCH" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>VÉHICULES CONCERNÉS</label>
                    <input type="text" className={inputCls} placeholder="EX: PEUGEOT 208, CITROEN C3" value={form.vehicleCompat} onChange={e => setForm({...form, vehicleCompat: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>LIEN DE L'IMAGE (URL)</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="url" 
                      className={inputCls} 
                      placeholder="EX: https://images.com/photo.jpg ou /images/parts/CAN1306J5.jpg" 
                      value={form.imageUrl} 
                      onChange={e => setForm({...form, imageUrl: e.target.value})} 
                    />
                    {form.imageUrl && (
                      <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 flex items-center justify-center shadow-sm">
                        <img 
                          src={form.imageUrl} 
                          alt="Aperçu" 
                          className="w-full h-full object-cover" 
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>QTÉ EN STOCK</label>
                    <input type="number" className={inputCls} placeholder="0" value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className={labelCls}>COÛT DE REVIENT (HT)</label>
                    <input type="number" className={inputCls} placeholder="0.00" value={form.costPrice} onChange={e => setForm({...form, costPrice: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className={labelCls}>PRIX DE VENTE (HT)</label>
                    <input type="number" className={inputCls} placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>

                <button onClick={handleManualSubmit} className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-cyan-600/20">
                  💾 ENREGISTRER L'ARTICLE
                </button>
              </div>
            </div>

            {/* Importation Excel / CSV */}
            <div className={cardCls}>
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-4 border-b border-zinc-200 pb-2">IMPORTER DEPUIS UN FICHIER EXCEL (CSV)</div>
              <p className="text-xs text-zinc-500 mb-4 leading-relaxed uppercase">
                IMPORTEZ DES CENTAINES DE PIÈCES D'UN SEUL COUP. LE FICHIER CSV DOIT EN TÊTE DES COLONNES COMPORTER :<br />
                <code className="bg-white text-zinc-950 font-bold text-xs px-3 h-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer transition-colors">REFERENCE | DESIGNATION | QTE | MARQUE | VEHICULES | COUT | PRIX | URL_IMAGE</code>
              </p>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-6 text-center hover:border-cyan-500/50 transition">
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleCsvUpload} className="hidden" id="csv-file-upload" />
                  <label htmlFor="csv-file-upload" className="cursor-pointer block">
                    <Package className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                    <div className="text-xs font-black text-slate-300 uppercase">SÉLECTIONNER UN FICHIER EXCEL OU CSV</div>
                    <div className="text-[9px] text-slate-555 mt-1 uppercase">FORMATS ACCEPTÉS : .XLSX, .XLS, .CSV</div>
                  </label>
                </div>

                {csvFile && (
                  <div className="bg-white p-4 rounded-xl border border-zinc-200 mb-4 w-full">
                    <span className="font-bold text-slate-300 font-mono">{csvFile.name} ({csvPreview.length} articles reconnus)</span>
                    <button onClick={() => { setCsvFile(null); setCsvPreview([]); }} className="text-red-500 hover:text-red-400 text-[10px] font-black uppercase">ANNULER</button>
                  </div>
                )}

                {csvPreview.length > 0 && (
                  <button onClick={handleLaunchImport} disabled={importing} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-green-600/20 disabled:opacity-50 font-sans">
                    {importing ? 'IMPORTATION EN COURS...' : `🚀 CONFIRMER L'IMPORTATION DE ${csvPreview.length} PIÈCES`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── LISTE DES ARTICLES ─── */}
      {(adminSection === 'liste-articles' || adminSection === 'modifier-article') && (
        <div className="space-y-4">
          <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" /> GESTION DU STOCK DE PIÈCES
          </h2>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-5">RECHERCHEZ, MODIFIEZ ET SUPPRIMEZ LES ARTICLES DU STOCK DE PIÈCES</p>

          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="RECHERCHER DANS LES ARTICLES (RÉF, NOM, MARQUE, VÉHICULE)..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" />
            </div>
            <button
              onClick={handleAutoEnrichImages}
              disabled={enriching}
              className="px-4 h-10 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 disabled:opacity-50"
              title="Associer automatiquement les photos par référence ou par désignation à tous les articles"
            >
              <Sparkles className="w-4 h-4" />
              <span>{enriching ? 'ENRICHISSEMENT...' : '⚡ AUTO-ENRICHIR PHOTOS'}</span>
            </button>
          </div>

          {showBulkImageModal && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 max-w-lg w-full text-left relative">
                <button onClick={() => !bulkImageStatus.includes('uploading') && setShowBulkImageModal(false)} className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-950 p-2 rounded-xl bg-white/60 border border-zinc-200 transition">
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-base font-black text-zinc-950 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <Upload className="w-5 h-5 text-cyan-500" /> IMPORTATION DE PHOTOS
                </h3>
                
                <p className="text-xs text-zinc-500 mb-4">Sélectionnez vos images (JPG/PNG). Le nom du fichier doit **exactement** correspondre à la référence (ex: <code className="bg-zinc-100 text-zinc-900 px-1 py-0.5 rounded">FDB4336.jpg</code>).</p>

                <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-6 text-center hover:bg-zinc-50 transition cursor-pointer relative">
                  <input type="file" multiple accept="image/png, image/jpeg" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                    if (e.target.files) {
                      setBulkImageFiles(Array.from(e.target.files));
                    }
                  }} />
                  <Upload className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <div className="text-sm font-bold text-zinc-950">Cliquez ou glissez vos images ici</div>
                  <div className="text-xs text-zinc-500 mt-1">{bulkImageFiles.length > 0 ? `${bulkImageFiles.length} fichier(s) sélectionné(s)` : 'JPG, PNG uniquement'}</div>
                </div>

                {bulkImageStatus === 'uploading' && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-zinc-500">
                      <span>IMPORTATION EN COURS...</span>
                      <span>{bulkImageProgress}%</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-cyan-500 h-2 transition-all duration-300" style={{ width: `${bulkImageProgress}%` }}></div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <button onClick={() => setShowBulkImageModal(false)} disabled={bulkImageStatus === 'uploading'} className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition">
                    ANNULER
                  </button>
                  <button onClick={handleBulkImageUpload} disabled={bulkImageFiles.length === 0 || bulkImageStatus === 'uploading'} className="flex-1 px-4 py-3 bg-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    DÉMARRER L'IMPORT
                  </button>
                </div>
              </div>
            </div>
          )}

          {editingProduct && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 max-w-lg w-full text-left relative">
                <button onClick={() => setEditingProduct(null)} className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-950 p-2 rounded-xl bg-white/60 border border-zinc-200 transition">
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-base font-black text-zinc-950 mb-4 uppercase tracking-widest text-cyan-400">ÉDITER LA PIÈCE</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>DÉSIGNATION DE LA PIÈCE</label>
                    <input type="text" className={inputCls} value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>RÉFÉRENCE *</label>
                      <input type="text" className={inputCls} value={editingProduct.reference || ''} onChange={e => setEditingProduct({...editingProduct, reference: e.target.value})} />
                    </div>
                    <div>
                      <label className={labelCls}>MARQUE</label>
                      <input type="text" className={inputCls} value={editingProduct.brand || ''} onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>VÉHICULES COMPATIBLES</label>
                    <input type="text" className={inputCls} value={editingProduct.vehicleCompat || ''} onChange={e => setEditingProduct({...editingProduct, vehicleCompat: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelCls}>LIEN DE L'IMAGE (URL)</label>
                    <input 
                      type="url" 
                      className={inputCls} 
                      placeholder="EX: https://images.com/photo.jpg" 
                      value={editingProduct.imageUrl || ''} 
                      onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} 
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>STOCK EN COURS</label>
                      <input type="number" className={inputCls} value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                      <label className={labelCls}>PRIX REVIENT</label>
                      <input type="number" className={inputCls} value={editingProduct.costPrice || editingProduct.oldPrice || 0} onChange={e => setEditingProduct({...editingProduct, costPrice: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div>
                      <label className={labelCls}>PRIX VENTE</label>
                      <input type="number" className={inputCls} value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button onClick={() => setEditingProduct(null)} className="flex-1 py-2.5 bg-white hover:bg-white border border-zinc-200 text-zinc-500 rounded-xl text-xs font-black uppercase">ANNULER</button>
                    <button onClick={handleEditSubmit} className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-zinc-950 rounded-xl text-xs font-black uppercase">ENREGISTRER MODIFICATIONS</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-zinc-600 font-bold uppercase">CHARGEMENT DES PIÈCES DU STOCK...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-650 font-bold uppercase">AUCUN ARTICLE TROUVÉ</div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-white text-zinc-950 font-bold text-xs px-3 h-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer transition-colors">
                      <th className="px-4 py-3 w-16 text-center">PHOTO</th>
                      <th className="px-4 py-3">RÉFÉRENCE</th>
                      <th className="px-4 py-3">DÉSIGNATION</th>
                      <th className="px-4 py-3">MARQUE</th>
                      <th className="px-4 py-3">VÉHICULES</th>
                      <th className="px-4 py-3 text-center">QUANTITÉ STOCK</th>
                      <th className="px-4 py-3 text-right text-red-400">P. REVIENT (HT)</th>
                      <th className="px-4 py-3 text-right text-green-400">P. VENTE (HT)</th>
                      <th className="px-4 py-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const imgUrl = getProductImageUrl(p);
                      return (
                        <tr key={p.id} className="border-b border-slate-850 hover:bg-zinc-100/60 transition group">
                          <td 
                            className="px-4 py-2.5 cursor-pointer" 
                            onClick={() => setSelectedProductForDetails(p)}
                            title="Cliquer pour voir la fiche article et la grande photo"
                          >
                            <div className="flex items-center justify-center">
                              <div className="relative w-12 h-12">
                                <img 
                                  src={imgUrl} 
                                  alt={p.reference || p.name} 
                                  className="w-12 h-12 rounded-lg object-cover border border-zinc-200 shadow-sm bg-white group-hover:scale-105 transition-transform"
                                  onError={(e) => { 
                                    (e.currentTarget as HTMLImageElement).src = '/images/categories/piece-auto-generique.jpg';
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td 
                            className="px-4 py-2.5 font-mono font-bold text-zinc-900 text-sm cursor-pointer hover:text-red-600 transition-colors"
                            onClick={() => setSelectedProductForDetails(p)}
                          >
                            {p.reference}
                          </td>
                          <td 
                            className="px-4 py-2.5 font-bold text-zinc-950 uppercase cursor-pointer hover:text-red-600 transition-colors"
                            onClick={() => setSelectedProductForDetails(p)}
                          >
                            {p.name}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-zinc-500 uppercase">{p.brand || '-'}</td>
                          <td className="px-4 py-2.5 text-zinc-500 uppercase line-clamp-2">{p.vehicleCompat || '-'}</td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-300">{p.stock}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-red-450/90">{(p.costPrice || p.oldPrice || 0).toFixed(2)} TND</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-green-400">{p.price.toFixed(2)} TND</td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex gap-1.5 justify-center">
                              <button 
                                onClick={() => setSelectedProductForDetails(p)} 
                                className="p-1.5 bg-slate-100 hover:bg-slate-250 text-slate-700 hover:text-zinc-950 rounded-lg border border-slate-300 transition"
                                title="Voir la fiche article détaillée"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-700" />
                              </button>
                              <button 
                                onClick={() => setEditingProduct({ ...p, imageUrl: imgUrl })} 
                                className="p-1.5 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-600 hover:text-zinc-950 rounded-lg border border-cyan-500/10 transition"
                                title="Modifier la pièce"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(p.slug)} 
                                className="p-1.5 bg-red-950/20 text-red-500 hover:bg-red-600 hover:text-zinc-950 rounded-lg border border-red-500/10 transition"
                                title="Supprimer la pièce"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

          {/* Modale Fiche Article Complète */}
          {selectedProductForDetails && (
            <ModalFicheArticle
              product={selectedProductForDetails}
              onClose={() => setSelectedProductForDetails(null)}
              isAdmin={true}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── SECTION: DEVIS GÉNÉRÉS (HISTORIQUE ET TÉLÉCHARGEMENT) ───────────────────
interface SectionDevisGeneresProps {
  onEditDevis?: (d: any) => void;
}

function SectionDevisGeneres({ onEditDevis }: SectionDevisGeneresProps) {
  const [devisList, setDevisList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDevis = (isBackground = false) => {
    if (!isBackground) setLoading(true);
    fetch('/api/devis').then(r => r.json()).then(d => {
      if (Array.isArray(d)) {
        setDevisList(d);
      } else if (d.success && Array.isArray(d.data)) {
        setDevisList(d.data);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDevis();
    const unsubscribe = subscribeQuotesSync(() => fetchDevis(true), 3000);
    return () => unsubscribe();
  }, []);

  const handleAssignDevis = async (devisId: string, name: string) => {
    try {
      const res = await fetch('/api/devis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisId, managedByName: name })
      });
      if (res.ok) {
        notifyQuotesSync();
        fetchDevis(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPDF = async (devis: any) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();

    const devisSorted = [...devisList].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    const devisIndex = devisSorted.findIndex(x => x.id === devis.id);
    const devisSeqNum = devisIndex !== -1 ? String(devisIndex + 1).padStart(6, '0') : devis.id.slice(-6).toUpperCase();

    // Calculs financiers du devis
    const subtotal = devis.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
    const tax = subtotal * 0.19;
    const totalTTC = devis.totalPrice || (subtotal + tax);

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("AUTOP TUNISIE", 20, 24);
    doc.setFontSize(10);
    doc.text("PROPOSITION COMMERCIALE / DEVIS", 20, 31);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Devis : #DEV-${devisSeqNum}`, 140, 20);
    doc.text(`Date : ${new Date(devis.createdAt).toLocaleDateString('fr-FR')}`, 140, 26);

    autoTable(doc, {
      startY: 50,
      head: [["Information Client", "Détail"]],
      body: [
        ["Email Client", devis.clientEmail || "N/A"],
        ["Véhicule", `${devis.vehicleBrand || ''} ${devis.vehicleModel || ''}`.trim() || "N/A"],
        ["Immatriculation / VIN", devis.vehicleVin || "N/A"],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
    });

    const tableBody: any[] = [];
    devis.items?.forEach((it: any) => {
      const typeLabel = it.partType || (it.isConcessionnaire ? 'ORIGINE' : (it.type || 'ADAPTABLE'));
      if (it.offres && Array.isArray(it.offres) && it.offres.length > 1) {
        it.offres.forEach((off: any, offIdx: number) => {
          const offType = off.type || (off.isConcessionnaire ? 'ORIGINE' : 'ADAPTABLE');
          const offPrice = parseFloat(off.sellingPrice) || it.price || 0;
          tableBody.push([
            it.reference || "N/A",
            `${it.name} (Option ${offIdx + 1}: ${offType})`,
            offType,
            it.quantity.toString(),
            offPrice.toFixed(3),
            (offPrice * it.quantity).toFixed(3)
          ]);
        });
      } else {
        tableBody.push([
          it.reference || "N/A",
          it.name,
          typeLabel,
          it.quantity.toString(),
          (it.price || 0).toFixed(3),
          ((it.price || 0) * it.quantity).toFixed(3)
        ]);
      }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 15,
      head: [["Réf. pièce", "Désignation", "Rubrique", "Quantité", "P.U. HT (TND)", "Total HT (TND)"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 10,
      body: [
        ["TOTAL HT", `${subtotal.toFixed(3)} TND`],
        ["TVA (19%)", `${tax.toFixed(3)} TND`],
        ["TOTAL TTC", `${totalTTC.toFixed(3)} TND`],
      ],
      theme: "plain",
      styles: { halign: "right", fontStyle: "bold" },
    });

    doc.save(`Devis_AUTOP_DEV-${devisSeqNum}.pdf`);
  };

  const handleDownloadExcel = (devis: any) => {
    let csv = "REFERENCE;DESIGNATION;RUBRIQUE / TYPE;QUANTITE;PRIX UNITAIRE HT;TOTAL HT\n";
    devis.items?.forEach((it: any) => {
      const typeLabel = it.partType || (it.isConcessionnaire ? 'ORIGINE' : (it.type || 'ADAPTABLE'));
      if (it.offres && Array.isArray(it.offres) && it.offres.length > 1) {
        it.offres.forEach((off: any, offIdx: number) => {
          const offType = off.type || (off.isConcessionnaire ? 'ORIGINE' : 'ADAPTABLE');
          const offPrice = parseFloat(off.sellingPrice) || it.price || 0;
          csv += `${it.reference || "N/A"};"${it.name} (Option ${offIdx + 1}: ${offType})";${offType};${it.quantity};${offPrice.toFixed(3)};${(offPrice * it.quantity).toFixed(3)}\n`;
        });
      } else {
        csv += `${it.reference || "N/A"};"${it.name}";${typeLabel};${it.quantity};${(it.price || 0).toFixed(3)};${((it.price || 0) * it.quantity).toFixed(3)}\n`;
      }
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Devis_AUTOP_${devis.id.slice(-6).toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSupplierPDF = async (devis: any) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const supplierNamesSet = new Set<string>();
    devis.items?.forEach((it: any) => {
      if (it.supplierName) supplierNamesSet.add(it.supplierName.trim().toUpperCase());
      if (it.offres && Array.isArray(it.offres)) {
        it.offres.forEach((o: any) => {
          if (o.supplierName) supplierNamesSet.add(o.supplierName.trim().toUpperCase());
        });
      }
    });

    const supplierList = Array.from(supplierNamesSet);
    if (supplierList.length === 0) {
      alert("Aucun nom de fournisseur spécifié dans ce devis.");
      return;
    }

    let targetSupplier = supplierList[0];
    if (supplierList.length > 1) {
      const selected = prompt(`Sélectionnez le fournisseur pour l'export PDF :\n${supplierList.map((s, i) => `${i + 1}. ${s}`).join('\n')}`, supplierList[0]);
      if (!selected) return;
      const found = supplierList.find(s => s.toLowerCase() === selected.toLowerCase().trim()) || supplierList[parseInt(selected) - 1];
      if (found) targetSupplier = found;
    }

    const doc = new jsPDF();
    const devisSeqNum = getSeqNum(devis);
    const cleanSupplierName = targetSupplier.trim().toUpperCase();

    const supplierItems: any[] = [];
    devis.items?.forEach((it: any) => {
      let matched = false;
      if (it.offres && Array.isArray(it.offres)) {
        const matching = it.offres.filter((o: any) => (o.supplierName || '').toUpperCase() === cleanSupplierName);
        if (matching.length > 0) {
          matched = true;
          matching.forEach((off: any) => {
            supplierItems.push({
              reference: it.reference || "N/A",
              name: it.name || it.designation,
              quantity: it.quantity,
              type: off.type || 'ADAPTABLE',
              purchasePrice: parseFloat(off.purchasePrice) || 0,
              sellingPrice: parseFloat(off.sellingPrice) || 0
            });
          });
        }
      }
      if (!matched && (it.supplierName || '').toUpperCase() === cleanSupplierName) {
        supplierItems.push({
          reference: it.reference || "N/A",
          name: it.name || it.designation,
          quantity: it.quantity,
          type: it.partType || 'ADAPTABLE',
          purchasePrice: it.price || 0,
          sellingPrice: it.price || 0
        });
      }
    });

    const itemsToExport = supplierItems.length > 0 ? supplierItems : devis.items;

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(`DEMANDE DE PRIX / OFFRE - ${cleanSupplierName}`, 20, 24);
    doc.setFontSize(10);
    doc.text(`CONCERNANT DEVIS #DEV-${devisSeqNum}`, 20, 31);

    doc.setTextColor(0, 0, 0);
    doc.text(`Fournisseur : ${cleanSupplierName}`, 140, 20);
    doc.text(`Date : ${new Date(devis.createdAt || Date.now()).toLocaleDateString('fr-FR')}`, 140, 26);

    const tableBody = itemsToExport.map((it: any) => [
      it.reference || "N/A",
      it.name || it.designation,
      it.type || it.partType || "ADAPTABLE",
      it.quantity.toString(),
      (it.purchasePrice || it.price || 0).toFixed(3),
      (((it.purchasePrice || it.price || 0)) * it.quantity).toFixed(3)
    ]);

    autoTable(doc, {
      startY: 50,
      head: [["Réf. pièce", "Désignation", "Type", "Quantité", "P.U. HT (TND)", "Total HT (TND)"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`Demande_Prix_${cleanSupplierName.replace(/\s+/g, '_')}_DEV-${devisSeqNum}.pdf`);
  };

  const handleDownloadSupplierExcel = (devis: any) => {
    const supplierNamesSet = new Set<string>();
    devis.items?.forEach((it: any) => {
      if (it.supplierName) supplierNamesSet.add(it.supplierName.trim().toUpperCase());
      if (it.offres && Array.isArray(it.offres)) {
        it.offres.forEach((o: any) => {
          if (o.supplierName) supplierNamesSet.add(o.supplierName.trim().toUpperCase());
        });
      }
    });

    const supplierList = Array.from(supplierNamesSet);
    if (supplierList.length === 0) {
      alert("Aucun nom de fournisseur spécifié dans ce devis.");
      return;
    }

    let targetSupplier = supplierList[0];
    if (supplierList.length > 1) {
      const selected = prompt(`Sélectionnez le fournisseur pour l'export Excel :\n${supplierList.map((s, i) => `${i + 1}. ${s}`).join('\n')}`, supplierList[0]);
      if (!selected) return;
      const found = supplierList.find(s => s.toLowerCase() === selected.toLowerCase().trim()) || supplierList[parseInt(selected) - 1];
      if (found) targetSupplier = found;
    }

    const devisSeqNum = getSeqNum(devis);
    const cleanSupplierName = targetSupplier.trim().toUpperCase();
    let csv = `DEMANDE DE PRIX / OFFRE FOURNISSEUR : ${cleanSupplierName}\n`;
    csv += "REFERENCE;DESIGNATION;RUBRIQUE / TYPE;QUANTITE;PRIX UNITAIRE HT;TOTAL HT\n";

    devis.items?.forEach((it: any) => {
      let matched = false;
      if (it.offres && Array.isArray(it.offres)) {
        const matching = it.offres.filter((o: any) => (o.supplierName || '').toUpperCase() === cleanSupplierName);
        if (matching.length > 0) {
          matched = true;
          matching.forEach((off: any) => {
            const offPrice = parseFloat(off.purchasePrice) || parseFloat(off.sellingPrice) || it.price || 0;
            csv += `${it.reference || "N/A"};"${it.name || it.designation}";${off.type || 'ADAPTABLE'};${it.quantity};${offPrice.toFixed(3)};${(offPrice * it.quantity).toFixed(3)}\n`;
          });
        }
      }
      if (!matched && (it.supplierName || '').toUpperCase() === cleanSupplierName) {
        csv += `${it.reference || "N/A"};"${it.name || it.designation}";${it.partType || 'ADAPTABLE'};${it.quantity};${(it.price || 0).toFixed(3)};${((it.price || 0) * it.quantity).toFixed(3)}\n`;
      }
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Demande_Prix_${cleanSupplierName.replace(/\s+/g, '_')}_DEV-${devisSeqNum}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const devisSorted = [...devisList].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  const getSeqNum = (d: any) => {
    const idx = devisSorted.findIndex(x => x.id === d.id);
    return idx !== -1 ? String(idx + 1).padStart(6, '0') : d.id.slice(-6).toUpperCase();
  };

  const filtered = devisList.filter(d => {
    const seq = getSeqNum(d);
    const s = search.toLowerCase();
    return (
      `dev-${seq}`.includes(s) ||
      seq.includes(s) ||
      d.clientEmail?.toLowerCase().includes(s) ||
      d.vehicleBrand?.toLowerCase().includes(s) ||
      d.vehicleModel?.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-1">
        <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 flex items-center gap-2">
          <FileText className="w-5 h-5 text-red-400" /> DEVIS GÉNÉRÉS & TRAITÉS
        </h2>
        <button
          onClick={async () => {
            if (confirm("⚠️ CONFIRMATION : Réinitialiser la liste et remettre le compteur des devis et demandes à zéro ?")) {
              try {
                const res = await fetch('/api/admin/reset-data', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ target: 'ALL_DEVIS' })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                  alert("✅ Compteur remis à zéro : Tous les devis et demandes ont été réinitialisés.");
                  fetchDevis();
                } else {
                  alert(data.error || "Erreur lors de la réinitialisation");
                }
              } catch (e: any) {
                alert("Erreur: " + e.message);
              }
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition shadow-sm"
          title="Remettre le compteur des devis à zéro"
        >
          <RefreshCw className="w-3.5 h-3.5" /> REMISE À ZÉRO COMPTEUR
        </button>
      </div>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-5">CONSULTEZ, MODIFIEZ ET EXPÉDIEZ VOS DEVIS DÉJÀ CHIFFRÉS</p>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" placeholder="RECHERCHER PAR EMAIL CLIENT, VEHICULE..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-zinc-600 font-bold uppercase">CHARGEMENT DES DEVIS...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-zinc-600 font-bold uppercase">AUCUN DEVIS TROUVÉ</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(d => {
            const seqNum = getSeqNum(d);
            return (
            <div key={d.id} className={cardCls}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-zinc-100">
                <div>
                  <span className="font-mono text-amber-400 font-black text-sm uppercase">#DEV-{seqNum}</span>
                  <h4 className="font-black text-zinc-950 uppercase text-sm mt-0.5">{d.clientEmail}</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">VÉHICULE: {d.vehicleBrand?.toUpperCase()} {d.vehicleModel?.toUpperCase()} · CRÉÉ LE: {new Date(d.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">MONTANT TOTAL TTC</span>
                    <span className="font-black text-zinc-950 text-base font-mono">{(d.totalPrice || 0).toFixed(3)} TND</span>
                  </div>
                  {/* Sélecteur de profil admin */}
                  <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl px-2.5 py-1">
                    <span className="text-[8px] text-zinc-950 font-black uppercase tracking-wider">Assigné à :</span>
                    <select
                      value={d.managedBy?.name?.toUpperCase() || 'NON ASSIGNÉ'}
                      onChange={(e) => handleAssignDevis(d.id, e.target.value)}
                      className="bg-transparent text-slate-200 font-bold text-[9px] focus:outline-none cursor-pointer uppercase"
                    >
                      <option value="NON ASSIGNÉ" className="bg-white text-zinc-600">NON ASSIGNÉ</option>
                      <option value="SAIF" className="bg-white text-zinc-950">SAIF</option>
                      <option value="AMINE" className="bg-white text-zinc-950">AMINE</option>
                      <option value="SAIFALLAH" className="bg-white text-zinc-950">SAIFALLAH</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 mb-4 w-full">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2">ARTICLES DU DEVIS :</span>
                {d.items?.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="flex justify-between items-center border-b border-zinc-200/20 pb-1.5 last:border-0 last:pb-0 mb-1.5 last:mb-0">
                    <span className="text-slate-355 uppercase font-bold">{item.name} {item.reference && `(${item.reference.toUpperCase()})`}</span>
                    <span className="font-black text-zinc-500 font-mono">x{item.quantity} | {item.price.toFixed(3)} TND</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                {onEditDevis && (
                  <button 
                    onClick={() => onEditDevis(d)}
                    className="flex items-center gap-1.5 h-10 px-4 flex justify-center items-center bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-black uppercase rounded-xl transition shadow shadow-amber-600/20"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> MODIFIER LE DEVIS
                  </button>
                )}
                <button onClick={() => handleDownloadPDF(d)} className="flex items-center gap-1.5 h-10 px-4 flex justify-center items-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase rounded-xl transition">
                  <Download className="w-3.5 h-3.5" /> PDF CLIENT
                </button>
                <button onClick={() => handleDownloadExcel(d)} className="flex items-center gap-1.5 h-10 px-4 flex justify-center items-center bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase rounded-xl transition">
                  <Download className="w-3.5 h-3.5" /> EXCEL CLIENT
                </button>
                <button onClick={() => handleDownloadSupplierPDF(d)} className="flex items-center gap-1.5 h-10 px-4 flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl transition border border-indigo-400/30 shadow-lg shadow-indigo-600/20" title="Télécharger l'offre / demande de prix au nom d'un fournisseur spécifique (PDF)">
                  <FileText className="w-3.5 h-3.5" /> PDF FOURNISSEUR
                </button>
                <button onClick={() => handleDownloadSupplierExcel(d)} className="flex items-center gap-1.5 h-10 px-4 flex justify-center items-center bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black uppercase rounded-xl transition border border-emerald-400/30 shadow-lg shadow-emerald-700/20" title="Télécharger l'offre / demande de prix au nom d'un fournisseur spécifique (Excel/CSV)">
                  <FileText className="w-3.5 h-3.5" /> EXCEL FOURNISSEUR
                </button>
                <button 
                  onClick={async () => {
                    if (confirm("Voulez-vous vraiment supprimer ce devis généré ?")) {
                      try {
                        const res = await fetch(`/api/devis?id=${d.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          notifyQuotesSync();
                          alert("Devis supprimé avec succès.");
                          fetchDevis();
                        } else {
                          const err = await res.json();
                          alert(err.error || "Erreur lors de la suppression");
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/15 hover:bg-red-500 hover:text-zinc-950 text-red-400 rounded-xl text-xs font-black uppercase tracking-wide transition border border-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" /> SUPPRIMER
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SECTION: SUIVI DES BONS DE COMMANDE ET LIVRAISONS ───────────────────────
function SectionBonsEtLivraisons() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // États d'édition des statuts & notes
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const fetchOrders = () => {
    setLoading(true);
    fetch('/api/orders').then(r => r.json()).then(d => {
      if (d && d.success) {
        setOrders(d.data || []);
        const newStatuses: Record<string, string> = {};
        const newNotes: Record<string, string> = {};
        d.data?.forEach((o: any) => {
          newStatuses[o.id] = o.status;
          newNotes[o.id] = o.customerNote || '';
        });
        setStatusMap(newStatuses);
        setNoteMap(newNotes);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          status: statusMap[orderId],
          trackingNote: noteMap[orderId]
        })
      });
      const d = await res.json();
      if (d.success) {
        alert('✅ STATUT DE LIVRAISON MIS À JOUR AVEC SUCCÈS !');
        fetchOrders();
      } else {
        alert('Erreur: ' + d.error);
      }
    } catch (e) {
      alert('Erreur serveur lors de la mise à jour.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignOrder = async (orderId: string, name: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, managedByName: name })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir SUPPRIMER définitivement ce bon de commande client ?")) return;
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        alert("✅ Bon de commande supprimé avec succès !");
        fetchOrders();
      } else {
        alert("Erreur: " + d.error);
      }
    } catch (e) {
      alert("Erreur lors de la suppression du bon de commande.");
    }
  };

  const filtered = orders.filter(o => 
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-purple-400" /> BONS DE COMMANDE & LIVRAISONS
      </h2>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-5">CONSULTATION, MODIFICATION ET SUPPRESSION DES BONS DE COMMANDE CLIENTS</p>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" placeholder="RECHERCHER PAR N° COMMANDE, NOM CLIENT, EMAIL..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-zinc-600 font-bold uppercase">CHARGEMENT DES BONS DE COMMANDE...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-zinc-600 font-bold uppercase">AUCUNE COMMANDE TROUVÉE</div>
      ) : (
        filtered.map(o => (
          <div key={o.id} className={cardCls}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-zinc-100">
              <div>
                <span className="font-mono text-green-400 font-black text-sm uppercase">#{o.orderNumber}</span>
                <h4 className="font-black text-zinc-950 uppercase text-sm mt-0.5">{o.user?.name || `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim() || 'CLIENT'}</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">{o.user?.email} · CRÉÉ LE: {new Date(o.createdAt).toLocaleDateString('fr-FR')}</p>
                {o.shippingAddress && <p className="text-[10px] text-cyan-400 mt-1 uppercase font-bold">📍 ADRESSE: {o.shippingAddress.street || o.shippingAddress}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">MONTANT TOTAL TTC</span>
                    <span className="font-black text-zinc-950 text-base font-mono">{o.total.toFixed(3)} TND</span>
                  </div>
                  <button
                    onClick={() => handleDeleteOrder(o.id)}
                    title="Supprimer ce bon de commande"
                    className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-zinc-950 rounded-xl border border-red-500/40 transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Sélecteur de profil admin */}
                <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl px-2.5 py-1">
                  <span className="text-[8px] text-zinc-950 font-black uppercase tracking-wider">Assigné à :</span>
                  <select
                    value={o.managedBy?.name?.toUpperCase() || 'NON ASSIGNÉ'}
                    onChange={(e) => handleAssignOrder(o.id, e.target.value)}
                    className="bg-transparent text-slate-200 font-bold text-[9px] focus:outline-none cursor-pointer uppercase"
                  >
                    <option value="NON ASSIGNÉ" className="bg-white text-zinc-600">NON ASSIGNÉ</option>
                    <option value="SAIF" className="bg-white text-zinc-950">SAIF</option>
                    <option value="AMINE" className="bg-white text-zinc-950">AMINE</option>
                    <option value="SAIFALLAH" className="bg-white text-zinc-950">SAIFALLAH</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Articles list */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200 mb-4 w-full">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2">ARTICLES DU BON DE COMMANDE :</span>
              {o.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center border-b border-zinc-200/20 pb-1.5 last:border-0 last:pb-0 mb-1.5 last:mb-0">
                  <span className="text-slate-355 uppercase font-bold">{item.productName}</span>
                  <span className="font-black text-zinc-500 font-mono">x{item.quantity} | {item.price.toFixed(3)} TND</span>
                </div>
              ))}
            </div>

            {/* Formulaire statut préparé par admin */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200 mb-4 w-full">
              <div>
                <label className={labelCls}>STATUT DE LIVRAISON</label>
                <select 
                  value={statusMap[o.id] || o.status}
                  onChange={e => setStatusMap({...statusMap, [o.id]: e.target.value})}
                  className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal"
                >
                  <option value="PENDING">EN ATTENTE DE VALIDATION</option>
                  <option value="CONFIRMED">CONFIRMÉE / EN PRÉPARATION</option>
                  <option value="SHIPPED">EXPÉDIÉE / EN COURS DE LIVRAISON</option>
                  <option value="DELIVERED">LIVRÉE</option>
                  <option value="CANCELLED">ANNULÉE</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>NOTE DE SUIVI POUR LE CLIENT</label>
                <input 
                  type="text" 
                  value={noteMap[o.id] || ''}
                  onChange={e => setNoteMap({...noteMap, [o.id]: e.target.value})}
                  placeholder="Ex: COMMANDE PRÊTE AU COMPTOIR / COLIS EN ROUTE" 
                  className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal"
                />
              </div>
              <div>
                <button 
                  onClick={() => handleUpdateStatus(o.id)}
                  disabled={updatingId === o.id}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider transition shadow shadow-purple-650/20 disabled:opacity-50 font-sans"
                >
                  {updatingId === o.id ? 'MISE À JOUR...' : 'METTRE À JOUR LE STATUT'}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── SECTION: TABLEAU DE BORD ─────────────────────────────────────────────────
function SectionTableauBord() {
  const { setAdminSection } = useApp();
  const [stats, setStats] = useState({ quotes: 0, orders: 0, suppliers: 0, products: 0 });

  const fetchStats = () => {
    Promise.all([
      fetch('/api/quotes').then(r => r.json()).catch(() => []),
      fetch('/api/orders?limit=1').then(r => r.json()).catch(() => ({})),
      fetch('/api/suppliers').then(r => r.json()).catch(() => ({})),
      fetch('/api/products?limit=1').then(r => r.json()).catch(() => ({})),
    ]).then(([q, o, s, p]) => {
      setStats({
        quotes: Array.isArray(q) ? q.length : (q.data?.length || 0),
        orders: o.pagination?.total || (Array.isArray(o.data) ? o.data.length : 0),
        suppliers: s.data?.length || (Array.isArray(s) ? s.length : 0),
        products: p.pagination?.total || (Array.isArray(p) ? p.length : 0),
      });
    });
  };

  useEffect(() => {
    fetchStats();
    const unsubscribe = subscribeQuotesSync(fetchStats, 3000);
    return () => unsubscribe();
  }, []);

  const cards = [
    { 
      id: 'reception',
      label: 'DEMANDES EN ATTENTE', 
      value: stats.quotes, 
      color: 'from-red-600 to-red-500',
      icon: FileText,
      desc: 'Demandes clients à traiter'
    },
    { 
      id: 'bons',
      label: 'BONS DE COMMANDE', 
      value: stats.orders, 
      color: 'from-blue-600 to-blue-500',
      icon: ShoppingBag,
      desc: 'Commandes validées'
    },
    { 
      id: 'liste-fournisseurs',
      label: 'FOURNISSEURS ACTIFS', 
      value: stats.suppliers, 
      color: 'from-emerald-600 to-teal-600',
      icon: Building2,
      desc: 'Fournisseurs partenaires'
    },
    { 
      id: 'liste-articles',
      label: 'ARTICLES EN CATALOGUE', 
      value: stats.products, 
      color: 'from-amber-600 to-orange-500',
      icon: Package,
      desc: 'Références & pièces'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-black uppercase tracking-widest text-slate-100 flex items-center gap-2.5 font-sans">
          <BarChart2 className="w-5 h-5 text-red-500" />
          TABLEAU DE BORD
        </h2>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
          Vue d'ensemble de votre activité en temps réel
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div 
              key={i} 
              onClick={() => setAdminSection(c.id)}
              className={`bg-gradient-to-br ${c.color} rounded-2xl p-6 text-white shadow-2xl transition-all hover:scale-[1.02] cursor-pointer group flex flex-col justify-between relative overflow-hidden border border-white/10`}
            >
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
              
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-base shrink-0 border border-white/15 backdrop-blur-sm">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80 group-hover:text-white transition">
                  Consulter →
                </span>
              </div>
              <div className="relative z-10">
                <div className="text-4xl font-black font-mono tracking-tight leading-none mb-2">
                  {c.value}
                </div>
                <div className="text-[10.5px] font-black uppercase tracking-widest text-white/90">
                  {c.label}
                </div>
                <div className="text-[11px] font-semibold text-white/75 mt-0.5">
                  {c.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Live Reception Queue */}
      <div className="pt-2">
        <SectionReception />
      </div>
    </div>
  );
}

// ─── SECTION: SUIVI PO & LIVRAISONS ──────────────────────────────────────────
function SectionSuiviPO() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    fetch('/api/purchase-orders')
      .then(r => r.json())
      .then(d => {
        setOrders(Array.isArray(d.data) ? d.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const confirmMsg = newStatus === 'RECEIVED' 
      ? "Êtes-vous sûr de marquer cette commande comme livrée ? Cela ajoutera automatiquement les quantités des articles au stock."
      : "Voulez-vous changer le statut de cette commande ?";
      
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/purchase-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Statut mis à jour avec succès ! Le stock a été ajusté.");
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(data.data);
        }
      } else {
        alert("Erreur: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la mise à jour.");
    }
  };

  const handleDeletePO = async (poId: string) => {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir SUPPRIMER cette commande d'achat fournisseur ?")) return;
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert("✅ Bon de commande fournisseur supprimé avec succès !");
        fetchOrders();
      } else {
        alert("Erreur: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression de la commande.");
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-zinc-50 text-zinc-500 border-zinc-200',
    SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    CONFIRMED: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    RECEIVED: 'bg-green-500/15 text-green-400 border-green-500/20',
  };

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
        <Clock className="w-5 h-5 text-green-400" /> SUIVI PO & LIVRAISONS
      </h2>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-5">CONSULTATION, SUIVI ET SUPPRESSION DES BONS DE COMMANDE FOURNISSEURS</p>

      <div className={cardCls}>
        {loading ? (
          <div className="text-center py-8 text-zinc-600 font-bold uppercase animate-pulse">Chargement...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 font-bold uppercase">Aucune commande fournisseur trouvée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-white text-zinc-950 font-bold text-xs px-3 h-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer transition-colors">
                  <th className="px-4 py-3 rounded-l-lg">N° COMMANDE</th>
                  <th className="px-4 py-3">FOURNISSEUR</th>
                  <th className="px-4 py-3">DATE</th>
                  <th className="px-4 py-3 text-right">MONTANT</th>
                  <th className="px-4 py-3 text-center">STATUT</th>
                  <th className="px-4 py-3 rounded-r-lg text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-zinc-100 hover:bg-zinc-50/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-black text-red-450 text-sm">#{o.orderNumber}</td>
                    <td className="px-4 py-3 font-black text-zinc-950 uppercase">{o.supplier?.name}</td>
                    <td className="px-4 py-3 text-zinc-500">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right font-bold text-zinc-950">{o.totalAmount.toFixed(3)} TND</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${statusColors[o.status] || 'bg-zinc-50'}`}>
                        {o.status === 'RECEIVED' ? '✓ LIVRÉ' : o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setSelectedOrder(o)}
                        className="chrome-gloss px-3 py-1.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-zinc-200 text-slate-200 text-[10px] font-black uppercase rounded-lg transition"
                      >
                        Détails
                      </button>
                      {o.status !== 'RECEIVED' ? (
                        <select 
                          value={o.status}
                          onChange={e => handleUpdateStatus(o.id, e.target.value)}
                          className="bg-white text-zinc-950 font-bold text-xs px-3 h-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer transition-colors"
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="SENT">SENT</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="RECEIVED">RECEIVED (LIVRÉ)</option>
                        </select>
                      ) : (
                        <span className="text-[10px] text-green-400 font-black uppercase tracking-wider">STOCK COMPTABILISÉ</span>
                      )}
                      <button
                        onClick={() => handleDeletePO(o.id)}
                        title="Supprimer la commande d'achat fournisseur"
                        className="p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-zinc-950 rounded-lg border border-red-500/40 transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Détails */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative text-zinc-900">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-950"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-zinc-950 uppercase mb-1">Détails Commande #{selectedOrder.orderNumber}</h3>
            <p className="text-zinc-500 text-xs uppercase mb-4">Fournisseur : {selectedOrder.supplier?.name} | Date : {new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR')}</p>

            <div className="overflow-x-auto max-h-60 overflow-y-auto border border-zinc-200 rounded-2xl mb-4">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-white text-zinc-950 font-bold text-xs px-3 h-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer transition-colors">
                    <th className="px-3 py-2">Référence</th>
                    <th className="px-3 py-2">Désignation</th>
                    <th className="px-3 py-2 text-center">Qté</th>
                    <th className="px-3 py-2 text-right">P.U. HT</th>
                    <th className="px-3 py-2 text-right rounded-r-lg">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item: any) => (
                    <tr key={item.id} className="border-b border-zinc-100">
                      <td className="px-3 py-2 font-mono text-red-400 font-bold">{item.reference || 'N/A'}</td>
                      <td className="px-3 py-2 text-zinc-950 uppercase">{item.designation}</td>
                      <td className="px-3 py-2 text-center text-slate-300 font-bold">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-slate-300">{item.unitPrice.toFixed(3)} TND</td>
                      <td className="px-3 py-2 text-right text-cyan-400 font-bold">{item.total.toFixed(3)} TND</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-zinc-200 text-xs">
              <div>
                <span className="text-zinc-500 font-bold uppercase block text-[10px]">Statut Actuel</span>
                <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusColors[selectedOrder.status]}`}>
                  {selectedOrder.status === 'RECEIVED' ? '✓ LIVRÉ' : selectedOrder.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 font-bold uppercase block text-[10px]">Montant Total</span>
                <span className="text-lg font-black text-amber-450 font-mono">{selectedOrder.totalAmount.toFixed(3)} TND</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="mt-3 p-3 bg-zinc-50/50 rounded-xl border border-zinc-200 text-slate-300 text-xs normal-case">
                <strong>Notes:</strong> {selectedOrder.notes}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {selectedOrder.status !== 'RECEIVED' && (
                <button 
                  onClick={() => {
                    handleUpdateStatus(selectedOrder.id, 'RECEIVED');
                  }}
                  className="h-10 px-4 flex justify-center items-center bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase rounded-xl transition"
                >
                  ✓ Marquer comme Livré
                </button>
              )}
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-zinc-50 hover:bg-slate-700 border border-zinc-200 text-slate-200 text-xs font-black uppercase rounded-xl transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SECTION: SERVICE COMPTABILITÉ (FACTURES) ──────────────────────────────────
function SectionComptabilite() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showOnlyDelivered, setShowOnlyDelivered] = useState(true);

  const fetchOrders = () => {
    setLoading(true);
    fetch('/api/orders')
      .then(r => r.json())
      .then(d => {
        setOrders(Array.isArray(d.data) ? d.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleTogglePaymentStatus = async (orderId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';
    const isPaid = newStatus === 'PAID';
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentStatus: newStatus, isPaid })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadInvoice = async (o: any) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const ref = o.orderNumber.replace('CMD', 'FAC');

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("AUTOP TUNISIE", 20, 24);
    doc.setFontSize(10);
    doc.text("FACTURE ACQUITTEE - SERVICE COMPTABILITE", 20, 31);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Facture : #${ref}`, 140, 20);
    doc.text(`Date : ${new Date(o.updatedAt).toLocaleDateString('fr-FR')}`, 140, 26);

    autoTable(doc, {
      startY: 65,
      head: [["Information", "Détail"]],
      body: [
        ["Nom du Client", o.user?.name || `${o.user?.firstName} ${o.user?.lastName}` || "Client Autop"],
        ["Email", o.user?.email || ""],
        ["Commande originale", o.orderNumber],
        ["Adresse de livraison", o.shippingAddress?.street || o.shippingAddress || "N/A"],
        ["Mode de livraison", o.shippingAddress?.shippingMethod || "N/A"],
        ["Statut de paiement", o.paymentStatus === 'PAID' ? 'PAYÉ' : 'EN ATTENTE'],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 15,
      head: [["Désignation", "Quantité", "P.U. (TND)", "Total (TND)"]],
      body: o.items.map((it: any) => [
        it.productName,
        it.quantity.toString(),
        it.price.toFixed(3),
        it.total.toFixed(3)
      ]),
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    doc.text(`TOTAL H.T. : ${o.subtotal.toFixed(3)} TND`, 135, finalY + 10);
    doc.text(`FRAIS DE PORT : ${o.shippingCost.toFixed(3)} TND`, 135, finalY + 16);
    doc.text(`TVA (19%) : ${o.tax.toFixed(3)} TND`, 135, finalY + 22);
    doc.text(`TOTAL TTC : ${o.total.toFixed(3)} TND`, 135, finalY + 28);

    doc.save(`Facture_AUTOP_${ref}.pdf`);
  };

  const filtered = orders.filter(o => {
    const matchesSearch = 
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.email?.toLowerCase().includes(search.toLowerCase());
    
    if (showOnlyDelivered) {
      return matchesSearch && o.status === 'DELIVERED';
    }
    return matchesSearch;
  });

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-purple-400" /> SERVICE COMPTABILITÉ
      </h2>
      <p className="text-slate-450 text-xs uppercase tracking-wider mb-5">GESTION DES FACTURES CLIENTS ET ENCAISSEMENTS</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" placeholder="RECHERCHER PAR CLIENT, EMAIL, FACTURE..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" />
        </div>
        <button
          onClick={() => setShowOnlyDelivered(!showOnlyDelivered)}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
            showOnlyDelivered 
              ? 'bg-red-650/15 border-red-500 text-zinc-950' 
              : 'bg-white text-zinc-900 border border-zinc-200 border-zinc-200'
          }`}
        >
          {showOnlyDelivered ? '✓ Uniquement Livrées (Facturées)' : 'Toutes les commandes'}
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="text-center py-12 text-zinc-600 font-bold uppercase animate-pulse">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 font-bold uppercase">Aucune facture disponible</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-white/40 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                  <th className="px-4 py-3">N° Facture</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Date émise</th>
                  <th className="px-4 py-3">Frais port</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3 text-center">Paiement</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const ref = o.orderNumber.replace('CMD', 'FAC');
                  const shippingMethod = o.shippingAddress?.shippingMethod || 'standard';
                  return (
                    <tr key={o.id} className="border-b border-zinc-100 hover:bg-zinc-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-black text-red-400 text-sm">#{ref}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-950 uppercase text-xs">{o.user?.name || `${o.user?.firstName} ${o.user?.lastName}`}</div>
                        <div className="text-[9px] text-zinc-600">{o.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-450 uppercase">{new Date(o.updatedAt).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-xs text-slate-450 font-mono font-bold uppercase">{o.shippingCost > 0 ? `${o.shippingCost.toFixed(3)} TND` : 'GRATUIT'} ({shippingMethod})</td>
                      <td className="px-4 py-3 text-right font-bold text-zinc-950 font-mono text-sm">{o.total.toFixed(3)} TND</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleTogglePaymentStatus(o.id, o.paymentStatus)}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            o.paymentStatus === 'PAID'
                              ? 'bg-green-500/15 text-green-400 border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          {o.paymentStatus === 'PAID' ? '✓ PAYÉ' : '⚡ NON PAYÉ'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownloadInvoice(o)}
                          className="chrome-gloss px-3 py-1.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-zinc-200 text-slate-200 text-[10px] font-black uppercase rounded-lg transition flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Facture
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionRobotB2B() {
  const [query, setQuery] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [supplierStatuses, setSupplierStatuses] = useState<Record<string, string>>({});
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'DISPONIBLE' | 'SUR_COMMANDE' | 'ARRIVAGE'>('ALL');
  const [fallbackData, setFallbackData] = useState<{ logs: any[]; stats: any; summary: string } | null>(null);
  const [showFallbackLog, setShowFallbackLog] = useState(false);
  const [multiSourceHistory, setMultiSourceHistory] = useState<any[]>([]);
  
  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(d => {
      const sups = d.data || [];
      setSuppliers(sups);
      // Select all by default
      setSelectedSupplierIds(sups.map((s: any) => s.id));
    });

    const pending = localStorage.getItem('robotB2B_pendingRef');
    if (pending) {
      localStorage.removeItem('robotB2B_pendingRef');
      setQuery(pending);
    }
    const handleRef = (e: any) => {
      if (e.detail) setQuery(e.detail);
    };
    window.addEventListener('robotB2B_searchRef' as any, handleRef);
    return () => window.removeEventListener('robotB2B_searchRef' as any, handleRef);
  }, []);

  const b2bSuppliers = suppliers;

  const toggleSupplier = (id: string) => {
    if (selectedSupplierIds.includes(id)) {
      setSelectedSupplierIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedSupplierIds(prev => [...prev, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedSupplierIds.length === b2bSuppliers.length) {
      setSelectedSupplierIds([]);
    } else {
      setSelectedSupplierIds(b2bSuppliers.map(s => s.id));
    }
  };

  const getStatusIcon = (id: string) => {
    const s = supplierStatuses[id];
    if (s === 'loading') return <span className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin inline-block" />;
    if (s === 'found') return <span>✅</span>;
    if (s === 'info') return <span>ℹ️</span>;
    if (s === 'empty') return <span>⚠️</span>;
    if (s === 'error') return <span>❌</span>;
    return null;
  };

  const getItemCategory = (item: any): 'DISPONIBLE' | 'ARRIVAGE' | 'SUR_COMMANDE' => {
    const availStr = (item.availability || '').toLowerCase();
    if (availStr.includes('arrivage')) return 'ARRIVAGE';
    if (item.available || item.rawStock > 0 || availStr.includes('disponible') || availStr.includes('stock')) return 'DISPONIBLE';
    return 'SUR_COMMANDE';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery || selectedSupplierIds.length === 0) return;
    setLoading(true);
    setResult(null);
    setMultiSourceHistory([]);
    
    // Fetch consolidated multi-source history & live Odoo in parallel
    fetch(`/api/historique-prix?reference=${encodeURIComponent(cleanQuery)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setMultiSourceHistory(res.data || []);
                  }
      })
      .catch(() => {});

    const targetSuppliers = b2bSuppliers.filter(s => selectedSupplierIds.includes(s.id));
    const statuses: Record<string, string> = {};
    targetSuppliers.forEach(s => { statuses[s.id] = 'loading'; });
    setSupplierStatuses({ ...statuses });

    const allBreakdown: any[] = [];
    const allItems: any[] = [];

    const pickBest = (itemsList: any[]) => {
      if (!itemsList || itemsList.length === 0) return null;
      const availWithPrice = itemsList.find((i: any) => (i.available || i.rawStock > 0) && ((i.price || 0) > 0 || (i.prixHT || 0) > 0));
      if (availWithPrice) return availWithPrice;
      const withPrice = itemsList.filter((i: any) => (i.price || 0) > 0 || (i.prixHT || 0) > 0)
                                 .sort((a: any, b: any) => (a.price || a.prixHT || 0) - (b.price || b.prixHT || 0));
      if (withPrice.length > 0) return withPrice[0];
      return itemsList[0];
    };

    const syncState = () => {
      const best = pickBest(allItems);
      const bestPrice = best ? (best.price || best.prixHT || 0) : 0;
      setResult({
        success: true,
        isMulti: true,
        data: {
          items: [...allItems],
          suppliersBreakdown: [...allBreakdown],
          price: bestPrice,
          discount: best?.discount || 0,
          available: best ? (best.available || (best.rawStock || 0) > 0) : false,
          stock: best?.rawStock || best?.stock || 0,
          availability: best ? (best.available || (best.rawStock || 0) > 0 ? (best.rawStock ? `${best.rawStock} EN STOCK (${best.supplierName || 'Fournisseur'})` : `DISPONIBLE (${best.supplierName || 'Fournisseur'})`) : `SUR COMMANDE — ${best.supplierName || 'Fournisseur'}`) : 'Non trouvé'
        }
      });
    };

    try {
      const res = await fetch('/api/b2b/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierIds: targetSuppliers.map((s: any) => s.id),
          query: cleanQuery
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        const breakdown = d.suppliersBreakdown || [];

        breakdown.forEach((bd: any) => {
          const supId = bd.supplierId;
          const supItems = bd.items || [];
          if (supItems.length > 0) {
            statuses[supId] = 'found';
          } else if (bd.statusCode === 'ERROR' || bd.statusCode === 'TIMEOUT') {
            statuses[supId] = 'error';
          } else {
            statuses[supId] = 'info';
          }
        });

        // Set missing target suppliers to info
        targetSuppliers.forEach((s: any) => {
          if (!statuses[s.id]) statuses[s.id] = 'info';
        });

        setSupplierStatuses({ ...statuses });

        if (d.fallbackStats?.triggered) {
          setFallbackData({
            logs: d.fallbackLogs || [],
            stats: d.fallbackStats || { triggered: false },
            summary: d.fallbackSummary || ''
          });
          setShowFallbackLog(false);
        } else {
          setFallbackData(null);
        }

        setResult({
          success: true,
          isMulti: true,
          data: d
        });
      } else {
        targetSuppliers.forEach((s: any) => { statuses[s.id] = 'error'; });
        setSupplierStatuses({ ...statuses });
        setResult({
          success: false,
          error: data.error || 'Erreur lors de la recherche multi-fournisseurs'
        });
      }
    } catch (e: any) {
      targetSuppliers.forEach((s: any) => { statuses[s.id] = 'error'; });
      setSupplierStatuses({ ...statuses });
      setResult({
        success: false,
        error: `Erreur réseau: ${e.message || String(e)}`
      });
    }

    setLoading(false);
  };


  const isAllSelected = b2bSuppliers.length > 0 && selectedSupplierIds.length === b2bSuppliers.length;

  const rawItems = result?.data?.items || [];
  const filteredItems = rawItems.filter((item: any) => {
    if (availabilityFilter === 'ALL') return true;
    return getItemCategory(item) === availabilityFilter;
  });

  const countAvailable = rawItems.filter((i: any) => getItemCategory(i) === 'DISPONIBLE').length;
  const countArrivage = rawItems.filter((i: any) => getItemCategory(i) === 'ARRIVAGE').length;
  const countCommande = rawItems.filter((i: any) => getItemCategory(i) === 'SUR_COMMANDE').length;

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
        <Package className="w-5 h-5 text-cyan-400" /> 🤖 ROBOT B2B MULTI-FOURNISSEURS
      </h2>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-5">SÉLECTIONNEZ VOS FOURNISSEURS ET SAISISSEZ UNE RÉFÉRENCE OU MOT-CLÉ</p>

      {/* Step 1 — Multi-supplier Checkboxes */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-200 pb-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
            1. CHOISIR LES FOURNISSEURS À CONSULTER ({selectedSupplierIds.length} / {b2bSuppliers.length} SÉLECTIONNÉS)
          </div>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-zinc-950 text-[10px] font-black uppercase rounded-lg transition"
          >
            {isAllSelected ? '✖ TOUT DÉCOCHER' : '✅ TOUT SÉLECTIONNER'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {b2bSuppliers.map(s => {
            const isChecked = selectedSupplierIds.includes(s.id);
            const statusIcon = getStatusIcon(s.id);
            return (
              <label
                key={s.id}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase border cursor-pointer select-none transition ${
                  isChecked
                    ? 'bg-cyan-950/80 border-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/10'
                    : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-200 hover:text-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSupplier(s.id)}
                  className="rounded border-zinc-200 text-cyan-600 focus:ring-cyan-500 bg-white w-4 h-4"
                />
                {statusIcon && <span className="text-sm">{statusIcon}</span>}
                <span>{s.name.toUpperCase()}</span>
              </label>
            );
          })}

          {b2bSuppliers.length === 0 && (
            <p className="text-zinc-600 text-xs font-bold uppercase">Aucun fournisseur B2B configuré. Renseignez les identifiants dans la fiche fournisseur.</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 mb-4 w-full">
          🌐 Recherche simultanée sur <span className="text-cyan-400 font-black">{selectedSupplierIds.length} fournisseur(s) sélectionné(s)</span> : {
            b2bSuppliers.filter(s => selectedSupplierIds.includes(s.id)).map(s => s.name.toUpperCase()).join(', ') || 'Aucun'
          }
        </div>
      </div>

      {/* Step 2 — Search input */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-5">
        <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-3">2. SAISIR RÉFÉRENCE OU TEXTE ARTICLE</div>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="EXEMPLE: 1611273080, 1306J5, KIT EMBRAYAGE, BOUCHON..."
            required
            className="flex-1 bg-white text-zinc-900 border border-zinc-200 font-black text-base px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-cyan-500 uppercase placeholder:text-slate-300 placeholder:font-normal placeholder:normal-case"
          />
          <button
            type="submit"
            disabled={loading || !query.trim() || selectedSupplierIds.length === 0}
            className="px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-zinc-950 font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> EN COURS...</>
            ) : (
              <><Search className="w-4 h-4" /> LANCER LE ROBOT B2B</>
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {result.success ? (
            <>
              {/* Global summary bar */}
              <div className={`flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border ${result.data.available ? 'bg-green-950/30 border-green-500/30' : 'bg-white border-zinc-200'}`}>
                <div className="flex-1 text-center">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">MEILLEUR PRIX BRUT HT</div>
                  <div className="text-2xl font-black text-zinc-950">{result.data.price > 0 ? `${result.data.price.toFixed(3)} TND` : '—'}</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">REMISE</div>
                  <div className="text-2xl font-black text-cyan-400">{result.data.discount || 0}%</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">DISPONIBILITÉ & SOURCE</div>
                  <div className={`text-lg font-black ${result.data.available ? 'text-green-400' : 'text-amber-400'}`}>
                    {result.data.available ? (result.data.stock ? `${result.data.stock} EN STOCK` : 'DISPONIBLE') : (result.data.availability || 'SUR COMMANDE')}
                  </div>
                </div>
              </div>

              {/* Per-supplier breakdown */}
              {result.data.suppliersBreakdown && (
                <div className="bg-white border border-zinc-200 rounded-2xl p-5">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">
                    RÉSULTATS PAR FOURNISSEUR — "{query.toUpperCase()}"
                  </div>
                  <div className="space-y-2">
                    {result.data.suppliersBreakdown.map((bd: any, idx: number) => {
                      const hasItems = (bd.items || []).length > 0;
                      const bestItem = (bd.items || []).find((i: any) => i.available) || (bd.items || [])[0];
                      return (
                        <div key={idx} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold ${hasItems ? 'bg-green-950/20 border-green-700/40 text-green-300' : bd.statusCode === 'NOT_FOUND' || bd.statusCode === 'NO_STOCK' ? 'bg-amber-950/20 border-amber-800/40 text-amber-200' : 'bg-white border-zinc-200 text-zinc-600'}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-base">{hasItems ? '✅' : bd.statusCode === 'NOT_FOUND' || bd.statusCode === 'NO_STOCK' ? 'ℹ️' : '—'}</span>
                            <span className="font-black uppercase text-zinc-950">{bd.supplierName}</span>
                          </div>
                          <div className="text-right">
                            {hasItems ? (
                              <span className="text-green-400 font-black">
                                {(bd.items || []).length} article(s) trouvé(s)
                                {bestItem?.price > 0 ? ` — ${bestItem.price.toFixed(3)} TND` : ''}
                                {bestItem?.discount > 0 ? ` (-${bestItem.discount}%)` : ''}
                              </span>
                            ) : (
                              <span className="text-zinc-600 text-[11px] font-semibold">{bd.statusReason || bd.availability || 'Référence non trouvée'}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filter bar by Availability status */}
              {rawItems.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-wrap items-center gap-2">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mr-2">
                    FILTRER PAR DISPONIBILITÉ :
                  </div>

                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('ALL')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition border ${
                      availabilityFilter === 'ALL'
                        ? 'bg-cyan-600 border-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-200'
                    }`}
                  >
                    🌐 TOUS ({rawItems.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('DISPONIBLE')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition border ${
                      availabilityFilter === 'DISPONIBLE'
                        ? 'bg-green-700 border-green-500 text-zinc-950 shadow-md shadow-green-500/20'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-green-600/50 hover:text-zinc-950'
                    }`}
                  >
                    🟢 DISPONIBLE EN STOCK ({countAvailable})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('ARRIVAGE')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition border ${
                      availabilityFilter === 'ARRIVAGE'
                        ? 'bg-blue-700 border-blue-500 text-zinc-950 shadow-md shadow-blue-500/20'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-blue-600/50 hover:text-zinc-950'
                    }`}
                  >
                    🔵 EN ARRIVAGE ({countArrivage})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('SUR_COMMANDE')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition border ${
                      availabilityFilter === 'SUR_COMMANDE'
                        ? 'bg-amber-700 border-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                        : 'bg-white border-zinc-200 text-zinc-500 hover:border-amber-600/50 hover:text-zinc-950'
                    }`}
                  >
                    🟡 SUR COMMANDE ({countCommande})
                  </button>
                </div>
              )}

              {/* Fallback Recovery Banner */}
              {fallbackData && fallbackData.stats?.triggered && (
                <div className="bg-orange-950/30 border border-orange-500/40 rounded-2xl p-4 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 text-lg">🔍</span>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-0.5">
                          MOTEUR DE REPLI AUTOMATIQUE — {fallbackData.stats.success ? '✅ RÉCUPÉRATION RÉUSSIE' : '❌ RÉFÉRENCE NON TROUVÉE'}
                        </div>
                        <div className="text-xs text-zinc-400 font-semibold">
                          {fallbackData.stats.totalAttempts} tentatives · {fallbackData.stats.durationMs}ms
                          {fallbackData.stats.success && fallbackData.stats.foundAt?.length > 0 && (
                            <span className="text-green-400 ml-2">→ trouvé chez [{fallbackData.stats.foundAt.join(', ')}] via "{fallbackData.stats.finalRef}"</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFallbackLog(v => !v)}
                      className="text-[10px] font-black uppercase text-orange-400 border border-orange-500/40 px-3 py-1.5 rounded-lg hover:bg-orange-950/40 transition"
                    >
                      {showFallbackLog ? '▲ MASQUER' : '▼ VOIR JOURNAL'}
                    </button>
                  </div>

                  {showFallbackLog && fallbackData.logs.length > 0 && (
                    <div className="mt-3 border-t border-orange-500/20 pt-3 space-y-1.5 max-h-60 overflow-y-auto">
                      {fallbackData.logs.map((log: any, i: number) => (
                        <div key={i} className={`flex items-start gap-2 text-[10px] font-mono px-2 py-1.5 rounded ${
                          log.outcome === 'FOUND'
                            ? 'bg-green-950/40 text-green-300'
                            : log.outcome === 'PARTIAL'
                              ? 'bg-blue-950/40 text-blue-300'
                              : 'bg-zinc-900/60 text-zinc-500'
                        }`}>
                          <span className="shrink-0 font-black w-5 text-center">{log.outcome === 'FOUND' ? '✅' : log.outcome === 'PARTIAL' ? '🔵' : '·'}</span>
                          <span className="shrink-0 uppercase font-black w-28 text-orange-400">[{log.method}]</span>
                          <span className="shrink-0 w-16 text-zinc-400">{log.supplierName}</span>
                          <span className="text-zinc-300">"{log.triedRef}"</span>
                          {log.itemsFound > 0 && <span className="text-green-400 ml-auto shrink-0">{log.itemsFound} art.</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Card Historique Multi-Sources Consolidé (Emails, Sheets, B2B) */}
              {multiSourceHistory.length > 0 && (
                <div className="mb-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 text-base">⚡</span>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                        HISTORIQUE CONSOLIDÉ MULTI-SOURCES ({multiSourceHistory.length} OFFRES ENREGISTRÉES)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                      EMAILS · SHEETS · B2B · DEVIS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
{/* Saved Multi-Source Database Items */}
                    {multiSourceHistory.slice(0, 6).map((h, i) => (
                      <div key={`hist-${i}`} className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              h.source === 'EMAIL' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              h.source === 'GOOGLE_SHEETS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {h.source === 'EMAIL' ? '📧 EMAIL' : h.source === 'GOOGLE_SHEETS' ? '📊 SHEETS' : '📝 HISTORIQUE'}
                            </span>
                            <span className="text-[9px] text-zinc-400 font-mono">{new Date(h.date || h.updatedAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="font-mono font-black text-xs text-zinc-950 uppercase">{h.reference}</div>
                          <div className="text-[10px] text-zinc-600 truncate">{h.designation || h.brand || '-'}</div>
                          <div className="text-[9px] text-zinc-500 font-semibold truncate mt-0.5">{h.supplierName || 'Fournisseur'}</div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-zinc-100 flex justify-between items-end">
                          <span className="text-[9px] text-zinc-500 uppercase">Dernier Prix</span>
                          <span className="font-mono font-black text-zinc-900 text-xs">
                            {h.purchasePrice ? `${h.purchasePrice.toFixed(3)} TND` : h.sellingPrice ? `${h.sellingPrice.toFixed(3)} TND` : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Articles grid */}
              {filteredItems.length > 0 ? (
                <div>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                    TABLEAU COMPARATIF DES OFFRES FOURNISSEURS ({filteredItems.length} / {rawItems.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredItems.map((item: any, idx: number) => {
                      const cat = getItemCategory(item);
                      let badgeStyle = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                      let badgeText = 'SUR COMMANDE';

                      if (cat === 'DISPONIBLE') {
                        badgeStyle = 'bg-green-500/20 text-green-400 border-green-500/30';
                        badgeText = item.rawStock > 0 ? `EN STOCK: ${item.rawStock}` : 'DISPONIBLE EN STOCK';
                      } else if (cat === 'ARRIVAGE') {
                        badgeStyle = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                        badgeText = 'EN ARRIVAGE';
                      }

                      const isEquiv = item.matchType === 'EQUIVALENCE';
                      const priceHT = parseFloat(item.price || item.prixHT || 0) || 0;
                      const discountPct = parseFloat(item.discount || 0) || 0;
                      const netPriceHT = priceHT > 0 ? priceHT * (1 - discountPct / 100) : 0;
                      const itemRef = item.reference || item.name || '—';
                      const itemDesig = item.designation || item.description || `Article ${itemRef}`;

                      return (
                        <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between transition-all shadow-sm ${cat === 'DISPONIBLE' ? 'bg-white border-green-500/50 ring-1 ring-green-500/20' : cat === 'ARRIVAGE' ? 'bg-blue-50/50 border-blue-300' : 'bg-white border-zinc-200'}`}>
                          <div>
                            <div className="flex flex-wrap justify-between items-center gap-1.5 mb-2.5">
                              <span className="text-xs font-black text-cyan-800 uppercase bg-cyan-100/70 border border-cyan-300 px-2.5 py-1 rounded-lg">
                                🏢 {item.supplierName || item.fournisseur || 'FOURNISSEUR B2B'}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase ${isEquiv ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                                  {isEquiv ? '🔄 ÉQUIVALENCE' : '🎯 DIRECTE'}
                                </span>
                                <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${badgeStyle}`}>
                                  {badgeText}
                                </span>
                              </div>
                            </div>
                            <div className="font-black text-zinc-950 text-sm sm:text-base mb-1">
                              {item.brand ? `MARQUE : ${item.brand.toUpperCase()}` : 'MARQUE : ADAPTABLE'}
                            </div>
                            {itemDesig && (
                              <div className="text-xs text-zinc-700 font-semibold mb-1.5 line-clamp-2">
                                {itemDesig}
                              </div>
                            )}
                            <div className="text-xs text-zinc-900 font-mono mb-3 flex items-center gap-1">
                              <span className="text-zinc-500 font-normal">REF :</span>
                              <span className="font-black text-zinc-950 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-xs">{itemRef}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                            <span className="text-xs font-bold text-zinc-600">
                              REMISE : <span className="text-cyan-700 font-black">{discountPct > 0 ? `${discountPct}%` : '0%'}</span>
                            </span>
                            <div className="text-right">
                              <div className="font-black text-lg text-emerald-700">
                                {priceHT > 0 ? `${priceHT.toFixed(3)} TND HT` : 'PRIX SUR DEMANDE'}
                              </div>
                              {discountPct > 0 && netPriceHT > 0 && (
                                <div className="text-[10px] text-zinc-500 font-bold">
                                  Net : {netPriceHT.toFixed(3)} TND HT
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : rawItems.length > 0 ? (
                <div className="p-4 bg-white/40 rounded-xl text-center text-zinc-500 font-bold text-xs uppercase">
                  Aucun article ne correspond au filtre sélectionné ({availabilityFilter}).
                </div>
              ) : (
                <div className="p-4 bg-white/40 rounded-xl text-center text-zinc-500 font-bold text-xs uppercase">
                  Aucune offre directe trouvée chez les fournisseurs B2B pour cette référence.
                </div>
              )}
            </>
          ) : (
            <div className="p-5 bg-red-950/30 border border-red-500/30 rounded-2xl text-red-400 font-bold uppercase text-sm">
              ❌ {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SECTION: PARTS CATALOGUE / DÉCODEUR VIN ─────────────────────────────────
interface SectionPartsCatalogueProps {
  onTransferToRobot?: (ref: string) => void;
}

function SectionPartsCatalogue({ onTransferToRobot }: SectionPartsCatalogueProps) {
  const [vinInput, setVinInput] = useState('VF36D9HZC9L013574');
  const [savedVins, setSavedVins] = useState<Array<{ vin: string; name: string; date: string }>>([
    { vin: 'VF36D9HZC9L013574', name: 'PEUGEOT 407 1.6 HDi (DAM 11873CJ)', date: 'Aujourd\'hui' },
    { vin: 'WDD2040451A342772', name: 'MERCEDES-BENZ CLASSE C (W204) C 220 CDI', date: 'Hier' }
  ]);
  const [oeRefInput, setOeRefInput] = useState('');
  const [partFilterText, setPartFilterText] = useState('');
  const [searchMode, setSearchMode] = useState<'TEXT' | 'REF'>('TEXT');
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');
  const [activeCatalogSource, setActiveCatalogSource] = useState<'SCHEMATIC' | 'PARTSNUMBER' | 'PARTSLINK24' | 'PARTSOUQ'>('SCHEMATIC');
  const [loadingHeadless, setLoadingHeadless] = useState(false);
  const [catalogData, setCatalogData] = useState<any>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [basket, setBasket] = useState<Array<{ ref: string; designation: string; category: string }>>([
    { ref: '7401AX', designation: 'PARE-CHOCS AVANT PEUGEOT 407 (À PEINDRE)', category: 'Carrosserie avant' },
    { ref: '6208E6', designation: 'PHARE / OPTIQUE AVANT GAUCHE PEUGEOT 407', category: 'Carrosserie avant' },
    { ref: '424917', designation: 'JEU DE DISQUES DE FREIN AVANT PEUGEOT 407', category: 'Climatiseur/Chauffage' }
  ]);
  const [enrichingRef, setEnrichingRef] = useState<string | null>(null);
  const [enrichStatusMsg, setEnrichStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Enrich single item into internal product database catalog
  const handleEnrichInternalCatalog = async (item: { ref: string; designation: string; category?: string; brand?: string }) => {
    setEnrichingRef(item.ref);
    setEnrichStatusMsg(null);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: item.ref,
          sku: item.ref,
          name: item.designation,
          brand: item.brand || catalogData?.brand || 'OE',
          vehicleCompat: `${catalogData?.brand || ''} ${catalogData?.model || ''} (VIN: ${vinInput})`,
          description: `Référence extraite du schéma d'origine pour ${catalogData?.brand || ''} ${catalogData?.model || ''}. Catégorie: ${item.category || 'Général'}.`,
          status: 'ACTIVE'
        })
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setEnrichStatusMsg({ text: `✅ Référence ${item.ref} ("${item.designation}") ajoutée avec succès au catalogue interne !` });
      } else {
        setEnrichStatusMsg({ text: `⚠️ ${data.error || 'Erreur lors de l\'enregistrement'}`, isError: true });
      }
    } catch (e: any) {
      setEnrichStatusMsg({ text: `❌ Erreur d'enrichissement: ${e.message}`, isError: true });
    } finally {
      setEnrichingRef(null);
    }
  };

  // Enrich all items in the basket into internal catalog
  const handleEnrichEntireBasket = async () => {
    if (basket.length === 0) return;
    setLoadingHeadless(true);
    setEnrichStatusMsg(null);
    let count = 0;
    for (const item of basket) {
      try {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: item.ref,
            sku: item.ref,
            name: item.designation,
            brand: catalogData?.brand || 'OE',
            vehicleCompat: `${catalogData?.brand || ''} ${catalogData?.model || ''} (VIN: ${vinInput})`,
            description: `Enrichi depuis consultation VIN ${vinInput} (${item.category})`,
            status: 'ACTIVE'
          })
        });
        count++;
      } catch (e) {}
    }
    setLoadingHeadless(false);
    setEnrichStatusMsg({ text: `🎉 ${count} article(s) du panier ont été enregistrés avec succès dans votre catalogue interne !` });
  };

  // Load saved VINs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('autop_saved_vins');
      if (stored) setSavedVins(JSON.parse(stored));
    } catch (e) {}
    handleLoadHeadlessCatalog(vinInput);
  }, []);

  const saveVinToHistory = (vin: string, name: string) => {
    setSavedVins(prev => {
      if (prev.some(v => v.vin === vin)) return prev;
      const updated = [{ vin, name, date: new Date().toLocaleDateString('fr-FR') }, ...prev].slice(0, 10);
      try { localStorage.setItem('autop_saved_vins', JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
  };

  // Backend Extraction & Catalog Resolution
  const handleLoadHeadlessCatalog = async (targetVin: string) => {
    setLoadingHeadless(true);
    const cleanVin = targetVin.trim().toUpperCase();

    try {
      const res = await fetch('/api/catalog/headless-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: cleanVin })
      });
      const data = await res.json();

      if (data.success) {
        setCatalogData(data);
        saveVinToHistory(cleanVin, `${data.brand} ${data.model}`);

        // ═══ AUTO-ROUTING INTELLIGENT ═══
        // 1. Toujours basculer vers la vue SCHEMATIC avec les pièces
        setActiveCatalogSource('SCHEMATIC');
        // 2. Remettre sur la première section (Carrosserie avant)
        setSelectedSectionIndex(0);
        // 3. Réinitialiser les filtres pour voir toutes les pièces
        setSelectedCategory('TOUS');
        setPartFilterText('');
      }
    } catch (err: any) {
      console.error("Erreur de chargement du catalogue natif:", err);
    } finally {
      setLoadingHeadless(false);
    }
  };

  const handleSelectVin = (vinStr: string) => {
    setVinInput(vinStr);
    handleLoadHeadlessCatalog(vinStr);
  };

  const handleAddToBasket = (item: { ref: string; designation: string; category: string }) => {
    if (!basket.some(b => b.ref === item.ref)) {
      setBasket(prev => [...prev, item]);
    }
  };

  const handleRemoveFromBasket = (ref: string) => {
    setBasket(prev => prev.filter(b => b.ref !== ref));
  };

  const handleAddManualRefToBasket = () => {
    if (!oeRefInput.trim()) return;
    const ref = oeRefInput.trim().toUpperCase();
    if (!basket.some(b => b.ref === ref)) {
      setBasket(prev => [...prev, { ref, designation: 'RÉFÉRENCE OE CARROSSERIE / MÉCANIQUE', category: 'SAISIE' }]);
    }
    setOeRefInput('');
  };

  const handleLaunchBasketSearch = () => {
    if (basket.length === 0) return;
    const queryStr = basket.map(b => b.ref).join(' ');
    if (onTransferToRobot) {
      onTransferToRobot(queryStr);
    }
  };

  const currentSection = catalogData?.nativeSchematics?.[selectedSectionIndex] || catalogData?.nativeSchematics?.[0];
  const currentOeItems = currentSection?.oeItems || [];

  // Dual Search (Designation vs Reference Number) + Hierarchical Tree Filtering
  const displayedOeItems = useMemo(() => {
    let baseItems = currentOeItems;
    if (selectedCategory !== 'TOUS') {
      const categoryMatches = (catalogData?.nativeSchematics || [])
        .filter((sec: any) => sec.category === selectedCategory || sec.group === selectedCategory)
        .flatMap((sec: any) => sec.oeItems || []);
      if (categoryMatches.length > 0) baseItems = categoryMatches;
    }

    if (!partFilterText.trim()) return baseItems;
    const q = partFilterText.trim().toLowerCase();

    if (searchMode === 'REF') {
      // 1. Direct Reference Number Search Mode
      const refMatches = baseItems.filter((item: any) =>
        (item.ref || '').toLowerCase().includes(q) ||
        (item.equivalents || []).some((eq: any) => (eq.reference || '').toLowerCase().includes(q))
      );
      if (refMatches.length > 0) return refMatches;
    } else {
      // 2. Text / Designation Search Mode
      const textMatches = baseItems.filter((item: any) =>
        (item.designation || '').toLowerCase().includes(q) ||
        (item.group || '').toLowerCase().includes(q) ||
        (item.equivalents || []).some((eq: any) =>
          (eq.designation || '').toLowerCase().includes(q) ||
          (eq.brand || '').toLowerCase().includes(q)
        )
      );
      if (textMatches.length > 0) return textMatches;
    }

    // Search across entire vehicle catalog hierarchy
    const inAllSections: any[] = [];
    (catalogData?.nativeSchematics || []).forEach((sec: any) => {
      (sec.oeItems || []).forEach((item: any) => {
        const match = searchMode === 'REF'
          ? (item.ref || '').toLowerCase().includes(q) || (item.equivalents || []).some((e: any) => (e.reference || '').toLowerCase().includes(q))
          : (item.designation || '').toLowerCase().includes(q) || (item.group || '').toLowerCase().includes(q);
        if (match && !inAllSections.some(i => i.ref === item.ref)) {
          inAllSections.push(item);
        }
      });
    });

    if (inAllSections.length > 0) return inAllSections;

    // Fallback to central equivalents dictionary
    const dictMatches = searchDictionaryAndEquivalents(partFilterText);
    return dictMatches.map((dm: any, idx: number) => ({
      pos: idx + 1,
      ref: dm.oeReference,
      designation: dm.designation,
      group: dm.category,
      equivalents: dm.equivalents
    }));
  }, [currentOeItems, partFilterText, searchMode, selectedCategory, catalogData]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-cyan-400" /> 🚗 CONNECTEUR CATALOGUE VIN & ACCÈS DIRECTS PLATEFORMES B2B / CATALOGUES
        </h2>
        <p className="text-zinc-500 text-xs uppercase tracking-wider">
          AUTHENTIFICATION SILENCIEUSE BACKEND, ACCÈS DIRECTS AUX PORTAILS ET CROISEMENT MULTICRITÈRES ÉQUIVALENTS
        </p>
      </div>

      {/* PANNEAU D'ACCÈS DIRECTS AUX PLATEFORMES EXTERNES & COMPTES ENREGISTRÉS */}
      <div className="bg-white border border-indigo-500/40 rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
          <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            🔗 ACCÈS DIRECTS 1-CLIC VERS NOS PLATEFORMES EXTERNES & COMPTES B2B :
          </span>
          <span className="text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-0.5 rounded-full">
            16 PORTAILS CONFIGURÉS
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { name: 'PARTSNUMBER', code: 'autopacc1', url: 'https://login.partsnumber.com', color: 'border-blue-500/40 text-blue-400' },
            { name: 'PARTSLINK24', code: 'fr-247756', url: 'https://www.partslink24.com', color: 'border-cyan-500/40 text-cyan-400' },
            { name: 'PARTSOUQ', code: 'ACCÈS DIRECT', url: 'https://partsouq.com', color: 'border-amber-500/40 text-amber-400' },
            { name: 'STEQ B2B', code: 'CL0016035', url: 'https://b2bsteq.com', color: 'border-emerald-500/40 text-emerald-400' },
            { name: 'FAD PRO B2B', code: 'CL0016035', url: 'https://pb.fadpro.tn', color: 'border-red-500/40 text-red-400' },
            { name: 'MOSAIQUE AUTO', code: 'CL0016035', url: 'https://uag.mosaique-auto.com', color: 'border-purple-500/40 text-purple-400' },
            { name: 'CDG GROS', code: 'CL0016035', url: 'http://cdgros.com', color: 'border-indigo-500/40 text-indigo-400' },
            { name: 'SAGAP B2B', code: 'contact@autop.tn', url: 'https://b2b.sagap.tn', color: 'border-cyan-500/40 text-cyan-300' },
            { name: 'GPG B2B', code: 'contact@autop.tn', url: 'https://gpgb2b.tn', color: 'border-green-500/40 text-green-400' },
            { name: 'ITALCAR', code: 'AUTOP', url: 'http://41.224.59.218:8081', color: 'border-rose-500/40 text-rose-400' },
            { name: 'PROPARTS', code: 'AUTOP', url: 'http://41.226.37.212:8090', color: 'border-amber-500/40 text-amber-300' },
            { name: 'SOCOFA GROS', code: 'contact@autop.tn', url: 'https://espacepro.socofagros.com', color: 'border-teal-500/40 text-teal-400' },
            { name: 'AFRICA (AAP)', code: 'AUTOP', url: 'https://aap.tn', color: 'border-blue-500/40 text-blue-300' },
            { name: 'ALPHA FORD', code: 'AUTOP', url: 'https://commandes.alphafordpro.tn', color: 'border-sky-500/40 text-sky-400' },
            { name: 'SOPIC B2B', code: 'AUTOP', url: 'https://sopiq.tn', color: 'border-violet-500/40 text-violet-400' },
            { name: 'CAR GROS', code: 'AUTOP', url: 'https://eyeconnect.ennakl.com:4200', color: 'border-fuchsia-500/40 text-fuchsia-400' }
          ].map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Ouvrir ${item.name} (${item.code})`}
              className={`p-2 bg-white rounded-xl border ${item.color} hover:bg-zinc-50 transition flex flex-col justify-between shadow-md text-left group`}
            >
              <span className="text-[10px] font-black uppercase truncate group-hover:underline">{item.name}</span>
              <span className="text-[8px] font-mono font-bold text-zinc-500 truncate">🔑 {item.code}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white border-2 border-cyan-500/60 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-800">
            🔍 SAISIE VIN — IDENTIFICATION AUTOMATIQUE & OUVERTURE DIRECTE DU CATALOGUE
          </span>
          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
            ⚡ ROUTAGE INTELLIGENT 30+ MARQUES
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={vinInput}
            onChange={e => setVinInput(e.target.value.toUpperCase())}
            onKeyDown={e => {
              if (e.key === 'Enter' && vinInput.trim() && !loadingHeadless) {
                handleLoadHeadlessCatalog(vinInput.trim());
              }
            }}
            placeholder="SAISIR CODE VIN (ex: WAUZZZ8V..., JS2YC...) — APPUYER ENTRÉE OU CLIQUER IDENTIFIER"
            className="flex-1 bg-white text-zinc-950 border-2 border-zinc-300 font-black text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 uppercase placeholder:text-zinc-400 placeholder:font-normal placeholder:normal-case transition-colors"
          />
          <button
            type="button"
            disabled={loadingHeadless}
            onClick={() => {
              if (vinInput.trim()) {
                handleLoadHeadlessCatalog(vinInput.trim());
              }
            }}
            className="px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 py-3 shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed min-w-[230px]"
          >
            {loadingHeadless ? (
              <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />IDENTIFICATION...</span>
            ) : (
              <>
                <Search className="w-4 h-4" /> 🚗 IDENTIFIER & OUVRIR CATALOGUE
              </>
            )}
          </button>
        </div>
        {/* Auto-routing animated progress */}
        {loadingHeadless && (
          <div className="flex items-center gap-3 p-3 bg-cyan-50 border border-cyan-300 rounded-xl">
            <div className="flex gap-1 flex-shrink-0">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[10px] font-black text-cyan-800 uppercase tracking-widest">
              🔄 Analyse VIN → Identification marque/modèle → Sélection catalogue → Chargement pièces...
            </span>
          </div>
        )}

        {/* Toast / Notification Banner for Catalog Enrichment */}
        {enrichStatusMsg && (
          <div className={`p-4 rounded-xl text-xs font-black uppercase flex items-center justify-between shadow-lg border ${
            enrichStatusMsg.isError
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-300'
              : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
          }`}>
            <span>{enrichStatusMsg.text}</span>
            <button
              onClick={() => setEnrichStatusMsg(null)}
              className="text-zinc-400 hover:text-white font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Saved VINs History Pills */}
        {savedVins.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest block">
              📋 VINS ENREGISTRÉS ET CONSULTABLES NATIVEMENT :
            </span>
            <div className="flex flex-wrap gap-2">
              {savedVins.map((v) => (
                <button
                  key={v.vin}
                  onClick={() => handleSelectVin(v.vin)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 border ${
                    vinInput.toUpperCase() === v.vin.toUpperCase()
                      ? 'bg-cyan-600 border-cyan-600 text-white shadow-md'
                      : 'bg-white border-zinc-300 text-zinc-800 hover:border-cyan-400 hover:bg-cyan-50'
                  }`}
                >
                  <span className="font-mono text-cyan-700 font-black">{v.vin}</span>
                  <span className="text-[10px] text-zinc-600 font-semibold">({v.name})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Identified Vehicle Badge */}
        {catalogData && (
          <div className="bg-white p-5 rounded-2xl border-2 border-cyan-500 mb-4 w-full shadow-lg">
            <div className="flex items-start gap-4">
              <span className="text-4xl">🚘</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-400 px-2 py-0.5 rounded uppercase tracking-widest">✅ VÉHICULE IDENTIFIÉ</span>
                  <span className="text-[9px] font-black bg-cyan-600 text-white px-2.5 py-0.5 rounded-full">{catalogData.brand}</span>
                  {catalogData.year && <span className="text-[9px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded">{catalogData.year}</span>}
                </div>
                <h3 className="text-lg font-black text-zinc-950 uppercase tracking-wide">{catalogData.model}</h3>
                <p className="text-[11px] text-zinc-700 font-bold mt-1">
                  VIN : <span className="font-mono text-cyan-700 font-black">{catalogData.vin}</span>
                </p>
                <p className="text-[10px] text-zinc-600 font-semibold mt-0.5">
                  🔗 Source : <span className="text-emerald-700 font-black">{catalogData.sourceCatalog}</span>
                </p>
                {catalogData.engine && (
                  <p className="text-[10px] text-zinc-600 font-semibold">
                    ⚙️ Moteur : <span className="font-black text-zinc-950">{catalogData.engine}</span>
                  </p>
                )}
                {catalogData.warning && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-400 rounded-lg text-[10px] text-amber-800 font-bold">
                    ⚠️ {catalogData.warning}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODES D'AFFICHAGE DU CATALOGUE (NATIVE EXTRACTION OU NAVIGATEUR EN DIRECT) */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveCatalogSource('SCHEMATIC')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition border flex items-center gap-2 ${
            activeCatalogSource === 'SCHEMATIC'
              ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-lg'
              : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-950'
          }`}
        >
          <span>🖼️ SCHÉMA & EXTRACTION NATIF</span>
        </button>

        <button
          onClick={() => setActiveCatalogSource('PARTSNUMBER')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition border flex items-center gap-2 ${
            activeCatalogSource === 'PARTSNUMBER'
              ? 'bg-blue-950 border-blue-500 text-blue-300 shadow-lg'
              : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-950'
          }`}
        >
          <span>🚗 PARTSNUMBER LIVE (autopacc1)</span>
        </button>

        <button
          onClick={() => setActiveCatalogSource('PARTSLINK24')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition border flex items-center gap-2 ${
            activeCatalogSource === 'PARTSLINK24'
              ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-lg'
              : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-950'
          }`}
        >
          <span>🔍 PARTSLINK24 LIVE (fr-247756)</span>
        </button>

        <button
          onClick={() => setActiveCatalogSource('PARTSOUQ')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition border flex items-center gap-2 ${
            activeCatalogSource === 'PARTSOUQ'
              ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-lg'
              : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-950'
          }`}
        >
          <span>🖼️ PARTSOUQ LIVE ({vinInput || 'VIN'})</span>
        </button>
      </div>

      {/* Rule 4 & 5: Native Schematics Image View (Balise <img>) & Part References Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Native Image Viewer or Live Web Catalog Frame */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl space-y-4">
          
          {activeCatalogSource === 'PARTSNUMBER' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-950/60 border border-blue-500/40 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-blue-300">🚗 PORTAIL EN DIRECT PARTSNUMBER — COMPTE: <span className="font-mono text-zinc-950">autopacc1 / autopacc2</span></span>
                <a href="https://login.partsnumber.com" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-zinc-950 font-black rounded-lg transition text-[10px]">
                  OUVRIR EN PLEIN ÉCRAN ↗
                </a>
              </div>
              <iframe src="https://login.partsnumber.com" className="w-full h-[520px] rounded-xl border border-zinc-200 bg-white" title="PartsNumber Catalogue Live" />
            </div>
          )}

          {activeCatalogSource === 'PARTSLINK24' && (
            <div className="space-y-3">
              <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-cyan-300">🔍 PORTAIL EN DIRECT PARTSLINK24 — COMPTE: <span className="font-mono text-zinc-950">fr-247756</span></span>
                <a href="https://www.partslink24.com" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black rounded-lg transition text-[10px]">
                  OUVRIR EN PLEIN ÉCRAN ↗
                </a>
              </div>
              <iframe src="https://www.partslink24.com" className="w-full h-[520px] rounded-xl border border-zinc-200 bg-white" title="PartsLink24 Catalogue Live" />
            </div>
          )}

          {activeCatalogSource === 'PARTSOUQ' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-amber-300">🖼️ RECHERCHE EN DIRECT PARTSOUQ VIN : <span className="font-mono text-zinc-950">{vinInput}</span></span>
                <a href={`https://partsouq.com/en/search/all?q=${encodeURIComponent(vinInput)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-black rounded-lg transition text-[10px]">
                  OUVRIR EN PLEIN ÉCRAN ↗
                </a>
              </div>
              <iframe src={`https://partsouq.com/en/search/all?q=${encodeURIComponent(vinInput)}`} className="w-full h-[520px] rounded-xl border border-zinc-200 bg-white" title="PartSouq Live Search" />
            </div>
          )}

          {activeCatalogSource === 'SCHEMATIC' && (
            <>
              {/* Section Selection Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
                {(catalogData?.nativeSchematics || []).map((sec: any, idx: number) => (
                  <button
                    key={sec.sectionId || idx}
                    onClick={() => setSelectedSectionIndex(idx)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition flex items-center gap-2 border ${
                      selectedSectionIndex === idx
                        ? 'bg-cyan-600 border-cyan-600 text-white shadow-lg'
                        : 'bg-white border-zinc-300 text-zinc-800 hover:border-cyan-400 hover:text-cyan-700 hover:bg-cyan-50'
                    }`}
                  >
                    <span>📁 {sec.title}</span>
                  </button>
                ))}
              </div>

              {/* Native Interactive Vector Schematics Viewer (Web & Electron Compatible) */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 mb-4 w-full">
                <div className="w-full flex justify-between items-center text-[10px] font-black text-cyan-400 uppercase tracking-widest border-b border-slate-900 pb-2">
                  <span>🖼️ SCHÉMA ÉCLATÉ INTERACTIF : {currentSection?.title}</span>
                  <span className="text-emerald-400 font-bold">⚡ RENDU DASHBOARD VELECTRON / WEB 100% ACTIF</span>
                </div>

                {/* Native Canvas with Interactive Hotspot Pins & Car Vector Schematic */}
                <div className="w-full h-[400px] bg-white/90 rounded-xl border border-zinc-200 relative overflow-hidden shadow-inner flex flex-col items-center justify-center p-4">
                  <svg className="w-full h-full max-h-[340px]" viewBox="0 0 800 450" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Background Grid Lines */}
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    </pattern>
                    <rect width="800" height="450" fill="url(#grid)" />

                    {/* Vector Car Technical Silhouette */}
                    <g stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" fill="rgba(15, 23, 42, 0.6)">
                      {/* Chassis Body */}
                      <path d="M 100,280 L 140,280 C 150,230 200,220 220,280 L 580,280 C 600,220 650,230 660,280 L 720,280 C 735,280 740,270 740,250 C 740,220 720,180 660,160 L 520,130 C 450,90 320,90 260,130 L 160,160 C 120,175 100,210 100,250 Z" />
                      {/* Windows */}
                      <path d="M 270,135 L 350,105 L 500,105 L 530,135 Z" fill="rgba(56, 189, 248, 0.1)" stroke="#818cf8" strokeWidth="1.5" />
                      {/* Wheels */}
                      <circle cx="185" cy="280" r="45" fill="#0f172a" stroke="#38bdf8" strokeWidth="4" />
                      <circle cx="185" cy="280" r="20" fill="none" stroke="#818cf8" strokeWidth="2" />
                      <circle cx="620" cy="280" r="45" fill="#0f172a" stroke="#38bdf8" strokeWidth="4" />
                      <circle cx="620" cy="280" r="20" fill="none" stroke="#818cf8" strokeWidth="2" />
                      {/* Front Bumper & Headlight Markers */}
                      <path d="M 100,230 L 140,230" stroke="#f59e0b" strokeWidth="3" />
                      <path d="M 700,230 L 740,230" stroke="#ef4444" strokeWidth="3" />
                    </g>

                    {/* Section Specific Technical Lines */}
                    <text x="400" y="40" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="900" letterSpacing="2">
                      VÉHICULE : {catalogData?.brand || 'AUTOP'} {catalogData?.model || ''} (VIN: {vinInput})
                    </text>
                    <text x="400" y="60" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="700">
                      CLIQUEZ SUR UN REPÈRE POUR AFFICHER LA PIÈCE OE ET SES ÉQUIVALENTS
                    </text>
                  </svg>

                  {/* Interactive Glowing Hotspot Markers Overlaid Dynamically */}
                  <div className="absolute inset-0 p-8 flex flex-wrap items-center justify-around pointer-events-none">
                    {(displayedOeItems || []).map((item: any, idx: number) => {
                      const inBasket = basket.some(b => b.ref === item.ref);
                      return (
                        <button
                          key={item.pos || idx}
                          type="button"
                          onClick={() => inBasket ? handleRemoveFromBasket(item.ref) : handleAddToBasket({ ref: item.ref, designation: item.designation, category: item.group })}
                          className={`pointer-events-auto transition-all transform hover:scale-125 px-2.5 py-1 rounded-full text-xs font-mono font-black border flex items-center gap-1 shadow-2xl ${
                            inBasket
                              ? 'bg-emerald-500 text-zinc-950 border-white animate-bounce ring-4 ring-emerald-500/40'
                              : 'bg-cyan-950 text-cyan-300 border-cyan-500 hover:bg-cyan-600 hover:text-zinc-950 ring-2 ring-cyan-500/30'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          #{item.pos} ({item.ref})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Hotspot Buttons bar */}
                <div className="w-full flex flex-wrap justify-center gap-2 pt-2 border-t border-zinc-200">
                  {(displayedOeItems || []).map((item: any) => {
                    const inBasket = basket.some(b => b.ref === item.ref);
                    return (
                      <button
                        key={item.pos}
                        type="button"
                        onClick={() => inBasket ? handleRemoveFromBasket(item.ref) : handleAddToBasket({ ref: item.ref, designation: item.designation, category: item.group })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black border transition flex items-center gap-1.5 ${
                          inBasket
                            ? 'bg-emerald-600 text-zinc-950 border-emerald-500 shadow-md'
                            : 'bg-white text-cyan-300 border-cyan-800 hover:border-cyan-400'
                        }`}
                      >
                        <span>Repère #{item.pos}</span>
                        <span className="text-[9px] font-sans font-bold">({item.ref})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Right Col: Parts Table & Filter Input */}
        <div className="space-y-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <span className="text-xs font-black text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-600" /> 2. RECHERCHER UNE PIÈCE
              </span>
              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-400 px-2 py-0.5 rounded">
                {displayedOeItems.length} RÉSULTAT(S)
              </span>
            </div>

            {/* Dual Search Option Selector (Designation vs Reference Number) */}
            <div className="flex gap-2 p-1 bg-white rounded-xl border border-zinc-200">
              <button
                type="button"
                onClick={() => setSearchMode('TEXT')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition ${
                  searchMode === 'TEXT'
                    ? 'bg-cyan-600 text-zinc-950 shadow-md'
                    : 'text-zinc-500 hover:text-zinc-950'
                }`}
              >
                📝 PAR DÉSIGNATION / TEXTE
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('REF')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition ${
                  searchMode === 'REF'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-zinc-500 hover:text-zinc-950'
                }`}
              >
                🔢 PAR N° DE RÉFÉRENCE (OE)
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'TOUS',
                'Carrosserie & Éclairage',
                'Moteur & Distribution',
                'Transmission & Embrayage',
                'Freinage & ABS',
                'Châssis & Suspension',
                'Refroidissement & Clim',
                'Électricité & Calculateurs'
              ].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition border ${
                    selectedCategory === cat
                      ? 'bg-cyan-600 border-cyan-600 text-white'
                      : 'bg-white border-zinc-300 text-zinc-700 hover:border-cyan-400 hover:text-cyan-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dual Mode Filter Input */}
            <div className="relative">
              <input
                type="text"
                value={partFilterText}
                onChange={e => setPartFilterText(e.target.value)}
                placeholder={
                  searchMode === 'TEXT'
                    ? "RECHERCHE PAR DÉSIGNATION (ex: Embrayage 308, Pare-chocs, Phare, Filtre...)"
                    : "RECHERCHE PAR RÉFÉRENCE (ex: 7401AX, A2048800124, 424917...)"
                }
                className="w-full bg-white text-zinc-950 font-black border border-zinc-300 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-cyan-500 uppercase transition-colors placeholder:text-zinc-400 placeholder:normal-case placeholder:font-normal"
              />
              {partFilterText && (
                <button
                  type="button"
                  onClick={() => setPartFilterText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-950 font-bold text-xs bg-zinc-50 px-2 py-0.5 rounded-full"
                >
                  ✕ Effacer
                </button>
              )}
            </div>
          </div>

          {/* Native Parts References Table */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {displayedOeItems.map((item: any) => {
              const inBasket = basket.some(b => b.ref === item.ref);
              const equivalents = item.equivalents || [];
              const criticalValidation = validateCriticalPartCompatibility(
                { reference: item.ref, designation: item.designation, category: item.group },
                { brand: catalogData?.brand, model: catalogData?.model, vin: vinInput }
              );

              return (
                <div
                  key={item.ref}
                  className={`p-4 rounded-xl border transition flex flex-col gap-3 ${
                    inBasket
                      ? 'bg-emerald-950/40 border-emerald-500/60'
                      : 'bg-white border-zinc-200 hover:border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono font-black text-xs flex items-center justify-center">
                        #{item.pos}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-cyan-700 font-black text-xs">OE: #{item.ref}</span>
                          <span className="text-[9px] font-black bg-zinc-100 text-zinc-800 border border-zinc-300 px-2 py-0.5 rounded">{item.group}</span>
                          {equivalents.length > 0 && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-400 px-2 py-0.5 rounded">
                              ⚡ {equivalents.length} ÉQUIVALENT(S)
                            </span>
                          )}
                        </div>
                        <h4 className="text-zinc-950 font-black text-xs uppercase mt-0.5 tracking-wide">{item.designation}</h4>
                        {/* Critical Part Verification Badge */}
                        {criticalValidation.status === 'VERIFIED' && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/90 border border-emerald-800 px-2 py-0.5 rounded-full">
                              {criticalValidation.message}
                            </span>
                            {criticalValidation.criticalSpecs && Object.entries(criticalValidation.criticalSpecs).map(([key, val]) => (
                              <span key={key} className="text-[9px] font-mono text-slate-300 bg-white border border-zinc-200 px-2 py-0.5 rounded">
                                {key}: <strong className="text-cyan-300">{val}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={enrichingRef === item.ref}
                        onClick={() => handleEnrichInternalCatalog({ ref: item.ref, designation: item.designation, category: item.group })}
                        title="Ajouter directement cette référence à mon catalogue interne"
                        className="px-2.5 py-1.5 bg-cyan-950 hover:bg-cyan-700 text-cyan-300 hover:text-white text-[10px] font-black uppercase rounded-lg border border-cyan-500/40 transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-cyan-400" /> 📥 ENRICHIR CATALOGUE
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onTransferToRobot) onTransferToRobot(item.ref);
                        }}
                        title="Chercher chez tous les fournisseurs B2B"
                        className="px-2.5 py-1.5 bg-indigo-900/60 hover:bg-indigo-600 text-indigo-200 hover:text-zinc-950 text-[10px] font-black uppercase rounded-lg border border-indigo-500/30 transition flex items-center gap-1"
                      >
                        <Search className="w-3 h-3" /> ROBOT B2B
                      </button>

                      <button
                        type="button"
                        onClick={() => inBasket ? handleRemoveFromBasket(item.ref) : handleAddToBasket({ ref: item.ref, designation: item.designation, category: item.group })}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition flex items-center gap-1.5 flex-shrink-0 ${
                          inBasket
                            ? 'bg-emerald-600 text-zinc-950 hover:bg-emerald-700'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700'
                        }`}
                      >
                        {inBasket ? '✓ AJOUTÉ' : '🛒 + PANIER'}
                      </button>
                    </div>
                  </div>

                  {/* Render Equivalent Parts Pills & Instant Add */}
                  {equivalents.length > 0 && (
                    <div className="bg-white/80 rounded-lg p-2.5 border border-zinc-200/80 space-y-1.5">
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">
                        🔗 RÉFÉRENCES ÉQUIVALENTES (DICTIONNAIRE & B2B) :
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {equivalents.map((eq: any, eqIdx: number) => {
                          const eqInBasket = basket.some(b => b.ref === eq.reference);
                          return (
                            <div
                              key={eqIdx}
                              className={`px-2.5 py-1.5 rounded-md text-[10px] border flex items-center gap-2 transition ${
                                eqInBasket
                                  ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                                  : 'bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50'
                              }`}
                            >
                              <span className="font-extrabold text-amber-700 uppercase">{eq.brand}:</span>
                              <span className="font-mono font-black text-zinc-950">{eq.reference}</span>
                              {eq.estimatedPrice && (
                                <span className="text-emerald-700 font-mono font-bold">{eq.estimatedPrice.toFixed(2)} TND</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEnrichInternalCatalog({ ref: eq.reference, designation: `${eq.designation || item.designation} (${eq.brand})`, category: item.group, brand: eq.brand })}
                                className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold uppercase ml-1"
                                title="Enregistrer l'équivalent dans le catalogue interne"
                              >
                                📥 Enrichir
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (eqInBasket) {
                                    handleRemoveFromBasket(eq.reference);
                                  } else {
                                    handleAddToBasket({ ref: eq.reference, designation: `${eq.designation || item.designation} (${eq.brand})`, category: item.group });
                                  }
                                }}
                                className="text-[9px] text-cyan-400 hover:text-zinc-950 font-bold underline uppercase ml-1"
                              >
                                {eqInBasket ? 'Suppr' : '+ Panier'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Manual Reference Input */}
          <div className="pt-3 border-t border-zinc-200 flex gap-2">
            <input
              type="text"
              value={oeRefInput}
              onChange={e => setOeRefInput(e.target.value.toUpperCase())}
              placeholder="AJOUTER MANUELLEMENT UNE RÉFÉRENCE CARROSSERIE OU OE..."
              className="flex-1 bg-white text-zinc-900 border border-zinc-200 font-bold text-xs px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none uppercase placeholder:normal-case placeholder:font-normal"
            />
            <button
              type="button"
              onClick={handleAddManualRefToBasket}
              disabled={!oeRefInput.trim()}
              className="px-4 py-2 bg-zinc-50 hover:bg-slate-700 text-zinc-950 text-xs font-black uppercase rounded-xl transition disabled:opacity-40"
            >
              + AJOUTER
            </button>
          </div>
        </div>

        {/* Right 1 Col: Internal Consultation Basket & B2B Bridge */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                🛒 PANIER DE CONSULTATION INTERNE ({basket.length})
              </h3>
              {basket.length > 0 && (
                <button
                  onClick={() => setBasket([])}
                  className="text-[9px] font-bold text-red-400 hover:underline uppercase"
                >
                  VIDER LE PANIER
                </button>
              )}
            </div>

            {basket.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-xs font-bold uppercase border border-zinc-200/50 border-dashed rounded-xl p-4">
                Votre panier de consultation est vide.<br />
                Cliquez sur 🛒 + PANIER ou 📥 ENRICHIR pour traiter les pièces du schéma.
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {basket.map((b) => (
                  <div key={b.ref} className="p-3 bg-white border border-zinc-200 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-mono text-cyan-400 font-bold text-xs uppercase block">OE #{b.ref}</span>
                      <span className="text-[10px] text-slate-300 uppercase font-semibold line-clamp-1">{b.designation}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveFromBasket(b.ref)}
                      className="text-zinc-600 hover:text-red-400 text-xs font-bold px-2 py-1"
                      title="Retirer de la liste"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-200 space-y-2">
            <button
              type="button"
              disabled={basket.length === 0 || loadingHeadless}
              onClick={handleEnrichEntireBasket}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-zinc-950 font-black uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-cyan-950" /> 📥 TOUT ENRICHIR DANS CATALOGUE INTERNE ({basket.length})
            </button>

            <button
              type="button"
              disabled={basket.length === 0}
              onClick={handleLaunchBasketSearch}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" /> 🚀 CONSULTATION B2B MULTI-FOURNISSEURS ({basket.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AdminContent() {
  const { adminSection, setAdminSection } = useApp();
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);

  const sectionMap: Record<string, React.ReactNode> = {
    'reception': <SectionReception onTreatQuote={(q) => { setSelectedQuote(q); setAdminSection('creer-devis'); }} />,
    'traitement': <SectionReception onTreatQuote={(q) => { setSelectedQuote(q); setAdminSection('creer-devis'); }} />,
    'devis-gen': <SectionDevisGeneres onEditDevis={(d) => { setSelectedQuote(d); setAdminSection('creer-devis'); }} />,
    'bons': <SectionBonsEtLivraisons />,
    'creer-devis': <SectionCreerDevis quoteToLoad={selectedQuote} onClearQuote={() => setSelectedQuote(null)} />,
    'generer-pdf': <SectionDevisGeneres onEditDevis={(d) => { setSelectedQuote(d); setAdminSection('creer-devis'); }} />,
    'envoi': <SectionDevisGeneres onEditDevis={(d) => { setSelectedQuote(d); setAdminSection('creer-devis'); }} />,
    'ajouter-fournisseur': <SectionAjouterFournisseur />,
    'liste-fournisseurs': <SectionListeFournisseurs />,
    'consultation-fournisseur': <SectionConsultationFournisseur />,
    'robot-b2b': <SectionRobotB2B />,
    'parts-catalogue': (
      <SectionPartsCatalogue
        onTransferToRobot={(ref) => {
          localStorage.setItem('robotB2B_pendingRef', ref);
          setAdminSection('robot-b2b');
          window.dispatchEvent(new CustomEvent('robotB2B_searchRef', { detail: ref }));
        }}
      />
    ),
    'recherche-four': <SectionConsultationFournisseur />,
    'comparatif': <SectionConsultationFournisseur />,
    'suivi-po': <SectionSuiviPO />,
    'historique-achat': <SectionHistoriqueAchats />,
    'chat-interne': <SectionChatInterne />,
    'comptabilite': <SectionComptabilite />,
    'ajouter-article': <SectionGestionArticles />,
    'modifier-article': <SectionGestionArticles />,
    'liste-articles': <SectionGestionArticles />,
    'tableau-bord': <SectionTableauBord />,
    'chiffre': <SectionTableauBord />,
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 overflow-y-auto min-h-screen">
      {sectionMap[adminSection] || <SectionReception onTreatQuote={(q) => { setSelectedQuote(q); setAdminSection('creer-devis'); }} />}
    </div>
  );
}

// ─── SECTION: HISTORIQUE D'ACHATS (PAR FOURNISSEUR ET PAR ARTICLE) ────────────
function SectionHistoriqueAchats() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'supplier' | 'article'>('supplier');

  // Supplier Tab States
  const [selectedSuppId, setSelectedSuppId] = useState('');
  const [suppSearch, setSuppSearch] = useState('');

  // Article Tab States
  const [articleSearch, setArticleSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedArticleRef, setSelectedArticleRef] = useState('');
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/purchase-orders').then(r => r.json()),
      fetch('/api/products').then(r => r.json())
    ]).then(([sData, poData, prodData]) => {
      setSuppliers(sData.data || []);
      setPurchaseOrders(poData.data || []);
      setProducts(Array.isArray(prodData) ? prodData : prodData.data || []);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Filter POs by supplier and optionally search text
  const supplierPOs = purchaseOrders.filter(po => {
    if (selectedSuppId && po.supplierId !== selectedSuppId) return false;
    if (suppSearch) {
      const s = suppSearch.toLowerCase();
      return (
        po.orderNumber?.toLowerCase().includes(s) ||
        po.notes?.toLowerCase().includes(s) ||
        po.items?.some((it: any) => 
          it.reference?.toLowerCase().includes(s) || 
          it.designation?.toLowerCase().includes(s)
        )
      );
    }
    return true;
  });

  // Get autocomplete suggestions for articles
  const handleArticleSearchChange = (val: string) => {
    setArticleSearch(val);
    if (!val || val.length < 2) {
      setSuggestions([]);
      return;
    }
    const filtered = products.filter(p => 
      p.reference?.toLowerCase().includes(val.toLowerCase()) ||
      p.name?.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 8);
    setSuggestions(filtered);
  };

  

  // Find all purchase orders containing the selected article reference
  const articlePurchases = useMemo(() => {
    if (!selectedArticleRef) return [];
    const list: any[] = [];
    purchaseOrders.forEach(po => {
      po.items?.forEach((it: any) => {
        if (it.reference?.toLowerCase() === selectedArticleRef.toLowerCase()) {
          list.push({
            poNumber: po.orderNumber,
            date: new Date(po.createdAt).toLocaleDateString('fr-FR'),
            supplierName: po.supplier?.name || 'Fournisseur inconnu',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: it.total
          });
        }
      });
    });
    return list;
  }, [selectedArticleRef, purchaseOrders]);

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-zinc-950 mb-1 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-green-400" /> HISTORIQUE D'ACHATS
      </h2>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-5">CONSULTEZ LES ACHATS EFFECTUÉS PAR FOURNISSEUR OU PAR ARTICLE</p>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 mb-6 gap-2">
        <button
          onClick={() => setActiveSubTab('supplier')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
            activeSubTab === 'supplier' 
              ? 'border-red-500 text-zinc-950' 
              : 'border-transparent text-zinc-600 hover:text-slate-300'
          }`}
        >
          Par Fournisseur
        </button>
        <button
          onClick={() => setActiveSubTab('article')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
            activeSubTab === 'article' 
              ? 'border-red-500 text-zinc-950' 
              : 'border-transparent text-zinc-600 hover:text-slate-300'
          }`}
        >
          Par Article
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-600 font-bold uppercase animate-pulse">Chargement de l'historique...</div>
      ) : activeSubTab === 'supplier' ? (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedSuppId}
              onChange={e => setSelectedSuppId(e.target.value)}
              className="bg-white text-zinc-950 font-bold text-xs px-3 h-10 rounded-xl border border-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer transition-colors"
            >
              <option value="">TOUS LES FOURNISSEURS</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="RECHERCHER PAR N° BON, RÉFÉRENCE OU DÉSIGNATION DE PIÈCE..."
                value={suppSearch}
                onChange={e => setSuppSearch(e.target.value)}
                className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal" 
              />
            </div>
          </div>

          {/* Supplier POs List */}
          <div className="space-y-4">
            {supplierPOs.length === 0 ? (
              <div className="text-center py-10 text-zinc-600 font-bold uppercase">Aucune commande d'achat trouvée</div>
            ) : (
              supplierPOs.map(po => (
                <div key={po.id} className={cardCls}>
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-3 mb-3">
                    <div>
                      <span className="font-mono text-green-400 font-black text-sm uppercase">#{po.orderNumber}</span>
                      <h4 className="font-black text-zinc-950 uppercase text-xs mt-0.5">Fournisseur : {po.supplier?.name?.toUpperCase()}</h4>
                      <p className="text-[10px] text-zinc-600">Date : {new Date(po.createdAt).toLocaleDateString('fr-FR')} · Statut : {po.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-zinc-600 uppercase font-black">Montant Total HT</p>
                      <p className="font-black text-zinc-950 font-mono text-sm">{po.totalAmount.toFixed(3)} TND</p>
                    </div>
                  </div>
                  
                  {/* Items */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[9px] text-zinc-950 font-black uppercase tracking-wider border-b border-slate-850">
                          <th className="py-2">Réf. pièce</th>
                          <th className="py-2">Désignation</th>
                          <th className="py-2 text-center">Quantité</th>
                          <th className="py-2 text-right">Prix Unit. HT</th>
                          <th className="py-2 text-right">Total HT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {po.items?.map((it: any) => (
                          <tr key={it.id} className="border-b border-slate-850/30 text-slate-300">
                            <td className="py-2 font-mono font-bold text-red-400">{it.reference?.toUpperCase()}</td>
                            <td className="py-2 uppercase font-medium">{it.designation}</td>
                            <td className="py-2 text-center font-mono">{it.quantity}</td>
                            <td className="py-2 text-right font-mono">{it.unitPrice.toFixed(3)} TND</td>
                            <td className="py-2 text-right font-mono font-bold text-zinc-950">{it.total.toFixed(3)} TND</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Article Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="SAISISSEZ UNE RÉFÉRENCE OU DÉSIGNATION DE PIÈCE..."
              value={articleSearch}
              onChange={e => handleArticleSearchChange(e.target.value)}
              className="w-full bg-white text-zinc-950 font-semibold border border-zinc-200 pl-10 pr-4 h-10 rounded-xl text-sm focus:outline-none focus:border-zinc-300 uppercase transition-colors placeholder:text-zinc-500 placeholder:normal-case placeholder:font-normal"
            />

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-xl mt-2 overflow-hidden shadow-2xl z-50">
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedArticleRef(p.reference || '');
                      setArticleSearch(p.reference ? `${p.reference} - ${p.name}` : p.name);
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 text-xs font-semibold border-b border-zinc-200/50 last:border-0 text-slate-300 hover:text-zinc-950 flex justify-between"
                  >
                    <span className="uppercase">{p.name}</span>
                    <span className="font-mono text-red-400 uppercase font-black">{p.reference}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Article Purchases Table */}
          {selectedArticleRef ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
                    <span>HISTORIQUE DES COMMANDES D'ACHATS :</span>
                    <span className="text-red-400 font-mono text-base font-black">#{selectedArticleRef.toUpperCase()}</span>
                  </h3>
                </div>
              </div>

              {articlePurchases.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
                  <p className="text-slate-200 font-black text-sm uppercase">
                    Aucun bon d'achat enregistré pour cette référence
                  </p>
                  <p className="text-slate-400 text-xs font-medium">
                    Cette pièce n'a fait l'objet d'aucune commande d'achat interne enregistrée.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                    📝 BONS DE COMMANDE D'ACHATS
                  </h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/60">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-950/90 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="px-3 py-2.5">Date</th>
                          <th className="px-3 py-2.5">Fournisseur</th>
                          <th className="px-3 py-2.5">N° Bon</th>
                          <th className="px-3 py-2.5 text-center">Quantité</th>
                          <th className="px-3 py-2.5 text-right">Prix Unit. HT</th>
                          <th className="px-3 py-2.5 text-right">Total HT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {articlePurchases.map((ap, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="px-3 py-2.5 font-mono font-black text-slate-200">{ap.date}</td>
                            <td className="px-3 py-2.5 font-black text-slate-100 uppercase">{ap.supplierName}</td>
                            <td className="px-3 py-2.5 font-mono font-black text-emerald-400">#{ap.poNumber}</td>
                            <td className="px-3 py-2.5 text-center font-mono font-black text-slate-200">{ap.quantity}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-black text-slate-100">{ap.unitPrice.toFixed(3)} TND</td>
                            <td className="px-3 py-2.5 text-right font-mono font-black text-cyan-400">{ap.total.toFixed(3)} TND</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-950/60 border border-slate-800 border-dashed rounded-3xl text-slate-400 font-bold uppercase text-xs">
              Veuillez sélectionner ou rechercher un article ci-dessus pour consulter ses commandes d'achat
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SECTION: CHAT INTERNE CLIENT-ADMIN ──────────────────────────────────────
function SectionChatInterne() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; data: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = () => {
    fetch('/api/chat')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setConversations(res.data || []);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingConv(false));
  };

  const fetchMessages = (userId: string) => {
    fetch(`/api/chat?userId=${userId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setMessages(res.data || []);
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    fetchMessages(selectedUserId);
    const interval = setInterval(() => fetchMessages(selectedUserId), 2000);
    return () => clearInterval(interval);
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Le fichier ne doit pas dépasser 2 Mo');
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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!reply.trim() && !attachment) || !selectedUserId) return;

    setSending(true);
    try {
      const activeProfile = localStorage.getItem('activeAdminProfile') || undefined;
      
      let messageContent = reply;
      if (attachment) {
        messageContent = reply ? `${reply}\n\n📎 ${attachment.name}` : `📎 ${attachment.name}`;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageContent,
          userId: selectedUserId,
          senderName: activeProfile,
          attachment: attachment ? { name: attachment.name, data: attachment.data, type: attachment.type } : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setReply('');
        setAttachment(null);
        fetchConversations(); // refresh list
      } else {
        alert("Erreur: " + (data.error || "Impossible d'envoyer le message"));
      }
    } catch (err: any) {
      alert("Erreur de connexion: " + err.message);
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find(c => c.userId === selectedUserId);

  return (
    <div className="h-[calc(100vh-120px)] flex bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-2xl">
      {/* Sidebar des conversations */}
      <div className="w-1/3 border-r border-zinc-200/80 bg-white/40 flex flex-col">
        <div className="p-4 border-b border-zinc-200 bg-white/60">
          <h3 className="text-zinc-950 text-xs font-black uppercase tracking-widest">CONVERSATIONS</h3>
          <p className="text-[9px] text-zinc-600 uppercase font-bold mt-1">SÉLECTIONNEZ UN CLIENT POUR LUI RÉPONDRE</p>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {loadingConv ? (
            <div className="text-center py-10 text-zinc-600 font-bold uppercase tracking-wider text-[10px] animate-pulse">Chargement...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 text-zinc-600 font-bold uppercase tracking-wider text-[10px]">Aucun message</div>
          ) : (
            conversations.map(c => {
              const isSelected = c.userId === selectedUserId;
              const userName = c.user?.name || `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || 'Client';
              const hasUnread = c.lastMessage && !c.lastMessage.isAdmin;
              return (
                <button
                  key={c.userId}
                  onClick={() => setSelectedUserId(c.userId)}
                  className={`w-full text-left p-4 transition-colors flex flex-col gap-1.5 ${
                    isSelected ? 'bg-red-650/10 border-l-4 border-red-500 bg-slate-850/30' : 'hover:bg-zinc-50/20'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="flex items-center gap-2">
                      {hasUnread && !isSelected && (
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse flex-shrink-0" />
                      )}
                      <span className={`font-black text-xs uppercase truncate max-w-[70%] ${hasUnread && !isSelected ? 'text-cyan-400' : 'text-zinc-950'}`}>{userName}</span>
                    </div>
                    <span className="text-[8px] text-zinc-600 font-mono">
                      {c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleDateString('fr-FR') : ''}
                    </span>
                  </div>
                  <p className={`text-[10px] truncate w-full uppercase ${hasUnread && !isSelected ? 'text-cyan-300 font-bold' : 'text-zinc-500'}`}>
                    {c.lastMessage?.content || 'Aucun message'}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Fenêtre de chat */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUserId ? (
          <>
            {/* User Header */}
            <div className="p-4 bg-white/40 border-b border-zinc-200 flex justify-between items-center">
              <div>
                <h4 className="text-zinc-950 text-xs font-black uppercase tracking-wider">
                  {activeConv?.user?.name || `${activeConv?.user?.firstName || ''} ${activeConv?.user?.lastName || ''}`.trim() || 'Client'}
                </h4>
                <p className="text-[9px] text-zinc-600 font-bold mt-0.5">{activeConv?.user?.email}</p>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.isAdmin ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 text-xs ${
                      msg.isAdmin
                        ? 'bg-red-650 text-zinc-950 rounded-tr-none shadow shadow-red-500/20'
                        : 'bg-zinc-50 text-zinc-900 rounded-tl-none'
                    }`}
                  >
                    {msg.reference && (
                      <div className="bg-black/35 rounded-lg px-2.5 py-1 mb-1.5 font-mono text-[9px] text-orange-300 font-black uppercase">
                        Réf concernée : {msg.reference}
                      </div>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.attachmentData && (
                      <div className="mt-2">
                        {msg.attachmentType?.startsWith('image/') ? (
                          <img src={msg.attachmentData} alt={msg.attachmentName || 'Attachment'} className="max-w-[200px] rounded-lg border border-zinc-200/50" />
                        ) : (
                          <a href={msg.attachmentData} download={msg.attachmentName || 'download'} className="flex items-center gap-1.5 px-3 py-2 bg-black/20 hover:bg-black/30 rounded-lg transition text-xs font-semibold text-zinc-950">
                            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[150px]">{msg.attachmentName || 'Pièce jointe'}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-zinc-600 mt-1 uppercase font-black">
                    {msg.senderName} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview */}
            {attachment && (
              <div className="px-6 py-2 bg-white/40 border-t border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px]">
                  <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-300 font-bold uppercase truncate max-w-[300px]">{attachment.name}</span>
                </div>
                <button
                  onClick={() => setAttachment(null)}
                  className="text-red-400 hover:text-red-300 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Reply Form */}
            <form
              onSubmit={handleSendReply}
              className="p-4 border-t border-zinc-200/80 bg-white/20 flex gap-3 items-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-zinc-600 hover:text-cyan-400 transition rounded-xl hover:bg-zinc-50/50"
                title="Joindre un fichier"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Saisissez votre réponse..."
                value={reply}
                onChange={e => setReply(e.target.value)}
                className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-3 text-xs text-zinc-950 placeholder-slate-500 focus:outline-none focus:border-zinc-300 uppercase placeholder:normal-case font-semibold"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || (!reply.trim() && !attachment)}
                className="px-5 py-3 bg-red-650 hover:bg-red-600 text-zinc-950 font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" /> Répondre
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <MessageSquare className="w-12 h-12 text-slate-700 mb-2" />
            <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Aucune conversation sélectionnée</p>
            <p className="text-slate-650 text-[10px] uppercase font-bold mt-1">Sélectionnez un client dans la liste pour voir les messages et répondre.</p>
          </div>
        )}
      </div>
    </div>
  );
}


