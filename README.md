# Family — العائلة

**Private bilingual (Arabic / English) shared expense tracker** for the Alghamdi family. Email/password authentication; invite-only access.

## What is Family?

Family helps members track shared expenses transparently — rent, setup costs, monthly operating, and worker salary. Every expense requires a receipt. The dashboard shows who has paid in, who owes the group, and how much each member needs to contribute monthly to cover the next rent payment.

Fully bilingual: Arabic (RTL, default) and English (LTR). Switch from the sidebar or login screen.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| UI | Tailwind CSS v3 + shadcn/ui |
| Auth | Supabase Auth (email + password) |
| Data | Supabase (Postgres + Storage), RLS-protected |
| Routing | Wouter (hash-based SPA) |
| Forms | React Hook Form + Zod |
| i18n | Custom context (Arabic default, RTL) |
| Deploy | Vercel (static SPA) |

---

## Running Locally

```bash
git clone https://github.com/raidalghamdi/alghamdi-family.git
cd alghamdi-family
npm install

# Configure environment
cp .env.example .env.local    # or create .env.local
# Required keys:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
#   VITE_APP_NAME=Family

npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe in the browser, RLS enforced) |
| `VITE_APP_NAME` | Display name (defaults to `Family`) |

---

## Authentication

Sign-in only — there is **no public sign-up**. Members are added by the Family Patriarch directly in the Supabase Auth dashboard. After login the app derives the current member from `user_metadata.member_name` (falling back to the email local-part).

---

## Building for Production

```bash
npm run build
# Output: dist/
```

---

## Deployment

Vercel (static SPA). Push to `main` and Vercel auto-deploys.
