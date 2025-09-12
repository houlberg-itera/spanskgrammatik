import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: configs, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI configurations:', error);
      return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: configs,
      count: configs?.length || 0
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { 
      name, 
      model_name, 
      temperature = 0.7, 
      max_tokens = 2000, 
      prompt_template = '', 
      system_prompt = '',
      is_active = true 
    } = body;

    if (!name || !model_name) {
      return NextResponse.json({ error: 'Name and model_name are required' }, { status: 400 });
    }

    const { data: config, error } = await supabase
      .from('ai_configurations')
      .insert([{
        name,
        model_name,
        temperature,
        max_tokens,
        prompt_template,
        system_prompt,
        is_active
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating AI configuration:', error);
      return NextResponse.json({ error: 'Failed to create configuration' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: config,
      message: 'Configuration created successfully' 
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
