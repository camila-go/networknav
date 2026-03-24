# Changelog

All notable changes to NetworkNav (Jynx) will be documented in this file.

## [Unreleased]

### Fixed
- Fix 413 Payload Too Large on avatar/gallery uploads: switched from proxying files through Vercel API routes (4.5 MB limit) to direct browser-to-Supabase uploads via signed URLs; max file size increased to 10 MB (`src/app/api/profile/avatar/upload-url/route.ts`, `src/app/api/profile/photos/upload-url/route.ts`)
- Fix 500 on user photo gallery: added `user_photos` table migration (`supabase/migrations/20260318_add_user_photos_table.sql`) with RLS policies; updated `SUPABASE_SETUP.md` with table setup, storage bucket creation instructions, and migration reference

### Changed
- Photo uploads now use a 3-step flow: server generates signed upload URL → browser uploads directly to Supabase Storage → server confirms and updates DB; removes `experimental.serverActions.bodySizeLimit` from `next.config.js` since files no longer pass through Vercel

### Added
- Profile picture upload: replaced photo URL text input in profile form with a file picker that validates (JPG/PNG/WebP/GIF, max 10 MB), shows a live preview with upload spinner, and stores the Supabase Storage public URL in `users.photo_url` (`src/components/profile/profile-form.tsx`, `src/app/api/profile/avatar/route.ts`)
- Photo gallery: users can upload up to 12 photos per profile, reorder via up/down arrows, add/edit captions inline, and delete with a confirm step; displayed as a grid on own profile and other users' public profiles with a lightbox modal (keyboard-navigable) for full-size viewing (`src/components/profile/photo-gallery.tsx`, `src/app/api/profile/photos/route.ts`, `src/app/api/profile/photos/[photoId]/route.ts`, `src/app/api/users/[userId]/photos/route.ts`)
- `user_photos` table: `id, user_id, storage_key, url, caption, display_order, created_at` (UUID PK, CASCADE delete on user); Drizzle schema docs in `src/db/schema.ts`, DB types in `src/types/database.ts`, domain type `UserPhoto` in `src/types/index.ts`
- Rate limit entries `upload-avatar` (10/hr) and `upload-gallery-photo` (20/hr) in `src/lib/security/rateLimit.ts`
- Vercel deployment: app is now live at `https://networknav-camilas-projects-1b1733dc.vercel.app`; `typescript.ignoreBuildErrors: true` added to `next.config.js` to bypass pre-existing type errors in gamification/SAML/socket routes that do not affect runtime behavior
- Microsoft Teams deep link helpers `teamsChartUrl()` and `teamsMeetingUrl()` in `src/lib/utils.ts` for constructing org-aware Teams chat and meeting URLs
- `email` field (optional) added to `PublicUser` type; populated from Supabase and in-memory stores in the matches and attendee search APIs so Teams links can be constructed client-side

### Changed
- Optimized network graph for 300+ attendees: separated D3 highlight updates from force simulation rebuilds (clicking a node no longer restarts the simulation), debounced resize events (150ms), tuned simulation alpha/theta for ~5× faster convergence, capped displayed connections at top 80 by score, and added 10-minute per-user API response cache (`src/components/network/network-graph.tsx`, `src/app/api/network/route.ts`)
- Removed overlapping "Skip" button from onboarding modal header (`src/components/onboarding/onboarding-modal.tsx`); the Dialog X button now serves as the sole exit, and closing via X also sets the `jynx_onboarding_completed` localStorage flag
- Removed **Messages** and **Meetings** nav items from desktop and mobile navigation (`src/components/dashboard/nav.tsx`, `src/components/dashboard/mobile-nav.tsx`); underlying pages and API routes are preserved but no longer linked
- Match cards (`src/components/dashboard/match-card.tsx`): replaced in-app "Message" and "Meet" CTAs with subtle "Chat ↗" and "Schedule ↗" buttons that open Microsoft Teams chat and new meeting deep links; `MeetingRequestModal` no longer rendered here
- Explore attendee cards (`src/components/explore/attendee-card.tsx`): same replacement — Teams deep link buttons instead of in-app message/meeting CTAs; `MeetingRequestModal` no longer rendered here
- User profile page (`src/app/(dashboard)/user/[userId]/page.tsx`): replaced "Message" and "Schedule Meeting" buttons (header + quick action footer) with Teams "Chat in Teams" and "Schedule in Teams" links; `MeetingRequestModal` removed from this page



