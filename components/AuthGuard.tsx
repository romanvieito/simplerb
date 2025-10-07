import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  fallback = null, 
  redirectTo = '/sign-in' 
}: AuthGuardProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoaded && !user) {
      router.push(redirectTo);
    }
  }, [isLoaded, user, router, redirectTo]);

  // Show fallback while loading or if user is not authenticated
  if (!isLoaded || !user) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {!isLoaded ? 'Checking authentication...' : 'Redirecting to sign in...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
