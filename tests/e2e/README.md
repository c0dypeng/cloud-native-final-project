# End-to-end tests (Playwright)

## Pre-flight

1. The full stack must be running:
   ```bash
   make dev-docker   # or `make up`
   make migrate DATABASE_URL=postgresql://safety:devpassword@localhost:5432/safetydb
   make seed    DATABASE_URL=postgresql://safety:devpassword@localhost:5432/safetydb
   ```
2. Install Playwright browsers (one-time):
   ```bash
   cd tests/e2e && bun install && bun run install:browsers
   ```

## Run

```bash
cd tests/e2e
bun run test            # all specs (web + admin projects)
bun run test:headed     # with the browser window open
bun run test:ui         # Playwright UI
bun run report          # open the HTML report
```

The CI workflow `.github/workflows/e2e.yml` runs nightly against a docker
compose stack.

## Test data

Tests use the seeded demo accounts (`employee@huyouan.local`,
`manager@huyouan.local`, admin `admin`/`changeme`) and the password
`password123`. Override via env:

```bash
E2E_WEB_URL=http://localhost:3000 \
E2E_ADMIN_URL=http://localhost:3001 \
E2E_EMPLOYEE_EMAIL=employee@huyouan.local \
E2E_MANAGER_EMAIL=manager@huyouan.local \
E2E_USER_PASSWORD=password123 \
E2E_ADMIN_USERNAME=admin \
E2E_ADMIN_PASSWORD=changeme \
bun run test
```
