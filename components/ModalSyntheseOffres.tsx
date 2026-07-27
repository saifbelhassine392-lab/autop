"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, ArrowLeft, BarChart2, Save, TrendingUp, DollarSign } from 'lucide-react';

export interface SyntheseRowData {
  reference: string;
  designation: string;
  pvp: number | string;
  purchasePrice: number | string;  // Prix d'achat fournisseur HT
  sellingPrice: number | string;   // Prix de vente client HT
  supplierName: string;            // Fournisseur sélectionné
  bestOemPrice: number | string;
  oemSupplierName: string;
  bestAdaptablePrice: number | string;
  adaptableSupplierName: string;
  selectOem: boolean;
  selectAdaptable: boolean;
}

interface ModalSyntheseOffresProps {
  quoteNumber?: string;
  items: any[];
  suppliers: any[];
  onClose: () => void;
  onApply: (updatedRows: SyntheseRowData[]) => void;
}

export default function ModalSyntheseOffres({ quoteNumber, items, suppliers, onClose, onApply }: ModalSyntheseOffresProps) {
  const [rows, setRows] = useState<SyntheseRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const validItems = items.filter(it => it.reference?.trim() || it.designation?.trim());
      const refs = validItems.map(it => it.reference?.trim().toUpperCase()).filter(Boolean);

      let historyData: Record<string, any[]> = {};

      if (refs.length > 0) {
        try {
          const res = await fetch(`/api/historique-prix?references=${encodeURIComponent(refs.join(','))}`);
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            json.data.forEach((h: any) => {
              const r = h.reference.toUpperCase();
              if (!historyData[r]) historyData[r] = [];
              historyData[r].push(h);
            });
          }
        } catch (err) {
          console.error('Erreur chargement historique synthèse:', err);
        }
      }

      const initialRows: SyntheseRowData[] = validItems.map(it => {
        const ref = (it.reference || '').trim().toUpperCase();
        const histories = historyData[ref] || [];

        // Combiner l'historique DB et les offres saisies sur la ligne de devis actuelle
        const localOffres = (it.offres || []).map((o: any) => {
          const supp = suppliers.find(s => s.id === o.supplierId);
          return {
            reference: ref,
            type: o.type === 'ORIGINE' ? 'OEM' : (o.type || 'ADAPTABLE'),
            purchasePrice: parseFloat(o.purchasePrice) || 0,
            sellingPrice: parseFloat(o.sellingPrice) || 0,
            supplierName: supp?.name || o.supplierName || 'Fournisseur',
            isConcessionnaire: o.type === 'ORIGINE'
          };
        });

        const allOffers = [...histories, ...localOffres];

        // 1. Extraire PRIX COMPTOIR (Prix concessionnaire hors remise)
        const pvpRecord = allOffers.find((h: any) => h.isConcessionnaire || h.type === 'PVP' || h.type === 'ORIGINE' || h.type === 'CONCESSIONNAIRE');
        const pvpVal = pvpRecord?.sellingPrice || pvpRecord?.purchasePrice || '';

        // 2. Extraire MEILLEUR ORIGINE / CONCESSIONNAIRE
        const oemOffers = allOffers.filter((h: any) => 
          h.type === 'OEM' || h.type === 'ORIGINE' || h.type === 'CONCESSIONNAIRE' || h.isConcessionnaire
        ).filter((h: any) => (h.purchasePrice || h.sellingPrice || 0) > 0);

        const bestOemRecord = oemOffers.length > 0
          ? oemOffers.reduce((min: any, cur: any) => {
              const curP = cur.purchasePrice || cur.sellingPrice || 999999;
              const minP = min.purchasePrice || min.sellingPrice || 999999;
              return curP < minP ? cur : min;
            }, oemOffers[0])
          : null;

        const bestOemPrice = bestOemRecord ? (bestOemRecord.purchasePrice || bestOemRecord.sellingPrice) : '';
        const oemSupplierName = bestOemRecord ? (bestOemRecord.supplierName || bestOemRecord.supplier?.name || 'Fournisseur') : '';

        // 3. Extraire MEILLEUR ADAPTABLE
        const adaptableOffers = allOffers.filter((h: any) => 
          !h.isConcessionnaire && h.type === 'ADAPTABLE'
        ).filter((h: any) => (h.purchasePrice || h.sellingPrice || 0) > 0);

        const bestAdaptableRecord = adaptableOffers.length > 0
          ? adaptableOffers.reduce((min: any, cur: any) => {
              const curP = cur.purchasePrice || cur.sellingPrice || 999999;
              const minP = min.purchasePrice || min.sellingPrice || 999999;
              return curP < minP ? cur : min;
            }, adaptableOffers[0])
          : null;

        const bestAdaptablePrice = bestAdaptableRecord ? (bestAdaptableRecord.purchasePrice || bestAdaptableRecord.sellingPrice) : '';
        const adaptableSupplierName = bestAdaptableRecord ? (bestAdaptableRecord.supplierName || bestAdaptableRecord.supplier?.name || 'Fournisseur') : '';

        // Déterminer l'offre retenue par défaut (Privilégier l'adaptable avec marge +30% si existante)
        const hasAdaptable = !!bestAdaptablePrice;
        const selectedSupplier = hasAdaptable ? adaptableSupplierName : (oemSupplierName || 'Fournisseur');
        const selectedPurchase = hasAdaptable ? bestAdaptablePrice : (bestOemPrice || 0);

        // Vente adaptable = Achat + 30% | Vente Origine = Prix concessionnaire (PVP)
        let selectedSelling = it.puHT;
        if (!selectedSelling || selectedSelling === 0) {
          if (hasAdaptable) {
            selectedSelling = (parseFloat(String(bestAdaptablePrice)) * 1.30).toFixed(2);
          } else {
            selectedSelling = pvpVal || bestOemPrice || selectedPurchase;
          }
        }

        return {
          reference: ref || 'SANS-REF',
          designation: it.designation || 'Article',
          pvp: pvpVal ? Number(pvpVal).toFixed(2) : '',
          purchasePrice: selectedPurchase ? Number(selectedPurchase).toFixed(2) : '',
          sellingPrice: selectedSelling ? Number(selectedSelling).toFixed(2) : '',
          supplierName: selectedSupplier,
          bestOemPrice: bestOemPrice ? Number(bestOemPrice).toFixed(2) : '',
          oemSupplierName: bestOemPrice ? oemSupplierName : '',
          bestAdaptablePrice: bestAdaptablePrice ? Number(bestAdaptablePrice).toFixed(2) : '',
          adaptableSupplierName: bestAdaptablePrice ? adaptableSupplierName : '',
          selectOem: !hasAdaptable && !!bestOemPrice,
          selectAdaptable: hasAdaptable,
        };
      });

      setRows(initialRows);
      setLoading(false);
    }

    loadData();
  }, [items, suppliers]);

  const updateRow = (index: number, field: keyof SyntheseRowData, value: any) => {
    setRows(prev => prev.map((r, idx) => {
      if (idx !== index) return r;
      const updated = { ...r, [field]: value };
      
      const isOem = field === 'selectOem' ? Boolean(value) : updated.selectOem;
      const isAdapt = field === 'selectAdaptable' ? Boolean(value) : updated.selectAdaptable;

      updated.selectOem = isOem;
      updated.selectAdaptable = isAdapt;

      const pvpP = parseFloat(String(updated.pvp)) || 0;
      const oemAchat = parseFloat(String(updated.bestOemPrice)) || 0;
      const oemVente = pvpP > 0 ? pvpP : (oemAchat > 0 ? oemAchat : 0);

      const adaptAchat = parseFloat(String(updated.bestAdaptablePrice)) || 0;
      const adaptVente = adaptAchat > 0 ? parseFloat((adaptAchat * 1.30).toFixed(2)) : 0;

      if (isOem && isAdapt) {
        updated.purchasePrice = (oemAchat + adaptAchat).toFixed(2);
        updated.sellingPrice = (oemVente + adaptVente).toFixed(2);
      } else if (isOem) {
        updated.purchasePrice = oemAchat > 0 ? oemAchat.toFixed(2) : (pvpP > 0 ? pvpP.toFixed(2) : updated.purchasePrice);
        updated.sellingPrice = oemVente > 0 ? oemVente.toFixed(2) : updated.sellingPrice;
        if (updated.oemSupplierName) updated.supplierName = updated.oemSupplierName;
      } else if (isAdapt) {
        updated.purchasePrice = adaptAchat > 0 ? adaptAchat.toFixed(2) : updated.purchasePrice;
        updated.sellingPrice = adaptVente > 0 ? adaptVente.toFixed(2) : updated.sellingPrice;
        if (updated.adaptableSupplierName) updated.supplierName = updated.adaptableSupplierName;
      }

      // Si PVP (Prix Comptoir) change et ORIGINE est coché
      if (field === 'pvp' && isOem) {
        const val = parseFloat(String(value)) || 0;
        if (val > 0) updated.sellingPrice = val.toFixed(2);
      }

      // Si MEILLEUR ORIGINE change et ORIGINE est coché
      if (field === 'bestOemPrice' && isOem) {
        const val = parseFloat(String(value)) || 0;
        if (val > 0) {
          updated.purchasePrice = val.toFixed(2);
          if (!pvpP) updated.sellingPrice = val.toFixed(2);
        }
      }

      // Si le prix d'achat adaptable change et ADAPTABLE est coché
      if ((field === 'bestAdaptablePrice' || field === 'purchasePrice') && isAdapt) {
        const pAchat = parseFloat(String(value)) || 0;
        if (pAchat > 0) {
          updated.sellingPrice = (pAchat * 1.30).toFixed(2);
        }
      }

      return updated;
    }));
  };

  const handleSaveAndApply = async () => {
    setSaving(true);
    try {
      // 1. Sauvegarder dans l'API d'historique des prix pour que cela reste en base pour chaque article
      const res = await fetch('/api/historique-prix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syntheseList: rows })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur d\'enregistrement de la synthèse');
      }

      // 2. Transmettre les résultats au composant parent pour mise à jour du devis
      onApply(rows);
      onClose();
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Calculs du rapport global de devis
  const totalAchat = rows.reduce((sum, r) => {
    let rowAchat = 0;
    const oemA = parseFloat(String(r.bestOemPrice)) || 0;
    const adaptA = parseFloat(String(r.bestAdaptablePrice)) || 0;
    if (r.selectOem) rowAchat += oemA;
    if (r.selectAdaptable) rowAchat += adaptA;
    if (!r.selectOem && !r.selectAdaptable) rowAchat += parseFloat(String(r.purchasePrice)) || 0;
    return sum + rowAchat;
  }, 0);

  const totalVente = rows.reduce((sum, r) => {
    let rowVente = 0;
    const pvpP = parseFloat(String(r.pvp)) || 0;
    const oemA = parseFloat(String(r.bestOemPrice)) || 0;
    const oemV = pvpP > 0 ? pvpP : oemA;
    const adaptA = parseFloat(String(r.bestAdaptablePrice)) || 0;
    const adaptV = adaptA > 0 ? (adaptA * 1.30) : 0;

    if (r.selectOem) rowVente += oemV;
    if (r.selectAdaptable) rowVente += adaptV;
    if (!r.selectOem && !r.selectAdaptable) rowVente += parseFloat(String(r.sellingPrice)) || 0;
    return sum + rowVente;
  }, 0);

  const margeTND = totalVente - totalAchat;
  const margePourcent = totalVente > 0 ? (margeTND / totalVente) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 font-sans animate-fadeIn">
      <div className="bg-slate-900 border-2 border-blue-500/80 rounded-2xl max-w-6xl w-full overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.3)] flex flex-col max-h-[92vh]">
        
        {/* Header Ultra-Lisible */}
        <div className="bg-blue-600 px-6 py-4 border-b border-blue-500 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-inner">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider">
                SYNTHÈSE & RAPPORT DES OFFRES DEVIS {quoteNumber ? `#${quoteNumber}` : ''}
              </h3>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wide">
                Examinez les offres, validez le prix d'achat et de vente et enregistrez en base d'articles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-xl transition font-black text-lg"
            title="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Dynamic Profit Margin Summary Banner */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">TOTAL ACHAT FOURNISSEUR HT</span>
            <span className="block font-mono font-black text-amber-400 text-base">{totalAchat.toFixed(2)} TND</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">TOTAL VENTE CLIENT HT</span>
            <span className="block font-mono font-black text-cyan-400 text-base">{totalVente.toFixed(2)} TND</span>
          </div>
          <div className="bg-slate-900 border border-emerald-500/40 bg-emerald-950/20 rounded-xl p-2.5">
            <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-400">MARGE BENÉFICIAIRE GLOALE</span>
            <span className="block font-mono font-black text-emerald-400 text-base">
              +{margeTND.toFixed(2)} TND ({margePourcent.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-950">
          {loading ? (
            <div className="text-center py-16 text-blue-400 font-black uppercase tracking-widest text-sm animate-pulse">
              Chargement de l'historique des prix et synthèses d'offres...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-bold uppercase tracking-wider text-xs">
              Veuillez renseigner au moins une référence dans le devis pour générer la synthèse.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white font-black text-xs uppercase tracking-wider border-b border-blue-500">
                    <th className="py-3 px-3">RÉFÉRENCE</th>
                    <th className="py-3 px-3 text-right" title="Prix concessionnaire hors remise">PRIX COMPTOIR (HT)</th>
                    <th className="py-3 px-3 text-right bg-amber-600/30">MEILLEUR ORIGINE</th>
                    <th className="py-3 px-3 bg-amber-600/30">FOURN. ORIGINE</th>
                    <th className="py-3 px-3 text-right bg-cyan-600/30">MEILLEUR ADAPTABLE</th>
                    <th className="py-3 px-3 bg-cyan-600/30">FOURN. ADAPTABLE</th>
                    <th className="py-3 px-3 text-center bg-indigo-950/60 border-x border-indigo-800/40 text-indigo-300">MARGES DÉGAGÉES</th>
                    <th className="py-3 px-3 text-right bg-emerald-600/40">P. ACHAT HT</th>
                    <th className="py-3 px-3 text-right bg-emerald-600/40" title="Prix de vente : Concessionnaire si Origine, Achat + 30% si Adaptable">P. VENTE HT</th>
                    <th className="py-3 px-2 text-center">☑ ORIGINE</th>
                    <th className="py-3 px-2 text-center">☑ ADAPTABLE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900 text-slate-100">
                  {rows.map((row, idx) => {
                    const pvpP = parseFloat(String(row.pvp)) || 0;
                    const oemA = parseFloat(String(row.bestOemPrice)) || 0;
                    const oemV = pvpP > 0 ? pvpP : oemA;
                    const margeOemTND = oemV - oemA;
                    const margeOemPct = oemV > 0 ? (margeOemTND / oemV) * 100 : 0;

                    const adaptA = parseFloat(String(row.bestAdaptablePrice)) || 0;
                    const adaptV = adaptA > 0 ? (adaptA * 1.30) : 0;
                    const margeAdaptTND = adaptV - adaptA;
                    const margeAdaptPct = adaptV > 0 ? (margeAdaptTND / adaptV) * 100 : 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-800/80 transition-colors">
                        {/* Référence */}
                        <td className="py-3 px-3">
                          <span className="font-mono font-black text-white block text-xs">{row.reference}</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[130px] block">{row.designation}</span>
                        </td>

                        {/* PVP */}
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            step={0.01}
                            placeholder="0.00"
                            value={row.pvp}
                            onChange={e => updateRow(idx, 'pvp', e.target.value)}
                            className="w-20 bg-slate-950 text-white font-mono font-bold border border-slate-700 rounded px-2 py-1.5 text-right focus:border-blue-400 focus:outline-none"
                          />
                        </td>

                        {/* Meilleur OEM */}
                        <td className="py-3 px-3 text-right bg-amber-950/20">
                          <input
                            type="number"
                            step={0.01}
                            placeholder="0.00"
                            value={row.bestOemPrice}
                            onChange={e => updateRow(idx, 'bestOemPrice', e.target.value)}
                            className="w-20 bg-slate-950 text-amber-400 font-mono font-bold border border-amber-500/40 rounded px-2 py-1.5 text-right focus:border-amber-400 focus:outline-none"
                          />
                        </td>

                        {/* Fourn. OEM */}
                        <td className="py-3 px-3 bg-amber-950/20">
                          <input
                            type="text"
                            placeholder="SOPIQ"
                            value={row.oemSupplierName}
                            onChange={e => updateRow(idx, 'oemSupplierName', e.target.value)}
                            className="w-24 bg-slate-950 text-slate-200 uppercase font-bold text-xs border border-slate-700 rounded px-2 py-1.5 focus:border-blue-400 focus:outline-none"
                          />
                        </td>

                        {/* Meilleur Adaptable */}
                        <td className="py-3 px-3 text-right bg-cyan-950/20">
                          <input
                            type="number"
                            step={0.01}
                            placeholder="0.00"
                            value={row.bestAdaptablePrice}
                            onChange={e => updateRow(idx, 'bestAdaptablePrice', e.target.value)}
                            className="w-20 bg-slate-950 text-cyan-400 font-mono font-bold border border-cyan-500/40 rounded px-2 py-1.5 text-right focus:border-cyan-400 focus:outline-none"
                          />
                        </td>

                        {/* Fourn. Adaptable */}
                        <td className="py-3 px-3 bg-cyan-950/20">
                          <input
                            type="text"
                            placeholder="SOPIQ"
                            value={row.adaptableSupplierName}
                            onChange={e => updateRow(idx, 'adaptableSupplierName', e.target.value)}
                            className="w-24 bg-slate-950 text-slate-200 uppercase font-bold text-xs border border-slate-700 rounded px-2 py-1.5 focus:border-blue-400 focus:outline-none"
                          />
                        </td>

                        {/* Marges Dégagées */}
                        <td className="py-3 px-3 bg-indigo-950/30 border-x border-indigo-900/40 min-w-[170px]">
                          <div className="flex flex-col gap-1 text-[10px]">
                            {row.bestOemPrice || row.pvp ? (
                              <div className="flex items-center justify-between font-mono font-bold text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">
                                <span>ORIG:</span>
                                <span>+{margeOemTND.toFixed(2)} TND ({margeOemPct.toFixed(1)}%)</span>
                              </div>
                            ) : (
                              <div className="text-[9px] text-slate-600 font-mono text-center">ORIG: --</div>
                            )}

                            {row.bestAdaptablePrice ? (
                              <div className="flex items-center justify-between font-mono font-bold text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
                                <span>ADAPT:</span>
                                <span>+{margeAdaptTND.toFixed(2)} TND ({margeAdaptPct.toFixed(1)}%)</span>
                              </div>
                            ) : (
                              <div className="text-[9px] text-slate-600 font-mono text-center">ADAPT: --</div>
                            )}
                          </div>
                        </td>

                        {/* Prix Achat HT retenu */}
                        <td className="py-3 px-3 text-right bg-emerald-950/20">
                          <input
                            type="number"
                            step={0.01}
                            placeholder="0.00"
                            value={row.purchasePrice}
                            onChange={e => updateRow(idx, 'purchasePrice', e.target.value)}
                            className="w-20 bg-slate-950 text-amber-300 font-mono font-bold border border-emerald-500/50 rounded px-2 py-1.5 text-right focus:border-emerald-400 focus:outline-none"
                          />
                        </td>

                        {/* Prix Vente HT retenu */}
                        <td className="py-3 px-3 text-right bg-emerald-950/20">
                          <input
                            type="number"
                            step={0.01}
                            placeholder="0.00"
                            value={row.sellingPrice}
                            onChange={e => updateRow(idx, 'sellingPrice', e.target.value)}
                            className="w-20 bg-slate-950 text-green-400 font-mono font-black border border-emerald-500/50 rounded px-2 py-1.5 text-right focus:border-emerald-400 focus:outline-none"
                          />
                        </td>

                        {/* Checkbox OEM */}
                        <td className="py-3 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.selectOem}
                            onChange={e => updateRow(idx, 'selectOem', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded bg-slate-950 border-slate-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Checkbox Adaptable */}
                        <td className="py-3 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.selectAdaptable}
                            onChange={e => updateRow(idx, 'selectAdaptable', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded bg-slate-950 border-slate-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions Ultra-Lisibles */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center shadow-lg">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition border border-slate-600 shadow-md"
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" /> ← RETOUR AU DEVIS
          </button>

          <button
            onClick={handleSaveAndApply}
            disabled={saving || rows.length === 0}
            className="flex items-center gap-2 px-7 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-600/40 disabled:opacity-50 border border-emerald-400/30"
          >
            <Save className="w-4 h-4" />
            {saving ? 'ENREGISTREMENT DU RAPPORT...' : 'VALIDER ET ENREGISTRER LE RAPPORT (BASE & DEVIS)'}
          </button>
        </div>
      </div>
    </div>
  );
}
