# Zenrix Backend

Local dev instructions:

1. Copy `.env.example` to `.env` and fill values (MONGODB_URI, ADMIN_PASSWORD, JWT_SECRET).
2. Install dependencies: `npm install`.
3. Start server: `node server.js` or `npm start` if you set it up.

Notes:
- Admin actions (create/update/delete product, pages, and components) require an admin login. Use `POST /api/admin/login` with `{ password }` to obtain a JWT.
- CMS endpoints:
  - Pages: `GET /api/pages`, `GET /api/pages/slug/:slug`, `POST /api/pages` (protected), `PUT /api/pages/:id` (protected), `DELETE /api/pages/:id` (protected)
  - Components: `GET /api/components`, `GET /api/components/slug/:slug`, `POST /api/components` (protected), `PUT /api/components/:id` (protected), `DELETE /api/components/:id` (protected)
- Admin Dashboard: use `Frontend/admin-dashboard.html` to manage Products, Pages and Components (login required).
- For production, set strong `ADMIN_PASSWORD` and `JWT_SECRET` (do not use defaults).

UI Tests
-------

- Run the headless UI smoke tests locally:

  ```bash
  npm ci
  npm run test:ui
  ```

  The script will run a headless Chromium using Puppeteer, start the app on a test port, and write results to `tmp/ui-check-results.json` and screenshots to `tmp/ui-check-screenshots/`.

- CI: A GitHub Actions workflow (`.github/workflows/ui-tests.yml`) will run these checks on push/PR to `main`/`master` and upload artifacts for inspection.

Development with Docker (fast reload)
-------------------------------------

If you prefer working with containers but want live reload on code changes, use the provided `docker-compose.override.yml` which mounts the repository into the container and runs the dev command with `nodemon`.

1. First-time build (only once after changing dependencies or Dockerfile):

   ```bash
   docker-compose up --build
   ```

2. Regular development (no rebuild required for code edits):

   ```bash
   docker-compose up
   # edit files locally — nodemon inside the container will restart the server automatically
   ```

Notes:
- Nodemon is provided as a dev dependency (`npm run dev` uses `nodemon`). The CI job runs `npm ci` (which installs dev deps by default in the runner), so dev-only tools are available in CI where needed but are not included in production images built for deploys.
- If you want to avoid containers, you can run locally with `npm install` and `npm run dev` directly on your host machine.

If you'd like, I can add a short `DEV.md` with troubleshooting tips (e.g., clearing `node_modules`, recreating volumes) or include a Makefile for convenience.