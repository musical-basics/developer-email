# Bug: Discount Link Getting Stripped / CTA href Empty

**Date**: 2026-03-16  
**Severity**: High — CTA buttons in emails had empty `href`, breaking the primary call-to-action

---

## Symptoms

- When sending via "Send Existing Campaign" from the Audience page, the CTA button's `href` was empty/broken
- Per-user discount codes (`?discount=CODE`) were not being appended to the CTA URL
- The user had correctly configured a per-user discount and mapped it to `main_cta_url` in the discount manager

## Root Cause

AI-generated email templates use `{{main_cta_url}}` as the CTA link variable. However, this variable was **never stored in `variable_values`** — it was only resolved at runtime via global merge tags from the `app_settings` table.

This caused two cascading failures:

1. **`renderTemplate()`** iterates over `variable_values` to replace `{{variables}}`. Since `main_cta_url` wasn't a key in `variable_values`, it was left as the literal string `{{main_cta_url}}` (or replaced with `""` if it had been set to empty). Either way, the `href` was broken.

2. **Discount code injection** in all send paths (`send-campaign.ts`, `sender.ts`, `send/route.ts`, `campaigns.ts`) looked up the target URL via `campaign.variable_values?.[targetUrlKey]`. Since the key didn't exist, the lookup returned `undefined`, and the discount code was never appended.

## Failed Approaches

None — this was diagnosed correctly on the first pass by tracing the full send pipeline.

## Fix (commit `8bd9222`)

### 1. Auto-populate URL variables from saved default links

**File**: `components/editor/asset-loader.tsx`

When the editor loads saved default links, it now checks if any URL template variables (like `main_cta_url`) exist in the template but have no value in `variable_values`. If so, it auto-fills them from the saved defaults. This ensures the URL is always present when saving the campaign.

### 2. Fallback to default links for discount injection at send time

**Files**: `inngest/functions/send-campaign.ts`, `lib/chains/sender.ts`, `app/api/send/route.ts`, `app/actions/campaigns.ts`

All 4 send paths now call `getDefaultLinks("dreamplay")` and use the result as a fallback when `variable_values` doesn't have the target URL key for discount code injection:

```typescript
// Before (broken):
const targetUrl = campaign.variable_values?.[targetUrlKey];

// After (fixed):
const targetUrl = campaign.variable_values?.[targetUrlKey]
    || defaultLinks[targetUrlKey]
    || "";
```

### 3. Removed unused Send Test card

**File**: `components/campaign/campaign-launch-checks.tsx`

Removed `SendTestCard` component and `handleSendTest` handler (never used).

## Why It Worked

The fix ensures `main_cta_url` always has a value through two independent mechanisms:

- **Prevention**: Auto-populating the URL in the editor means future campaigns will have it in `variable_values`
- **Safety net**: The send-time fallback resolves the URL from global defaults even if the campaign was created before the editor fix
