"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { 
  Wrench, Package, TrendingUp, Users, DollarSign, 
  Bell, Search, Filter, Download, Plus,
  ArrowUpRight, ArrowDownRight, LogOut, CheckCircle
} from "lucide-react";

export default function EspacePro() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  // États pour la gestion réelle des commandes
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editTrackingNote, setEditTrackingNote] = useState('');

  const user = session?.user as any;
  const isPro = user?.role === 'PROFESSIONAL' || user?.role === 'ADMIN';

  // Charger les commandes réelles depuis le backend
  const fetchDbOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch("/api/orders?limit=50");
      const data = await res.ok ? await res.json() : null;
      if (data && data.success) {
        setDbOrders(data.data);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des commandes :", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isPro) {
      fetchDbOrders();
    }
  }, [session, isPro]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950/60 backdrop-blur-md flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!session || !isPro) {
    return (
      <div className="min-h-screen bg-slate-950/60 backdrop-blur-md flex items-center justify-center px-4">
        <div className="text-center">
          <Wrench className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Accès Réservé</h2>
          <p className="text-gray-400 mb-6">Cet espace est réservé aux professionnels authentifiés.</p>
          <button
            onClick={() => window.location.href = "/"}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const handleUpdateOrderStatus = async (orderId: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status: editStatus,
          trackingNote: editTrackingNote
        })
      });

      if (res.ok) {
        alert("✅ Commande mise à jour avec succès ! Le client verra ce statut immédiatement.");
        setUpdatingOrderId(null);
        fetchDbOrders();
      } else {
        alert("Erreur lors de la mise à jour");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur serveur lors de la mise à jour");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "CONFIRMED": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "SHIPPED": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "DELIVERED": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "CANCELLED": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return "En attente";
      case "CONFIRMED": return "Confirmé";
      case "SHIPPED": return "Expédié";
      case "DELIVERED": return "Livré";
      case "CANCELLED": return "Annulé";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900/60 backdrop-blur-sm">
      {/* Header Pro */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Espace Commercial Pro</h1>
                <p className="text-gray-400 text-sm">{user?.name} | {user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-amber-600/20 text-amber-400 rounded-full text-xs font-semibold">
                PRO ({user?.role})
              </span>
              <button 
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800">
          {[
            { id: "dashboard", label: "Tableau de bord", icon: TrendingUp },
            { id: "commandes", label: "Commandes Clients", icon: Package },
            { id: "devis", label: "Mes Devis", icon: DollarSign },
            { id: "clients", label: "Clients", icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition
                ${activeTab === tab.id 
                  ? "bg-amber-600 text-white" 
                  : "bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white"
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-100">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Bons de Commande", value: dbOrders.length.toString(), change: `+${dbOrders.filter(o => o.status === 'PENDING').length} en attente`, up: true, icon: Package },
                { label: "Commandes Livrées", value: dbOrders.filter(o => o.status === 'DELIVERED').length.toString(), change: "Suivi réel", up: true, icon: CheckCircle },
                { label: "CA Estimé", value: `${dbOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()} TND`, change: "Total factures", up: true, icon: TrendingUp },
                { label: "Clients Actifs", value: "8", change: "Enregistrés", up: true, icon: Users },
              ].map((stat, idx) => (
                <div key={idx} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-semibold text-green-400">
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GESTION COMMANDES REALTIME */}
        {activeTab === "commandes" && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Suivi Commandes & Livraison Clients</h3>
              <button 
                onClick={fetchDbOrders}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition"
              >
                Actualiser la liste
              </button>
            </div>

            {loadingOrders ? (
              <div className="text-center py-10 text-slate-400">Chargement des commandes...</div>
            ) : dbOrders.length === 0 ? (
              <div className="text-center py-10 text-slate-500">Aucune commande enregistrée en base de données.</div>
            ) : (
              <div className="space-y-4">
                {dbOrders.map((o) => (
                  <div key={o.id} className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-5">
                    <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-800 pb-3 mb-3">
                      <div>
                        <h4 className="font-bold text-white font-mono text-sm">COMMANDE #{o.orderNumber}</h4>
                        <p className="text-xs text-slate-400">
                          Client: <strong>{o.user?.name || o.user?.email}</strong> | Tel: {o.user?.phone || 'N/A'}
                        </p>
                        <p className="text-[10px] text-slate-500">Créée le : {new Date(o.createdAt).toLocaleString('fr-FR')}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(o.status)}`}>
                          {getStatusLabel(o.status)}
                        </span>
                        
                        <button
                          onClick={() => {
                            setUpdatingOrderId(o.id);
                            setEditStatus(o.status);
                            setEditTrackingNote(o.customerNote || '');
                          }}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition"
                        >
                          Modifier Statut & Suivi
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400 font-semibold mb-1">Adresse de livraison :</p>
                        <p className="text-slate-200">{o.shippingAddress || 'Non renseignée'}</p>
                        <p className="text-slate-400 font-semibold mt-2 mb-1">Montant Total :</p>
                        <p className="text-green-400 font-bold font-mono">{o.total.toFixed(2)} TND (TTC)</p>
                      </div>

                      <div>
                        <p className="text-slate-400 font-semibold mb-1">Notes de suivi (visible par le client) :</p>
                        <p className="text-slate-300 italic bg-slate-950/40 p-2 rounded border border-slate-800">
                          {o.customerNote || 'Aucune note de livraison disponible.'}
                        </p>
                      </div>
                    </div>

                    {/* Liste des pièces commandées */}
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <p className="text-xs font-semibold text-slate-400 mb-2">Pièces demandées :</p>
                      <ul className="space-y-1">
                        {o.items?.map((item: any) => (
                          <li key={item.id} className="text-xs text-slate-300 flex justify-between bg-slate-800/40 px-3 py-1 rounded">
                            <span>• {item.productName}</span>
                            <span className="font-mono text-slate-400">Qty: {item.quantity} | {item.price.toFixed(2)} TND</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Formulaire de modification */}
                    {updatingOrderId === o.id && (
                      <div className="mt-4 p-4 bg-slate-800 rounded-xl border border-slate-700 space-y-3">
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">Mettre à jour la livraison et le statut</h5>
                        
                        <div className="flex gap-4 items-center">
                          <label className="text-xs text-slate-400">Statut :</label>
                          <select 
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="bg-slate-900/60 backdrop-blur-sm text-white text-xs p-2 rounded border border-slate-700 focus:outline-none"
                          >
                            <option value="PENDING">En attente de validation</option>
                            <option value="CONFIRMED">Confirmée / En préparation</option>
                            <option value="SHIPPED">Expédiée / En cours de livraison</option>
                            <option value="DELIVERED">Livrée</option>
                            <option value="CANCELLED">Annulée</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Note de livraison / Suivi colis (ex: Colis expédié via Aramex - Réf: 987452) :</label>
                          <input 
                            type="text"
                            value={editTrackingNote}
                            onChange={(e) => setEditTrackingNote(e.target.value)}
                            className="w-full bg-slate-900/60 backdrop-blur-sm text-white text-xs p-2.5 rounded border border-slate-700 focus:outline-none focus:border-amber-500"
                            placeholder="Entrez les instructions de livraison ou statut du colis..."
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setUpdatingOrderId(null)}
                            className="px-3 py-1.5 bg-slate-750 hover:bg-slate-700 rounded text-xs font-semibold"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(o.id)}
                            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold"
                          >
                            Sauvegarder les modifications
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "stock" && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden p-6">
            <h3 className="text-white font-semibold text-lg mb-4">Stock</h3>
            <p className="text-slate-400 text-xs">Veuillez gérer le stock de pièces depuis la page d'administration générale.</p>
          </div>
        )}

        {activeTab === "devis" && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-white font-semibold text-lg mb-4">Gestion des Devis</h3>
            <p className="text-slate-400 text-xs">Veuillez gérer les devis clients depuis l'interface générale.</p>
          </div>
        )}

        {activeTab === "clients" && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-white font-semibold text-lg mb-4">Base Clients</h3>
            <p className="text-gray-400 text-sm">Gestion de la base clients professionnels...</p>
          </div>
        )}
      </div>
    </div>
  );
}