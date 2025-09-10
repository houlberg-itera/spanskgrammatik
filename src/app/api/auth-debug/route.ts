import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // This endpoint helps debug authentication issues
    return NextResponse.json({
      message: 'Authentication Debug Info',
      instructions: [
        'If you see "email not confirmed" errors:',
        '1. Go to Supabase Dashboard',
        '2. Authentication > Settings', 
        '3. Set "Enable email confirmations" to OFF',
        '4. Try registering again'
      ],
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasApiKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
