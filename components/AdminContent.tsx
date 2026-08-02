"use client";

import { useApp } from '@/lib/context';
import { useSession } from 'next-auth/react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { searchDictionaryAndEquivalents, getEquivalentsForRef, validateCriticalPartCompatibility } from '@/lib/equivalentsDictionary';
import ModalSyntheseOffres from './ModalSyntheseOffres';
import {
  Search, Edit3, MessageSquare, FileText, Mail, Phone,
  Plus, Trash2, Save, X, Send,
  Building2, UserPlus, List, ClipboardList, Package,
  CheckCircle, AlertTriangle, Printer, Clock,
  ShoppingBag, BarChart2, Download, Receipt, Paperclip, Upload
} from 'lucide-react';

// ─── Input style helper ───────────────────────────────────────────────────────
const inputCls = "w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 text-sm px-3 h-10 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 focus:outline-none focus:border-slate-500 uppercase placeholder:text-slate-500 placeholder:font-normal placeholder:normal-case transition-colors";
const labelCls = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1";
const cardCls = "bg-slate-800/50 border border-slate-800/50 rounded-xl md:rounded-2xl p-4 md:p-5 mb-4 w-full";

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

  const fetchQuotes = () => {
    fetch('/api/quotes').then(r => r.json()).then(d => {
      setQuotes(Array.isArray(d) ? d : d.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleAssignProfile = async (quoteId: string, name: string) => {
    try {
      const res = await fetch('/api/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, managedByName: name })
      });
      if (res.ok) {
        fetchQuotes();
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
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1">DEMANDES CLIENTS EN ATTENTE</h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">TRAITEZ LES DEMANDES REÇUES EN TEMPS RÉEL</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="RECHERCHER PAR CLIENT, VÉHICULE, N° DEMANDE..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-700 focus:outline-none focus:border-slate-500 uppercase placeholder:normal-case placeholder:font-normal" />
        </div>
        <div className="flex gap-2">
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-3 h-10 rounded-xl border border-slate-700 cursor-pointer"
          >
            <option value="TOUS STATUTS">TOUS STATUTS</option>
            <option value="EN ATTENTE">EN ATTENTE</option>
            <option value="TRAITÉ">TRAITÉ</option>
          </select>
          <select 
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-3 h-10 rounded-xl border border-slate-700 cursor-pointer"
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
        <div className="text-center py-16 text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">CHARGEMENT...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 font-black uppercase tracking-widest text-xs">AUCUNE DEMANDE TROUVÉE</div>
      ) : (
        filtered.map((q) => (
          <div key={q.id} className={cardCls}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div>
                <span className="font-black text-red-400 text-sm uppercase font-mono">#{q.id?.slice(-6).toUpperCase()}</span>
                <h4 className="font-black text-white uppercase text-sm mt-0.5">{q.clientName?.toUpperCase()}</h4>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                  {q.clientEmail} · {q.createdAt ? new Date(q.createdAt).toLocaleDateString('fr-FR') : ''}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Sélecteur de profil admin */}
                <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-xl px-2.5 py-1">
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Assigné à :</span>
                  <select
                    value={q.managedBy?.name?.toUpperCase() || 'NON ASSIGNÉ'}
                    onChange={(e) => handleAssignProfile(q.id, e.target.value)}
                    className="bg-transparent text-slate-200 font-bold text-[9px] focus:outline-none cursor-pointer uppercase"
                  >
                    <option value="NON ASSIGNÉ" className="bg-slate-900 text-slate-500">NON ASSIGNÉ</option>
                    <option value="SAIF" className="bg-slate-900 text-white">SAIF</option>
                    <option value="AMINE" className="bg-slate-900 text-white">AMINE</option>
                    <option value="SAIFALLAH" className="bg-slate-900 text-white">SAIFALLAH</option>
                  </select>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                  q.status === 'TREATED' ? 'bg-green-500/15 text-green-400 border-green-500/20' : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                }`}>{q.status === 'TREATED' ? 'TRAITÉ' : 'EN ATTENTE'}</span>
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-3 mb-3">
              <div className="text-xs font-black text-white uppercase mb-1">{q.brand} {q.model} {q.vin && `· VIN: ${q.vin}`}</div>
              <div className="text-xs text-slate-400 uppercase">
                {q.items?.map((it: any) => `${it.designation} (x${it.quantity})`).join(' · ')}
              </div>
              {q.remarks && <div className="text-xs text-slate-500 mt-1 uppercase">NOTE: {q.remarks}</div>}
            </div>

            <div className="flex gap-2 flex-wrap">
              {q.status !== 'TREATED' && (
                <button 
                  onClick={() => onTreatQuote && onTreatQuote(q)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wide transition shadow shadow-red-600/20"
                >
                  <Edit3 className="w-3.5 h-3.5" /> CRÉER DEVIS
                </button>
              )}
              <a 
                href={`https://wa.me/${q.phone || '21698774525'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wide transition border border-slate-700"
              >
                <Phone className="w-3.5 h-3.5" /> CONTACTER
              </a>
              <a 
                href={`mailto:${q.clientEmail}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wide transition"
              >
                <Mail className="w-3.5 h-3.5" /> ENVOYER EMAIL
              </a>
              <button 
                onClick={async () => {
                  if (confirm("Voulez-vous vraiment supprimer cette demande de devis ?")) {
                    try {
                      const res = await fetch(`/api/quotes?id=${q.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        alert("Demande supprimée avec succès.");
                        fetchQuotes();
                      } else {
                        const err = await res.json();
                        alert(err.error || "Erreur lors de la suppression");
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/15 hover:bg-red-500 hover:text-white text-red-400 rounded-xl text-[11px] font-black uppercase tracking-wide transition border border-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> SUPPRIMER
              </button>
              {q.photo && (
                 <a 
                   href={q.photo} 
                   download={q.photoName || `photo-${q.id}.jpg`}
                   className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 rounded-xl text-[11px] font-black uppercase tracking-wide transition border border-blue-500/30"
                 >
                   <Paperclip className="w-3.5 h-3.5" /> PIÈCE (IMAGE)
                 </a>
              )}
              {q.chassisPhoto && (
                 <a 
                   href={q.chassisPhoto} 
                   download={q.chassisPhotoName || `chassis-${q.id}.jpg`}
                   className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 rounded-xl text-[11px] font-black uppercase tracking-wide transition border border-blue-500/30"
                 >
                   <Paperclip className="w-3.5 h-3.5" /> CARTE GRISE
                 </a>
              )}
              {q.fileBase64 && (
                 <a 
                   href={`data:${q.fileFormat === 'excel' || q.fileFormat === 'csv' ? 'text/csv' : 'application/pdf'};base64,${q.fileBase64}`} 
                   download={q.fileName || `demande-${q.id}.${q.fileFormat === 'excel' || q.fileFormat === 'csv' ? 'csv' : 'pdf'}`}
                   className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-xl text-[11px] font-black uppercase tracking-wide transition border border-indigo-500/30"
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

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
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

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1">CRÉER / MODIFIER DEVIS</h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">GÉNÉREZ ET MODIFIEZ VOS DEVIS CLIENTS</p>

      {/* Client Info */}
      <div className={cardCls}>
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-3">INFORMATIONS CLIENT</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>NOM CLIENT *</label>
            <input type="text" className={inputCls} placeholder="NOM COMPLET" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>EMAIL CLIENT *</label>
            <input type="email" className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 text-sm px-3 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500 placeholder:text-slate-400 font-sans" placeholder="email@client.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>VÉHICULE</label>
            <input type="text" className={inputCls} placeholder="EX: PEUGEOT 208 1.2" value={vehicle} onChange={e => setVehicle(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>NUMÉRO VIN</label>
            <input type="text" className={inputCls} placeholder="VIN / CHASSIS" value={vin} onChange={e => setVin(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <label className={labelCls}>NOTES / OBSERVATIONS</label>
          <textarea rows={2} className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 text-sm px-3 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500 resize-none" placeholder="Notes additionnelles..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Items Table */}
      <div className={cardCls}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">LIGNES DU DEVIS</div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-black uppercase rounded-lg transition cursor-pointer border border-slate-700 shadow-sm font-sans" title="Importer un fichier d'offres fournisseur (Excel/CSV) pour remplir le devis et l'historique">
              <Upload className="w-3.5 h-3.5" /> IMPORTER OFFRES FOURNISSEUR (EXCEL/CSV)
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportSupplierOffersFile} className="hidden" />
            </label>
            <button 
              onClick={handleOpenSynthese}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-black uppercase rounded-lg transition shadow-sm border border-slate-700"
            >
              <BarChart2 className="w-3.5 h-3.5" /> SYNTHÈSE MEILLEURES OFFRES
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white text-[11px] font-black uppercase rounded-lg transition shadow-sm border border-emerald-600/50"
            >
              <Save className="w-3.5 h-3.5" /> ENREGISTRER TOUTES LES OFFRES
            </button>
            <button onClick={addLine} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-black uppercase rounded-lg transition shadow-sm">
              <Plus className="w-3.5 h-3.5" /> AJOUTER LIGNE
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900/60 text-[10px] font-black uppercase text-slate-400">
                <th className="px-3 py-2.5 text-left rounded-l-lg">DÉSIGNATION</th>
                <th className="px-3 py-2.5 text-left">RÉFÉRENCE</th>
                <th className="px-3 py-2.5 text-center">QTÉ</th>
                <th className="px-3 py-2.5 text-right">P.U. HT</th>
                <th className="px-3 py-2.5 text-right">REMISE %</th>
                <th className="px-3 py-2.5 text-right">TOTAL HT</th>
                <th className="px-3 py-2.5 text-center rounded-r-lg">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const lineTotal = it.qty * it.puHT;
                const discounted = lineTotal - lineTotal * (it.discount / 100);
                return (
                  <React.Fragment key={i}>
                  <tr className="border-b border-slate-800/50">
                    <td className="px-2 py-2 relative">
                      <input type="text" value={it.designation} 
                        onChange={e => {
                          updateLine(i, 'designation', e.target.value);
                          setActiveSuggestRow(i);
                          setActiveSuggestField('desc');
                        }}
                        onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('desc'); }}
                        onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                        className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 text-xs px-2 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500 uppercase min-w-[150px]" placeholder="DÉSIGNATION" />
                      {activeSuggestRow === i && activeSuggestField === 'desc' && getSuggestions(it.designation, 'desc').length > 0 && (
                        <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-900/60 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
                          {getSuggestions(it.designation, 'desc').map((p: any) => (
                            <button key={p.id} type="button"
                              onClick={() => {
                                updateLine(i, 'designation', p.name || '');
                                updateLine(i, 'reference', p.reference || '');
                                if (p.price) updateLine(i, 'puHT', p.price);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between gap-2">
                              <span className="text-white truncate max-w-[140px]">{p.name}</span>
                              <span className="text-red-400 font-mono text-[9px] shrink-0">{p.reference}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 relative">
                      <input type="text" value={it.reference}
                        onChange={e => {
                          updateLine(i, 'reference', e.target.value);
                          setActiveSuggestRow(i);
                          setActiveSuggestField('ref');
                        }}
                        onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('ref'); }}
                        onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                        className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 text-xs px-2 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500 uppercase min-w-[100px]" placeholder="RÉF." />
                      {activeSuggestRow === i && activeSuggestField === 'ref' && getSuggestions(it.reference, 'ref').length > 0 && (
                        <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-900/60 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
                          {getSuggestions(it.reference, 'ref').map((p: any) => (
                            <button key={p.id} type="button"
                              onClick={() => {
                                updateLine(i, 'reference', p.reference || '');
                                updateLine(i, 'designation', p.name || '');
                                if (p.price) updateLine(i, 'puHT', p.price);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between gap-2">
                              <span className="text-red-400 font-mono font-bold shrink-0">{p.reference}</span>
                              <span className="text-slate-400 text-[10px] truncate">{p.name}</span>
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
                      <input type="number" value={it.qty} min={1} onChange={e => updateLine(i, 'qty', parseFloat(e.target.value) || 1)}
                        className="w-16 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500 text-center" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={it.puHT || ''} min={0} step={0.001} onChange={e => updateLine(i, 'puHT', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500 text-right" placeholder="" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={it.discount || ''} min={0} max={100} step={1} onChange={e => updateLine(i, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-16 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500 text-center" placeholder="" />
                    </td>
                    <td className="px-2 py-2 text-right font-black text-cyan-400">{discounted.toFixed(3)} TND</td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => removeLine(i)} className="text-slate-500 hover:text-red-400 transition p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  {/* HISTORIQUE PIECE UI */}
                  <tr className="border-b-2 border-slate-900 bg-slate-900/40">
                    <td colSpan={7} className="px-3 pb-3 pt-1">
                      <div className="flex flex-col gap-2 p-2.5 bg-slate-900/60/80 rounded-lg border border-slate-800/80">
                        <div className="flex justify-between items-center">
                          <div className="text-[9px] text-slate-500 font-black tracking-widest uppercase">HISTORIQUE ACHAT/VENTE FOURNISSEURS (Optionnel)</div>
                          {it.reference && (
                            <button 
                              onClick={() => fetchPriceHistory(it.reference, i)}
                              className="text-[9px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded font-bold uppercase transition"
                            >
                              Charger Historique
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="col-span-2">
                            <div className="flex flex-col gap-2">
                              {/* Header array */}
                              {it.offres && it.offres.length > 0 && (
                                <div className="grid grid-cols-12 gap-2 text-[9px] font-black uppercase text-slate-500 px-2 pb-1 border-b border-slate-800">
                                  <div className="col-span-2">TYPE</div>
                                  <div className="col-span-3">FOURNISSEUR</div>
                                  <div className="col-span-2">ACHAT HT</div>
                                  <div className="col-span-1 text-center">REM %</div>
                                  <div className="col-span-2">VENTE HT</div>
                                  <div className="col-span-2 text-center">ACTION</div>
                                </div>
                              )}
                              {/* Rows */}
                              {it.offres?.map((offre: any, oIdx: number) => (
                                <div key={oIdx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/50 p-2 rounded border border-slate-800 hover:border-slate-700 transition">
                                  <div className="col-span-2">
                                    <select 
                                      className={`w-full text-xs px-2 h-10 rounded border focus:outline-none font-bold ${
                                        offre.type === 'ORIGINE' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
                                        offre.type === 'CONCESSIONNAIRE' ? 'bg-purple-500/15 text-purple-300 border-purple-500/20' :
                                        'bg-cyan-500/15 text-cyan-300 border-cyan-500/20'
                                      }`}
                                      value={offre.type || 'ADAPTABLE'}
                                      onChange={(e) => {
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
                                      className="w-full bg-slate-900/60 text-slate-200 text-xs px-2 h-10 rounded border border-slate-700 focus:border-slate-500 focus:outline-none"
                                      value={offre.supplierId || ''}
                                      onChange={async (e) => {
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
                                              } else {
                                                alert(data.error || "Erreur lors de la création du fournisseur");
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
                                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                      <option value="NEW_SUPPLIER" className="font-bold text-green-400 bg-slate-900">+ CRÉER NOUVEAU FOURNISSEUR...</option>
                                    </select>
                                  </div>
                                  <div className="col-span-2">
                                    <input type="number" placeholder="Achat HT" className="w-full bg-slate-900/60 text-slate-200 text-xs px-2 h-10 rounded border border-slate-700 focus:border-slate-500 focus:outline-none text-right font-mono tabular-nums"
                                      value={offre.purchasePrice || ''} 
                                      onChange={(e) => {
                                        const pVal = parseFloat(e.target.value) || 0;
                                        const newOffres = [...it.offres];
                                        newOffres[oIdx].purchasePrice = pVal;
                                        const disc = parseFloat(newOffres[oIdx].discount) || 0;
                                        if (newOffres[oIdx].type === 'ADAPTABLE') {
                                          newOffres[oIdx].sellingPrice = parseFloat((pVal * 1.30).toFixed(3));
                                        } else if (newOffres[oIdx].type === 'ORIGINE' || newOffres[oIdx].type === 'CONCESSIONNAIRE') {
                                          if (pVal > 0) {
                                            newOffres[oIdx].sellingPrice = disc > 0 ? parseFloat((pVal / (1 - disc / 100)).toFixed(3)) : pVal;
                                          } else {
                                            newOffres[oIdx].sellingPrice = 0;
                                          }
                                        }
                                        if (newOffres[oIdx].type === 'CONCESSIONNAIRE') {
                                          const origineIdx = newOffres.findIndex(o => o.type === 'ORIGINE');
                                          if (origineIdx !== -1) {
                                            newOffres[origineIdx].sellingPrice = newOffres[oIdx].sellingPrice;
                                            const origineDisc = parseFloat(newOffres[origineIdx].discount) || 0;
                                            if (newOffres[oIdx].sellingPrice > 0) {
                                              newOffres[origineIdx].purchasePrice = parseFloat((newOffres[oIdx].sellingPrice * (1 - origineDisc / 100)).toFixed(3));
                                            }
                                          }
                                        }
                                        updateLine(i, 'offres', newOffres);
                                      }} />
                                  </div>
                                  <div className="col-span-1">
                                    <input type="number" placeholder="%" className="w-full bg-slate-900/60 text-amber-400 font-bold text-xs px-2 h-10 rounded border border-slate-700 focus:border-slate-500 focus:outline-none text-center tabular-nums"
                                      value={offre.discount || ''} 
                                      onChange={(e) => {
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
                                      }} />
                                  </div>
                                  <div className="col-span-2">
                                    <input type="number" placeholder={offre.type === 'ORIGINE' || offre.type === 'CONCESSIONNAIRE' ? "Prix Comptoir" : "Vente HT"} className="w-full bg-slate-900/60 text-slate-200 text-xs px-2 h-10 rounded border border-slate-700 focus:border-slate-500 focus:outline-none text-right font-bold text-green-400 font-mono tabular-nums"
                                      value={offre.sellingPrice || ''} 
                                      onChange={(e) => {
                                        const sVal = parseFloat(e.target.value) || 0;
                                        const newOffres = [...it.offres];
                                        newOffres[oIdx].sellingPrice = sVal;
                                        if (newOffres[oIdx].type === 'ORIGINE' || newOffres[oIdx].type === 'CONCESSIONNAIRE') {
                                          const disc = parseFloat(newOffres[oIdx].discount) || 0;
                                          if (sVal > 0) {
                                            newOffres[oIdx].purchasePrice = parseFloat((sVal * (1 - disc / 100)).toFixed(3));
                                          }
                                        }
                                        if (newOffres[oIdx].type === 'CONCESSIONNAIRE') {
                                          const origineIdx = newOffres.findIndex(o => o.type === 'ORIGINE');
                                          if (origineIdx !== -1) {
                                            newOffres[origineIdx].sellingPrice = sVal;
                                            const origineDisc = parseFloat(newOffres[origineIdx].discount) || 0;
                                            if (sVal > 0) {
                                              newOffres[origineIdx].purchasePrice = parseFloat((sVal * (1 - origineDisc / 100)).toFixed(3));
                                            }
                                          }
                                        }
                                        updateLine(i, 'offres', newOffres);
                                      }} />
                                  </div>
                                  <div className="col-span-2 flex items-center justify-end gap-1">
                                    <button 
                                      onClick={async () => {
                                        updateLine(i, 'puHT', offre.sellingPrice);
                                        updateLine(i, 'partType', offre.type);
                                        updateLine(i, 'supplierName', offre.supplierName);
                                        if (it.reference) {
                                          const supp = suppliers.find(s => s.id === offre.supplierId);
                                          const suppName = supp?.name || offre.supplierName || 'Fournisseur';
                                          fetch('/api/historique-prix', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              reference: it.reference.trim().toUpperCase(),
                                              supplierId: offre.supplierId || null,
                                              supplierName: suppName,
                                              type: offre.type,
                                              isConcessionnaire: offre.type === 'ORIGINE' || offre.type === 'CONCESSIONNAIRE',
                                              purchasePrice: parseFloat(offre.purchasePrice) || 0,
                                              sellingPrice: parseFloat(offre.sellingPrice) || 0
                                            })
                                          }).catch(err => console.error(err));
                                        }
                                      }}
                                      title="Appliquer et enregistrer en historique"
                                      className="flex-1 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white text-[9px] font-black px-1.5 py-1.5 rounded transition uppercase text-center border border-green-600/30"
                                    >
                                      CHOISIR
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (!it.reference) {
                                          alert("Veuillez d'abord renseigner la référence de l'article.");
                                          return;
                                        }
                                        const supp = suppliers.find(s => s.id === offre.supplierId);
                                        const suppName = supp?.name || offre.supplierName || 'Fournisseur';
                                        try {
                                          const res = await fetch('/api/historique-prix', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              reference: it.reference.trim().toUpperCase(),
                                              supplierId: offre.supplierId || null,
                                              supplierName: suppName,
                                              type: offre.type === 'ORIGINE' ? 'OEM' : (offre.type || 'ADAPTABLE'),
                                              isConcessionnaire: offre.type === 'ORIGINE',
                                              purchasePrice: parseFloat(offre.purchasePrice) || 0,
                                              sellingPrice: parseFloat(offre.sellingPrice) || 0
                                            })
                                          });
                                          const data = await res.json();
                                          if (data.success) {
                                            alert(`✅ Offre (${suppName} - ${offre.purchasePrice || 0} TND) enregistrée dans l'historique et la synthèse !`);
                                          }
                                        } catch (err) {
                                          console.error(err);
                                        }
                                      }}
                                      title="Enregistrer cette offre dans l'historique et la synthèse"
                                      className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded transition border border-blue-600/30"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newOffres = it.offres.filter((_: any, idx: number) => idx !== oIdx);
                                        updateLine(i, 'offres', newOffres);
                                      }}
                                      className="p-1.5 bg-red-950/50 hover:bg-red-900 text-red-400 rounded transition border border-red-900/30"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {/* Controls */}
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <button 
                                  onClick={() => {
                                    const newOffres = [...(it.offres || []), { type: 'ADAPTABLE', supplierId: '', purchasePrice: 0, discount: 0, sellingPrice: 0 }];
                                    updateLine(i, 'offres', newOffres);
                                  }}
                                  className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded font-bold uppercase transition flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> AJOUTER OFFRE FOURNISSEUR
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
                                  className="text-[10px] bg-emerald-700 hover:bg-emerald-600 border border-emerald-500/30 text-white px-3 py-1.5 rounded font-bold uppercase transition flex items-center gap-1 shadow shadow-emerald-700/20"
                                >
                                  <Save className="w-3 h-3" /> ENREGISTRER OFFRES DE CET ARTICLE
                                </button>
                                <button 
                                  onClick={() => handleB2BSearch(i)}
                                  className="text-[10px] bg-indigo-900/40 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white px-3 py-1.5 rounded font-bold uppercase transition text-center"
                                >
                                  CHERCHER AUTO B2B
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
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

      {/* Totals */}
      <div className={cardCls}>
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-3">RÉCAPITULATIF</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={labelCls}>REMISE GLOBALE (%)</label>
            <input type="number" min={0} max={100} value={globalDiscount} onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900/60 text-slate-100 border border-slate-700 font-black text-sm px-3 h-10 rounded-lg border border-red-500 focus:outline-none text-center text-xl" />
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-xs">SOUS-TOTAL HT</span>
              <span className="font-black text-white">{subtotalHT.toFixed(3)} TND</span>
            </div>
            {globalDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-red-400 font-bold uppercase text-xs">REMISE GLOBALE ({globalDiscount}%)</span>
                <span className="font-black text-red-400">-{globalDiscountAmt.toFixed(3)} TND</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-xs">APRÈS REMISE HT</span>
              <span className="font-black text-white">{afterDiscount.toFixed(3)} TND</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-xs">TVA 19%</span>
              <span className="font-black text-white">{tva.toFixed(3)} TND</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-700">
              <span className="text-amber-400 font-black uppercase">TOTAL TTC</span>
              <span className="font-black text-amber-450 text-lg">{totalTTC.toFixed(3)} TND</span>
            </div>
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-green-400 text-xs font-black uppercase mb-3">
            <CheckCircle className="w-4 h-4" /> DEVIS ENREGISTRÉ AVEC SUCCÈS
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-black uppercase border border-slate-700 transition"
          >
            <Printer className="w-3.5 h-3.5" /> IMPRIMER / PDF
          </button>
          <button
            onClick={() => handleSaveDevis(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase transition disabled:opacity-50 font-sans"
          >
            <Mail className="w-3.5 h-3.5" /> {saving ? 'ENVOI...' : 'ENVOYER CLIENT'}
          </button>
          <button
            onClick={() => handleSaveDevis(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-black uppercase transition disabled:opacity-50 font-sans"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'ENREGISTREMENT...' : 'ENREGISTRER DEVIS'}
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
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-green-400" /> AJOUTER FOURNISSEUR
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">ENREGISTREZ UN NOUVEAU FOURNISSEUR DANS LA BASE</p>

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
                className={f.key === 'email' ? "w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 text-sm px-3 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-green-500" : inputCls.replace('focus:border-slate-500', 'focus:border-green-500')} />
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-700 pt-6">
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
                  className="w-full bg-slate-900 text-white font-semibold text-sm px-3 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500" />
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
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-black uppercase border border-slate-700 transition">
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
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <List className="w-5 h-5 text-green-400" /> LISTE FOURNISSEURS
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">GÉREZ ET MODIFIEZ VOS FOURNISSEURS ENREGISTRÉS</p>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="RECHERCHER UN FOURNISSEUR..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-700 focus:outline-none uppercase placeholder:normal-case placeholder:font-normal" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">CHARGEMENT...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-600">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="uppercase font-bold text-sm">AUCUN FOURNISSEUR ENREGISTRÉ</p>
          <p className="text-xs text-slate-600 mt-1 uppercase">UTILISEZ "AJOUTER FOURNISSEUR" DANS LE MENU GAUCHE</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(s => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center text-white font-black text-sm">
                  {s.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-white uppercase text-sm">{s.name}</p>
                  <p className="text-[10px] text-slate-405 uppercase">{s.contactName && `CONTACT: ${s.contactName} · `}{s.phone && `TÉL: ${s.phone}`}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{s.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${s.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {s.isActive ? 'ACTIF' : 'INACTIF'}
                </span>
                <button onClick={() => setEditingSupplier(s)} className="text-slate-400 hover:text-green-400 transition p-1.5" title="Modifier">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(s.id)} className="text-slate-500 hover:text-red-400 transition p-1.5" title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-white uppercase mb-4">MODIFIER LE FOURNISSEUR</h3>
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
                <input type="email" value={editingSupplier.email || ''} onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })} className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 text-sm px-3 py-2 rounded-lg border border-slate-700 focus:outline-none" />
              </div>
              <div>
                <label className={labelCls}>ADRESSE</label>
                <input type="text" value={editingSupplier.address || ''} onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>VILLE</label>
                <input type="text" value={editingSupplier.city || ''} onChange={e => setEditingSupplier({ ...editingSupplier, city: e.target.value })} className={inputCls} />
              </div>

              <div className="pt-4 mt-2 border-t border-slate-800">
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

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800">
                <input type="checkbox" checked={editingSupplier.isActive} onChange={e => setEditingSupplier({ ...editingSupplier, isActive: e.target.checked })} id="edit-supplier-active" className="rounded" />
                <label htmlFor="edit-supplier-active" className="font-bold text-white uppercase select-none">FOURNISSEUR ACTIF</label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingSupplier(null)} className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider">ANNULER</button>
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
    const itemsToSearch = compItems.filter(it => it.reference.trim() !== '');
    if (itemsToSearch.length === 0) {
      alert('VEUILLEZ RENSEIGNER AU MOINS UNE RÉFÉRENCE ARTICLE');
      return;
    }

    setB2bLoading(true);
    try {
      for (const suppId of selectedSuppIds) {
        for (let i = 0; i < compItems.length; i++) {
          const item = compItems[i];
          if (!item.reference.trim()) continue;

          // Call the API endpoint
          try {
            const res = await fetch('/api/b2b/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ supplierId: suppId, reference: item.reference })
            });
            const data = await res.json();
            if (data.success && data.data) {
              const { price, discount, available } = data.data;
              if (available) {
                // Update state directly for this cell
                setCompPrices(prev => ({
                  ...prev,
                  [suppId]: {
                    ...(prev[suppId] || {}),
                    [i]: { price, discount }
                  }
                }));
              }
            }
          } catch (err) {
            console.error(`Error searching B2B for ${item.reference} at ${suppId}`, err);
          }
        }
      }
    } finally {
      setB2bLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-green-400" /> CONSULTATION FOURNISSEURS
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-4">LANCEZ DES CONSULTATIONS ET CRÉEZ VOS BONS DE COMMANDE</p>

      {/* Onglets */}
      <div className="flex gap-2 mb-4 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('order')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition ${
            activeTab === 'order' ? 'bg-green-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          📝 Bon de Commande
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition ${
            activeTab === 'comparison' ? 'bg-green-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
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
              <button onClick={() => setSavedOrder(null)} className="text-slate-400 hover:text-white">
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
                  className="w-full bg-slate-900/60 text-slate-100 border border-slate-700 font-black text-sm px-3 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-green-500 uppercase">
                  <option value="">-- CHOISIR UN FOURNISSEUR --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              {supplier && (
                <div className="bg-slate-900/60 rounded-lg p-3 text-xs">
                  <p className="font-black text-white uppercase">{supplier.name}</p>
                  {supplier.phone && <p className="text-slate-400 uppercase font-sans">TÉL: {supplier.phone}</p>}
                  {supplier.email && <p className="text-slate-400 font-sans">{supplier.email}</p>}
                  {supplier.city && <p className="text-slate-500 uppercase">{supplier.city}</p>}
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
                  <tr className="bg-slate-900/60 text-[10px] font-black uppercase text-slate-400">
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
                      <tr key={i} className="border-b border-slate-800/50">
                        <td className="px-2 py-2 relative">
                          <input type="text" value={it.reference} 
                            onChange={e => {
                              updateItem(i, 'reference', e.target.value);
                              setActiveSuggestRow(i);
                              setActiveSuggestField('ref');
                            }}
                            onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('ref'); }}
                            onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                            className="w-full bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded border border-slate-700 focus:outline-none uppercase min-w-[90px]" placeholder="RÉF." />
                          {activeSuggestRow === i && activeSuggestField === 'ref' && getSuggestions(it.reference, 'ref').length > 0 && (
                            <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-900/60 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
                              {getSuggestions(it.reference, 'ref').map((p: any) => (
                                <button key={p.id} type="button"
                                  onClick={() => {
                                    updateItem(i, 'reference', p.reference || '');
                                    updateItem(i, 'designation', p.name || '');
                                    if (p.costPrice) updateItem(i, 'unitPrice', p.costPrice);
                                    else if (p.price) updateItem(i, 'unitPrice', p.price);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between gap-2">
                                  <span className="text-red-400 font-mono font-bold shrink-0">{p.reference}</span>
                                  <span className="text-slate-400 text-[10px] truncate">{p.name}</span>
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
                            className="w-full bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded border border-slate-700 focus:outline-none uppercase min-w-[160px]" placeholder="DÉSIGNATION" />
                          {activeSuggestRow === i && activeSuggestField === 'desc' && getSuggestions(it.designation, 'desc').length > 0 && (
                            <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-900/60 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
                              {getSuggestions(it.designation, 'desc').map((p: any) => (
                                <button key={p.id} type="button"
                                  onClick={() => {
                                    updateItem(i, 'reference', p.reference || '');
                                    updateItem(i, 'designation', p.name || '');
                                    if (p.costPrice) updateItem(i, 'unitPrice', p.costPrice);
                                    else if (p.price) updateItem(i, 'unitPrice', p.price);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between gap-2">
                                  <span className="text-white truncate max-w-[140px]">{p.name}</span>
                                  <span className="text-red-400 font-mono text-[9px] shrink-0">{p.reference}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.quantity} min={1} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-14 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded border border-slate-700 focus:outline-none text-center" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.unitPrice} min={0} step={0.001} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded border border-slate-700 focus:outline-none text-right" placeholder="0.000" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.discount} min={0} max={100} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded border border-slate-700 focus:outline-none text-center" placeholder="0" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.tva} min={0} max={100} onChange={e => updateItem(i, 'tva', parseFloat(e.target.value) || 19)}
                            className="w-16 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded border border-slate-700 focus:outline-none text-center" placeholder="19" />
                        </td>
                        <td className="px-2 py-2 text-right font-black text-cyan-400">{lineTTC.toFixed(3)} TND</td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => removeLine(i)} className="text-slate-500 hover:text-red-400 p-1 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-3 pt-3 border-t border-slate-800">
              <div className="text-right space-y-1 text-xs">
                <p className="text-slate-450 uppercase font-bold">TOTAL BRUT HT : <span className="text-white font-mono font-black ml-2">{subtotalHT.toFixed(3)} TND</span></p>
                <p className="text-red-400 uppercase font-bold">TOTAL REMISE : <span className="font-mono font-black ml-2">-{totalDiscount.toFixed(3)} TND</span></p>
                <p className="text-slate-450 uppercase font-bold">TOTAL NET HT : <span className="text-white font-mono font-black ml-2">{totalHTNet.toFixed(3)} TND</span></p>
                <p className="text-slate-450 uppercase font-bold">TOTAL TVA : <span className="text-white font-mono font-black ml-2">{totalTva.toFixed(3)} TND</span></p>
                <p className="text-amber-450 uppercase font-black text-base border-t border-slate-800 pt-1.5 mt-1.5">TOTAL TTC : <span className="font-mono ml-2">{totalTTC.toFixed(3)} TND</span></p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className={cardCls}>
            <label className={labelCls}>NOTES / CONDITIONS</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 text-sm px-3 h-10 rounded-lg border border-slate-700 focus:outline-none resize-none" placeholder="Délai de livraison, conditions paiement..." />
          </div>

          <div className="flex gap-2 flex-wrap">
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
              className="flex items-center gap-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-black uppercase transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'CRÉATION...' : 'CRÉER & ENREGISTRER PO'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="space-y-4">
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400">1. SÉLECTIONNER LES FOURNISSEURS À COMPARER</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSuppIds(suppliers.filter(s => s.b2bLogin && s.b2bPassword).map(s => s.id))}
                  className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] font-black uppercase rounded-lg transition"
                >
                  ✅ TOUT SÉLECTIONNER B2B
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSuppIds([])}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black uppercase rounded-lg transition"
                >
                  ✖ EFFACER
                </button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {suppliers.filter(s => s.b2bLogin && s.b2bPassword).length > 0 ? (
                suppliers.filter(s => s.b2bLogin && s.b2bPassword).map(s => (
                  <label key={s.id} className="flex items-center gap-2 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800 cursor-pointer text-xs font-black uppercase text-white hover:border-cyan-500/50 select-none">
                    <input type="checkbox" checked={selectedSuppIds.includes(s.id)} onChange={() => handleToggleSupplier(s.id)} className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-900" />
                    🤖 {s.name}
                  </label>
                ))
              ) : (
                <p className="text-slate-500 font-bold uppercase text-[10px]">Aucun fournisseur B2B configuré. Veuillez renseigner les identifiants dans la fiche fournisseur.</p>
              )}
            </div>
          </div>

          <div className={cardCls}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400">2. SAISIR LES ARTICLES À CONSULTER</div>
              <div className="flex gap-2">
                <button onClick={handleB2BSearch} disabled={b2bLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-black uppercase rounded-lg transition disabled:opacity-50 font-sans shadow-[0_0_15px_rgba(8,145,178,0.4)]">
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
                  <tr className="bg-slate-900/60 text-[10px] font-black uppercase text-slate-400">
                    <th className="px-3 py-2.5 text-left rounded-l-lg">DÉSIGNATION ARTICLE *</th>
                    <th className="px-3 py-2.5 text-left">RÉFÉRENCE</th>
                    <th className="px-3 py-2.5 text-center">QTÉ</th>
                    <th className="px-3 py-2.5 text-center rounded-r-lg">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {compItems.map((it, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="px-2 py-2 relative">
                        <input type="text" value={it.designation} 
                          onChange={e => {
                            updateCompItem(i, 'designation', e.target.value);
                            setActiveSuggestRow(i);
                            setActiveSuggestField('desc');
                          }} 
                          onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('desc'); }}
                          onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                          className="w-full bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded border border-slate-700 focus:outline-none uppercase min-w-[160px]" placeholder="DÉSIGNATION ARTICLE" />
                        {activeSuggestRow === i && activeSuggestField === 'desc' && getSuggestions(it.designation, 'desc').length > 0 && (
                          <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-900/60 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
                            {getSuggestions(it.designation, 'desc').map((p: any) => (
                              <button key={p.id} type="button"
                                onClick={() => {
                                  updateCompItem(i, 'reference', p.reference || '');
                                  updateCompItem(i, 'designation', p.name || '');
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between gap-2">
                                <span className="text-white truncate max-w-[140px]">{p.name}</span>
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
                          className="w-full bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded border border-slate-700 focus:outline-none uppercase min-w-[90px]" placeholder="RÉF." />
                        {activeSuggestRow === i && activeSuggestField === 'ref' && getSuggestions(it.reference, 'ref').length > 0 && (
                          <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-900/60 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
                            {getSuggestions(it.reference, 'ref').map((p: any) => (
                              <button key={p.id} type="button"
                                onClick={() => {
                                  updateCompItem(i, 'reference', p.reference || '');
                                  updateCompItem(i, 'designation', p.name || '');
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between gap-2">
                                <span className="text-red-400 font-mono font-bold shrink-0">{p.reference}</span>
                                <span className="text-slate-400 text-[10px] truncate">{p.name}</span>
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
                        <input type="number" value={it.quantity} min={1} onChange={e => updateCompItem(i, 'quantity', parseInt(e.target.value) || 1)} className="w-14 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-2 h-10 rounded border border-slate-700 focus:outline-none text-center tabular-nums" />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeCompLine(i)} className="text-slate-500 hover:text-red-400 p-1 transition">
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
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-4 border-b border-slate-800 pb-2">3. TABLEAU COMPARATIF DES OFFRES</div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 text-[10px] font-black uppercase text-slate-500 border-b border-slate-855">
                      <th className="px-4 py-3">ARTICLE</th>
                      {selectedSuppIds.map(id => {
                        const s = suppliers.find(x => x.id === id);
                        return <th key={id} className="px-4 py-3 text-center text-white">{s?.name.toUpperCase()}</th>;
                      })}
                      <th className="px-4 py-3 text-right text-green-450">MEILLEURE OFFRE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compItems.map((it, idx) => {
                      if (!it.designation) return null;
                      const { minPrice, bestSuppId } = getLowestPriceInfo(idx);
                      return (
                        <tr key={idx} className="border-b border-slate-855 hover:bg-slate-900/60/10">
                          <td className="px-4 py-3">
                            <span className="font-bold text-white uppercase">{it.designation}</span>
                            {it.reference && <span className="block text-[10px] text-slate-400">REF: {it.reference.toUpperCase()}</span>}
                          </td>
                          {selectedSuppIds.map(id => {
                            const valObj = compPrices[id]?.[idx] || { price: 0, discount: 0 };
                            const isCheapest = bestSuppId === id && minPrice !== null;
                            return (
                              <td key={id} className={`px-4 py-3 text-center transition ${isCheapest ? 'bg-green-500/10' : ''}`}>
                                <div className="flex flex-col gap-1 items-center justify-center">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">P.U.</span>
                                    <input type="number" min={0} step={0.001} value={valObj.price || ''} onChange={e => handlePriceChange(id, idx, 'price', parseFloat(e.target.value) || 0)} className="w-20 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-center text-xs px-1.5 py-1 rounded border border-slate-350 focus:outline-none tabular-nums" placeholder="0.000" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">REM%</span>
                                    <input type="number" min={0} max={100} step={1} value={valObj.discount || ''} onChange={e => handlePriceChange(id, idx, 'discount', parseFloat(e.target.value) || 0)} className="w-20 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-center text-xs px-1.5 py-1 rounded border border-slate-350 focus:outline-none tabular-nums" placeholder="0%" />
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
                    <tr className="bg-slate-900/60/60 font-black border-t border-slate-800">
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
                      <td className="px-4 py-3.5 text-right text-slate-500">-</td>
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
          price: editingProduct.price
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
        const venteIdx = findCol('PRIX VENTE', 'VENTE', 'PV');

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
            designation: designation || 'ARTICLE ' + reference,
            stock:         qteIdx   !== -1 ? parseInt(String(row[qteIdx] || '0')) || 0 : 0,
            brand:         mrqIdx   !== -1 ? String(row[mrqIdx]  || '').trim() : '',
            vehicleCompat: vehIdx   !== -1 ? String(row[vehIdx]  || '').trim() : '',
            costPrice:     coutIdx  !== -1 ? parseNum(row[coutIdx])  : 0,
            sellingPrice:  venteIdx !== -1 ? parseNum(row[venteIdx]) : 0,
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
          <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" /> AJOUTER UN NOUVEL ARTICLE
          </h2>
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">SÉLECTIONNEZ LE MODE D'ENTRÉE DES NOUVELLES PIÈCES</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulaire Saisie manuelle */}
            <div className={cardCls}>
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-4 border-b border-slate-800 pb-2">SAISIE MANUELLE</div>
              
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

                <button onClick={handleManualSubmit} className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-cyan-600/20">
                  💾 ENREGISTRER L'ARTICLE
                </button>
              </div>
            </div>

            {/* Importation Excel / CSV */}
            <div className={cardCls}>
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-4 border-b border-slate-800 pb-2">IMPORTER DEPUIS UN FICHIER EXCEL (CSV)</div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed uppercase">
                IMPORTEZ DES CENTAINES DE PIÈCES D'UN SEUL COUP. LE FICHIER CSV DOIT EN TÊTE DES COLONNES COMPORTER :<br />
                <code className="bg-slate-900/60 px-1.5 py-0.5 rounded text-[10px] text-cyan-400 font-mono tracking-normal block mt-2 text-center uppercase">REFERENCE | DESIGNATION | QTE | MARQUE | VEHICULES CONCERNEES | COUT REVIENT | PRIX VENTE</code>
              </p>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:border-cyan-500/50 transition">
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleCsvUpload} className="hidden" id="csv-file-upload" />
                  <label htmlFor="csv-file-upload" className="cursor-pointer block">
                    <Package className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                    <div className="text-xs font-black text-slate-300 uppercase">SÉLECTIONNER UN FICHIER EXCEL OU CSV</div>
                    <div className="text-[9px] text-slate-555 mt-1 uppercase">FORMATS ACCEPTÉS : .XLSX, .XLS, .CSV</div>
                  </label>
                </div>

                {csvFile && (
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
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
          <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" /> GESTION DU STOCK DE PIÈCES
          </h2>
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">RECHERCHEZ, MODIFIEZ ET SUPPRIMEZ LES ARTICLES DU STOCK DE PIÈCES</p>

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="RECHERCHER DANS LES ARTICLES (RÉF, NOM, MARQUE, VÉHICULE)..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-700 focus:outline-none focus:border-slate-500 uppercase placeholder:normal-case placeholder:font-normal" />
            </div>
          </div>

          {editingProduct && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full text-left relative">
                <button onClick={() => setEditingProduct(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/60/60 border border-slate-800 transition">
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-base font-black text-white mb-4 uppercase tracking-widest text-cyan-400">ÉDITER LA PIÈCE</h3>
                
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
                    <button onClick={() => setEditingProduct(null)} className="flex-1 py-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-xs font-black uppercase">ANNULER</button>
                    <button onClick={handleEditSubmit} className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase">ENREGISTRER MODIFICATIONS</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-slate-500 font-bold uppercase">CHARGEMENT DES PIÈCES DU STOCK...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-650 font-bold uppercase">AUCUN ARTICLE TROUVÉ</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-900/60 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
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
                    {filtered.map(p => (
                      <tr key={p.id} className="border-b border-slate-850 hover:bg-slate-900/60/20 transition">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-300">{p.reference}</td>
                        <td className="px-4 py-2.5 font-bold text-white uppercase">{p.name}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-400 uppercase">{p.brand || '-'}</td>
                        <td className="px-4 py-2.5 text-slate-400 uppercase">{p.vehicleCompat || '-'}</td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-300">{p.stock}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-red-450/90">{(p.costPrice || p.oldPrice || 0).toFixed(2)} TND</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-green-400">{p.price.toFixed(2)} TND</td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button onClick={() => setEditingProduct(p)} className="p-1.5 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-600 hover:text-white rounded-lg border border-cyan-500/10 transition">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(p.slug)} className="p-1.5 bg-red-950/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg border border-red-500/10 transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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

// ─── SECTION: DEVIS GÉNÉRÉS (HISTORIQUE ET TÉLÉCHARGEMENT) ───────────────────
interface SectionDevisGeneresProps {
  onEditDevis?: (d: any) => void;
}

function SectionDevisGeneres({ onEditDevis }: SectionDevisGeneresProps) {
  const [devisList, setDevisList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDevis = () => {
    setLoading(true);
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
  }, []);

  const handleAssignDevis = async (devisId: string, name: string) => {
    try {
      const res = await fetch('/api/devis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisId, managedByName: name })
      });
      if (res.ok) {
        fetchDevis();
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
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <FileText className="w-5 h-5 text-red-400" /> DEVIS GÉNÉRÉS & TRAITÉS
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">CONSULTEZ, MODIFIEZ ET EXPÉDIEZ VOS DEVIS DÉJÀ CHIFFRÉS</p>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="RECHERCHER PAR EMAIL CLIENT, VEHICULE..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-700 focus:outline-none focus:border-slate-500 uppercase placeholder:normal-case placeholder:font-normal" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 font-bold uppercase">CHARGEMENT DES DEVIS...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-600 font-bold uppercase">AUCUN DEVIS TROUVÉ</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(d => {
            const seqNum = getSeqNum(d);
            return (
            <div key={d.id} className={cardCls}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-slate-800/40">
                <div>
                  <span className="font-mono text-amber-400 font-black text-sm uppercase">#DEV-{seqNum}</span>
                  <h4 className="font-black text-white uppercase text-sm mt-0.5">{d.clientEmail}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">VÉHICULE: {d.vehicleBrand?.toUpperCase()} {d.vehicleModel?.toUpperCase()} · CRÉÉ LE: {new Date(d.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">MONTANT TOTAL TTC</span>
                    <span className="font-black text-white text-base font-mono">{(d.totalPrice || 0).toFixed(3)} TND</span>
                  </div>
                  {/* Sélecteur de profil admin */}
                  <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-xl px-2.5 py-1">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Assigné à :</span>
                    <select
                      value={d.managedBy?.name?.toUpperCase() || 'NON ASSIGNÉ'}
                      onChange={(e) => handleAssignDevis(d.id, e.target.value)}
                      className="bg-transparent text-slate-200 font-bold text-[9px] focus:outline-none cursor-pointer uppercase"
                    >
                      <option value="NON ASSIGNÉ" className="bg-slate-900 text-slate-500">NON ASSIGNÉ</option>
                      <option value="SAIF" className="bg-slate-900 text-white">SAIF</option>
                      <option value="AMINE" className="bg-slate-900 text-white">AMINE</option>
                      <option value="SAIFALLAH" className="bg-slate-900 text-white">SAIFALLAH</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-slate-900/60/40 p-4 rounded-2xl border border-slate-800/60 mb-4 text-xs">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">ARTICLES DU DEVIS :</span>
                {d.items?.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="flex justify-between items-center border-b border-slate-800/20 pb-1.5 last:border-0 last:pb-0 mb-1.5 last:mb-0">
                    <span className="text-slate-355 uppercase font-bold">{item.name} {item.reference && `(${item.reference.toUpperCase()})`}</span>
                    <span className="font-black text-slate-400 font-mono">x{item.quantity} | {item.price.toFixed(3)} TND</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                {onEditDevis && (
                  <button 
                    onClick={() => onEditDevis(d)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase rounded-xl transition shadow shadow-amber-600/20"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> MODIFIER LE DEVIS
                  </button>
                )}
                <button onClick={() => handleDownloadPDF(d)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase rounded-xl transition">
                  <Download className="w-3.5 h-3.5" /> PDF CLIENT
                </button>
                <button onClick={() => handleDownloadExcel(d)} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase rounded-xl transition">
                  <Download className="w-3.5 h-3.5" /> EXCEL CLIENT
                </button>
                <button onClick={() => handleDownloadSupplierPDF(d)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl transition border border-indigo-400/30 shadow-lg shadow-indigo-600/20" title="Télécharger l'offre / demande de prix au nom d'un fournisseur spécifique (PDF)">
                  <FileText className="w-3.5 h-3.5" /> PDF FOURNISSEUR
                </button>
                <button onClick={() => handleDownloadSupplierExcel(d)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black uppercase rounded-xl transition border border-emerald-400/30 shadow-lg shadow-emerald-700/20" title="Télécharger l'offre / demande de prix au nom d'un fournisseur spécifique (Excel/CSV)">
                  <FileText className="w-3.5 h-3.5" /> EXCEL FOURNISSEUR
                </button>
                <button 
                  onClick={async () => {
                    if (confirm("Voulez-vous vraiment supprimer ce devis généré ?")) {
                      try {
                        const res = await fetch(`/api/devis?id=${d.id}`, { method: 'DELETE' });
                        if (res.ok) {
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/15 hover:bg-red-500 hover:text-white text-red-400 rounded-xl text-xs font-black uppercase tracking-wide transition border border-red-500/20"
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
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-purple-400" /> BONS DE COMMANDE & LIVRAISONS
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">CONSULTATION, MODIFICATION ET SUPPRESSION DES BONS DE COMMANDE CLIENTS</p>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="RECHERCHER PAR N° COMMANDE, NOM CLIENT, EMAIL..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-700 focus:outline-none focus:border-slate-500 uppercase placeholder:normal-case placeholder:font-normal" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 font-bold uppercase">CHARGEMENT DES BONS DE COMMANDE...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-600 font-bold uppercase">AUCUNE COMMANDE TROUVÉE</div>
      ) : (
        filtered.map(o => (
          <div key={o.id} className={cardCls}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-slate-800/40">
              <div>
                <span className="font-mono text-green-400 font-black text-sm uppercase">#{o.orderNumber}</span>
                <h4 className="font-black text-white uppercase text-sm mt-0.5">{o.user?.name || `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim() || 'CLIENT'}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-sans">{o.user?.email} · CRÉÉ LE: {new Date(o.createdAt).toLocaleDateString('fr-FR')}</p>
                {o.shippingAddress && <p className="text-[10px] text-cyan-400 mt-1 uppercase font-bold">📍 ADRESSE: {o.shippingAddress.street || o.shippingAddress}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">MONTANT TOTAL TTC</span>
                    <span className="font-black text-white text-base font-mono">{o.total.toFixed(3)} TND</span>
                  </div>
                  <button
                    onClick={() => handleDeleteOrder(o.id)}
                    title="Supprimer ce bon de commande"
                    className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl border border-red-500/40 transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Sélecteur de profil admin */}
                <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-xl px-2.5 py-1">
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Assigné à :</span>
                  <select
                    value={o.managedBy?.name?.toUpperCase() || 'NON ASSIGNÉ'}
                    onChange={(e) => handleAssignOrder(o.id, e.target.value)}
                    className="bg-transparent text-slate-200 font-bold text-[9px] focus:outline-none cursor-pointer uppercase"
                  >
                    <option value="NON ASSIGNÉ" className="bg-slate-900 text-slate-500">NON ASSIGNÉ</option>
                    <option value="SAIF" className="bg-slate-900 text-white">SAIF</option>
                    <option value="AMINE" className="bg-slate-900 text-white">AMINE</option>
                    <option value="SAIFALLAH" className="bg-slate-900 text-white">SAIFALLAH</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Articles list */}
            <div className="bg-slate-900/60/40 p-4 rounded-2xl border border-slate-800/60 mb-4 text-xs">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">ARTICLES DU BON DE COMMANDE :</span>
              {o.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center border-b border-slate-800/20 pb-1.5 last:border-0 last:pb-0 mb-1.5 last:mb-0">
                  <span className="text-slate-355 uppercase font-bold">{item.productName}</span>
                  <span className="font-black text-slate-400 font-mono">x{item.quantity} | {item.price.toFixed(3)} TND</span>
                </div>
              ))}
            </div>

            {/* Formulaire statut préparé par admin */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className={labelCls}>STATUT DE LIVRAISON</label>
                <select 
                  value={statusMap[o.id] || o.status}
                  onChange={e => setStatusMap({...statusMap, [o.id]: e.target.value})}
                  className="w-full bg-slate-900/60 text-slate-100 border border-slate-700 font-black text-xs px-3 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500 uppercase"
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
                  className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 text-xs px-3 h-10 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-500 uppercase"
                />
              </div>
              <div>
                <button 
                  onClick={() => handleUpdateStatus(o.id)}
                  disabled={updatingId === o.id}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow shadow-purple-650/20 disabled:opacity-50 font-sans"
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
  const [stats, setStats] = useState({ quotes: 0, orders: 0, suppliers: 0, products: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/quotes').then(r => r.json()),
      fetch('/api/orders?limit=1').then(r => r.json()),
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/products?limit=1').then(r => r.json()),
    ]).then(([q, o, s, p]) => {
      setStats({
        quotes: Array.isArray(q) ? q.length : 0,
        orders: o.pagination?.total || 0,
        suppliers: s.data?.length || 0,
        products: p.pagination?.total || 0,
      });
    });
  }, []);

  const cards = [
    { label: 'DEMANDES EN ATTENTE', value: stats.quotes, color: 'from-red-600 to-red-400', icon: FileText },
    { label: 'BONS DE COMMANDE', value: stats.orders, color: 'from-blue-600 to-blue-400', icon: ShoppingBag },
    { label: 'FOURNISSEURS', value: stats.suppliers, color: 'from-green-600 to-green-400', icon: Building2 },
    { label: 'ARTICLES EN STOCK', value: stats.products, color: 'from-amber-600 to-amber-400', icon: Package },
  ];

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-pink-400" /> TABLEAU DE BORD
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">VUE D'ENSEMBLE DE VOTRE ACTIVITÉ</p>

      <div className="isometric-container grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 pt-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className={`isometric-card bg-gradient-to-br ${c.color} rounded-3xl p-6 text-white border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-sm`}>
              {/* Subtle grid pattern overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
              <div className="relative z-10">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 border border-white/10">
                  <Icon className="w-5 h-5 opacity-90" />
                </div>
                <div className="text-4xl font-black mb-1 tracking-tight">{c.value}</div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest opacity-85">{c.label}</div>
              </div>
            </div>
          );
        })}
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
    DRAFT: 'bg-slate-800 text-slate-400 border-slate-700',
    SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    CONFIRMED: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    RECEIVED: 'bg-green-500/15 text-green-400 border-green-500/20',
  };

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <Clock className="w-5 h-5 text-green-400" /> SUIVI PO & LIVRAISONS
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">CONSULTATION, SUIVI ET SUPPRESSION DES BONS DE COMMANDE FOURNISSEURS</p>

      <div className={cardCls}>
        {loading ? (
          <div className="text-center py-8 text-slate-500 font-bold uppercase animate-pulse">Chargement...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-slate-600 font-bold uppercase">Aucune commande fournisseur trouvée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-900/60 text-[10px] font-black uppercase text-slate-400">
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
                  <tr key={o.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-black text-red-450 text-sm">#{o.orderNumber}</td>
                    <td className="px-4 py-3 font-black text-white uppercase">{o.supplier?.name}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">{o.totalAmount.toFixed(3)} TND</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${statusColors[o.status] || 'bg-slate-800'}`}>
                        {o.status === 'RECEIVED' ? '✓ LIVRÉ' : o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setSelectedOrder(o)}
                        className="chrome-gloss px-3 py-1.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 text-slate-200 text-[10px] font-black uppercase rounded-lg transition"
                      >
                        Détails
                      </button>
                      {o.status !== 'RECEIVED' ? (
                        <select 
                          value={o.status}
                          onChange={e => handleUpdateStatus(o.id, e.target.value)}
                          className="bg-slate-900/60 text-white border border-slate-800 rounded-lg text-[10px] font-black uppercase p-1.5 focus:outline-none focus:border-slate-500"
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
                        className="p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg border border-red-500/40 transition-colors ml-1"
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative text-slate-100">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-white uppercase mb-1">Détails Commande #{selectedOrder.orderNumber}</h3>
            <p className="text-slate-400 text-xs uppercase mb-4">Fournisseur : {selectedOrder.supplier?.name} | Date : {new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR')}</p>

            <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-800 rounded-2xl mb-4">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-900/60 text-[10px] font-black text-slate-400 uppercase">
                    <th className="px-3 py-2">Référence</th>
                    <th className="px-3 py-2">Désignation</th>
                    <th className="px-3 py-2 text-center">Qté</th>
                    <th className="px-3 py-2 text-right">P.U. HT</th>
                    <th className="px-3 py-2 text-right rounded-r-lg">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-800/40">
                      <td className="px-3 py-2 font-mono text-red-400 font-bold">{item.reference || 'N/A'}</td>
                      <td className="px-3 py-2 text-white uppercase">{item.designation}</td>
                      <td className="px-3 py-2 text-center text-slate-300 font-bold">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-slate-300">{item.unitPrice.toFixed(3)} TND</td>
                      <td className="px-3 py-2 text-right text-cyan-400 font-bold">{item.total.toFixed(3)} TND</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Statut Actuel</span>
                <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusColors[selectedOrder.status]}`}>
                  {selectedOrder.status === 'RECEIVED' ? '✓ LIVRÉ' : selectedOrder.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Montant Total</span>
                <span className="text-lg font-black text-amber-450 font-mono">{selectedOrder.totalAmount.toFixed(3)} TND</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="mt-3 p-3 bg-slate-800/50 rounded-xl border border-slate-800 text-slate-300 text-xs normal-case">
                <strong>Notes:</strong> {selectedOrder.notes}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {selectedOrder.status !== 'RECEIVED' && (
                <button 
                  onClick={() => {
                    handleUpdateStatus(selectedOrder.id, 'RECEIVED');
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase rounded-xl transition"
                >
                  ✓ Marquer comme Livré
                </button>
              )}
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-black uppercase rounded-xl transition"
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
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-purple-400" /> SERVICE COMPTABILITÉ
      </h2>
      <p className="text-slate-450 text-xs uppercase tracking-wider mb-5">GESTION DES FACTURES CLIENTS ET ENCAISSEMENTS</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="RECHERCHER PAR CLIENT, EMAIL, FACTURE..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-700 focus:outline-none focus:border-slate-500 uppercase placeholder:normal-case placeholder:font-normal" />
        </div>
        <button
          onClick={() => setShowOnlyDelivered(!showOnlyDelivered)}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
            showOnlyDelivered 
              ? 'bg-red-650/15 border-red-500 text-white' 
              : 'bg-slate-900/60 text-slate-100 border border-slate-700 border-slate-700'
          }`}
        >
          {showOnlyDelivered ? '✓ Uniquement Livrées (Facturées)' : 'Toutes les commandes'}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-bold uppercase animate-pulse">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-600 font-bold uppercase">Aucune facture disponible</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60/40 text-[9px] font-black text-slate-400 uppercase tracking-widest">
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
                    <tr key={o.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-black text-red-400 text-sm">#{ref}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white uppercase text-xs">{o.user?.name || `${o.user?.firstName} ${o.user?.lastName}`}</div>
                        <div className="text-[9px] text-slate-500">{o.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-450 uppercase">{new Date(o.updatedAt).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-xs text-slate-450 font-mono font-bold uppercase">{o.shippingCost > 0 ? `${o.shippingCost.toFixed(3)} TND` : 'GRATUIT'} ({shippingMethod})</td>
                      <td className="px-4 py-3 text-right font-bold text-white font-mono text-sm">{o.total.toFixed(3)} TND</td>
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
                          className="chrome-gloss px-3 py-1.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 text-slate-200 text-[10px] font-black uppercase rounded-lg transition flex items-center gap-1"
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

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(d => {
      const sups = (d.data || []).filter((s: any) => s.b2bLogin && s.b2bPassword);
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

  const b2bSuppliers = suppliers.filter(s => s.b2bLogin && s.b2bPassword);

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
    if (!query.trim() || selectedSupplierIds.length === 0) return;
    setLoading(true);
    setResult(null);

    const targetSuppliers = b2bSuppliers.filter(s => selectedSupplierIds.includes(s.id));
    const statuses: Record<string, string> = {};
    targetSuppliers.forEach(s => { statuses[s.id] = 'loading'; });
    setSupplierStatuses({ ...statuses });

    const allBreakdown: any[] = [];
    const allItems: any[] = [];

    await Promise.all(targetSuppliers.map(async (s: any) => {
      try {
        const res = await fetch('/api/b2b/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplierId: s.id, query: query.trim() })
        });
        const data = await res.json();
        if (data.success && data.data) {
          const items = data.data.items || [];
          const hasItems = items.length > 0;
          const code = data.data.statusCode;
          if (hasItems) statuses[s.id] = 'found';
          else if (code === 'ERROR' || code === 'TIMEOUT') statuses[s.id] = 'error';
          else if (data.data.availability) statuses[s.id] = 'info';
          else statuses[s.id] = 'empty';
          setSupplierStatuses({ ...statuses });
          allBreakdown.push({ ...data.data, supplierName: s.name, supplierId: s.id });
          if (hasItems) {
            const taggedItems = items.map((it: any) => ({ ...it, supplierName: s.name }));
            allItems.push(...taggedItems);
          }
        } else {
          statuses[s.id] = 'error';
          setSupplierStatuses({ ...statuses });
          allBreakdown.push({ supplierName: s.name, supplierId: s.id, items: [], availability: data.error || 'Non trouvé', available: false, price: 0, discount: 0 });
        }
      } catch {
        statuses[s.id] = 'error';
        setSupplierStatuses({ ...statuses });
        allBreakdown.push({ supplierName: s.name, supplierId: s.id, items: [], availability: 'Erreur réseau', available: false, price: 0, discount: 0 });
      }
    }));

    const best = allItems.find((i: any) => i.available) || allItems[0] || null;
    setResult({
      success: true,
      isMulti: true,
      data: {
        items: allItems,
        suppliersBreakdown: allBreakdown,
        price: best?.price || 0,
        discount: best?.discount || 0,
        available: best?.available || false,
        stock: best?.rawStock || 0,
        availability: best ? (best.available ? 'Disponible' : 'Sur Commande') : 'Non trouvé'
      }
    });
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
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <Package className="w-5 h-5 text-cyan-400" /> 🤖 ROBOT B2B MULTI-FOURNISSEURS
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">SÉLECTIONNEZ VOS FOURNISSEURS ET SAISISSEZ UNE RÉFÉRENCE OU MOT-CLÉ</p>

      {/* Step 1 — Multi-supplier Checkboxes */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
            1. CHOISIR LES FOURNISSEURS À CONSULTER ({selectedSupplierIds.length} / {b2bSuppliers.length} SÉLECTIONNÉS)
          </div>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] font-black uppercase rounded-lg transition"
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
                    ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSupplier(s.id)}
                  className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-900 w-4 h-4"
                />
                {statusIcon && <span className="text-sm">{statusIcon}</span>}
                <span>{s.name.toUpperCase()}</span>
              </label>
            );
          })}

          {b2bSuppliers.length === 0 && (
            <p className="text-slate-500 text-xs font-bold uppercase">Aucun fournisseur B2B configuré. Renseignez les identifiants dans la fiche fournisseur.</p>
          )}
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-400">
          🌐 Recherche simultanée sur <span className="text-cyan-400 font-black">{selectedSupplierIds.length} fournisseur(s) sélectionné(s)</span> : {
            b2bSuppliers.filter(s => selectedSupplierIds.includes(s.id)).map(s => s.name.toUpperCase()).join(', ') || 'Aucun'
          }
        </div>
      </div>

      {/* Step 2 — Search input */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5">
        <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-3">2. SAISIR RÉFÉRENCE OU TEXTE ARTICLE</div>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="EXEMPLE: 1611273080, 1306J5, KIT EMBRAYAGE, BOUCHON..."
            required
            className="flex-1 bg-slate-900/60 text-slate-100 border border-slate-700 font-black text-base px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 uppercase placeholder:text-slate-300 placeholder:font-normal placeholder:normal-case"
          />
          <button
            type="submit"
            disabled={loading || !query.trim() || selectedSupplierIds.length === 0}
            className="px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
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
              <div className={`flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border ${result.data.available ? 'bg-green-950/30 border-green-500/30' : 'bg-slate-900 border-slate-700'}`}>
                <div className="flex-1 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">MEILLEUR PRIX BRUT HT</div>
                  <div className="text-2xl font-black text-white">{result.data.price > 0 ? `${result.data.price.toFixed(3)} TND` : '—'}</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">REMISE</div>
                  <div className="text-2xl font-black text-cyan-400">{result.data.discount || 0}%</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">DISPONIBILITÉ & SOURCE</div>
                  <div className={`text-lg font-black ${result.data.available ? 'text-green-400' : 'text-amber-400'}`}>
                    {result.data.available ? (result.data.stock ? `${result.data.stock} EN STOCK` : 'DISPONIBLE') : (result.data.availability || 'SUR COMMANDE')}
                  </div>
                </div>
              </div>

              {/* Per-supplier breakdown */}
              {result.data.suppliersBreakdown && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    RÉSULTATS PAR FOURNISSEUR — "{query.toUpperCase()}"
                  </div>
                  <div className="space-y-2">
                    {result.data.suppliersBreakdown.map((bd: any, idx: number) => {
                      const hasItems = (bd.items || []).length > 0;
                      const bestItem = (bd.items || []).find((i: any) => i.available) || (bd.items || [])[0];
                      return (
                        <div key={idx} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold ${hasItems ? 'bg-green-950/20 border-green-700/40 text-green-300' : bd.statusCode === 'NOT_FOUND' || bd.statusCode === 'NO_STOCK' ? 'bg-amber-950/20 border-amber-800/40 text-amber-200' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-base">{hasItems ? '✅' : bd.statusCode === 'NOT_FOUND' || bd.statusCode === 'NO_STOCK' ? 'ℹ️' : '—'}</span>
                            <span className="font-black uppercase text-white">{bd.supplierName}</span>
                          </div>
                          <div className="text-right">
                            {hasItems ? (
                              <span className="text-green-400 font-black">
                                {(bd.items || []).length} article(s) trouvé(s)
                                {bestItem?.price > 0 ? ` — ${bestItem.price.toFixed(3)} TND` : ''}
                                {bestItem?.discount > 0 ? ` (-${bestItem.discount}%)` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px] font-semibold">{bd.availability || 'Référence non trouvée'}</span>
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-2">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">
                    FILTRER PAR DISPONIBILITÉ :
                  </div>

                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('ALL')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition border ${
                      availabilityFilter === 'ALL'
                        ? 'bg-cyan-600 border-cyan-500 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    🌐 TOUS ({rawItems.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('DISPONIBLE')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition border ${
                      availabilityFilter === 'DISPONIBLE'
                        ? 'bg-green-700 border-green-500 text-white shadow-md shadow-green-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-green-600/50 hover:text-white'
                    }`}
                  >
                    🟢 DISPONIBLE EN STOCK ({countAvailable})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('ARRIVAGE')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition border ${
                      availabilityFilter === 'ARRIVAGE'
                        ? 'bg-blue-700 border-blue-500 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-blue-600/50 hover:text-white'
                    }`}
                  >
                    🔵 EN ARRIVAGE ({countArrivage})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvailabilityFilter('SUR_COMMANDE')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition border ${
                      availabilityFilter === 'SUR_COMMANDE'
                        ? 'bg-amber-700 border-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-amber-600/50 hover:text-white'
                    }`}
                  >
                    🟡 SUR COMMANDE ({countCommande})
                  </button>
                </div>
              )}

              {/* Articles grid */}
              {filteredItems.length > 0 ? (
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
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

                      return (
                        <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between ${cat === 'DISPONIBLE' ? 'bg-green-950/20 border-green-500/30' : cat === 'ARRIVAGE' ? 'bg-blue-950/20 border-blue-500/30' : 'bg-slate-900 border-slate-800'}`}>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-black text-cyan-400 uppercase bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-1 rounded-md">
                                🏢 {item.supplierName || 'FOURNISSEUR B2B'}
                              </span>
                              <span className={`text-xs font-black px-2.5 py-1 rounded-md border ${badgeStyle}`}>
                                {badgeText}
                              </span>
                            </div>
                            <div className="font-black text-white text-base mb-1">
                              {item.brand ? `MARQUE : ${item.brand.toUpperCase()}` : 'MARQUE NON SPÉCIFIÉE'}
                            </div>
                            {item.description && (
                              <div className="text-xs text-slate-300 font-semibold mb-1">
                                {item.description}
                              </div>
                            )}
                            <div className="text-xs text-slate-300 font-mono mb-3">
                              REF : <span className="font-bold text-amber-400">{item.name}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                            <span className="text-xs font-bold text-slate-400">
                              REMISE : <span className="text-cyan-400">{item.discount || 0}%</span>
                            </span>
                            <span className="font-black text-lg text-emerald-400">
                              {item.price > 0 ? `${item.price.toFixed(3)} TND HT` : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : rawItems.length > 0 ? (
                <div className="p-4 bg-slate-900/60/40 rounded-xl text-center text-slate-400 font-bold text-xs uppercase">
                  Aucun article ne correspond au filtre sélectionné ({availabilityFilter}).
                </div>
              ) : (
                <div className="p-4 bg-slate-900/60/40 rounded-xl text-center text-slate-400 font-bold text-xs uppercase">
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
        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-cyan-400" /> 🚗 CONNECTEUR CATALOGUE VIN & ACCÈS DIRECTS PLATEFORMES B2B / CATALOGUES
        </h2>
        <p className="text-slate-400 text-xs uppercase tracking-wider">
          AUTHENTIFICATION SILENCIEUSE BACKEND, ACCÈS DIRECTS AUX PORTAILS ET CROISEMENT MULTICRITÈRES ÉQUIVALENTS
        </p>
      </div>

      {/* PANNEAU D'ACCÈS DIRECTS AUX PLATEFORMES EXTERNES & COMPTES ENREGISTRÉS */}
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
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
              className={`p-2 bg-slate-900/60 rounded-xl border ${item.color} hover:bg-slate-800 transition flex flex-col justify-between shadow-md text-left group`}
            >
              <span className="text-[10px] font-black uppercase truncate group-hover:underline">{item.name}</span>
              <span className="text-[8px] font-mono font-bold text-slate-400 truncate">🔑 {item.code}</span>
            </a>
          ))}
        </div>
      </div>

      {/* BARRE DE RECHERCHE MULTICRITÈRES UNIVERSELLE & SAISIE VIN */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex justify-between items-center">
          <span>1. SAISIE MULTICRITÈRES (CODE VIN, DÉSIGNATION, RÉFÉRENCE OE OU ÉQUIVALENT)</span>
          <span className="text-emerald-400 font-bold">⚡ RECHERCHE CROISÉE INTELIGENTE (DICTIONNAIRE + 14 FOURNISSEURS B2B)</span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={vinInput}
            onChange={e => setVinInput(e.target.value.toUpperCase())}
            placeholder="RECHERCHER PAR VIN, RÉFÉRENCE OE, ÉQUIVALENT (PHIRA, LPR...), OU DÉSIGNATION (ex: Pare-chocs Peugeot 208, 7401AX, VF3...)"
            className="flex-1 bg-slate-900/60 text-slate-100 border border-slate-700 font-black text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 uppercase placeholder:text-slate-400 placeholder:font-normal placeholder:normal-case"
          />
          <button
            type="button"
            disabled={loadingHeadless}
            onClick={() => {
              handleLoadHeadlessCatalog(vinInput);
              if (onTransferToRobot && vinInput.trim()) {
                onTransferToRobot(vinInput.trim());
              }
            }}
            className="px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 py-3 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {loadingHeadless ? (
              <span>RECHERCHE EN COURS...</span>
            ) : (
              <>
                <Search className="w-4 h-4" /> ⚡ RECHERCHE MULTICRITÈRES & B2B ↗
              </>
            )}
          </button>
        </div>

        {/* Saved VINs History Pills */}
        {savedVins.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
              📋 VINS ENREGISTRÉS ET CONSULTABLES NATIVEMENT :
            </span>
            <div className="flex flex-wrap gap-2">
              {savedVins.map((v) => (
                <button
                  key={v.vin}
                  onClick={() => handleSelectVin(v.vin)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 border ${
                    vinInput.toUpperCase() === v.vin.toUpperCase()
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-mono text-cyan-400">{v.vin}</span>
                  <span className="text-[10px] text-slate-400">({v.name})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Identified Vehicle Badge */}
        {catalogData && (
          <div className="bg-slate-900/60 border border-cyan-500/30 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚘</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block">VÉHICULE IDENTIFIÉ & SCHÉMAS EXTRAITS</span>
                  <span className="text-[9px] font-black bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">{catalogData.brand}</span>
                </div>
                <h3 className="text-base font-black text-white uppercase">{catalogData.model}</h3>
                <p className="text-[10px] text-slate-400">VIN : <span className="font-mono text-cyan-300 font-bold">{catalogData.vin}</span> | Source Backend : <span className="text-emerald-400 font-bold">{catalogData.sourceCatalog}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-950 text-emerald-300 text-[10px] font-black uppercase rounded border border-emerald-800">
                ✓ AFFICHAGE 100% NATIF EN BALISE &lt;IMG&gt;
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MODES D'AFFICHAGE DU CATALOGUE (NATIVE EXTRACTION OU NAVIGATEUR EN DIRECT) */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveCatalogSource('SCHEMATIC')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition border flex items-center gap-2 ${
            activeCatalogSource === 'SCHEMATIC'
              ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-lg'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span>🖼️ SCHÉMA & EXTRACTION NATIF</span>
        </button>

        <button
          onClick={() => setActiveCatalogSource('PARTSNUMBER')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition border flex items-center gap-2 ${
            activeCatalogSource === 'PARTSNUMBER'
              ? 'bg-blue-950 border-blue-500 text-blue-300 shadow-lg'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span>🚗 PARTSNUMBER LIVE (autopacc1)</span>
        </button>

        <button
          onClick={() => setActiveCatalogSource('PARTSLINK24')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition border flex items-center gap-2 ${
            activeCatalogSource === 'PARTSLINK24'
              ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-lg'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span>🔍 PARTSLINK24 LIVE (fr-247756)</span>
        </button>

        <button
          onClick={() => setActiveCatalogSource('PARTSOUQ')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition border flex items-center gap-2 ${
            activeCatalogSource === 'PARTSOUQ'
              ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-lg'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span>🖼️ PARTSOUQ LIVE ({vinInput || 'VIN'})</span>
        </button>
      </div>

      {/* Rule 4 & 5: Native Schematics Image View (Balise <img>) & Part References Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Native Image Viewer or Live Web Catalog Frame */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          
          {activeCatalogSource === 'PARTSNUMBER' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-950/60 border border-blue-500/40 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-blue-300">🚗 PORTAIL EN DIRECT PARTSNUMBER — COMPTE: <span className="font-mono text-white">autopacc1 / autopacc2</span></span>
                <a href="https://login.partsnumber.com" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg transition text-[10px]">
                  OUVRIR EN PLEIN ÉCRAN ↗
                </a>
              </div>
              <iframe src="https://login.partsnumber.com" className="w-full h-[520px] rounded-xl border border-slate-800 bg-white" title="PartsNumber Catalogue Live" />
            </div>
          )}

          {activeCatalogSource === 'PARTSLINK24' && (
            <div className="space-y-3">
              <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-cyan-300">🔍 PORTAIL EN DIRECT PARTSLINK24 — COMPTE: <span className="font-mono text-white">fr-247756</span></span>
                <a href="https://www.partslink24.com" target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-lg transition text-[10px]">
                  OUVRIR EN PLEIN ÉCRAN ↗
                </a>
              </div>
              <iframe src="https://www.partslink24.com" className="w-full h-[520px] rounded-xl border border-slate-800 bg-white" title="PartsLink24 Catalogue Live" />
            </div>
          )}

          {activeCatalogSource === 'PARTSOUQ' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-amber-300">🖼️ RECHERCHE EN DIRECT PARTSOUQ VIN : <span className="font-mono text-white">{vinInput}</span></span>
                <a href={`https://partsouq.com/en/search/all?q=${encodeURIComponent(vinInput)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg transition text-[10px]">
                  OUVRIR EN PLEIN ÉCRAN ↗
                </a>
              </div>
              <iframe src={`https://partsouq.com/en/search/all?q=${encodeURIComponent(vinInput)}`} className="w-full h-[520px] rounded-xl border border-slate-800 bg-white" title="PartSouq Live Search" />
            </div>
          )}

          {activeCatalogSource === 'SCHEMATIC' && (
            <>
              {/* Section Selection Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
                {(catalogData?.nativeSchematics || []).map((sec: any, idx: number) => (
                  <button
                    key={sec.sectionId || idx}
                    onClick={() => setSelectedSectionIndex(idx)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition flex items-center gap-2 border ${
                      selectedSectionIndex === idx
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-lg font-extrabold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>📁 {sec.title}</span>
                  </button>
                ))}
              </div>

              {/* Native Interactive Vector Schematics Viewer (Web & Electron Compatible) */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center space-y-4 relative overflow-hidden shadow-2xl">
                <div className="w-full flex justify-between items-center text-[10px] font-black text-cyan-400 uppercase tracking-widest border-b border-slate-900 pb-2">
                  <span>🖼️ SCHÉMA ÉCLATÉ INTERACTIF : {currentSection?.title}</span>
                  <span className="text-emerald-400 font-bold">⚡ RENDU DASHBOARD VELECTRON / WEB 100% ACTIF</span>
                </div>

                {/* Native Canvas with Interactive Hotspot Pins & Car Vector Schematic */}
                <div className="w-full h-[400px] bg-slate-900/90 rounded-xl border border-slate-800 relative overflow-hidden shadow-inner flex flex-col items-center justify-center p-4">
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
                              ? 'bg-emerald-500 text-white border-white animate-bounce ring-4 ring-emerald-500/40'
                              : 'bg-cyan-950 text-cyan-300 border-cyan-500 hover:bg-cyan-600 hover:text-white ring-2 ring-cyan-500/30'
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
                <div className="w-full flex flex-wrap justify-center gap-2 pt-2 border-t border-slate-800">
                  {(displayedOeItems || []).map((item: any) => {
                    const inBasket = basket.some(b => b.ref === item.ref);
                    return (
                      <button
                        key={item.pos}
                        type="button"
                        onClick={() => inBasket ? handleRemoveFromBasket(item.ref) : handleAddToBasket({ ref: item.ref, designation: item.designation, category: item.group })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black border transition flex items-center gap-1.5 ${
                          inBasket
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                            : 'bg-slate-900 text-cyan-300 border-cyan-800 hover:border-cyan-400'
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4" /> 2. RECHERCHER UNE PIÈCE DANS CE VÉHICULE
              </span>
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                {displayedOeItems.length} RÉSULTAT(S)
              </span>
            </div>

            {/* Dual Search Option Selector (Designation vs Reference Number) */}
            <div className="flex gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSearchMode('TEXT')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition ${
                  searchMode === 'TEXT'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
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
                    : 'text-slate-400 hover:text-white'
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
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
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
                className="w-full bg-slate-900/60 text-white font-bold text-xs p-3 rounded-xl border border-cyan-500/50 focus:outline-none focus:border-cyan-400 placeholder:text-slate-500 uppercase placeholder:normal-case"
              />
              {partFilterText && (
                <button
                  type="button"
                  onClick={() => setPartFilterText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white font-bold text-xs bg-slate-800 px-2 py-0.5 rounded-full"
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
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono font-black text-xs flex items-center justify-center">
                        #{item.pos}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-cyan-400 font-black text-xs">OE: #{item.ref}</span>
                          <span className="text-[9px] font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded">{item.group}</span>
                          {equivalents.length > 0 && (
                            <span className="text-[9px] font-black bg-amber-950/80 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                              ⚡ {equivalents.length} ÉQUIVALENT(S)
                            </span>
                          )}
                        </div>
                        <h4 className="text-white font-bold text-xs uppercase mt-0.5">{item.designation}</h4>
                        {/* Critical Part Verification Badge */}
                        {criticalValidation.status === 'VERIFIED' && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/90 border border-emerald-800 px-2 py-0.5 rounded-full">
                              {criticalValidation.message}
                            </span>
                            {criticalValidation.criticalSpecs && Object.entries(criticalValidation.criticalSpecs).map(([key, val]) => (
                              <span key={key} className="text-[9px] font-mono text-slate-300 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                                {key}: <strong className="text-cyan-300">{val}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onTransferToRobot) onTransferToRobot(item.ref);
                        }}
                        title="Chercher chez tous les fournisseurs B2B"
                        className="px-2.5 py-1.5 bg-indigo-900/60 hover:bg-indigo-600 text-indigo-200 hover:text-white text-[10px] font-black uppercase rounded-lg border border-indigo-500/30 transition flex items-center gap-1"
                      >
                        <Search className="w-3 h-3" /> ROBOT B2B
                      </button>

                      <button
                        type="button"
                        onClick={() => inBasket ? handleRemoveFromBasket(item.ref) : handleAddToBasket({ ref: item.ref, designation: item.designation, category: item.group })}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition flex items-center gap-1.5 flex-shrink-0 ${
                          inBasket
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-cyan-700 hover:bg-cyan-600 text-white'
                        }`}
                      >
                        {inBasket ? '✓ AJOUTÉ' : '🛒 + OE'}
                      </button>
                    </div>
                  </div>

                  {/* Render Equivalent Parts Pills & Instant Add */}
                  {equivalents.length > 0 && (
                    <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80 space-y-1.5">
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">
                        🔗 RÉFÉRENCES ÉQUIVALENTES (DICTIONNAIRE & B2B) :
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {equivalents.map((eq: any, eqIdx: number) => {
                          const eqInBasket = basket.some(b => b.ref === eq.reference);
                          return (
                            <div
                              key={eqIdx}
                              className={`px-2.5 py-1 rounded-md text-[10px] border flex items-center gap-2 transition ${
                                eqInBasket
                                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                  : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              <span className="font-extrabold text-amber-300 uppercase">{eq.brand}:</span>
                              <span className="font-mono font-bold text-white">{eq.reference}</span>
                              {eq.estimatedPrice && (
                                <span className="text-emerald-400 font-mono font-bold">{eq.estimatedPrice.toFixed(2)} TND</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (eqInBasket) {
                                    handleRemoveFromBasket(eq.reference);
                                  } else {
                                    handleAddToBasket({ ref: eq.reference, designation: `${eq.designation} (${eq.brand})`, category: item.group });
                                  }
                                }}
                                className="text-[9px] text-cyan-400 hover:text-white font-bold underline uppercase ml-1"
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
          <div className="pt-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={oeRefInput}
              onChange={e => setOeRefInput(e.target.value.toUpperCase())}
              placeholder="AJOUTER MANUELLEMENT UNE RÉFÉRENCE CARROSSERIE OU OE..."
              className="flex-1 bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none uppercase placeholder:normal-case placeholder:font-normal"
            />
            <button
              type="button"
              onClick={handleAddManualRefToBasket}
              disabled={!oeRefInput.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase rounded-xl transition disabled:opacity-40"
            >
              + AJOUTER
            </button>
          </div>
        </div>

        {/* Right 1 Col: Internal Consultation Basket & B2B Bridge */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
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
              <div className="text-center py-12 text-slate-500 text-xs font-bold uppercase border border-slate-800/50 border-dashed rounded-xl p-4">
                Votre panier de consultation est vide.<br />
                Cliquez sur 🛒 + AJOUTER sur le schéma natif pour préparer votre demande B2B.
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {basket.map((b) => (
                  <div key={b.ref} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-mono text-cyan-400 font-bold text-xs uppercase block">OE #{b.ref}</span>
                      <span className="text-[10px] text-slate-300 uppercase font-semibold line-clamp-1">{b.designation}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveFromBasket(b.ref)}
                      className="text-slate-500 hover:text-red-400 text-xs font-bold px-2 py-1"
                      title="Retirer de la liste"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              type="button"
              disabled={basket.length === 0}
              onClick={handleLaunchBasketSearch}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" /> 🚀 LANCER CONSULTATION B2B MULTI-FOURNISSEURS ({basket.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION: HISTORIQUE DES PRIX ET OFFRES DES ARTICLES ──────────────────────
function SectionHistoriquePrixArticles() {
  const [histories, setHistories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('TOUS');

  // Modals state
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    reference: '',
    supplierName: '',
    type: 'ADAPTABLE',
    purchasePrice: 0,
    sellingPrice: 0
  });

  const fetchHistories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/historique-prix');
      const data = await res.json();
      if (data.success) {
        setHistories(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistories();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette offre enregistrée de l'historique ?")) return;
    try {
      const res = await fetch(`/api/historique-prix?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistories(prev => prev.filter(h => h.id !== id));
      } else {
        alert("Erreur lors de la suppression");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch('/api/historique-prix', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem)
      });
      const data = await res.json();
      if (data.success) {
        setEditingItem(null);
        fetchHistories();
      } else {
        alert(data.error || "Erreur de mise à jour");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    if (!newItem.reference.trim()) { alert("La référence est requise"); return; }
    try {
      const res = await fetch('/api/historique-prix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: newItem.reference.trim(),
          supplierName: newItem.supplierName.trim() || 'Fournisseur',
          purchasePrice: parseFloat(String(newItem.purchasePrice)) || 0,
          sellingPrice: parseFloat(String(newItem.sellingPrice)) || 0,
          type: newItem.type,
          isConcessionnaire: newItem.type === 'OEM' || newItem.type === 'PVP'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewItem({ reference: '', supplierName: '', type: 'ADAPTABLE', purchasePrice: 0, sellingPrice: 0 });
        fetchHistories();
      } else {
        alert(data.error || "Erreur lors de l'ajout");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = histories.filter(h => {
    const s = search.toLowerCase();
    const matchSearch = h.reference?.toLowerCase().includes(s) ||
      h.supplierName?.toLowerCase().includes(s) ||
      h.type?.toLowerCase().includes(s);

    let matchType = true;
    if (typeFilter === 'OEM') matchType = h.type === 'OEM' || h.isConcessionnaire;
    else if (typeFilter === 'ADAPTABLE') matchType = h.type === 'ADAPTABLE' && !h.isConcessionnaire;

    return matchSearch && matchType;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" /> HISTORIQUE PRIX ARTICLES & OFFRES
          </h2>
          <p className="text-slate-400 text-xs uppercase tracking-wider">BANQUE DE DONNÉES DES TARIFS ET OFFRES FOURNISSEURS CONSERVÉS PAR RÉFÉRENCE</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-cyan-600/20"
        >
          <Plus className="w-4 h-4" /> AJOUTER OFFRE ARTICLE
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="RECHERCHER PAR RÉFÉRENCE ARTICLE, FOURNISSEUR..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-700 focus:outline-none focus:border-cyan-500 uppercase placeholder:normal-case placeholder:font-normal" />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-3 h-10 rounded-xl border border-slate-700 cursor-pointer uppercase"
        >
          <option value="TOUS">TOUS LES TYPES</option>
          <option value="OEM">ORIGINE / OEM / PVP</option>
          <option value="ADAPTABLE">ADAPTABLE</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 font-bold uppercase">CHARGEMENT DE L'HISTORIQUE PRIX...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-600 font-bold uppercase">AUCUNE OFFRE ENREGISTRÉE DANS L'HISTORIQUE</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-900/60 text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                  <th className="px-4 py-3">RÉFÉRENCE ARTICLE</th>
                  <th className="px-4 py-3">TYPE OFFRE</th>
                  <th className="px-4 py-3">FOURNISSEUR</th>
                  <th className="px-4 py-3 text-right text-amber-400">PRIX ACHAT (HT)</th>
                  <th className="px-4 py-3 text-right text-green-400">PRIX VENTE (HT)</th>
                  <th className="px-4 py-3 text-center">DATE MAJ</th>
                  <th className="px-4 py-3 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} className="border-b border-slate-800/60 hover:bg-slate-900/60/40 transition">
                    <td className="px-4 py-3 font-mono font-black text-cyan-400 uppercase text-sm">{h.reference}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                        h.type === 'OEM' || h.isConcessionnaire ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}>
                        {h.type === 'OEM' || h.isConcessionnaire ? 'ORIGINE / OEM' : 'ADAPTABLE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black text-white uppercase">{h.supplierName || h.supplier?.name || 'Inconnu'}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-200">{h.purchasePrice ? `${h.purchasePrice.toFixed(3)} TND` : '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-green-400">{h.sellingPrice ? `${h.sellingPrice.toFixed(3)} TND` : '-'}</td>
                    <td className="px-4 py-3 text-center text-slate-500 font-sans text-[11px]">{new Date(h.updatedAt || h.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setEditingItem(h)} className="p-1.5 text-slate-400 hover:text-cyan-400 transition" title="Modifier">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(h.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full relative text-left">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4 text-cyan-400">AJOUTER OFFRE HISTORIQUE</h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>RÉFÉRENCE ARTICLE *</label>
                <input type="text" className={inputCls} placeholder="EX: 1440TV" value={newItem.reference} onChange={e => setNewItem({ ...newItem, reference: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>FOURNISSEUR</label>
                <input type="text" className={inputCls} placeholder="EX: STEQ, CDG, SAGAP" value={newItem.supplierName} onChange={e => setNewItem({ ...newItem, supplierName: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>TYPE D'OFFRE</label>
                <select className="w-full bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-3 h-10 rounded-lg border border-slate-700 focus:outline-none uppercase" value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}>
                  <option value="ADAPTABLE">ADAPTABLE</option>
                  <option value="OEM">ORIGINE / CONCESSIONNAIRE</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>PRIX ACHAT HT (TND)</label>
                  <input type="number" step="0.001" className={inputCls} value={newItem.purchasePrice} onChange={e => setNewItem({ ...newItem, purchasePrice: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className={labelCls}>PRIX VENTE HT (TND)</label>
                  <input type="number" step="0.001" className={inputCls} value={newItem.sellingPrice} onChange={e => setNewItem({ ...newItem, sellingPrice: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 bg-slate-900/60 text-slate-400 font-black text-xs uppercase rounded-xl">ANNULER</button>
                <button onClick={handleCreate} className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase rounded-xl">ENREGISTRER</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edition */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full relative text-left">
            <button onClick={() => setEditingItem(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4 text-cyan-400">MODIFIER OFFRE ARTICLE</h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>RÉFÉRENCE ARTICLE</label>
                <input type="text" className={inputCls} value={editingItem.reference} onChange={e => setEditingItem({ ...editingItem, reference: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>FOURNISSEUR</label>
                <input type="text" className={inputCls} value={editingItem.supplierName || ''} onChange={e => setEditingItem({ ...editingItem, supplierName: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>TYPE D'OFFRE</label>
                <select className="w-full bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-3 h-10 rounded-lg border border-slate-700 focus:outline-none uppercase" value={editingItem.type} onChange={e => setEditingItem({ ...editingItem, type: e.target.value })}>
                  <option value="ADAPTABLE">ADAPTABLE</option>
                  <option value="OEM">ORIGINE / CONCESSIONNAIRE</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>PRIX ACHAT HT (TND)</label>
                  <input type="number" step="0.001" className={inputCls} value={editingItem.purchasePrice || 0} onChange={e => setEditingItem({ ...editingItem, purchasePrice: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className={labelCls}>PRIX VENTE HT (TND)</label>
                  <input type="number" step="0.001" className={inputCls} value={editingItem.sellingPrice || 0} onChange={e => setEditingItem({ ...editingItem, sellingPrice: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button onClick={() => setEditingItem(null)} className="flex-1 py-2.5 bg-slate-900/60 text-slate-400 font-black text-xs uppercase rounded-xl">ANNULER</button>
                <button onClick={handleUpdate} className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase rounded-xl">SAUVEGARDER</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    'historique-prix-articles': <SectionHistoriquePrixArticles />,
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
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-green-400" /> HISTORIQUE D'ACHATS
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">CONSULTEZ LES ACHATS EFFECTUÉS PAR FOURNISSEUR OU PAR ARTICLE</p>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        <button
          onClick={() => setActiveSubTab('supplier')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
            activeSubTab === 'supplier' 
              ? 'border-red-500 text-white' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Par Fournisseur
        </button>
        <button
          onClick={() => setActiveSubTab('article')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
            activeSubTab === 'article' 
              ? 'border-red-500 text-white' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Par Article
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 font-bold uppercase animate-pulse">Chargement de l'historique...</div>
      ) : activeSubTab === 'supplier' ? (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedSuppId}
              onChange={e => setSelectedSuppId(e.target.value)}
              className="bg-slate-900/60 text-slate-100 border border-slate-700 font-bold text-xs px-3 h-10 rounded-xl border border-slate-700 cursor-pointer"
            >
              <option value="">TOUS LES FOURNISSEURS</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="RECHERCHER PAR N° BON, RÉFÉRENCE OU DÉSIGNATION DE PIÈCE..."
                value={suppSearch}
                onChange={e => setSuppSearch(e.target.value)}
                className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-700 focus:outline-none focus:border-slate-500 uppercase placeholder:normal-case placeholder:font-normal" 
              />
            </div>
          </div>

          {/* Supplier POs List */}
          <div className="space-y-4">
            {supplierPOs.length === 0 ? (
              <div className="text-center py-10 text-slate-600 font-bold uppercase">Aucune commande d'achat trouvée</div>
            ) : (
              supplierPOs.map(po => (
                <div key={po.id} className={cardCls}>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                    <div>
                      <span className="font-mono text-green-400 font-black text-sm uppercase">#{po.orderNumber}</span>
                      <h4 className="font-black text-white uppercase text-xs mt-0.5">Fournisseur : {po.supplier?.name?.toUpperCase()}</h4>
                      <p className="text-[10px] text-slate-500">Date : {new Date(po.createdAt).toLocaleDateString('fr-FR')} · Statut : {po.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-500 uppercase font-black">Montant Total HT</p>
                      <p className="font-black text-white font-mono text-sm">{po.totalAmount.toFixed(3)} TND</p>
                    </div>
                  </div>
                  
                  {/* Items */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[9px] text-slate-500 font-black uppercase tracking-wider border-b border-slate-850">
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
                            <td className="py-2 text-right font-mono font-bold text-white">{it.total.toFixed(3)} TND</td>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="SAISISSEZ UNE RÉFÉRENCE OU DÉSIGNATION DE PIÈCE..."
              value={articleSearch}
              onChange={e => handleArticleSearchChange(e.target.value)}
              className="w-full bg-slate-900/60 text-slate-100 font-semibold border border-slate-700 pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-700 focus:outline-none focus:border-slate-500 uppercase placeholder:normal-case"
            />

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-800 rounded-xl mt-2 overflow-hidden shadow-2xl z-50">
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedArticleRef(p.reference || '');
                      setArticleSearch(p.reference ? `${p.reference} - ${p.name}` : p.name);
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-800 text-xs font-semibold border-b border-slate-800/50 last:border-0 text-slate-300 hover:text-white flex justify-between"
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex justify-between">
                <span>HISTORIQUE DES ACHATS POUR LA RÉFÉRENCE :</span>
                <span className="text-red-400 font-mono">#{selectedArticleRef.toUpperCase()}</span>
              </h3>

              {articlePurchases.length === 0 ? (
                <p className="text-slate-500 font-bold text-center py-6 uppercase text-xs">Aucun achat enregistré pour cette pièce</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-850 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <th className="py-2">Date d'achat</th>
                        <th className="py-2">Fournisseur</th>
                        <th className="py-2">N° Bon Commande</th>
                        <th className="py-2 text-center">Quantité</th>
                        <th className="py-2 text-right">Prix Unit. HT</th>
                        <th className="py-2 text-right">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articlePurchases.map((ap, idx) => (
                        <tr key={idx} className="border-b border-slate-850/30 hover:bg-slate-800/10 text-slate-300">
                          <td className="py-2 font-medium">{ap.date}</td>
                          <td className="py-2 font-bold uppercase">{ap.supplierName}</td>
                          <td className="py-2 font-mono text-green-400 font-bold">#{ap.poNumber}</td>
                          <td className="py-2 text-center font-mono">{ap.quantity}</td>
                          <td className="py-2 text-right font-mono">{ap.unitPrice.toFixed(3)} TND</td>
                          <td className="py-2 text-right font-mono font-bold text-white">{ap.total.toFixed(3)} TND</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-850 border-dashed rounded-3xl text-slate-500 font-bold uppercase text-xs">
              Veuillez sélectionner un article ci-dessus pour consulter ses achats
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
    <div className="h-[calc(100vh-120px)] flex bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Sidebar des conversations */}
      <div className="w-1/3 border-r border-slate-800/80 bg-slate-900/60/40 flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-900/60/60">
          <h3 className="text-white text-xs font-black uppercase tracking-widest">CONVERSATIONS</h3>
          <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">SÉLECTIONNEZ UN CLIENT POUR LUI RÉPONDRE</p>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {loadingConv ? (
            <div className="text-center py-10 text-slate-500 font-bold uppercase tracking-wider text-[10px] animate-pulse">Chargement...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 text-slate-600 font-bold uppercase tracking-wider text-[10px]">Aucun message</div>
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
                    isSelected ? 'bg-red-650/10 border-l-4 border-red-500 bg-slate-850/30' : 'hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="flex items-center gap-2">
                      {hasUnread && !isSelected && (
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse flex-shrink-0" />
                      )}
                      <span className={`font-black text-xs uppercase truncate max-w-[70%] ${hasUnread && !isSelected ? 'text-cyan-400' : 'text-white'}`}>{userName}</span>
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono">
                      {c.lastMessage ? new Date(c.lastMessage.createdAt).toLocaleDateString('fr-FR') : ''}
                    </span>
                  </div>
                  <p className={`text-[10px] truncate w-full uppercase ${hasUnread && !isSelected ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                    {c.lastMessage?.content || 'Aucun message'}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Fenêtre de chat */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {selectedUserId ? (
          <>
            {/* User Header */}
            <div className="p-4 bg-slate-900/60/40 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h4 className="text-white text-xs font-black uppercase tracking-wider">
                  {activeConv?.user?.name || `${activeConv?.user?.firstName || ''} ${activeConv?.user?.lastName || ''}`.trim() || 'Client'}
                </h4>
                <p className="text-[9px] text-slate-500 font-bold mt-0.5">{activeConv?.user?.email}</p>
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
                        ? 'bg-red-650 text-white rounded-tr-none shadow shadow-red-500/20'
                        : 'bg-slate-800 text-slate-100 rounded-tl-none'
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
                          <img src={msg.attachmentData} alt={msg.attachmentName || 'Attachment'} className="max-w-[200px] rounded-lg border border-slate-700/50" />
                        ) : (
                          <a href={msg.attachmentData} download={msg.attachmentName || 'download'} className="flex items-center gap-1.5 px-3 py-2 bg-black/20 hover:bg-black/30 rounded-lg transition text-xs font-semibold text-white">
                            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[150px]">{msg.attachmentName || 'Pièce jointe'}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-slate-500 mt-1 uppercase font-black">
                    {msg.senderName} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview */}
            {attachment && (
              <div className="px-6 py-2 bg-slate-900/60/40 border-t border-slate-800 flex items-center justify-between">
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
              className="p-4 border-t border-slate-800/80 bg-slate-900/60/20 flex gap-3 items-center"
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
                className="p-3 text-slate-500 hover:text-cyan-400 transition rounded-xl hover:bg-slate-800/50"
                title="Joindre un fichier"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Saisissez votre réponse..."
                value={reply}
                onChange={e => setReply(e.target.value)}
                className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 uppercase placeholder:normal-case font-semibold"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || (!reply.trim() && !attachment)}
                className="px-5 py-3 bg-red-650 hover:bg-red-600 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" /> Répondre
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <MessageSquare className="w-12 h-12 text-slate-700 mb-2" />
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Aucune conversation sélectionnée</p>
            <p className="text-slate-650 text-[10px] uppercase font-bold mt-1">Sélectionnez un client dans la liste pour voir les messages et répondre.</p>
          </div>
        )}
      </div>
    </div>
  );
}
