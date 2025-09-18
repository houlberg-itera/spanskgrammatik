import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the active AI configuration from database
    const { data: configs, error } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching AI configuration:', error);
      // Return default configuration if database query fails
      return NextResponse.json({
        success: true,
        config: {
          model_name: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 3000,
          system_prompt: '',
          user_prompt_template: ''
        }
      });
    }

    if (!configs || configs.length === 0) {
      // Return default configuration if no active config found
      return NextResponse.json({
        success: true,
        config: {
          model_name: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 3000,
          system_prompt: '',
          user_prompt_template: ''
        }
      });
    }

    const activeConfig = configs[0];
    return NextResponse.json({
      success: true,
      config: {
        model_name: activeConfig.model_name,
        temperature: activeConfig.temperature,
        max_tokens: activeConfig.max_tokens,
        system_prompt: activeConfig.system_prompt,
        user_prompt_template: activeConfig.user_prompt_template
      }
    });

  } catch (error) {
    console.error('Unexpected error fetching AI config:', error);
    // Return default configuration on any error
    return NextResponse.json({
      success: true,
      config: {
        model_name: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 3000,
        system_prompt: '',
        user_prompt_template: ''
      }
    });
  }
}