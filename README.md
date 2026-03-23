# PEA Data Retrieval API — Cloudflare Edition

ระบบดึงข้อมูลชื่อการไฟฟ้า — การไฟฟ้าส่วนภูมิภาค เขต 1

**Production-hardened, free-tier Cloudflare deployment: Pages + Pages Functions + Bundled JSON**

No always-on server. API reusable across multiple projects.

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Extract & bundle data (one-time, or when Excel changes)
pip install openpyxl
npm run data:rebuild

# 3. Run locally
npm run dev        # → http://localhost:3000

# 4. Deploy to Cloudflare (first time: npx wrangler login)
npm run deploy
```

---

## Architecture

```
Peaname.xlsx → Python → pea_master.json → bundle_data.js → TS module
                                                              ↓
                         Cloudflare Pages Functions (API at edge)
                                    ↓  _middleware.ts
                          CORS + Error Boundary + Caching
                                    ↓
                      Cloudflare Pages (static frontend)
```

| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | Cloudflare Pages (static) | Free |
| API | Pages Functions (edge) | Free |
| Data | Bundled JSON (204KB) | Free |
| Database | None needed | Free |

---

## API Reference

Base: `/api/v1` (same-origin, no CORS issues)

### Endpoints

| Method | Endpoint | Cache | Description |
|--------|----------|-------|-------------|
| GET | `/health` | 1h | Status, data version, counts |
| GET | `/stats` | 1h | Size/group breakdowns |
| GET | `/offices` | 5min | Search/filter/sort/paginate |
| GET | `/offices/:code` | 1h | Single office detail |
| GET | `/offices/:code/path` | 1h | Hierarchy path |
| GET | `/groups/8` | 1h | 8 กฟจ. groups |
| GET | `/groups/17` | 1h | 17 จุดรวมงาน groups |
| GET | `/groups/43` | 1h | 43 กฟฟ. groups |
| GET | `/hierarchy` | 1h | Full organizational tree |
| GET | `/export/offices` | 5min | JSON or CSV download (API key optional) |

### Office Query Parameters

| Param | Type | Default | Validation |
|-------|------|---------|-----------|
| `q` | string | | Max 100 chars |
| `size` | enum | | Must be L, M, S, or XS |
| `parent8` | string | | กฟจ. id or name |
| `groupCode` | string | | จุดรวมงาน code (D01-D17) |
| `page` | number | 1 | Must be ≥ 1 |
| `limit` | number | 50 | Max 200 |
| `sort` | enum | index | code, shortName, fullName, size, index, groupCode |
| `order` | enum | asc | asc, desc |

### Error Responses

All errors use consistent format:

```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": { "code": "INVALID_QUERY", "message": "..." }
}
```

| Status | Error Codes |
|--------|-------------|
| 400 | `INVALID_QUERY`, `INVALID_LEVEL`, `INVALID_FORMAT` |
| 401 | `UNAUTHORIZED` |
| 404 | `OFFICE_NOT_FOUND` |
| 500 | `INTERNAL_ERROR` (caught by middleware) |

---

## Data Refresh

```bash
# 1. Replace data/Peaname.xlsx
# 2. Rebuild + redeploy
npm run data:rebuild
npm run deploy
```

The `health` endpoint shows `dataVersion` (hash) and `generatedAt` to track which data version is live.

---

## API Key Protection

Two export endpoints with clear separation:

| Endpoint | Auth | Used By |
|----------|------|---------|
| `GET /api/v1/export/offices` | **Public** — no key | Dashboard frontend |
| `GET /api/v1/internal/export/offices` | **Protected** — requires `x-api-key` | n8n, Apps Script, automation |

Both endpoints use identical shared logic, support the same filters, and produce the same output.

### Setup

1. Go to **Cloudflare Dashboard** → Pages → Your project → Settings → Environment Variables
2. Add: `API_KEY` = your secret key (Production & Preview)
3. Redeploy

### Usage

```bash
# Public export (dashboard, no key needed)
curl https://your-domain/api/v1/export/offices?format=csv

# Protected export (automation, key required)
curl -H "x-api-key: YOUR_KEY" \
  https://your-domain/api/v1/internal/export/offices?format=csv&size=L
```

### Error Responses (Protected)

| Condition | Result |
|-----------|--------|
| No key | `401` — "Missing API key" |
| Wrong key | `401` — "Invalid API key" |
| No `API_KEY` env set | `401` — fail secure |
| Valid key | ✅ Data returned |

---

## Project Structure

```
├── public/                    # Static frontend
│   ├── index.html
│   ├── index.css
│   └── app.js
├── functions/                 # Pages Functions (API)
│   ├── api/
│   │   ├── _middleware.ts     # CORS + error boundary
│   │   └── v1/
│   │       ├── health.ts
│   │       ├── stats.ts
│   │       ├── hierarchy.ts
│   │       ├── offices/...
│   │       ├── groups/[level].ts
│   │       ├── export/offices.ts      # PUBLIC export
│   │       └── internal/export/offices.ts  # PROTECTED export
│   └── _shared/               # Shared modules
│       ├── data-loader.ts
│       ├── office-service.ts
│       ├── normalize.ts
│       ├── auth.ts
│       ├── export-service.ts
│       ├── response.ts
│       ├── types.ts
│       └── pea_master_bundle.ts  (auto-generated)
├── data/
│   ├── Peaname.xlsx
│   └── pea_master.json
├── scripts/
│   ├── extract_pea_data.py
│   └── bundle_data.js
├── .gitignore
├── wrangler.toml
├── package.json
└── tsconfig.json
```

---

## Data: 116 vs 117

The source Excel (`Peaname.xlsx`) contains exactly **116 unique P codes**. The "117" originally referenced in the project brief does not match the actual data. This has been verified by raw Excel audit. The system correctly extracts all 116 offices.

---

## Free-Tier Limits

| Resource | Limit | This Project |
|----------|-------|-------------|
| Pages requests | Unlimited | ✅ |
| Functions requests | 100K/day | ✅ |
| Worker size | 1MB | ✅ (~250KB) |
| Build minutes | 500/month | ✅ |

## Known Limitations

- **No rate limiting** — stateless edge functions cannot track request rates without paid Workers KV
- **Data updates require redeploy** — JSON is bundled at build time
- **API key is optional mode** — export currently allows unauthenticated access (can be switched to required)

## Future Upgrades

| Need | Solution |
|------|----------|
| Custom domain | Cloudflare Pages custom domains (free) |
| Auth | Cloudflare Access or API tokens |
| Editable data | D1 (SQLite on edge) |
| Rate limiting | Workers KV + middleware |
| Separate API | Standalone Cloudflare Worker |
