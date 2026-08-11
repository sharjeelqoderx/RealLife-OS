# RealLife OS — Project Definition & Status

> **Agent rule:** Har meaningful change ke baad is file ko update karo. Naya prompt aane par pehle yahan se context lo — kya hai, kyun hai, kahan use hua, kaise kaam karta hai.
>
> **Hamesha sync:** `Tech Stack` (packages + versions), `Folder Structure`, Element Registry, aur Changelog — yeh sections optional nahi; har relevant change ke baad update zaroori hai.

---

## Tech Stack

> **Mandatory:** Yeh section hamesha sync rakho — naya framework/lib add ho ya major version badle to yahan + `package.json` dono update karo.

| Layer | Choice | Packages |
|-------|--------|----------|
| Framework | Next.js 16 (App Router) | `next@16.2.10` |
| UI runtime | React 19 | `react@19.2.4`, `react-dom@19.2.4` |
| Language | TypeScript (strict) | `typescript@^5`, `@types/node`, `@types/react`, `@types/react-dom` |
| Styling | Tailwind CSS v4 + animate | `tailwindcss@^4`, `@tailwindcss/postcss@^4`, `tw-animate-css` |
| UI kit | shadcn/ui + Radix | `shadcn`, `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` |
| Forms | shadcn Form + RHF | `react-hook-form`, `@hookform/resolvers` |
| Validation | Zod (shared API + frontend) | `zod@^4` |
| Auth / DB | Supabase (server-only) | `@supabase/supabase-js`, `@supabase/ssr` |
| Client data | TanStack React Query | `@tanstack/react-query@^5` |
| Payments | Stripe (server) | `stripe` |
| Charts | Recharts (billing/dashboard) | `recharts` |
| Lint | ESLint + Next config | `eslint`, `eslint-config-next@16.2.10` |
| Types | Supabase generated | `types/supabase.ts` |

### Package inventory (`package.json`)

**Dependencies**

| Package | Role |
|---------|------|
| `next` | App Router framework |
| `react` / `react-dom` | UI runtime |
| `@supabase/ssr` / `@supabase/supabase-js` | Auth + DB (server) |
| `@tanstack/react-query` | Client cache / mutations |
| `zod` | Shared schemas |
| `react-hook-form` / `@hookform/resolvers` | Forms |
| `stripe` | Billing / webhooks |
| `shadcn` / `radix-ui` | Component primitives |
| `class-variance-authority` / `clsx` / `tailwind-merge` | Variant + class utils |
| `lucide-react` | Icons |
| `recharts` | Charts |
| `tw-animate-css` | CSS animations |

**DevDependencies**

| Package | Role |
|---------|------|
| `typescript` | Types |
| `tailwindcss` / `@tailwindcss/postcss` | Styling pipeline |
| `eslint` / `eslint-config-next` | Lint |
| `@types/node` / `@types/react` / `@types/react-dom` | TS defs |

Source of truth for exact versions: root `package.json`. Jab package add/remove/upgrade ho → is section ko sync karo.

---

## Folder Structure

> **Mandatory:** Naya top-level folder, route group, `lib/*` domain, ya `schemas/*` feature add ho to yeh tree update karo.

