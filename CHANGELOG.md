# Changelog

All notable changes to NetworkNav (Jynx) will be documented in this file.

## [Unreleased]

### Added

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
- **Comprehensive test suite** — 483 tests across 27 files
  - Integration tests for auth, messages, notifications, meetings, and matches APIs (`src/__tests__/api/`)
  - Component tests: login form, register form, match card, chat window, notification bell
  - Unit tests: AI embeddings, provider factory, cache, matching service, rate limiting, CSRF, content moderation, validation schemas
  - Test factories (`src/test/factories.ts`) and shared mocks (`src/test/mocks/`)
  - Class-based IntersectionObserver and ResizeObserver mocks for Next.js compatibility
- `CHANGELOG.md` with full project history
- Changelog maintenance rule in `.claude/CLAUDE.md`

### Changed

- Upgraded Vitest from 1.6.1 to 4.0.18 (fix React hooks under pnpm on Windows)
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
- Replaced Geist/Cal Sans fonts with DM Sans (body) and Fraunces (headings)

### Fixed

- Font rendering issues (missing Geist/Cal Sans fonts replaced)
- WCAG AA accessibility: updated color palette with verified contrast ratios (body text 7.5:1, headings 8.2:1)
- Stats cards now show real connection counts instead of hardcoded values
- Match score display corrected to show accurate percentages
