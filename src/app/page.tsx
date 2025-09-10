import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="z-10 w-full max-w-5xl items-center justify-center text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-8">
          Velkommen til Spanskgrammatik
        </h1>
        <p className="text-xl text-gray-700 mb-12 max-w-3xl mx-auto">
          Lær spansk grammatik med AI-baserede øvelser tilpasset danske studerende. 
          Arbejd dig op gennem niveauerne A1, A2 og B1 med interaktive øvelser og øjeblikkelig feedback.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
          <Link
            href="/auth"
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Kom i gang nu
          </Link>
          <Link
            href="/auth"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Log ind
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-3xl mb-4">🎯</div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Niveau A1</h2>
            <p className="text-gray-600">
              Begynder niveau med grundlæggende grammatik, verbum &ldquo;ser&rdquo; og &ldquo;estar&rdquo;, samt grundlæggende substantiver.
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-3xl mb-4">🚀</div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Niveau A2</h2>
            <p className="text-gray-600">
              Elementær niveau med datid, uregelmæssige verbum og komparativ/superlativ former.
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-3xl mb-4">🏆</div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Niveau B1</h2>
            <p className="text-gray-600">
              Mellem niveau med konjunktiv, betinget modus og komplekse sætningsstrukturer.
            </p>
          </div>
        </div>

        <div className="mt-16 bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Hvorfor Spanskgrammatik?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-600">🤖 AI-baserede øvelser</h3>
              <p className="text-gray-600">
                Få personlige øvelser genereret af kunstig intelligens, der tilpasser sig dit niveau og dine behov.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-600">🇩🇰 Tilpasset danske studerende</h3>
              <p className="text-gray-600">
                Alle instruktioner og forklaringer er på dansk, så du kan fokusere på at lære spansk grammatik.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-600">📈 Progressiv læring</h3>
              <p className="text-gray-600">
                Arbejd dig systematisk op gennem niveauerne. Du kan kun gå videre når du har mestret det forrige niveau.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-600">⚡ Øjeblikkelig feedback</h3>
              <p className="text-gray-600">
                Få øjeblikkelig feedback på dine svar med detaljerede forklaringer af grammatikreglerne.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
