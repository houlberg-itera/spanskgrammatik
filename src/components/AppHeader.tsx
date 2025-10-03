'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  display_name?: string;
}

interface AppHeaderProps {
  showUserInfo?: boolean;
  pageTitle?: string;
}

export default function AppHeader({ showUserInfo = true, pageTitle }: AppHeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (user) {
        setUser({
          id: user.id,
          email: user.email || '',
          display_name: user.user_metadata?.display_name,
        });
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="bg-white shadow-md border-b-2 border-blue-100">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Brand Section with Duck */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-green-500 p-2 rounded-xl">
                <Image 
                  src="/duck.svg" 
                  alt="Spanskgrammatik Duck" 
                  width={32} 
                  height={32}
                  className="filter brightness-0 invert"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  Spanskgrammatik
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  {pageTitle || "Lær spansk grammatik nemt"}
                </p>
              </div>
            </div>
          </div>

          {/* User Info and Actions */}
          {showUserInfo && user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700">
                    {user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{pageTitle || 'Dashboard'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="hidden sm:block bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Log ud
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}