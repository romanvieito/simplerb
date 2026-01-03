import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';

const STORAGE_KEY = 'google_ads_customer_id';

export default function OAuthRefresh() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [customerId, setCustomerId] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load customer ID from localStorage and database
  useEffect(() => {
    const loadCustomerId = async () => {
      if (!user) return;

      try {
        // First, try to get from database
        const response = await fetch('/api/user/google-ads-customer-id');
        if (response.ok) {
          const data = await response.json();
          if (data.customerId) {
            setCustomerId(data.customerId);
            // Also save to localStorage as backup
            localStorage.setItem(STORAGE_KEY, data.customerId);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn('Could not load customer ID from database:', error);
      }

      // Fallback to localStorage
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        setCustomerId(savedId);
      }

      setIsLoading(false);
    };

    if (isLoaded && user) {
      loadCustomerId();
    } else if (isLoaded && !user) {
      // For anonymous users, just load from localStorage
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        setCustomerId(savedId);
      }
      setIsLoading(false);
    }
  }, [isLoaded, user]);

  // Save to localStorage whenever customer ID changes
  useEffect(() => {
    if (customerId && !isLoading) {
      localStorage.setItem(STORAGE_KEY, customerId);
    }
  }, [customerId, isLoading]);

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
      ? 'https://simplerb.com/oauth/callback'
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Refresh Token
              </h1>
              <p className="text-gray-600">
                Connect your Google Ads account
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Ads Customer ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={isLoading ? 'Loading...' : customerId}
                    onChange={(e) => setCustomerId(e.target.value.replace(/-/g, ''))}
                    placeholder="1234567890"
                    disabled={isLoading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  {customerId && !isLoading && (
                    <button
                      onClick={() => setCustomerId('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear customer ID"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {customerId && !isLoading ? (
                    <span className="text-green-600">✓ Using saved customer ID</span>
                  ) : (
                    'Find this in your Google Ads account URL (remove dashes)'
                  )}
                </p>
              </div>

              <button
                onClick={initiateOAuthFlow}
                disabled={isRefreshing || !customerId.trim()}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isRefreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>🔗</span>
                    <span>Connect Google Ads</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <a
                  href="/dashboard"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ← Back to dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
