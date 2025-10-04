-- Create campaign_analyses table
CREATE TABLE IF NOT EXISTS campaign_analyses (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  upload_date TIMESTAMP DEFAULT NOW(),
  campaign_count INTEGER DEFAULT 0,
  analysis_status VARCHAR(50) DEFAULT 'completed',
  recommendations JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create campaign_metrics table
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER NOT NULL REFERENCES campaign_analyses(id) ON DELETE CASCADE,
  campaign_name VARCHAR(255) NOT NULL,
  ad_group_name VARCHAR(255),
  keyword TEXT,
  match_type VARCHAR(50),
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0.00,
  ctr DECIMAL(5,4) DEFAULT 0.0000,
  quality_score VARCHAR(50),
  ad_strength VARCHAR(50),
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaign_analyses_user_email ON campaign_analyses(user_email);
CREATE INDEX IF NOT EXISTS idx_campaign_analyses_upload_date ON campaign_analyses(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_analysis_id ON campaign_metrics(analysis_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_name ON campaign_metrics(campaign_name);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_keyword ON campaign_metrics(keyword);

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_campaign_analyses_updated_at ON campaign_analyses;

CREATE TRIGGER update_campaign_analyses_updated_at 
    BEFORE UPDATE ON campaign_analyses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
