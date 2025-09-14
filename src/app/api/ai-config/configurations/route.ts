import { NextRequest, NextResponse } from 'next/server';
import { getAllConfigurations, createConfiguration, updateConfiguration, deleteConfiguration } from '@/lib/ai-config';

// GET /api/ai-config/configurations - List all configurations
export async function GET() {
  try {
    const configurations = await getAllConfigurations();
    return NextResponse.json({ 
      success: true, 
      data: configurations 
    });
  } catch (error) {
    console.error('Failed to fetch configurations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch configurations' 
      },
      { status: 500 }
    );
  }
}

// POST /api/ai-config/configurations - Create new configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      model_name,
      temperature,
      max_tokens,
      system_prompt,
      user_prompt_template,
      is_active
    } = body;

    // Validation
    if (!name || !model_name || !system_prompt || !user_prompt_template) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, model_name, system_prompt, user_prompt_template' 
        },
        { status: 400 }
      );
    }

    const configuration = await createConfiguration({
      name,
      description: description || '',
      model_name,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 2000,
      system_prompt,
      user_prompt_template,
      examples: {},
      retry_config: { maxRetries: 3, baseDelay: 1000 },
      is_active: is_active !== undefined ? is_active : true
    });

    return NextResponse.json({ 
      success: true, 
      data: configuration 
    });
  } catch (error) {
    console.error('Failed to create configuration:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create configuration' 
      },
      { status: 500 }
    );
  }
}