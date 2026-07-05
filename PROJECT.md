# RealLife OS — Project Definition & Status

> **Agent rule:** Har meaningful change ke baad is file ko update karo. Naya prompt aane par pehle yahan se context lo — kya hai, kyun hai, kahan use hua, kaise kaam karta hai.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Forms | shadcn Form + react-hook-form |
| Validation | Zod (shared API + frontend) |
| Data | Supabase (server-only) |
| Client data | TanStack React Query |
| Types | Supabase generated types |

---

## Folder Structure

```
reallife-os/
├── app/
│   ├── (auth)/                    # Auth routes (login, sign-up, etc.)
│   │   └── [route]/
│   │       ├── page.tsx           # Server Component — initial data fetch
│   │       ├── loading.tsx        # REQUIRED per route
│   │       └── _components/       # Page-only components (not reusable elsewhere)
│   ├── (protected)/               # Authenticated routes
│   ├── (public)/                  # Public routes
│   ├── api/                       # API routes — thin handlers only
│   │   └── [resource]/
│   │       └── route.ts           # Calls lib/services/* functions
│   ├── layout.tsx
│   └── globals.css
│
├── components/                    # Shared / reusable components
│   ├── ui/                        # shadcn primitives (Button, Input, Form, etc.)
│   ├── feedback/                  # ErrorAlert, WarningAlert, etc.
│   └── providers/                 # QueryProvider, etc.
│
├── schemas/                       # ALL Zod schemas — single source of truth
│   ├── generic/                   # Reusable field validators (name, email, empty string, number)
│   └── [feature]/                 # Feature-specific schemas (compose from generic/)
│
├── lib/
│   ├── services/                  # Business logic + Supabase queries (reusable)
│   ├── api/                       # Generic fetch client for React Query (client-side)
│   ├── supabase/
│   │   ├── server.ts              # Server Supabase client (API + RSC only)
│   │   └── admin.ts               # Service role (server only, if needed)
│   ├── query/                     # Query keys factory + query/mutation hooks
│   └── utils.ts
│
├── types/
│   └── supabase.ts                # Generated Supabase Database types
│
├── .cursor/rules/                 # Cursor agent rules
├── PROJECT.md                     # This file
└── AGENTS.md
```

---

## Conventions

### Routes
- Har route folder mein **page.tsx**, **loading.tsx**, aur **_components/** zaroori hai.
- `page.tsx` hamesha **Server Component** — initial data yahi fetch hota hai.
- `_components/` sirf us route ke liye; agar doosri jagah bhi chahiye → `components/` mein move karo.

### Components
- Reuse possible ho → `components/` (root).
- Sirf ek page, aur future mein reuse nahi → `app/.../ _components/`.
- Pehle `_components/` mein banao; reuse hua to promote karo.

### Data Flow
```
page.tsx (RSC fetch via lib/services)
    → pass initialData to client wrapper
    → React Query (useQuery with initialData)
    → mutations via useMutation + lib/api fetch client
    → API route → lib/services → Supabase
```

### Supabase
- **Kabhi client-side nahi** — sirf `lib/supabase/server.ts` se API routes aur Server Components mein.
- Types hamesha `types/supabase.ts` se; frontend keys DB columns se match karein.

### Forms & Validation
- Forms: shadcn `<Form>` + react-hook-form.
- Schema: `schemas/` — API route aur frontend dono same schema use karein.
- Generic validators: `schemas/generic/` (e.g. `nonEmptyString`, `positiveNumber`, `personName`).

### Loading & Errors
- Loading/error **kabhi useState se nahi** — sirf React Query (`isPending`, `isError`, `error`).
- Button-triggered API calls → `useMutation` + `apiClient`; global `<GlobalSpinner />` root mein auto (via `QueryProvider` / `useIsMutating`). Button par inline loading text mat lagao.
- Generic `<ErrorAlert />` / `<WarningAlert />` in `components/feedback/` — error object pass karo.

---

## Element Registry

> Har naya module, component, service, schema, ya API yahan register karo.

### Routes

| Route | Purpose | page.tsx | loading.tsx | _components | Status |
|-------|---------|----------|-------------|-------------|--------|
| `/` | Home / landing | `app/page.tsx` | — (add when refactored) | — | 🟡 placeholder |
| `/login` | User login | `app/(auth)/login/page.tsx` | `app/(auth)/login/loading.tsx` | `login-form` | ✅ ready |
| `/sign-up` | Registration | — | — | — | ⚪ not started |
| `/forget-password` | Password reset request | — | — | — | ⚪ not started |
| `/change-password` | Password change | — | — | — | ⚪ not started |

### Shared Components

| Component | Path | Purpose | Used In | Status |
|-----------|------|---------|---------|--------|
| Button | `components/ui/button.tsx` | shadcn button | global | ✅ ready |
| Card | `components/ui/card.tsx` | shadcn card | global | ✅ ready |
| Input | `components/ui/input.tsx` | shadcn input + icon slots + brand styling | auth forms | ✅ ready |
| Label | `components/ui/label.tsx` | shadcn label | forms | ✅ ready |
| Field | `components/ui/field.tsx` | shadcn field group + errors | forms | ✅ ready |
| Skeleton | `components/ui/skeleton.tsx` | Loading placeholder | loading states | ✅ ready |
| Spinner | `components/feedback/spinner.tsx` | Brand dual-ring spinner | global overlay | ✅ ready |
| GlobalSpinner | `components/feedback/global-spinner.tsx` | Full-screen mutation loader | root via QueryProvider | ✅ ready |
| ErrorAlert | `components/feedback/error-alert.tsx` | Generic error display | — | ⚪ not started |
| QueryProvider | `components/providers/query-provider.tsx` | React Query context | root layout | ✅ ready |

### Services (`lib/services/`)

| Service | File | Purpose | Called From | Status |
|---------|------|---------|-------------|--------|
| loginUser | `lib/services/auth/login.ts` | Stub login — returns success | `/api/auth/login` | ✅ ready (stub) |

### API Routes (`app/api/`)

| Endpoint | Method | Service | Schema | Status |
|----------|--------|---------|--------|--------|
| `/api/auth/login` | POST | `loginUser` | `loginSchema` | ✅ ready (stub) |

### Schemas (`schemas/`)

| Schema | File | Used In | Status |
|--------|------|---------|--------|
| `loginSchema` | `schemas/auth/login.ts` | Login form + `/api/auth/login` | ✅ ready |

### Generic Validators (`schemas/generic/`)

| Validator | Purpose | Status |
|-----------|---------|--------|
| `emailField` | Email format + required | ✅ ready |
| `passwordField` | Min 8 chars + required | ✅ ready |
| `nonEmptyString` | Trim + min 1 char | ⚪ not started |
| `personName` | Name fields | ⚪ not started |
| `positiveNumber` | Numeric fields > 0 | ⚪ not started |

---

## Changelog

| Date | Change | Updated By |
|------|--------|------------|
| 2026-07-05 | Global Spinner + MutationSpinner in QueryProvider; react-query loading rules | Agent |
| 2026-07-05 | Brand CSS tokens in `globals.css`; login page + API stub; shadcn Input/Field; QueryProvider | Agent |
| 2026-07-05 | Initial PROJECT.md + Cursor rules created | Agent |

---

## Status Legend

- ✅ ready / complete
- 🟡 in progress / placeholder
- ⚪ not started
- 🔴 blocked / needs attention
