import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // This is a workaround for manual user confirmation
    // In a real setup, you'd configure Supabase to disable email confirmation
    
    return NextResponse.json({ 
      message: 'If email confirmation is required, please disable it in Supabase Dashboard under Authentication > Settings',
      instructions: [
        '1. Go to your Supabase Dashboard',
        '2. Navigate to Authentication > Settings', 
        '3. Set "Enable email confirmations" to OFF',
        '4. This will allow users to sign up without email verification'
      ]
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
