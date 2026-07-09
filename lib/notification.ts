export function sendWhatsAppMessage(phone: string, message: string) {
  // Format numéro Tunisie
  const formattedPhone = phone.replace(/\D/g, '').replace(/^216/, '').replace(/^0/, '')
  const fullPhone = '216' + formattedPhone

  const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank')
}

export function sendEmail(to: string, subject: string, body: string) {
  const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(mailtoUrl, '_blank')
}

export function generateDevisWhatsAppMessage(devis: any) {
  return `Bonjour ${devis.user?.name},\n\nVotre devis AUTOP est prêt !\n\nVéhicule : ${devis.vehicleBrand} ${devis.vehicleModel}\nTotal : ${devis.totalPrice?.toFixed(2)} TND\n\nConnectez-vous sur autop.tn pour voir les détails et commander.`
}

export function generateOrderConfirmationMessage(order: any) {
  return `Merci pour votre commande AUTOP !\n\nN° : ${order.id.slice(-8)}\nTotal : ${order.total.toFixed(2)} TND\n\nNous vous contacterons pour la livraison.`
}