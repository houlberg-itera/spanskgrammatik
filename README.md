<<<<<<< HEAD
# Spanskgrammatik - Spanish Grammar Learning App

En dansk app til at lære spansk grammatik med AI-baserede øvelser og progressiv levelopstigning.

## 🌟 Funktioner

- **AI-genererede øvelser**: Personlige øvelser baseret på OpenAI GPT-4
- **Niveau-baseret læring**: A1, A2, og B1 niveauer med låst progression
- **Dansk interface**: Alle instruktioner og forklaringer på dansk
- **Øjeblikkelig feedback**: Detaljerede forklaringer for hvert svar
- **Progresstracking**: Følg din fremgang gennem hvert niveau
- **Autentifikation**: Sikker brugerregistrering og login

## 🚀 Teknologier

- **Frontend**: Next.js 15 med App Router, React 19, TypeScript
- **Backend**: Supabase (Database, Auth, Real-time)
- **AI**: OpenAI GPT-4 API
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## 📋 Installation

1. **Klon projektet**:
   ```bash
   git clone <repository-url>
   cd Spanskgrammatik
   ```

2. **Installer afhængigheder**:
   ```bash
   npm install
   ```

3. **Opsæt miljøvariabler**:
   Kopier `.env.local.example` til `.env.local` og udfyld:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Opsæt database**:
   - Opret et Supabase projekt
   - **Vigtigt**: Deaktiver email bekræftelse i Supabase Dashboard:
     - Gå til Authentication > Settings
     - Sæt "Enable email confirmations" til OFF
   - Kør SQL scripts fra `supabase/schema.sql`
   - Valgfrit: Kør `supabase/sample_exercises.sql` for testdata

5. **Start udviklingsserver**:
   ```bash
   npm run dev
   ```

## 🗃️ Database Schema

### Tabeller:
- `users` - Brugerprofiles
- `levels` - Sprogniveauer (A1, A2, B1)
- `topics` - Grammatikemner per niveau
- `exercises` - Øvelser og spørgsmål
- `user_progress` - Brugerens fremgang per øvelse
- `user_level_progress` - Fremgang per niveau

### RLS Sikkerhed:
- Brugere kan kun se deres egne data
- Offentlig læseadgang til øvelser og emner
- Automatisk brugerprofil ved registrering

## 🎯 Brugerflow

1. **Registrering/Login**: Bruger opretter konto eller logger ind
2. **Dashboard**: Oversigt over niveauer og fremgang
3. **Niveau-valg**: Vælg mellem A1, A2, B1 (låst progression)
4. **Emneoversigt**: Se emner og tilgængelige øvelser
5. **Øvelser**: Udfør interaktive grammatikøvelser
6. **Fremgang**: Automatisk opdatering af niveau når 80% er bestået

## 🤖 AI Integration

### OpenAI GPT-4:
- Genererer øvelser baseret på emne og niveau
- Personlig feedback på brugerens svar
- Danske forklaringer med spanske eksempler

### Øvelsestyper:
- Multiple choice
- Udfyld-blankt
- Oversættelse
- Verbumbøjning

## 🔧 Udvikling

### Kør i udviklingsmodus:
=======
# 🇪🇸 Spanskgrammatik - Spanish Learning for Danish Speakers

An AI-powered Spanish grammar learning application specifically designed for Danish speakers. Built with modern web technologies including Next.js 15, Supabase, and OpenAI integration.

## ✨ Features

### 🎯 Core Learning Features
- **Level-based Progression**: A1, A2, B1 language levels with locked progression
- **AI-Generated Exercises**: Personalized exercises created by OpenAI GPT-4
- **Multiple Exercise Types**: Multiple choice, fill-in-blank, translation, and conjugation
- **Danish Interface**: All instructions and explanations in Danish
- **Real-time Progress Tracking**: Save progress automatically and track statistics
- **80% Completion Requirement**: Must achieve 80% to unlock next level

### 🔧 Technical Features
- **Modern Architecture**: Next.js 15 with App Router and TypeScript
- **Authentication**: Secure user registration and login with Supabase Auth
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Styling**: Responsive design with Tailwind CSS
- **AI Integration**: OpenAI API for dynamic exercise generation

## 🚀 Live Demo

