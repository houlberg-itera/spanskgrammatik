-- Enhanced article exercises with Danish explanations
-- These focus specifically on the difficulties Danish speakers face with Spanish articles

INSERT INTO exercises (
  topic_id, 
  title, 
  description, 
  type, 
  content, 
  correct_answer, 
  explanation, 
  difficulty,
  created_at
) VALUES

-- A1 Level: Basic Article Understanding
(
  (SELECT id FROM topics WHERE title = 'Grundlæggende Substantiver' LIMIT 1),
  'El vs La - Grundlæggende Forskel',
  'Lær forskellen mellem hankøn (el) og hunkøn (la) artikler',
  'multiple_choice',
  '{
    "question": "Hvad er den korrekte artikel for PERRO (hund)?",
    "options": ["el perro", "la perro", "un perro", "una perro"],
    "context": "I dansk siger vi ''hunden'' (bestemt form). På spansk skal vi vælge mellem el og la.",
    "danish_hint": "Perro er hankøn - ligesom de fleste ord der ender på -o"
  }',
  'el perro',
  'Perro (hund) er hankøn på spansk. Hankønsord bruger artiklen ''el'' i bestemt form. Dette svarer til danske ''-en'' endelser, men på spansk skal vi huske kønnet for hvert ord.',
  'beginner',
  NOW()
),

(
  (SELECT id FROM topics WHERE title = 'Grundlæggende Substantiver' LIMIT 1),
  'Una vs Un - Ubestemt Artikel',
  'Øv brugen af ubestemte artikler un og una',
  'multiple_choice',
  '{
    "question": "Oversæt: ''Et æble'' til spansk",
    "options": ["un manzana", "una manzana", "el manzana", "la manzana"],
    "context": "I dansk har vi kun ''et'' og ''en'' for ubestemt. På spansk skal vi vælge køn.",
    "danish_hint": "Manzana (æble) er hunkøn, selvom vi siger ''et æble'' på dansk"
  }',
  'una manzana',
  'Manzana er hunkøn på spansk, så vi bruger ''una''. Bemærk: På dansk siger vi ''et æble'', men på spansk er æble (manzana) hunkøn, så det bliver ''una manzana''.',
  'beginner',
  NOW()
),

(
  (SELECT id FROM topics WHERE title = 'Grundlæggende Substantiver' LIMIT 1),
  'Bestemt vs Ubestemt - Dansk Sammenligning',
  'Forstå hvornår man bruger bestemt vs ubestemt artikel',
  'multiple_choice',
  '{
    "question": "Oversæt: ''Hunden spiser'' (bestemt form)",
    "options": ["Un perro come", "Una perro come", "El perro come", "La perro come"],
    "context": "''Hunden'' er bestemt form på dansk (-en endelse). På spansk bruges el/la for bestemt form.",
    "danish_hint": "''Hunden'' = bestemt form = el/la (ikke un/una)"
  }',
  'El perro come',
  'På dansk bruger vi ''-en'' endelse for bestemt form (hunden). På spansk bruger vi ''el'' foran ordet i stedet for en endelse. Perro er hankøn, så det bliver ''el perro''.',
  'beginner',
  NOW()
),

-- A1 Level: Tricky Cases
(
  (SELECT id FROM topics WHERE title = 'Grundlæggende Substantiver' LIMIT 1),
  'Undtagelser: Problema (Hankøn trods -a)',
  'Lær vigtige undtagelser fra de almindelige mønstre',
  'multiple_choice',
  '{
    "question": "Hvad er den korrekte artikel for PROBLEMA (problem)?",
    "options": ["la problema", "el problema", "una problema", "un problema"],
    "context": "Problema ender på -a, men er en undtagelse fra reglen om at -a ord er hunkøn.",
    "danish_hint": "Problema er hankøn, selvom det ender på -a. Lær denne undtagelse udenad!"
  }',
  'el problema',
  'Problema er en vigtig undtagelse! Selvom det ender på -a, er det hankøn. Andre lignende ord: el tema, el sistema, el programa. Disse kommer fra græsk og beholder deres hankøn.',
  'beginner',
  NOW()
),

