import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userEmail = user.email;
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    
    if (!adminEmails.includes(userEmail || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Return current AI configuration from environment or defaults
    const config = {
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '1'),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
      retryCount: parseInt(process.env.OPENAI_RETRY_COUNT || '8'),
      baseDelay: parseInt(process.env.OPENAI_BASE_DELAY || '2000'),
      systemPrompt: process.env.OPENAI_SYSTEM_PROMPT || 'Default system prompt',
      userPromptTemplate: process.env.OPENAI_USER_PROMPT_TEMPLATE || 'Default user prompt template'
    };

    return NextResponse.json(config);

  } catch (error) {
    console.error('❌ Failed to get AI config:', error);
    return NextResponse.json({ 
      error: 'Failed to get AI configuration',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userEmail = user.email;
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    
    if (!adminEmails.includes(userEmail || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const config = await request.json();

    console.log('🎯 AI Configuration updated by admin:', userEmail);
    console.log('📝 New config:', {
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      retryCount: config.retryCount,
      baseDelay: config.baseDelay,
      systemPromptLength: config.systemPrompt?.length,
      userPromptTemplateLength: config.userPromptTemplate?.length
    });

    return NextResponse.json({ 
      success: true,
      message: 'AI configuration saved successfully (Note: Restart required for full effect)'
    });

  } catch (error) {
    console.error('❌ Failed to save AI config:', error);
    return NextResponse.json({ 
      error: 'Failed to save AI configuration',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}