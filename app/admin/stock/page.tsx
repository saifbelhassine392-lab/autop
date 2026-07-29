'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Package, Upload, Download, Plus, Search, Edit3,
  Trash2, CheckCircle, AlertTriangle, X, Save, ArrowLeft
} from 'lucide-react';

interface StockItem {
  id?: string;
  reference: string;
  name: string;       // DESIGNATION
  stock: number;      // QTE
  brand: string;      // MARQUE
  vehicleCompat: string; // VEHICULE
  costPrice: number;  // COUT REVIENT (admin only)
  price: number;      // PRIX VENTE (visible client)
  sku: string;
  status: string;
  images?: string[];
}

export default function AdminStockPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const newItemTemplate: StockItem = {
    reference: '', name: '', stock: 0, brand: '',
    vehicleCompat: '', costPrice: 0, price: 0, sku: '', status: 'ACTIVE'
  };
  const [newItem, setNewItem] = useState<StockItem>({ ...newItemTemplate });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRole = (session?.user as any)?.role;
  const isNextAuthAdmin = userRole === 'ADMIN' || userRole === 'PROFESSIONAL';
  const isLocalAdmin = mounted && !!(localStorage.getItem('adminAuth') || localStorage.getItem('activeAdminProfile'));
  const isAdmin = isNextAuthAdmin || isLocalAdmin;

  useEffect(() => {
    if (!mounted) return;
    const isLocal = !!(localStorage.getItem('adminAuth') || localStorage.getItem('activeAdminProfile'));
    if (status === 'unauthenticated' && !isLocal) router.push('/connexion');
    if ((status === 'authenticated' || isLocal) && !isAdmin) router.push('/');
    if ((status === 'authenticated' || isLocal) && isAdmin) fetchProducts();
  }, [status, isAdmin, mounted]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products?limit=200&status=ALL');
      const data = res.ok ? await res.json() : null;
      if (data?.success && Array.isArray(data.data)) {
        setProducts(data.data.map((p: any) => ({
          id: p.id,
          reference: p.reference || p.sku,
          name: p.name,
          stock: p.stock,
          brand: p.brand || '',
          vehicleCompat: p.vehicleCompat || p.model || '',
          costPrice: p.costPrice || 0,
          price: p.price,
          sku: p.sku,
          status: p.status || 'ACTIVE'
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // === EXCEL IMPORT ===
  const parseExcelCSV = (text: string): StockItem[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const header = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase()
      .replace(/['"]/g, '')
      .replace('é', 'e').replace('ê', 'e').replace('è', 'e')
      .replace('ô', 'o').replace('û', 'u').replace('ç', 'c')
    );

    // Map headers to field names
    const colMap: Record<string, string> = {};
    header.forEach((h, i) => {
      if (h.includes('ref')) colMap['reference'] = String(i);
      if (h.includes('desig') || h.includes('nom') || h.includes('article')) colMap['name'] = String(i);
      if (h.includes('qte') || h.includes('quant') || h.includes('stock')) colMap['stock'] = String(i);
      if (h.includes('marque') || h.includes('brand')) colMap['brand'] = String(i);
      if (h.includes('vehic') || h.includes('modele') || h.includes('compat')) colMap['vehicleCompat'] = String(i);
      if (h.includes('cout') || h.includes('revient') || h.includes('achat')) colMap['costPrice'] = String(i);
      if (h.includes('prix') || h.includes('vente') || h.includes('price')) colMap['price'] = String(i);
    });

    const items: StockItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 2 || !cols[0]) continue;

      const get = (field: string) => colMap[field] !== undefined ? (cols[parseInt(colMap[field])] || '') : '';
      const getNum = (field: string) => parseFloat(get(field).replace(',', '.')) || 0;

      const reference = get('reference') || `REF-${i}`;
      items.push({
        reference,
        name: get('name') || reference,
        stock: getNum('stock') || 0,
        brand: get('brand') || '',
        vehicleCompat: get('vehicleCompat') || '',
        costPrice: getNum('costPrice'),
        price: getNum('price'),
        sku: reference.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase(),
        status: 'ACTIVE'
      });
    }
    return items;
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const items = parseExcelCSV(text);

      if (items.length === 0) {
        setImportResults({ success: 0, errors: ['Aucune ligne valide trouvée dans le fichier'] });
        return;
      }

      // Send to bulk import API
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: items })
      });

      const data = await res.json();
      if (data.success) {
        setImportResults({ success: data.imported || items.length, errors: data.errors || [] });
        await fetchProducts();
      } else {
        setImportResults({ success: 0, errors: [data.error || 'Erreur lors de l\'import'] });
      }
    } catch (err: any) {
      setImportResults({ success: 0, errors: [err.message || 'Erreur de lecture du fichier'] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // === EXPORT TEMPLATE ===
  const downloadTemplate = () => {
    const header = 'REFERENCE;DESIGNATION;QTE;MARQUE;VEHICULE;COUT REVIENT;PRIX VENTE';
    const example = 'REF-001;Filtre à huile Bosch;10;Bosch;Peugeot 208 1.2;8.50;22.00';
    const csv = `${header}\n${example}`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'modele_import_stock_autop.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vehicleCompat?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === 'loading') return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/dashbord')} className="text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Package className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold text-white">Gestion du Stock</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          Connecté: <span className="font-bold text-white">{session?.user?.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Import / Export card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-amber-400 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import Stock depuis Excel / CSV
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Download template */}
            <button
              onClick={downloadTemplate}
              className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-xl hover:border-amber-500 transition group"
            >
              <Download className="w-8 h-8 text-slate-500 group-hover:text-amber-400 transition" />
              <span className="text-xs font-semibold text-slate-400 group-hover:text-amber-300 transition text-center">
                Télécharger le modèle CSV
              </span>
              <span className="text-[10px] text-slate-600">REFERENCE;DESIGNATION;QTE;MARQUE...</span>
            </button>

            {/* Upload file */}
            <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-xl hover:border-green-500 cursor-pointer transition group">
              <Upload className="w-8 h-8 text-slate-500 group-hover:text-green-400 transition" />
              <span className="text-xs font-semibold text-slate-400 group-hover:text-green-300 transition text-center">
                {importing ? 'Import en cours...' : 'Importer un fichier Excel / CSV'}
              </span>
              <span className="text-[10px] text-slate-600">.csv (exporté depuis Excel)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xls,.xlsx"
                className="hidden"
                onChange={handleFileImport}
                disabled={importing}
              />
            </label>

            {/* Add manually */}
            <button
              onClick={() => setShowAddForm(true)}
              className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 transition group"
            >
              <Plus className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition" />
              <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-300 transition text-center">
                Ajouter manuellement
              </span>
              <span className="text-[10px] text-slate-600">Saisir un article directement</span>
            </button>
          </div>

          {/* Import results */}
          {importResults && (
            <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${importResults.errors.length === 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
              {importResults.errors.length === 0
                ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                : <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className="text-sm font-semibold text-white">
                  {importResults.success} article(s) importé(s) avec succès
                </p>
                {importResults.errors.length > 0 && (
                  <ul className="mt-1 text-xs text-amber-300 space-y-0.5">
                    {importResults.errors.map((err, i) => <li key={i}>• {err}</li>)}
                  </ul>
                )}
              </div>
              <button onClick={() => setImportResults(null)} className="ml-auto text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter un article
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'RÉFÉRENCE *', key: 'reference', type: 'text' },
                { label: 'DÉSIGNATION *', key: 'name', type: 'text' },
                { label: 'MARQUE', key: 'brand', type: 'text' },
                { label: 'VÉHICULE', key: 'vehicleCompat', type: 'text' },
                { label: 'QTÉ', key: 'stock', type: 'number' },
                { label: 'COÛT REVIENT (TND)', key: 'costPrice', type: 'number' },
                { label: 'PRIX VENTE (TND) *', key: 'price', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={(newItem as any)[f.key]}
                    onChange={e => setNewItem(prev => ({ ...prev, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">PHOTO (OPTIONNEL)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setNewItem(prev => ({ ...prev, images: [reader.result as string] }));
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full bg-slate-950 text-slate-400 text-[10px] p-2 rounded-lg border border-slate-800 file:bg-slate-800 file:text-white file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 file:cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold transition">Annuler</button>
              <button
                onClick={async () => {
                  if (!newItem.reference || !newItem.name) return alert('Référence et désignation requises');
                  const res = await fetch('/api/products/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ products: [{ ...newItem, sku: newItem.reference.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase() }] })
                  });
                  if (res.ok) { setShowAddForm(false); setNewItem({ ...newItemTemplate }); await fetchProducts(); }
                }}
                className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Enregistrer
              </button>
            </div>
          </div>
        )}

        {/* Stock table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              Stock ({filtered.length} articles)
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-950 text-white text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-amber-500 w-56"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">Chargement du stock...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-600">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun article. Importez un fichier CSV ou ajoutez manuellement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-950 border-b border-slate-800">
                  <tr>
                    {[
                      'RÉFÉRENCE', 'DÉSIGNATION', 'MARQUE', 'VÉHICULE', 'QTÉ',
                      'COÛT REVIENT', 'PRIX VENTE (CLIENT)', 'STATUT', 'ACTIONS'
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map(p => (
                    <tr key={p.id || p.reference} className="hover:bg-slate-800/30 transition">
                      {editingItem?.id === p.id ? (
                        // Edit row
                        <>
                          {['reference', 'name', 'brand', 'vehicleCompat', 'stock', 'costPrice', 'price'].map(field => (
                            <td key={field} className="px-2 py-2">
                              <input
                                type={['stock', 'costPrice', 'price'].includes(field) ? 'number' : 'text'}
                                value={(editingItem as any)[field]}
                                onChange={e => setEditingItem(prev => prev ? ({
                                  ...prev,
                                  [field]: ['stock', 'costPrice', 'price'].includes(field) ? parseFloat(e.target.value) || 0 : e.target.value
                                }) : null)}
                                className="w-full bg-slate-950 text-white text-xs p-1.5 rounded border border-amber-500/50 focus:outline-none"
                              />
                            </td>
                          ))}
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/15 text-green-400">ACTIVE</span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={async () => {
                                  if (!editingItem || !editingItem.id) return;
                                  const item = editingItem;
                                  await fetch(`/api/products/${item.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(item)
                                  });
                                  setEditingItem(null);
                                  await fetchProducts();
                                }}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button onClick={() => setEditingItem(null)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px]">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // View row
                        <>
                          <td className="px-4 py-3 font-mono font-bold text-amber-400">{p.reference}</td>
                          <td className="px-4 py-3 text-slate-200 max-w-[200px] truncate">{p.name}</td>
                          <td className="px-4 py-3 text-slate-400">{p.brand || '-'}</td>
                          <td className="px-4 py-3 text-slate-400">{p.vehicleCompat || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold font-mono ${p.stock <= 5 ? 'text-red-400' : 'text-green-400'}`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-orange-300">{p.costPrice?.toFixed(2) || '—'} TND</td>
                          <td className="px-4 py-3 font-mono text-cyan-300 font-bold">{p.price.toFixed(2)} TND</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.status === 'ACTIVE' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setEditingItem({ ...p })} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition">
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend - admin only note */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Note de confidentialité :</strong> La colonne <strong>"COÛT REVIENT"</strong> est strictement réservée à cet espace admin.
            Les clients voient uniquement le <strong>"PRIX VENTE"</strong> dans le catalogue public.
          </div>
        </div>
      </div>
    </div>
  );
}