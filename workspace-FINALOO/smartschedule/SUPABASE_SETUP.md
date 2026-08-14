# SmartSchedule Supabase setup

The app is already connected to the configured Supabase project through `.env.local`.

## 1. Create the database schema

1. Open the Supabase project dashboard.
2. Go to **SQL Editor** → **New query**.
3. Open `supabase-schema.sql` from this project.
4. Copy the entire file into the editor and select **Run**.

This creates:

- `profiles` — authenticated user profile and scheduling preferences
- `schedule_items` — tasks, events, availability, deadlines, priorities, durations, and completion state
- Row Level Security policies so every user can access only their own rows
- A trigger that creates a profile from Supabase Auth sign-up metadata

## 2. Configure authentication URLs

In Supabase Dashboard, open **Authentication** → **URL Configuration**.

- Set **Site URL** to the production application URL.
- Add the local/development URL and Arena live-preview URL to **Redirect URLs** when testing.
- Password reset and email confirmation links use these allowed redirect URLs.

## 3. Email authentication

Email/password authentication is enabled in the connected project. Email confirmation is currently required by the project settings. New users must select the confirmation link before signing in.

## 4. Environment variables

The app uses:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Only use a **publishable** or legacy **anon** key in the frontend. Never put the `service_role` key in a Vite environment variable.

## 5. Run the app

```bash
npm install
npm run dev
```

## Data behavior

- Supabase Auth manages registration, login, sessions, email confirmation, and password recovery.
- Profile changes are written to `profiles`.
- Schedule changes are debounced and synchronized to `schedule_items`.
- A browser cache is retained only as an offline fallback; Supabase is the primary source after sign-in.
- The top navigation displays `Saved to Supabase`, `Saving…`, or `Sync issue`.
