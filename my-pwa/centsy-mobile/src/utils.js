const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export const formatCurrency = (value) => {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) {
    return '$0'
  }
  return formatter.format(amount)
}