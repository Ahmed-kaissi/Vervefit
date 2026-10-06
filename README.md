# VerveFit

Eat better. Train smarter. Stay consistent.

A mobile-first nutrition and training companion: calorie and macro logging,
water and habit streaks, selectable training programs with form demonstrations,
progress charts, guest mode, and a layered AI coach.

## What actually ships

- **Nutrition** — food logging with live calorie/macro rings, editable targets,
  and protein suggestions sized to what you have left.
- **Training** — six programs, per-session exercise swaps, form demonstrations,
  a session timer, and workout history with an estimated (clearly labelled)
  calorie burn.
- **Daily habits** — habits, water and streaks that survive an unticked day.
- **Progress** — weight trend with a moving average, calorie history, macro
  split and weekly training minutes.
- **AI coach** — see [AI coach](#ai-coach) below.
- **Guest mode** — everything above works before sign-up, and moves to your
  account when you create one.

Not implemented: a weekly meal planner, a generated grocery list, and
achievements. They are not advertised anywhere in the product.

## Overview

This project uses the following tech stack:
- Vite
- Typescript
- React Router v7 (all imports from `react-router` instead of `react-router-dom`)
- React 19 (for frontend components)
- Tailwind v4 (for styling)
- Shadcn UI (for UI components library)
- Lucide Icons (for icons)
- Convex (for backend & database)
- Convex Auth (for authentication)
- Framer Motion (for animations)
- Hono on Deno (for serving the built SPA in the container)

There is no three.js dependency and no 3D graphics in this project.

All relevant files live in the 'src' directory.

Use bun for the package manager.

## Commands

```bash
bun install          # dependencies
bun run dev          # dev server on :5173
bun run typecheck    # tsc -b
bun run lint         # eslint .
bun run test         # bun test (tests/ directory)
bun run build        # tsc -b && vite build
npx convex dev       # backend dev loop
```

## Setup

This project is set up already and running on a cloud environment, as well as a convex development in the sandbox.

## Environment Variables

The client build needs `VITE_CONVEX_URL` (inlined at build time — the Docker
build fails loudly if it is missing) and `CONVEX_DEPLOYMENT` for the CLI.

Server-side variables live in the Convex environment (`npx convex env set`)
and are never sent to the browser:

- `SITE_URL` — public URL of this deployment.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — Resend Email API key and verified
  From address used to deliver sign-in codes. **Rotate the key if it was ever
  committed.**
- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL` — the strong
  reasoning layer (defaults to `https://api.deepseek.com/v1` and
  `deepseek-flash`).
- `FREE_AI_API_KEY`, `FREE_AI_BASE_URL`, `FREE_AI_MODEL` — the optional free
  lightweight layer (defaults to `Qwen3-4B-Instruct-2507`). When it is unset,
  lightweight questions are served by the DeepSeek provider instead.

See `.env.example` for the full list. Never put a secret in a `VITE_*`
variable: those are compiled into the browser bundle.

## AI coach

The coach answers in three layers, cheapest first:

1. **Deterministic** — questions the app can compute are answered from the
   user's own log with no model call at all: calories left, protein left,
   macros left, water, habits, streak, weight, training minutes, daily summary.
   These are instant, free and always factual, and the UI labels them
   "Calculated from your log".
2. **Free lightweight model** — short conversational questions, served by the
   `FREE_AI_*` provider when configured, otherwise by DeepSeek.
3. **DeepSeek-V4.1-Flash** (`deepseek-flash`) — multi-day analysis, planning
   and comparison questions, or anything the router flags as reasoning-heavy.

The router is a pure function of the question (`src/convex/ai/router.ts`) and
is covered by tests. Fallback between providers is bounded: the first provider
is retried once on a timeout, every other provider is tried once, and a
rejected API key or unknown model id aborts immediately instead of fanning out.

Per-user limits: 30 questions per hour with a 1.5 s minimum gap. Every request
records route, provider, model, latency and failure reason in `coachUsage` —
never prompts, and never credentials.

The coach is instructed not to invent data, to separate observations from
recommendations, and to defer to a professional for medical questions.

## Guest mode

Guest data lives in `sessionStorage` (`vervefit-guest-data`,
`vervefit-guest-activity`, `vervefit-guest-session`, `vervefit-migrate-guest`),
which means:

