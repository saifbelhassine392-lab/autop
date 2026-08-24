'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle, MessageCircle, FileText, Plus, FileSpreadsheet, Home } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import VehicleAutocomplete from '@/components/VehicleAutocomplete';
import { notifyQuotesSync } from '@/lib/syncEvents';

export default function DevisPage() {
  const { data: session } = useSession();
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel'>('pdf');

  useEffect(() => {
    if (session?.user) {
      setClientName(prev => prev || session.user.name || '');
      setClientEmail(prev => prev || session.user.email || '');
    }
  }, [session]);
  
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('');
  
  const [chassisPhotoBase64, setChassisPhotoBase64] = useState<string | null>(null);
  const [chassisPhotoName, setChassisPhotoName] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQuoteId, setSubmittedQuoteId] = useState<string | null>(null);
  
  const [items, setItems] = useState([{ reference: '', designation: '', quantity: 1, brandPreference: 'Indifférent' }]);
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
    setItems([...items, { reference: '', designation: '', quantity: 1, brandPreference: 'Indifférent' }]);
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

  const handleChassisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setChassisPhotoName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => setChassisPhotoBase64(reader.result as string);
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

  const [submittedSummary, setSubmittedSummary] = useState<{
    id: string;
    clientName: string;
    clientEmail: string;
    brand: string;
    model: string;
    vin: string;
    remarks: string;
    items: any[];
  } | null>(null);

  const handleWhatsAppShare = (phoneNumber: string, quoteId: string) => {
    // Télécharge automatiquement le format choisi en local
    if (selectedFormat === 'pdf') {
      downloadPDF(quoteId);
    } else {
      downloadExcel(quoteId);
    }

    const itemsSummary = (submittedSummary?.items || items).map((it, idx) => 
      `  • *${it.reference || 'RÉF. NON SPÉCIFIÉE'}* : ${it.designation || 'Article'} (x${it.quantity})`
    ).join('\n');

    const text = `🚗 *NOUVELLE DEMANDE DE DEVIS - AUTOP TUNISIE*
🆔 *Référence:* #DEVIS-${quoteId.slice(-6).toUpperCase()}
👤 *Client:* ${clientName} (${clientEmail})
🚙 *Véhicule:* ${brand} ${model}
🆔 *VIN (Châssis):* ${vin || 'Non renseigné'}
📝 *Remarques:* ${remarks || 'Aucune'}

📦 *LISTE DES PIÈCES DEMANDÉES :*
${itemsSummary}

📎 _Le document de devis (${selectedFormat.toUpperCase()}) a été généré et téléchargé._`;

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

      const formattedItems = items.map(i => ({ 
        reference: i.reference, 
        designation: `${i.designation} ${i.brandPreference && i.brandPreference !== 'Indifférent' ? `(${i.brandPreference})` : ''}`.trim(), 
        quantity: Number(i.quantity) 
      }));

      const payload = {
        clientName,
        clientEmail,
        brand,
        model,
        vin,
        remarks,
        photo: photoBase64,
        photoName: photoName,
        items: formattedItems,
        chassisPhoto: chassisPhotoBase64,
        chassisPhotoName: chassisPhotoName,
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
      notifyQuotesSync();
      setSubmittedQuoteId(data.id);
      setSubmittedSummary({
        id: data.id,
        clientName,
        clientEmail,
        brand,
        model,
        vin,
        remarks,
        items: formattedItems
      });

    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          if (!bstr) return;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          if (data.length === 0) {
            alert("Le fichier Excel est vide.");
            return;
          }
          
          // Trouver les en-têtes
          let headerRowIndex = 0;
          while (headerRowIndex < data.length && (!data[headerRowIndex] || data[headerRowIndex].length === 0)) {
            headerRowIndex++;
          }
          
          if (headerRowIndex >= data.length) {
            alert("Aucune donnée trouvée dans le fichier.");
            return;
          }
          
          const headers = data[headerRowIndex].map((h: any) => String(h || '').trim().toLowerCase());
          
          // Identifier les index des colonnes
          let desCol = headers.findIndex((h: string) => h.includes("desi") || h.includes("nom") || h.includes("article") || h.includes("item") || h.includes("description") || h.includes("libelle") || h.includes("libellé"));
          let refCol = headers.findIndex((h: string) => h.includes("ref") || h.includes("sku") || h.includes("code") || h.includes("part"));
          let qteCol = headers.findIndex((h: string) => h.includes("qte") || h.includes("quant") || h.includes("qty") || h.includes("nbr") || h.includes("nombre"));
          
          // Fallback par défaut
          if (desCol === -1 && refCol === -1) {
            refCol = 0;
            desCol = 1;
            qteCol = data[headerRowIndex].length > 2 ? 2 : -1;
          }
          
          const importedItems: any[] = [];
          const startRow = (headers.includes("reference") || headers.includes("designation") || headers.includes("ref") || headers.includes("desi")) ? headerRowIndex + 1 : headerRowIndex;
          
          for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            
            const designation = desCol !== -1 ? String(row[desCol] || '').trim() : '';
            const reference = refCol !== -1 ? String(row[refCol] || '').trim().toUpperCase() : '';
            
            let quantity = 1;
            if (qteCol !== -1 && row[qteCol] !== undefined) {
              const parsedQte = parseInt(row[qteCol]);
              if (!isNaN(parsedQte) && parsedQte > 0) {
                quantity = parsedQte;
              }
            }
            
            if (designation || reference) {
              importedItems.push({
                reference,
                designation,
                quantity,
                brandPreference: 'Indifférent'
              });
            }
          }
          
          if (importedItems.length === 0) {
            alert("Aucune ligne valide n'a pu être importée. Assurez-vous d'avoir des colonnes valides.");
            return;
          }
          
          if (items.length === 1 && !items[0].reference && !items[0].designation) {
            setItems(importedItems);
          } else {
            setItems([...items, ...importedItems]);
          }
          
          alert(`${importedItems.length} article(s) importé(s) avec succès !`);
        } catch (err) {
          console.error(err);
          alert("Erreur lors de la lecture du fichier Excel.");
        }
      };
      
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du chargement du module d'import.");
    }
  };

  const handleResetForm = () => {
    setClientName('');
    setClientEmail('');
    setBrand('');
    setModel('');
    setVin('');
    setRemarks('');
    setItems([{ reference: '', designation: '', quantity: 1, brandPreference: 'Indifférent' }]);
    setPhotoBase64(null);
    setPhotoName('');
    setChassisPhotoBase64(null);
    setChassisPhotoName('');
    setSubmittedQuoteId(null);
    setSubmittedSummary(null);
  };

  if (submittedQuoteId) {
    const summaryItems = submittedSummary?.items || items;
    const refDisplay = `#DEVIS-${submittedQuoteId.slice(-6).toUpperCase()}`;

    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-slate-950 min-h-screen text-slate-100 flex items-center justify-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl w-full">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3 animate-bounce" />
          <div className="inline-block bg-green-950/80 border border-green-500/30 text-green-400 font-mono font-black text-xs px-3 py-1 rounded-full mb-3">
            {refDisplay}
          </div>
          <h2 className="text-2xl font-black text-white mb-2">DEMANDE CONFIRMÉE !</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-6">
            Votre demande a été enregistrée et transmise par e-mail en direct à l'administrateur (<strong className="text-white">saifbelhassine392@gmail.com</strong>).
          </p>

          {/* Récapitulatif Visuel des Pièces Demandées */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left mb-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                🚗 {submittedSummary?.brand || brand} {submittedSummary?.model || model} {submittedSummary?.vin && `· VIN: ${submittedSummary.vin}`}
              </span>
              <span className="text-[10px] font-bold text-red-400 bg-red-950/50 border border-red-800/40 px-2 py-0.5 rounded-full">
                {summaryItems.length} PIÈCE(S)
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {summaryItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800/80 text-xs">
                  <div className="flex flex-col">
                    <span className="font-mono font-black text-red-400">{item.reference || 'SANS RÉFÉRENCE'}</span>
                    <span className="text-slate-300 text-[11px]">{item.designation || 'Pièce de rechange'}</span>
                  </div>
                  <span className="font-mono font-black text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                    x{item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {submittedSummary?.remarks && (
              <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                Note client : "{submittedSummary.remarks}"
              </div>
            )}
          </div>

          <div className="space-y-2.5 mb-6">
            <button
              onClick={() => downloadPDF(submittedQuoteId)}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            >
              <FileText className="w-4 h-4" />
              Télécharger le devis en format PDF
            </button>

            <button
              onClick={() => downloadExcel(submittedQuoteId)}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Télécharger le devis en format Excel (.csv)
            </button>

            <button
              onClick={() => handleWhatsAppShare('98774525', submittedQuoteId)}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageCircle className="w-4 h-4" />
              Transmettre les pièces par WhatsApp (Comptoir 98 774 525)
            </button>

            <button
              onClick={() => handleWhatsAppShare('95576525', submittedQuoteId)}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageCircle className="w-4 h-4" />
              Transmettre les pièces par WhatsApp (Comptoir 95 576 525)
            </button>

            <a
              href={`mailto:saifbelhassine392@gmail.com?subject=${encodeURIComponent(`Demande de Devis ${refDisplay} - ${clientName}`)}&body=${encodeURIComponent(
                `Bonjour,\n\nVoici le détail de ma demande de devis (${refDisplay}) :\n\nClient: ${clientName} (${clientEmail})\nVéhicule: ${brand} ${model}\nVIN: ${vin || 'N/A'}\n\nPièces demandées :\n${summaryItems.map((it, idx) => `${idx + 1}. ${it.reference || 'N/A'} - ${it.designation} (x${it.quantity})`).join('\n')}\n\nMerci d'avance.`
              )}`}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold uppercase tracking-wider rounded-xl text-xs transition-all border border-slate-700"
            >
              ✉️ Ouvrir dans Gmail / Client Mail
            </a>
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
          <VehicleAutocomplete
            brand={brand}
            model={model}
            onBrandChange={setBrand}
            onModelChange={setModel}
            className="md:col-span-2"
          />
          <div className="flex flex-col md:col-span-2">
            <label className="text-xs font-semibold text-slate-450 mb-1">NUMÉRO VIN (CHÂSSIS) - CONSEILLÉ</label>
            <input 
              type="text" 
              placeholder="Numéro VIN (17 caractères)" 
              maxLength={17}
              className="bg-slate-950/60 text-slate-100 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono tracking-wider uppercase" 
              value={vin} 
              onChange={(e) => setVin(e.target.value.replace(/[oO]/g, '0').toUpperCase())} 
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (idx === items.length - 1) handleAddItem();
                    }
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (idx === items.length - 1) handleAddItem();
                    }
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

              <select
                className="w-28 bg-slate-950/60 text-slate-100 p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-[10px] uppercase font-bold text-center"
                value={item.brandPreference || 'Indifférent'}
                onChange={(e) => handleItemChange(idx, 'brandPreference', e.target.value)}
              >
                <option value="Indifférent">Indifférent</option>
                <option value="Origine">Origine</option>
                <option value="Adaptable">Adaptable</option>
              </select>

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
        <div className="flex gap-4 items-center mt-4">
          <button 
            onClick={handleAddItem} 
            className="text-xs text-red-500 hover:text-red-400 font-bold transition-colors"
          >
            ➕ Ajouter une autre pièce
          </button>
          <span className="text-slate-700 text-xs">|</span>
          <label className="text-xs text-green-500 hover:text-green-400 font-bold cursor-pointer transition-colors flex items-center gap-1.5 select-none">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Importer Excel (.xlsx, .csv)
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              onChange={handleExcelImport} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {/* Card 3: Chargement de Photos */}
      <div className="tilt-card-3d bg-slate-900/60 backdrop-blur-sm/40 border border-slate-800/80 rounded-[28px] p-6 md:p-8 backdrop-blur-md shadow-xl mb-8">
        <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">3. PHOTOS (CARTE GRISE, PIÈCE) - OPTIONNEL</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-2xl flex flex-col justify-center">
            <label className="text-xs font-semibold text-slate-400 mb-2">PHOTO CARTE GRISE / CHÂSSIS</label>
            <p className="text-[10px] text-slate-500 mb-3">Si vous n'avez pas saisi le VIN, vous pouvez prendre une photo de votre carte grise ou du pare-brise.</p>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleChassisFileChange} 
              className="text-slate-400 text-xs file:bg-slate-800 file:text-slate-100 file:border-0 file:rounded-xl file:px-4 file:py-2 file:mr-4 file:hover:bg-slate-700 file:cursor-pointer transition-colors w-full" 
            />
            {chassisPhotoName && <span className="text-[10px] text-green-400 font-bold mt-2 block">✓ Fichier prêt : {chassisPhotoName}</span>}
          </div>
          <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-2xl flex flex-col justify-center">
            <label className="text-xs font-semibold text-slate-400 mb-2">AUTRES PHOTOS (PIÈCE, VÉHICULE)</label>
            <p className="text-[10px] text-slate-500 mb-3">Photo de l'ancienne pièce, dommage sur la carrosserie, etc.</p>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileChange} 
              className="text-slate-400 text-xs file:bg-slate-800 file:text-slate-100 file:border-0 file:rounded-xl file:px-4 file:py-2 file:mr-4 file:hover:bg-slate-700 file:cursor-pointer transition-colors w-full" 
            />
            {photoName && <span className="text-[10px] text-green-400 font-bold mt-2 block">✓ Fichier prêt : {photoName}</span>}
          </div>
        </div>
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