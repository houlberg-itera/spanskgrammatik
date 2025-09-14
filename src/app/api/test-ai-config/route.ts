import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { replaceTemplateVariables } from '@/lib/ai-config';

export async function POST(request: NextRequest) {
  try {
    const { config, testParams } = await request.json();

    if (!config || !testParams) {
      return NextResponse.json(
        { success: false, error: 'Missing config or testParams' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const startTime = Date.now();

    // Replace template variables in the user prompt
    const userPrompt = replaceTemplateVariables(config.userPromptTemplate, testParams);

    try {
      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens
      });

      const responseTime = `${Date.now() - startTime}ms`;
      const rawResponse = completion.choices[0]?.message?.content || '';

      // Clean the response to extract JSON from markdown or other formatting
      let cleanedResponse = rawResponse.trim();
      
      // Remove markdown code blocks if present (more robust)
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?\s*```$/gm, '');
      
      // Remove any remaining leading/trailing whitespace
      cleanedResponse = cleanedResponse.trim();
      
      // Find JSON content between first { and last } (more precise)
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
      }
      
      // Additional cleanup: remove any remaining non-JSON characters at start/end
      cleanedResponse = cleanedResponse.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      console.log('Raw response:', rawResponse);
      console.log('Cleaned response:', cleanedResponse);

      // Try to parse the response as JSON
      let exercises;
      try {
        exercises = JSON.parse(cleanedResponse);
      } catch (parseError) {
        // If JSON parsing still fails, try one more time with the original response
        try {
          exercises = JSON.parse(rawResponse);
        } catch (secondParseError) {
          // If both attempts fail, return detailed error info
          return NextResponse.json({
            success: false,
            error: 'Failed to parse AI response as JSON',
            rawResponse: rawResponse,
            cleanedResponse: cleanedResponse,
            parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
            responseTime: responseTime,
            usage: completion.usage
          });
        }
      }

      return NextResponse.json({
        success: true,
        exercises: exercises,
        responseTime: responseTime,
        usage: completion.usage,
        model: config.model
      });

    } catch (openaiError: any) {
      return NextResponse.json({
        success: false,
        error: `OpenAI API error: ${openaiError.message}`,
        responseTime: `${Date.now() - startTime}ms`
      });
    }

  } catch (error: any) {
    console.error('Test AI config error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}