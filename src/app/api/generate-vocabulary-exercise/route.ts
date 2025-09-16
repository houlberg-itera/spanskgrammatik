import { NextRequest, NextResponse } from 'next/server';
import { SpanishLevel, QuestionType } from '@/types/database';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VocabularyWord {
  spanish: string;
  danish: string;
  gender?: 'el' | 'la';
  examples: {
    spanish: string;
    danish: string;
  }[];
  difficulty: 'easy' | 'medium' | 'hard';
}

// Comprehensive vocabulary database organized by topic and level
const VOCABULARY_DATABASE: Record<string, VocabularyWord[]> = {
  // A1 Level Topics
  familia: [
    {
      spanish: 'madre',
      danish: 'mor',
      gender: 'la',
      examples: [
        { spanish: 'Mi madre es enfermera', danish: 'Min mor er sygeplejerske' },
        { spanish: 'La madre cocina', danish: 'Moren laver mad' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'padre',
      danish: 'far',
      gender: 'el',
      examples: [
        { spanish: 'Mi padre trabaja', danish: 'Min far arbejder' },
        { spanish: 'El padre lee el periódico', danish: 'Faren læser avis' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'hermano',
      danish: 'bror',
      gender: 'el',
      examples: [
        { spanish: 'Mi hermano estudia', danish: 'Min bror studerer' },
        { spanish: 'El hermano mayor', danish: 'Den store bror' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'hermana',
      danish: 'søster',
      gender: 'la',
      examples: [
        { spanish: 'Mi hermana canta', danish: 'Min søster synger' },
        { spanish: 'La hermana pequeña', danish: 'Den lille søster' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'abuelo',
      danish: 'bedstefar',
      gender: 'el',
      examples: [
        { spanish: 'Mi abuelo es muy sabio', danish: 'Min bedstefar er meget klog' },
        { spanish: 'El abuelo cuenta historias', danish: 'Bedstefaren fortæller historier' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'abuela',
      danish: 'bedstemor',
      gender: 'la',
      examples: [
        { spanish: 'Mi abuela cocina bien', danish: 'Min bedstemor laver god mad' },
        { spanish: 'La abuela hace tartas', danish: 'Bedstemoren laver kager' }
      ],
      difficulty: 'medium'
    }
  ],

  colores: [
    {
      spanish: 'rojo',
      danish: 'rød',
      examples: [
        { spanish: 'El coche es rojo', danish: 'Bilen er rød' },
        { spanish: 'Una rosa roja', danish: 'En rød rose' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'azul',
      danish: 'blå',
      examples: [
        { spanish: 'El cielo es azul', danish: 'Himlen er blå' },
        { spanish: 'Una camiseta azul', danish: 'En blå t-shirt' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'verde',
      danish: 'grøn',
      examples: [
        { spanish: 'Las hojas son verdes', danish: 'Bladene er grønne' },
        { spanish: 'Un parque verde', danish: 'En grøn park' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'amarillo',
      danish: 'gul',
      examples: [
        { spanish: 'El sol es amarillo', danish: 'Solen er gul' },
        { spanish: 'Flores amarillas', danish: 'Gule blomster' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'negro',
      danish: 'sort',
      examples: [
        { spanish: 'Un gato negro', danish: 'En sort kat' },
        { spanish: 'Zapatos negros', danish: 'Sorte sko' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'blanco',
      danish: 'hvid',
      examples: [
        { spanish: 'Nieve blanca', danish: 'Hvid sne' },
        { spanish: 'Una casa blanca', danish: 'Et hvidt hus' }
      ],
      difficulty: 'easy'
    }
  ],

  números: [
    {
      spanish: 'uno',
      danish: 'en/et',
      examples: [
        { spanish: 'Tengo un perro', danish: 'Jeg har en hund' },
        { spanish: 'Uno más uno', danish: 'En plus en' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'dos',
      danish: 'to',
      examples: [
        { spanish: 'Dos gatos', danish: 'To katte' },
        { spanish: 'Son las dos', danish: 'Klokken er to' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'tres',
      danish: 'tre',
      examples: [
        { spanish: 'Tres hermanos', danish: 'Tre brødre' },
        { spanish: 'A las tres', danish: 'Klokken tre' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'cinco',
      danish: 'fem',
      examples: [
        { spanish: 'Cinco días', danish: 'Fem dage' },
        { spanish: 'Tengo cinco años', danish: 'Jeg er fem år' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'diez',
      danish: 'ti',
      examples: [
        { spanish: 'Son las diez', danish: 'Klokken er ti' },
        { spanish: 'Diez euros', danish: 'Ti euro' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'veinte',
      danish: 'tyve',
      examples: [
        { spanish: 'Veinte años', danish: 'Tyve år' },
        { spanish: 'Cuesta veinte euros', danish: 'Det koster tyve euro' }
      ],
      difficulty: 'hard'
    }
  ],

  casa: [
    {
      spanish: 'casa',
      danish: 'hus',
      gender: 'la',
      examples: [
        { spanish: 'Mi casa es grande', danish: 'Mit hus er stort' },
        { spanish: 'La casa tiene jardín', danish: 'Huset har have' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'cocina',
      danish: 'køkken',
      gender: 'la',
      examples: [
        { spanish: 'Cocino en la cocina', danish: 'Jeg laver mad i køkkenet' },
        { spanish: 'La cocina es moderna', danish: 'Køkkenet er moderne' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'dormitorio',
      danish: 'soveværelse',
      gender: 'el',
      examples: [
        { spanish: 'Mi dormitorio es pequeño', danish: 'Mit soveværelse er lille' },
        { spanish: 'El dormitorio tiene una cama', danish: 'Soveværelset har en seng' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'baño',
      danish: 'badeværelse',
      gender: 'el',
      examples: [
        { spanish: 'El baño está limpio', danish: 'Badeværelset er rent' },
        { spanish: 'Voy al baño', danish: 'Jeg går på toilettet' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'salón',
      danish: 'stue',
      gender: 'el',
      examples: [
        { spanish: 'Vemos la televisión en el salón', danish: 'Vi ser fjernsyn i stuen' },
        { spanish: 'El salón es cómodo', danish: 'Stuen er behagelig' }
      ],
      difficulty: 'medium'
    }
  ],

  comida: [
    {
      spanish: 'pan',
      danish: 'brød',
      gender: 'el',
      examples: [
        { spanish: 'Como pan en el desayuno', danish: 'Jeg spiser brød til morgenmad' },
        { spanish: 'El pan está fresco', danish: 'Brødet er friskt' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'agua',
      danish: 'vand',
      gender: 'el',
      examples: [
        { spanish: 'Bebo agua fría', danish: 'Jeg drikker koldt vand' },
        { spanish: 'El agua es importante', danish: 'Vand er vigtigt' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'leche',
      danish: 'mælk',
      gender: 'la',
      examples: [
        { spanish: 'La leche está en la nevera', danish: 'Mælken er i køleskabet' },
        { spanish: 'Tomo leche con café', danish: 'Jeg drikker mælk med kaffe' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'carne',
      danish: 'kød',
      gender: 'la',
      examples: [
        { spanish: 'La carne está muy buena', danish: 'Kødet er meget godt' },
        { spanish: 'No como carne', danish: 'Jeg spiser ikke kød' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'pescado',
      danish: 'fisk',
      gender: 'el',
      examples: [
        { spanish: 'El pescado es saludable', danish: 'Fisk er sundt' },
        { spanish: 'Compramos pescado fresco', danish: 'Vi køber frisk fisk' }
      ],
      difficulty: 'medium'
    }
  ],

  ropa: [
    {
      spanish: 'camisa',
      danish: 'skjorte',
      gender: 'la',
      examples: [
        { spanish: 'Mi camisa es azul', danish: 'Min skjorte er blå' },
        { spanish: 'Compro una camisa nueva', danish: 'Jeg køber en ny skjorte' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'pantalones',
      danish: 'bukser',
      examples: [
        { spanish: 'Mis pantalones son negros', danish: 'Mine bukser er sorte' },
        { spanish: 'Llevo pantalones cómodos', danish: 'Jeg har behagelige bukser på' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'zapatos',
      danish: 'sko',
      examples: [
        { spanish: 'Mis zapatos son nuevos', danish: 'Mine sko er nye' },
        { spanish: 'Compro zapatos de cuero', danish: 'Jeg køber lædersko' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'vestido',
      danish: 'kjole',
      gender: 'el',
      examples: [
        { spanish: 'Su vestido es bonito', danish: 'Hendes kjole er smuk' },
        { spanish: 'Lleva un vestido rojo', danish: 'Hun har en rød kjole på' }
      ],
      difficulty: 'medium'
    }
  ],

  // A2 Level Topics
  transporte: [
    {
      spanish: 'coche',
      danish: 'bil',
      gender: 'el',
      examples: [
        { spanish: 'Mi coche es rápido', danish: 'Min bil er hurtig' },
        { spanish: 'El coche nuevo', danish: 'Den nye bil' }
      ],
      difficulty: 'easy'
    },
    {
      spanish: 'autobús',
      danish: 'bus',
      gender: 'el',
      examples: [
        { spanish: 'Tomo el autobús al trabajo', danish: 'Jeg tager bussen til arbejde' },
        { spanish: 'El autobús está lleno', danish: 'Bussen er fuld' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'tren',
      danish: 'tog',
      gender: 'el',
      examples: [
        { spanish: 'El tren es puntual', danish: 'Toget er til tiden' },
        { spanish: 'Viajo en tren', danish: 'Jeg rejser med tog' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'avión',
      danish: 'fly',
      gender: 'el',
      examples: [
        { spanish: 'El avión vuela alto', danish: 'Flyet flyver højt' },
        { spanish: 'Perdí el avión', danish: 'Jeg nåede ikke flyet' }
      ],
      difficulty: 'hard'
    },
    {
      spanish: 'metro',
      danish: 'metro',
      gender: 'el',
      examples: [
        { spanish: 'Voy en metro al centro', danish: 'Jeg tager metro til centrum' },
        { spanish: 'El metro es rápido', danish: 'Metroen er hurtig' }
      ],
      difficulty: 'medium'
    }
  ],

  profesiones: [
    {
      spanish: 'médico',
      danish: 'læge',
      gender: 'el',
      examples: [
        { spanish: 'El médico me ayuda', danish: 'Lægen hjælper mig' },
        { spanish: 'Voy al médico', danish: 'Jeg går til lægen' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'profesor',
      danish: 'lærer',
      gender: 'el',
      examples: [
        { spanish: 'Mi profesor es amable', danish: 'Min lærer er venlig' },
        { spanish: 'El profesor enseña español', danish: 'Læreren underviser i spansk' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'enfermero',
      danish: 'sygeplejerske',
      gender: 'el',
      examples: [
        { spanish: 'El enfermero cuida pacientes', danish: 'Sygeplejersken passer patienter' },
        { spanish: 'Mi hermana es enfermera', danish: 'Min søster er sygeplejerske' }
      ],
      difficulty: 'hard'
    },
    {
      spanish: 'cocinero',
      danish: 'kok',
      gender: 'el',
      examples: [
        { spanish: 'El cocinero prepara la comida', danish: 'Kokken tilbereder maden' },
        { spanish: 'Es un buen cocinero', danish: 'Han er en god kok' }
      ],
      difficulty: 'medium'
    }
  ],

  // B1 Level Topics
  educación: [
    {
      spanish: 'universidad',
      danish: 'universitet',
      gender: 'la',
      examples: [
        { spanish: 'Estudio en la universidad', danish: 'Jeg studerer på universitetet' },
        { spanish: 'La universidad es prestigiosa', danish: 'Universitetet er prestigefyldt' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'investigación',
      danish: 'forskning',
      gender: 'la',
      examples: [
        { spanish: 'Hago investigación científica', danish: 'Jeg laver videnskabelig forskning' },
        { spanish: 'La investigación es importante', danish: 'Forskning er vigtigt' }
      ],
      difficulty: 'hard'
    },
    {
      spanish: 'conocimiento',
      danish: 'viden/kendskab',
      gender: 'el',
      examples: [
        { spanish: 'El conocimiento es poder', danish: 'Viden er magt' },
        { spanish: 'Ampliar el conocimiento', danish: 'Udvide viden' }
      ],
      difficulty: 'hard'
    }
  ],

  tecnología: [
    {
      spanish: 'ordenador',
      danish: 'computer',
      gender: 'el',
      examples: [
        { spanish: 'Trabajo con el ordenador', danish: 'Jeg arbejder med computeren' },
        { spanish: 'El ordenador es rápido', danish: 'Computeren er hurtig' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'internet',
      danish: 'internet',
      gender: 'el',
      examples: [
        { spanish: 'Navego por internet', danish: 'Jeg surfer på internettet' },
        { spanish: 'Internet es útil', danish: 'Internet er nyttigt' }
      ],
      difficulty: 'medium'
    },
    {
      spanish: 'aplicación',
      danish: 'app/applikation',
      gender: 'la',
      examples: [
        { spanish: 'Descargo una aplicación', danish: 'Jeg downloader en app' },
        { spanish: 'La aplicación es gratis', danish: 'Appen er gratis' }
      ],
      difficulty: 'hard'
    }
  ]
};

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Vocabulary API called');
    console.log('📥 Request method:', request.method);
    console.log('📥 Request headers:', Object.fromEntries(request.headers.entries()));
    
    let body;
    try {
      // Get the raw text first to see what we're dealing with
      const rawBody = await request.text();
      console.log('📥 Raw request body:', rawBody);
      
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Empty request body');
      }
      
      body = JSON.parse(rawBody);
      console.log('📥 Parsed request body:', body);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError.message },
        { status: 400 }
      );
    }
    
    const { topic, level, exerciseType, questionCount = 5, difficulty = 'medium' } = body;

    // Validation
    if (!topic || !level || !exerciseType) {
      return NextResponse.json(
        { error: 'Manglende påkrævede parametre: topic, level, exerciseType' },
        { status: 400 }
      );
    }

    // Get vocabulary for the topic
    const vocabularyWords = VOCABULARY_DATABASE[topic];
    if (!vocabularyWords) {
      return NextResponse.json(
        { error: `Ordforråd for emnet "${topic}" blev ikke fundet` },
        { status: 400 }
      );
    }

    // Filter words by difficulty if specified
    let filteredWords = vocabularyWords;
    if (difficulty) {
      filteredWords = vocabularyWords.filter(word => {
        if (difficulty === 'easy') return word.difficulty === 'easy';
        if (difficulty === 'medium') return ['easy', 'medium'].includes(word.difficulty);
        return true; // hard includes all levels
      });
    }

    // Ensure we have enough words
    if (filteredWords.length < questionCount) {
      filteredWords = vocabularyWords; // Fall back to all words
    }

    // Select random words for the exercise
    const selectedWords = filteredWords
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(questionCount, filteredWords.length));

    // Generate exercise using OpenAI
    const prompt = createVocabularyPrompt(selectedWords, exerciseType, level, topic, questionCount);
    
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Du er en ekspert spansk sproglærer, der skaber ordforrådsøvelser for danske studerende. 
          Du skal:
          1. Skabe ${questionCount} ${exerciseType} spørgsmål på ${level} niveau
          2. Bruge kun de givne ord fra ordforråd-databasen
          3. Inkludere danske instruktioner
          4. Sikre, at sværhedsgraden matcher ${difficulty}
          5. Tilføje uddybende forklaringer på dansk

          Returner svar i JSON format med følgende struktur:
          {
            "title": "Ordforråd: [emne navn]",
            "instructions_da": "Danske instruktioner",
            "questions": [
              {
                "id": 1,
                "question_da": "Spørgsmål på dansk",
                "question_es": "Pregunta en español",
                "correct_answer": "korrekt svar",
                "options": ["mulighed1", "mulighed2", "mulighed3", "korrekt svar"],
                "explanation_da": "Forklaring på dansk",
                "word_focus": "det spanske ord der fokuseres på"
              }
            ],
            "vocabulary_metadata": {
              "topic": "${topic}",
              "level": "${level}",
              "exercise_type": "${exerciseType}",
              "words_used": [{"spanish": "word", "danish": "ord", "gender": "el/la"}]
            }
          }`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = openaiResponse.choices[0].message?.content;
    if (!content) {
      throw new Error('Ingen respons fra OpenAI');
    }

    // Parse the JSON response - handle markdown code blocks
    let exerciseData;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      exerciseData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.log('Raw OpenAI Response:', content);
      console.log('Cleaned content attempted:', content.trim().substring(0, 200));
      throw new Error('Fejl i parsning af AI-respons');
    }

    // Add metadata
    exerciseData.metadata = {
      created_at: new Date().toISOString(),
      ai_model: 'gpt-4o',
      prompt_type: 'vocabulary_generation',
      topic,
      level,
      exercise_type: exerciseType,
      question_count: questionCount,
      difficulty_level: difficulty,
      words_available: vocabularyWords.length,
      words_used: selectedWords.length
    };

    return NextResponse.json(exerciseData);

  } catch (error) {
    console.error('Vocabulary exercise generation error:', error);
    return NextResponse.json(
      { 
        error: 'Fejl ved generering af ordforrådsøvelse',
        details: error instanceof Error ? error.message : 'Ukendt fejl'
      },
      { status: 500 }
    );
  }
}

function createVocabularyPrompt(
  words: VocabularyWord[], 
  exerciseType: string, 
  level: SpanishLevel, 
  topic: string, 
  questionCount: number
): string {
  const wordList = words.map(word => 
    `- ${word.spanish} (${word.gender || ''}) = ${word.danish}
     Eksempler: ${word.examples.map(ex => `"${ex.spanish}" = "${ex.danish}"`).join(', ')}`
  ).join('\n');

  const topicNames: Record<string, string> = {
    familia: 'Familie',
    colores: 'Farver', 
    números: 'Tal',
    casa: 'Hus og møbler',
    comida: 'Mad og drikke',
    ropa: 'Tøj',
    transporte: 'Transport',
    profesiones: 'Professioner',
    cuerpo: 'Krop',
    tiempo: 'Vejr',
    deportes: 'Sport',
    educación: 'Uddannelse',
    política: 'Politik',
    medioambiente: 'Miljø',
    tecnología: 'Teknologi'
  };

  const exerciseTypeInstructions: Record<string, string> = {
    multiple_choice: 'Vælg det rigtige svar blandt de fire muligheder',
    fill_blank: 'Udfyld det manglende ord i sætningen', 
    translation: 'Oversæt mellem dansk og spansk'
  };

  return `Skab en ordforrådsøvelse for ${level}-niveau studerende om emnet "${topicNames[topic] || topic}".

ORDFORRÅD TIL RÅDIGHED:
${wordList}

ØVELSESTYPE: ${exerciseType}
INSTRUKTIONER: ${exerciseTypeInstructions[exerciseType]}
ANTAL SPØRGSMÅL: ${questionCount}

Hver opgave skal:
1. Bruge kun ord fra den givne liste
2. Inkludere køn (el/la) hvor relevant
3. Være på passende niveau for ${level}
4. Have klare danske instruktioner
5. Inkludere forklaringer der hjælper med forståelse

For multiple choice: Giv 4 valgmuligheder hvor 3 er plausible afledninger
For fill_blank: Skab naturlige sætninger med et manglende ord
For translation: Veksle mellem dansk→spansk og spansk→dansk

Fokuser på praktisk anvendelse og kulturel kontekst.`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic');

  if (topic && VOCABULARY_DATABASE[topic]) {
    return NextResponse.json({
      topic,
      available_words: VOCABULARY_DATABASE[topic].length,
      words: VOCABULARY_DATABASE[topic]
    });
  }

  return NextResponse.json({
    available_topics: Object.keys(VOCABULARY_DATABASE),
    total_words: Object.values(VOCABULARY_DATABASE).reduce((sum, words) => sum + words.length, 0)
  });
}