(
  (SELECT id FROM topics WHERE title = 'Grundlæggende Substantiver' LIMIT 1),
  'Undtagelser: Mano (Hunkøn trods -o)',
  'Øv undtagelser hvor -o ord er hunkøn',
  'multiple_choice',
  '{
    "question": "Oversæt: ''Hånden'' til spansk",
    "options": ["el mano", "la mano", "un mano", "una mano"],
    "context": "Mano (hånd) ender på -o men er en undtagelse og er hunkøn.",
    "danish_hint": "Mano er hunkøn, selvom det ender på -o. En sjælden undtagelse!"
  }',
  'la mano',
  'Mano (hånd) er hunkøn, selvom det ender på -o. Dette er en vigtig undtagelse at huske. Andre lignende: la foto (fotografi), la radio, la moto (motorcykel).',
  'beginner',
  NOW()
),

-- A2 Level: Context-Dependent Usage
(
  (SELECT id FROM topics WHERE title = 'Dagligdags Genstande' LIMIT 1),
  'Kontekst: Fra Ubestemt til Bestemt',
  'Øv skiftet mellem ubestemt og bestemt artikel i sammenhæng',
  'fill_blank',
  '{
    "question": "Udfyld: ''Jeg ser ___ hund. ___ hund er stor.'' (Veo ___ perro. ___ perro es grande.)",
    "blanks": ["___", "___"],
    "context": "Første gang nævner vi hunden (ubestemt), anden gang refererer vi til den specifikke hund (bestemt).",
    "danish_hint": "Ligesom på dansk: ''en hund'' første gang, ''hunden'' anden gang"
  }',
  '["un", "El"]',
  'Første gang nævner vi hunden, så vi bruger ubestemt artikel ''un perro''. Anden gang taler vi om den specifikke hund, så vi bruger bestemt artikel ''El perro''. Dette mønster er det samme som på dansk.',
  'intermediate',
  NOW()
),

(
  (SELECT id FROM topics WHERE title = 'Dagligdags Genstande' LIMIT 1),
  'Generalisering vs Specificering',
  'Forstå hvornår man generaliserer vs specificerer',
  'multiple_choice',
  '{
    "question": "Oversæt: ''Jeg kan lide kaffe'' (generelt, ikke en specifik kaffe)",
    "options": ["Me gusta un café", "Me gusta el café", "Me gusta la café", "Me gusta una café"],
    "context": "På dansk siger vi ofte bare ''kaffe'' uden artikel ved generalisering.",
    "danish_hint": "Café er hankøn. Ved generalisering bruger vi bestemt artikel på spansk."
  }',
  'Me gusta el café',
  'Ved generalisering (at man generelt kan lide kaffe) bruger vi bestemt artikel på spansk: ''el café''. Dette er anderledes end dansk, hvor vi ofte udelader artiklen ved generalisering.',
  'intermediate',
  NOW()
),

-- A2 Level: Complex Patterns
(
  (SELECT id FROM topics WHERE title = 'Dagligdags Genstande' LIMIT 1),
  'Ord på -e: Hvilke er hankøn/hunkøn?',
  'Lær at skelne køn på ord der ender på -e',
  'multiple_choice',
  '{
    "question": "Hvad er den korrekte artikel for NOCHE (nat)?",
    "options": ["el noche", "la noche", "un noche", "una noche"],
    "context": "Ord der ender på -e kan være både hankøn og hunkøn. Man skal lære dem individuelt.",
    "danish_hint": "Noche (nat) er hunkøn. Sammenlign med ''natten'' på dansk."
  }',
  'la noche',
  'Noche (nat) er hunkøn, så vi bruger ''la noche''. Ord på -e kan være begge køn: el padre (far), la madre (mor), el nombre (navn), la noche (nat). Man skal lære kønnet for hvert ord.',
  'intermediate',
  NOW()
),

