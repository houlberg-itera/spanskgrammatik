import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not found' 
      }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test with a simple completion
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: "Respond with exactly: OpenAI GPT-5 connection test successful"
        }
      ],
      max_completion_tokens: 20,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'OpenAI connection working!',
      response: completion.choices[0]?.message?.content
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to connect to OpenAI',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
