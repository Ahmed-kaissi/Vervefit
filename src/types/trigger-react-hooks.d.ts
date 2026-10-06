// Ambient types for @trigger.dev/react-hooks while the package is not yet
// installed in this workspace. The real package ships its own types; delete
// this file once "@trigger.dev/react-hooks" is added to package.json and
// installed.
//
// The real react-hooks package exports a `useRun` hook whose first argument is
// a Trigger.dev task and whose options include `payload`, `onSuccess`, and
// `onError`. The exact callback types depend on the task's payload/return types,
// so we type the callbacks loosely here and let the real package tighten them
// once it is present.

declare module "@trigger.dev/react-hooks" {
  /**
   * The real Trigger.dev `Task` type is opaque to this ambient declaration, so
   * we only require the `id` field. The react-hooks package accepts the real
   * `Task` object; once @trigger.dev/react-hooks is installed its own types win.
   */
  export interface TaskRef<TPayload = unknown, TReturn = unknown> {
    id: string;
  }

  interface UseRunOptions<TPayload = unknown, TReturn = unknown> {
    payload?: TPayload;
    onSuccess?: (output: TReturn) => void;
    onError?: (error: unknown) => void;
  }

  /**
   * Returns a run function for `task`. The real package also streams real-time
   * run state back to the consumer; here we only model the invocation/callback
   * surface so the admin UI compiles until the package is present.
   */
  export function useRun<TPayload = unknown, TReturn = unknown>(
    task: TaskRef<TPayload, TReturn>,
    options?: UseRunOptions<TPayload, TReturn>,
  ): () => Promise<void>;
}
