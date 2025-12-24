# Zenrix Backend

Local dev instructions:

1. Copy `.env.example` to `.env` and fill values (MONGODB_URI, ADMIN_PASSWORD, JWT_SECRET).
2. Install dependencies: `npm install`.
3. Start server: `node server.js` or `npm start` if you set it up.

Testing:
- `npm test` will run Mocha tests (tests use an in-memory MongoDB server).
- `npm run test:e2e` will run Playwright E2E tests (requires browsers: run `npx playwright install` first).

E2E diagnostics (optional):
- By default the E2E tests do not write diagnostic files. To enable diagnostics (have tests save `tmp/*.html`, `tmp/*.png`, and `tmp/*.json` on failures), set environment variable `E2E_DIAGNOSTICS=true` when running tests.
- Example (local): `E2E_DIAGNOSTICS=true npx playwright test tests/e2e/admin.spec.js`.

Continuous Integration:
- A GitHub Actions workflow has been added at `.github/workflows/e2e.yml` to run Playwright tests on `pull_request` and pushes to `main` (headless). The CI workflow will upload Playwright artifacts (`test-results/`, `playwright-report/`, and any `tmp/` diagnostics) on failure to assist debugging; artifacts are retained for 7 days. Diagnostics are off in CI by default.
Notes:
- Admin actions (create/update/delete product, pages, and components) require an admin login. Use `POST /api/admin/login` with `{ password }` to obtain a JWT.
- CMS endpoints:
  - Pages: `GET /api/pages`, `GET /api/pages/slug/:slug`, `POST /api/pages` (protected), `PUT /api/pages/:id` (protected), `DELETE /api/pages/:id` (protected)
  - Components: `GET /api/components`, `GET /api/components/slug/:slug`, `POST /api/components` (protected), `PUT /api/components/:id` (protected), `DELETE /api/components/:id` (protected)
- Admin Dashboard: use `Frontend/admin-dashboard.html` to manage Products, Pages and Components (login required).
- For production, set strong `ADMIN_PASSWORD` and `JWT_SECRET` (do not use defaults).