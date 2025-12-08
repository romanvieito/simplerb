import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAuth } from '@clerk/nextjs/server';
import { GetServerSideProps } from 'next';

interface OAuthCallbackProps {
  userId: string | null;
  isAdmin: boolean;
}

export default function OAuthCallback({ userId, isAdmin }: OAuthCallbackProps) {
  const router = useRouter();
  const { code, error, state } = router.query;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [customerId, setCustomerId] = useState<string>('');

  useEffect(() => {
    if (!code && !error) return;

    // Populate customer ID from state if provided
    if (typeof state === 'string' && state.trim().length > 0) {
      setCustomerId(state);
    }

    if (error) {
      setStatus('error');
      setMessage(`OAuth error: ${error}`);
      return;
    }

    if (code && typeof code === 'string') {
      exchangeCodeForToken(code);
    }
  }, [code, error, state]);

  const exchangeCodeForToken = async (authorizationCode: string) => {
    if (!customerId || customerId.trim().length === 0) {
      setStatus('error');
      setMessage('Customer ID is required to complete Google Ads connection.');
      return;
    }

    try {
      setStatus('loading');
      setMessage('Exchanging authorization code for refresh token...');

      const response = await fetch('/api/oauth/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: authorizationCode,
          userId: userId,
          customerId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus('success');
        setMessage('✅ Token refreshed successfully! You can now use Google Ads features.');

        // Redirect back to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(result.error || 'Failed to exchange token');
        console.error('Token exchange failed:', result);
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error occurred. Please try again.');
      console.error('Token exchange error:', err);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mb-4">
            <span className="text-4xl">{getStatusIcon()}</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Google Ads OAuth Callback
          </h1>

          <div className={`text-lg mb-6 ${getStatusColor()}`}>
            {status === 'loading' && (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Processing...</span>
              </div>
            )}
            {status === 'success' && 'Token Refreshed Successfully!'}
            {status === 'error' && 'Token Refresh Failed'}
          </div>

          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {status !== 'success' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Ads Customer ID (no dashes)
              </label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 1234567890"
              />
              <p className="text-xs text-gray-500 mt-1">You can copy this from your Google Ads account.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <p className="text-green-800 text-sm">
                Redirecting to dashboard in 3 seconds...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/oauth-refresh')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { userId } = getAuth(context.req);

  // OAuth callback should be accessible to any authenticated user
  // (they started the OAuth flow, so they should be able to complete it)
  if (!userId) {
    return {
      redirect: {
        destination: '/sign-in',
        permanent: false,
      },
    };
  }

  return {
    props: {
      userId: userId,
      isAdmin: false, // Not needed for callback page
    },
  };
};
