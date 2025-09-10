import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email og password er påkrævet' }, { status: 400 });
    }

    // Create admin client to bypass email confirmation
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // We'll need to add this
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First, try to create user with admin client (auto-confirmed)
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName,
      },
      email_confirm: true, // Auto-confirm the email
    });

    if (adminError) {
      // If admin creation fails, fall back to normal signup
      console.log('Admin signup failed, falling back to normal signup:', adminError.message);
      
      const normalSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await normalSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Bruger oprettet. Du kan nu logge ind.',
        requiresManualConfirmation: true
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bruger oprettet og bekræftet automatisk!',
      user: adminData.user
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ 
      error: 'Der opstod en fejl under oprettelse af bruger',
      details: error instanceof Error ? error.message : 'Ukendt fejl'
    }, { status: 500 });
  }
}
