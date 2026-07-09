'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Package, FileText, TrendingUp, Download } from 'lucide-react'
import { generateOrderPDF } from '@/lib/pdf'

export default function EspacePro() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [devis, setDevis] = useState([])

  useEffect(() => {
    if (session?.user?.role === 'pro' || session?.user?.role === 'admin') {
      fetch('/api/orders').then(r => r.json()).then(setOrders)
      fetch