// In-memory rate limiting system for sophisticated exercise generation
// In production, this should be replaced with Redis for distributed systems

interface RateLimitWindow {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Rate limit configurations for different operations
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'exercise_generation': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50 // 50 exercises per hour
  },
  'ai_requests': {
    windowMs: 60 * 1000, // 1 minute  
    maxRequests: 10 // 10 AI requests per minute
  },
  'bulk_operations': {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5 // 5 bulk operations per 10 minutes
  },
  'admin_operations': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100 // 100 admin operations per minute
  }
};

// In-memory storage for rate limits
const rateLimitStore = new Map<string, RateLimitWindow>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if a user is within rate limits for a specific operation
 */
export async function checkRateLimit(
  userId: string, 
  operation: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[operation];
  if (!config) {
    console.warn(`⚠️ Unknown rate limit operation: ${operation}`);
    return {
      allowed: true,
      limit: 1000,
      remaining: 999,
      resetTime: Date.now() + 60000
    };
  }

  const key = `${userId}:${operation}`;
  const now = Date.now();
  
  // Get existing window or create new one
  let window = rateLimitStore.get(key);
  
  // Reset window if expired
  if (!window || now >= window.resetTime) {
    window = {
      count: 0,
      resetTime: now + config.windowMs
    };
  }

  // Check if request is allowed
  const allowed = window.count < config.maxRequests;
  
  if (allowed) {
    window.count++;
    rateLimitStore.set(key, window);
  }

  const remaining = Math.max(0, config.maxRequests - window.count);
  const retryAfter = allowed ? undefined : Math.ceil((window.resetTime - now) / 1000);

  console.log(`🔄 Rate limit check for ${userId}:${operation}: ${window.count}/${config.maxRequests} (${allowed ? 'ALLOWED' : 'BLOCKED'})`);

  return {
    allowed,
    limit: config.maxRequests,
    remaining,
    resetTime: window.resetTime,
    retryAfter
  };
}

/**
 * Get current rate limit status without incrementing counter
 */
export async function getRateLimitStatus(
  userId: string, 
  operation: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[operation];
  if (!config) {
    return {
      allowed: true,
      limit: 1000,
      remaining: 999,
      resetTime: Date.now() + 60000
    };
  }

  const key = `${userId}:${operation}`;
  const now = Date.now();
  const window = rateLimitStore.get(key);
  
  if (!window || now >= window.resetTime) {
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs
    };
  }

  const remaining = Math.max(0, config.maxRequests - window.count);
  const allowed = remaining > 0;

  return {
    allowed,
    limit: config.maxRequests,
    remaining,
    resetTime: window.resetTime,
    retryAfter: allowed ? undefined : Math.ceil((window.resetTime - now) / 1000)
  };
}

/**
 * Reset rate limits for a user (admin only)
 */
export async function resetRateLimit(
  userId: string, 
  operation?: keyof typeof RATE_LIMITS
): Promise<{ success: boolean; message: string }> {
  try {
    if (operation) {
      const key = `${userId}:${operation}`;
      rateLimitStore.delete(key);
      console.log(`✅ Reset rate limit for ${userId}:${operation}`);
      return { 
        success: true, 
        message: `Rate limit reset for ${operation}` 
      };
    } else {
      // Reset all rate limits for user
      const keysToDelete = Array.from(rateLimitStore.keys())
        .filter(key => key.startsWith(`${userId}:`));
      
      keysToDelete.forEach(key => rateLimitStore.delete(key));
      
      console.log(`✅ Reset all rate limits for ${userId} (${keysToDelete.length} operations)`);
      return { 
        success: true, 
        message: `All rate limits reset (${keysToDelete.length} operations)` 
      };
    }
  } catch (error) {
    console.error('❌ Error resetting rate limit:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get comprehensive rate limit overview for a user
 */
export async function getUserRateLimits(userId: string): Promise<Record<string, RateLimitResult>> {
  const results: Record<string, RateLimitResult> = {};
  
  for (const operation of Object.keys(RATE_LIMITS) as Array<keyof typeof RATE_LIMITS>) {
    results[operation] = await getRateLimitStatus(userId, operation);
  }
  
  return results;
}

/**
 * Clean up expired rate limit entries (should be called periodically)
 */
export function cleanupExpiredRateLimits(): { cleaned: number; total: number } {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [key, window] of rateLimitStore.entries()) {
    if (now >= window.resetTime) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
  
  const cleaned = keysToDelete.length;
  const total = rateLimitStore.size;
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired rate limit entries (${total} remaining)`);
  }
  
  return { cleaned, total };
}

// Cleanup expired entries every 5 minutes
setInterval(cleanupExpiredRateLimits, 5 * 60 * 1000);

/**
 * Update rate limit configuration (admin only)
 */
export function updateRateLimitConfig(
  operation: keyof typeof RATE_LIMITS,
  config: Partial<RateLimitConfig>
): { success: boolean; message: string } {
  try {
    const currentConfig = RATE_LIMITS[operation];
    if (!currentConfig) {
      return { success: false, message: `Unknown operation: ${operation}` };
    }
    
    RATE_LIMITS[operation] = { ...currentConfig, ...config };
    
    console.log(`🔧 Updated rate limit config for ${operation}:`, RATE_LIMITS[operation]);
    return { success: true, message: `Rate limit config updated for ${operation}` };
  } catch (error) {
    console.error('❌ Error updating rate limit config:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}