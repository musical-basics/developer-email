# Inngest Lessons Learned

> Documented from a debugging session on 2026-02-25 investigating why wait times
> in email chains were being skipped in production.

---

## The Problem

Email chains with a configured wait period (e.g., "1 minute" between Step 1 and Step 2)
were executing all steps instantly — both emails arrived within seconds of each other,
completely ignoring the `wait_after` field stored in the database.

---

## The Root Cause

**The `genericChainRunner` function had a "resume from DB" optimization that
conflicted with Inngest's replay model.**

```typescript
// ❌ THE BUG (inngest/functions/chains/generic.ts)
let startIndex = 0;
if (processId) {
    const { data: proc } = await supabase
        .from("chain_processes")
        .select("current_step_index")
        .eq("id", processId)
        .single();
    startIndex = proc?.current_step_index || 0;
}

for (let i = startIndex; i < chain.steps.length; i++) {
    // ... send email ...
    // ... log-sent (updates current_step_index to i+1) ...
    // ... step.sleep (SKIPPED because loop restarts at i+1) ...
}
```

### Why It Happened

Inngest step functions work via **HTTP replay**. When `step.sleep()` is called:

1. The function **shuts down completely** (the HTTP request ends)
2. After the sleep timer expires, Inngest **re-invokes the function from line 1**
3. All previously completed `step.run()` calls are **memoized** — they return
   instantly with their cached results
4. The function then executes the **next unmemoized step**

The fatal sequence:

| Step | What Happens |
|------|-------------|
| 1 | Inngest invokes function → `log-sent-0` executes → updates `current_step_index = 1` in DB |
| 2 | Function returns to Inngest |
| 3 | Inngest invokes function again (to execute `step.sleep`) |
| 4 | Function restarts from line 1 → reads `current_step_index = 1` from DB |
| 5 | Loop starts at `i = 1`, **completely skipping `i = 0`** |
| 6 | `step.sleep("wait-after-step-0")` at `i = 0` is **never reached** |
| 7 | Both emails fire instantly with no wait |

### The Fix

```typescript
// ✅ THE FIX
// Always start from 0 — Inngest's step memoization handles replay.
// DO NOT read startIndex from DB — updating current_step_index before sleep
// causes the loop to skip past pending sleeps on replay.
const startIndex = 0;
```

Inngest's memoization already handles "resuming" — completed steps replay in
milliseconds. The DB-based `startIndex` was **redundant and harmful**.

---

## Roadblocks Encountered

### 1. Local Dev Server Fast-Forwards Sleeps

When running the Inngest dev server locally (`npx inngest-cli@latest dev`), **all
`step.sleep()` calls are fast-forwarded** — they complete instantly. This made it
impossible to test wait times locally. We had to deploy to production to observe
actual sleep behavior.

### 2. Inngest Synced to Stale Vercel Preview URLs

After deploying to Vercel, the Inngest cloud app was synced to an **ephemeral
Vercel preview URL** (e.g., `https://dreamplay-email-abc123.vercel.app/api/inngest`)
instead of the stable production URL (`https://email.dreamplaypianos.com/api/inngest`).

This meant Inngest was running **old, frozen function code** from a previous
deployment. Even after pushing fixes and seeing Vercel mark the deployment as
"Ready," the changes didn't take effect because Inngest was hitting the wrong URL.

**Fix:** Manually re-synced the Inngest app to use the production domain.

### 3. Vercel Build Caching

Even after re-syncing Inngest to the correct URL, we couldn't confirm whether the
latest code was actually deployed. Adding new `step.run()` steps (like `debug-wait-0`)
between existing memoized steps didn't appear in the Inngest trace.

**Fix:** Added a `_codeVersion` marker to the `load-chain` step's return value —
a field we could see in the Inngest trace output to confirm code freshness.

### 4. New Step IDs Invisible Between Existing Steps

When we added a new `step.run("debug-wait-0", ...)` between the existing
`log-sent-0` and `check-status-1` steps, **it never appeared in the trace** even
though the code was confirmed deployed (via the `_codeVersion` marker).

