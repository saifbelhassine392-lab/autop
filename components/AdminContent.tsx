"use client";

import { useApp } from '@/lib/context';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Edit3, MessageSquare, FileText, Mail, Phone,
  Plus, Trash2, Save, X, Send,
  Building2, UserPlus, List, ClipboardList, Package,
  CheckCircle, AlertTriangle, Printer, Clock,
  ShoppingBag, BarChart2, Download, Receipt, Paperclip
} from 'lucide-react';

// ─── Input style helper ───────────────────────────────────────────────────────
const inputCls = "w-full bg-white text-black font-semibold text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 uppercase placeholder:text-slate-400 placeholder:font-normal placeholder:normal-case";
const labelCls = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1";
const cardCls = "bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl p-4 md:p-5 mb-4 w-full";

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
            className="w-full bg-white text-black font-semibold pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-300 focus:outline-none focus:border-red-500 uppercase placeholder:normal-case placeholder:font-normal" />
        </div>
        <div className="flex gap-2">
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white text-black font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-300 cursor-pointer"
          >
            <option value="TOUS STATUTS">TOUS STATUTS</option>
            <option value="EN ATTENTE">EN ATTENTE</option>
            <option value="TRAITÉ">TRAITÉ</option>
          </select>
          <select 
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="bg-white text-black font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-300 cursor-pointer"
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
        <div className="text-center py-10 text-slate-500 font-bold uppercase">CHARGEMENT...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-600 font-bold uppercase">AUCUNE DEMANDE TROUVÉE</div>
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
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
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
                  q.status === 'TREATED' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>{q.status === 'TREATED' ? 'TRAITÉ' : 'EN ATTENTE'}</span>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-3 mb-3">
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
  const [activeSuggestRow, setActiveSuggestRow] = useState<number | null>(null);
  const [activeSuggestField, setActiveSuggestField] = useState<'ref' | 'desc' | null>(null);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
      setCatalogue(Array.isArray(d) ? d : d.data || []);
    }).catch(() => {});
  }, []);

  const getSuggestions = (text: string, field: 'ref' | 'desc') => {
    if (!text || text.length < 1) return [];
    return catalogue.filter(p => {
      const target = field === 'ref' ? p.reference : p.name;
      return target?.toLowerCase().includes(text.toLowerCase());
    }).slice(0, 8);
  };

  // Charger la demande de devis si elle est sélectionnée
  useEffect(() => {
    if (quoteToLoad) {
      setClientName(quoteToLoad.clientName || '');
      setClientEmail(quoteToLoad.clientEmail || '');
      setVehicle(`${quoteToLoad.brand || ''} ${quoteToLoad.model || ''}`.trim());
      setVin(quoteToLoad.vin || '');
      setNotes(`Proposition commerciale pour la demande #${quoteToLoad.id.slice(-6).toUpperCase()}`);
      if (Array.isArray(quoteToLoad.items) && quoteToLoad.items.length > 0) {
        setItems(quoteToLoad.items.map((it: any) => ({
          designation: it.designation || '',
          reference: it.reference || '',
          qty: it.quantity || 1,
          puHT: 0,
          discount: 0
        })));
      }
    }
  }, [quoteToLoad]);

  const addLine = () => setItems(prev => [...prev, { designation: '', reference: '', qty: 1, puHT: 0, discount: 0 }]);
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
      setItems([{ designation: '', reference: '', qty: 1, puHT: 0, discount: 0 }]);
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
            <input type="email" className="w-full bg-white text-black font-semibold text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 placeholder:text-slate-400 font-sans" placeholder="email@client.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
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
          <textarea rows={2} className="w-full bg-white text-black font-semibold text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 resize-none" placeholder="Notes additionnelles..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Items Table */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">LIGNES DU DEVIS</div>
          <button onClick={addLine} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase rounded-lg transition">
            <Plus className="w-3.5 h-3.5" /> AJOUTER LIGNE
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-950 text-[10px] font-black uppercase text-slate-400">
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
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="px-2 py-2 relative">
                      <input type="text" value={it.designation} 
                        onChange={e => {
                          updateLine(i, 'designation', e.target.value);
                          setActiveSuggestRow(i);
                          setActiveSuggestField('desc');
                        }}
                        onFocus={() => { setActiveSuggestRow(i); setActiveSuggestField('desc'); }}
                        onBlur={() => setTimeout(() => { setActiveSuggestRow(null); setActiveSuggestField(null); }, 200)}
                        className="w-full bg-white text-black font-semibold text-xs px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 uppercase min-w-[150px]" placeholder="DÉSIGNATION" />
                      {activeSuggestRow === i && activeSuggestField === 'desc' && getSuggestions(it.designation, 'desc').length > 0 && (
                        <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-950 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
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
                        className="w-full bg-white text-black font-semibold text-xs px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 uppercase min-w-[100px]" placeholder="RÉF." />
                      {activeSuggestRow === i && activeSuggestField === 'ref' && getSuggestions(it.reference, 'ref').length > 0 && (
                        <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-950 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
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
                        className="w-16 bg-white text-black font-bold text-xs px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 text-center" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={it.puHT || ''} min={0} step={0.001} onChange={e => updateLine(i, 'puHT', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white text-black font-bold text-xs px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 text-right" placeholder="" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={it.discount || ''} min={0} max={100} step={1} onChange={e => updateLine(i, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-16 bg-white text-black font-bold text-xs px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 text-center" placeholder="" />
                    </td>
                    <td className="px-2 py-2 text-right font-black text-cyan-400">{discounted.toFixed(3)} TND</td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => removeLine(i)} className="text-slate-500 hover:text-red-400 transition p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
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
              className="w-full bg-white text-black font-black text-sm px-3 py-2.5 rounded-lg border border-red-500 focus:outline-none text-center text-xl" />
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
                className={f.key === 'email' ? "w-full bg-white text-black font-semibold text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-green-500" : inputCls.replace('focus:border-red-500', 'focus:border-green-500')} />
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
                  className="w-full bg-slate-900 text-white font-semibold text-sm px-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500" />
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
          <button onClick={() => setForm({ name: '', contactName: '', phone: '', email: '', address: '', city: '' })}
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
            className="w-full bg-white text-black font-semibold pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-300 focus:outline-none uppercase placeholder:normal-case placeholder:font-normal" />
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
                <input type="email" value={editingSupplier.email || ''} onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })} className="w-full bg-white text-black font-semibold text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none" />
              </div>
              <div>
                <label className={labelCls}>ADRESSE</label>
                <input type="text" value={editingSupplier.address || ''} onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>VILLE</label>
                <input type="text" value={editingSupplier.city || ''} onChange={e => setEditingSupplier({ ...editingSupplier, city: e.target.value })} className={inputCls} />
              </div>
              <div className="flex items-center gap-2 mt-2">
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
                  className="w-full bg-white text-black font-black text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-green-500 uppercase">
                  <option value="">-- CHOISIR UN FOURNISSEUR --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              {supplier && (
                <div className="bg-slate-950 rounded-lg p-3 text-xs">
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
                  <tr className="bg-slate-950 text-[10px] font-black uppercase text-slate-400">
                    <th className="px-3 py-2.5 text-left rounded-l-lg">RÉFÉRENCE</th>
                    <th className="px-3 py-2.5 text-left">DÉSIGNATION *</th>
                    <th className="px-3 py-2.5 text-center">QTÉ</th>
                    <th className="px-3 py-2.5 text-right">P.U. HT (TND)</th>
                    <th className="px-3 py-2.5 text-right">REMISE %</th>
                    <th className="px-3 py-2.5 text-right">TVA %</th>
                    <th className="px-3 py-2.5 text-right">TOTAL TTC</th>
                    <th className="px-3 py-2.5 rounded-r-lg"></th>
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
                            className="w-full bg-white text-black font-bold text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none uppercase min-w-[90px]" placeholder="RÉF." />
                          {activeSuggestRow === i && activeSuggestField === 'ref' && getSuggestions(it.reference, 'ref').length > 0 && (
                            <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-950 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
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
                            className="w-full bg-white text-black font-bold text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none uppercase min-w-[160px]" placeholder="DÉSIGNATION" />
                          {activeSuggestRow === i && activeSuggestField === 'desc' && getSuggestions(it.designation, 'desc').length > 0 && (
                            <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-950 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
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
                            className="w-14 bg-white text-black font-bold text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none text-center" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.unitPrice} min={0} step={0.001} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-white text-black font-bold text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none text-right" placeholder="0.000" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.discount} min={0} max={100} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-white text-black font-bold text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none text-center" placeholder="0" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={it.tva} min={0} max={100} onChange={e => updateItem(i, 'tva', parseFloat(e.target.value) || 19)}
                            className="w-16 bg-white text-black font-bold text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none text-center" placeholder="19" />
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
              className="w-full bg-white text-black font-semibold text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none resize-none" placeholder="Délai de livraison, conditions paiement..." />
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
            <div className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-3 border-b border-slate-800 pb-2">1. SÉLECTIONNER LES FOURNISSEURS À COMPARER</div>
            <div className="flex gap-2 flex-wrap">
              {suppliers.map(s => (
                <label key={s.id} className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 cursor-pointer text-xs font-black uppercase text-white hover:border-green-500/50 select-none">
                  <input type="checkbox" checked={selectedSuppIds.includes(s.id)} onChange={() => handleToggleSupplier(s.id)} className="rounded border-slate-700 text-green-600 focus:ring-green-500 bg-slate-900" />
                  {s.name}
                </label>
              ))}
              {suppliers.length === 0 && (
                <p className="text-slate-500 font-bold uppercase text-[10px]">Aucun fournisseur disponible. Veuillez en ajouter dans le menu.</p>
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
                  <tr className="bg-slate-950 text-[10px] font-black uppercase text-slate-400">
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
                          className="w-full bg-white text-black font-bold text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none uppercase min-w-[160px]" placeholder="DÉSIGNATION ARTICLE" />
                        {activeSuggestRow === i && activeSuggestField === 'desc' && getSuggestions(it.designation, 'desc').length > 0 && (
                          <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-950 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
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
                          className="w-full bg-white text-black font-bold text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none uppercase min-w-[90px]" placeholder="RÉF." />
                        {activeSuggestRow === i && activeSuggestField === 'ref' && getSuggestions(it.reference, 'ref').length > 0 && (
                          <div className="absolute left-0 z-50 mt-1 min-w-[220px] bg-slate-950 border border-slate-700 rounded-xl max-h-44 overflow-y-auto shadow-2xl">
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
                        <input type="number" value={it.quantity} min={1} onChange={e => updateCompItem(i, 'quantity', parseInt(e.target.value) || 1)} className="w-14 bg-white text-black font-bold text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-none text-center" />
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
                    <tr className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 border-b border-slate-855">
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
                        <tr key={idx} className="border-b border-slate-855 hover:bg-slate-950/10">
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
                                    <input type="number" min={0} step={0.001} value={valObj.price || ''} onChange={e => handlePriceChange(id, idx, 'price', parseFloat(e.target.value) || 0)} className="w-20 bg-white text-black font-bold text-center text-xs px-1.5 py-1 rounded border border-slate-350 focus:outline-none" placeholder="0.000" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">REM%</span>
                                    <input type="number" min={0} max={100} step={1} value={valObj.discount || ''} onChange={e => handlePriceChange(id, idx, 'discount', parseFloat(e.target.value) || 0)} className="w-20 bg-white text-black font-bold text-center text-xs px-1.5 py-1 rounded border border-slate-350 focus:outline-none" placeholder="0%" />
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
                    <tr className="bg-slate-950/60 font-black border-t border-slate-800">
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
                <code className="bg-slate-950 px-1.5 py-0.5 rounded text-[10px] text-cyan-400 font-mono tracking-normal block mt-2 text-center uppercase">REFERENCE | DESIGNATION | QTE | MARQUE | VEHICULES CONCERNEES | COUT REVIENT | PRIX VENTE</code>
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
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
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
                className="w-full bg-white text-black font-semibold pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-300 focus:outline-none focus:border-red-500 uppercase placeholder:normal-case placeholder:font-normal" />
            </div>
          </div>

          {editingProduct && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full text-left relative">
                <button onClick={() => setEditingProduct(null)} className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-950/60 border border-slate-800 transition">
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
                    <button onClick={() => setEditingProduct(null)} className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-xs font-black uppercase">ANNULER</button>
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
                    <tr className="bg-slate-950 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">
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
                      <tr key={p.id} className="border-b border-slate-850 hover:bg-slate-950/20 transition">
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
function SectionDevisGeneres() {
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

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("AUTOP TUNISIE", 20, 24);
    doc.setFontSize(10);
    doc.text("PROPOSITION COMMERCIALE / DEVIS", 20, 31);
    
    const localDevisSorted = [...devisList].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    const devisSeqIdx = localDevisSorted.findIndex(x => x.id === devis.id);
    const devisSeqNum = devisSeqIdx !== -1 ? String(devisSeqIdx + 1).padStart(6, '0') : devis.id.slice(-6).toUpperCase();
    doc.setTextColor(0, 0, 0);
    doc.text(`Devis : #DEV-${devisSeqNum}`, 140, 20);
    doc.text(`Date : ${new Date(devis.createdAt).toLocaleDateString('fr-FR')}`, 140, 26);

    autoTable(doc, {
      startY: 65,
      head: [["Information Client", "Détail"]],
      body: [
        ["Email du Client", devis.clientEmail || ""],
        ["Véhicule", `${devis.vehicleBrand || ''} ${devis.vehicleModel || ''}`.trim() || "Générique"],
        ["Numéro VIN", devis.vehicleVin || "N/A"],
        ["Notes / Observations", devis.notes || "N/A"],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
    });

    const subtotal = devis.items?.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0) || 0;
    const tax = subtotal * 0.19;
    const totalTTC = devis.totalPrice || (subtotal + tax);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 15,
      head: [["Réf. pièce", "Désignation", "Quantité", "P.U. HT (TND)", "Total HT (TND)"]],
      body: devis.items?.map((it: any) => [
        it.reference || "N/A",
        it.name,
        it.quantity.toString(),
        it.price.toFixed(3),
        (it.price * it.quantity).toFixed(3)
      ]) || [],
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
    let csv = "REFERENCE;DESIGNATION;QUANTITE;PRIX UNITAIRE HT;TOTAL HT\n";
    devis.items?.forEach((it: any) => {
      csv += `${it.reference || "N/A"};${it.name};${it.quantity};${it.price.toFixed(3)};${(it.price * it.quantity).toFixed(3)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Devis_AUTOP_${devis.id.slice(-6).toUpperCase()}.csv`);
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
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">CONSULTEZ ET EXPÉDIEZ VOS DEVIS DÉJÀ CHIFFRÉS</p>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="RECHERCHER PAR EMAIL CLIENT, VEHICULE..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white text-black font-semibold pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-300 focus:outline-none focus:border-red-500 uppercase placeholder:normal-case placeholder:font-normal" />
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
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
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
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 mb-4 text-xs">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">ARTICLES DU DEVIS :</span>
                {d.items?.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="flex justify-between items-center border-b border-slate-800/20 pb-1.5 last:border-0 last:pb-0 mb-1.5 last:mb-0">
                    <span className="text-slate-355 uppercase font-bold">{item.name} {item.reference && `(${item.reference.toUpperCase()})`}</span>
                    <span className="font-black text-slate-400 font-mono">x{item.quantity} | {item.price.toFixed(3)} TND</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleDownloadPDF(d)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase rounded-xl transition">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => handleDownloadExcel(d)} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase rounded-xl transition">
                  <Download className="w-3.5 h-3.5" /> EXCEL / CSV
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
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">MISES À JOUR DES STATUTS DE PRÉPARATION ET DE LIVRAISON CLIENTS</p>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="RECHERCHER PAR N° COMMANDE, NOM CLIENT, EMAIL..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white text-black font-semibold pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-300 focus:outline-none focus:border-red-500 uppercase placeholder:normal-case placeholder:font-normal" />
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
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">MONTANT TOTAL TTC</span>
                  <span className="font-black text-white text-base font-mono">{o.total.toFixed(3)} TND</span>
                </div>
                {/* Sélecteur de profil admin */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
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
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 mb-4 text-xs">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">ARTICLES DU BON DE COMMANDE :</span>
              {o.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center border-b border-slate-800/20 pb-1.5 last:border-0 last:pb-0 mb-1.5 last:mb-0">
                  <span className="text-slate-355 uppercase font-bold">{item.productName}</span>
                  <span className="font-black text-slate-400 font-mono">x{item.quantity} | {item.price.toFixed(3)} TND</span>
                </div>
              ))}
            </div>

            {/* Formulaire statut préparé par admin */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className={labelCls}>STATUT DE LIVRAISON</label>
                <select 
                  value={statusMap[o.id] || o.status}
                  onChange={e => setStatusMap({...statusMap, [o.id]: e.target.value})}
                  className="w-full bg-white text-black font-black text-xs px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 uppercase"
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
                  className="w-full bg-white text-black font-semibold text-xs px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 uppercase"
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

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-800 text-slate-400 border-slate-700',
    SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    CONFIRMED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    RECEIVED: 'bg-green-500/10 text-green-400 border-green-500/30',
  };

  return (
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <Clock className="w-5 h-5 text-green-400" /> SUIVI PO & LIVRAISONS
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-5">SUIVEZ LE STATUT ET LA LIVRAISON DES BONS DE COMMANDE FOURNISSEURS</p>

      <div className={cardCls}>
        {loading ? (
          <div className="text-center py-8 text-slate-500 font-bold uppercase animate-pulse">Chargement...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-slate-600 font-bold uppercase">Aucune commande fournisseur trouvée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-950 text-[10px] font-black uppercase text-slate-400">
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
                          className="bg-slate-950 text-white border border-slate-800 rounded-lg text-[10px] font-black uppercase p-1.5 focus:outline-none focus:border-red-500"
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="SENT">SENT</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="RECEIVED">RECEIVED (LIVRÉ)</option>
                        </select>
                      ) : (
                        <span className="text-[10px] text-green-400 font-black uppercase tracking-wider">STOCK COMPTABILISÉ</span>
                      )}
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
                  <tr className="bg-slate-950 text-[10px] font-black text-slate-400 uppercase">
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

            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
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
            className="w-full bg-white text-black font-semibold pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-300 focus:outline-none focus:border-red-500 uppercase placeholder:normal-case placeholder:font-normal" />
        </div>
        <button
          onClick={() => setShowOnlyDelivered(!showOnlyDelivered)}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
            showOnlyDelivered 
              ? 'bg-red-650/15 border-red-500 text-white' 
              : 'bg-white text-black border-slate-300'
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
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[9px] font-black text-slate-400 uppercase tracking-widest">
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
                              ? 'bg-green-500/10 text-green-400 border-green-500/30'
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
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(d => {
      const sups = d.data || [];
      setSuppliers(sups);
      const steq = sups.find((s: any) => s.name.toUpperCase() === 'STEQ');
      if (steq) setSelectedSupplierId(steq.id);
      else if (sups.length > 0) setSelectedSupplierId(sups[0].id);
    });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || !selectedSupplierId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/b2b/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: selectedSupplierId, query })
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, data: data.data });
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch (err) {
      setResult({ success: false, error: 'Erreur réseau.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-black uppercase tracking-widest text-white mb-1 flex items-center gap-2">
        <Package className="w-5 h-5 text-cyan-400" /> 🤖 ROBOT B2B
      </h2>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-6">RECHERCHE AUTOMATISÉE CHEZ VOS FOURNISSEURS</p>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl mb-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">FOURNISSEUR CIBLE</label>
            <select 
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="w-full bg-slate-950 text-white font-bold text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 uppercase cursor-pointer"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">RECHERCHE INTELLIGENTE</label>
            <input 
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="RÉFÉRENCE, DÉSIGNATION OU VOITURE..."
              required
              className="w-full bg-white text-black font-black text-lg px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-cyan-500 uppercase placeholder:text-slate-300"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> RECHERCHE EN COURS...</>
            ) : (
              <><Search className="w-5 h-5" /> LANCER LE ROBOT</>
            )}
          </button>
        </form>
      </div>

      {result && (
        <div className={`p-6 rounded-2xl border ${result.success ? (result.data.available ? 'bg-green-950/30 border-green-500/30' : 'bg-red-950/30 border-red-500/30') : 'bg-red-950/30 border-red-500/30'}`}>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">RÉSULTAT DE LA RECHERCHE</h3>
          {result.success ? (
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">PRIX BRUT (SANS REMISE)</div>
                <div className="text-xl font-black text-white">{result.data.price.toFixed(3)} TND</div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">REMISE APPLICABLE</div>
                <div className="text-xl font-black text-cyan-400">{result.data.discount}%</div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">DISPONIBILITÉ</div>
                <div className={`text-xl font-black ${result.data.available ? 'text-green-400' : 'text-red-400'}`}>
                  {result.data.available ? (result.data.stock ? `${result.data.stock} EN STOCK` : 'DISPONIBLE') : 'RUPTURE / NON TROUVÉ'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-red-400 font-bold uppercase">{result.error}</div>
          )}
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
    'devis-gen': <SectionDevisGeneres />,
    'bons': <SectionBonsEtLivraisons />,
    'creer-devis': <SectionCreerDevis quoteToLoad={selectedQuote} onClearQuote={() => setSelectedQuote(null)} />,
    'generer-pdf': <SectionDevisGeneres />,
    'envoi': <SectionDevisGeneres />,
    'ajouter-fournisseur': <SectionAjouterFournisseur />,
    'liste-fournisseurs': <SectionListeFournisseurs />,
    'consultation-fournisseur': <SectionConsultationFournisseur />,
    'robot-b2b': <SectionRobotB2B />,
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
              className="bg-white text-black font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-300 cursor-pointer"
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
                className="w-full bg-white text-black font-semibold pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-300 focus:outline-none focus:border-red-500 uppercase placeholder:normal-case placeholder:font-normal" 
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
              className="w-full bg-white text-black font-semibold pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-300 focus:outline-none focus:border-red-500 uppercase placeholder:normal-case"
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find(c => c.userId === selectedUserId);

  return (
    <div className="h-[calc(100vh-120px)] flex bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Sidebar des conversations */}
      <div className="w-1/3 border-r border-slate-800/80 bg-slate-950/40 flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60">
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
            <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center">
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
              <div className="px-6 py-2 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between">
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
              className="p-4 border-t border-slate-800/80 bg-slate-950/20 flex gap-3 items-center"
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
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 uppercase placeholder:normal-case font-semibold"
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
