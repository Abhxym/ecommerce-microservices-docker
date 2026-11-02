// Small fetch wrapper. All paths go through nginx (Docker) or the Vite proxy (npm run dev).
async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error((data && data.error) || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  users: () => request('GET', '/api/users'),
  createUser: (user) => request('POST', '/api/users', user),
  products: () => request('GET', '/api/products'),
  product: (id) => request('GET', `/api/products/${id}`),
  stock: (id) => request('GET', `/api/inventory/${id}`),
  setStock: (id, quantity) => request('PUT', `/api/inventory/${id}`, { quantity }),
};

export const SERVICES = ['user-service', 'product-service', 'inventory-service'];

export async function serviceStatus(name) {
  try {
    const res = await fetch(`/status/${name}`);
    const data = await res.json();
    return res.ok && data.status === 'UP';
  } catch {
    return false;
  }
}

export const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
