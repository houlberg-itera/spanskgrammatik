'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TargetLanguage } from '@/types/database';
import LanguageSelector from '@/components/LanguageSelector';
import AppHeader from '@/components/AppHeader';
import Link from 'next/link';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('es');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      setUser(session.user);

      // Fetch user's current target language
      const { data: userData } = await supabase
        .from('users')
        .select('target_language')
        .eq('id', session.user.id)
        .single();

      if (userData) {
        setTargetLanguage(userData.target_language || 'es');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage: TargetLanguage) => {
    if (!user) return;

    setSaving(true);
    setMessage('');

    try {
      // Update target_language in users table
      const { error } = await supabase
        .from('users')
        .update({ target_language: newLanguage })
        .eq('id', user.id);

      if (error) throw error;

      setTargetLanguage(newLanguage);
      setMessage('Sprog ændret succesfuldt! 🎉');
      
      // Reload the page after a short delay to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error updating language:', error);
      setMessage('Der opstod en fejl. Prøv igen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Indlæser...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader showUserInfo={true} pageTitle="Indstillinger" />
      
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Tilbage til dashboard
          </Link>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Indstillinger</h1>
          <p className="text-gray-600 mb-8">Administrer dine præferencer</p>

          {/* Language Selection Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Hvilket sprog vil du lære?
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Vælg det sprog du vil øve dig i. Din fremgang gemmes separat for hvert sprog.
            </p>

            <LanguageSelector
              selectedLanguage={targetLanguage}
              onLanguageChange={handleLanguageChange}
              variant="default"
            />

            {message && (
              <div className={`mt-4 p-4 rounded-lg ${
                message.includes('fejl') 
                  ? 'bg-red-50 text-red-700' 
                  : 'bg-green-50 text-green-700'
              }`}>
                {message}
              </div>
            )}

            {saving && (
              <div className="mt-4 text-center text-gray-600">
                Gemmer ændringer...
              </div>
            )}
          </div>

          {/* User Info Section */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Kontoinformation
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Nuværende sprog:</span>
                <span className="font-medium text-gray-900">
                  {targetLanguage === 'es' ? '🇪🇸 Español' : '🇵🇹 Português'}
                </span>
              </div>
            </div>
          </div>

          {/* Warning about progress */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 text-xl">ℹ️</span>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Om sprogskift
                </h3>
                <p className="text-sm text-blue-800">
                  Når du skifter sprog, vil du se øvelser og emner for det nye sprog. 
                  Din fremgang i hvert sprog gemmes separat, så du kan skifte frem og 
                  tilbage uden at miste din fremgang.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
