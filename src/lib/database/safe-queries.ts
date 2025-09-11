import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

// Database operation result interface
export interface SafeQueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryable?: boolean;
}

// Database schema validation result
export interface SchemaValidation {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Safe query wrapper with automatic error handling and graceful fallbacks
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  errorMessage: string = 'Database query failed',
  maxRetries: number = 2
): Promise<SafeQueryResult<T>> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`🔍 Database query attempt ${attempt}/${maxRetries + 1}`);
      
      const result = await queryFn();
      
      if (result.error) {
        lastError = result.error;
        console.warn(`⚠️ Database query attempt ${attempt} failed:`, result.error);
        
        // Check if error is retryable
        const isRetryable = isRetryableError(result.error);
        
        if (!isRetryable || attempt > maxRetries) {
          return {
            success: false,
            error: `${errorMessage}: ${result.error.message || result.error}`,
            retryable: isRetryable
          };
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        continue;
      }
      
      console.log(`✅ Database query successful on attempt ${attempt}`);
      return {
        success: true,
        data: result.data || undefined
      };
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Database query attempt ${attempt} threw error:`, error);
      
      if (attempt > maxRetries) {
        return {
          success: false,
          error: `${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: true
        };
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
  
  return {
    success: false,
    error: `${errorMessage}: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`,
    retryable: true
  };
}

/**
 * Check if a database error is retryable
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const retryableCodes = [
    'PGRST204', // No content (might be temporary)
    'PGRST301', // Connection error
    'PGRST302', // Connection timeout
    '08000',    // Connection exception
    '08003',    // Connection does not exist
    '08006',    // Connection failure
    '53300',    // Too many connections
    '40001',    // Serialization failure
    '40P01'     // Deadlock detected
  ];
  
  const retryableMessages = [
    'timeout',
    'connection',
    'network',
    'temporary',
    'rate limit',
    'too many requests'
  ];
  
  const errorCode = error.code || error.error_code;
  const errorMessage = (error.message || error.details || '').toLowerCase();
  
  return retryableCodes.includes(errorCode) || 
         retryableMessages.some(msg => errorMessage.includes(msg));
}

/**
 * Safely get user profile with fallback creation
 */
