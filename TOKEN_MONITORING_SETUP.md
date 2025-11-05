# 🔍 Google Ads Token Monitoring & Prevention Guide

## Problem: Weekly Token Expiration

If your Google Ads OAuth tokens are expiring every week (instead of every 6 months), this indicates a systematic issue that needs investigation and prevention.

## 🚨 Root Causes

### 1. **Concurrent Usage from Multiple Environments**
- Local development and production using the same OAuth credentials simultaneously
- Google detects suspicious usage patterns and revokes tokens

### 2. **Frequent API Calls**
- Automated processes or cron jobs making too many API calls
- Rate limiting triggers token revocation

### 3. **Environment Mismatches**
- Different tokens in local vs production
- Token conflicts between deployments

### 4. **Google Security Policies**
- Google's abuse detection may revoke tokens showing unusual patterns

## 🛡️ Prevention Strategies

### 1. **Separate Credentials for Environments**

**Option A: Different OAuth Clients (Recommended)**
```bash
# Create separate OAuth clients in Google Cloud Console:
# 1. Development client (simplerb-dev)
# 2. Production client (simplerb-prod)

# Local .env.local
GADS_CLIENT_ID=dev_client_id
GADS_CLIENT_SECRET=dev_client_secret
GADS_REFRESH_TOKEN=dev_refresh_token

# Production (Vercel)
GADS_CLIENT_ID=prod_client_id
GADS_CLIENT_SECRET=prod_client_secret
GADS_REFRESH_TOKEN=prod_refresh_token
```

**Option B: Same Client, Different Tokens**
- Use same OAuth client but different refresh tokens
- Ensure local and production never use tokens simultaneously

### 2. **Automated Monitoring System**

#### Daily Health Checks
```bash
# Add to crontab (run daily at 9 AM)
0 9 * * * cd /path/to/simplerb && npm run monitor:token >> /var/log/token-monitor.log 2>&1
```

#### Alert-Only Mode
```bash
# Silent monitoring (only alerts on failures)
0 9 * * * cd /path/to/simplerb && npm run monitor:token:alert
```

#### Weekly Pattern Analysis
```bash
# Run weekly to analyze expiration patterns
0 9 * * 1 cd /path/to/simplerb && node scripts/monitor-token-health.js
```

### 3. **Token Rotation Strategy**

#### Automatic Renewal (45 days)
```bash
# Crontab: Check every 45 days and auto-renew if needed
0 9 1,15 * * cd /path/to/simplerb && ./scripts/auto-renew-token.sh
```

#### Manual Renewal Schedule
- [ ] Mark calendar for token renewal every 5 months
- [ ] Set reminders 1 week before expiration
- [ ] Test renewal process monthly

### 4. **API Usage Optimization**

#### Rate Limiting
```javascript
// Add to Google Ads client setup
const client = new GoogleAdsApi({
  // ... other config
  rate_limits: {
    requests_per_minute: 30,  // Conservative limits
    burst_size: 10
  }
});
```

#### Request Batching
```javascript
// Instead of multiple small requests, batch them
const campaigns = await customer.campaigns.list({
  constraints: { ... },
  limit: 1000  // Get more data per request
});
```

## 📊 Monitoring Dashboard

### Health Check Commands
```bash
# Quick check
npm run check:token

# Detailed monitoring
npm run monitor:token

# Alert-only mode
npm run monitor:token:alert
```

### History Analysis
```bash
# View token expiration history
cat .token-health-history.json | jq '.[] | select(.status == "expired") | .timestamp'

# Analyze patterns
node -e "
const history = require('./.token-health-history.json');
const expired = history.filter(h => h.status === 'expired');
console.log('Total expirations:', expired.length);
if (expired.length > 1) {
  const intervals = [];
  for (let i = 1; i < expired.length; i++) {
    intervals.push((new Date(expired[i].timestamp) - new Date(expired[i-1].timestamp)) / (1000*60*60*24));
  }
  console.log('Average days between expirations:', (intervals.reduce((a,b)=>a+b,0)/intervals.length).toFixed(1));
}
"
```

## 🔧 Implementation Steps

### Step 1: Immediate Actions
```bash
# 1. Check current token health
npm run check:token

# 2. Start monitoring
npm run monitor:token

# 3. Analyze current patterns
cat .token-health-history.json | tail -10
```

### Step 2: Environment Separation
```bash
# Option 1: Separate OAuth clients
# Create new OAuth client in Google Cloud Console
# Update local .env.local with dev credentials
# Update Vercel production with prod credentials

# Option 2: Token separation
# Generate separate refresh tokens for local and production
# Ensure they don't conflict
```

### Step 3: Automated Monitoring
```bash
# Add to crontab
crontab -e

# Add these lines:
# Daily token health check
0 9 * * * cd /path/to/simplerb && npm run monitor:token:alert

# Weekly detailed analysis
0 9 * * 1 cd /path/to/simplerb && npm run monitor:token
```

### Step 4: Alert System
```bash
# Email alerts (example using mail)
0 9 * * * cd /path/to/simplerb && npm run monitor:token:alert || echo "Token expired!" | mail -s "URGENT: Google Ads Token Expired" your-email@example.com
```

## 📈 Expected Results

After implementing these strategies:

- ✅ **Token expiration**: Should return to normal 6-month cycle
- ✅ **Early detection**: Automatic alerts before issues occur
- ✅ **Reduced downtime**: Proactive renewal prevents service disruption
- ✅ **Better monitoring**: Historical data helps identify patterns

## 🚨 Emergency Response

If tokens still expire frequently:

1. **Immediate**: Check for concurrent usage
2. **Investigate**: Review access logs for unusual patterns
3. **Contact Google**: If legitimate usage, contact Google Ads API support
4. **Alternative**: Consider using service account authentication

## 📝 Documentation Updates

Keep this updated:
- Token renewal dates
- Environment configurations
- Monitoring results
- Issue patterns and resolutions

## 🔗 Related Files

- `scripts/monitor-token-health.js` - Automated monitoring
- `scripts/check-token-health.js` - Manual health checks
- `.token-health-history.json` - Health check history
- `REFRESH_TOKEN_MAINTENANCE.md` - Renewal procedures
