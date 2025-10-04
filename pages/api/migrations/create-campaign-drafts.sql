-- Create campaign_drafts table
CREATE TABLE IF NOT EXISTS campaign_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  campaign_data JSONB NOT NULL,
  generated_copy JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'exported')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_campaign_drafts_user_id ON campaign_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_drafts_status ON campaign_drafts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_drafts_updated_at ON campaign_drafts(updated_at DESC);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaign_drafts_updated_at 
    BEFORE UPDATE ON campaign_drafts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
