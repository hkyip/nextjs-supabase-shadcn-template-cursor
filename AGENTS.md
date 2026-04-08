# AGENTS.md

This repository is a production-oriented template.

## Stack

- Next.js App Router
- TypeScript
- Vercel
- Supabase
- shadcn/ui

## Non-negotiable conventions

1. Prefer Server Components by default.
2. Add `"use client"` only when interactivity, browser APIs, or client hooks are required.
3. Use `@/` imports only.
4. Never hardcode secrets.
5. Validate environment variables in `src/lib/env.ts`.
6. Keep database access behind `src/lib/` or server-side modules.
7. Do not call Supabase with service role keys from client code.
8. Use route handlers or server actions for privileged operations.
9. Keep UI components presentational and reusable.
10. Keep business logic out of page files when it grows beyond trivial size.
11. Prefer small, typed helper functions over large files.
12. Add tests for non-trivial logic.
13. Do not bypass lint or type errors to make code "work".
14. When changing auth or schema behavior, update docs and examples.

## Delivery standard

When generating code:

- explain major tradeoffs briefly
- keep diffs small
- avoid unnecessary dependencies
- preserve accessibility
- preserve type safety
- preserve SSR safety