(
  (SELECT id FROM topics WHERE title = 'Dagligdags Genstande' LIMIT 1),
  'Sammensatte Udtryk',
  'Øv artikelbrug i sammensatte udtryk og faste vendinger',
  'multiple_choice',
  '{
    "question": "Oversæt: ''På universitetet'' - ''En ___ universidad''",
    "options": ["el", "la", "un", "una"],
    "context": "Universidad er et langt ord. Hvilken artikel passer?",
    "danish_hint": "Universidad ender på -dad, som næsten altid er hunkøn"
  }',
  'la',
  'Universidad er hunkøn (la universidad). Ord der ender på -dad er næsten altid hunkøn: la ciudad (byen), la libertad (friheden), la universidad (universitetet). Dette er et pålideligt mønster.',
  'intermediate',
  NOW()
),

-- B1 Level: Advanced Distinctions
(
  (SELECT id FROM topics WHERE title = 'Abstrakte Begreber' LIMIT 1),
  'Abstrakte Substantiver',
  'Mestre artikelbrug med abstrakte begreber',
  'fill_blank',
  '{
    "question": "''___ kærlighed er vigtig'' - ''___ amor es importante''",
    "context": "Abstrakte begreber som kærlighed, frihed, osv. Hvordan behandles de?",
    "danish_hint": "Amor er hankøn. Ved abstrakte begreber bruger man ofte bestemt artikel."
  }',
  'El',
  'Ved abstrakte begreber som ''amor'' (kærlighed) bruger man typisk bestemt artikel på spansk: ''El amor es importante''. Amor er hankøn, selvom det ender på en neutral lyd.',
  'advanced',
  NOW()
),

(
  (SELECT id FROM topics WHERE title = 'Abstrakte Begreber' LIMIT 1),
  'Professionelle Titler',
  'Lær artikelbrug med erhvervs- og uddannelsestitler',
  'multiple_choice',
  '{
    "question": "''Hun er læge'' - hvilken oversættelse er mest korrekt?",
    "options": ["Ella es médica", "Ella es una médica", "Ella es la médica", "Ella es el médico"],
    "context": "Professioner kan oversættes på forskellige måder afhængigt af kontekst.",
    "danish_hint": "Tænk på om du identificerer personen eller beskriver en specifik læge"
  }',
  'Ella es médica',
  'Ved professioner bruger man typisk ikke artikel når man identificerer: ''Ella es médica'' (Hun er læge). Man bruger artikel når man specificerer: ''Ella es la médica del hospital'' (Hun er hospitalets læge).',
  'advanced',
  NOW()
),

-- B1 Level: Subtle Distinctions
(
  (SELECT id FROM topics WHERE title = 'Abstrakte Begreber' LIMIT 1),
  'Betydningsforskelle med/uden Artikel',
  'Forstå hvordan artikler kan ændre betydning',
  'multiple_choice',
  '{
    "question": "Forskel mellem ''Voy a casa'' og ''Voy a la casa''?",
    "options": [
      "Ingen forskel",
      "''casa'' = hjem, ''la casa'' = det specifikke hus",
      "''casa'' er forkert",
      "''la casa'' er forkert"
    ],
    "context": "Nogle udtryk ændrer betydning afhængigt af om de har artikel eller ej.",
    "danish_hint": "Ligesom forskellen mellem ''gå hjem'' og ''gå til huset'' på dansk"
  }',
  '''casa'' = hjem, ''la casa'' = det specifikke hus',
  '''Voy a casa'' betyder ''jeg går hjem'' (som begreb), mens ''Voy a la casa'' betyder ''jeg går til huset'' (specifikt bygning). Dette minder om dansk: ''gå hjem'' vs ''gå til huset''.',
  'advanced',
  NOW()
),

