'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  BarChart3,
  Package,
  ClipboardList,
  FileText,
  Users,
  TrendingUp,
  DollarSign,
  ShoppingBag
} from 'lucide-react'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalDevis: 0,
    totalProducts: 0,
    totalUsers: 0,
    revenue: 0,
  })
  const [orders, setOrders] = useState([])
  const [devis, setDevis] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/connexion')
    }
    if (session?.user?.role !== 'admin') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchStats()
      fetchOrders()
      fetchDevis()
      fetchProducts()
    }
  }, [session])

  const fetchStats = async () => {
    // Tu peux créer une API /api/admin/stats
    const res = await fetch('/api/admin/stats')
    if (res.ok) {
      const data = await res.json()
      setStats(data)
    }
  }

  const fetchOrders = async () => {
    const res = await fetch('/api/orders')
    if (res.ok) {
      const data = await res.json()
      setOrders(data)
    }
  }

  const fetchDevis = async () => {
    const res = await fetch('/api/devis')
    if (res.ok) {
      const data = await res.json()
      setDevis(data)
    }
  }

  const fetchProducts = async () => {
    const res = await fetch('/api/products')
    if (res.ok) {
      const data = await res.json()
      setProducts(data)
    }
    setLoading(false)
  }

  const updateOrderStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) fetchOrders()
  }

  const respondToDevis = async (devisId: string, items: any[], totalPrice: number, note: string) => {
    const res = await fetch(`/api/devis/${devisId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, totalPrice, responseNote: note }),
    })
    if (res.ok) fetchDevis()
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'orders', label: 'Commandes', icon: ClipboardList },
    { id: 'devis', label: 'Devis', icon: FileText },
    { id: 'users', label: 'Utilisateurs', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-red-600">AUTOP Admin</h1>
          <p className="text-sm text-gray-500 mt-1">{session?.user?.name}</p>
        </div>
        <nav className="px-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="ml-64 p-8">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Tableau de bord</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Commandes"
                value={stats.totalOrders}
                icon={ShoppingBag}
                color="blue"
              />
              <StatCard
                title="Devis"
                value={stats.totalDevis}
                icon={FileText}
                color="yellow"
              />
              <StatCard
                title="Produits"
                value={stats.totalProducts}
                icon={Package}
                color="green"
              />
              <StatCard
                title="Chiffre d'affaires"
                value={`${stats.revenue.toFixed(2)} TND`}
                icon={DollarSign}
                color="red"
              />
            </div>

            {/* Graphique simple */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Commandes récentes</h3>
              <div className="space-y-3">
                {orders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{order.user?.name || 'Client'}</p>
                      <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString('fr-TN')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold">{order.total.toFixed(2)} TND</span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Gestion des produits</h2>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                + Ajouter un produit
              </button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product: any) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gray-200 rounded-lg mr-3" />
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{product.reference}</td>
                      <td className="px-6 py-4 font-medium">{product.price.toFixed(2)} TND</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.stock > 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-blue-600 hover:text-blue-800 mr-3">Modifier</button>
                        <button className="text-red-600 hover:text-red-800">Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Commandes</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N°</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payé</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order: any) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 font-mono text-sm">{order.id.slice(-6)}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{order.user?.name}</p>
                        <p className="text-sm text-gray-500">{order.user?.email}</p>
                      </td>
                      <td className="px-6 py-4 font-bold">{order.total.toFixed(2)} TND</td>
                      <td className="px-6 py-4">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="pending">En attente</option>
                          <option value="processing">En traitement</option>
                          <option value="shipped">Expédiée</option>
                          <option value="delivered">Livrée</option>
                          <option value="cancelled">Annulée</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => updateOrderStatus(order.id, order.isPaid ? 'unpaid' : 'paid')}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            order.isPaid
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {order.isPaid ? 'Payé' : 'Non payé'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">Voir détails</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'devis' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Demandes de devis</h2>
            <div className="space-y-4">
              {devis.map((d: any) => (
                <div key={d.id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-lg">
                        {d.vehicleBrand} {d.vehicleModel} ({d.vehicleYear})
                      </p>
                      <p className="text-sm text-gray-500">
                        Par {d.user?.name} • {new Date(d.createdAt).toLocaleDateString('fr-TN')}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Pièces demandées :</p>
                    <ul className="list-disc list-inside text-sm">
                      {d.items.map((item: any) => (
                        <li key={item.id}>{item.name} (x{item.quantity})</li>
                      ))}
                    </ul>
                  </div>

                  {d.status === 'pending' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">Répondre au devis</h4>
                      <DevisResponseForm devis={d} onSubmit={respondToDevis} products={products} />
                    </div>
                  )}

                  {d.status === 'completed' && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="font-medium text-green-800">Devis traité</p>
                      <p className="text-sm text-green-600">Total proposé : {d.totalPrice?.toFixed(2)} TND</p>
                      {d.responseNote && <p className="text-sm mt-2">{d.responseNote}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Utilisateurs</h2>
            <UsersTable />
          </div>
        )}
      </div>
    </div>
  )
}

// Composants utilitaires

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    delivered: 'bg-green-100 text-green-800',
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800',
  }

  const labels: Record<string, string> = {
    pending: 'En attente',
    processing: 'En traitement',
    completed: 'Terminé',
    delivered: 'Livrée',
    paid: 'Payé',
    unpaid: 'Non payé',
    cancelled: 'Annulée',
    rejected: 'Rejeté',
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  )
}

function DevisResponseForm({ devis, onSubmit, products }: any) {
  const [items, setItems] = useState(
    devis.items.map((item: any) => ({
      ...item,
      price: 0,
      productId: '',
    }))
  )
  const [note, setNote] = useState('')

  const total = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)

  return (
    <div className="space-y-3">
      {items.map((item: any, idx: number) => (
        <div key={item.id} className="flex gap-3 items-center">
          <span className="flex-1 text-sm">{item.name}</span>
          <select
            value={item.productId}
            onChange={(e) => {
              const newItems = [...items]
              newItems[idx].productId = e.target.value
              setItems(newItems)
            }}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="">Associer produit</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} ({p.price} TND)</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Prix unitaire"
            value={item.price || ''}
            onChange={(e) => {
              const newItems = [...items]
              newItems[idx].price = parseFloat(e.target.value) || 0
              setItems(newItems)
            }}
            className="w-24 text-sm border rounded px-2 py-1"
          />
          <span className="text-sm text-gray-500">x{item.quantity}</span>
        </div>
      ))}
      
      <div className="flex justify-between items-center pt-3 border-t">
        <span className="font-bold">Total : {total.toFixed(2)} TND</span>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Note pour le client..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-sm border rounded px-3 py-1 w-64"
          />
          <button
            onClick={() => onSubmit(devis.id, items, total, note)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Envoyer la réponse
          </button>
        </div>
      </div>
    </div>
  )
}

function UsersTable() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [])

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inscrit le</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user: any) => (
            <tr key={user.id}>
              <td className="px-6 py-4 font-medium">{user.name}</td>
              <td className="px-6 py-4 text-sm">{user.email}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                  user.role === 'pro' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 text-sm">{user.phone || '-'}</td>
              <td className="px-6 py-4 text-sm">
                {new Date(user.createdAt).toLocaleDateString('fr-TN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}