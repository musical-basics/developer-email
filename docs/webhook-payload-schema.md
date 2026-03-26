# Webhook Payload Schema

## POST `/api/webhooks/subscribe`

Subscribes or upserts a user. Workspace defaults to `dreamplay_marketing`.

```json
{
  "email": "user@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "tags": ["Website Import", "Piano"],
  "city": "Los Angeles",
  "country": "US",
  "ip_address": "1.2.3.4",
  "temp_session_id": "optional-session-uuid",
  "workspace": "dreamplay_marketing"
}
```

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `email` | string | **Yes** | — | Subscriber email |
| `first_name` | string | No | `""` | |
| `last_name` | string | No | `""` | |
| `tags` | string[] | No | `["Website Import"]` | Merged with existing tags |
| `city` | string | No | — | Geo data |
| `country` | string | No | — | Geo data |
| `ip_address` | string | No | — | |
| `temp_session_id` | string | No | — | For pre-signup event stitching |
| `workspace` | string | No | `dreamplay_marketing` | One of: `dreamplay_marketing`, `dreamplay_support`, `musicalbasics`, `crossover` |

---

## POST `/api/webhooks/shopify-order`

Processes a Shopify order webhook. Workspace is set via **URL query param**.

```
POST /api/webhooks/shopify-order?workspace=dreamplay_marketing
```

The body is the raw Shopify order JSON (standard Shopify webhook payload). The `workspace` parameter defaults to `dreamplay_marketing` if omitted.

| Query Param | Type | Required | Default |
|-------------|------|----------|---------|
| `workspace` | string | No | `dreamplay_marketing` |

---

## Workspace ENUM Values

```
dreamplay_marketing | dreamplay_support | musicalbasics | crossover
```

The composite unique constraint on `subscribers` is `UNIQUE(email, workspace)`. This means the same email can exist in multiple workspaces as separate rows with different UUIDs.
