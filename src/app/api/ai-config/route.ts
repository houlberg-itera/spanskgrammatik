import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clearConfigCache } from '@/lib/ai-config';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all AI configurations
    const { data: configs, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching AI configurations:', error);
      return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 });
    }

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Error in AI config API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      model_name, 
      temperature, 
      max_tokens, 
      system_prompt, 
      user_prompt_template, 
      examples, 
      retry_config,
      is_active 
    } = body;

    // Validate required fields
    if (!name || !model_name || !system_prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert new configuration
    const { data: config, error } = await supabase
      .from('ai_configurations')
      .insert({
        name,
        description,
        model_name,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 1500,
        system_prompt,
        user_prompt_template,
        examples: examples || {},
        retry_config: retry_config || { maxRetries: 3, baseDelay: 1000 },
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating AI configuration:', error);
      return NextResponse.json({ error: 'Failed to create configuration' }, { status: 500 });
    }

    // Clear cache for this configuration
    clearConfigCache(name);

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error in AI config API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      id,
      name, 
      description, 
      model_name, 
      temperature, 
      max_tokens, 
      system_prompt, 
      user_prompt_template, 
      examples, 
      retry_config,
      is_active 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID required' }, { status: 400 });
    }

    // Update configuration
    const { data: config, error } = await supabase
      .from('ai_configurations')
      .update({
        name,
        description,
        model_name,
        temperature,
        max_tokens,
        system_prompt,
        user_prompt_template,
        examples,
        retry_config,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI configuration:', error);
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
    }

    // Clear cache for this configuration
    if (name) {
      clearConfigCache(name);
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error in AI config API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}