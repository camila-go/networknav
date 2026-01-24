# Supabase Database Setup for Jynx

Follow these steps to set up your Supabase database for the Jynx application.

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Note down your project URL and API keys from Settings > API

## Step 1: Set Environment Variables

Create a `.env.local` file in your project root with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration (for AI embeddings)
OPENAI_API_KEY=your_openai_api_key

# Optional: Google Meet Integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback

# Optional: Microsoft Teams Integration
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=your_microsoft_tenant_id
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/integrations/microsoft/callback
```

## Step 2: Run SQL Commands

Go to your Supabase Dashboard > SQL Editor > New Query

Run these SQL commands in order:

### A. Enable pgvector Extension

```sql
-- Enable vector extension for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;
```

### B. Create User Profiles Table

```sql
-- Main user profiles table with AI embeddings
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT UNIQUE,
  password_hash TEXT, -- Stores bcrypt hash for login persistence
  name TEXT NOT NULL,
  bio TEXT,
  interests TEXT[],
  location TEXT,
  age INTEGER,
  position TEXT,
  title TEXT,
  company TEXT,
  photo_url TEXT,
  questionnaire_completed BOOLEAN DEFAULT false,
  questionnaire_data JSONB,
  profile_embedding VECTOR(1536),
  is_active BOOLEAN DEFAULT true,
  is_visible BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  blocked_users UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If you already have the table, add the password_hash column:
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index for fast vector similarity search
CREATE INDEX idx_profile_embedding ON user_profiles 
USING ivfflat (profile_embedding vector_cosine_ops)
WITH (lists = 100);

-- Create indexes for common queries
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active) WHERE is_active = true;
```

### C. Create Connections Table

```sql
-- Stores connections between users
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  requester_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast connection lookups
CREATE INDEX idx_connections_requester ON connections(requester_id);
CREATE INDEX idx_connections_recipient ON connections(recipient_id);
CREATE INDEX idx_connections_status ON connections(status);
```

### D. Create Messages Table

```sql
-- Stores chat messages between connected users
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast message lookups
CREATE INDEX idx_messages_connection ON messages(connection_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

### E. Create Matches Table

```sql
-- Stores computed matches between users
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  matched_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, matched_user_id)
);

-- Indexes for fast match lookups
CREATE INDEX idx_matches_user_id ON matches(user_id);
CREATE INDEX idx_matches_score ON matches(similarity_score DESC);
```

### F. Create Meeting Integration Tables

```sql
-- Stores OAuth tokens for Google Meet and Microsoft Teams
CREATE TABLE IF NOT EXISTS meeting_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'microsoft')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Stores scheduled video meetings
CREATE TABLE IF NOT EXISTS scheduled_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  guest_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google_meet', 'teams')),
  meeting_link TEXT NOT NULL,
  meeting_id TEXT,
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduled_meetings_host ON scheduled_meetings(host_user_id);
CREATE INDEX idx_scheduled_meetings_guest ON scheduled_meetings(guest_user_id);
CREATE INDEX idx_scheduled_meetings_time ON scheduled_meetings(start_time);
```

### G. Create Reports Table

```sql
-- User reporting system
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
```

### H. Create Database Functions

```sql
-- Function to find similar profiles using vector similarity
CREATE OR REPLACE FUNCTION match_profiles(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  excluded_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  bio TEXT,
  interests TEXT[],
  location TEXT,
  age INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    user_profiles.id,
    user_profiles.name,
    user_profiles.bio,
    user_profiles.interests,
    user_profiles.location,
    user_profiles.age,
    1 - (user_profiles.profile_embedding <=> query_embedding) AS similarity
  FROM user_profiles
  WHERE user_profiles.id != excluded_user_id
    AND user_profiles.profile_embedding IS NOT NULL
    AND user_profiles.is_active = true
    AND user_profiles.is_visible = true
    AND 1 - (user_profiles.profile_embedding <=> query_embedding) > match_threshold
    AND NOT (excluded_user_id = ANY(user_profiles.blocked_users))
  ORDER BY user_profiles.profile_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to block a user
CREATE OR REPLACE FUNCTION block_user(blocker_id UUID, blocked_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET blocked_users = array_append(blocked_users, blocked_id)
  WHERE id = blocker_id
  AND NOT (blocked_id = ANY(blocked_users));
END;
$$ LANGUAGE plpgsql;

-- Function to unblock a user
CREATE OR REPLACE FUNCTION unblock_user(blocker_id UUID, blocked_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET blocked_users = array_remove(blocked_users, blocked_id)
  WHERE id = blocker_id;
END;
$$ LANGUAGE plpgsql;
```

### I. Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_active = true AND is_visible = true);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Matches Policies
CREATE POLICY "Users view own matches"
  ON matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = matches.user_id
      AND user_id = auth.uid()
    )
  );

-- Meeting Integrations Policies
CREATE POLICY "Users manage own integrations"
  ON meeting_integrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = meeting_integrations.user_id
      AND user_id = auth.uid()
    )
  );

-- Scheduled Meetings Policies
CREATE POLICY "Users see own meetings"
  ON scheduled_meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE (id = scheduled_meetings.host_user_id OR id = scheduled_meetings.guest_user_id)
      AND user_id = auth.uid()
    )
  );

-- Reports Policies
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = reports.reporter_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = reports.reporter_id
      AND user_id = auth.uid()
    )
  );
```

## Step 3: Enable Supabase Authentication

In your Supabase Dashboard:

1. Go to Authentication > Providers
2. Enable Email provider (for email/password signup)
3. Optionally enable OAuth providers (Google, Microsoft)

## Step 4: Test the Setup

After running all SQL commands:

1. Check Tables: Go to Table Editor - you should see all tables created
2. Check Functions: Go to Database > Functions - you should see `match_profiles`, `block_user`, `unblock_user`
3. Check Policies: Go to Authentication > Policies - you should see RLS policies for each table

## API Endpoints

Once configured, these endpoints are available:

### Matchmaking
- `POST /api/matchmaking/update-profile` - Create/update user profile with AI embedding
- `GET /api/matchmaking/get-matches` - Get computed matches for current user
- `POST /api/matchmaking/compute-matches` - Trigger match computation

### Meetings
- `POST /api/meetings/schedule` - Schedule a meeting (requires Google/Microsoft integration)
- `GET /api/meetings/list` - List user's meetings

### Integrations
- `GET /api/integrations/google/connect` - Start Google OAuth flow
- `GET /api/integrations/google/callback` - Handle Google OAuth callback
- `GET /api/integrations/microsoft/connect` - Start Microsoft OAuth flow
- `GET /api/integrations/microsoft/callback` - Handle Microsoft OAuth callback

### User Safety
- `POST /api/users/block` - Block a user
- `DELETE /api/users/block` - Unblock a user
- `GET /api/users/block` - List blocked users
- `POST /api/users/report` - Report a user
- `GET /api/users/report` - List submitted reports

## Troubleshooting

### "Supabase not configured"
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local`
- Restart the development server after adding env vars

### "Profile embedding not found"
- Update your profile first via `POST /api/matchmaking/update-profile`
- Ensure `OPENAI_API_KEY` is set for embedding generation

### "Rate limit exceeded"
- Wait for the rate limit window to reset
- Rate limits: 5 profile updates/hour, 10 match computations/hour

### Vector search not working
- Ensure pgvector extension is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`
- Verify the `idx_profile_embedding` index was created

