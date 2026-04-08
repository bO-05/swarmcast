# SwarmCast

**AI Focus Group Simulator** — built for ElevenHacks #2 (Replit × ElevenLabs).

Paste any announcement, press release, or article and hear how 25 distinct AI personas would react to it — in their own unique voices, with karaoke-style transcripts, prescriptive improvement suggestions, and a conversational agent you can interrogate in real time.

---

## What it does

Most content goes out into the world blind. SwarmCast gives you an instant focus group before you publish. You paste a document; SwarmCast:

1. Extracts key topics and searches the live web for related discourse (Exa)
2. Fact-checks your content against real sources (Perplexity)
3. Generates 25 demographically diverse AI personas — each with a unique background, belief stance, age, country, MBTI type, and sentiment bias (Mistral)
4. Builds a **Pronunciation Dictionary** for your document's domain terms, acronyms, and proper nouns
5. Generates a **swarm summary** — dominant emotion, risk level, viral potential, narrative fractures, and prescriptive content suggestions (Mistral)
6. Uses the **ElevenLabs Voice Design API** to synthesise a completely unique voice for the 8 most influential personas, matched to their demographics
7. Assigns ElevenLabs library voices to the remaining 17 personas
8. Generates spoken audio for all 8 top personas using emotional voice tuning and the pronunciation dictionary
9. Uses **Forced Alignment** to produce word-level timestamps for a karaoke-style transcript
10. Generates a **mood-adaptive narrator intro clip** (Daniel voice) and a **sound effects theme** tuned to the swarm's emotional state (Sound Effects API)
11. Stitches narrator + theme + persona clips into a **Focus Group Podcast** (ffmpeg)
12. Creates an **ElevenLabs ConvAI agent** pre-loaded with full swarm context — talk to your swarm in real time
13. Shows sentiment forecast, viral potential score, risk level, narrative fractures, and prescriptive content suggestions

All of this streams to your browser in real time via Server-Sent Events.

---

## How it uses ElevenLabs

ElevenLabs is the complete auditory engine of SwarmCast — not just TTS, but the full product suite:

| Feature | ElevenLabs API |
|---|---|
| Unique persona voices | Voice Design API (`/v1/voice-generation/generate-voice` + `create-voice`) |
| Library fallback voices | Voice Library (scored by gender, age, accent) |
| Persona audio clips | TTS (`/v1/text-to-speech`, `eleven_multilingual_v2`) |
| Pronunciation accuracy | Pronunciation Dictionaries (`/v1/pronunciation-dictionaries`) |
| Karaoke word timestamps | Forced Alignment (`/v1/forced-alignment`) |
| Narrator intro | TTS (Daniel voice `onwK4e9ZLuTAKqWW03F9`) |
| Mood-adaptive theme | Sound Effects API (`/v1/sound-generation`) |
| Conversational agent | ConvAI (`/v1/convai/agents/create` + signed URL) |

### Emotional voice tuning

Every persona clip is generated with emotion-tuned parameters derived from their final sentiment score:
- **Positive** (> 0.3): high stability, low style — confident, composed delivery
- **Negative** (< −0.3): low stability, high style — agitated, urgent speech
- **Neutral**: balanced parameters for measured, documentary-style delivery

### Mood-adaptive sound theme

Five emotional presets — *hopeful corporate*, *tense investigative*, *neutral documentary*, *viral euphoric*, *dark tension* — are mapped from the swarm's dominant emotion, risk level, and viral potential, then used to generate a unique sound effect clip prepended to every podcast.

---

## How it uses Replit

SwarmCast is entirely **built and hosted on Replit** — no local setup, no Docker, no DevOps.

- Replit's managed PostgreSQL database for analyses, personas, forecast points, and montage timelines
- Replit Deployments for production hosting on a `.replit.app` domain
- Replit's path-based routing proxy for the React frontend and Express API
- Replit Secrets for all API keys

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend | Express 5 (Node.js 24) |
| Database | PostgreSQL + Drizzle ORM |
| Monorepo | pnpm workspaces + TypeScript project references |
| AI — Personas + Summary | Mistral Large |
| AI — Web search | Exa neural search |
| AI — Fact-check | Perplexity sonar-pro |
| Voice synthesis | ElevenLabs TTS (`eleven_multilingual_v2`) |
| Voice design | ElevenLabs Voice Design API |
| Karaoke timestamps | ElevenLabs Forced Alignment |
| Pronunciation | ElevenLabs Pronunciation Dictionaries |
| Sound theme | ElevenLabs Sound Effects API |
| Conversational agent | ElevenLabs ConvAI |
| Audio montage | ffmpeg |
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
      components/      # InputForm, AnalysisDashboard, PersonaCard, PipelineFeed,
                       # KaraokeMontagePlayer, HowToImprove, SwarmChat,
                       # SentimentForecastChart, AudioPlayer

lib/
  db/                  # Drizzle schema + migrations (analyses, personas, forecast_points)
  api-spec/            # OpenAPI spec + Orval codegen → typed hooks
  api-client-react/    # Generated React Query hooks
  api-zod/             # Zod validation schemas
```

---

## Pipeline overview

```
Input (text / URL / PDF)
  │
  ├─► Mistral: keyword + topic extraction
  │
  ├─► Exa: neural web search             (parallel)
  ├─► Perplexity: fact-check             (parallel)
  ├─► ElevenLabs: Pronunciation Dict     (parallel)
  │
  ├─► Mistral: generate 25 personas (demographics, sentiment, belief stance)
  │
  ├─► Mistral: swarm summary (emotion, risk, viral, fractures, suggestions)
  │
  ├─► ElevenLabs Voice Design: unique voices for top 8   (parallel)
  ├─► ElevenLabs Library: assign voices for remaining 17
  │
  ├─► ElevenLabs: narrator intro clip (Daniel)           (parallel)
  ├─► ElevenLabs: mood-adaptive sound theme              (parallel)
  │
  ├─► ElevenLabs TTS: persona clips with emotional tuning (parallel)
  ├─► ElevenLabs Forced Alignment: word timestamps per clip
  │
  ├─► ffmpeg: theme + narrator + clips → Focus Group Podcast
  │
  ├─► ElevenLabs ConvAI: create swarm agent with full context
  │
  └─► Forecast: sentiment arc + viral potential curve
```

All steps stream progress to the browser via SSE.

---

## Getting started

### Prerequisites

- Node.js 24+
- pnpm 10+
- PostgreSQL database
- ffmpeg

### API keys needed

| Variable | Service |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs (all features) |
| `MISTRAL_API_KEY` | Persona + summary generation |
| `EXA_API_KEY` | Web discourse search |
| `PERPLEXITY_API_KEY` | Fact-checking |
| `DATABASE_URL` | PostgreSQL connection string |

### Install and run

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/swarmcast run dev
```

---

## License

MIT
