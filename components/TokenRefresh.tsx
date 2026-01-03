import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface TokenRefreshProps {
  variant?: 'button' | 'link' | 'small';
  className?: string;
}

export default function TokenRefresh({ variant = 'button', className = '' }: TokenRefreshProps) {
  const { user } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshToken = () => {
    if (!user) return;

    setIsRefreshing(true);
    window.open('/admin/oauth-refresh', '_blank');
    setTimeout(() => setIsRefreshing(false), 1000); // Reset after opening
  };

  if (!user) return null;

  if (variant === 'link') {
    return (
      <button
        onClick={refreshToken}
        disabled={isRefreshing}
        className={`text-blue-600 hover:text-blue-800 underline text-sm ${className}`}
      >
        {isRefreshing ? 'Opening...' : 'Refresh Google Ads connection'}
      </button>
    );
  }

  if (variant === 'small') {
    return (
      <button
        onClick={refreshToken}
        disabled={isRefreshing}
        className={`px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 ${className}`}
      >
        {isRefreshing ? '...' : '🔗 Refresh'}
      </button>
    );
  }

  // Default button variant
  return (
    <button
      onClick={refreshToken}
      disabled={isRefreshing}
      className={`px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 ${className}`}
    >
      {isRefreshing ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
          <span>Opening...</span>
        </>
      ) : (
        <>
          <span>🔗</span>
          <span>Refresh Google Ads</span>
        </>
      )}
    </button>
  );
}
