-- Add conversion tracking columns to normalized campaign tables

-- Add conversion columns to campaign_keywords table
ALTER TABLE campaign_keywords 
ADD COLUMN IF NOT EXISTS conversions DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10,2) DEFAULT 0.00;

-- Add conversion columns to campaign_ads table
ALTER TABLE campaign_ads 
ADD COLUMN IF NOT EXISTS conversions DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10,2) DEFAULT 0.00;

-- Add conversion columns to campaign_geography table
ALTER TABLE campaign_geography 
ADD COLUMN IF NOT EXISTS conversions DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10,2) DEFAULT 0.00;
