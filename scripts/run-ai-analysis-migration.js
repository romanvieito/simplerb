/**
 * Script to run the AI Campaign Analyses table migration
 * 
 * Usage:
 *   node scripts/run-ai-analysis-migration.js
 * 
 * Or make a POST request to:
 *   http://localhost:3000/api/migrations/create-ai-campaign-analyses-table
 *   (when dev server is running)
 */

const https = require('https');
const http = require('http');

const url = process.env.MIGRATION_URL || 'http://localhost:3000/api/migrations/create-ai-campaign-analyses-table';

const urlObj = new URL(url);
const client = urlObj.protocol === 'https:' ? https : http;

const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log(`Running migration: ${url}`);
console.log('Please ensure your Next.js server is running...\n');

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (res.statusCode === 200) {
        console.log('✅ Migration successful!');
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.error('❌ Migration failed:');
        console.error(JSON.stringify(result, null, 2));
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Error parsing response:');
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error making request:');
  console.error(error.message);
  console.error('\n💡 Make sure your Next.js dev server is running:');
  console.error('   npm run dev');
  process.exit(1);
});

req.end();

