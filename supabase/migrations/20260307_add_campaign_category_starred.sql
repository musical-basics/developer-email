-- Add category and starred fields to campaigns table for template organization
-- Category: free-text label for grouping templates (e.g. "Promo", "Onboarding", "Seasonal")
-- is_starred_template: pins template to top of "Send Existing Campaign" modal

ALTER TABLE campaigns ADD COLUMN category TEXT DEFAULT NULL;
ALTER TABLE campaigns ADD COLUMN is_starred_template BOOLEAN DEFAULT false;
