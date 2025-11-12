import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get all AI configurations from database
    const { data: configs, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI configurations:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch configurations'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: configs || [],
      count: configs?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error fetching AI configs:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { 
      name, 
      description,
      model_name, 
      temperature = 0.7, 
      max_tokens = 1500, 
      system_prompt = '', 
      user_prompt_template = '',
      reasoning_instructions = null,
      is_active = true 
    } = body;

    if (!name || !model_name) {
      return NextResponse.json({ 
        success: false,
        error: 'Name and model_name are required' 
      }, { status: 400 });
    }

    // Insert the new configuration
    const { data: config, error } = await supabase
      .from('ai_configurations')
      .insert([{
        name,
        description,
        model_name,
        temperature,
        max_tokens,
        system_prompt,
        user_prompt_template,
        reasoning_instructions,
        is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating AI configuration:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create configuration' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: config,
      message: 'Configuration created successfully' 
    });

  } catch (error) {
    console.error('Unexpected error creating AI config:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { 
      id,
      name, 
      description,
      model_name, 
      temperature = 0.7, 
      max_tokens = 1500, 
      system_prompt = '', 
      user_prompt_template = '',
      reasoning_instructions = null,
      is_active = true 
    } = body;

    if (!id || !name || !model_name) {
      return NextResponse.json({ 
        success: false,
        error: 'ID, name and model_name are required' 
      }, { status: 400 });
    }

    // Update the configuration
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
        reasoning_instructions,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI configuration:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to update configuration' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: config,
      message: 'Configuration updated successfully' 
    });

  } catch (error) {
    console.error('Unexpected error updating AI config:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        success: false,
        error: 'Configuration ID is required' 
      }, { status: 400 });
    }

    // Delete the configuration
    const { error } = await supabase
      .from('ai_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting AI configuration:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to delete configuration' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Configuration deleted successfully' 
    });

  } catch (error) {
    console.error('Unexpected error deleting AI config:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}