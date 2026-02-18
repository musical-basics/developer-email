-- Seed: Populate email_chains tables from existing hardcoded registry data
-- Run this AFTER the migration to preserve existing chain definitions

-- ============================================================
-- Chain 1: DreamPlay Onboarding
-- ============================================================
INSERT INTO email_chains (id, slug, name, description, trigger_label, trigger_event)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'dreamplay-onboarding-chain',
  'DreamPlay Onboarding',
  'The main sales funnel. Introduces DreamPlay, announces the crowdfund, then branches based on engagement.',
  'New subscriber signup (webhook)',
  'chain.dreamplay.start'
);

-- Steps for DreamPlay Onboarding
INSERT INTO chain_steps (chain_id, position, label, template_key, wait_after) VALUES
('a1000000-0000-0000-0000-000000000001', 1, 'The Intro', 'dp_intro', '2 days'),
('a1000000-0000-0000-0000-000000000001', 2, 'Crowdfund Announcement', 'dp_crowdfund', '2 days');

-- Branches for DreamPlay Onboarding
INSERT INTO chain_branches (chain_id, description, position, label, condition, action) VALUES
('a1000000-0000-0000-0000-000000000001', 'After 2 emails, checks subscriber engagement to decide the next step.', 1, 'High Interest', 'Clicked a link in either email', 'Tags subscriber "DreamPlay High Interest" → sends urgency email (dp_urgency)'),
('a1000000-0000-0000-0000-000000000001', 'After 2 emails, checks subscriber engagement to decide the next step.', 2, 'Low Interest', 'Opened but didn''t click', 'Tags subscriber "DreamPlay Low Interest" → hands off to Educational Chain'),
('a1000000-0000-0000-0000-000000000001', 'After 2 emails, checks subscriber engagement to decide the next step.', 3, 'Ghosted', 'Didn''t open either email', 'Hands off to Educational Chain');

-- ============================================================
-- Chain 2: Educational Drip
-- ============================================================
INSERT INTO email_chains (id, slug, name, description, trigger_label, trigger_event)
VALUES (
  'a2000000-0000-0000-0000-000000000002',
  'educational-drip-chain',
  'Educational Drip',
  'Weekly piano tips with dynamic frequency capping. Slows down to monthly after 3 consecutive misses.',
  'Handed off from DreamPlay chain (low interest / ghosted)',
  'chain.educational.start'
);

-- Steps for Educational Drip
INSERT INTO chain_steps (chain_id, position, label, template_key, wait_after) VALUES
('a2000000-0000-0000-0000-000000000002', 1, 'Self-Taught Mistakes', 'edu_1', '7 days (dynamic)'),
('a2000000-0000-0000-0000-000000000002', 2, 'Memorization Framework', 'edu_2', '7 days (dynamic)'),
('a2000000-0000-0000-0000-000000000002', 3, 'Scales Debate', 'edu_3', '7 days (dynamic)'),
('a2000000-0000-0000-0000-000000000002', 4, 'Playing Fast', 'edu_4', '7 days (dynamic)'),
('a2000000-0000-0000-0000-000000000002', 5, 'Warm-Up Exercise', 'edu_5', NULL);
