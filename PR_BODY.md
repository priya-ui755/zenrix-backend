# PR: feat(admin-ui): accessibility, KPIs, charts, and visual polish

This PR contains a set of incremental improvements to the admin UI designed to be low-risk and non-invasive.

## Summary
- Accessibility
  - Added skip link, focus-visible rules, ARIA attributes (navigation, aria-expanded on sidebar toggle).
  - Improved keyboard focus styles for interactive elements and ensured screen-reader friendly labels.
- KPIs & Charts
  - Added Revenue, AOV, Conversion, Refunds KPIs.
  - Added revenue (last 7 days) chart and payment method doughnut.
  - Added Average Order Value (AOV) and Recent Orders table with status badges.
  - All charts use Chart.js CDN and fall back to sample data when admin token or endpoints are unavailable.
- Visual polish
  - Badges for status, trend color classes, sidebar collapsible with persistence, responsive layout.
- Testing & CI
  - Added headless UI smoke test script (`scripts/headless_ui_check.js`) and a GitHub Actions workflow (`.github/workflows/ui-tests.yml`).

## Notes for reviewers
- All admin UI changes are scoped under `.admin-app` and `admin.css` to avoid affecting the public site.
- Admin endpoints require admin auth — certain datasets will 401 when not logged in, which is expected in CI tests.

## How to test locally
1. `npm ci`
2. `npm start` and open `http://localhost:3000/admin-dashboard.html`
3. Use Admin login (POST /api/admin/login { password }) to set `localStorage.adminToken` or click login in UI.
4. Run `npm run test:ui` to run headless checks locally. Artifacts are written to `tmp/`.

---

If you'd like, I can push these commits to a branch and open a PR; I attempted to push but received a 403 (permission denied) — let me know if you want me to retry when auth is available, or please push and I will open the PR from your repo.
