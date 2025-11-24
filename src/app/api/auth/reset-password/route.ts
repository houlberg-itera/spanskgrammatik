import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { password, code } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Adgangskode er påkrævet' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Adgangskoden skal være mindst 6 tegn' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Exchange the code for a session and update password
    const { data, error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error('Error updating password:', error);
      return NextResponse.json(
        { error: 'Kunne ikke opdatere adgangskode. Linket kan være udløbet.' },
        { status: 400 }
      );
    }

    console.log('✅ Password updated successfully for user:', data.user?.email);

    return NextResponse.json({
      success: true,
      message: 'Din adgangskode er blevet opdateret',
    });

  } catch (error: any) {
    console.error('Error in reset-password API:', error);
    return NextResponse.json(
      { error: 'Der opstod en fejl. Prøv venligst igen.' },
      { status: 500 }
    );
  }
}
