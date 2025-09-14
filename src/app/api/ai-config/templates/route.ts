import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// GET /api/ai-config/templates - Get AI configuration templates
export async function GET(request: NextRequest) {
  try {
    // Return predefined AI configuration templates
    const templates = [
      {
        id: 'default',
        name: 'Default Configuration',
        model_name: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 3000,
        description: 'Standard configuration for exercise generation'
      },
      {
        id: 'creative',
        name: 'Creative Configuration',
        model_name: 'gpt-4o',
        temperature: 0.9,
        max_tokens: 4000,
        description: 'Higher creativity for varied exercise generation'
      },
      {
        id: 'precise',
        name: 'Precise Configuration',
        model_name: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 2500,
        description: 'Lower temperature for consistent, precise exercises'
      }
    ];

    return NextResponse.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Failed to fetch AI config templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}