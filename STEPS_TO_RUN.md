# GovJobs Run Guide (Backend + Frontend + Ingestion + LLM PDF Extraction)

## 1) Prerequisites
- PostgreSQL running
- Redis running
- Python venv available at `myvenv/`
- Node.js + npm
- Ollama installed (for LLM-first PDF extraction)

## 2) Backend (FastAPI + Celery)
From repo root:

```bash
cd /home/sumit/Downloads/sumit/govjobs
source myvenv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

Start FastAPI:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start Celery worker (new terminal):

```bash
cd /home/sumit/Downloads/sumit/govjobs
source myvenv/bin/activate
celery -A app.tasks.celery_app worker -l info
```

Start Celery beat (new terminal):

```bash
cd /home/sumit/Downloads/sumit/govjobs
source myvenv/bin/activate
rm -f /home/sumit/Downloads/sumit/govjobs/celerybeat-schedule
celery -A app.tasks.celery_app beat -l info
```

## 3) Frontend + Ingestion (Next.js)
```bash
cd /home/sumit/Downloads/sumit/govjobs/web
npm install
npm run prisma:generate
npm run prisma:migrate
npm run ingest:seed
```

Start frontend:

```bash
npm run dev
```

Start ingestion worker + scheduler (optional but recommended):

```bash
npm run ingest:dev
```

## 4) Enable LLM-first PDF extraction (Qwen via Ollama)
Pull model:

```bash
ollama pull qwen2.5:7b
```

Set these in `web/.env`:

```env
LLM_EXTRACTOR_ENABLED=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
LLM_EXTRACTOR_MODEL=qwen2.5:7b
LLM_EXTRACTOR_TIMEOUT_MS=180000
LLM_EXTRACTOR_MAX_CHARS=24000
```

Refresh already-processed jobs with latest extraction logic:

```bash
cd /home/sumit/Downloads/sumit/govjobs/web
npx tsx src/ingest/normalizeRun.ts --force
```

## 5) Quick verification
- Frontend UI: `http://localhost:3000`
- Backend API docs: `http://localhost:8000/docs`
- Jobs API (UPSC sample):

```bash
curl "http://localhost:3000/api/jobs?organization=UPSC&activeOnly=true&limit=20"
```

## Notes
- Extraction behavior: **LLM first**, then existing parser as fallback per field.
- If both miss a field, UI keeps fallback/default display (for example, "Not decided yet").
- If Ollama is unavailable, pipeline continues using existing parser fallback.
