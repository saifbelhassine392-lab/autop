"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, ArrowLeft, ArrowRight, BarChart2, Save } from 'lucide-react';

export interface SyntheseRowData {
  reference: string;
  designation: string;
  pvp: number | string;
  bestOemPrice: number | string;
  oemSupplierName: string;
  bestAdaptablePrice: number | string;
  adaptableSupplierName: string;
  selectOem: boolean;
  selectAdaptable: boolean;
}

interface ModalSyntheseOffresProps {
  items: any[];
  suppliers: any[];
  onClose: () => void;
  onApply: (updatedRows: SyntheseRowData[]) => void;
}

export default function ModalSyntheseOffres({ items, suppliers, onClose, onApply }: ModalSyntheseOffresProps) {
  const [rows, setRows] = useState<SyntheseRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const validItems = items.filter(it => it.reference?.trim());
      const refs = validItems.map(it => it.reference.trim().toUpperCase());

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
        const ref = it.reference.trim().toUpperCase();
        const histories = historyData[ref] || [];

        // Extraire PVP (Concessionnaire)
        const pvpRecord = histories.find((h: any) => h.isConcessionnaire || h.type === 'PVP');
        const pvpVal = pvpRecord?.sellingPrice || pvpRecord?.purchasePrice || '';

        // Extraire Meilleur OEM
        const oemHistories = histories.filter((h: any) => h.type === 'OEM' || (!h.isConcessionnaire && h.supplierName?.toUpperCase().includes('OEM')));
        const bestOemRecord = oemHistories.length > 0
          ? oemHistories.reduce((min: any, cur: any) => ((cur.sellingPrice || cur.purchasePrice || 999999) < (min.sellingPrice || min.purchasePrice || 999999) ? cur : min), oemHistories[0])
          : null;
        
        // Extraire depuis it.offres local si non trouvé
        const localOemOffre = it.offres?.find((o: any) => o.type === 'ORIGINE');
        const bestOemPrice = bestOemRecord?.sellingPrice || bestOemRecord?.purchasePrice || localOemOffre?.sellingPrice || localOemOffre?.purchasePrice || '';
        const oemSupplierName = bestOemRecord?.supplierName || bestOemRecord?.supplier?.name || (suppliers.find(s => s.id === localOemOffre?.supplierId)?.name) || 'SOPIQ';

        // Extraire Meilleur Adaptable
        const adaptableHistories = histories.filter((h: any) => !h.isConcessionnaire && h.type !== 'PVP' && h.type !== 'OEM');
        const bestAdaptableRecord = adaptableHistories.length > 0
          ? adaptableHistories.reduce((min: any, cur: any) => ((cur.sellingPrice || cur.purchasePrice || 999999) < (min.sellingPrice || min.purchasePrice || 999999) ? cur : min), adaptableHistories[0])
          : null;

        const localAdaptableOffre = it.offres?.find((o: any) => o.type === 'ADAPTABLE');
        const bestAdaptablePrice = bestAdaptableRecord?.sellingPrice || bestAdaptableRecord?.purchasePrice || localAdaptableOffre?.sellingPrice || localAdaptableOffre?.purchasePrice || '';
        const adaptableSupplierName = bestAdaptableRecord?.supplierName || bestAdaptableRecord?.supplier?.name || (suppliers.find(s => s.id === localAdaptableOffre?.supplierId)?.name) || 'SOPIQ';

        return {
          reference: ref,
          designation: it.designation || 'Article',
          pvp: pvpVal,
          bestOemPrice: bestOemPrice,
          oemSupplierName: bestOemPrice ? oemSupplierName : '',
          bestAdaptablePrice: bestAdaptablePrice,
          adaptableSupplierName: bestAdaptablePrice ? adaptableSupplierName : '',
          selectOem: false,
          selectAdaptable: false,
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
      if (field === 'selectOem' && value === true) {
        updated.selectAdaptable = false;
      }
      if (field === 'selectAdaptable' && value === true) {
        updated.selectOem = false;
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

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header (Fidèle à la photo) */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide">
              Synthèse meilleures offres
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-16 text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
              Chargement de l'historique et des meilleures offres...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-slate-500 font-bold uppercase tracking-wider text-xs">
              Veuillez renseigner au moins une référence dans le devis pour afficher la synthèse.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-blue-900/50 shadow-inner">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white font-bold uppercase tracking-wider border-b border-blue-700">
                    <th className="py-3 px-4">Référence</th>
                    <th className="py-3 px-3 text-right">PVP</th>
                    <th className="py-3 px-3 text-right">Meilleur OEM</th>
                    <th className="py-3 px-3">Fourn. OEM</th>
                    <th className="py-3 px-3 text-right">Meilleur Adaptable</th>
                    <th className="py-3 px-3">Fourn. Adaptable</th>
                    <th className="py-3 px-2 text-center">☑ OEM</th>
                    <th className="py-3 px-2 text-center">☑ Adaptable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-950/20 transition-colors">
                      {/* Référence */}
                      <td className="py-3 px-4 font-mono font-bold text-white tracking-wide">
                        {row.reference}
                      </td>

                      {/* PVP */}
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          step={0.01}
                          placeholder="-"
                          value={row.pvp}
                          onChange={e => updateRow(idx, 'pvp', e.target.value)}
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Meilleur OEM */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                        <input
                          type="number"
                          step={0.01}
                          placeholder="-"
                          value={row.bestOemPrice}
                          onChange={e => updateRow(idx, 'bestOemPrice', e.target.value)}
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-amber-400 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Fourn. OEM */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Ex: SOPIQ"
                          value={row.oemSupplierName}
                          onChange={e => updateRow(idx, 'oemSupplierName', e.target.value)}
                          className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 uppercase font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Meilleur Adaptable */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-cyan-400">
                        <input
                          type="number"
                          step={0.01}
                          placeholder="-"
                          value={row.bestAdaptablePrice}
                          onChange={e => updateRow(idx, 'bestAdaptablePrice', e.target.value)}
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-cyan-400 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Fourn. Adaptable */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Ex: SOPIQ"
                          value={row.adaptableSupplierName}
                          onChange={e => updateRow(idx, 'adaptableSupplierName', e.target.value)}
                          className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 uppercase font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Checkbox OEM */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selectOem}
                          onChange={e => updateRow(idx, 'selectOem', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded bg-slate-900 border-slate-700 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Checkbox Adaptable */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selectAdaptable}
                          onChange={e => updateRow(idx, 'selectAdaptable', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded bg-slate-900 border-slate-700 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions (Identique à la photo) */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" /> ← Retour
          </button>

          <button
            onClick={handleSaveAndApply}
            disabled={saving || rows.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
          >
            {saving ? 'ENREGISTREMENT...' : 'Suivant → (Enregistrer en Base)'}
          </button>
        </div>
      </div>
    </div>
  );
}
