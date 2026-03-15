# Ghost SID Bug — Poisoned Templates + String Concatenation

**Date Fixed:** March 15, 2026  
**Severity:** High  
**Files Changed:** 5 files in dreamplay-email  
**Backups:** `_backup_files/ghost-sid-fix/`

---

## The Bug

~40% of visitor SIDs in the analytics dashboard were "ghost IDs" that didn't exist in the subscribers database. These ghost SIDs had UUID v7-like format (`7xxx` in the third segment) while all real Supabase UUIDs are v4 (`4xxx`).

## Root Cause

**Two problems combined:**

### 1. Poisoned Templates
AI Copilot-generated email templates contained hardcoded `?sid=GHOST&cid=GHOST` values in their HTML link URLs. These were hallucinated UUIDs baked into the template `html_content`.

### 2. Naive String Concatenation
When click tracking was OFF, all send routes used this pattern:

```typescript
const sep = url.includes('?') ? '&' : '?';
return `href=${quote}${url}${sep}sid=${sub.id}&cid=${campaignId}${quote}`;
```

Since the template URL already had `?sid=GHOST`, the code appended `&sid=REAL`, creating:
```
?sid=GHOST_SID&cid=GHOST_CID&sid=REAL_SID&cid=REAL_CID
```

### 3. URLSearchParams.get() Returns First Occurrence
When the visitor landed on the page, `URLSearchParams.get("sid")` returned the FIRST `sid` — the ghost one. The analytics tracker sent this ghost SID to `resolve-subscriber`, which returned 404.

## Failed Investigation Attempts

1. ❌ Checked Resend click tracking settings — confirmed OFF, but this wasn't the cause
2. ❌ Checked all send routes for `sub.id` usage — they all correctly used `sub.id`, but the TEMPLATE already had ghost SIDs
3. ❌ Checked website middleware — doesn't touch URL params
4. ❌ Checked blog middleware — only handles Supabase auth
5. ❌ Checked Vercel env vars — all matched correctly
6. ❌ Checked for subscriber deletions — only soft-deletes exist
7. ❌ Checked for UUID v7 migration in Supabase — not the cause
8. ❌ Checked blog's `EmailTracker.tsx` — `crypto.randomUUID()` was for `dp_temp_session`, not `dp_subscriber_id`
9. ❌ Looked for race conditions in AnalyticsTracker — this was a real bug (and was fixed), but not the cause of ghost SIDs

## The Fix

Replaced naive string concatenation with `URL.searchParams.set()` which **overwrites** any existing `sid`/`cid` params:

```typescript
try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("sid", sub.id);
    parsedUrl.searchParams.set("cid", trackingCampaignId);
    return `href=${quote}${parsedUrl.toString()}${quote}`;
} catch (e) {
    // Fallback for malformed URLs
    const sep = url.includes('?') ? '&' : '?';
    return `href=${quote}${url}${sep}sid=${sub.id}&cid=${trackingCampaignId}${quote}`;
}
```

For click tracking (ON), also strip ghost params before encoding:
```typescript
let cleanUrl = url;
try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.delete("sid");
    parsedUrl.searchParams.delete("cid");
    cleanUrl = parsedUrl.toString();
} catch (e) {}
const trackUrl = `${baseUrl}/api/track/click?u=${encodeURIComponent(cleanUrl)}&c=${campaignId}&s=${sub.id}`;
```

## Why This Worked

`URL.searchParams.set()` guarantees only ONE instance of each param key. If the template has `?sid=GHOST`, `.set("sid", REAL)` replaces it. No more duplicates.

## Files Modified

1. `app/api/send-stream/route.ts` — Both click tracking ON and OFF paths
2. `app/api/send/route.ts` — Test send path + broadcast click tracking ON/OFF
3. `app/api/send-rotation/route.ts` — Rotation send path
4. `lib/chains/sender.ts` — Chain/journey email sender
5. `app/api/webhooks/subscribe/route.ts` — Triggered automated emails

## Remaining Cleanup

- Check Admin Dashboard Settings → Default Links for any hardcoded `?sid=` values
- Check master templates in Supabase `campaigns` table for poisoned URLs in `html_content`
