<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RealLife OS — Agent Instructions

**Har task se pehle `PROJECT.md` padho** — wahan structure, conventions, aur element registry hai.

Detailed rules: `.cursor/rules/` (auto-applied by Cursor).

## Quick reference

- Routes: `page.tsx` + `loading.tsx` + `_components/` (mandatory)
- Shared components → `components/` | Page-only → `_components/`
- Supabase → server-only via `lib/services/` | Client → `lib/api/client.ts` + React Query
- Forms → shadcn + Zod from `schemas/` (shared API + frontend)
- Loading/error → React Query states only, never `useState`
- Button API calls → `useMutation` + global `<GlobalSpinner />` (no inline "Loading..." text)
- Har change ke baad → `PROJECT.md` update karo
