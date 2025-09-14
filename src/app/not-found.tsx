export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Side ikke fundet</h2>
        <p className="text-gray-600 mb-8">Siden du leder efter eksisterer ikke.</p>
        <a 
          href="/" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Tilbage til forsiden
        </a>
      </div>
    </div>
  );
}