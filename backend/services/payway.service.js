const crypto = require('crypto');
const config = require('../config/env');

const PURCHASE_ENDPOINT = '/api/payment-gateway/v1/payments/purchase';
const CHECK_ENDPOINT = '/api/payment-gateway/v1/payments/check-transaction-2';
const QR_ENDPOINT = '/api/payment-gateway/v1/payments/generate-qr';

function reqTime() {
  // ABA wants UTC, format YYYYMMDDHHmmss
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
}

function hmacSha512Base64(text) {
  return crypto.createHmac('sha512', config.payway.publicKey).update(text).digest('base64');
}

// tran_id must be <=20 chars and unique per attempt (ABA rejects duplicates)
function buildTranId(orderNumber, attemptNumber) {
  const base = orderNumber.replace(/-/g, ''); // e.g. DR2026000123
  const suffix = String(attemptNumber).padStart(2, '0');
  return `${base}${suffix}`.slice(0, 20);
}

// Builds the hash fields + form fields for the Purchase API. `paymentOption`
// lets the caller request a specific method — empty string shows ABA's
// hosted checkout with every method available; 'abapay_khqr_deeplink' makes
// ABA respond with a QR code instead of a page.
function buildPurchasePayload({ tranId, amount, customer, returnUrl, cancelUrl, continueSuccessUrl, paymentOption = '' }) {
  const hashFields = {
    req_time: reqTime(),
    merchant_id: config.payway.merchantId,
    tran_id: tranId,
    amount: amount.toFixed(2),
    items: '',
    shipping: '',
    firstname: customer.firstname || '',
    lastname: customer.lastname || '',
    email: customer.email || '',
    phone: '',
    type: 'purchase',
    payment_option: paymentOption,
    return_url: returnUrl ? Buffer.from(returnUrl).toString('base64') : '',
    cancel_url: cancelUrl || '',
    continue_success_url: continueSuccessUrl || '',
    return_deeplink: '',
    currency: 'USD',
    custom_fields: '',
    return_params: '',
    payout: '',
    lifetime: '',
    additional_params: '',
    google_pay_token: '',
    skip_success_page: '',
  };

  const toHash =
    hashFields.req_time + hashFields.merchant_id + hashFields.tran_id + hashFields.amount +
    hashFields.items + hashFields.shipping + hashFields.firstname + hashFields.lastname +
    hashFields.email + hashFields.phone + hashFields.type + hashFields.payment_option +
    hashFields.return_url + hashFields.cancel_url + hashFields.continue_success_url +
    hashFields.return_deeplink + hashFields.currency + hashFields.custom_fields +
    hashFields.return_params + hashFields.payout + hashFields.lifetime +
    hashFields.additional_params + hashFields.google_pay_token + hashFields.skip_success_page;

  const hash = hmacSha512Base64(toHash);

  const NUMBER_FIELDS_OMIT_IF_EMPTY = ['shipping', 'lifetime', 'skip_success_page'];
  const postFields = {};
  for (const [key, value] of Object.entries(hashFields)) {
    if (NUMBER_FIELDS_OMIT_IF_EMPTY.includes(key) && value === '') continue;
    postFields[key] = value;
  }
  postFields.hash = hash;

  return { action: `${config.payway.apiUrl}${PURCHASE_ENDPOINT}`, fields: postFields };
}

// Calls the Purchase API directly from the server (not the browser) and
// expects a JSON response — used for the KHQR flow, where ABA returns a
// qr_string/deeplink instead of an HTML checkout page.
async function requestKhqr(fields) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));

  const res = await fetch(`${config.payway.apiUrl}${PURCHASE_ENDPOINT}`, {
    method: 'POST',
    body: form,
  });

  const data = await res.json().catch(() => null);
  if (!data) return { ok: false, raw: null };

  const isSuccess = data.status && (data.status.code === '00' || data.status.code === 0);
  return { ok: isSuccess, raw: data };
}

// Calls ABA's Check Transaction API. Never trust a browser redirect alone —
// this is the server-side source of truth for whether a payment succeeded.
async function checkTransaction(tranId) {
  const req_time = reqTime();
  const merchant_id = config.payway.merchantId;
  const hash = hmacSha512Base64(req_time + merchant_id + tranId);

  const res = await fetch(`${config.payway.apiUrl}${CHECK_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req_time, merchant_id, tran_id: tranId, hash }),
  });

  const data = await res.json().catch(() => null);
  console.log('[ABA check-transaction raw response]', JSON.stringify(data, null, 2));
  if (!data) return { ok: false, raw: null };

  const requestOk = data.status && (data.status.code === '00' || data.status.code === 0);
  if (!requestOk) return { ok: false, raw: data };

  // The REAL payment outcome lives in data.data.payment_status, not status.code.
  // status.code only confirms the check-transaction call itself worked.
  const paymentStatus = (data.data && data.data.payment_status) || '';

  const isSuccess = paymentStatus === 'APPROVED' || paymentStatus === 'SUCCESS' || paymentStatus === 'PAID';
  const isDeclined = paymentStatus === 'DECLINED' || paymentStatus === 'FAILED';
  const isCancelled = paymentStatus === 'CANCELLED' || paymentStatus === 'CANCELED';
  // PENDING (and anything else unrecognized) falls through as "still waiting"

  return { ok: true, raw: data, isSuccess, isDeclined, isCancelled };
}


// Real, dedicated QR endpoint — separate from the Purchase API.
// Content-Type is application/json here (Purchase uses multipart/form-data).
async function generateQr({ tranId, amount, customer }) {
  const req_time = reqTime();
  const merchant_id = config.payway.merchantId;
  const fields = {
    req_time,
    merchant_id,
    tran_id: tranId,
    amount: amount.toFixed(2),
    items: '',
    first_name: customer.firstname || '',
    last_name: customer.lastname || '',
    email: customer.email || '',
    phone: '',
    purchase_type: 'purchase',
    payment_option: 'abapay_khqr',
    callback_url: '',
    return_deeplink: '',
    currency: 'USD',
    custom_fields: '',
    return_params: '',
    payout: '',
    lifetime: 30, // minutes the QR stays valid
    qr_image_template: 'template3_color',
  };

  // Exact concatenation order required by this endpoint (different from Purchase)
  const toHash =
    fields.req_time + fields.merchant_id + fields.tran_id + fields.amount + fields.items +
    fields.first_name + fields.last_name + fields.email + fields.phone + fields.purchase_type +
    fields.payment_option + fields.callback_url + fields.return_deeplink + fields.currency +
    fields.custom_fields + fields.return_params + fields.payout + fields.lifetime +
    fields.qr_image_template;

  fields.hash = hmacSha512Base64(toHash);

  const res = await fetch(`${config.payway.apiUrl}${QR_ENDPOINT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });

  const data = await res.json().catch(() => null);
  if (!data) return { ok: false, raw: null };

  const isSuccess = data.status && (data.status.code === '0' || data.status.code === 0);
  return { ok: isSuccess, raw: data };
}

module.exports = { buildTranId, buildPurchasePayload, requestKhqr, checkTransaction, generateQr, };