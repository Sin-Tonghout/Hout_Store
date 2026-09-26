// One place for all requests to the backend
export async function api(url, { method = 'GET', body } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(url, {
    method,
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : {},
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    credentials: 'same-origin',
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || !payload || !payload.success) {
    const error = new Error((payload && payload.message) || 'Request failed');
    error.status = res.status;
    error.errors = (payload && payload.errors) || null;
    throw error;
  }

  return payload; // { success, message, data }
}