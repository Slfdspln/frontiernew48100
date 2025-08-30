// utils/ratelimit.js
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a mock rate limiter for development when Redis is not configured
class MockRateLimiter {
  async limit() {
    return { success: true, limit: 10, remaining: 9, reset: Date.now() + 60000 };
  }
}

let rl;
try {
  // Try to create Redis connection
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = Redis.fromEnv();
    rl = new Ratelimit({ 
      redis, 
      limiter: Ratelimit.slidingWindow(10, '1 m') // 10 requests per minute per IP
    });
  } else {
    console.warn('Upstash Redis not configured, using mock rate limiter for development');
    rl = new MockRateLimiter();
  }
} catch (error) {
  console.warn('Failed to initialize Redis rate limiter, using mock:', error.message);
  rl = new MockRateLimiter();
}

export { rl };
