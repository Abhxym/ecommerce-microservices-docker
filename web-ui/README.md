# web-ui

React 18 (Vite) storefront for the marketplace. Port 8080. Served by nginx, which also forwards
`/api/...` to the three services by their Compose names, so the browser only talks to one origin.

| Page | What it uses |
|---|---|
| Shop: product grid, categories, search | `GET /api/products`, `GET /api/products/{id}` (product-service adds stock from inventory-service) |
| Delivery selector (customer) | `GET /api/users` (user-service) |
| Cart and Place order | `GET /api/inventory/{id}`, then `PUT /api/inventory/{id}` to lower the stock |
| Seller panel: stock table | `PUT /api/inventory/{id}` |
| Seller panel: users, Add user | `GET /api/users`, `POST /api/users` (shows 400 and 409 errors) |
| Status bar | `/status/<service>`, mapped by nginx to each service's health endpoint |

## Demo for Q3

Stop inventory-service while the page is open:

```bash
docker compose stop inventory-service
```

After a reload the status bar shows inventory-service in red and every product shows
"Stock unavailable" with ADD disabled, but the shop still works (product-service returns
`"stock": null`). `docker compose up -d inventory-service` brings the stock back.

## Files

```
src/App.jsx                 page layout, cart state, order flow
src/api.js                  fetch helper for all API calls
src/components/             ProductCard, CartDrawer, SellerPanel, StatusBar, ProductArt (drawn product pictures)
src/styles.css              styles, phone layout below 860px
nginx.conf                  static files and /api forwarding (Docker DNS resolver 127.0.0.11)
Dockerfile                  stage 1 builds with node:20-alpine, stage 2 is nginx-unprivileged (non-root)
```

## Run without Docker

With the services running (`docker compose up -d`):

```bash
npm install
npm run dev        # http://localhost:5173, the Vite proxy forwards /api to localhost:8081-8083
```
