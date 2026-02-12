# NetworkNav (Jynx)

Intelligent networking platform for leadership conferences. Uses market basket analysis to match attendees based on leadership context, challenges, goals, and personal interests.

**Event:** Global Leadership Summit 2026 (April 30 – May 2) at Disney's Grand Floridian Resort

**Repo:** https://github.com/camila-go/networknav.git

## Tech Stack

| Layer              | Technology                                         |
| ------------------ | -------------------------------------------------- |
| Framework          | Next.js 14 (App Router, server components default) |
| Language           | TypeScript 5.3 (strict mode)                       |
| Styling            | Tailwind CSS 3.4 + shadcn/ui (Radix primitives)    |
| State              | Zustand 4.5                                        |
| Forms              | React Hook Form 7 + Zod validation                 |
| Database / Auth    | Supabase (with RLS, raw client queries)            |
| Schema docs        | Drizzle ORM 0.29 (schema only, not used for queries) |
| Auth tokens        | JWT via jose + bcryptjs                             |
| Real-time          | Socket.io 4.7 (custom server via `server.ts`)      |
| Visualization      | D3.js 7.9                                          |
| Calendar           | Google APIs + Microsoft Graph / MSAL                |
| AI                 | OpenAI or GCP Vertex AI (configurable via AI_PROVIDER env var) |
| AI - Generative    | Gemini 2.0 Flash via @google/genai (conversation starters, summaries) |
| Utilities          | date-fns 3.6 (dates), nuqs (URL state)              |
| Testing            | Vitest 1.3 + Testing Library 14                     |
| Icons              | Lucide React                                       |
| Fonts              | DM Sans (body) + Fraunces (display headings)        |

## Commands

```bash
pnpm dev              # Dev server on :3000 (custom server with Socket.io)
pnpm dev:next         # Dev server without Socket.io (plain Next.js)
pnpm build            # Production build
pnpm start            # Production server (custom server with Socket.io)
pnpm start:next       # Production server without Socket.io
pnpm lint             # ESLint (next/core-web-vitals)
pnpm test             # Vitest
pnpm test:ui          # Vitest with browser UI
pnpm test:coverage    # Vitest with V8 coverage
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run Drizzle migrations
pnpm db:studio        # Open Drizzle Studio (DB admin)
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, register (public routes)
│   ├── (dashboard)/         # Dashboard, explore, messages, meetings, network, profile, user/[userId]
│   ├── (onboarding)/        # Questionnaire wizard
│   ├── api/                 # API routes (auth, calendar, connections, matches, matchmaking, meetings, messages, notifications, profiles, integrations, attendees/search, users/block|report, csrf)
│   ├── layout.tsx           # Root layout (fonts, Toaster)
│   └── globals.css
├── components/
│   ├── auth/                # login-form, register-form
│   ├── dashboard/           # nav, match-card, matches-grid, stats-cards
│   ├── explore/             # explore-container, attendee-card, filter-sidebar
│   ├── meetings/            # meetings-container, meeting-request-modal, availability-view, conflict-badge
│   ├── messages/            # messages-container, conversation-list, chat-window
│   ├── network/             # network-container, network-graph (D3)
│   ├── notifications/       # notification-bell, notification-list
│   ├── profile/             # profile-form
│   ├── questionnaire/       # wizard, question-card, progress-bar, inputs/*
│   └── ui/                  # shadcn components (button, card, dialog, toast, etc.)
├── db/
│   ├── index.ts             # Drizzle client (defined but not used for queries)
│   └── schema.ts            # Drizzle schema for documentation (all 12 tables)
├── lib/
│   ├── ai/                  # Provider abstraction: types.ts, provider-factory.ts, openai-provider.ts, vertex-provider.ts, embeddings.ts, matching.ts, generative.ts
│   ├── auth/                # middleware.ts (route protection, session helpers)
│   ├── auth.ts              # JWT, bcrypt, cookies, validation
│   ├── cache.ts             # MemoryCache with TTL
│   ├── integrations/        # google-meet.ts (Meet + Calendar read), microsoft-teams.ts (Teams + Outlook read)
│   ├── matching/            # matching-service.ts, market-basket-analysis.ts
│   ├── notifications/       # notification-service.ts (emits Socket.io events)
│   ├── socket/              # Socket.io server: types, index, auth-middleware, message-handlers, presence-handlers, client (useSocket hook)
│   ├── security/            # rateLimit.ts, csrf.ts, contentModeration.ts
│   ├── stores/              # Zustand stores (users, questionnaire, connections, meetings, notifications)
│   ├── supabase/            # client.ts (supabase + supabaseAdmin)
│   ├── utils.ts             # cn(), formatDate, formatRelativeTime, generateId, etc.
│   ├── validations.ts       # Zod schemas (login, register, message, profileUpdate)
│   ├── validation/          # schemas.ts (profile, meeting, search, calendar Zod schemas)
│   └── questionnaire-data.ts
├── types/
│   ├── index.ts             # Domain types (User, Match, Connection, Message, Meeting, CalendarEvent, FreeBusySlot, etc.)
│   ├── api.ts               # Request/response types
│   └── database.ts          # Supabase row/insert/update types
└── __tests__/               # Integration tests (+ co-located *.test.ts in lib/)
```

