-- Add is_template flag to campaigns table
-- Master Templates are reusable email blueprints used in Chains and "Send Existing Campaign"
ALTER TABLE campaigns ADD COLUMN is_template BOOLEAN DEFAULT false;
