import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Database } from '@/types/database';
import ArticleTrainer from '@/components/ArticleTrainer';
import ArticleExerciseGenerator from '@/components/ArticleExerciseGenerator';

export default async function ArticlePage() {
  const supabase = await createClient();
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Get user profile to determine level
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('current_level')
    .eq('user_id', session.user.id)
    .single();

  const userLevel = profile?.current_level || 'A1';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📝 Spansk Artikel Træning
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Mestre brugen af spanske artikler (el, la, un, una) med dansk sammenligning og AI-drevne øvelser
          </p>
          <div className="mt-4 inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium">
            Dit niveau: {userLevel}
          </div>
        </div>

        {/* Key Differences Overview */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔑 Nøgleforskelle</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🇩🇰 Dansk System</h3>
              <ul className="text-blue-800 space-y-1">
                <li><strong>Ubestemt:</strong> en/et (ingen kønsforskel)</li>
                <li><strong>Bestemt:</strong> -en/-et (suffiks)</li>
                <li><strong>Eksempel:</strong> en hund → hunden</li>
                <li><strong>Eksempel:</strong> et æble → æblet</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">🇪🇸 Spansk System</h3>
              <ul className="text-red-800 space-y-1">
                <li><strong>Ubestemt:</strong> un (hankøn), una (hunkøn)</li>
                <li><strong>Bestemt:</strong> el (hankøn), la (hunkøn)</li>
                <li><strong>Eksempel:</strong> un perro → el perro</li>
                <li><strong>Eksempel:</strong> una manzana → la manzana</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation between learning modes */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📚 Læringsmetoder</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                🎯 Interaktiv Træning
              </h3>
              <p className="text-gray-600 mb-4">
                Lær grundreglerne og øv med foruddefinerede ord og mønstre
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                <li>• Detaljerede grammatikregler</li>
                <li>• Systematisk øvelse</li>
                <li>• Danske forklaringer</li>
                <li>• Undtagelser og tips</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                🤖 AI-Genererede Øvelser
              </h3>
              <p className="text-gray-600 mb-4">
                Få personaliserede øvelser genereret af AI baseret på dit niveau
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                <li>• Tilpasset dit niveau</li>
                <li>• Varierede øvelsestyper</li>
                <li>• Kontekstuelle forklaringer</li>
                <li>• Uendelige variationer</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Interactive Trainer */}
        <div className="mb-8">
          <ArticleTrainer level={userLevel} />
        </div>

        {/* AI Exercise Generator */}
        <div className="mb-8">
          <ArticleExerciseGenerator level={userLevel} />
        </div>

        {/* Quick Reference Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📖 Hurtig Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">✅ Almindelige Mønstre</h3>
              <div className="text-sm text-green-800 space-y-1">
                <p><strong>Hankøn (-o):</strong> el/un libro, perro, gato</p>
                <p><strong>Hunkøn (-a):</strong> la/una mesa, casa, silla</p>
                <p><strong>Hankøn (-e):</strong> el/un padre, nombre</p>
                <p><strong>Hunkøn (-e):</strong> la/una madre, noche</p>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Undtagelser</h3>
              <div className="text-sm text-yellow-800 space-y-1">
                <p><strong>-a men hankøn:</strong> el problema, tema, día</p>
                <p><strong>-o men hunkøn:</strong> la mano, foto, radio</p>
                <p><strong>-ma hankøn:</strong> el sistema, programa</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 Strategier</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>1. Lær ordet med artikel</p>
                <p>2. Øv høje frekvensord først</p>
                <p>3. Fokuser på mønstre</p>
                <p>4. Memorer undtagelser</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
