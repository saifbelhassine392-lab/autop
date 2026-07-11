"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useCart } from "@/contexts/CartContext"
import Link from "next/link"
import { 
  Download, CheckCircle, MessageCircle, FileText, 
  Plus, FileSpreadsheet, ClipboardList, Package, Receipt, X, Search
} from 'lucide-react'

export default function MesDevisPage() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState<'devis' | 'commandes' | 'factures'>('devis')
  const [devis, setDevis] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clientSearch, setClientSearch] = useState('')

  // États pour le Bon de Commande
  const [orderModalDevis, setOrderModalDevis] = useState<any | null>(null)
  const [editableItems, setEditableItems] = useState<any[]>([])
  const [shippingAddress, setShippingAddress] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [orderFormat, setOrderFormat] = useState<'pdf' | 'excel'>('pdf')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [shippingMethod, setShippingMethod] = useState<'POWER TRANSPORT' | 'PAR PROPRES MOYENS' | 'AU MAGASIN'>('POWER TRANSPORT')
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'BANK_TRANSFER' | 'CARD' | 'PAYPAL'>('CASH_ON_DELIVERY')

  useEffect(() => {
    if (shippingMethod === 'AU MAGASIN') {
      setShippingAddress('COMPTOIR DE DISTRIBUTION AUTOP - CHARGUIA 2')
    } else if (shippingAddress === 'COMPTOIR DE DISTRIBUTION AUTOP - CHARGUIA 2') {
      setShippingAddress('')
    }
  }, [shippingMethod])

  const loadData = async () => {
    if (!session) return;
    try {
      setLoading(true);

      // 1. Charger les devis et demandes
      const devisRes = await fetch("/api/devis");
      const devisData = devisRes.ok ? await devisRes.json() : [];

      const quotesRes = await fetch("/api/quotes");
      const quotesData = quotesRes.ok ? await quotesRes.json() : [];

      const unifiedList = [
        ...(Array.isArray(devisData) ? devisData : []).map((d: any) => ({
          id: d.id,
          date: new Date(d.createdAt).toLocaleDateString('fr-FR'),
          brand: d.vehicleBrand || 'Générique',
          model: d.vehicleModel || 'N/A',
          vin: d.vehicleVin || '',
          remarks: d.notes || '',
          response: d.responseNote || '',
          status: d.status === 'completed' ? 'Traité' : d.status === 'rejected' ? 'Rejeté' : 'En attente',
          isTreated: d.status === 'completed' || d.totalPrice > 0,
          totalPrice: d.totalPrice || 0,
          items: (d.items || []).map((it: any) => ({
            id: it.id,
            productId: it.productId,
            name: it.name,
            price: it.price || 0,
            quantity: it.quantity || 1,
            discount: it.discount || 0
          }))
        })),
        ...(Array.isArray(quotesData) ? quotesData : []).map((q: any) => ({
          id: q.id,
          date: new Date(q.createdAt).toLocaleDateString('fr-FR'),
          brand: q.brand || 'Générique',
          model: q.model || 'N/A',
          vin: q.vin || '',
          remarks: q.remarks || '',
          response: '',
          status: q.status === 'TREATED' ? 'Traité' : 'En attente',
          isTreated: q.status === 'TREATED',
          totalPrice: 0,
          items: (q.items || []).map((it: any) => ({
            id: it.id,
            productId: null,
            name: `${it.designation} (Réf: ${it.reference || 'N/A'})`,
            price: 0,
            quantity: it.quantity || 1
          }))
        }))
      ];
      unifiedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDevis(unifiedList);

      // 2. Charger les commandes réelles
      const ordersRes = await fetch("/api/orders");
      const ordersData = ordersRes.ok ? await ordersRes.json() : null;
      if (ordersData && ordersData.success) {
        setOrders(ordersData.data);
      }

    } catch (err) {
      console.error("Erreur chargement données:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [session, status]);

  // Convertisseur PDF Bon d  // Générer le PDF du Bon de Commande (retourne base64 et optionnellement l'ouvre)
  const getOrderPDFBase64 = async (d: any, orderNumber: string, shouldOpen = false) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const ref = orderNumber;

    doc.setFillColor(16, 185, 129); // Vert Émeraude
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("AUTOP TUNISIE", 20, 24);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("BON DE COMMANDE DE PIÈCES DE RECHANGE - TUNIS", 20, 31);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Réf Commande : #${ref}`, 140, 20);
    doc.text(`Date : ${dateStr}`, 140, 26);

    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMATIONS DU BON DE COMMANDE", 20, 55);
    
    autoTable(doc, {
      startY: 65,
      head: [["Information", "Détail"]],
      body: [
        ["Nom du Client", session?.user?.name || "Client Autop"],
        ["Email", session?.user?.email || ""],
        ["Véhicule", `${d.brand} ${d.model}`.trim()],
        ["Numéro VIN", d.vin || "Non renseigné"],
        ["Adresse de Livraison", shippingAddress || "À spécifier"],
        ["Note client", customerNote || "Aucune"],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.text("ARTICLES DU BON DE COMMANDE", 20, finalY + 15);

    autoTable(doc, {
      startY: finalY + 22,
      head: [["N°", "Désignation / Article", "Quantité", "P.U. (TND)", "Remise (%)", "Total (TND)"]],
      body: editableItems.map((item: any, idx: number) => {
        const itemDiscount = item.discount || 0;
        const itemTotal = item.price * item.quantity * (1 - itemDiscount / 100);
        return [
          (idx + 1).toString(),
          item.name,
          item.quantity.toString(),
          item.price.toFixed(2),
          itemDiscount > 0 ? `${itemDiscount}%` : "-",
          itemTotal.toFixed(2)
        ];
      }),
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129] },
    });

    const tableY = (doc as any).lastAutoTable?.finalY || (finalY + 40);
    const subtotal = editableItems.reduce((sum, item) => sum + (item.price * item.quantity * (1 - (item.discount || 0) / 100)), 0);
    const tax = subtotal * 0.19;
    const total = subtotal + tax;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL H.T. : ${subtotal.toFixed(2)} TND`, 135, tableY + 10);
    doc.text(`TVA (19%) : ${tax.toFixed(2)} TND`, 135, tableY + 16);
    doc.text(`TOTAL T.T.C. : ${total.toFixed(2)} TND`, 135, tableY + 22);

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 280, 210, 17, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("AUTOP - Pieces Auto Charguia 2 - Tunis | Tel: +216 98 774 525 | Email: comptoir.distribution@autop.tn", 30, 290);

    if (shouldOpen) {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    }

    const dataUri = doc.output('datauristring');
    return dataUri.split(',')[1];
  };

  // Convertisseur Excel/CSV Bon de Commande
  const getOrderExcelBase64 = (d: any) => {
    const subtotal = editableItems.reduce((sum, item) => sum + (item.price * item.quantity * (1 - (item.discount || 0) / 100)), 0);
    const tax = subtotal * 0.19;
    const total = subtotal + tax;

    const csvContent = [
      ["BON DE COMMANDE AUTOP TUNISIE"],
      ["Nom du Client", session?.user?.name || ""],
      ["Email", session?.user?.email || ""],
      ["Vehicule", `${d.brand} ${d.model}`],
      ["VIN", d.vin || ""],
      ["Adresse de Livraison", shippingAddress],
      ["Note client", customerNote],
      [],
      ["Index", "Designation", "Quantite", "Prix Unitaire (TND)", "Remise (%)", "Total (TND)"],
      ...editableItems.map((item: any, idx: number) => {
        const itemDiscount = item.discount || 0;
        const itemTotal = item.price * item.quantity * (1 - itemDiscount / 100);
        return [
          (idx + 1).toString(),
          item.name,
          item.quantity.toString(),
          item.price.toFixed(2),
          itemDiscount.toString(),
          itemTotal.toFixed(2)
        ];
      }),
      [],
      ["Total H.T.", "", "", "", "", subtotal.toFixed(2)],
      ["TVA (19%)", "", "", "", "", tax.toFixed(2)],
      ["Total T.T.C.", "", "", "", "", total.toFixed(2)]
    ]
      .map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bomCsv = "\uFEFF" + csvContent;
    return btoa(unescape(encodeURIComponent(bomCsv)));
  };

  // Ouvrir le Devis en PDF dans un nouvel onglet
  const downloadQuotePDF = async (d: any) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    
    const doc = new jsPDF();
    const dateStr = d.date;

    const devisListSorted = [...devis].sort((a,b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    const seqIndex = devisListSorted.findIndex(item => item.id === d.id);
    const seqNumber = seqIndex !== -1 ? String(seqIndex + 1).padStart(6, '0') : d.id.slice(-6).toUpperCase();
    const ref = `DEV-${seqNumber}`;

    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("AUTOP TUNISIE", 20, 24);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("COMPTOIR DE DISTRIBUTION DE PIÈCES DE RECHANGE - TUNIS", 20, 31);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Référence : ${ref}`, 140, 20);
    doc.text(`Date : ${dateStr}`, 140, 26);

    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text("DEMANDE DE DEVIS CLIENT", 20, 55);
    
    autoTable(doc, {
      startY: 65,
      head: [["Information", "Détail"]],
      body: [
        ["Nom du Client", session?.user?.name || "Non renseigné"],
        ["Email du Client", session?.user?.email || "Non renseigné"],
        ["Véhicule", `${d.brand} ${d.model}`.trim() || "Non renseigné"],
        ["Numéro VIN (Châssis)", d.vin || "Non renseigné"],
        ["Remarques / Infos", d.remarks || "Aucune"],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text("LISTE DES PIÈCES DEMANDÉES", 20, finalY + 15);

    autoTable(doc, {
      startY: finalY + 22,
      head: [["N°", "Référence / Désignation", "Quantité"]],
      body: d.items.map((item: any, idx: number) => [
        (idx + 1).toString(),
        item.name,
        item.quantity.toString()
      ]),
      theme: "grid",
      headStyles: { fillColor: [220, 38, 38] },
    });

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 280, 210, 17, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("AUTOP - Pieces Auto Charguia 2 - Tunis | Tel: +216 98 774 525 | Email: comptoir.distribution@autop.tn", 30, 290);

    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  };

  // Soumettre le Bon de Commande
  const handlePlaceOrder = async () => {
    if (!shippingAddress.trim()) {
      alert("Veuillez renseigner une adresse de livraison.");
      return;
    }

    setIsSubmittingOrder(true);
    const d = orderModalDevis;
    const tempOrderNum = 'CMD-' + Date.now().toString().slice(-6).toUpperCase();

    try {
      let fileBase64 = '';
      let fileName = '';
      if (orderFormat === 'pdf') {
        fileBase64 = await getOrderPDFBase64(d, tempOrderNum, true);
        fileName = `Bon_Commande_AUTOP_${tempOrderNum}.pdf`;
      } else {
        fileBase64 = getOrderExcelBase64(d);
        fileName = `Bon_Commande_AUTOP_${tempOrderNum}.csv`;
        
        const blob = new Blob(["\uFEFF" + atob(fileBase64)], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Bon_Commande_${tempOrderNum}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      const res = await fetch("/api/orders/from-devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devisId: d.id,
          selectedFormat: orderFormat,
          fileBase64,
          fileName,
          shippingAddress,
          customerNote,
          modifiedItems: editableItems,
          shippingMethod,
          paymentMethod
        })
      });

      if (!res.ok) throw new Error("Erreur lors de la validation");

      const resData = await res.json();
      alert("✅ Votre bon de commande a été validé ! E-mail envoyé au comptoir.");

      // WhatsApp share redirect
      const text = `🚗 *NOUVEAU BON DE COMMANDE - AUTOP TUNISIE*
🆔 *Commande:* #${tempOrderNum}
👤 *Client:* ${session?.user?.name || ''} (${session?.user?.email || ''})
🚙 *Véhicule:* ${d.brand} ${d.model}
📍 *Adresse:* ${shippingAddress}
📝 *Notes:* ${customerNote || 'Aucune'}

📎 _Le bon de commande au format ${orderFormat.toUpperCase()} a été généré et transmis à notre équipe comptoir._`;

      // Ouvrir WhatsApp
      window.open(`https://wa.me/21698774525?text=${encodeURIComponent(text)}`, "_blank");

      // Reset
      setOrderModalDevis(null);
      setShippingAddress('');
      setCustomerNote('');
      loadData(); // Recharger les listes devis et commandes

    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de la commande.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'En attente de validation';
      case 'CONFIRMED': return 'Confirmée / En préparation';
      case 'SHIPPED': return 'Expédiée / En cours de livraison';
      case 'DELIVERED': return 'Livrée';
      case 'CANCELLED': return 'Annulée';
      default: return status;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 text-center">
        <div>
          <h2 className="text-2xl font-bold mb-4">Connexion Requise</h2>
          <p className="text-slate-400 mb-6">Veuillez vous connecter pour voir l'espace client.</p>
          <Link href="/connexion" className="bg-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Espace Client */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-10 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-widest text-white uppercase">
              ESPACE CLIENT AUTOP
            </h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
              SUIVEZ ET GÉREZ VOS DEMANDES DE DEVIS, VOS BONS DE COMMANDE ET VOS FACTURES
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Dashboard Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md sticky top-24 shadow-2xl">
              <h2 className="text-[10px] font-black text-slate-500 mb-6 tracking-widest uppercase">FONCTIONS ESPACE</h2>
              <nav className="flex flex-col gap-2.5">
                {[
                  { id: "devis", label: "MES DEVIS", icon: ClipboardList },
                  { id: "commandes", label: "SUIVI COMMANDES", icon: Package },
                  { id: "factures", label: "MES FACTURES", icon: Receipt },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition w-full text-left
                      ${activeTab === tab.id 
                        ? "bg-red-600 text-white shadow-lg shadow-red-600/30" 
                        : "bg-slate-950/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-900 hover:border-slate-850"
                      }
                    `}
                  >
                    <tab.icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col gap-3">
                <Link 
                  href="/devis" 
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-red-600/50 rounded-2xl text-xs font-black text-slate-200 transition uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4 text-red-500" />
                  NOUVEAU DEVIS
                </Link>
                <Link 
                  href="/" 
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-black text-slate-400 hover:text-slate-200 transition uppercase tracking-wider"
                >
                  RETOUR ACCUEIL
                </Link>
              </div>
            </div>
          </div>

          {/* Dashboard Right Content */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Search Bar */}
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-5 backdrop-blur-md shadow-xl flex gap-2 items-center">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input 
                type="text" 
                placeholder="RECHERCHER DIRECTEMENT PAR N° DEVIS, N° COMMANDE, MARQUE, OU MOT-CLÉ..." 
                className="bg-transparent text-sm text-white font-semibold uppercase placeholder:text-slate-500 placeholder:normal-case placeholder:font-normal focus:outline-none w-full"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
              />
              {clientSearch && (
                <button onClick={() => setClientSearch('')} className="text-slate-500 hover:text-slate-300 text-xs font-bold font-mono px-2">✕</button>
              )}
            </div>

            {/* TAB DEVIS */}
            {activeTab === 'devis' && (() => {
              const devisListSorted = [...devis].sort((a,b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
              const filteredDevis = devis.filter(d => {
                const seqIndex = devisListSorted.findIndex(item => item.id === d.id);
                const seqNumber = seqIndex !== -1 ? String(seqIndex + 1).padStart(6, '0') : '';
                const searchLower = clientSearch.toLowerCase();
                return (
                  `dev-${seqNumber}`.includes(searchLower) ||
                  seqNumber.includes(searchLower) ||
                  d.id.toLowerCase().includes(searchLower) ||
                  d.brand?.toLowerCase().includes(searchLower) ||
                  d.model?.toLowerCase().includes(searchLower) ||
                  d.vin?.toLowerCase().includes(searchLower) ||
                  d.status?.toLowerCase().includes(searchLower)
                );
              });

              return (
                <div className="space-y-6">
                  {filteredDevis.length === 0 && (
                    <p className="text-slate-500 py-10 text-center uppercase tracking-widest text-xs">Aucune demande de devis trouvée.</p>
                  )}

                  {filteredDevis.map((d) => {
                    const seqIndex = devisListSorted.findIndex(item => item.id === d.id);
                    const seqNumber = seqIndex !== -1 ? String(seqIndex + 1).padStart(6, '0') : d.id.slice(-6).toUpperCase();
                    return (
                      <div key={d.id} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md hover:border-slate-700/60 transition duration-300 shadow-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-slate-800/40">
                          <div>
                            <h3 className="font-black text-red-500 font-mono text-sm tracking-wider">DEVIS #DEV-{seqNumber}</h3>
                            <p className="text-xs text-slate-400 mt-1 uppercase">
                              Véhicule : <strong className="text-slate-200">{d.brand} {d.model}</strong> 
                              {d.vin && <> (VIN: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-[10px] text-red-400">{d.vin}</code>)</>}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase">Soumis le : {d.date}</p>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            {d.isTreated && d.status === 'Traité' ? (
                              <button
                                onClick={() => {
                                  setOrderModalDevis(d);
                                  setEditableItems(d.items.map((it: any) => ({ ...it, discount: it.discount || 0 })));
                                }}
                                className="chrome-gloss px-4 py-2 bg-red-650/15 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/30 rounded-xl text-[10px] font-black tracking-widest transition flex items-center gap-1.5 uppercase"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                OUVRIR & MODIFIER DEVIS
                              </button>
                            ) : (
                              <button
                                onClick={() => downloadQuotePDF(d)}
                                className="px-4 py-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20 rounded-xl text-[10px] font-black tracking-widest transition flex items-center gap-1.5 uppercase"
                              >
                                <Download className="w-3.5 h-3.5" />
                                VOIR DEVIS
                              </button>
                            )}
                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              d.isTreated 
                                ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                                : d.status === "Rejeté" 
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {d.status}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2.5 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Pièces demandées :</span>
                          {d.items?.map((p: any) => (
                            <div key={p.id} className="flex justify-between items-center text-sm border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                              <span className="text-slate-350 uppercase text-xs">{p.name}</span>
                              <span className="font-bold text-slate-400 text-xs font-mono">x{p.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {d.isTreated && d.status === 'Traité' && (
                          <div className="bg-green-600/5 border border-green-500/10 rounded-2xl p-5 mt-5">
                            <h4 className="text-green-400 font-black text-xs uppercase tracking-wider mb-2">Proposition Commerciale</h4>
                            <p className="text-xs text-slate-300 mb-4 uppercase">{d.response || 'Votre devis est traité par notre comptoir.'}</p>
                            
                            <button
                              onClick={() => {
                                setOrderModalDevis(d);
                                setEditableItems(d.items.map((it: any) => ({ ...it, discount: it.discount || 0 })));
                              }}
                              className="w-full px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                            >
                              🛒 Valider & Générer Bon de Commande
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* TAB COMMANDES */}
            {activeTab === 'commandes' && (() => {
              const filteredOrders = orders.filter(o => {
                const searchLower = clientSearch.toLowerCase();
                return (
                  o.orderNumber?.toLowerCase().includes(searchLower) ||
                  o.status?.toLowerCase().includes(searchLower) ||
                  o.customerNote?.toLowerCase().includes(searchLower) ||
                  o.items?.some((item: any) => item.productName?.toLowerCase().includes(searchLower))
                );
              });
              return (
                <div className="space-y-6">
                  {filteredOrders.length === 0 && (
                    <p className="text-slate-500 py-10 text-center uppercase tracking-widest text-xs">Aucune commande trouvée.</p>
                  )}

                  {filteredOrders.map((o) => (
                    <div key={o.id} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md hover:border-slate-700/60 transition duration-300 shadow-xl">
                      <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-800/40">
                        <div>
                          <h3 className="font-black text-green-400 font-mono text-sm tracking-wider">COMMANDE #{o.orderNumber}</h3>
                          <p className="text-xs text-slate-400 mt-1 uppercase">
                            Créée le : <strong className="text-slate-200">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</strong>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 uppercase">Montant Total TTC: <strong>{o.total.toFixed(3)} TND</strong></p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          o.status === 'DELIVERED' 
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : o.status === 'SHIPPED'
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : o.status === 'CANCELLED'
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {getOrderStatusLabel(o.status)}
                        </span>
                      </div>

                      {/* Statut Livraison / Notes de l'admin */}
                      <div className="mb-4 text-xs text-slate-355 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
                        <span className="font-black text-slate-500 block mb-1 uppercase tracking-widest text-[9px]">Suivi de livraison (Admin) :</span>
                        <p className="uppercase">{o.customerNote || "En attente de prise en charge par l'administrateur."}</p>
                      </div>

                      <div className="space-y-2.5 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Articles commandés :</span>
                        {o.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-sm border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                            <span className="text-slate-300 uppercase text-xs">{item.productName}</span>
                            <span className="font-bold text-slate-400 text-xs font-mono">x{item.quantity} | {item.price.toFixed(3)} TND</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* TAB FACTURES */}
            {activeTab === 'factures' && (
              <div className="space-y-6">
                {orders.filter(o => o.status === 'DELIVERED').length === 0 && (
                  <p className="text-slate-500 py-10 text-center uppercase tracking-widest text-xs">Aucune facture disponible. Les factures sont émises après livraison.</p>
                )}

                {orders.filter(o => o.status === 'DELIVERED').map((o) => (
                  <div key={o.id} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-700/60 transition duration-305 shadow-xl">
                    <div>
                      <h3 className="font-black text-white font-mono text-sm tracking-wider">FACTURE #{o.orderNumber.replace('CMD', 'FAC')}</h3>
                      <p className="text-xs text-slate-400 mt-1 uppercase">
                        Date d'émission : <strong className="text-slate-300">{new Date(o.updatedAt).toLocaleDateString('fr-FR')}</strong>
                      </p>
                      <p className="text-xs text-slate-400 uppercase">Montant réglé : <strong className="text-green-400 font-mono">{o.total.toFixed(3)} TND</strong></p>
                    </div>
                    
                    <button
                      onClick={async () => {
                        const { jsPDF } = await import("jspdf");
                        const autoTable = (await import("jspdf-autotable")).default;
                        const doc = new jsPDF();
                        const ref = o.orderNumber.replace('CMD', 'FAC');

                        doc.setFillColor(30, 41, 59);
                        doc.rect(0, 0, 210, 40, "F");
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(24);
                        doc.text("AUTOP TUNISIE", 20, 24);
                        doc.setFontSize(10);
                        doc.text("FACTURE ACQUITTEE - TUNIS", 20, 31);
                        
                        doc.setTextColor(0, 0, 0);
                        doc.text(`Facture : #${ref}`, 140, 20);
                        doc.text(`Date : ${new Date(o.updatedAt).toLocaleDateString('fr-FR')}`, 140, 26);

                        autoTable(doc, {
                          startY: 65,
                          head: [["Information", "Détail"]],
                          body: [
                            ["Nom du Client", session?.user?.name || "Client Autop"],
                            ["Email", session?.user?.email || ""],
                            ["Commande originale", o.orderNumber],
                            ["Adresse de livraison", o.shippingAddress || "N/A"],
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

                        doc.save(`Facture_AUTOP_${ref}.pdf`);
                      }}
                      className="flex items-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-blue-600/20 shrink-0"
                    >
                      <Download className="w-4 h-4" /> TÉLÉCHARGER FACTURE (PDF)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL POUR CRÉATION DE BON DE COMMANDE */}
      {orderModalDevis && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative text-left">
            <button 
              onClick={() => setOrderModalDevis(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-950/60 border border-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black mb-1 text-white uppercase tracking-wider">GÉNÉRER BON DE COMMANDE</h3>
            <p className="text-[10px] text-slate-400 mb-6 uppercase tracking-widest">
              COMMANDE DE PIÈCES À PARTIR DU DEVIS #{orderModalDevis.id.slice(-6).toUpperCase()}
            </p>

            <div className="space-y-6">
              {/* Adresse de livraison */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ADRESSE DE LIVRAISON *</label>
                <input
                  type="text"
                  placeholder="EX: 19 RUE DE L'USINE, CHARGUIA 2, TUNIS"
                  value={shippingAddress}
                  disabled={shippingMethod === 'AU MAGASIN'}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 transition font-semibold uppercase disabled:opacity-50"
                />
              </div>

              {/* Mode de livraison */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MODE DE LIVRAISON *</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'POWER TRANSPORT', label: 'POWER TRANSPORT' },
                    { id: 'PAR PROPRES MOYENS', label: 'PROPRES MOYENS' },
                    { id: 'AU MAGASIN', label: 'AU MAGASIN' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setShippingMethod(m.id as any)}
                      className={`py-2.5 rounded-xl text-[9px] font-black tracking-wider transition border ${
                        shippingMethod === m.id
                          ? 'bg-red-650 border-red-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode de paiement */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MODE DE PAIEMENT *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'CASH_ON_DELIVERY', label: 'A LA LIVRAISON' },
                    { id: 'BANK_TRANSFER', label: 'VIREMENT BANCAIRE' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaymentMethod(p.id as any)}
                      className={`py-2.5 rounded-xl text-[9px] font-black tracking-wider transition border ${
                        paymentMethod === p.id
                          ? 'bg-red-650 border-red-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-450 hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / Remarque client */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NOTE / INSTRUCTIONS PARTICULIÈRES (OPTIONNEL)</label>
                <textarea
                  placeholder="EX: LIVRER L'APRÈS-MIDI, VÉRIFIER LES COMPATIBILITÉS..."
                  rows={2}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500 transition font-semibold uppercase resize-none"
                />
              </div>

              {/* Format d'export */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">FORMAT DE TÉLÉCHARGEMENT</label>
                <div className="flex gap-4">
                  {[
                    { id: 'pdf', label: '📄 PDF OFFICIEL' },
                    { id: 'excel', label: '📊 EXCEL / CSV' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setOrderFormat(fmt.id as any)}
                      className={`flex-1 py-3 rounded-xl text-xs font-black tracking-wider transition border ${
                        orderFormat === fmt.id
                          ? 'bg-red-650 border-red-500 text-white shadow-lg shadow-red-600/25'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modifier les pièces et les remises */}
              <div className="border border-slate-800/80 rounded-2xl p-4 bg-slate-950/40 space-y-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">MODIFIER LES ARTICLES & REMISES</span>
                
                {editableItems.map((item, idx) => (
                  <div key={item.id || idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-3 border-b border-slate-850 last:border-0 last:pb-0">
                    <div className="flex-1 w-full">
                      <input 
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...editableItems];
                          updated[idx].name = e.target.value;
                          setEditableItems(updated);
                        }}
                        className="bg-transparent text-slate-200 border-b border-transparent hover:border-slate-800 focus:border-red-500 focus:outline-none text-xs font-bold w-full uppercase"
                      />
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">P.U. HT : {item.price.toFixed(3)} TND</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {/* Quantité */}
                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                        <span className="text-[9px] text-slate-500 font-black">QTÉ :</span>
                        <input 
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...editableItems];
                            updated[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                            setEditableItems(updated);
                          }}
                          className="bg-transparent text-white font-bold text-xs w-8 text-center focus:outline-none font-mono"
                        />
                      </div>

                      {/* Remise (%) */}
                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                        <span className="text-[9px] text-slate-500 font-black">REMISE :</span>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount || 0}
                          onChange={(e) => {
                            const updated = [...editableItems];
                            updated[idx].discount = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                            setEditableItems(updated);
                          }}
                          className="bg-transparent text-white font-bold text-xs w-10 text-center focus:outline-none font-mono"
                        />
                        <span className="text-[9px] text-slate-400 font-bold">%</span>
                      </div>

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editableItems.filter((_, i) => i !== idx);
                          setEditableItems(updated);
                        }}
                        className="p-1.5 bg-red-950/20 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/10 hover:border-red-500 rounded-lg transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {editableItems.length === 0 && (
                  <p className="text-xs text-red-400 text-center font-black">AUCUN ARTICLE DANS CETTE COMMANDE. VEUILLEZ ANNULER.</p>
                )}
              </div>

              {/* Dynamic Totals */}
              {(() => {
                const subtotal = editableItems.reduce((sum, item) => sum + (item.price * item.quantity * (1 - (item.discount || 0) / 100)), 0);
                const isFree = shippingMethod === 'AU MAGASIN' || shippingMethod === 'PAR PROPRES MOYENS' || shippingMethod === 'POWER TRANSPORT';
                const sCost = isFree ? 0 : 7.90;
                const tax = (subtotal + sCost) * 0.19;
                const total = subtotal + sCost + tax;
                return (
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 flex justify-between items-center text-xs">
                    <div>
                      <p className="text-slate-500 uppercase tracking-widest text-[9px]">TOTAL H.T. : {subtotal.toFixed(3)} TND</p>
                      <p className="text-slate-500 uppercase tracking-widest text-[9px] mt-1">FRAIS LIVRAISON : {sCost === 0 ? 'GRATUIT' : `${sCost.toFixed(3)} TND`}</p>
                      <p className="text-slate-500 uppercase tracking-widest text-[9px] mt-1">TVA (19%) : {tax.toFixed(3)} TND</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 uppercase tracking-widest text-[9px]">TOTAL T.T.C. :</p>
                      <p className="text-xl font-black text-green-400 font-mono mt-0.5">{total.toFixed(3)} TND</p>
                    </div>
                  </div>
                );
              })()}

              {/* Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setOrderModalDevis(null)}
                  className="flex-1 py-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition"
                >
                  ANNULER
                </button>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={isSubmittingOrder || editableItems.length === 0}
                  className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-green-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingOrder ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      TRAITEMENT...
                    </>
                  ) : (
                    'CONFIRMER COMMANDE'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}