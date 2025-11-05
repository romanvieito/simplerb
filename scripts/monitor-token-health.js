#!/usr/bin/env node

/**
 * Automated Google Ads Token Health Monitor
 *
 * This script runs automated checks and can send alerts when tokens need renewal.
 * Set this up as a cron job to run daily.
 *
 * Usage:
 * node scripts/monitor-token-health.js [--alert-only]
 */

const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({path: '.env.local'});

const {
  GADS_CLIENT_ID,
  GADS_CLIENT_SECRET,
  GADS_REFRESH_TOKEN
} = process.env;

const ALERT_ONLY = process.argv.includes('--alert-only');

// Token health history file
const historyFile = path.join(__dirname, '..', '.token-health-history.json');

// Load history
let history = [];
try {
  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
  }
} catch (error) {
  console.warn('Could not load token history:', error.message);
}

function saveHistory() {
  try {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Could not save token history:', error.message);
  }
}

function checkTokenHealth() {
  return new Promise((resolve, reject) => {
    if (!GADS_CLIENT_ID || !GADS_CLIENT_SECRET || !GADS_REFRESH_TOKEN) {
      reject(new Error('Missing required environment variables'));
      return;
    }

    const postData = querystring.stringify({
      client_id: GADS_CLIENT_ID,
      client_secret: GADS_CLIENT_SECRET,
      refresh_token: GADS_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    });

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const responseTime = Date.now() - startTime;

          const check = {
            timestamp: new Date().toISOString(),
            status: result.access_token ? 'healthy' : 'expired',
            responseTime,
            expiresIn: result.expires_in || null,
            error: result.error || null,
            errorDescription: result.error_description || null
          };

          history.push(check);

          // Keep only last 100 checks
          if (history.length > 100) {
            history = history.slice(-100);
          }

          saveHistory();

          resolve(check);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function analyzePatterns() {
  if (history.length < 2) return null;

  const recentChecks = history.slice(-30); // Last 30 checks
  const expiredChecks = recentChecks.filter(check => check.status === 'expired');

  if (expiredChecks.length === 0) return null;

  // Calculate average time between expirations
  const expirationTimestamps = expiredChecks.map(check => new Date(check.timestamp).getTime());
  const intervals = [];

  for (let i = 1; i < expirationTimestamps.length; i++) {
    intervals.push(expirationTimestamps[i] - expirationTimestamps[i-1]);
  }

  const avgIntervalMs = intervals.length > 0 ?
    intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;

  const avgIntervalDays = avgIntervalMs / (1000 * 60 * 60 * 24);

  return {
    totalExpirations: expiredChecks.length,
    avgIntervalDays: Math.round(avgIntervalDays * 10) / 10,
    lastExpiration: expiredChecks[expiredChecks.length - 1].timestamp,
    patternDetected: avgIntervalDays < 30 // If expiring more often than monthly
  };
}

async function main() {
  try {
    console.log('🔍 Checking Google Ads token health...');

    const result = await checkTokenHealth();
    const patterns = await analyzePatterns();

    if (result.status === 'healthy') {
      if (!ALERT_ONLY) {
        console.log('✅ Token is healthy');
        console.log(`   Response time: ${result.responseTime}ms`);
        console.log(`   Expires in: ${result.expiresIn}s`);
      }

      if (patterns && patterns.patternDetected) {
        console.log('\n⚠️  WARNING: Unusual expiration pattern detected!');
        console.log(`   Average expiration interval: ${patterns.avgIntervalDays} days`);
        console.log(`   Total expirations: ${patterns.totalExpirations}`);
        console.log('   This indicates tokens are expiring too frequently.');
        console.log('   Consider investigating:');
        console.log('   - Multiple applications using same credentials');
        console.log('   - Concurrent API calls from different environments');
        console.log('   - Rate limiting or abuse detection by Google');
      }
    } else {
      console.log('❌ TOKEN EXPIRED - ACTION REQUIRED');
      console.log(`   Error: ${result.error}`);
      console.log(`   Description: ${result.errorDescription}`);

      if (patterns) {
        console.log('\n📊 Expiration Pattern Analysis:');
        console.log(`   Average interval: ${patterns.avgIntervalDays} days`);
        console.log(`   Last expiration: ${patterns.lastExpiration}`);
        console.log(`   Pattern indicates frequent issues: ${patterns.patternDetected ? 'YES' : 'NO'}`);
      }

      console.log('\n🚨 IMMEDIATE ACTION NEEDED:');
      console.log('   1. node get-new-refresh-token.js');
      console.log('   2. Complete OAuth flow');
      console.log('   3. node exchange-ads-code.js <code>');
      console.log('   4. Update both local and production environments');

      // Exit with error code for monitoring systems
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkTokenHealth, analyzePatterns };