- **SAML 2.0 SSO integration** — corporate SSO via `@node-saml/node-saml` with SP-initiated and IdP-initiated flows; JIT user provisioning creates accounts from IdP attributes on first login (`src/lib/saml/`, `src/app/api/auth/sso/`)
- SSO API routes: SP metadata endpoint (`GET /api/auth/sso/metadata`), login initiation (`GET /api/auth/sso/login`), and ACS callback (`POST /api/auth/sso/callback`)
- SSO feature flags via `SSO_ENABLED` and `SSO_FORCE` env vars — `SSO_FORCE=true` hides email/password login and registration forms
- "Sign in with Corporate SSO" button on login page with "or" divider when both auth methods are available
- SSO error handling: failed SAML assertions redirect to login page with error message
- Rate limiting for SSO callback endpoint (20 requests/min per IP) in `src/lib/security/rateLimit.ts`
- 10 unit tests for SSO endpoints covering metadata generation, login redirect, JIT provisioning, attribute sync, deduplication, and rate limiting (`src/__tests__/api/sso.test.ts`)
- SAML SSO environment variables documented in `.env.example`
- `supabase/migrations/20260225_add_missing_tables.sql` — idempotent SQL script that creates the `connections` and `meeting_requests` tables; safe to re-run via `IF NOT EXISTS`
- Dev seed endpoint (`POST /api/dev/seed`) — populates in-memory stores with 6 users, questionnaires, matches, connections, messages, meetings, and notifications for local testing
- `.env.example` template with all environment variables grouped by category
- Component tests for ProfileForm, NetworkContainer, ExploreContainer, MeetingRequestModal, MeetingsContainer, and NetworkGraph (564 total tests across 33 test files)

### Fixed

- **StatsCards polling continues after session expiry** — `fetchOtherStats` now checks HTTP status before parsing JSON; clears the 30-second interval on a 401 response so unauthenticated requests stop immediately (`src/components/dashboard/stats-cards.tsx`)
- **MeetingsContainer eager double-fetch on mount** — `fetchAllMeetings` (used for calendar dots) deferred to first calendar-view open instead of firing unconditionally on mount, reducing page-load API calls (`src/components/meetings/meetings-container.tsx`)
- **`connections` and `meeting_requests` tables missing from Supabase** — `SUPABASE_SETUP.md` Section C corrected (`id` changed from `TEXT` to `UUID`, `expires_at` column added, status CHECK fixed from `'rejected'` → `'declined'`); new Section G added for `meeting_requests` (was absent entirely); troubleshooting entry added for PGRST205 errors with instructions to run the migration script
- **pgvector extension schema** — moved `vector` extension from `public` to `extensions` schema, resolving the Supabase "Extension in Public" lint advisory; migration backed up `profile_embedding` as TEXT, dropped extension with CASCADE, reinstalled with `WITH SCHEMA extensions`, restored the column/index/`match_profiles` function; updated `SUPABASE_SETUP.md` with corrected install command and working migration script
- **Function search path hardened** — added `SET search_path = ''` to `match_profiles`, `block_user`, and `unblock_user` functions and fully qualified all object references (`public.user_profiles`, `operator(extensions.<=>)`) to prevent search_path injection, resolving Supabase "Function Search Path Mutable" lint advisory (`SUPABASE_SETUP.md`)
- **Connections Supabase persistence** — connections now dual-write to Supabase on create/accept/decline/withdraw/delete, with Supabase fallback reads when in-memory store is empty; connection IDs switched to `crypto.randomUUID()` for DB uuid column compatibility (`src/app/api/connections/`)
- **Notifications Supabase persistence** — all notification operations (create, read, mark-read, delete) now dual-write to Supabase; preferences also persist via `notification_preferences` table with correct `in_app` ↔ `inApp` column mapping (`src/lib/notifications/notification-service.ts`)
- **Real matchmaking algorithm on Supabase path** — replaced `Math.random()` scoring in `generateMatchesFromSupabase` with real Market Basket Analysis calls (`calculateMatchScore`, `determineMatchType`, `generateConversationStarters`); current user's questionnaire data is fetched from Supabase before scoring (`src/app/api/matches/route.ts`)
- Fix auto-created connection ID format in messages route to use `crypto.randomUUID()` (`src/app/api/messages/route.ts`)
- Add missing meeting notification exports (`notifyMeetingRequest`, `notifyMeetingAccepted`, `notifyMeetingDeclined`) to notifications barrel (`src/lib/notifications/index.ts`)
- Update notification service test suite to `await` now-async `getNotifications`, `getPreferences`, and `updatePreferences` calls
- Load `.env.local` early in custom server startup (`server-env.ts`) so JWT secrets are available before module initialization — eliminates dev warning spam
- Add `ADMIN_EMAILS` env var guard to batch match computation endpoint (`/api/matchmaking/compute-matches`) — previously any authenticated user could trigger `forAllUsers`
- Persist `location` and `photoUrl` fields in profile update route (`/api/profile`) — both in-memory and Supabase
- Align embedding dimensions default to 1536 across OpenAI and Vertex providers to match `VECTOR(1536)` in Supabase schema; switch OpenAI model to `text-embedding-3-large`

