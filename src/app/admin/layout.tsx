import Link from 'next/link';
import { ReactNode } from 'react';
import AdminGuard from '@/components/AdminGuard';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const adminPages = [
    { href: '/admin/dashboard', label: '📊 Dashboard', description: 'Oversigt over bruger performance og øvelses behov' },
    { href: '/admin/exercise-generator', label: '🤖 AI Øvelses Generator', description: 'Bulk generering af AI øvelser' },
    { href: '/admin/ai-config', label: '⚙️ AI Konfiguration', description: 'GPT-5 system status og konfiguration' },
    { href: '/admin/proficiency-analysis', label: '📈 Proficiency Analyse', description: 'Detaljeret bruger performance analyse' },
    { href: '/admin/content-management', label: '📚 Indhold Styring', description: 'Administrer emner og øvelser' },
    { href: '/admin/user-management', label: '👥 Bruger Administration', description: 'Administrer brugere og administratorer' },
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Navigation Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex-shrink-0">
                  ← Tilbage til App
                </Link>
                <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  🔧 DuckLingo Admin
                </h1>
              </div>
              <div className="text-sm text-gray-500 text-center sm:text-left">
                Administrator Panel
              </div>
            </div>
          </div>
        </div>

        {/* Admin Navigation Menu */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:space-x-8 overflow-x-auto py-4 space-y-4 sm:space-y-0">
              {adminPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="flex-shrink-0 group w-full sm:w-auto"
                >
                  <div className="text-center min-w-0 sm:min-w-[200px] p-4 rounded-lg border-2 border-transparent hover:border-blue-200 hover:bg-blue-50 transition-all">
                    <div className="text-base sm:text-lg mb-2 truncate">{page.label}</div>
                    <div className="text-xs text-gray-600 group-hover:text-blue-700 leading-relaxed">
                      {page.description}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      {/* Admin Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              DuckLingo Admin Panel - AI-drevet sprogindlæring for danske talere
            </div>
            <div>
              Udviklet med Next.js, Supabase og OpenAI
            </div>
          </div>
        </div>
      </footer>
    </div>
    </AdminGuard>
  );
}
