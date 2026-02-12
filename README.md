# Jynx — Intelligent Conference Networking

A Next.js application that leverages market basket analysis to intelligently match leadership conference attendees for meaningful professional networking.

**Event:** Global Leadership Summit 2026 (April 30 – May 2) at Disney's Grand Floridian Resort

## Features

- **Intelligent Matching** — Market basket analysis identifies high-affinity connections (shared experiences) and strategic connections (complementary expertise) with diversity enforcement
- **AI-Powered Insights** — Conversation starters and profile summaries via Gemini 2.0 Flash (Vertex AI) or algorithmic fallback (OpenAI)
- **Leadership Questionnaire** — 20 questions across 4 sections capturing leadership context, challenges, goals, and personal interests
- **Real-Time Messaging** — Socket.io-powered chat with typing indicators, online presence, and HTTP fallback
- **Meeting Scheduling** — Request, accept, decline, and reschedule meetings with calendar conflict detection
- **Calendar Integration** — Google Calendar and Microsoft Outlook OAuth with privacy-preserving free/busy queries
- **Network Visualization** — Interactive D3.js force-directed graph of your connections
- **Smart Search & Filtering** — Full-text search with industry, leadership level, org size, and interest filters
- **Notifications** — Real-time push via Socket.io with 30-second polling fallback

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, server components) |
| Language | TypeScript 5.3 (strict mode) |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix primitives) |
| State | Zustand 4.5 |
| Forms | React Hook Form 7 + Zod validation |
| Database / Auth | Supabase (PostgreSQL with RLS) |
| Auth tokens | JWT via jose + bcryptjs |
| Real-time | Socket.io 4.7 (custom server via `server.ts`) |
| Visualization | D3.js 7.9 |
| Calendar | Google APIs + Microsoft Graph / MSAL |
| AI | OpenAI or GCP Vertex AI (configurable via `AI_PROVIDER` env var) |
| AI — Generative | Gemini 2.0 Flash via @google/genai |
| Testing | Vitest + Testing Library |
| Icons | Lucide React |
| Fonts | DM Sans (body) + Fraunces (display headings) |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase project (or PostgreSQL database)

### Installation

```bash
git clone https://github.com/camila-go/networknav.git
cd networknav
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Database
DATABASE_URL=postgresql://...

# Auth (min 32 chars each)
JWT_SECRET=
JWT_REFRESH_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI Provider — "openai" (default) or "vertex"
AI_PROVIDER=openai
OPENAI_API_KEY=                    # required when AI_PROVIDER=openai
GOOGLE_CLOUD_PROJECT=              # required when AI_PROVIDER=vertex
GOOGLE_APPLICATION_CREDENTIALS=    # path to GCP service account key

# Calendar Integrations (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

### Database Setup

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for full Supabase configuration, or run Drizzle migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

### Run

```bash
pnpm dev          # Dev server with Socket.io on :3000
pnpm dev:next     # Dev server without Socket.io (plain Next.js)
```

Visit [http://localhost:3000](http://localhost:3000)

## Scripts

```bash
pnpm dev              # Dev server (custom server with Socket.io)
pnpm dev:next         # Dev server (plain Next.js)
pnpm build            # Production build
pnpm start            # Production server (with Socket.io)
pnpm start:next       # Production server (plain Next.js)
pnpm lint             # ESLint
pnpm test             # Vitest
pnpm test:ui          # Vitest with browser UI
pnpm test:coverage    # Vitest with V8 coverage
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run Drizzle migrations
pnpm db:studio        # Open Drizzle Studio
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, register
│   ├── (dashboard)/         # Dashboard, explore, messages, meetings, network, profile
│   ├── (onboarding)/        # Questionnaire wizard
│   └── api/                 # API routes
├── components/
│   ├── auth/                # Login & register forms
│   ├── dashboard/           # Nav, match cards, stats
│   ├── explore/             # Search, filters, attendee cards
│   ├── meetings/            # Scheduling, availability, conflicts
│   ├── messages/            # Conversations, chat
│   ├── network/             # D3 network graph
│   ├── notifications/       # Bell, notification list
│   ├── questionnaire/       # Wizard, question cards, inputs
│   └── ui/                  # shadcn components
├── db/                      # Drizzle schema (documentation)
├── lib/
│   ├── ai/                  # Provider abstraction (OpenAI, Vertex, Gemini)
│   ├── auth/                # Middleware, session helpers
│   ├── integrations/        # Google Calendar, Microsoft Outlook
│   ├── matching/            # Market basket analysis
│   ├── notifications/       # Notification service
│   ├── security/            # Rate limiting, CSRF, content moderation
│   ├── socket/              # Socket.io server & client
│   ├── stores/              # Zustand stores
│   ├── supabase/            # Supabase client
│   └── validation/          # Zod schemas
├── test/                    # Test setup, factories, mocks
└── types/                   # Domain, API, and database types
```

## License

MIT