- it survives reloads **within the same tab**, and is cleared when the tab is
  closed;
- it is not shared between tabs or devices;
- creating an account migrates it (see below).

**Migration is crash-safe.** The order is always
`snapshot → upload → confirm → clear`: nothing is removed from the guest store
until the server has accepted the import, the flag that triggers the import is
the last thing cleared, and the import carries a batch key that is stored in
the same transaction as the rows it guards, so a retry can never duplicate
data.


# Using Authentication (Important!)

You must follow these conventions when using authentication.

## Auth is already set up.

All convex authentication functions are already set up. The auth currently uses email OTP and anonymous users, but can support more.

The email OTP configuration is defined in `src/convex/auth/emailOtp.ts`. DO NOT MODIFY THIS FILE.

Also, DO NOT MODIFY THESE AUTH FILES: `src/convex/auth.config.ts` and `src/convex/auth.ts`.

## Using Convex Auth on the backend

On the `src/convex/users.ts` file, you can use the `getCurrentUser` function to get the current user's data.

## Using Convex Auth on the frontend

The `/auth` page is already set up to use auth. Navigate to `/auth` for all log in / sign up sequences.

You MUST use this hook to get user data. Never do this yourself without the hook:
```typescript
import { useAuth } from "@/hooks/use-auth";

const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

## Protected Routes

The starter `/dashboard` route is protected with `RequireAuth`. Extend that page
for the product's authenticated experience, and reuse `RequireAuth` when adding
another protected route — do NOT hand-roll a redirect to `/auth`, since landing
on a bare sign-in form with no explanation of what was blocked is confusing.

`RequireAuth` states the block on the page the visitor asked for and sends them
to `/auth?returnTo=<current route>` when they choose to sign in, so they come
back to it. Pass `title` and `description` to say what the page is:

```tsx
<Route
  path="/dashboard"
  element={
    <RequireAuth
      title="Sign in to view your dashboard"
      description="Your projects and settings live here."
    >
      <Dashboard />
    </RequireAuth>
  }
