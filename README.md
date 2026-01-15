# Zenrix Backend

Local dev instructions:

1. Copy `.env.example` to `.env` and fill values (MONGODB_URI, ADMIN_PASSWORD, JWT_SECRET).

Optional but recommended for testimonial notifications:
- SMTP_HOST: SMTP server host
- SMTP_PORT: SMTP server port (default 587)
- SMTP_SECURE: set to 1 to use TLS (optional)
- SMTP_USER: SMTP username
- SMTP_PASS: SMTP password
- SMTP_FROM: optional From header for emails
- ADMIN_EMAIL: recipient for new testimonial notifications
- SITE_URL: (optional) public URL used in notification links

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

E2E Admin Tests
---------------

- A lightweight E2E script exercises core admin flows (login, testimonial lifecycle, product CRUD, payment settings, hero toggle). Run it locally with:

  ```bash
  npm ci
  npm run e2e
  ```

- A GitHub Actions workflow (`.github/workflows/e2e.yml`) is provided to run the E2E script against a temporary MongoDB instance on push/PR to `main`. **Important:** Store your admin password in a GitHub Actions secret named `ADMIN_PASSWORD` and **do not** set it in the workflow file. The workflow will fail early if `ADMIN_PASSWORD` is not set. To add the secret:

  1. Go to your repository -> Settings -> Secrets and variables -> Actions.
  2. Click **New repository secret**.
  3. Name it `ADMIN_PASSWORD` and set the value to your admin password.

  The workflow will read this secret and inject it as the `ADMIN_PASSWORD` environment variable when starting the server.

  Optional: Add a `E2E_CI_KEEP_ARTIFACTS` (boolean) secret if you want to keep artifacts for successful runs for visual regression baseline storage.

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