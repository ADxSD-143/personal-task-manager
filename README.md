# Personal OS

A personal productivity dashboard for tasks, habits, goals, projects, learning plans and coding practice. Browser storage keeps a local cache; Supabase syncs the signed-in user's data across devices.

## Local development

1. Install Node.js 20 or newer.
2. Run `npm ci`.
3. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL Editor.
4. Copy `.env.example` to `.env.local` and fill in the project's URL and anon/publishable key.
5. Run `npm run dev`.

The anon key is intended for browser use. Never put a Supabase service-role key in this app or in GitHub Actions secrets.

## Supabase setup

1. In Supabase, create a project and run the SQL in `supabase/schema.sql`.
2. In **Authentication → Providers**, enable Email/password. Choose whether new accounts require email confirmation.
3. Add your deployed GitHub Pages URL under **Authentication → URL Configuration → Redirect URLs**. Set the Site URL to that URL as well.
4. Copy the project URL and anon/publishable key from **Project Settings → API**.
5. For local work, put those values in `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
6. The first account to sign in from a browser uploads its existing local data if no cloud record exists. Other devices signed in to that same account download the cloud data.

Cloud records are protected by row-level security: each account can access only its own row. Keep the existing JSON export in **Settings → Backup** as an independent backup.

## Deploy to GitHub Pages

1. Push this project to a GitHub repository on the `main` branch.
2. Add repository **Actions secrets** named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, using the values from Supabase.
3. In repository **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
4. Push to `main` or start the **Deploy to GitHub Pages** workflow manually. GitHub will publish the app at `https://<owner>.github.io/<repository>/`.
5. Open that URL on your phone and laptop, create one account, and use the same email/password on both. Bookmark it on a laptop or use the browser's **Add to Home Screen** option on a phone.

The deployment workflow compiles the Supabase URL and anon key into the public browser app, as required for a static site. The database's row-level security policies—not secrecy of the anon key—protect user data.

## Scripts

- `npm run dev` — local development server
- `npm run typecheck` — TypeScript check
- `npm test` — unit tests
- `npm run build` — typecheck and production build
