import { api } from './api.js';
import { renderReceipt } from './receipt.js';

const id = window.location.pathname.split('/').filter(Boolean)[1];
const root = document.getElementById('receipt-root');

renderReceipt(root, () => api(`/api/orders/${id}/receipt`), { backUrl: `/orders/${id}` });

document.getElementById('print-receipt').addEventListener('click', () => window.print());