## Architecture Patterns

### Data Persistence (Hybrid)
The app uses a **dual-storage model**: in-memory Maps for fast demo/dev mode, with Supabase PostgreSQL for production persistence. API routes try in-memory first, then fall back to Supabase. This lets the app work without a database configured.

All database queries use the raw Supabase client (`supabaseAdmin.from()`). Drizzle ORM is installed and has a complete schema at `src/db/schema.ts`, but the Drizzle query client is **not used** — the schema serves as documentation of the database structure.

### Authentication
- JWT access token (15 min) + refresh token (7 days), stored in httpOnly cookies
- `getSession()` in `src/lib/auth.ts` for server-side session checks
- `authenticateRequest()` in `src/lib/auth/middleware.ts` for API route protection
- Falls back to `device_id` cookie for anonymous/demo usage
- Password requirements: 8+ chars, uppercase, lowercase, number

### AI Provider Abstraction
`src/lib/ai/` uses a provider pattern for swappable AI backends:
- `AI_PROVIDER` env var selects `"openai"` (default) or `"vertex"`
- `getEmbeddingProvider()` and `getGenerativeProvider()` factory functions in `provider-factory.ts`
- Both providers target the same embedding dimensions (configurable via `EMBEDDING_DIMENSIONS`, default 768)
- Generative AI (Gemini) is only available with Vertex provider; falls back to algorithmic generation with OpenAI

### Matching Engine
Two match types computed by market basket analysis in `src/lib/matching/`:
- **High-affinity** — shared experiences, challenges, interests (60% weight)
- **Strategic** — complementary expertise for growth (40% weight)
- Conversation starters: AI-generated via Gemini when available, algorithmic fallback otherwise
- Enforces diversity (prevents echo chambers)

### Calendar Integrations
`src/lib/integrations/` provides read/write access to Google Calendar and Outlook Calendar:
- **OAuth flows** via `/api/integrations/{google,microsoft}/{connect,callback}` routes
- **Write:** `createGoogleMeetMeeting()`, `createTeamsMeeting()` — create meetings with calendar events
- **Read:** `getGoogleCalendarEvents()`, `getOutlookCalendarEvents()` — fetch user's own events with titles
- **Free/Busy:** `getGoogleFreeBusy()`, `getOutlookFreeBusy()` — check availability without exposing details
- **Privacy:** Other users' calendars only expose busy/free slots, never event titles or details
- **API:** `GET /api/calendar?mode={events|availability}` with 3-minute in-memory cache
- **UI:** `AvailabilityView` (day timeline) and `ConflictBadge` (conflict warnings) in meeting request modal; "My Calendar" overlay toggle in meetings calendar view
- Tokens stored in `meeting_integrations` table; Google auto-refreshes expired tokens

### Real-time (Socket.io)
`src/lib/socket/` provides WebSocket-based real-time features via a custom Next.js server (`server.ts`):
- **Auth:** Extracts JWT from httpOnly `auth_token` cookie during handshake; falls back to `device_id`
- **Messaging:** Real-time send/receive via `message:send`/`message:new` events with HTTP POST fallback
- **Typing indicators:** `message:typing` events broadcast to conversation rooms
- **Notifications:** `notification:new` pushed from `notification-service.ts` via Socket.io singleton
- **Presence:** Online/offline tracking with multi-tab support
- **Rooms:** `user:{userId}` (notifications), `conversation:{connectionId}` (messages)
- **Client:** `useSocket()` hook in `src/lib/socket/client.ts` — singleton connection shared across components

