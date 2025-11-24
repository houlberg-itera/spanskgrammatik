import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Indlæser...</div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
