// DR-2026-000123 = DR + year + order id padded to 6 digits
function formatOrderNumber(orderId, date = new Date()) {
  return `DR-${date.getFullYear()}-${String(orderId).padStart(6, '0')}`;
}

module.exports = { formatOrderNumber };