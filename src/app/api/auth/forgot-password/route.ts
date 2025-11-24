import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email er påkrævet' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ugyldig email adresse' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Generate password reset link using Supabase Auth
    // Supabase will handle sending the email automatically
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
    });

    if (error) {
      console.error('Error requesting password reset from Supabase:', error);
      // Don't reveal specific error to user for security
    }

    // Always return success message (don't reveal if user exists)
    console.log('✅ Password reset email sent via Supabase to:', email);

    return NextResponse.json({
      success: true,
      message: 'Hvis emailen eksisterer, er der sendt en nulstillingsmail',
    });

  } catch (error: any) {
    console.error('Error in forgot-password API:', error);
    return NextResponse.json(
      { error: 'Der opstod en fejl. Prøv venligst igen senere.' },
      { status: 500 }
    );
  }
}
