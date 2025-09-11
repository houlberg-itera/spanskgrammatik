import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { level, type, focus } = await request.json();

    // Validate required fields
    if (!level || !type || !focus) {
      return NextResponse.json(
        { error: 'Level, type, and focus are required' },
        { status: 400 }
      );
    }

    const prompt = `Generate a Spanish article exercise for Danish speakers at ${level} level.

FOCUS: ${focus} (definite articles: el/la, indefinite articles: un/una)
TYPE: ${type}

DANISH CONTEXT FOR LEARNERS:
- Danish only has "en/et" (indefinite) and "-en/-et" (definite)
- Spanish has el/la (definite) and un/una (indefinite) + gender
- Explain differences clearly in Danish

EXERCISE REQUIREMENTS:
1. Create ${type === 'multiple_choice' ? '4' : '5'} questions
2. Include Danish explanations for why each answer is correct
3. Use common vocabulary appropriate for ${level} level
4. Focus specifically on ${focus}
5. Include tricky cases (problema=masculine, mano=feminine, etc.)

${type === 'multiple_choice' ? `
FORMAT: Multiple choice with 4 options each
- Question format: "Skriv den bestemte artikel af [spanish_word]" eller "Skriv den ubestemte artikel af [spanish_word]"
- Options: A) el, B) la, C) un, D) una
- Explanation in Danish why the answer is correct
- NO parentheses with Danish translations in the question
` : type === 'fill_blank' ? `
FORMAT: Fill in the blank
- Question format: "Skriv den bestemte artikel af [spanish_word]" eller "Skriv den ubestemte artikel af [spanish_word]"
- Student types the correct article (el/la/un/una)
- Immediate feedback in Danish explaining the grammar rule
- NO parentheses with Danish translations in the question
` : `
FORMAT: Translation exercise
- Question format: "Skriv den bestemte artikel af [spanish_word]" eller "Skriv den ubestemte artikel af [spanish_word]"
- Focus on getting the article + noun correct
- Include context about definiteness (bestemt/ubestemt)
- NO parentheses with Danish translations in the question
`}

VOCABULARY GUIDELINES:
- A1: Basic nouns (casa, perro, mesa, libro, manzana)
- A2: Common daily objects (problema, mano, día, agua)
- B1: More complex nouns with irregular gender patterns

Generate the exercise as a JSON object with:
{
  "title": "Danish title of exercise",
  "description": "Brief description in Danish",
  "questions": [
    {
      "question": "Question text in Danish/Spanish",
      "type": "${type}",
      ${type === 'multiple_choice' ? `
      "options": ["A) el", "B) la", "C) un", "D) una"],
      "correct_answer": "A",` : `
      "correct_answer": "el",`}
      "explanation": "Explanation in Danish why this answer is correct",
      "danish_context": "How this relates to Danish grammar"
    }
  ],
  "learning_tips": [
    "Tip 1 in Danish about article usage",
    "Tip 2 in Danish about gender patterns"
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are a Spanish grammar expert who specializes in teaching Spanish articles to Danish speakers. You understand the key differences between Danish and Spanish article systems and can explain them clearly in Danish.

Key points to remember:
- Danish: en/et (indefinite), -en/-et (definite) - no gender distinction  
- Spanish: un/una (indefinite), el/la (definite) - with gender distinction
- Always explain in Danish why specific articles are used
- Focus on practical learning with clear comparisons
- IMPORTANT: Questions should be formatted as "Skriv den bestemte artikel af [spanish_word]" or "Skriv den ubestemte artikel af [spanish_word]"
- NEVER include Danish translations in parentheses like "(håndet/en)" or "(problemet/en)" in the question text
- Keep questions clean and simple without hints that may contain grammatical errors`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 1,  // GPT-5 only supports temperature: 1
      max_completion_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let exerciseData;
    try {
      exerciseData = JSON.parse(response);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      exerciseData = {
        title: `${focus} Øvelse - ${level}`,
        description: `Øv ${focus} artikler på ${level} niveau`,
        questions: [{
          question: "AI generering fejlede - prøv igen",
          type: type,
          correct_answer: "el",
          explanation: "Der opstod en fejl ved genereringen",
          danish_context: "Prøv at generere øvelsen igen"
        }],
        learning_tips: ["Prøv at generere øvelsen igen"]
      };
    }

    return NextResponse.json(exerciseData);

  } catch (error) {
    console.error('Error generating article exercise:', error);
    return NextResponse.json(
      { error: 'Failed to generate exercise' },
      { status: 500 }
    );
  }
}
