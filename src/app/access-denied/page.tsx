'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AccessDenied() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email || null);
    };
    getUser();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Access Denied Icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🚫 Adgang Nægtet
            </h2>
            
            <div className="text-gray-600 mb-6">
              <p className="mb-2">
                Du har ikke tilladelse til at få adgang til administratorområdet.
              </p>
              {userEmail && (
                <p className="text-sm bg-gray-100 p-2 rounded">
                  Logget ind som: <span className="font-mono">{userEmail}</span>
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                ℹ️ Administrator Adgang
              </h3>
              <p className="text-sm text-blue-700">
                Kun godkendte administratorer kan få adgang til admin-panelet. 
                Kontakt systemadministratoren hvis du mener, du skal have adgang.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                📚 Gå til Din Dashboard
              </Link>
              
              <Link
                href="/auth"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                🔐 Skift Bruger
              </Link>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>
                Hvis du er administrator og har problemer med adgang, 
                kontakt support eller tjek at din email er tilføjet til ADMIN_EMAILS.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}