/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as ai_answers from "../ai/answers.js";
import type * as ai_context from "../ai/context.js";
import type * as ai_dispatch from "../ai/dispatch.js";
import type * as ai_provider from "../ai/provider.js";
import type * as ai_router from "../ai/router.js";
import type * as ai_types from "../ai/types.js";
import type * as aiFacts from "../aiFacts.js";
import type * as aiServer from "../aiServer.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as habits from "../habits.js";
import type * as http from "../http.js";
import type * as lib_dates from "../lib/dates.js";
import type * as meals from "../meals.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  "ai/answers": typeof ai_answers;
  "ai/context": typeof ai_context;
  "ai/dispatch": typeof ai_dispatch;
  "ai/provider": typeof ai_provider;
  "ai/router": typeof ai_router;
  "ai/types": typeof ai_types;
  aiFacts: typeof aiFacts;
  aiServer: typeof aiServer;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  habits: typeof habits;
  http: typeof http;
  "lib/dates": typeof lib_dates;
  meals: typeof meals;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
