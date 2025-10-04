-- Create normalized campaign tables to replace campaign_metrics

-- Keywords table
CREATE TABLE IF NOT EXISTS campaign_keywords (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER NOT NULL REFERENCES campaign_analyses(id) ON DELETE CASCADE,
  campaign_name VARCHAR(255) NOT NULL,
  ad_group_name VARCHAR(255),
  keyword TEXT NOT NULL,
  match_type VARCHAR(50),
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0.00,
  ctr DECIMAL(5,4) DEFAULT 0.0000,
  quality_score VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ads table  
CREATE TABLE IF NOT EXISTS campaign_ads (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER NOT NULL REFERENCES campaign_analyses(id) ON DELETE CASCADE,
  campaign_name VARCHAR(255) NOT NULL,
  ad_group_name VARCHAR(255),
  ad_text TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0.00,
  ctr DECIMAL(5,4) DEFAULT 0.0000,
  ad_strength VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Geographic performance table
CREATE TABLE IF NOT EXISTS campaign_geography (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER NOT NULL REFERENCES campaign_analyses(id) ON DELETE CASCADE,
  campaign_name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0.00,
  ctr DECIMAL(5,4) DEFAULT 0.0000,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaign_keywords_analysis_id ON campaign_keywords(analysis_id);
CREATE INDEX IF NOT EXISTS idx_campaign_keywords_campaign_name ON campaign_keywords(campaign_name);
CREATE INDEX IF NOT EXISTS idx_campaign_keywords_keyword ON campaign_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_campaign_keywords_quality_score ON campaign_keywords(quality_score);

CREATE INDEX IF NOT EXISTS idx_campaign_ads_analysis_id ON campaign_ads(analysis_id);
CREATE INDEX IF NOT EXISTS idx_campaign_ads_campaign_name ON campaign_ads(campaign_name);
CREATE INDEX IF NOT EXISTS idx_campaign_ads_ad_group_name ON campaign_ads(ad_group_name);

CREATE INDEX IF NOT EXISTS idx_campaign_geography_analysis_id ON campaign_geography(analysis_id);
CREATE INDEX IF NOT EXISTS idx_campaign_geography_campaign_name ON campaign_geography(campaign_name);
CREATE INDEX IF NOT EXISTS idx_campaign_geography_location ON campaign_geography(location);
