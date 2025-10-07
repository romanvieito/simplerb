// Test script to verify Google Ads API setup
const { GoogleAdsApi } = require('google-ads-api');

async function testGoogleAdsSetup() {
  console.log('🧪 Testing Google Ads API Setup...\n');

  // Check environment variables
  const requiredVars = [
    'GADS_DEVELOPER_TOKEN',
    'GADS_CLIENT_ID', 
    'GADS_CLIENT_SECRET',
    'GADS_REFRESH_TOKEN',
    'GADS_LOGIN_CUSTOMER_ID'
  ];

  console.log('📋 Checking environment variables:');
  let allVarsPresent = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    const isPresent = !!value;
    console.log(`  ${isPresent ? '✅' : '❌'} ${varName}: ${isPresent ? 'Set' : 'Missing'}`);
    if (!isPresent) allVarsPresent = false;
  });

  if (!allVarsPresent) {
    console.log('\n❌ Missing required environment variables!');
    console.log('Please set all required variables in your .env.local file');
    return;
  }

  console.log('\n🔧 Testing Google Ads API connection...');

  try {
    // Create client
    const client = new GoogleAdsApi({
      client_id: process.env.GADS_CLIENT_ID,
      client_secret: process.env.GADS_CLIENT_SECRET,
      developer_token: process.env.GADS_DEVELOPER_TOKEN,
      api_version: 'v21',
    });

    console.log('✅ Google Ads API client created successfully');

    // Create customer
    const customer = client.Customer({
      customer_id: process.env.GADS_LOGIN_CUSTOMER_ID,
      refresh_token: process.env.GADS_REFRESH_TOKEN,
      login_customer_id: process.env.GADS_LOGIN_CUSTOMER_ID,
    });

    console.log('✅ Customer client created successfully');

    // Test basic query
    console.log('🔍 Testing basic API query...');
    const query = `
      SELECT 
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone
      FROM customer
      LIMIT 1
    `;
    
    const response = await customer.query(query);
    console.log('✅ API query successful!');
    console.log('📊 Customer info:', response.rows?.[0] || 'No data');

    console.log('\n🎉 Google Ads API setup is working perfectly!');
    console.log('You can now use all the enhanced features:');
    console.log('  • Campaign creation');
    console.log('  • Performance metrics');
    console.log('  • Automated optimization');
    console.log('  • Dashboard management');

  } catch (error) {
    console.log('\n❌ Error testing Google Ads API:');
    console.log('Error:', error.message);
    
    if (error.message.includes('Missing required Google Ads environment variables')) {
      console.log('\n💡 Make sure you have set all environment variables in .env.local');
    } else if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Your refresh token may be expired. Get a new one using the script.');
    } else if (error.message.includes('developer_token')) {
      console.log('\n💡 Check that your developer token is correct and approved.');
    } else {
      console.log('\n💡 Check the troubleshooting guide in GOOGLE_ADS_SETUP.md');
    }
  }
}

// Run the test
testGoogleAdsSetup();
