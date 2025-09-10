import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test database connection by trying to fetch levels
    const { data, error } = await supabase
      .from('levels')
      .select('id, name')
      .limit(1);

    if (error) {
      return NextResponse.json({ 
        error: 'Database connection failed', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Supabase connection working!',
      data 
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to connect to Supabase',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
