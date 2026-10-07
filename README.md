# Personal OS

A responsive personal productivity PWA for tasks, habits, workouts/exercises, notes, goals/milestones, projects, learning plans and coding practice. Supabase is the source of truth for signed-in users; browser storage is only a cache/offline copy.

## Local development

1. Install Node.js 22 or newer.
2. Run `npm ci`.
3. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL Editor.
4. Copy `.env.example` to `.env.local` and fill in the project's URL and anon/publishable key.
5. Run `npm run dev`.

The anon key is intended for browser use. Never put a Supabase service-role key in this app or in GitHub Actions secrets.

## Supabase setup

1. In Supabase, create a project and run the SQL in `supabase/schema.sql`.
2. In **Authentication → Providers**, enable Email/password. Choose whether new accounts require email confirmation.
3. Add both `https://<owner>.github.io/<repository>/` and `http://localhost:5173/` under **Authentication → URL Configuration → Redirect URLs**. Set the Site URL to the production URL.
4. Copy the project URL and anon/publishable key from **Project Settings → API**.
5. For local work, put those values in `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
6. The first account to sign in with saved browser data and no cloud record is asked **Local data found** before anything is uploaded. If both local and cloud records exist, choose whether to keep cloud data (the browser copy is backed up) or merge local-only record IDs. Cloud data wins for matching IDs.

`public.user_data` stores the user's complete app snapshot, including nested course/day/video progress, tasks and project links, habits, notes, workouts/exercises, study sessions, coding activity, goals/milestones, categories, tags, profile and settings. The row is keyed to `auth.users.id`; RLS and the compare-and-save RPC ensure a user can only read or write their own data and stale concurrent writes cannot overwrite a newer cloud snapshot. The SQL includes a manual RLS smoke test at `supabase/tests/user_data_rls.test.sql` (run against a disposable/local Supabase database, never against production).

The app listens for Supabase Realtime changes while open on other devices. Offline edits stay in the local cache; when connectivity returns, the app reloads cloud data and asks before resolving a local/cloud conflict. The PWA caches the app shell, not authenticated API responses. Keep the JSON export in **Settings → Backup** as an independent backup.

## Deploy to GitHub Pages

1. Push this project to a GitHub repository on the `main` branch.
2. Add repository **Actions secrets** named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, using the values from Supabase. They are required for a successful deploy.
3. In repository **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
4. Push to `main` or start the **Deploy to GitHub Pages** workflow manually. GitHub will publish the app at `https://<owner>.github.io/<repository>/`.
5. Open that URL on your phone and laptop, create one account, and use the same email/password on both. Bookmark it on a laptop or use the browser's **Add to Home Screen** option on a phone.

The deployment workflow compiles the Supabase URL and anon key into the public browser app, as required for a static site. The database's row-level security policies—not secrecy of the anon key—protect user data.

## Scripts

- `npm run dev` — local development server
- `npm run typecheck` — TypeScript check
- `npm test` — unit tests
- `npm run build` — typecheck and production build
