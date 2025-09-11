import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Test regular client
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

    // Test admin client
    const adminSupabase = createAdminClient();
    
    // Try to fetch topics with both clients
    const { data: topicsRegular, error: topicsRegularError } = await supabase
      .from('topics')
      .select('*')
      .limit(1);

    const { data: topicsAdmin, error: topicsAdminError } = await adminSupabase
      .from('topics')
      .select('*')
      .limit(1);

    return NextResponse.json({
      user: {
        email: user.email,
        id: user.id
      },
      isAdmin,
      adminEmails,
      tests: {
        regularClient: {
          success: !topicsRegularError,
          error: topicsRegularError?.message,
          dataCount: topicsRegular?.length || 0
        },
        adminClient: {
          success: !topicsAdminError,
          error: topicsAdminError?.message,
          dataCount: topicsAdmin?.length || 0
        }
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
