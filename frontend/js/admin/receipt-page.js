import { api } from '../api.js';
import { renderReceipt } from '../receipt.js';

const id = window.location.pathname.split('/').filter(Boolean)[2];
const root = document.getElementById('receipt-root');

renderReceipt(root, () => api(`/api/admin/orders/${id}/receipt`), {
  backUrl: `/admin/orders/${id}`,
  showEmail: true,
});

document.getElementById('print-receipt').addEventListener('click', () => window.print());