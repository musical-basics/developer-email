-- CRM Engagement Scoring Function
-- Run this in your Supabase SQL Editor (Email repo database)
-- The CRM page works without this (JS fallback), but this is faster for large datasets.

CREATE OR REPLACE FUNCTION get_crm_leads()
RETURNS TABLE (
  id uuid, email text, first_name text, last_name text, tags text[], status text,
  engagement_score numeric, last_seen_at timestamptz, recent_pages text[]
) AS $$
BEGIN
  RETURN QUERY
  WITH event_scores AS (
    SELECT 
      e.subscriber_id,
      MAX(e.created_at) as last_seen_at,
      array_agg(DISTINCT e.url) FILTER (WHERE e.type = 'page_view' AND e.url IS NOT NULL) as recent_pages,
      SUM(
        -- BASE POINTS
        (CASE 
          WHEN e.type LIKE 'conversion_%' THEN 50
          WHEN e.type = 'page_view' AND (e.url LIKE '%/customize%' OR e.url LIKE '%/buy%' OR e.url LIKE '%/reserve%' OR e.url LIKE '%/checkout%') THEN 20
          WHEN e.type = 'session_end' THEN LEAST(COALESCE((e.metadata->>'duration_seconds')::numeric, 0) / 10, 20)
          WHEN e.type = 'click' THEN 10
          WHEN e.type = 'page_view' THEN 2
          WHEN e.type = 'open' THEN 1
          ELSE 0
        END)
        * 
        -- TIME DECAY MULTIPLIER
        (CASE 
          WHEN e.created_at > NOW() - INTERVAL '3 days' THEN 2.0
          WHEN e.created_at > NOW() - INTERVAL '14 days' THEN 1.0
          ELSE 0.2
        END)
      ) as score
    FROM subscriber_events e
    WHERE e.subscriber_id IS NOT NULL
    GROUP BY e.subscriber_id
  )
  SELECT 
    s.id, s.email, s.first_name, s.last_name, s.tags, s.status,
    ROUND(COALESCE(es.score, 0)::numeric + 
      (CASE WHEN 'VIP Account' = ANY(COALESCE(s.tags, ARRAY[]::text[])) THEN 30 ELSE 0 END) +
      (CASE WHEN '$300 Off Lead' = ANY(COALESCE(s.tags, ARRAY[]::text[])) THEN 40 ELSE 0 END)
    , 1) as engagement_score,
    es.last_seen_at, es.recent_pages
  FROM subscribers s
  LEFT JOIN event_scores es ON s.id = es.subscriber_id
  WHERE 
    s.status = 'active'
    AND NOT ('Purchased' = ANY(COALESCE(s.tags, ARRAY[]::text[])))
    AND NOT ('Test Account' = ANY(COALESCE(s.tags, ARRAY[]::text[])))
    AND (
      COALESCE(es.score, 0) > 5 
      OR s.tags && ARRAY['VIP Account', '$300 Off Lead', 'Free Shipping Lead', 'Hesitated at Checkout']
    )
  ORDER BY engagement_score DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;
