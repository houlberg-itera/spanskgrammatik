'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      // Give Supabase time to process the token from URL hash
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Reset password session check:', { 
        hasSession: !!session, 
        error: sessionError?.message,
        url: window.location.href 
      });
      
      if (!session) {
        // Check if there's a hash in the URL (password reset token)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        if (!accessToken || type !== 'recovery') {
          setError('Ugyldigt eller udløbet link. Anmod venligst om et nyt.');
        }
      }
      
      setChecking(false);
    };
    
    checkSession();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Adgangskoderne matcher ikke');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Adgangskoden skal være mindst 6 tegn');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth?message=password-updated');
      }, 2000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'Der opstod en fejl. Prøv venligst igen.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificerer link...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Adgangskode opdateret!
          </h1>
          <p className="text-gray-600 mb-6">
            Din adgangskode er blevet opdateret. Du bliver omdirigeret til login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🦆 DuckLingo
          </h1>
          <h2 className="text-xl font-semibold text-gray-700">
            Ny adgangskode
          </h2>
          <p className="text-gray-600 mt-2">
            Indtast din nye adgangskode nedenfor.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Ny adgangskode
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 tegn"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Bekræft adgangskode
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Gentag din nye adgangskode"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <p>{error}</p>
              {error.includes('Ugyldigt eller udløbet') && (
                <a 
                  href="/auth/forgot-password" 
                  className="block mt-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Anmod om nyt link →
                </a>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || error.includes('Ugyldigt eller udløbet')}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Opdaterer...' : 'Opdater adgangskode'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Indlæser...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
