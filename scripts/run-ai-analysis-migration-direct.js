/**
 * Direct database migration script for AI Campaign Analyses table
 * This script runs the migration directly without needing the HTTP server
 * 
 * Usage:
 *   node scripts/run-ai-analysis-migration-direct.js
 * 
 * Make sure your database environment variables are set:
 *   POSTGRES_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL_NON_POOLING
 */

const { sql } = require('@vercel/postgres');

async function runMigration() {
  try {
    console.log('🔄 Running AI Campaign Analyses table migration...\n');

    // Create ai_campaign_analyses table
    await sql`
      CREATE TABLE IF NOT EXISTS ai_campaign_analyses (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        analysis_text TEXT NOT NULL,
        date_range_start DATE NOT NULL,
        date_range_end DATE NOT NULL,
        campaign_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Created ai_campaign_analyses table');

    // Create indexes for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_ai_campaign_analyses_user_email ON ai_campaign_analyses(user_email)
    `;
    console.log('✅ Created index on user_email');
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_ai_campaign_analyses_created_at ON ai_campaign_analyses(created_at DESC)
    `;
    console.log('✅ Created index on created_at');

    // Create trigger function if it doesn't exist
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;
    console.log('✅ Created/updated trigger function');

    // Create trigger if it doesn't exist
    await sql`
      DROP TRIGGER IF EXISTS update_ai_campaign_analyses_updated_at ON ai_campaign_analyses
    `;
    
    await sql`
      CREATE TRIGGER update_ai_campaign_analyses_updated_at 
          BEFORE UPDATE ON ai_campaign_analyses 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `;
    console.log('✅ Created trigger for updated_at\n');

    console.log('🎉 Migration completed successfully!');
    console.log('   The ai_campaign_analyses table is now ready to use.\n');

  } catch (error) {
    console.error('❌ Migration error:');
    console.error(error);
    
    if (error.message && error.message.includes('environment variable')) {
      console.error('\n💡 Make sure your database environment variables are set:');
      console.error('   POSTGRES_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL_NON_POOLING');
    }
    
    process.exit(1);
  }
}

runMigration();

