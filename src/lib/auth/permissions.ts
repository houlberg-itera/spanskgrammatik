import { createClient } from '@/lib/supabase/server';

export interface UserPermissions {
  role: 'admin' | 'teacher' | 'student';
  isAdmin: boolean;
  canGenerateExercises: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  maxExercisesPerDay: number;
  maxQuestionsPerGeneration: number;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  created_at: string;
  updated_at: string;
}

/**
 * Get comprehensive user permissions based on role and admin status
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  console.log(`🔍 Getting permissions for user: ${userId}`);
  
  try {
    const supabase = await createClient();
    
    // Get user profile with safe fallback
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching user profile:', error);
    }

    // Get user email from auth for admin check
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || '';
    
    // Check if user is admin by email
    const adminEmails = (process.env.ADMIN_EMAILS || 'admin@spanskgrammatik.dk,anders.houlberg-niel@itera.no,ahn@itera.dk')
      .split(',')
      .map(email => email.trim().toLowerCase());
    
    const isAdminByEmail = adminEmails.includes(userEmail.toLowerCase());
    
    // Determine role priority: email admin > database role > default
    let finalRole: 'admin' | 'teacher' | 'student' = 'student';
    
    if (isAdminByEmail) {
      finalRole = 'admin';
    } else if (profile?.role) {
      finalRole = profile.role;
    }

    const permissions: UserPermissions = {
      role: finalRole,
      isAdmin: finalRole === 'admin',
      canGenerateExercises: finalRole === 'admin' || finalRole === 'teacher',
      canManageContent: finalRole === 'admin',
      canViewAnalytics: finalRole === 'admin' || finalRole === 'teacher',
      maxExercisesPerDay: finalRole === 'admin' ? 100 : finalRole === 'teacher' ? 20 : 5,
      maxQuestionsPerGeneration: finalRole === 'admin' ? 20 : finalRole === 'teacher' ? 10 : 5
    };

    console.log(`✅ Permissions determined for ${userEmail}:`, {
      role: permissions.role,
      isAdmin: permissions.isAdmin,
      canGenerateExercises: permissions.canGenerateExercises
    });

    return permissions;
    
  } catch (error) {
    console.error('❌ Error in getUserPermissions:', error);
    
    // Fallback to most restrictive permissions
    return {
      role: 'student',
      isAdmin: false,
      canGenerateExercises: false,
      canManageContent: false,
      canViewAnalytics: false,
      maxExercisesPerDay: 5,
      maxQuestionsPerGeneration: 5
    };
  }
}

/**
 * Ensure user profile exists in database with proper role
 */
export async function ensureUserProfile(userId: string, userEmail: string): Promise<UserProfile> {
  console.log(`👤 Ensuring user profile exists for: ${userEmail}`);
  
  try {
    const supabase = await createClient();
    
    // Check if user profile exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log(`✅ User profile exists: ${existingProfile.role}`);
      return existingProfile;
    }

    // Determine initial role based on admin emails
    const adminEmails = (process.env.ADMIN_EMAILS || 'admin@spanskgrammatik.dk,anders.houlberg-niel@itera.no,ahn@itera.dk')
      .split(',')
      .map(email => email.trim().toLowerCase());
    
    const initialRole = adminEmails.includes(userEmail.toLowerCase()) ? 'admin' : 'student';

    // Create user profile
    const newProfile = {
      id: userId,
      email: userEmail,
      role: initialRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdProfile, error } = await supabase
      .from('users')
      .insert([newProfile])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating user profile:', error);
      // Return a default profile even if creation fails
      return {
        id: userId,
        email: userEmail,
        role: initialRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    console.log(`✅ User profile created with role: ${initialRole}`);
    return createdProfile;
    
  } catch (error) {
    console.error('❌ Error in ensureUserProfile:', error);
    
    // Return a default profile
    return {
      id: userId,
      email: userEmail,
      role: 'student',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  adminUserId: string, 
  targetUserId: string, 
  newRole: 'admin' | 'teacher' | 'student'
): Promise<{ success: boolean; error?: string }> {
  console.log(`🔧 Updating user role: ${targetUserId} -> ${newRole}`);
  
  try {
    // Check admin permissions
    const adminPermissions = await getUserPermissions(adminUserId);
    if (!adminPermissions.isAdmin) {
      return { success: false, error: 'Admin permissions required' };
    }

    const supabase = await createClient();
    
    const { error } = await supabase
      .from('users')
      .update({ 
        role: newRole, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', targetUserId);

    if (error) {
      console.error('❌ Error updating user role:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ User role updated successfully: ${newRole}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error in updateUserRole:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get all users with their roles (admin only)
 */
export async function getAllUsers(adminUserId: string): Promise<UserProfile[]> {
  console.log(`📋 Getting all users (admin request from: ${adminUserId})`);
  
  try {
    // Check admin permissions
    const adminPermissions = await getUserPermissions(adminUserId);
    if (!adminPermissions.isAdmin) {
      console.log('❌ Non-admin user attempted to get all users');
      return [];
    }

    const supabase = await createClient();
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching all users:', error);
      return [];
    }

    console.log(`✅ Retrieved ${users?.length || 0} users`);
    return users || [];
    
  } catch (error) {
    console.error('❌ Error in getAllUsers:', error);
    return [];
  }
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(
  userId: string, 
  permission: keyof UserPermissions
): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(userId);
    return Boolean(permissions[permission]);
  } catch (error) {
    console.error('❌ Error checking permission:', error);
    return false;
  }
}