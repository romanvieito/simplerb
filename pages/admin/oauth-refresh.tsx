import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';

interface TokenHealth {
  status: 'healthy' | 'expired' | 'unknown';
  lastChecked: string | null;
  error?: string;
}

export default function OAuthRefresh() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [tokenHealth, setTokenHealth] = useState<TokenHealth>({ status: 'unknown', lastChecked: null });
  const [isChecking, setIsChecking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    if (!isLoaded || !user) return;

    // Check token health on load
    checkTokenHealth();
  }, [isLoaded, user]);

  const checkTokenHealth = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/oauth/check-health');
      const result = await response.json();
      setTokenHealth({
        status: result.healthy ? 'healthy' : 'expired',
        lastChecked: new Date().toISOString(),
        error: result.error
      });
    } catch (error) {
      setTokenHealth({
        status: 'expired',
        lastChecked: new Date().toISOString(),
        error: 'Failed to check token health'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const initiateOAuthFlow = () => {
    if (!customerId || customerId.trim().length === 0) {
      alert('Please enter your Google Ads customer ID (no dashes).');
      return;
    }

    setIsRefreshing(true);

    // Generate OAuth URL
    const clientId = process.env.NEXT_PUBLIC_GADS_CLIENT_ID ||
      '263912475921-vblhu1ecqsqha47k7tsp13coh3he7c17.apps.googleusercontent.com';

    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://www.simplerb.com/oauth/callback'
      : 'http://localhost:3000/oauth/callback';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/adwords')}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(customerId.replace(/-/g, ''))}`;

    // Redirect to Google OAuth
    window.location.href = authUrl;
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Refresh Google Ads Connection
          </h1>
          <p className="text-gray-600">
            Reconnect your Google Ads account when tokens expire
          </p>
        </div>

            {/* Token Health Status */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Token Health Status</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <div className="flex items-center space-x-2">
                    {tokenHealth.status === 'healthy' && (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 font-medium">Healthy</span>
                      </>
                    )}
                    {tokenHealth.status === 'expired' && (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-red-700 font-medium">Expired</span>
                      </>
                    )}
                    {tokenHealth.status === 'unknown' && (
                      <>
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <span className="text-gray-700 font-medium">Unknown</span>
                      </>
                    )}
                  </div>
                </div>

                {tokenHealth.lastChecked && (
                  <div className="text-sm text-gray-600">
                    Last checked: {new Date(tokenHealth.lastChecked).toLocaleString()}
                  </div>
                )}

                {tokenHealth.error && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {tokenHealth.error}
                  </div>
                )}

                <button
                  onClick={checkTokenHealth}
                  disabled={isChecking}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChecking ? 'Checking...' : 'Check Token Health'}
                </button>
              </div>
            </div>

            {/* Token Refresh Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Refresh Token</h2>

              {tokenHealth.status === 'expired' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-red-600">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Token Expired
                      </h3>
                      <p className="text-sm text-red-700 mt-1">
                        Your Google Ads API token has expired. Refresh it to continue using AdPilot features.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  How to refresh your token:
                </h3>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Ads Customer ID (no dashes)
                  </label>
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="1234567890"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used to link your own Google Ads account.</p>
                </div>
                <ol className="text-sm text-blue-700 space-y-1 mb-4">
                  <li>1. Click the "Start OAuth Flow" button below</li>
                  <li>2. Sign in to your Google account</li>
                  <li>3. Authorize the application to access Google Ads</li>
                  <li>4. You'll be redirected back with a new token</li>
                </ol>

                <button
                  onClick={initiateOAuthFlow}
                  disabled={isRefreshing}
                  className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isRefreshing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Starting OAuth Flow...</span>
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      <span>Start OAuth Flow</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-yellow-600">💡</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Important Notes
                  </h3>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    <li>• Tokens expire every 6 months and need periodic renewal</li>
                    <li>• Only admins can refresh tokens for security</li>
                    <li>• The OAuth flow requires Google account access with Google Ads permissions</li>
                    <li>• After refreshing, the new token will be available in the application</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
