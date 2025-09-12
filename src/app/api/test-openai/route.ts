import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Test both AI configuration system and OpenAI connection
export async function GET() {
  try {
    console.log('🧪 Testing AI Configuration System and OpenAI...');
    
    // Test 1: OpenAI Connection
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not found' 
      }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Respond with exactly: OpenAI connection test successful"
        }
      ],
      max_tokens: 20,
    });

    // Test 2: Check database access to AI configurations
    const { data: configs, error } = await supabase
      .from('ai_configurations')
      .select('name, model_name, is_active')
      .limit(5);
    
    if (error) {
      console.error('❌ Database error:', error);
    }
    
    return NextResponse.json({
      success: true,
      message: 'System tests completed!',
      openai: {
        status: '✅ Connected',
        response: completion.choices[0]?.message?.content,
        model_used: 'gpt-4o'
      },
      ai_configurations: {
        status: error ? '❌ Failed' : '✅ Working',
        count: configs?.length || 0,
        error: error?.message || null,
        configs: configs || []
      }
    });

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    
    return NextResponse.json(
      { 
        error: 'System test failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
