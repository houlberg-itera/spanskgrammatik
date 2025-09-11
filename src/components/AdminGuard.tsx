'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface AdminGuardProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export default function AdminGuard({ children, loadingComponent }: AdminGuardProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      setChecking(true);
      setError(null);

      // First check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth?message=Admin access requires authentication');
        return;
      }

      // Check admin status via API
      const response = await fetch('/api/check-admin');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to check admin status');
      }

      if (!data.isAdmin) {
        router.push('/access-denied');
        return;
      }
      
      setIsAdmin(true);
    } catch (error) {
      console.error('Admin access check failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      router.push('/access-denied');
    } finally {
      setChecking(false);
    }
  };

  // Show custom loading component or default loading screen
  if (checking) {
    return loadingComponent || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificerer administrator adgang...</p>
          {error && (
            <p className="text-red-600 text-sm mt-2">Fejl: {error}</p>
          )}
        </div>
      </div>
    );
  }

  // Show error state if there was an error and we're not redirecting
  if (error && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Administrator Adgang Fejl</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Gå til Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Don't render admin content if not admin
  if (!isAdmin) {
    return null;
  }

  // Render protected admin content
  return <>{children}</>;
}