# Tools-Only Public Launch

This project can be launched in phases. Phase 1 exposes only the public tools and keeps jobs, notices, admin, and ingestion surfaces hidden.

## Recommended Low-Cost Stack

- Frontend: Vercel, project root `web`
- Backend API: Render, Docker service from the repository root
- DNS and analytics: Cloudflare
- Database/Redis: keep existing providers if already configured, or use Render/Neon/Upstash later

## Phase 1 Safety Settings

Backend environment:

```env
PUBLIC_SITE_PHASE=tools
ENV=production
SECRET_KEY=<long-random-secret>
DATABASE_URL=<your-db-url>
REDIS_URL=<your-redis-url>
CORS_ORIGINS=https://your-domain.com,https://your-vercel-project.vercel.app
MAX_UPLOAD_MB=25
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_WINDOW_SECONDS=3600
ENABLE_AUTO_PUBLISH=false
ENABLE_NOTICE_CLASSIFIER=false
ENABLE_FIELD_CANDIDATES=false
ENABLE_SOURCE_HEALTH=false
```

Frontend environment:

```env
NEXT_PUBLIC_SITE_PHASE=tools
NEXT_PUBLIC_API_BASE=https://your-render-api.onrender.com
NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN=<optional-cloudflare-token>
```

## Render Backend

1. Create a new Render Web Service.
2. Connect the GitHub repository.
3. Choose Docker as the environment.
4. Keep the root directory as the repository root.
5. Add the backend environment variables from `.env.example`.
6. Deploy.
7. Open `https://your-render-api.onrender.com/docs` and confirm it loads.

The backend Docker image includes LibreOffice and qpdf because the conversion/compression tools need them.

## Vercel Frontend

1. Create a new Vercel project.
2. Select the same GitHub repository.
3. Set Root Directory to `web`.
4. Add the frontend environment variables from `web/.env.example`.
5. Deploy.
6. Open the Vercel URL and confirm the tools page loads.

## Domain And Analytics

1. Buy the domain.
2. Add it to Cloudflare.
3. Point the main domain to Vercel.
4. Keep the API on Render, for example `api.your-domain.com`, when you are ready.
5. Enable Cloudflare Web Analytics and paste the token into `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`.

Cloudflare Web Analytics gives page views and country-level traffic without storing uploaded files. Tool uploads are processed temporarily by the backend and are not written to permanent storage by these endpoints.

## Smoke Tests After Deploy

Run these checks from your laptop:

```bash
curl -I https://your-domain.com
curl -I https://your-domain.com/jobs
curl -I https://your-render-api.onrender.com/docs
curl -I https://your-render-api.onrender.com/jobs
```

Expected:

- `/` returns `200`.
- `/jobs` on frontend returns `404` in tools phase.
- `/docs` on backend returns `200`.
- `/jobs` on backend returns `404` in tools phase.

## Phase 2 Later

When job listings are ready, change both values:

```env
PUBLIC_SITE_PHASE=full
NEXT_PUBLIC_SITE_PHASE=full
```

Then redeploy backend and frontend after reviewing job/admin route security.