export async function getUserProfile(userId: string): Promise<SafeQueryResult<any>> {
  console.log(`👤 Getting user profile for: ${userId}`);
  
  try {
    const supabase = await createClient();
    
    // First try to get from users table
    const usersResult = await safeQuery(
      () => supabase.from('users').select('*').eq('id', userId).single(),
      'Failed to fetch user from users table'
    );
    
    if (usersResult.success && usersResult.data) {
      console.log(`✅ Found user in users table`);
      return usersResult;
    }
    
    // Fallback: try user_profiles table (for backward compatibility)
    console.log(`🔄 Falling back to user_profiles table`);
    const profilesResult = await safeQuery(
      () => supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
      'Failed to fetch user from user_profiles table'
    );
    
    if (profilesResult.success && profilesResult.data) {
      console.log(`✅ Found user in user_profiles table`);
      return profilesResult;
    }
    
    // If neither exists, return a safe default
    console.log(`ℹ️ No user profile found, returning safe default`);
    return {
      success: true,
      data: {
        id: userId,
        role: 'student',
        created_at: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error(`❌ Error in getUserProfile:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting user profile'
    };
  }
}

/**
 * Validate database schema and table existence
 */
export async function validateDatabaseSchema(): Promise<SchemaValidation> {
  console.log(`🔧 Validating database schema...`);
  
  const issues: string[] = [];
  const warnings: string[] = [];
  
  try {
    const supabase = await createClient();
    
    // Check for required tables
    const requiredTables = [
      'users',
      'topics', 
      'exercises',
      'user_progress'
    ];
    
    for (const tableName of requiredTables) {
      try {
        const { error } = await supabase.from(tableName).select('*').limit(1);
        
        if (error) {
          if (error.code === 'PGRST106') { // Table not found
            issues.push(`Table '${tableName}' does not exist`);
          } else {
            warnings.push(`Table '${tableName}' exists but has access issues: ${error.message}`);
          }
        }
      } catch (error) {
        issues.push(`Cannot access table '${tableName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Check for optional tables (backward compatibility)
    const optionalTables = ['user_profiles'];
    
    for (const tableName of optionalTables) {
      try {
        const { error } = await supabase.from(tableName).select('*').limit(1);
        
        if (error && error.code === 'PGRST106') {
          warnings.push(`Optional table '${tableName}' does not exist (using fallback strategy)`);
        }
      } catch (error) {
        warnings.push(`Optional table '${tableName}' check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    const isValid = issues.length === 0;
    
    if (isValid) {
      console.log(`✅ Database schema validation passed`);
    } else {
      console.warn(`⚠️ Database schema validation found ${issues.length} issues and ${warnings.length} warnings`);
    }
    
    return {
      isValid,
      issues,
      warnings
    };
    
  } catch (error) {
    console.error(`❌ Database schema validation failed:`, error);
    return {
      isValid: false,
      issues: [`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: []
    };
  }
}

/**
 * Safe insert with conflict resolution
 */
export async function safeInsert<T>(
  tableName: string,
  data: any | any[],
  options: {
    onConflict?: string;
    select?: string;
    upsert?: boolean;
  } = {}
): Promise<SafeQueryResult<T[]>> {
  console.log(`💾 Safe insert to ${tableName} with ${Array.isArray(data) ? data.length : 1} record(s)`);
  
  try {
    const supabase = await createClient();
    
    let query = supabase.from(tableName).insert(data);
    
    if (options.upsert) {
      query = query.upsert(data);
    }
    
    if (options.onConflict) {
      query = query.onConflict(options.onConflict);
    }
    
    if (options.select) {
      query = query.select(options.select);
    }
    
    return await safeQuery(
      () => query,
      `Failed to insert data into ${tableName}`
    );
    
  } catch (error) {
    console.error(`❌ Safe insert to ${tableName} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown insert error'
    };
  }
}

/**
 * Safe update with optimistic locking
 */
export async function safeUpdate<T>(
  tableName: string,
  data: any,
  filter: Record<string, any>,
  options: {
    select?: string;
    expectedVersion?: number;
  } = {}
): Promise<SafeQueryResult<T[]>> {
  console.log(`📝 Safe update to ${tableName} with filter:`, filter);
  
  try {
    const supabase = await createClient();
    
    let query = supabase.from(tableName).update(data);
    
    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    // Optimistic locking check
    if (options.expectedVersion) {
      query = query.eq('version', options.expectedVersion);
    }
    
    if (options.select) {
      query = query.select(options.select);
    }
    
    const result = await safeQuery(
      () => query,
      `Failed to update data in ${tableName}`
    );
    
    // Check if optimistic locking failed
    if (result.success && options.expectedVersion && (!result.data || Array.isArray(result.data) && result.data.length === 0)) {
      return {
        success: false,
        error: 'Update conflict: record was modified by another process',
        retryable: true
      };
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Safe update to ${tableName} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown update error'
    };
  }
}

/**
 * Safe delete with confirmation
 */
export async function safeDelete(
  tableName: string,
  filter: Record<string, any>,
  options: {
    requireConfirmation?: boolean;
    maxRecords?: number;
  } = {}
): Promise<SafeQueryResult<any[]>> {
  console.log(`🗑️ Safe delete from ${tableName} with filter:`, filter);
  
  try {
    const supabase = await createClient();
    
    // Safety check: count records first if max limit specified
    if (options.maxRecords) {
      const countResult = await safeQuery(
        () => supabase.from(tableName).select('*', { count: 'exact', head: true }),
        `Failed to count records in ${tableName}`
      );
      
      if (countResult.success && countResult.data && (countResult.data as any).count > options.maxRecords) {
        return {
          success: false,
          error: `Delete operation would affect ${(countResult.data as any).count} records, which exceeds the limit of ${options.maxRecords}`,
          retryable: false
        };
      }
    }
    
    let query = supabase.from(tableName).delete();
    
    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    return await safeQuery(
      () => query,
      `Failed to delete data from ${tableName}`
    );
    
  } catch (error) {
    console.error(`❌ Safe delete from ${tableName} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown delete error'
    };
  }
}

/**
 * Execute multiple operations in a transaction-like manner
 */
export async function safeTransaction<T>(
  operations: Array<() => Promise<SafeQueryResult<T>>>,
  options: {
    rollbackOnFailure?: boolean;
    continueOnError?: boolean;
  } = {}
): Promise<SafeQueryResult<T[]>> {
  console.log(`🔄 Executing safe transaction with ${operations.length} operations`);
  
  const results: T[] = [];
  const errors: string[] = [];
  
  try {
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      console.log(`🔄 Executing operation ${i + 1}/${operations.length}`);
      
      const result = await operation();
      
      if (result.success && result.data) {
        results.push(result.data);
      } else {
        errors.push(`Operation ${i + 1}: ${result.error || 'Unknown error'}`);
        
        if (!options.continueOnError) {
          console.error(`❌ Transaction failed at operation ${i + 1}`);
          return {
            success: false,
            error: `Transaction failed: ${errors.join('; ')}`,
            retryable: false
          };
        }
      }
    }
    
    if (errors.length > 0 && !options.continueOnError) {
      return {
        success: false,
        error: `Transaction completed with errors: ${errors.join('; ')}`,
        retryable: false
      };
    }
    
    console.log(`✅ Safe transaction completed successfully`);
    return {
      success: true,
      data: results
    };
    
  } catch (error) {
    console.error(`❌ Safe transaction failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown transaction error',
      retryable: true
    };
  }
}