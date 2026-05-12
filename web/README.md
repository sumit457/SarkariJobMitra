# GovJobs Web

For complete backend + frontend + ingestion + LLM setup steps, use:

- [`/home/sumit/Downloads/sumit/govjobs/STEPS_TO_RUN.md`](/home/sumit/Downloads/sumit/govjobs/STEPS_TO_RUN.md)

Quick web-only start:

```bash
cd /home/sumit/Downloads/sumit/govjobs/web
npm install
npm run prisma:generate
npm run prisma:migrate
npm run ingest:seed
npm run dev
```

Useful APIs:
- `GET /api/notifications?limit=50`
- `GET /api/jobs?limit=50`