-- Mixed Exercises for All Levels
(
  (SELECT id FROM topics WHERE title = 'Grundlæggende Substantiver' LIMIT 1),
  'Blandet Træning: Alle Artikler',
  'Test din forståelse af alle fire artikler sammen',
  'multiple_choice',
  '{
    "question": "Vælg alle korrekte oversættelser af ''en bog'' og ''bogen'':",
    "options": [
      "un libro, el libro",
      "una libro, la libro", 
      "un libro, la libro",
      "una libro, el libro"
    ],
    "context": "Test både køn (libro er hankøn) og bestemt/ubestemt forskel.",
    "danish_hint": "Libro er hankøn + ubestemt ''en'' = un, bestemt ''-en'' = el"
  }',
  'un libro, el libro',
  'Libro (bog) er hankøn. ''En bog'' = ''un libro'' (ubestemt hankøn). ''Bogen'' = ''el libro'' (bestemt hankøn). Køn er det samme i både bestemt og ubestemt form.',
  'intermediate',
  NOW()
);

-- Add some fill-in-the-blank exercises focusing on Danish-Spanish article comparison
INSERT INTO exercises (
  topic_id, 
  title, 
  description, 
  type, 
  content, 
  correct_answer, 
  explanation, 
  difficulty,
  created_at
) VALUES

(
  (SELECT id FROM topics WHERE title = 'Grundlæggende Substantiver' LIMIT 1),
  'Dansk til Spansk: Artikel Oversættelse',
  'Oversæt danske udtryk med korrekte spanske artikler',
  'translation',
  '{
    "danish_text": "Hunden spiser æblet",
    "spanish_template": "___ perro come ___ manzana",
    "hints": [
      "''Hunden'' = bestemt form af hund (hankøn)",
      "''Æblet'' = bestemt form af æble (hunkøn på spansk)"
    ]
  }',
  'El perro come la manzana',
  'På dansk bruger vi endelser (-en, -et) for bestemt form. På spansk sætter vi artiklen foran: ''hunden'' = ''el perro'', ''æblet'' = ''la manzana''. Bemærk at ''æble'' er hunkøn på spansk, selvom vi siger ''et æble'' på dansk.',
  'beginner',
  NOW()
),

(
  (SELECT id FROM topics WHERE title = 'Dagligdags Genstande' LIMIT 1),
  'Kontekstuel Artikel Brug',
  'Vælg korrekt artikel baseret på sammenhæng',
  'fill_blank',
  '{
    "story": "Jeg går på biblioteket. Der låner jeg ___ bog. ___ bog handler om Spanien. Efter at have læst ___ bog, returnerer jeg den.",
    "spanish_story": "Voy a la biblioteca. Allí tomo prestado ___ libro. ___ libro trata de España. Después de leer ___ libro, lo devuelvo.",
    "context": "Følg den samme logik som på dansk: første gang ubestemt, derefter bestemt",
    "blanks": 3
  }',
  '["un", "El", "el"]',
  'Ligesom på dansk: første gang nævnes bogen = ubestemt (''un libro''). Efterfølgende referencer = bestemt (''el libro''). Bemærk at ''El'' med stort E kun bruges i begyndelsen af sætninger.',
  'intermediate',
  NOW()
);

-- Insert some conjugation exercises that include articles
INSERT INTO exercises (
  topic_id, 
  title, 
  description, 
  type, 
  content, 
  correct_answer, 
  explanation, 
  difficulty,
  created_at
) VALUES

(
  (SELECT id FROM topics WHERE title = 'Nuværende Tid' LIMIT 1),
  'Udsagnsord med Artikler',
  'Kombiner verbumsbøjning med korrekt artikelbrug',
  'conjugation',
  '{
    "verb": "comer",
    "sentence_template": "___ niña ___ (comer) ___ manzana",
    "context": "''Pigen spiser æblet'' - både verbum og artikler skal være korrekte",
    "hints": [
      "niña = pige (hunkøn)",
      "manzana = æble (hunkøn)", 
      "3. person ental af comer"
    ]
  }',
  'La niña come la manzana',
  'Niña (pige) er hunkøn = ''la niña''. Manzana (æble) er hunkøn = ''la manzana''. Verbum: hun spiser = ''come'' (3. person ental). På dansk: ''Pigen spiser æblet'' = ''La niña come la manzana''.',
  'intermediate',
  NOW()
);
