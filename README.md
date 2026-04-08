# Next.js + Vercel + Supabase + shadcn/ui Template

Production-oriented starter template for:

- Next.js App Router
- TypeScript
- Vercel deployment
- Supabase SSR auth setup
- shadcn/ui
- Cursor project rules

## What this template includes

- `src/` layout with App Router
- `proxy.ts` auth/session refresh entrypoint
- Supabase browser + server clients
- env validation with `zod`
- shadcn-style component foundation
- dark mode provider
- CI workflow for lint, typecheck, test, and build
- `.cursor/rules/*.mdc` files for coding guidance
- `AGENTS.md` for repo-wide agent instructions

## Recommended setup

Start with the official Next.js defaults, then layer Supabase and shadcn on top.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in values.

For Vercel, set the same variables in:

- Development
- Preview
- Production

## Scripts

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

## Supabase workflow

Use migrations, not dashboard-only schema edits.

```bash
supabase init
supabase start
supabase migration new init_schema
supabase db push
```

Store SQL in `supabase/migrations/` once you add database changes.

## How to use as a GitHub template

1. Push this repo to GitHub.
2. In GitHub repo settings, enable **Template repository**.
3. Click **Use this template** for new projects.

## What Cursor rules can and cannot do

Cursor rules strongly guide the agent, but they do not replace enforcement.

Use both:

- Cursor rules for generation quality
- ESLint + TypeScript + CI for actual enforcement

## Suggested next steps

- Add real Supabase migrations
- Add your auth screens
- Add Playwright for e2e
- Add Sentry / logging / analytics
- Add RLS policies before shipping protected data