### API Response Format
All API routes return:
```ts
{ success: boolean; data?: T; error?: string; details?: Record<string, string[]> }
```

### Rate Limiting
In-memory rate limiter in `src/lib/security/rateLimit.ts` with per-endpoint configs:
- Login: 5/15min, Register: 3/hr, Messages: 50/hr, Meetings: 20/hr, Calendar reads: 60/hr

## Code Conventions

### Naming
- **Files/folders:** kebab-case (`match-card.tsx`, `rate-limit.ts`)
- **Variables/functions:** camelCase (`userId`, `getSession`)
- **Types/interfaces:** PascalCase (`UserProfile`, `MatchType`)
- **Constants:** UPPER_SNAKE_CASE (`JWT_SECRET`, `RATE_LIMITS`)
- **Components:** PascalCase (`MatchCard`, `ExploreContainer`)

### Imports
- Use `@/*` path alias for all `src/` imports (e.g., `import { cn } from "@/lib/utils"`)
- Type-only imports: `import type { User } from "@/types"`

### Styling
- Tailwind utility classes with `cn()` helper for conditional merging
- Dark mode via `class` strategy
- Custom brand colors: `navy-*`, `coral-*`, `teal-*` (WCAG AA compliant)
- shadcn/ui CSS variables for semantic colors (background, foreground, primary, etc.)

### Components
- Feature-organized folders under `src/components/`
- UI primitives in `src/components/ui/` (shadcn)
- `"use client"` directive only on interactive components; server components by default

### Error Handling
- Try-catch in all API routes
- Zod `.safeParse()` for input validation
- Status codes: 400 (validation), 401 (auth), 404, 409 (conflict), 429 (rate limit), 500
- Console.error for server-side logging

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=                        # min 32 chars
JWT_REFRESH_SECRET=                # min 32 chars

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# AI Provider (defaults to "openai" if unset)
AI_PROVIDER=openai                 # or "vertex"
EMBEDDING_DIMENSIONS=768           # shared between providers
OPENAI_API_KEY=                    # required when AI_PROVIDER=openai
GOOGLE_CLOUD_PROJECT=              # required when AI_PROVIDER=vertex
GOOGLE_CLOUD_LOCATION=us-central1  # GCP region for Vertex AI
GOOGLE_APPLICATION_CREDENTIALS=    # path to GCP service account key JSON

# Calendar Integrations (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/integrations/microsoft/callback
```

## Database

- **Schema:** `src/db/schema.ts` (Drizzle schema for documentation; queries use `supabaseAdmin.from()`)
- **Supabase setup:** see `SUPABASE_SETUP.md` at project root
- **Tables:** users, questionnaire_responses, matches, connections, messages, notifications, notification_preferences, sessions, meeting_requests, scheduled_meetings, meeting_integrations, reports
- **Key patterns:** UUID primary keys, CASCADE deletes, JSONB for questionnaire data and match commonalities
- **pgvector** extension for AI embedding similarity search (via Supabase RPC `match_profiles`)

## Testing

- **Framework:** Vitest with jsdom environment
- **Utilities:** @testing-library/react, @testing-library/jest-dom
- **Config:** `vitest.config.ts` (globals: true, `@` alias)
- **Tests:** `src/__tests__/` and co-located `*.test.ts` files in `src/lib/`
- **Coverage:** V8 provider, HTML reports

## ESLint

- Extends `next/core-web-vitals`
- `prefer-const`: warn
- `react/no-unescaped-entities`: off

## Changelog

- **File:** `CHANGELOG.md` in project root, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format
- **When:** Update the changelog as the final step of every task that modifies source code, configuration, or documentation
- **Where:** Add entries under `## [Unreleased]` using the appropriate subsection: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`
- **Style:** Use concise, imperative-mood descriptions; group related changes into a single bullet; reference file paths or modules when helpful
- **On release/commit:** When changes are committed with a version tag or date-based release, move entries from `[Unreleased]` into a new `## [YYYY-MM-DD]` section
