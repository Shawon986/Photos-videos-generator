# VisionForge AI

**Free AI image & video generation studio powered by open-source models.**

Create AI images from text, videos from text, and animations from uploaded
images — with a polished dark-first UI, user accounts, generation history,
public sharing, and a provider-agnostic architecture that never locks you
into one AI vendor.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui ·
Prisma · Auth.js (NextAuth) · Zod · Zustand · Framer Motion**.

> The app never pretends a model ran when it didn't. If no AI provider is
> configured, generations either fail with a clear error or — when
> `DEMO_MODE=true` — produce **clearly labelled "Demo Preview"** assets.

---

## 1. Requirements

- **Node.js 20+** (tested on 24)
- **npm 10+**
- **PostgreSQL 14+** — only for production. Local development uses SQLite
  (zero setup) via Prisma.
- Optional: a GPU machine for local AI inference servers
- Optional: a free [Hugging Face](https://huggingface.co) account/token

## 2. Node installation

Install Node.js from <https://nodejs.org> (LTS recommended), then verify:

```bash
node -v   # v20 or newer
npm -v
```

## 3. Install dependencies

```bash
cd "D:/Photos & videos generator"   # or wherever you cloned the repo
npm install
```

## 4. Environment variables

Copy the example file and adjust:

```bash
cp .env.example .env
```

Every variable is documented inside `.env.example`. The important ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file (dev) or PostgreSQL URL (production) |
| `AUTH_SECRET` | Session signing secret — generate with `npx auth secret` |
| `IMAGE_PROVIDER` / `VIDEO_PROVIDER` | image: `local`, `huggingface`, `openai-compatible`, `pollinations`; video: `local`, `huggingface` |
| `AI_IMAGE_URL` / `AI_VIDEO_URL` | Endpoints of your self-hosted inference servers |
| `HUGGINGFACE_API_KEY` | HF Inference token (free tier) |
| `POLLINATIONS_IMAGE_URL` | Free no-key image API (defaults to image.pollinations.ai) |
| `DEMO_MODE` | `true` = labelled demo previews when no provider is reachable |
| `STORAGE_PROVIDER` / `UPLOAD_DIR` | File storage location |
| `IMAGE_GENERATIONS_PER_HOUR` / `VIDEO_GENERATIONS_PER_HOUR` | Rate limits |

> **API keys live only in `.env` on the server.** They are never bundled to
> the browser — the client only receives booleans via `/api/config`.

## 5. Database setup

**Development (SQLite — no install needed):**

```bash
npx prisma generate
npx prisma migrate dev
```

**PostgreSQL (production):**

1. Create a database: `createdb visionforge`
2. Replace `prisma/schema.prisma` with the Postgres variant:

   ```bash
   cp prisma/schema.postgres.prisma prisma/schema.prisma
   ```

3. Set `DATABASE_URL="postgresql://user:password@localhost:5432/visionforge?schema=public"`
4. Run:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

## 6. Running the app

```bash
npm run dev
```

Open <http://localhost:3000>. The background generation worker starts
automatically inside the dev server on the first API request.

Useful commands:

```bash
npm run build       # production build
npm start           # serve the production build
npm run worker      # standalone background worker (production)
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # Vitest unit tests
npm run e2e         # Playwright end-to-end tests (see "Testing" below)
```

## 7. Running the local AI image server

VisionForge talks HTTP to self-hosted inference servers, so you can run
models on a GPU machine anywhere on your network.

Reference implementation (FastAPI + diffusers):

```bash
pip install fastapi uvicorn diffusers torch pillow
python scripts/local-image-server.py        # listens on :8000
```

Then in `.env`:

```env
IMAGE_PROVIDER=local
AI_IMAGE_URL=http://localhost:8000
```

Supports Stable Diffusion 1.5/2.1, SDXL, FLUX.1-schnell and any compatible
pipeline — see `scripts/local-image-server.py` for the model map and the
exact JSON protocol.

## 8. Running the local AI video server

Video models are heavy — run them on a dedicated GPU machine:

```bash
pip install fastapi uvicorn diffusers torch pillow imageio[ffmpeg]
python scripts/local-video-server.py        # listens on :8001
```

```env
VIDEO_PROVIDER=local
AI_VIDEO_URL=http://localhost:8001
```

The interface (`lib/ai/video/provider.ts`) is designed for **Stable Video
Diffusion, Wan, CogVideoX, HunyuanVideo and LTX-Video** — map any pipeline
in `scripts/local-video-server.py`. **The web server never renders video
frames itself**; it only orchestrates jobs and stores results.

## 9. Connecting Hugging Face (free tier)

1. Create a free token at <https://huggingface.co/settings/tokens>
2. Add to `.env`:

   ```env
   IMAGE_PROVIDER=huggingface
   VIDEO_PROVIDER=huggingface
   HUGGINGFACE_API_KEY=hf_...
   ```

Supported HF models:

- Images: Stable Diffusion 1.5/2.1, SDXL, FLUX.1-schnell
- Video: text-to-video-ms-1.7b, CogVideoX, I2VGen-XL, SVD (image-to-video)

Free-tier models load on demand (`wait_for_model`) — first requests may take
a minute. Requests are clamped to each model's supported resolution.

**huggingface.co unreachable from your network?** Some networks block it
(DNS pollution + IP blocks). Options: use a VPN/proxy and point the app at a
reachable gateway via `HF_INFERENCE_URL`; use the OpenAI-compatible provider
below (SiliconFlow etc.); or use the Pollinations provider (9.2) — free,
no account, no key, reachable almost everywhere.

### 9.2 Pollinations (free, no key — works out of the box)

[Pollinations](https://pollinations.ai) is a community-funded open-model API
that needs **no signup and no API key**:

```env
IMAGE_PROVIDER=pollinations
POLLINATIONS_IMAGE_URL=https://image.pollinations.ai   # default, optional
POLLINATIONS_REFERRER=                                 # optional app identifier
```

- Images are generated by open models (`sana`/`flux`/`turbo` depending on
  what the service currently serves — pass `?model=` to pin one).
- Anonymous tier: ~1 request per 15s, images may carry a Pollinations
  watermark. A free account at <https://auth.pollinations.ai> lifts both.
- Generation can take 30–60s (shared, often cold infrastructure). Requests
  are sent with `private=true` so prompts stay out of the public feed.

### 9.1 SiliconFlow / OpenAI-compatible image API

SiliconFlow (<https://siliconflow.cn> / global portal <https://siliconflow.com>)
offers FLUX.1-schnell and SDXL through an OpenAI-compatible API — and its
endpoint is reachable from networks where huggingface.co is blocked.

> Note: accounts registered on the international portal (siliconflow.com) do
> not get the CN portal's signup credits — generation may fail with
> "insufficient balance" until the account is topped up. Keys are
> portal-specific: use the endpoint that matches where you registered.

1. Create an account and copy an API key
2. Add to `.env`:

   ```env
   IMAGE_PROVIDER=openai-compatible
   OPENAI_COMPAT_IMAGE_URL=https://api.siliconflow.cn/v1
   OPENAI_COMPAT_API_KEY=sk-...
   ```

3. Restart the app — image generation now runs real models (FLUX.1-schnell
   by default, SDXL selectable in the studio). The "Demo Preview" badge
   disappears automatically.

The same provider works with any `/v1/images/generations` endpoint
(Together, Novita, self-hosted gateways) — just change the URL/model map in
`lib/ai/image/openai-compatible-provider.ts`.

## 10. How generations run

```
User submits prompt
    → API validates (Zod) → moderates → rate-limits
    → creates Generation + GenerationJob (status QUEUED)
    → returns { generationId, queuePosition } immediately
Worker (in-process in dev, `npm run worker` in production)
    → claims oldest QUEUED job
    → calls the configured AI provider
    → stores media under ./uploads (images / videos / thumbnails / uploads)
    → marks COMPLETED (or FAILED with a user-safe message)
Frontend polls GET /api/generations/:id every 2.5s
```

Progress is **only shown when the backend actually reports it**. Providers
that don't report progress render an indeterminate loader — the UI never
invents percentages. Cancellation aborts queued and in-flight work.

For Redis/BullMQ at scale, replace the claim/complete primitives in
`lib/jobs/queue.ts` — API routes only depend on `enqueueJob`/`updateJobProgress`.

## 11. Production deployment

1. PostgreSQL + `prisma/schema.postgres.prisma` (see §5).
2. `npm run build && npm start` for the web server.
3. Run the worker separately: `npm run worker` (set
   `WORKER_AUTO_START=false` in `.env`).
4. Storage: the local provider writes to disk — for multi-instance or
   serverless deployment, implement `StorageProvider` in `lib/storage/`
   for S3 / Cloudflare R2 / Supabase Storage and register it in
   `lib/storage/index.ts`. Media is served through `/api/files/...`, so the
   storage backend is fully abstracted from the rest of the app.
5. Set `AUTH_SECRET` to a strong random value and serve over HTTPS.
6. Rate limits are per-user/per-hour via env vars; scale-out deployments
   should back the IP limiter with Redis (`lib/rate-limit/index.ts`).

## 12. Storage configuration

```env
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
```

Layout:

```text
uploads/
  images/      # generated images
  videos/      # generated videos
  thumbnails/  # video thumbnails
  uploads/     # user uploads (image-to-video inputs)
```

Files are served through `app/api/files/[...path]/route.ts` with
authorization: generation outputs are visible to the owner and (when
shared) to everyone; uploads are owner-only. To add S3/R2, implement the
`StorageProvider` interface (`lib/storage/provider.ts`).

## 13. Testing

```bash
npm test          # 61 Vitest unit tests: validation, safety, rate limits,
                  # uploads, provider resolution/failures, ownership, hashing
```

End-to-end (Playwright):

```bash
npx playwright install chromium
npm run dev       # in another terminal (needs DEMO_MODE=true)
npm run e2e
```

E2E covers: login → create image → view result → delete; login → upload
image → image-to-video → view result; guest redirects on protected pages.

## 14. Security notes

- Passwords hashed with bcrypt (never stored in plaintext)
- Every API request Zod-validated; ownership enforced on all mutations
- Uploads: size-capped, MIME + magic-byte validated, filenames sanitized
- Storage keys are path-traversal-proof (`buildStorageKey`/`resolveUnderRoot`)
- Provider URLs come **only** from env config — user input can never
  influence which servers the app talks to (SSRF-safe by design)
- Errors to clients are curated — stack traces and secrets stay server-side
- Basic keyword moderation before generation
  (`lib/safety/prompt-moderation.ts`) — a first line of defense, **not**
  a perfect safety system; combine with provider-side moderation
- Rate limits per user (hourly quota) and per IP (burst), configurable

## 15. Project structure

```text
app/                  # pages + API routes (App Router)
  page.tsx            # landing page
  create/             # creation studio (image / text→video / image→video)
  dashboard/          # history, favorites, stats
  explore/            # public gallery with filters
  creation/[id]/      # shared/public creation detail
  settings/           # profile, password, AI status
  login/ register/
  api/                # auth, generate/*, generations/*, upload, files, config
components/
  ui/                 # shadcn/ui primitives
  create/             # studio forms, dropzone, selectors
  navbar / hero / gallery / result panel / progress / media preview ...
lib/
  ai/                 # provider abstraction (image|video × local|huggingface|openai-compatible|pollinations|demo)
  auth/               # Auth.js config, password hashing, ownership
  db.ts               # Prisma singleton
  env.ts              # validated environment config
  jobs/               # database-backed job queue
  workers/            # background generation worker
  storage/            # storage abstraction (local, S3-ready)
  safety/             # prompt moderation
  rate-limit/         # per-user + per-IP rate limiting
  validation/         # Zod schemas (requests + uploads)
prisma/               # schema (SQLite dev + Postgres production variant)
scripts/              # worker entry + reference AI inference servers (Python)
tests/ e2e/           # Vitest unit tests + Playwright E2E
```

## 16. Troubleshooting

**"Generation failed — no AI image provider is configured."**
No provider is reachable and `DEMO_MODE=false`. Either start a local
inference server (`AI_IMAGE_URL`) or set `HUGGINGFACE_API_KEY`, or set
`DEMO_MODE=true` for labelled previews.

**"The AI server is currently unreachable."**
`AI_IMAGE_URL`/`AI_VIDEO_URL` is set but nothing answers there. Check the
server is running (`curl http://localhost:8000/health`).

**Generations stay QUEUED forever.**
The worker isn't running. In dev it auto-starts on the first API request;
in production run `npm run worker`.

**`prisma migrate` fails.**
Check `DATABASE_URL` matches the schema provider (SQLite `file:./dev.db`
with `schema.prisma`; Postgres URL with `schema.postgres.prisma`).

**Port 3000 already in use.**
Stop the other process (on Windows:
`netstat -ano | findstr :3000`, then `taskkill /PID <pid> /F`).

**Hugging Face returns errors for a model.**
Free-tier video models are quota-limited and cold-load on demand — retry,
or self-host with the scripts in `scripts/`.

**Windows path with `&` breaks npm scripts.**
If your project folder contains `&` (e.g. `D:\Photos & videos generator`),
cmd.exe can mis-parse npm's shim paths. Two options: run commands through
Git Bash using `./node_modules/.bin/<tool>`, or move the project to a path
without `&`. PowerShell handles it correctly in most cases.

---

## Demo mode

With `DEMO_MODE=true` and no provider configured, the whole app works using
**bundled real sample media** — real photographs and video clips from
`public/demo/` picked deterministically from your prompt. Every demo result
carries a visible **“Demo Preview”** badge and `isDemo: true` in the API — it
is never presented as model output. Configure a real provider and the badge
disappears automatically.

Sample media credits: photos and clips from [Pexels](https://www.pexels.com)
(free license, no attribution required) plus “Big Buck Bunny” (© Blender
Foundation, CC-BY 3.0) and “Echo” (© Antics, CC-BY) from the MediaElement
sample collection. If a bundled asset is missing, demo mode falls back to
deterministic procedural SVG art.

The demo account (`test@visionforge.local` / `Test-pass-123`, dev database
only) ships with a curated set of real sample generations — one shared, so
Explore has content out of the box. Rebuild them any time with:

```bash
./node_modules/.bin/tsx scripts/seed-demo.ts
```