```
reallife-os/
├── app/
│   ├── (auth)/                      # login, sign-up, forget/change-password
│   │   └── [route]/
│   │       ├── page.tsx             # Server Component — initial data fetch
│   │       ├── loading.tsx          # REQUIRED per route
│   │       └── _components/         # Page-only components
│   ├── (protected)/                 # Authenticated app
│   │   ├── dashboard/
│   │   ├── billing/
│   │   ├── content-policies/        # list + (editor) create/edit/view
│   │   └── [slug]/                   # Unknown routes → under development
│   ├── (public)/                    # Marketing / landing
│   ├── api/                         # Thin route handlers → lib/services/*
│   │   ├── auth/
│   │   ├── stripe/
│   │   ├── access-policies/
│   │   ├── gateway-policies/
│   │   ├── gateway-categories/
│   │   ├── gateway-apps/
│   │   ├── gateway-locations/
│   │   ├── gateway-presets/
│   │   ├── cloudflare/
│   │   ├── devices/
│   │   ├── tenants/
│   │   └── dns-profile/
│   ├── layout.tsx
│   └── globals.css
│
├── components/                      # Shared / reusable UI
│   ├── ui/                          # shadcn primitives
│   ├── feedback/                    # ErrorAlert, WarningAlert, spinners
│   ├── providers/                   # QueryProvider, etc.
│   ├── layout/                      # App shell / nav chrome
│   └── billing/                     # Shared billing UI
│
├── schemas/                         # ALL Zod schemas (API + UI)
│   ├── generic/                     # email, password, personName, …
│   ├── auth/
│   ├── billing/
│   ├── cloudflare/
│   ├── content-policies/
│   └── tenants/
│
├── lib/
│   ├── api/                         # Client fetch helper (React Query)
│   ├── auth/                        # Auth helpers
│   ├── cloudflare/                  # CF config + HTTP client
│   ├── content-policies/            # Policy UI helpers (if any)
│   ├── navigation/                  # Sidebar / nav config
│   ├── query/                       # queryKeys factory
│   ├── services/                    # Business logic (verb-first)
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── cloudflare/              # categories, locations, rules, …
│   │   ├── content-policies/
│   │   ├── devices/
│   │   └── tenants/
│   ├── stripe/                      # Stripe SDK + plans
│   ├── supabase/                    # server / admin / gotrue / stateless
│   ├── env.ts
│   └── utils.ts
│
├── hooks/                           # Shared React hooks (e.g. use-mobile)
├── types/
│   └── supabase.ts                  # Generated DB types
├── supabase/
│   └── migrations/                  # SQL migrations
├── scripts/                         # One-off / ops scripts
├── public/                          # Static assets
├── .cursor/rules/                   # Always-on agent rules
├── PROJECT.md                       # This file (registry + stack + tree)
├── AGENTS.md
└── package.json                     # Exact dependency versions
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
- Button-triggered API calls → `useMutation` + `apiClient`; loading UI on the button (`CustomSpinner`), not a full-page overlay.
- Generic `<ErrorAlert />` / `<WarningAlert />` in `components/feedback/` — error object pass karo.

---

## Element Registry

> Har naya module, component, service, schema, ya API yahan register karo.

### Routes

| Route | Purpose | page.tsx | loading.tsx | _components | Status |
|-------|---------|----------|-------------|-------------|--------|
| `/` | Home / landing | `app/(public)/page.tsx` | `app/(public)/loading.tsx` | — | ✅ ready |
| `/dashboard` | Protected dashboard | `app/(protected)/dashboard/page.tsx` | `app/(protected)/dashboard/loading.tsx` | `dashboard-content` | ✅ ready |
| `/billing` | Subscription & payment management | `app/(protected)/billing/page.tsx` | `app/(protected)/billing/loading.tsx` | `billing-content` | ✅ ready |
| `/login` | User login | `app/(auth)/login/page.tsx` | `app/(auth)/login/loading.tsx` | `login-form` | ✅ ready |
| `/sign-up` | Registration | `app/(auth)/sign-up/page.tsx` | `app/(auth)/sign-up/loading.tsx` | `sign-up-form`, `password-strength-indicator` | ✅ ready |
| `/forget-password` | Password reset request | `app/(auth)/forget-password/page.tsx` | `app/(auth)/forget-password/loading.tsx` | `forget-password-form` | ✅ ready |
| `/change-password` | Password change via reset token | `app/(auth)/change-password/page.tsx` | `app/(auth)/change-password/loading.tsx` | `change-password-form` | ✅ ready |
| `/content-policies` | View all content policies list (allowlist/blocklist) | `app/(protected)/content-policies/page.tsx` | `app/(protected)/content-policies/loading.tsx` | `page-content`, `policy-table`, `policy-table-loading` | ✅ ready |
| `/content-policies/new-policy` | Create Gateway DNS policy — same full editor as edit (categories, apps, domains, schedules, SafeSearch, YT Restricted) | `app/(protected)/content-policies/(editor)/new-policy/page.tsx` | `app/(protected)/content-policies/(editor)/new-policy/loading.tsx` | `policy-detail` | ✅ ready |
| `/content-policies/[policyId]` | View policy details (read-only) | `app/(protected)/content-policies/(editor)/[policyId]/page.tsx` | `app/(protected)/content-policies/(editor)/[policyId]/loading.tsx` | `policy-view` | ✅ ready |
| `/content-policies/[policyId]/edit` | Edit Gateway policy — same form as create, prepopulated; Save enabled only when dirty → PUT update | `app/(protected)/content-policies/(editor)/[policyId]/edit/page.tsx` | `app/(protected)/content-policies/(editor)/[policyId]/edit/loading.tsx` | `policy-detail` | ✅ ready |
| `/[slug]` (protected) | Unknown protected routes (devices, settings, …) → under development | `app/(protected)/[slug]/page.tsx` | `app/(protected)/[slug]/loading.tsx` | `under-development` | ✅ ready |
| `/devices` | Connected devices list — Cloudflare WARP devices + rename/remove | `app/(protected)/devices/page.tsx` | `app/(protected)/devices/loading.tsx` | `connected-devices-view`, `connected-device-row` | ✅ ready |
| `/devices/setup` | Device setup questionnaire — persisted answers, conditional steps | `app/(protected)/devices/setup/page.tsx` | `app/(protected)/devices/setup/loading.tsx` | `device-setup-view` | ✅ ready |
| `/devices/setup/cloudflare-one` | Cloudflare One 4-step wizard — real team name, emails, preferences | `app/(protected)/devices/setup/cloudflare-one/page.tsx` | `app/(protected)/devices/setup/cloudflare-one/loading.tsx` | `cloudflare-one-wizard` | ✅ ready |
| `/devices/setup/andoff` | iPhone supervised mode guide (Andoff documentation layout) | `app/(protected)/devices/setup/andoff/page.tsx` | `app/(protected)/devices/setup/andoff/loading.tsx` | `andoff-guide-view` | ✅ ready (UI mock) |
| `/devices/setup/install-certificate` | WARP Desktop certificate install guide — 8-step scrollable flow with desktop/mobile mockups | `app/(protected)/devices/setup/install-certificate/page.tsx` | `app/(protected)/devices/setup/install-certificate/loading.tsx` | `install-certificate-view`, `install-certificate-mockups` | ✅ ready (UI mock) |
| `/devices/setup/apple-shortcuts` | iPhone Apple Shortcuts guide — auto-reconnect Cloudflare VPN | `app/(protected)/devices/setup/apple-shortcuts/page.tsx` | `app/(protected)/devices/setup/apple-shortcuts/loading.tsx` | `apple-shortcuts-view` | ✅ ready (UI mock) |
| `/[slug]` (protected) | Unknown protected routes (settings, …) → under development | `app/(protected)/[slug]/page.tsx` | `app/(protected)/[slug]/loading.tsx` | `under-development` | ✅ ready |

### Shared Components

| Component | Path | Purpose | Used In | Status |
|-----------|------|---------|---------|--------|
| Button | `components/ui/button.tsx` | shadcn button — default brand primary; `brandOutline` for secondary add actions | global | ✅ ready |
| Switch | `components/ui/switch.tsx` | shadcn toggle switch | policy editor | ✅ ready |
| Select | `components/ui/select.tsx` | shadcn select dropdown | access policy form, filters | ✅ ready |
| Card | `components/ui/card.tsx` | shadcn card | global | ✅ ready |
| Input | `components/ui/input.tsx` | shadcn input + icon slots + brand styling | auth forms | ✅ ready |
| Label | `components/ui/label.tsx` | shadcn label | forms | ✅ ready |
| Field | `components/ui/field.tsx` | shadcn field group + errors | forms | ✅ ready |
| Skeleton | `components/ui/skeleton.tsx` | Loading placeholder | loading states | ✅ ready |
| Spinner | `components/feedback/spinner.tsx` | Brand dual-ring spinner | global overlay | ✅ ready |
| CustomSpinner | `components/feedback/custom-spinner.tsx` | Inline submit-button spinner | auth forms | ✅ ready |
| GlobalSpinner | `components/feedback/global-spinner.tsx` | Full-screen mutation loader | — | ⚪ unused |
| QueryProvider | `components/providers/query-provider.tsx` | React Query context | root layout | ✅ ready |
| DashboardShell | `components/layout/dashboard-shell.tsx` | Protected app shell (sidebar + navbar) | `(protected)/layout` | ✅ ready |
| AppSidebar | `components/layout/app-sidebar.tsx` | Collapsible sidebar navigation | DashboardShell | ✅ ready |
| AppNavbar | `components/layout/app-navbar.tsx` | Top navbar with search + actions | DashboardShell | ✅ ready |
| Sidebar | `components/ui/sidebar.tsx` | shadcn collapsible sidebar primitive | AppSidebar | ✅ ready |
| Sheet | `components/ui/sheet.tsx` | Mobile sidebar drawer | Sidebar | ✅ ready |
| Avatar | `components/ui/avatar.tsx` | User avatar | navbar, sidebar | ✅ ready |
| DropdownMenu | `components/ui/dropdown-menu.tsx` | User menu in sidebar | AppSidebar | ✅ ready |
| Tooltip | `components/ui/tooltip.tsx` | Collapsed sidebar tooltips | Sidebar | ✅ ready |
| Badge | `components/ui/badge.tsx` | Status/category pills | dashboard | ✅ ready |
| Progress | `components/ui/progress.tsx` | Setup progress bar | dashboard | ✅ ready |
| Table | `components/ui/table.tsx` | Data tables | dashboard | ✅ ready |
| Accordion | `components/ui/accordion.tsx` | Collapsible task list | dashboard | ✅ ready |
| Chart | `components/ui/chart.tsx` | Recharts wrapper + tooltip | dashboard | ✅ ready |
| Dialog | `components/ui/dialog.tsx` | Modal primitive | PaywallGate | ✅ ready |
| PaywallGate | `components/billing/paywall-gate.tsx` | Blocking pricing modal until active subscription | `(protected)/layout` | ✅ ready |
| DashboardContent | `app/(protected)/dashboard/_components/dashboard-content.tsx` | Network security dashboard UI (metrics, chart, table) | `/dashboard` | ✅ ready |
| BillingContent | `app/(protected)/billing/_components/billing-content.tsx` | Premium subscription + payment method layout | `/billing` | ✅ ready |
| PaymentMethodCard | `app/(protected)/billing/_components/payment-method-card.tsx` | Visual credit card + full billing metadata | `/billing` | ✅ ready |
| AttachCardPanel | `app/(protected)/billing/_components/attach-card-panel.tsx` | Empty-state card attach UI (Stripe setup checkout) | `/billing` | ✅ ready |
| BillingActionButton | `app/(protected)/billing/_components/billing-action-button.tsx` | Branded billing CTA button | `/billing` | ✅ ready |
| PoliciesPage | `app/(protected)/content-policies/_components/page-content.tsx` | Client shell with URL search/filters + Access policies table via React Query | `/content-policies` | ✅ ready |
| PoliciesSearchInput | `app/(protected)/content-policies/_components/policies-search-input.tsx` | Debounced search input; updates `?q=` via `history.replaceState` | `/content-policies` | ✅ ready |
| PolicyTable | `app/(protected)/content-policies/_components/policy-table.tsx` | Desktop table + mobile cards; Flame menu + delete confirm | `/content-policies` | ✅ ready |
| PolicyTableLoading | `app/(protected)/content-policies/_components/policy-table-loading.tsx` | Table/card skeleton — 2 rows matching list layout | `/content-policies` loading | ✅ ready |
| AccessPolicyForm | `app/(protected)/content-policies/(editor)/_components/access-policy-form.tsx` | Legacy Cloudflare Access Include/Require/Exclude form (superseded by Gateway editor for new-policy) | — | ⚪ unused |
| PolicyDetail | `app/(protected)/content-policies/(editor)/_components/policy-detail.tsx` | Shared create/edit editor; edit uses `initialData`, dirty-gated Save → PUT | `/content-policies/new-policy`, `/content-policies/[policyId]/edit` | ✅ ready |
| PolicyView | `app/(protected)/content-policies/(editor)/_components/policy-view.tsx` | Read-only policy detail; View/Download config JSON + DNS .mobileconfig | `/content-policies/[policyId]` | ✅ ready |
| PolicyViewLoading | `app/(protected)/content-policies/(editor)/_components/policy-view-loading.tsx` | View-page skeleton (separate from editor loading) | `/content-policies/[policyId]` loading | ✅ ready |
| PolicyEditorLoading | `app/(protected)/content-policies/(editor)/_components/policy-editor-loading.tsx` | Shared editor skeleton (sticky sidebar + detail panel) | editor routes loading.tsx | ✅ ready |
| ScheduleSheet | `app/(protected)/content-policies/(editor)/_components/schedule-sheet.tsx` | Right-side Sheet with weekly 24h calendar grid — click-to-add, click-to-remove, drag-to-resize (15-min snap) | PolicyDetail schedules | ✅ ready |
| PickerDialog | `app/(protected)/content-policies/(editor)/_components/picker-dialog.tsx` | Search modal; empty / no-match can show `emptyCreate` (name + Create). Categories, Apps, Audience | PolicyDetail | ✅ ready |
| UnderDevelopment | `app/(protected)/[slug]/_components/under-development.tsx` | Placeholder for unimplemented protected nav routes | `/[slug]` catch-all | ✅ ready |
| ErrorAlert | `components/feedback/error-alert.tsx` | Generic error display | Policy delete confirm, shared | ✅ ready |

### Supabase (`lib/supabase/`)

| Module | Path | Purpose | Status |
|--------|------|---------|--------|
| Server client | `lib/supabase/server.ts` | Cookie-based SSR auth client | ✅ ready |
| Admin client | `lib/supabase/admin.ts` | Service role client (server only) | ✅ ready |
| Stateless client | `lib/supabase/stateless.ts` | No-session client for one-off auth calls | ✅ ready |
| GoTrue fetch | `lib/supabase/gotrue.ts` | Direct `/auth/v1/recover` with full error parsing | ✅ ready |
| Env helpers | `lib/env.ts` | `SUPABASE_*`, Stripe env, `getSiteUrl`, confirm URLs | ✅ ready |
| Proxy | `proxy.ts` | Session refresh + auth route guards | ✅ ready |

### Stripe (`lib/stripe/`)

| Module | Path | Purpose | Status |
|--------|------|---------|--------|
| Stripe client | `lib/stripe/client.ts` | Server-only Stripe SDK singleton | ✅ ready |
| Plans | `lib/stripe/plans.ts` | Client-safe plan catalog (Willpower Pro) | ✅ ready |

### Navigation (`lib/navigation/`)

| Module | Path | Purpose | Status |
|--------|------|---------|--------|
| App nav config | `lib/navigation/app-navigation.ts` | Sidebar links + user labels | ✅ ready |

### Services (`lib/services/`)

| Service | File | Purpose | Called From | Status |
|---------|------|---------|-------------|--------|
| loginUser | `lib/services/auth/login.ts` | Supabase `signInWithPassword` | `/api/auth/login` | ✅ ready |
| signUpUser | `lib/services/auth/sign-up.ts` | Supabase `signUp` + email confirm | `/api/auth/sign-up` | ✅ ready |
| requestPasswordReset | `lib/services/auth/forget-password.ts` | User lookup + GoTrue recover | `/api/auth/forget-password` | ✅ ready |
| getUserByEmail | `lib/services/auth/get-user-by-email.ts` | Admin API email lookup | forget-password | ✅ ready |
| validateRecoverySession / changePassword | `lib/services/auth/change-password.ts` | Session validate + `updateUser` | change-password APIs | ✅ ready |
| logoutUser | `lib/services/auth/logout.ts` | Supabase `signOut` | `/api/auth/logout` | ✅ ready |
| createCheckoutSession / createTrialCheckoutSession / createPaymentSetupSession | `lib/services/billing/checkout.ts` | Trial setup checkout + paid checkout + add card | checkout / start-trial / setup-payment APIs | ✅ ready |
| getBillingStatus / saveSubscription | `lib/services/billing/subscriptions.ts` | Subscription DB | billing-status + webhook | ✅ ready |
| getBillingDetails / createBillingPortalSession | `lib/services/billing/details.ts` | Subscription + card + Stripe Customer Portal | billing-details + billing-portal APIs | ✅ ready |
| processStripeWebhookEvent | `lib/services/billing/webhook.ts` | Event → handler → DB | `/api/stripe/webhook` | ✅ ready |
| getPolicies | `lib/services/content-policies/get-policies.ts` | Content policies list helpers / mock filter | `/content-policies` client filter | ✅ ready |
| listAccessPolicies / createAccessPolicy | `lib/services/content-policies/access-policies.ts` | Cloudflare Access app policies list + create | `/api/access-policies` | ✅ ready |
| listGatewayPolicies / createGatewayPolicy / updateGatewayPolicy / getGatewayPolicyById / getGatewayPolicyForEditor / deleteGatewayPolicy | `lib/services/content-policies/gateway-policies.ts` | Gateway DNS policies CRUD + editor prepopulation | `/api/gateway-policies`, list/view/create/edit | ✅ ready |
| parseTrafficExpression / parseGatewaySchedule | `lib/services/content-policies/parse-gateway-rule.ts` | Wirefilter + schedule → editor fields | `getGatewayPolicyForEditor` | ✅ ready |
| updateGatewayRule | `lib/services/cloudflare/rules.ts` | PUT `/accounts/{id}/gateway/rules/{ruleId}` | `updateGatewayPolicy` | ✅ ready |
| deleteAccessPolicy | `lib/services/content-policies/access-policies.ts` | Delete Cloudflare Access app policy | Gateway delete fallback | ✅ ready |
| deleteGatewayRule | `lib/services/cloudflare/rules.ts` | DELETE `/accounts/{id}/gateway/rules/{ruleId}` | `deleteGatewayPolicy` | ✅ ready |
| buildPolicyConfigJson / buildDohMobileconfig | `lib/services/content-policies/policy-config-export.ts` | Policy JSON export + Apple DoH .mobileconfig | Policy view, `/api/dns-profile/mobileconfig` | ✅ ready |
| getDnsProfileSource | `lib/services/content-policies/dns-profile.ts` | Resolve DoH location availability for DNS profile download | Policy view, `/api/dns-profile/mobileconfig` | ✅ ready |
| listGatewayCategories / resolveCategoryIdsByLabels | `lib/services/cloudflare/categories.ts` | Gateway content category catalog | `/api/gateway-categories`, create policy | ✅ ready |
| listGatewayCategoryPickerGroups | `lib/services/cloudflare/category-picker.ts` | Categories → picker groups | Policy editor Add category | ✅ ready |
| listGatewayAppTypes / listGatewayAppPickerGroups | `lib/services/cloudflare/app-types.ts` | Gateway app_types → picker groups | Policy editor Add app | ✅ ready |
| listGatewayAudiencePickerGroups | `lib/services/cloudflare/audience-picker.ts` | Gateway locations → Audience picker | Policy editor Add location | ✅ ready |
| listGatewayPresets | `lib/services/content-policies/gateway-presets.ts` | Curated presets resolved against CF categories/apps | `/api/gateway-presets`, Create Rule Presets tab | ✅ ready |
| createGatewayRule / listGatewayRules | `lib/services/cloudflare/rules.ts` | Low-level Gateway rules API | gateway-policies, baseline-rules | ✅ ready |
| createCloudflareAccount / listCloudflareAccounts / getCloudflareAccount | `lib/services/cloudflare/accounts.ts` | Tenant API create/list/get child accounts | `/api/cloudflare/accounts`, tenant provision | ✅ ready |
| ensureZeroTrustGateway | `lib/services/cloudflare/gateway.ts` | Enable Zero Trust Gateway on child account | tenant provision | ✅ ready |
| createGatewayLocation | `lib/services/cloudflare/locations.ts` | DoH/DoT DNS location for device setup | tenant provision, Audience picker create | ✅ ready |
| seedBaselineDnsPolicies | `lib/services/cloudflare/baseline-rules.ts` | Phase 1 SafeSearch + DoH provider block rules | tenant provision | ✅ ready |
| listPhysicalDevices / revokeDeviceRegistrations / getZeroTrustTeamName | `lib/services/cloudflare/devices.ts` | Cloudflare One WARP device list + revoke + team name | `/api/devices` | ✅ ready |
| listConnectedDevices / renameConnectedDevice / removeConnectedDevice | `lib/services/devices/list-connected-devices.ts`, `rename-device.ts`, `remove-device.ts` | Merge CF devices with local display names | `/api/devices` | ✅ ready |
| getDeviceEnrollmentInfo | `lib/services/devices/get-enrollment-info.ts` | Team name, DNS profile, store/WARP URLs, enrolled count | `/api/devices/enrollment-info` | ✅ ready |
| getDeviceSetupSession / updateDeviceSetupSession | `lib/services/devices/setup-session.ts` | Persist questionnaire + wizard step | `/api/devices/setup-session` | ✅ ready |
| getDeviceAppPreferences / updateDeviceAppPreferences | `lib/services/devices/app-preferences.ts` | Lock filter + prevent logout toggles | `/api/devices/app-preferences` | ✅ ready |
| provisionTenantCloudflareAccount / getTenantCloudflareAccountForUser | `lib/services/tenants/provision.ts` | Full tenant onboarding orchestration + DB mapping | `/api/tenants/provision` | ✅ ready |

### Cloudflare (`lib/cloudflare/`)

| Module | Path | Purpose | Status |
|--------|------|---------|--------|
| Config | `lib/cloudflare/config.ts` | Env helpers (`CLOUDFARE_*` / `CLOUDFLARE_*`), Tenant admin auth | ✅ ready |
| Client | `lib/cloudflare/client.ts` | Shared Cloudflare API fetch + error type | ✅ ready |

### API Routes (`app/api/`)

| Endpoint | Method | Service | Schema | Status |
|----------|--------|---------|--------|--------|
| `/api/auth/login` | POST | `loginUser` | `loginSchema` | ✅ ready |
| `/api/auth/sign-up` | POST | `signUpUser` | `signUpSchema` | ✅ ready |
| `/api/auth/forget-password` | POST | `requestPasswordReset` | `forgetPasswordSchema` | ✅ ready |
| `/api/auth/confirm` | GET | Supabase OTP/code exchange | — | ✅ ready |
| `/api/auth/change-password/validate` | GET | `validateRecoverySession` | — | ✅ ready |
| `/api/auth/change-password` | POST | `changePassword` | `changePasswordSchema` | ✅ ready |
| `/api/auth/logout` | POST | `logoutUser` | — | ✅ ready |
| `/api/stripe/webhook` | POST | `processStripeWebhookEvent` | Stripe signature | ✅ ready |
| `/api/stripe/checkout` | POST | `createCheckoutSession` | `createCheckoutSessionSchema` | ✅ ready |
| `/api/stripe/start-trial` | POST | `createTrialCheckoutSession` | Stripe setup checkout | ✅ ready |
| `/api/stripe/setup-payment` | POST | `createPaymentSetupSession` | Add/update card via setup checkout | ✅ ready |
| `/api/stripe/billing-status` | GET | `getBillingStatus` | — | ✅ ready |
| `/api/stripe/billing-details` | GET | `getBillingDetails` | — | ✅ ready |
| `/api/stripe/billing-portal` | POST | `createBillingPortalSession` | — | ✅ ready |
| `/api/access-policies` | GET | `listAccessPolicies` | — | ✅ ready |
| `/api/access-policies` | POST | `createAccessPolicy` | `createAccessPolicySchema` | ✅ ready |
| `/api/gateway-policies` | GET | `listGatewayPolicies` | — | ✅ ready |
| `/api/gateway-policies` | POST | `createGatewayPolicy` | `createGatewayPolicySchema` | ✅ ready |
| `/api/gateway-policies/[policyId]` | GET | `getGatewayPolicyForEditor` | Auth; `{ data }` editor state | ✅ ready |
| `/api/gateway-policies/[policyId]` | PUT | `updateGatewayPolicy` | `createGatewayPolicySchema` | ✅ ready |
| `/api/gateway-policies/[policyId]` | DELETE | `deleteGatewayPolicy` | — | ✅ ready |
| `/api/gateway-categories` | GET | `listGatewayCategoryPickerGroups` | Auth; `{ groups }` | ✅ ready |
| `/api/gateway-apps` | GET | `listGatewayAppPickerGroups` | Auth; `{ groups }` | ✅ ready |
| `/api/gateway-locations` | GET | `listGatewayAudiencePickerGroups` | Auth; `{ groups }` | ✅ ready |
| `/api/gateway-locations` | POST | `createGatewayLocation` | `createGatewayLocationSchema` | ✅ ready |
| `/api/gateway-presets` | GET | `listGatewayPresets` | Auth; `{ presets }` resolved vs CF catalog | ✅ ready |
| `/api/cloudflare/accounts` | GET | `listCloudflareAccounts` | — | ✅ ready |
| `/api/cloudflare/accounts` | POST | `createCloudflareAccount` | `createCloudflareAccountSchema` | ✅ ready |
| `/api/tenants/provision` | GET | `getTenantCloudflareAccountForUser` | — | ✅ ready |
| `/api/tenants/provision` | POST | `provisionTenantCloudflareAccount` | `provisionTenantSchema` | ✅ ready |
| `/api/dns-profile/mobileconfig` | GET | `buildDohMobileconfig` + Gateway location | Auth required; downloads .mobileconfig | ✅ ready |
| `/api/devices` | GET | `listConnectedDevices` | — | ✅ ready |
| `/api/devices/[deviceId]` | PATCH | `renameConnectedDevice` | `renameDeviceSchema` | ✅ ready |
| `/api/devices/[deviceId]` | DELETE | `removeConnectedDevice` | — | ✅ ready |
| `/api/devices/enrollment-info` | GET | `getDeviceEnrollmentInfo` | — | ✅ ready |
| `/api/devices/setup-session` | GET, PATCH | `getDeviceSetupSession` / `updateDeviceSetupSession` | `updateDeviceSetupSessionSchema` | ✅ ready |
| `/api/devices/app-preferences` | GET, PATCH | `getDeviceAppPreferences` / `updateDeviceAppPreferences` | `updateDeviceAppPreferencesSchema` | ✅ ready |

### Schemas (`schemas/`)

| Schema | File | Used In | Status |
|--------|------|---------|--------|
| `loginSchema` | `schemas/auth/login.ts` | Login form + `/api/auth/login` | ✅ ready |
| `signUpSchema` | `schemas/auth/sign-up.ts` | Sign-up form + `/api/auth/sign-up` | ✅ ready |
| `forgetPasswordSchema` | `schemas/auth/forget-password.ts` | Forget-password form + API | ✅ ready |
| `changePasswordSchema` | `schemas/auth/change-password.ts` | Change-password form + API | ✅ ready |
| `createCheckoutSessionSchema` | `schemas/billing/checkout.ts` | Checkout API + paywall | ✅ ready |
| `BillingDetailsResponse` | `schemas/billing/details.ts` | Billing page + APIs | ✅ ready |
| `createAccessPolicySchema` | `schemas/content-policies/access-policy.ts` | Access policy form + `/api/access-policies` POST | ✅ ready |
| `createGatewayPolicySchema` | `schemas/content-policies/gateway-policy.ts` | Save payload: domains (Host), domainRoots (Domain), domainKeywords (regex) | ✅ ready |
| `gatewayPresetSchema` | `schemas/content-policies/gateway-preset.ts` | Preset list + apply payload | ✅ ready |
| `createCloudflareAccountSchema` | `schemas/cloudflare/account.ts` | Create Account API + `/api/cloudflare/accounts` POST | ✅ ready |
| `provisionTenantSchema` | `schemas/tenants/provision.ts` | Tenant onboarding + `/api/tenants/provision` POST | ✅ ready |
| `createGatewayLocationSchema` | `schemas/content-policies/gateway-location.ts` | Audience picker create + `/api/gateway-locations` POST | ✅ ready |
| `connectedDeviceSchema` | `schemas/devices/device.ts` | Device platform, connected device, setup answers | `/devices`, `/devices/setup` | ✅ ready |
| `deviceEnrollmentInfoSchema` | `schemas/devices/api.ts` | Enrollment info + setup session + app preferences API | `/api/devices/*` | ✅ ready |

### DB migrations (`supabase/migrations/`)

| Migration | Purpose | Status |
|-----------|---------|--------|
| `20260716120000_user_subscriptions.sql` | `user_subscriptions` + `stripe_webhook_events` tables + RLS | ✅ applied to Reallife-OS [Production] |
| `20260803120000_tenant_cloudflare_accounts.sql` | Per-user Cloudflare child account + Gateway location mapping + RLS | ⚪ apply to Supabase |
| `20260811120000_tenant_devices.sql` | `tenant_device_metadata`, `device_setup_sessions`, `device_app_preferences` + RLS | ⚪ apply to Supabase |

### Generic Validators (`schemas/generic/`)

| Validator | Purpose | Status |
|-----------|---------|--------|
| `emailField` | Email format + required | ✅ ready |
| `passwordField` | Min 8 chars + required | ✅ ready |
| `personNameField` | Full name fields | ✅ ready |
| `nonEmptyString` | Trim + min 1 char | ⚪ not started |
| `positiveNumber` | Numeric fields > 0 | ⚪ not started |

---

## Changelog

| Date | Change | Updated By |
|------|--------|------------|
| 2026-08-06 | Protected `[slug]` catch-all: unknown routes (devices, settings, …) show Under development UI | Agent |
| 2026-08-06 | Edit prepopulation: parse live CF traffic/schedule exactly; platform-account fallback; sync form state from `initialData` | Agent |
| 2026-08-06 | Policy edit: same create form prepopulated via `getGatewayPolicyForEditor`; Save only when dirty; PUT `updateGatewayPolicy` | Agent |
| 2026-08-06 | Web addresses: per-rule state; Auto-Detect/Address/Keyword tabs drive validation + CF Domain/Host/regex traffic | Agent |
| 2026-08-06 | PROJECT.md: Tech Stack + package inventory + full Folder Structure; rules/AGENTS require always sync | Agent |
| 2026-08-06 | Audience create: type name in search; no results → ghost underlined Create “name” (no extra field) | Agent |
| 2026-08-06 | Audience picker empty / no-match: Create DNS location (POST `/api/gateway-locations`), auto-select + cache update | Agent |
| 2026-08-06 | Audience DNS location picker: search by name / DoH subdomain / IPv4; show DoH+IP under each location | Agent |
| 2026-08-06 | Renamed `resolvePolicyAccountId` → `getPolicyCloudflareAccountId`; naming rule: avoid vague `resolve`/`handle`/`process` | Agent |
| 2026-08-03 | Policy create: prepend new item into `gatewayPolicies.list` cache via `setQueryData` (no list refetch) | Agent |
| 2026-08-03 | Policy delete: update React Query list cache with `setQueryData` (no refetch / no router.refresh) | Agent |
| 2026-08-03 | Policy list + skeleton share fixed column widths (`policy-table-layout`) so columns match exactly | Agent |
| 2026-08-03 | Content policies loading skeleton matches real list UI (Table/Card structure, 2 rows) | Agent |
| 2026-08-03 | Create Rule Presets: fetch `/api/gateway-presets` (CF-resolved categories/apps/domains) and apply on select | Agent |
| 2026-08-03 | Create Rule dialog: General = Block/Allow/YT Restricted/SafeSearch with titles; Presets = block templates only (no YT duplicate) | Agent |
| 2026-08-03 | Removed YouTube Restricted Mode toggle from editor (option already in Add Rule) | Agent |
| 2026-08-03 | Policy editor: Categories/Apps/Audience from Cloudflare APIs; web addresses validated + saved as domains; save sends categoryIds/appIds/locationIds | Agent |
| 2026-08-03 | Content policies `loading.tsx` matches page layout; table skeleton shows 2 rows | Agent |
| 2026-08-03 | Content policies: Delete with confirm dialog → `DELETE /api/gateway-policies/[policyId]` (Gateway + Access fallback) | Agent |
| 2026-08-03 | Policy view actions: Flame dropdown on mobile/tablet (`<lg`); icon-only buttons on desktop | Agent |
| 2026-08-03 | Policy view actions: icon-only buttons; collapse to Flame dropdown on narrow screens (no wrap) | Agent |
| 2026-08-03 | DNS Profile button disabled when no Gateway DoH location; shared `getDnsProfileSource` for view + API | Agent |
| 2026-08-03 | Policy view: View config + Download config (JSON export); DNS profile .mobileconfig via `/api/dns-profile/mobileconfig` (no Cloudflare download URL for policies) | Agent |
| 2026-08-03 | Content policies: row click + View open read-only `/content-policies/[id]` (`PolicyView`); Edit goes to `/content-policies/[id]/edit` | Agent |
| 2026-08-03 | Gateway auth: always use API token (not Tenant email/key); list soft-falls back to Access policies on Cloudflare "Authentication error"; clearer create error for missing Zero Trust token perms | Agent |
| 2026-08-03 | Gateway policies: soft-fail tenant lookup when `tenant_cloudflare_accounts` missing — fall back to platform `CLOUDFARE_ACCOUNT_ID` | Agent |
| 2026-08-03 | Schedule sheet: replaced week drag-grid with simple day toggles + start/end time selects + weekly summary list | Agent |
| 2026-08-03 | Schedule calendar: fluid full-width week grid, sticky day headers, quick-fill templates, ✕ remove (not click-to-delete), fixed resize drag | Agent |
| 2026-08-03 | Schedule sheet: wider panel (up to 1120px, overrides default `sm:max-w-sm`), cleaner header/footer, larger day columns and blocks | Agent |
| 2026-08-03 | Content policies create = same editor UI as edit (categories/apps/domains/schedules/SafeSearch/YT Restricted); Save → Gateway DNS `POST /accounts/{id}/gateway/rules`; list uses `/api/gateway-policies` | Agent |
| 2026-08-03 | Phase 1 multi-tenant Cloudflare provisioning: Create Account API (`POST /accounts`) + Gateway enable + DoH/DoT location + baseline DNS rules (SafeSearch/DoH block); services, schemas, `/api/cloudflare/accounts`, `/api/tenants/provision`, `tenant_cloudflare_accounts` migration | Agent |
| 2026-07-30 | New policy uses same editor shell as edit — `AccessPolicyForm` moved to `(editor)/_components`, sticky Include/Require/Exclude sidebar, create API via Save in UI; `PolicyDetail mode="create"` delegates to form | Agent |
| 2026-07-30 | Content Policies: Cloudflare-style Add Rule flow — `/content-policies/new-policy` form (name, Allow/Block/Bypass, Include/Require/Exclude selectors), Zod + service + POST `/api/access-policies`; list Add Rule navigates to form instead of dummy JSON | Agent |
| 2026-07-30 | Content policies editor: consistent buttons — default/`brandOutline`/`outline` variants on new-policy form, policy detail, and schedule sheet (removed inline brand overrides) | Agent |
| 2026-07-27 | Policy editor: shared `(editor)` layout for `/content-policies/new-policy` + `/content-policies/[policyId]` — sticky rules sidebar, no card wrapper, create/edit modes in `PolicyDetail` | Agent |
| 2026-07-27 | Content policies list: server `page.tsx` + `getPolicies` service; client `PoliciesPage` (search shell) + separate `PolicyTable` + `PolicyTableLoading` | Agent |
| 2026-07-27 | Add Category / Add App / Add Member modal pickers: reusable `PickerDialog` centered modal with top search bar + ✕ close, uppercase section headers (ADS, BUSINESS & ECONOMY, LOGIN EMAIL...), group-labeled list with selected-row indicator. 10+ category groups, 80+ app titles, email/member audience lists. PolicyDetail Categories/Apps/Audience sections now show group-divided pill cards with hover remove action and live counts. | Agent |
| 2026-07-27 | Schedule: right-side `ScheduleSheet` component with weekly 24h calendar grid (Sun-Sat x 24h, 15-min snap). Click empty space → add block, click block → remove, drag bottom handle → resize. "Add Rule Schedule" / "Edit Rule Schedule" header with subtitle instructions, Close + Save footer. PolicyDetail schedules section now shows day-grouped cards with edit/remove actions and opens sheet on Add/Edit. | Agent |
| 2026-07-27 | Content Policies: `/content-policies` list page + `/content-policies/[policyId]` detail page with rules sidebar, categories, apps, web addresses, audience, schedules sections + saved-state pill | Agent |
| 2026-08-11 | Devices functionality: Cloudflare physical-devices API list/revoke, enrollment info, setup session persistence, rename/remove, app preferences | Agent |
| 2026-08-11 | Devices UI: `/devices` connected devices list (platform picker, rename/remove) + initial setup wizard | Agent |
| 2026-07-23 | Billing: premium theme UI, visual payment card with full Stripe metadata, attach-card placeholder | Agent |
| 2026-07-23 | Dashboard: full network-security UI on `/dashboard` — metrics cards, Recharts traffic chart, setup progress, blocked-activity table | Agent |
| 2026-07-23 | Billing: AttachCardPanel empty state + setup checkout for all users without a card on file | Agent |
| 2026-07-23 | Billing page: sidebar nav, subscription/expiry/card display, Stripe Customer Portal for card updates | Agent |
| 2026-07-17 | Billing rewritten as straight feature flow: trial, checkout (reuse customer), webhook event → DB | Agent |
| 2026-07-17 | Webhook fix: claim after success; invoice subscription id for API 2026; customer events no longer wipe paid rows | Agent |
| 2026-07-17 | Paywall matches home Pricing (3 cards); Personal = 7-day free trial; Pro/Family → Stripe Checkout | Agent |
| 2026-07-17 | Removed full-page GlobalSpinner from QueryProvider; auth uses in-button spinner only | Agent |
| 2026-07-17 | Auth forms: inline `CustomSpinner` on submit + disabled while pending (UI only) | Agent |
| 2026-07-16 | Billing simplified: checkout creates session only; single webhook file with one handler per event | Agent |
| 2026-07-16 | Webhook: read `current_period_end` from subscription item (Stripe API 2026.dahlia moved it off subscription root) | Agent |
| 2026-07-16 | Simplified billing: webhook is sole writer of full subscription rows; removed sync-checkout backfill path | Agent |
| 2026-07-16 | Applied `user_subscriptions` migration to linked Supabase project `nmggxddqxeoylsmqwpmn` | Agent |
| 2026-07-16 | Stripe billing: webhook (`/api/stripe/webhook`), checkout, billing-status, paywall modal after auth until `active`/`trialing` | Agent |
| 2026-07-09 | Supabase Auth SMTP: fixed Gmail port `586` → `587` on project `nmggxddqxeoylsmqwpmn` (password reset / signup emails were timing out with `EMAIL_SEND_FAILED`) | Agent |
| 2026-07-09 | Landing glows: viewport `clamp()` sizing/position so blobs scale with screen | Agent |
| 2026-07-09 | Landing page mobile: overflow-x clip, responsive glows, hamburger nav, tighter header/hero/CTA | Agent |
| 2026-07-08 | Landing moved to `app/(public)/`; site-wide Inter font; sidebar sign-out wired | Agent |
| 2026-07-08 | Landing page: full marketing page in `app/page.tsx` (hero, features, pricing, testimonials, footer) | Agent |
| 2026-07-07 | Sidebar: standard shadcn menu buttons — fixed icon size, centered when collapsed, text hidden only | Agent |
| 2026-07-07 | Protected dashboard shell: shadcn sidebar + navbar layout | Agent |
| 2026-07-06 | Proxy: redirect `?code=` / OTP params to `/api/auth/confirm` | Agent |
| 2026-07-06 | Migrated `middleware.ts` → `proxy.ts` (Next.js 16) | Agent |
| 2026-07-05 | Brand CSS tokens in `globals.css`; login page + API stub; shadcn Input/Field; QueryProvider | Agent |
| 2026-07-05 | Initial PROJECT.md + Cursor rules created | Agent |

---

## Status Legend

- ✅ ready / complete
- 🟡 in progress / placeholder
- ⚪ not started
- 🔴 blocked / needs attention
