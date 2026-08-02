"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, Mail, MessageCircle, Download, Camera, X, FileText } from "lucide-react";
import VehicleAutocomplete from "@/components/VehicleAutocomplete";

interface DevisFormData {
  message: string;
  photos: File[];
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  vehicleInfo: string;
}

export default function DevisForm() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [formData, setFormData] = useState<DevisFormData>({
    message: "",
    photos: [],
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    vehicleInfo: "",
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    const maxSize = 10 * 1024 * 1024;
    
    if (!validTypes.includes(file.type)) {
      alert(`Type non supporté: ${file.type}. Utilisez JPG, PNG ou PDF.`);
      return false;
    }
    if (file.size > maxSize) {
      alert(`Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}Mo. Max 10Mo.`);
      return false;
    }
    return true;
  };

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).filter(validateFile);
    const totalFiles = formData.photos.length + newFiles.length;
    
    if (totalFiles > 5) {
      alert("Maximum 5 fichiers autorisés.");
      return;
    }

    const newProgress = new Array(newFiles.length).fill(0);
    setUploadProgress(prev => [...prev, ...newProgress]);
    
    newFiles.forEach((_, idx) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[formData.photos.length + idx] = progress;
          return updated;
        });
      }, 200);
    });

    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newFiles],
    }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [formData.photos]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
  };

  const generatePDF = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString("fr-FR");
    const ref = `DEVIS-${Date.now().toString(36).toUpperCase()}`;

    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("AUTOP", 20, 25);
    doc.setFontSize(10);
    doc.text("PIECES AUTO - CHARGUIA 2 - TUNIS", 20, 32);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Référence: ${ref}`, 140, 20);
    doc.text(`Date: ${date}`, 140, 26);

    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text("DEMANDE DE DEVIS", 20, 55);
    
    autoTable(doc, {
      startY: 65,
      head: [["Information", "Détail"]],
      body: [
        ["Nom", formData.clientName || "Non renseigné"],
        ["Email", formData.clientEmail || "Non renseigné"],
        ["Téléphone", formData.clientPhone || "Non renseigné"],
        ["Véhicule", formData.vehicleInfo || "Non renseigné"],
      ],
      theme: "striped",
      headStyles: { fillColor: [220, 38, 38] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text("MESSAGE", 20, finalY + 15);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    
    const splitMessage = doc.splitTextToSize(formData.message || "Aucun message", 170);
    doc.text(splitMessage, 20, finalY + 25);

    if (formData.photos.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text(`PHOTOS JOINTES (${formData.photos.length})`, 20, finalY + 50);
      formData.photos.forEach((photo, i) => {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`• ${photo.name} (${(photo.size / 1024).toFixed(1)} Ko)`, 25, finalY + 58 + i * 7);
      });
    }

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 280, 210, 17, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("AUTOP - Pieces Auto Charguia 2 - Tunis | Tel: +216 98 774 525", 55, 290);

    doc.save(`Devis_AUTOP_${ref}.pdf`);
    return ref;
  };

  const sendEmail = async () => {
    if (!formData.message.trim()) {
      alert("Veuillez remplir le message obligatoire.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const emailBody = `
Nouvelle demande de devis AUTOP

Client: ${formData.clientName || "Non renseigné"}
Email: ${formData.clientEmail || "Non renseigné"}
Téléphone: ${formData.clientPhone || "Non renseigné"}
Véhicule: ${formData.vehicleInfo || "Non renseigné"}

Message:
${formData.message}

Photos jointes: ${formData.photos.length} fichier(s)
      `.trim();

      const subject = encodeURIComponent("Demande de Devis - AUTOP");
      const body = encodeURIComponent(emailBody);
      window.open(`mailto:saifbelhassine392@gmail.com?subject=${subject}&body=${body}`, "_blank");
      
      alert("✅ Votre client email s'est ouvert. Veuillez envoyer le message.");
    } catch {
      alert("❌ Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWhatsApp = () => {
    if (!formData.message.trim()) {
      alert("Veuillez remplir le message obligatoire.");
      return;
    }

    const phoneNumber = "21698774525";
    const message = `
🚗 *Nouvelle demande de devis AUTOP*

👤 *Client:* ${formData.clientName || "Non renseigné"}
📧 *Email:* ${formData.clientEmail || "Non renseigné"}
📱 *Téléphone:* ${formData.clientPhone || "Non renseigné"}
🚙 *Véhicule:* ${formData.vehicleInfo || "Non renseigné"}

📝 *Message:*
${formData.message}

📎 *Photos:* ${formData.photos.length} fichier(s) joint(s)
    `.trim();

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, "_blank");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-slate-800/50 border border-blue-500/30 rounded-2xl p-8 backdrop-blur-sm">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              NOM COMPLET <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              EMAIL <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.clientEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              TÉLÉPHONE
            </label>
            <input
              type="tel"
              value={formData.clientPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
              placeholder="+216 XX XXX XXX"
            />
          </div>
          <div className="md:col-span-2">
            <VehicleAutocomplete
              brand={brand}
              model={model}
              onBrandChange={(b) => {
                setBrand(b);
                setFormData(prev => ({ ...prev, vehicleInfo: `${b} ${model}`.trim() }));
              }}
              onModelChange={(m) => {
                setModel(m);
                setFormData(prev => ({ ...prev, vehicleInfo: `${brand} ${m}`.trim() }));
              }}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            MESSAGE <span className="text-red-500">* OBLIGATOIRE</span>
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            rows={5}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition resize-none"
            placeholder="Décrivez votre besoin (références pièces, problème, etc.)..."
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            PHOTOS <span className="text-amber-500">OPTIONNEL</span>
          </label>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-300
              ${isDragging 
                ? "border-blue-500 bg-blue-500/10 scale-[1.02]" 
                : "border-blue-500/50 hover:border-blue-400 hover:bg-slate-800/80"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className={`w-12 h-12 mx-auto mb-3 transition-transform ${isDragging ? "scale-110 text-blue-400" : "text-blue-500"}`} />
            <p className="text-blue-400 font-semibold mb-1">
              Glissez-déposez vos fichiers ici
            </p>
            <p className="text-gray-500 text-sm">
              ou cliquez pour parcourir (JPG, PNG, PDF - max 10Mo)
            </p>
            <p className="text-gray-600 text-xs mt-2">
              Maximum 5 fichiers
            </p>
          </div>

          {formData.photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {formData.photos.map((photo, index) => (
                <div key={index} className="relative group bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <button
                    onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  
                  {photo.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={photo.name}
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center bg-slate-800 rounded mb-2">
                      <FileText className="w-8 h-8 text-blue-400" />
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 truncate">{photo.name}</p>
                  <p className="text-xs text-gray-600">{(photo.size / 1024).toFixed(1)} Ko</p>
                  
                  {uploadProgress[index] < 100 && (
                    <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${uploadProgress[index]}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
          >
            <Camera className="w-5 h-5" />
            AJOUTER DES PHOTOS
          </button>
          
          <button
            onClick={sendEmail}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg font-semibold transition"
          >
            <Mail className="w-5 h-5" />
            {isSubmitting ? "ENVOI..." : "ENVOYER PAR EMAIL"}
          </button>
          
          <button
            onClick={sendWhatsApp}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
          >
            <MessageCircle className="w-5 h-5" />
            ENVOYER PAR WHATSAPP
          </button>
          
          <button
            onClick={generatePDF}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            <Download className="w-5 h-5" />
            TÉLÉCHARGER PDF
          </button>
        </div>
      </div>
    </div>
  );
}