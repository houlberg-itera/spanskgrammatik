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
```bash
npm run dev
```

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

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
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