/>
```

Pass `redirectImmediately` for a route where bouncing straight to `/auth` really
is better.

## Auth Page

The auth page is defined in `src/pages/Auth.tsx`. Send sign-in and sign-up actions
to `/auth`.

## Authorization

You can perform authorization checks on the frontend and backend.

On the frontend, you can use the `useAuth` hook to get the current user's data and authentication state.

You should also be protecting queries, mutations, and actions at the base level, checking for authorization securely.

## Adding a redirect after auth

The `/auth` route in `src/main.tsx` redirects to `/dashboard` by default. If the
product's main authenticated route is different, update `redirectAfterAuth` to
that route. A validated same-origin `returnTo` query parameter takes priority so
users can resume the protected page they originally requested. Never leave an
authenticated product redirecting back to the public landing page.

## Complete authenticated products

When the requested product implies accounts, a workspace, a dashboard, or other
signed-in functionality, the task is not complete with only a landing page and
auth form. Build the main authenticated experience, protect its route, and verify
that signing in reaches it.

# Frontend Conventions

You will be using the Vite frontend with React 19, Tailwind v4, and Shadcn UI.

Generally, pages should be in the `src/pages` folder, and components should be in the `src/components` folder.

Shadcn primitives are located in the `src/components/ui` folder and should be used by default.

## Page routing

Your page component should go under the `src/pages` folder.

When adding a page, update the react router configuration in `src/main.tsx` to include the new route you just added.

## Shad CN conventions

Follow these conventions when using Shad CN components, which you should use by default.
- Remember to use "cursor-pointer" to make the element clickable
- For title text, use the "tracking-tight font-bold" class to make the text more readable
- Always make apps MOBILE RESPONSIVE. This is important
- AVOID NESTED CARDS. Try and not to nest cards, borders, components, etc. Nested cards add clutter and make the app look messy.
- AVOID SHADOWS. Avoid adding any shadows to components. stick with a thin border without the shadow.
- Avoid skeletons; instead, use the loader2 component to show a spinning loading state when loading data.


## Landing Pages

You must always create good-looking designer-level styles to your application. 
- Make it well animated and fit a certain "theme", ie neo brutalist, retro, neumorphism, glass morphism, etc

Use known images and emojis from online.

If the user is logged in already, show the get started button to say "Dashboard" or "Profile" instead to take them there.

## Responsiveness and formatting

Make sure pages are wrapped in a container to prevent the width stretching out on wide screens. Always make sure they are centered aligned and not off-center.

Always make sure that your designs are mobile responsive. Verify the formatting to ensure it has correct max and min widths as well as mobile responsiveness.

- Always create sidebars for protected dashboard pages and navigate between pages
- Always create navbars for landing pages
- On these bars, the created logo should be clickable and redirect to the index page

## Animating with Framer Motion

You must add animations to components using Framer Motion. It is already installed and configured in the project.

To use it, import the `motion` component from `framer-motion` and use it to wrap the component you want to animate.


### Other Items to animate
- Fade in and Fade Out
- Slide in and Slide Out animations
- Rendering animations
- Button clicks and UI elements

Animate for all components, including on landing page and app pages.

## Testing

Tests live in `tests/` and run with `bun test` (no extra dependency — bun is
already the package manager). They cover the coach router and fallback policy,
the deterministic answers and prompt bounds, crash-safe guest migration, date
and streak arithmetic across month/year boundaries, nutrition maths, protein
suggestions, and training program/swap resolution.

```bash
bun run test
```


## Colors

You can override colors in: `src/index.css`

This uses the oklch color format for tailwind v4.

Always use these color variable names.

Make sure all ui components are set up to be mobile responsive and compatible with both light and dark mode.

Set theme using `dark` or `light` variables at the parent className.

## Styling and Theming

When changing the theme, always change the underlying theme of the shad cn components app-wide under `src/components/ui` and the colors in the index.css file.

Avoid hardcoding in colors unless necessary for a use case, and properly implement themes through the underlying shad cn ui components.

When styling, ensure buttons and clickable items have pointer-click on them (don't by default).

Always follow a set theme style and ensure it is tuned to the user's liking.

## Toasts

You should always use toasts to display results to the user, such as confirmations, results, errors, etc.

Use the shad cn Sonner component as the toaster. For example:

```
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
export function SonnerDemo() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event has been created", {
          description: "Sunday, December 03, 2023 at 9:00 AM",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        })
      }
    >
      Show Toast
    </Button>
  )
}
```

Remember to import { toast } from "sonner". Usage: `toast("Event has been created.")`

## Dialogs

Always ensure your larger dialogs have a scroll in its content to ensure that its content fits the screen size. Make sure that the content is not cut off from the screen.

Ideally, instead of using a new page, use a Dialog instead. 

# Using the Convex backend

You will be implementing the convex backend. Follow your knowledge of convex and the documentation to implement the backend.

## The Convex Schema

You must correctly follow the convex schema implementation.

The schema is defined in `src/convex/schema.ts`.

Do not include the `_id` and `_creationTime` fields in your queries (it is included by default for each table).
Do not index `_creationTime` as it is indexed for you. Never have duplicate indexes.


## Convex Actions: Using CRUD operations

When running anything that involves external connections, you must use a convex action with "use node" at the top of the file.

You cannot have queries or mutations in the same file as a "use node" action file. Thus, you must use pre-built queries and mutations in other files.

You can also use the pre-installed internal crud functions for the database:

```ts
// in convex/users.ts
import { crud } from "convex-helpers/server/crud";
import schema from "./schema.ts";

export const { create, read, update, destroy } = crud(schema, "users");

// in some file, in an action:
const user = await ctx.runQuery(internal.users.read, { id: userId });

await ctx.runMutation(internal.users.update, {
  id: userId,
  patch: {
    status: "inactive",
  },
});
```


## Common Convex Mistakes To Avoid

When using convex, make sure:
- Document IDs are referenced as `_id` field, not `id`.
- Document ID types are referenced as `Id<"TableName">`, not `string`.
- Document object types are referenced as `Doc<"TableName">`.
- Keep schemaValidation to false in the schema file.
- You must correctly type your code so that it passes the type checker.
- You must handle null / undefined cases of your convex queries for both frontend and backend, or else it will throw an error that your data could be null or undefined.
- Always use the `@/folder` path, with `@/convex/folder/file.ts` syntax for importing convex files.
- This includes importing generated files like `@/convex/_generated/server`, `@/convex/_generated/api`
- Remember to import functions like useQuery, useMutation, useAction, etc. from `convex/react`
- NEVER have return type validators.
