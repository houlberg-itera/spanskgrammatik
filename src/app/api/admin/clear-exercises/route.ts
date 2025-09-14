import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Starting exercise database clear operation...');
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // IMPORTANT: Restrict access to admin only
    const userEmail = user.email;
    const adminEmailsEnv = process.env.ADMIN_EMAILS || 'admin@spanskgrammatik.dk,anders.houlberg-niel@itera.no';
    const adminEmails = adminEmailsEnv.split(',').map(email => email.trim());
    
    console.log(`🔍 Checking admin access for: ${userEmail}`);
    
    if (!adminEmails.includes(userEmail || '')) {
      console.error(`❌ Access denied for non-admin user: ${userEmail}`);
      return NextResponse.json({ 
        error: 'Admin access required for database operations' 
      }, { status: 403 });
    }

    console.log('✅ Admin access confirmed for database clear operation');

    // Use admin client for database operations to bypass RLS
    const adminSupabase = createAdminClient();

    // First, count existing exercises
    const { count: exerciseCount, error: countError } = await adminSupabase
      .from('exercises')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting exercises:', countError);
      return NextResponse.json({ 
        error: 'Failed to count existing exercises',
        details: countError.message 
      }, { status: 500 });
    }

    console.log(`📊 Found ${exerciseCount} exercises to delete`);

    // Delete all exercises
    const { error: deleteError } = await adminSupabase
      .from('exercises')
      .delete()
      .neq('id', 0); // Delete all rows (using a condition that's always true)

    if (deleteError) {
      console.error('❌ Error deleting exercises:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete exercises',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log(`✅ Successfully deleted ${exerciseCount} exercises from database`);

    return NextResponse.json({
      success: true,
      message: 'Exercise database cleared successfully',
      deletedCount: exerciseCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database clear operation failed:', error);
    return NextResponse.json({ 
      error: 'Failed to clear exercise database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}