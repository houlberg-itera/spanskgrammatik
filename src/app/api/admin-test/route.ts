import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Test regular client only (no admin client to avoid recursion)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        authenticated: false 
      }, { status: 401 });
    }

    // Test admin access
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
    const isAdmin = adminEmails.includes(user.email || '');

    // Try to fetch topics with regular client only
    const { data: topicsRegular, error: topicsRegularError } = await supabase
      .from('topics')
      .select('*')
      .limit(1);

    return NextResponse.json({
      user: {
        email: user.email,
        id: user.id
      },
      isAdmin,
      adminEmailsCount: adminEmails.length,
      tests: {
        regularClient: {
          success: !topicsRegularError,
          error: topicsRegularError?.message,
          dataCount: topicsRegular?.length || 0
        },
        note: 'Admin client test removed to prevent infinite recursion'
      }
    });

  } catch (error) {
    console.error('Admin test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}