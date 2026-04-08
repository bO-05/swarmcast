# SwarmCast

**Voice-powered public sentiment simulator** — built for ElevenHacks #2 (Replit × ElevenLabs).

Paste any announcement, press release, or news article and hear how 25 distinct AI personas would react to it — in real time, in their own voices.

---

## What it does

Most content goes out into the world blind. SwarmCast gives you an instant focus group before you publish. You paste a document; SwarmCast:

1. Extracts key topics and searches the live web for related discourse (Exa)
2. Fact-checks your content against real sources (Perplexity)
3. Generates 25 demographically diverse AI personas — each with a unique background, belief stance, age, country, and MBTI type (Mistral)
4. Assigns each persona a unique voice via **ElevenLabs**, matched by gender, age, and accent
5. Generates spoken audio for the 8 most influential personas
6. Stitches them into a listenable **Focus Group Podcast** (ffmpeg)
7. Shows you a sentiment forecast, viral potential, risk level, and narrative fracture points

All of this streams to your browser in real time via Server-Sent Events.

---

## How it uses ElevenLabs

ElevenLabs is the auditory engine that makes SwarmCast more than a dashboard. Every persona gets a distinct human voice matched to their demographic — a young Australian skeptic sounds different from a British elder. The top 8 most influential personas have their reactions spoken aloud and concatenated into a single podcast-style audio file you can play directly in the app.

- **Voice matching**: scored by gender, age category (young / middle-aged / old), and accent (American, British, Australian, African, etc.)
- **TTS model**: `eleven_monolingual_v1` with tuned stability and similarity settings per character
- **Parallel generation**: all 8 audio clips are generated concurrently for speed
- **Montage**: ffmpeg concatenates clips with 400ms silence gaps into `montage.mp3`

---

## How it uses Replit

SwarmCast is entirely **built and hosted on Replit** — no local setup, no Docker, no DevOps. The pnpm monorepo runs in Replit's environment with:

- Replit's managed PostgreSQL database for all analyses, personas, and forecast points
- Replit Deployments for production hosting on a `.replit.app` domain
- Replit's path-based routing proxy for the React frontend and Express API
- Replit Secrets for all API keys (ElevenLabs, Mistral, Exa, Perplexity)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend | Express 5 (Node.js 24) |
| Database | PostgreSQL + Drizzle ORM |
| Monorepo | pnpm workspaces + TypeScript project references |
| AI — Personas | Mistral Large |
| AI — Web search | Exa neural search |
| AI — Fact-check | Perplexity sonar-pro |
| Audio | ElevenLabs TTS + ffmpeg |
| Realtime | Server-Sent Events (SSE) |
| Hosting | Replit Deployments |

---

## Project structure

```
artifacts/
  api-server/          # Express 5 REST API + pipeline orchestration
    src/
      routes/          # analyses, fetch-url
      services/        # pipeline, mistral, exa, perplexity, elevenlabs, montage, forecast, sse-broker
  swarmcast/           # React + Vite frontend
    src/
      pages/           # Home, AnalysisPage
      components/      # InputForm, AnalysisDashboard, PersonaCard, PipelineFeed, SentimentForecastChart, AudioPlayer

lib/
  db/                  # Drizzle schema + migrations (analyses, personas, forecast_points)
  api-spec/            # OpenAPI spec + Orval codegen → typed hooks
  api-client-react/    # Generated React Query hooks
```

---

## Getting started

### Prerequisites

- Node.js 24+
- pnpm 10+
- PostgreSQL database
- ffmpeg (for audio montage)

### API keys needed

| Variable | Service |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs TTS |
| `MISTRAL_API_KEY` | Persona generation |
| `EXA_API_KEY` | Web discourse search |
| `PERPLEXITY_API_KEY` | Fact-checking |
| `DATABASE_URL` | PostgreSQL connection string |

### Install and run

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start frontend (separate terminal)
pnpm --filter @workspace/swarmcast run dev
```

---

## Pipeline overview

```
Input (text / URL / PDF)
  │
  ├─► Mistral: keyword + topic extraction
  │
  ├─► Exa: neural web search (parallel)
  ├─► Perplexity: fact-check (parallel)
  │
  ├─► Mistral: generate 25 personas (demographics, sentiment, belief stance)
  │
  ├─► ElevenLabs: assign unique voices (scored by gender, accent, age)
  │
  ├─► ElevenLabs: TTS for top 8 personas (parallel)
  │
  ├─► ffmpeg: concatenate into Focus Group Podcast
  │
  └─► Mistral: swarm summary + market question + forecast
```

All steps stream progress to the browser via SSE.

---

## License

MIT
