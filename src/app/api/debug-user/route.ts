import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get admin emails from environment or use defaults
    const adminEmailsEnv = process.env.ADMIN_EMAILS || 'admin@spanskgrammatik.dk,anders.houlberg-niel@itera.no';
    const adminEmails = adminEmailsEnv.split(',').map(email => email.trim());

    return NextResponse.json({
      currentUser: {
        email: user.email,
        id: user.id
      },
      adminEmails: adminEmails,
      isAdmin: adminEmails.includes(user.email || ''),
      message: adminEmails.includes(user.email || '') 
        ? '✅ You have admin access'
        : '❌ You need admin access to generate exercises'
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Failed to check user status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