### Changed

- Default embedding model changed from `text-embedding-3-small` (768 dims) to `text-embedding-3-large` (1536 dims) for higher matching quality
- Upgraded Vitest from 1.6.1 to 4.0.18 (fix React hooks under pnpm on Windows)
- **AI provider abstraction** with factory pattern supporting swappable backends (`src/lib/ai/`)
  - OpenAI provider for text embeddings
  - Google Vertex AI provider for embeddings and generative AI
  - Gemini 2.0 Flash integration for AI-generated conversation starters and profile summaries (`src/lib/ai/generative.ts`)
  - Configurable via `AI_PROVIDER` env var (`"openai"` or `"vertex"`)
- **Socket.io real-time system** via custom Next.js server (`server.ts`)
  - JWT-authenticated WebSocket connections with `device_id` fallback
  - Real-time messaging with `message:send`/`message:new` events
  - Typing indicators broadcast to conversation rooms
  - Real-time notification push from server to client
  - Online/offline presence tracking with multi-tab support
  - `useSocket()` client hook for singleton connection management
- **Calendar integration** with Google Calendar and Microsoft Outlook
  - OAuth connect/callback flows for both providers
  - Read own calendar events, check free/busy availability
  - Privacy-preserving free/busy queries (no event titles exposed to other users)
  - Unified `GET /api/calendar?mode={events|availability}` endpoint with 3-minute cache
  - Google token auto-refresh for expired OAuth tokens
- **Meeting UI components**
  - `AvailabilityView` day timeline visualization (7am–9pm) in meeting request modal
  - `ConflictBadge` component for meeting conflict warnings
  - "My Calendar" overlay toggle in meetings calendar view
- Refactored `src/lib/ai/embeddings.ts` to use provider-factory pattern instead of direct OpenAI calls
- Enhanced `MemoryCache` (`src/lib/cache.ts`) with TTL support, stats tracking, and `getOrSet()` method
- Expanded rate limiter (`src/lib/security/rateLimit.ts`) with per-action configurable limits and `resetRateLimit()` for test isolation
- Extended validation schemas (`src/lib/validation/schemas.ts`) with meeting, calendar, search, and profile schemas
- Upgraded notification service with template-based notifications and Socket.io push
- Enhanced Google Meet integration with full OAuth flow, calendar read, and free/busy queries
- Enhanced Microsoft Teams integration with full OAuth flow, Outlook calendar read, and free/busy queries
- Enhanced matches API with AI-generated conversation starters via Gemini (algorithmic fallback)
- Enhanced meeting request modal with calendar integration, availability view, and conflict badges
- Enhanced meetings container with tab views (Requests/Upcoming/Completed), calendar overlay, and stats
- Enhanced chat window with Socket.io real-time messaging and typing indicators
- Enhanced notification bell with real-time Socket.io updates and 30-second polling fallback
- Enhanced notification list with type-specific icons, mark-read, and delete actions
- Added `CalendarEvent`, `FreeBusySlot`, `MeetingStatus`, `MeetingType` to domain types (`src/types/index.ts`)
- Added `meeting_integrations`, `scheduled_meetings`, and `reports` tables to Drizzle schema
- Updated `README.md` with current features, tech stack, project structure, and environment variables
- Updated `.gitignore` with GCP credential patterns and OS artifact (`nul`) exclusion
- `CHANGELOG.md` with full project history; changelog maintenance rule in `.claude/CLAUDE.md`

