import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateDevisPDF(devis: any) {
  const doc = new jsPDF()

  // En-tête
  doc.setFontSize(20)
  doc.text('AUTOP - Pièces Automobiles', 105, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.text('Devis N° ' + devis.id.slice(-8).toUpperCase(), 20, 40)
  doc.text('Date : ' + new Date(devis.createdAt).toLocaleDateString('fr-TN'), 20, 50)
  doc.text('Client : ' + (devis.user?.name || ''), 20, 60)
  doc.text('Email : ' + (devis.user?.email || ''), 20, 70)

  // Véhicule
  doc.text('Véhicule :', 20, 85)
  doc.text(`${devis.vehicleBrand} ${devis.vehicleModel} (${devis.vehicleYear})`, 20, 95)

  // Tableau des pièces
  const tableData = devis.items.map((item: any) => [
    item.name,
    item.quantity,
    item.price.toFixed(2) + ' TND',
    (item.price * item.quantity).toFixed(2) + ' TND',
  ])

  ;(doc as any).autoTable({
    startY: 105,
    head: [['Pièce', 'Qté', 'Prix unitaire', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] },
  })

  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(14)
  doc.text('Total : ' + devis.totalPrice?.toFixed(2) + ' TND', 150, finalY, { align: 'right' })

  // Notes
  if (devis.responseNote) {
    doc.setFontSize(10)
    doc.text('Notes : ' + devis.responseNote, 20, finalY + 20)
  }

  return doc
}

export function generateOrderPDF(order: any) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('AUTOP - Bon de Commande', 105, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.text('Commande N° ' + order.id.slice(-8).toUpperCase(), 20, 40)
  doc.text('Date : ' + new Date(order.createdAt).toLocaleDateString('fr-TN'), 20, 50)
  doc.text('Client : ' + (order.user?.name || ''), 20, 60)
  doc.text('Téléphone : ' + (order.phone || order.user?.phone || ''), 20, 70)

  const tableData = order.items.map((item: any) => [
    item.name,
    item.quantity,
    item.price.toFixed(2) + ' TND',
    (item.price * item.quantity).toFixed(2) + ' TND',
  ])

  ;(doc as any).autoTable({
    startY: 85,
    head: [['Produit', 'Qté', 'Prix unitaire', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(14)
  doc.text('Total : ' + order.total.toFixed(2) + ' TND', 150, finalY, { align: 'right' })

  doc.setFontSize(10)
  doc.text('Statut : ' + (order.isPaid ? 'Payé' : 'Non payé'), 20, finalY + 15)
  doc.text('Mode de paiement : ' + (order.paymentMethod || 'Non spécifié'), 20, finalY + 22)

  return doc
}