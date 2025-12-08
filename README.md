# NetworkNav - Leadership Conference Networking App

A Next.js application that leverages market basket analysis to intelligently match leadership conference attendees for meaningful professional networking.

## Features

- **Intelligent Matching**: Uses market basket analysis algorithms to identify high-affinity and strategic connections
- **Leadership-Focused Questionnaire**: 20 carefully crafted questions across 4 sections to capture leadership context, challenges, interests, and style
- **Dual Match Types**: 
  - High-Affinity Matches: Leaders with shared experiences and challenges
  - Strategic Matches: Leaders with complementary expertise for growth
- **Real-time Messaging**: Connect and communicate with your matches
- **Conference-Optimized**: Designed for pre-event, during-event, and post-event networking

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI + Radix UI
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with bcrypt
- **State Management**: Zustand
- **Testing**: Vitest + Testing Library
- **Real-time**: Socket.io (for messaging)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd networknav
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/networknav
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run database migrations:
```bash
pnpm db:generate
pnpm db:migrate
```

5. Start the development server:
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Development

### Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test         # Run tests
pnpm test:ui      # Run tests with UI
pnpm test:coverage # Run tests with coverage
pnpm db:generate  # Generate database migrations
pnpm db:migrate   # Run database migrations
pnpm db:studio    # Open Drizzle Studio
```

### Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/
│   └── ui/             # Shadcn UI components
├── db/                 # Database schema and configuration
├── lib/                # Utility functions and data
├── test/               # Test setup and utilities
└── types/              # TypeScript type definitions
```

## Questionnaire Structure

The app includes a 20-question leadership questionnaire across 4 sections:

1. **Your Leadership Context** (4 questions) - Industry, experience, level, org size
2. **What You're Building & Solving** (4 questions) - Priorities, challenges, growth areas, goals
3. **Beyond the Boardroom** (6 questions) - Hobbies, interests, lifestyle
4. **Your Leadership Style** (6 questions) - Philosophy, decision-making, values

## License

MIT