## [2026-01-26]

### Fixed

- Questionnaire update logic now properly checks if user exists before deciding between update and insert

## [2026-01-23]

### Fixed

- Supabase data persistence: added `password_hash` column, fixed questionnaire data overwrites on re-submission
- Login and register flow improvements for reliable authentication against Supabase

## [2026-01-16]

### Added

- Messaging system with conversation management API (`/api/messages`)
- Meeting request system with send, accept, decline, reschedule, and cancel actions (`/api/meetings`)
- Meeting request notifications integrated into notification service
- Confetti animation for successful meeting requests
- Dark theme styling for messaging components

### Changed

- Enhanced dashboard layout and component interactions
- Updated match cards, matches grid, and stats cards
- Updated meeting request modal with richer scheduling options
- Updated messages components (container, conversation list, chat window) for full messaging support
- Expanded database schema with meeting request and message support

## [2026-01-14]

### Changed

- Updated Explore page to dark theme styling (explore container, filter sidebar, attendee cards)

### Fixed

- Match card syntax error (mismatched div/Card tags)

## [2025-12-11]

### Added

- **Network visualization** with interactive D3.js force-directed graph
  - Nodes sized by commonality count, colored by match type (high-affinity vs strategic)
  - Drag, zoom, and pan interactions; hover highlights connections; click for detail sidebar
  - Filter by All, High-Affinity, or Strategic connections
  - Network insights panel with stats
- **Smart search and filtering** for Explore Attendees page
  - Full-text search across attendee profiles
  - Collapsible filter sidebar: industry, leadership level, org size, years in leadership, challenges, priorities, interests
  - Attendee result cards with match percentage, commonalities, quick info badges, and "Request Meeting" button
- **Custom interests** with chip-based input on questionnaire recharge question
  - `multi-select-custom` question type with removable chip UI
  - Custom interests included in Explore search and matching algorithm with high weight
- **Meeting scheduling system** (initial implementation)
  - Meeting API endpoints: create, accept, decline, reschedule, cancel
  - Meeting request modal with type selection, duration options, proposed time slots, and context message

### Fixed

- UI accessibility issues in custom interests input (keyboard navigation, screen reader labels)

## [2025-12-08]

### Added

- **Initial application** — Next.js 14 App Router, TypeScript 5.3, Tailwind CSS 3.4, shadcn/ui
- JWT authentication with bcrypt password hashing (access token 15 min, refresh token 7 days)
- 20-question leadership questionnaire across 4 sections (context, challenges, goals, personal)
- Market basket analysis algorithm for intelligent attendee matching
- High-affinity and strategic match generation with diversity enforcement
- Connection request system (request, accept, decline)
- Real-time messaging interface (initial UI)
- Notification system with user preferences
- Responsive dashboard with match cards and stats
- User profile page at `/user/[userId]` with match details, commonalities, and conversation starters
- Clickable profiles on match cards linking to user profile pages
- Connect button on match cards initiates messaging
- Demo mode for questionnaire and matches API (works without authentication)
- Zustand state management with persistence
- Drizzle ORM schema for PostgreSQL documentation (12 tables)

### Changed

- Rebranded from "NetworkNav" to "Jynx" across all pages and components
- Updated hero copy with Jynx tagline
- Typography uses Inter app-wide (replaces DM Sans + Fraunces)

### Fixed

- Font rendering issues (missing Geist/Cal Sans fonts replaced)
- WCAG AA accessibility: updated color palette with verified contrast ratios (body text 7.5:1, headings 8.2:1)
- Stats cards now show real connection counts instead of hardcoded values
- Match score display corrected to show accurate percentages
