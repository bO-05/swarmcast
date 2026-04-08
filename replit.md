# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## SwarmCast Application

**SwarmCast** (`artifacts/swarmcast`) — voice-powered public sentiment simulator for ElevenHacks #2 (Replit × ElevenLabs).

### Artifacts
- `artifacts/api-server` — Express 5 REST API + SSE pipeline, runs on `$PORT` (8080 dev)
- `artifacts/swarmcast` — React + Vite frontend, runs on port 22780, proxied at `/`

### Backend Services (`artifacts/api-server/src/services/`)
- `pipeline.ts` — Full orchestration: keywords → Exa + Perplexity → 25 personas → Voice Design → TTS top-8 → montage → forecast
- `mistral.ts` — Keyword extraction, 25-persona generation, swarm summary via Mistral API
- `exa.ts` — Web discourse search (8 results) via Exa API
- `perplexity.ts` — Fact-checking via Perplexity sonar-pro; returns snake_case but pipeline normalizes to camelCase before DB storage
- `elevenlabs.ts` — ElevenLabs Voice Design (unique voice per persona) + TTS audio generation
- `montage.ts` — ffmpeg CLI audio concatenation into focus group podcast
- `sse-broker.ts` — In-memory pub/sub with event history replay for SSE subscribers
- `forecast.ts` — Sentiment timeline with historical + predicted points

### Database Schema (`lib/db/src/schema/`)
- `analyses` — Main table: id (UUID), title, inputText, status, factCheck (JSONB), exaResults (JSONB), persona sentiment aggregates, montageUrl
- `personas` — 25 AI personas per analysis: voice/audio fields, sentiment scores, MBTI, demographics
- `forecast_points` — Hourly sentiment points with confidence bands (isForecast flag)

### Frontend Components (`artifacts/swarmcast/src/`)
- `pages/Home.tsx` — State machine: input form → pipeline feed → analysis dashboard
- `hooks/use-sse-pipeline.ts` — Native EventSource SSE hook (NOT the generated useStreamAnalysis)
- `components/InputForm.tsx` — Title + document text form with history list
- `components/PipelineFeed.tsx` — Real-time pipeline step progress with Framer Motion
- `components/AnalysisDashboard.tsx` — Full dashboard: montage player, sentiment gauge, fact-check, web context, 25 persona cards, forecast chart
- `components/SentimentForecastChart.tsx` — Recharts line chart with historical/forecast series + confidence bands
- `components/PersonaCard.tsx` — Individual persona cards with audio play button
- `components/HistorySidebar.tsx` — Recent analyses navigation sidebar

### API Contracts
- Fact-check stored as camelCase JSON (`objectiveAssessment`, `accuracyRating`, `factCheckItems`) matching OpenAPI spec
- SSE events: `status`, `exa_done`, `perplexity_done`, `personas_done`, `voice_progress`, `audio_progress`, `montage_done`, `complete`, `error`
- Voice/audio progress tracked by counting SSE events (not expecting `completed/total` fields)
- Analysis status values: `pending` → `processing` → `complete` | `error`

### API Keys Required
- `ELEVENLABS_API_KEY` — Voice Design + TTS
- `EXA_API_KEY` — Web search
- `MISTRAL_API_KEY` — Persona generation + summarization
- `PERPLEXITY_API_KEY` — Fact-checking
