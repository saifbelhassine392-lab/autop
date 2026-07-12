'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle, MessageCircle, FileText, Plus, FileSpreadsheet, Home } from 'lucide-react';
import Link from 'next/link';

export default function DevisPage() {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel'>('pdf');
  
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQuoteId, setSubmittedQuoteId] = useState<string | null>(null);
  
  const [items, setItems] = useState([{ reference: '', designation: '', quantity: 1 }]);
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

  const handleAddItem = () => {
    setItems([...items, { reference: '', designation: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Convertisseur PDF en Base64
  const getPDFBase64 = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString("fr-FR");

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
    doc.text(`Date : ${dateStr}`, 140, 20);

    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text("DEMANDE DE DEVIS CLIENT", 20, 55);
    
    autoTable(doc, {
      startY: 65,
      head: [["Information", "Détail"]],
      body: [
        ["Nom du Client", clientName || "Non renseigné"],
        ["Email du Client", clientEmail || "Non renseigné"],
        ["Véhicule", `${brand} ${model}`.trim() || "Non renseigné"],
        ["Numéro VIN (Châssis)", vin || "Non renseigné"],
        ["Remarques / Infos", remarks || "Aucune"],
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
      head: [["N°", "Référence", "Désignation", "Quantité"]],
      body: items.map((item, idx) => [
        (idx + 1).toString(),
        item.reference || "Générique / Autre",
        item.designation,
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

    const dataUri = doc.output('datauristring');
    return dataUri.split(',')[1];
  };

  // Convertisseur Excel/CSV en Base64
  const getExcelBase64 = () => {
    const csvContent = [
      ["Information", "Detail"],
      ["Nom du Client", clientName],
      ["Email du Client", clientEmail],
      ["Vehicule", `${brand} ${model}`],
      ["Numero VIN", vin || "N/A"],
      ["Remarques", remarks || "N/A"],
      [],
      ["Index", "Reference", "Designation", "Quantite"],
      ...items.map((item, idx) => [
        (idx + 1).toString(),
        item.reference || "Generique",
        item.designation,
        item.quantity.toString()
      ])
    ]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bomCsv = "\uFEFF" + csvContent;
    return btoa(unescape(encodeURIComponent(bomCsv)));
  };

  // Téléchargement Local PDF
  const downloadPDF = async (quoteId: string) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString("fr-FR");
    const ref = `DEVIS-${quoteId.slice(-6).toUpperCase()}`;

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
        ["Nom du Client", clientName || "Non renseigné"],
        ["Email du Client", clientEmail || "Non renseigné"],
        ["Véhicule", `${brand} ${model}`.trim() || "Non renseigné"],
        ["Numéro VIN (Châssis)", vin || "Non renseigné"],
        ["Remarques / Infos", remarks || "Aucune"],
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
      head: [["N°", "Référence", "Désignation", "Quantité"]],
      body: items.map((item, idx) => [
        (idx + 1).toString(),
        item.reference || "Générique / Autre",
        item.designation,
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

    doc.save(`Demande_Devis_AUTOP_${ref}.pdf`);
  };

  // Téléchargement Local Excel
  const downloadExcel = (quoteId: string) => {
    const ref = quoteId.slice(-6).toUpperCase();
    const csvContent = [
      ["Information", "Detail"],
      ["Nom du Client", clientName],
      ["Email du Client", clientEmail],
      ["Vehicule", `${brand} ${model}`],
      ["Numero VIN", vin || "N/A"],
      ["Remarques", remarks || "N/A"],
      [],
      ["Index", "Reference", "Designation", "Quantite"],
      ...items.map((item, idx) => [
        (idx + 1).toString(),
        item.reference || "Generique",
        item.designation,
        item.quantity.toString()
      ])
    ]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Demande_Devis_AUTOP_#${ref}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = (phoneNumber: string, quoteId: string) => {
    // Télécharge automatiquement le format choisi en local
    if (selectedFormat === 'pdf') {
      downloadPDF(quoteId);
    } else {
      downloadExcel(quoteId);
    }

    const text = `🚗 *NOUVELLE DEMANDE DE DEVIS - AUTOP TUNISIE*
🆔 *Référence:* #DEVIS-${quoteId.slice(-6).toUpperCase()}
👤 *Client:* ${clientName} (${clientEmail})
🚙 *Véhicule:* ${brand} ${model}
🆔 *VIN (Châssis):* ${vin || 'Non renseigné'}
📝 *Remarques:* ${remarks || 'Aucune'}

📎 _Le document de devis au format ${selectedFormat.toUpperCase()} a été téléchargé sur votre appareil. Veuillez le joindre à cette discussion._`;

    window.open(`https://wa.me/216${phoneNumber}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleConfirmAndSubmit = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      alert("Veuillez remplir le nom et l'email du client.");
      return;
    }

    setIsSubmitting(true);

    try {
      let fileBase64 = '';
      let fileName = '';

      if (selectedFormat === 'pdf') {
        fileBase64 = await getPDFBase64();
        fileName = `Devis_AUTOP_${Date.now()}.pdf`;
      } else {
        fileBase64 = getExcelBase64();
        fileName = `Devis_AUTOP_${Date.now()}.csv`;
      }

      const payload = {
        clientName,
        clientEmail,
        brand,
        model,
        vin,
        remarks,
        photo: photoBase64,
        photoName: photoName,
        items: items.map(i => ({ 
          reference: i.reference, 
          designation: i.designation, 
          quantity: Number(i.quantity) 
        })),
        fileBase64,
        fileFormat: selectedFormat === 'pdf' ? 'pdf' : 'csv',
        fileName
      };

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erreur serveur");

      const data = await res.json();
      setSubmittedQuoteId(data.id);

    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setClientName('');
    setClientEmail('');
    setBrand('');
    setModel('');
    setVin('');
    setRemarks('');
    setItems([{ reference: '', designation: '', quantity: 1 }]);
    setPhotoBase64(null);
    setPhotoName('');
    setSubmittedQuoteId(null);
  };

  if (submittedQuoteId) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-slate-950/60 backdrop-blur-md min-h-screen text-slate-100 flex items-center justify-center">
        <div className="neon-border-glow bg-slate-900/60 backdrop-blur-sm/80 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl w-full backdrop-blur-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white mb-2">Demande Confirmée !</h2>
          <p className="text-sm text-slate-400 mb-6">
            Votre demande a été enregistrée. L'e-mail a été envoyé avec le fichier **{selectedFormat.toUpperCase()}** joint au client et à notre comptoir (**comptoir.distribution@autop.tn**).
          </p>

          <div className="space-y-3 mb-8">
            <button
              onClick={() => downloadPDF(submittedQuoteId)}
              className="chrome-gloss w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-blue-650 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            >
              <FileText className="w-4 h-4" />
              Télécharger le devis en format PDF
            </button>

            <button
              onClick={() => downloadExcel(submittedQuoteId)}
              className="chrome-gloss w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Télécharger le devis en format Excel (.csv)
            </button>

            <button
              onClick={() => handleWhatsAppShare('98774525', submittedQuoteId)}
              className="chrome-gloss w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageCircle className="w-4 h-4" />
              Envoyer par WhatsApp (Comptoir 98 774 525)
            </button>

            <button
              onClick={() => handleWhatsAppShare('95576525', submittedQuoteId)}
              className="chrome-gloss w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageCircle className="w-4 h-4" />
              Envoyer par WhatsApp (Comptoir 95 576 525)
            </button>
          </div>

          <button
            onClick={handleResetForm}
            className="text-xs text-slate-400 hover:text-white font-semibold transition-colors flex items-center justify-center gap-1 mx-auto"
          >
            <Plus className="w-3 h-3" />
            Faire une autre demande de devis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-950/60 backdrop-blur-md min-h-screen text-slate-100">
      <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-white hover:border-red-500 transition mb-6 font-bold text-sm">
        <Home className="w-4 h-4" /> Accueil
      </Link>
      <h1 className="text-3xl font-black mb-8 tracking-tight text-white border-b border-slate-800 pb-4">
        Formulaire de Devis
      </h1>
      
      {/* Card 1: Informations Client et Véhicule */}
      <div className="tilt-card-3d bg-slate-900/60 backdrop-blur-sm/40 border border-slate-800/80 rounded-[28px] p-6 md:p-8 backdrop-blur-md shadow-xl mb-6">
        <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">1. INFORMATIONS CLIENT & VÉHICULE</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-450 mb-1">NOM COMPLET *</label>
            <input 
              type="text" 
              placeholder="Nom complet" 
              className="bg-slate-950/60 text-slate-100 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all" 
              value={clientName} 
              onChange={(e) => setClientName(e.target.value)} 
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-450 mb-1">EMAIL DU CLIENT *</label>
            <input 
              type="email" 
              placeholder="votre@email.com" 
              className="bg-slate-950/60 text-slate-100 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all lowercase" 
              value={clientEmail} 
              onChange={(e) => setClientEmail(e.target.value)} 
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-450 mb-1">MARQUE DU VÉHICULE</label>
            <input 
              type="text" 
              placeholder="Ex: Peugeot, Renault..." 
              className="bg-slate-950/60 text-slate-100 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all" 
              value={brand} 
              onChange={(e) => setBrand(e.target.value)} 
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-450 mb-1">MODÈLE DU VÉHICULE</label>
            <input 
              type="text" 
              placeholder="Ex: 308, Clio..." 
              className="bg-slate-950/60 text-slate-100 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all" 
              value={model} 
              onChange={(e) => setModel(e.target.value)} 
            />
          </div>
          <div className="flex flex-col md:col-span-2">
            <label className="text-xs font-semibold text-slate-450 mb-1">NUMÉRO VIN (CHÂSSIS) - CONSEILLÉ</label>
            <input 
              type="text" 
              placeholder="Numéro VIN (17 caractères)" 
              className="bg-slate-950/60 text-slate-100 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono tracking-wider" 
              value={vin} 
              onChange={(e) => setVin(e.target.value)} 
            />
          </div>
          <div className="flex flex-col md:col-span-2">
            <label className="text-xs font-semibold text-slate-450 mb-1">REMARQUES ET INFORMATIONS COMPLÉMENTAIRES</label>
            <textarea 
              placeholder="Précisez ici toute information utile (motorisation, année de mise en circulation, etc.)..." 
              rows={3} 
              className="bg-slate-950/60 text-slate-100 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none normal-case" 
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Card 2: Liste des Pièces & Format */}
      <div className="tilt-card-3d bg-slate-900/60 backdrop-blur-sm/40 border border-slate-800/80 rounded-[28px] p-6 md:p-8 backdrop-blur-md shadow-xl mb-6">
        <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">2. CHOIX DU FORMAT & PIÈCES DEMANDÉES</div>
        
        <div className="flex flex-col mb-6 bg-slate-950/40 p-4 border border-slate-800 rounded-2xl">
          <label className="text-xs font-semibold text-slate-400 mb-2">FORMAT DE PIÈCE JOINTE REQUIS *</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
              <input 
                type="radio" 
                name="docFormat" 
                checked={selectedFormat === 'pdf'} 
                onChange={() => setSelectedFormat('pdf')} 
                className="text-red-500 focus:ring-red-500 bg-slate-900/60 backdrop-blur-sm border-slate-800" 
              />
              Document PDF (.pdf)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
              <input 
                type="radio" 
                name="docFormat" 
                checked={selectedFormat === 'excel'} 
                onChange={() => setSelectedFormat('excel')} 
                className="text-red-500 focus:ring-red-500 bg-slate-900/60 backdrop-blur-sm border-slate-800" 
              />
              Feuille de calcul Excel (.csv)
            </label>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <div className="w-1/3 relative">
                <input 
                  placeholder="Réf" 
                  className="w-full bg-slate-950/60 text-slate-100 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono text-sm uppercase" 
                  value={item.reference} 
                  onChange={(e) => {
                    handleItemChange(idx, 'reference', e.target.value);
                    setActiveSuggestRow(idx);
                    setActiveSuggestField('ref');
                  }}
                  onFocus={() => {
                    setActiveSuggestRow(idx);
                    setActiveSuggestField('ref');
                  }}
                  onBlur={() => setTimeout(() => {
                    setActiveSuggestRow(null);
                    setActiveSuggestField(null);
                  }, 200)}
                />
                {item.reference && (() => {
                  const match = catalogue.find(x => x.reference?.toUpperCase() === item.reference?.toUpperCase());
                  return match ? (
                    <span className="text-[10px] text-green-400 font-black block mt-1 uppercase tracking-wider">✓ Disponible en stock (Qté: {match.stock})</span>
                  ) : (
                    <span className="text-[10px] text-amber-500 font-black block mt-1 uppercase tracking-wider">⚡ Nouveau produit</span>
                  );
                })()}
                {activeSuggestRow === idx && activeSuggestField === 'ref' && getSuggestions(item.reference, 'ref').length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-slate-950 border border-slate-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl">
                    {getSuggestions(item.reference, 'ref').map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          handleItemChange(idx, 'reference', p.reference || '');
                          handleItemChange(idx, 'designation', p.name || '');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between"
                      >
                        <span className="text-red-400 font-mono font-bold">{p.reference}</span>
                        <span className="text-slate-400 text-[10px] truncate max-w-[120px]">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 relative">
                <input 
                  placeholder="Désignation (ex: Plaquettes de frein...)" 
                  className="w-full bg-slate-950/60 text-slate-100 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm uppercase" 
                  value={item.designation} 
                  onChange={(e) => {
                    handleItemChange(idx, 'designation', e.target.value);
                    setActiveSuggestRow(idx);
                    setActiveSuggestField('desc');
                  }}
                  onFocus={() => {
                    setActiveSuggestRow(idx);
                    setActiveSuggestField('desc');
                  }}
                  onBlur={() => setTimeout(() => {
                    setActiveSuggestRow(null);
                    setActiveSuggestField(null);
                  }, 200)}
                />
                {activeSuggestRow === idx && activeSuggestField === 'desc' && getSuggestions(item.designation, 'desc').length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-slate-950 border border-slate-800 rounded-xl max-h-48 overflow-y-auto shadow-2xl">
                    {getSuggestions(item.designation, 'desc').map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          handleItemChange(idx, 'reference', p.reference || '');
                          handleItemChange(idx, 'designation', p.name || '');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs font-semibold text-slate-200 border-b border-slate-900 last:border-0 flex items-center justify-between"
                      >
                        <span className="text-white truncate max-w-[150px]">{p.name}</span>
                        <span className="text-red-400 font-mono text-[9px]">{p.reference}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input 
                type="number" 
                min={1} 
                className="w-16 bg-slate-950/60 text-slate-100 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-center font-bold text-sm" 
                value={item.quantity} 
                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} 
              />
              <button 
                onClick={() => handleRemoveItem(idx)} 
                className="text-red-500 hover:text-red-400 p-2 font-bold transition-colors"
                title="Supprimer la ligne"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button 
          onClick={handleAddItem} 
          className="text-xs text-red-500 hover:text-red-400 font-bold mt-4 inline-block transition-colors"
        >
          ➕ Ajouter une autre pièce
        </button>
      </div>

      {/* Card 3: Chargement de Photos */}
      <div className="tilt-card-3d bg-slate-900/60 backdrop-blur-sm/40 border border-slate-800/80 rounded-[28px] p-6 md:p-8 backdrop-blur-md shadow-xl mb-8">
        <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">3. PHOTOS DU VÉHICULE OU DE LA PIÈCE (OPTIONNEL)</div>
        <input 
          type="file" 
          onChange={handleFileChange} 
          className="text-slate-400 text-xs file:bg-slate-800 file:text-slate-100 file:border-0 file:rounded-xl file:px-4 file:py-2 file:mr-4 file:hover:bg-slate-700 file:cursor-pointer transition-colors" 
        />
        {photoName && <span className="text-xs text-green-400 mt-2 block">Fichier prêt : {photoName}</span>}
      </div>

      <button 
        disabled={isSubmitting}
        onClick={handleConfirmAndSubmit}
        className="chrome-gloss w-full bg-gradient-to-r from-red-650 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all disabled:from-red-900 disabled:to-red-950 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-red-600/20 hover:scale-[1.01] active:scale-[0.99]"
      >
        {isSubmitting ? 'Enregistrement...' : 'CONFIRMER ET ENVOYER LA DEMANDE'}
      </button>
    </div>
  );
}