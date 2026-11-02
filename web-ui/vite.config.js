import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For `npm run dev` the API calls go to the services published on localhost.
// In Docker, nginx does the same forwarding (see nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/users': 'http://localhost:8081',
      '/api/products': 'http://localhost:8082',
      '/api/inventory': 'http://localhost:8083',
      '/api/orders': 'http://localhost:8085',
      '/status/user-service': { target: 'http://localhost:8081', rewrite: () => '/actuator/health' },
      '/status/product-service': { target: 'http://localhost:8082', rewrite: () => '/health' },
      '/status/inventory-service': { target: 'http://localhost:8083', rewrite: () => '/health' },
      '/status/order-service': { target: 'http://localhost:8085', rewrite: () => '/health' },
    },
  },
});