This was caused by the root bug: `startIndex` was already set to 1 on replay,
so the loop skipped past `i = 0` entirely, and the new step at `i = 0` was never
encountered.

### 5. Misdiagnosis: Closure Variables in Replay

We initially suspected that Inngest's replay mechanism didn't properly resolve
closure variables (like `stepDef.wait_after`) between step invocations. We
restructured the code to return the wait decision from inside `step.run()`.

While this is **correct best practice** for Inngest (all flow-control decisions
should use returned values from `step.run()`), it wasn't the actual root cause.
The loop simply never reached the sleep code because of `startIndex`.

---

## Debugging Steps Taken (Chronological)

1. **Verified DB data** — Confirmed `wait_after = "1 minutes"` was correctly stored
   in the `chain_steps` table.

2. **Checked `parseWaitDuration`** — Confirmed it correctly parses "1 minutes" into
   `{ inngestDuration: "1m", ms: 60000 }`.

3. **Stopped local dev server** — Ruled out the dev server fast-forwarding sleeps.

4. **Added debug logging step** (`debug-wait-0`) — Never appeared in trace. Misleading
   because the root cause was the loop skipping, not a code issue.

5. **Fixed Inngest sync URL** — Changed from preview URL to production domain.

6. **Added `_codeVersion` marker** to `load-chain` return — Confirmed code was
   deployed. This was the breakthrough that proved the deployment was correct.

7. **Embedded debug data in `log-sent-0`** — Since `log-sent-0` was the only step
   confirmed to execute, we added `_debug_shouldWait: true` to its return value.
   This proved the wait condition was true.

8. **Restructured wait logic** — Moved wait decision inside `step.run()` return
   value. Correct practice but didn't fix the bug.

9. **Identified `startIndex` as root cause** — Realized the DB-based `startIndex`
   was causing the loop to skip past `i = 0` on replay, missing the sleep step.

10. **Removed `startIndex` DB read** — Set `startIndex = 0` always. **This fixed it.**

---

## Key Inngest Rules

### 1. Never Use External State to Control Loop Iteration

Inngest replays your entire function from line 1 on every step execution. If you
read mutable state (like a DB field) to determine where to start a loop, and that
state was updated by a previous step, the loop will skip over pending steps.

```typescript
// ❌ BAD — DB state changes between invocations
let startIndex = await getFromDB("current_step_index"); // changes after each step
for (let i = startIndex; i < steps.length; i++) { ... }

// ✅ GOOD — let memoization handle replay
for (let i = 0; i < steps.length; i++) { ... }
```

### 2. Return Flow-Control Decisions from `step.run()`

All if/else decisions that gate `step.sleep()` or other steps should use the
**returned value** of a `step.run()`, not closure variables from the outer scope.

```typescript
// ✅ GOOD
const result = await step.run("compute", async () => {
    return { shouldWait: true, duration: "1m" };
});
if (result.shouldWait) {
    await step.sleep("wait", result.duration);
}
```

### 3. Always `await` Every Step

Every `step.run()`, `step.sleep()`, `step.sleepUntil()`, and `step.waitForEvent()`
must be `await`-ed. Without `await`, the function continues immediately.

### 4. Local Dev Server ≠ Production

The Inngest dev server fast-forwards all sleeps. To test actual wait behavior,
you must deploy to a production or preview environment.

### 5. Verify Inngest Sync URL

After deployment, always verify the Inngest app is synced to the **production URL**
(`https://email.dreamplaypianos.com/api/inngest`), not a Vercel preview URL.
Go to **Inngest Dashboard → Apps** and check the synced URL.

### 6. Use Return Value Markers to Verify Deployments

When debugging production, add a version marker to a step's return value to
confirm whether the latest code is actually running:

```typescript
const data = await step.run("load-data", async () => {
    return { ...actualData, _v: "abc123" }; // visible in trace output
});
```