🔗 **Repository**: [https://github.com/houlberg-itera/spanskgrammatik](https://github.com/houlberg-itera/spanskgrammatik)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI**: OpenAI GPT-4 for exercise generation
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/houlberg-itera/spanskgrammatik.git
cd spanskgrammatik
npm install
```

### 2. Environment Setup
Copy the environment template:
```bash
cp .env.local.example .env.local
```

Add your configuration to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

### 3. Database Setup
1. Create a new Supabase project
2. Run the schema setup:
```sql
-- Copy and run the contents of supabase/schema.sql
```
3. Add sample data:
```sql
-- Copy and run the contents of supabase/sample_exercises.sql
```

### 4. Start Development
>>>>>>> b7a9fe9a12675191bf20a1adbaf25ba95debfb4c
```bash
npm run dev
```

<<<<<<< HEAD
### Build til produktion:
```bash
npm run build
npm start
```

### Linting:
```bash
npm run lint
```

## 📁 Projektstruktur
=======
Visit `http://localhost:3000` to see the application.

## 📚 Project Structure
>>>>>>> b7a9fe9a12675191bf20a1adbaf25ba95debfb4c

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
<<<<<<< HEAD
│   ├── auth/              # Autentifikationssider
│   ├── dashboard/         # Dashboard side
│   ├── level/[level]/     # Niveau-specifikke sider
│   └── exercise/[id]/     # Øvelsessider
├── components/            # React komponenter
├── lib/                   # Hjælpefunktioner
│   ├── supabase/         # Supabase klienter
│   └── openai.ts         # OpenAI integration
└── types/                 # TypeScript typer

supabase/
├── schema.sql            # Database schema
└── sample_exercises.sql  # Eksempel øvelser
```

## 🚀 Deployment

### Vercel (Anbefalet):
1. Push kode til GitHub
2. Forbind repository til Vercel
3. Tilføj miljøvariabler i Vercel dashboard
4. Deploy automatisk

### Miljøvariabler for produktion:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- `OPENAI_API_KEY`

## 🧪 Test Bruger

Når du har sat databasen op, kan du:
1. Registrere en ny bruger
2. Starte med A1 niveau
3. Prøve eksempel øvelserne (hvis indlæst)
4. Arbejde dig op gennem niveauerne

## 🤝 Bidrag

1. Fork projektet
2. Opret en feature branch
3. Commit dine ændringer
4. Push til branch
5. Åbn en Pull Request

## 📄 Licens

Dette projekt er open source - se LICENSE filen for detaljer.

## 🛠️ Fejlfinding

### Almindelige problemer:

**Build fejl**: Sørg for at alle miljøvariabler er sat korrekt
**Database forbindelse**: Tjek Supabase URL og nøgler
**AI øvelser**: Verificer OpenAI API nøgle har gyldige credits

### Support:
Opret et issue i GitHub repository for hjælp.
=======
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── exercise/          # Exercise pages
│   ├── level/             # Level overview pages
│   └── article-training/  # Article training page
├── components/            # React components
│   ├── ExercisePlayer.tsx # Main exercise component
│   ├── LevelCard.tsx      # Level selection cards
│   └── ProgressErrorHandler.tsx # Error recovery
├── lib/                   # Utilities and configurations
│   └── supabase/          # Supabase client setup
├── types/                 # TypeScript type definitions
└── styles/                # Global styles
```

## 🗄️ Database Schema

### Core Tables
- **exercises**: Exercise content and metadata
- **user_progress**: Individual user progress tracking
- **profiles**: User profile information

### Key Features
- Row Level Security (RLS) for data protection
- Automatic progress calculation
- Level-based content organization

## 🎮 User Journey

1. **Registration**: Create account with email/password
2. **Level Selection**: Start with A1 (beginner level)
3. **Exercise Completion**: Complete interactive grammar exercises
4. **Progress Tracking**: Automatic progress saving and statistics
5. **Level Progression**: Unlock A2 after 80% completion of A1
6. **Advanced Learning**: Progress through A2 to B1

## 🔧 Available Exercise Types

### 📝 Multiple Choice
Choose the correct answer from multiple options with detailed explanations.

### 🔤 Fill in the Blank
Complete sentences with the correct Spanish words or forms.

### 🔄 Translation
Translate between Danish and Spanish with context-aware feedback.

### 📖 Conjugation
Practice Spanish verb conjugations with immediate feedback.

## 🤖 AI Integration

The application uses OpenAI GPT-4 to:
- Generate personalized exercises based on user level
- Provide contextual explanations in Danish
- Create varied question types for comprehensive learning
- Adapt difficulty based on user performance

## 🔒 Security Features

- **Authentication**: Secure user registration and login
- **Row Level Security**: Database-level access control
- **API Protection**: Middleware-based route protection
- **Environment Variables**: Secure credential management

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

## 🧪 Testing

The application includes comprehensive testing for:
- Authentication flow
- Exercise completion
- Progress saving
- AI exercise generation
- Database operations

Run tests with:
```bash
npm run test
```

## 📈 Recent Updates

### ✅ Version 1.0 - Core Functionality
- Complete authentication system
- Exercise player with progress saving
- Level-based progression
- AI exercise generation
- Danish language interface
- Modern Supabase integration

### 🔧 Technical Improvements
- Direct database operations for reliable progress saving
- Modern import patterns throughout application
- Comprehensive error handling and recovery
- Schema-compliant database operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/houlberg-itera/spanskgrammatik/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/houlberg-itera/spanskgrammatik/discussions)

## 🙏 Acknowledgments

- **Danish Language Support**: Native Danish instructions and explanations
- **Modern Web Technologies**: Built with the latest Next.js and React features
- **AI-Powered Learning**: Leveraging OpenAI for personalized education
- **Open Source Community**: Built with love for language learners

---

**Made with ❤️ for Danish speakers learning Spanish** 🇩🇰 ➡️ 🇪🇸
>>>>>>> b7a9fe9a12675191bf20a1adbaf25ba95debfb4c
