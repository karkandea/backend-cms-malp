import { authConfig } from "./config";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: Date;
};

const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function now() {
  return Date.now();
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const windowMs = options.windowSeconds * 1000;
  const bucket = inMemoryStore.get(options.key);
  const currentTime = now();

  if (!bucket || bucket.resetAt <= currentTime) {
    inMemoryStore.set(options.key, {
      count: 1,
      resetAt: currentTime + windowMs,
    });
    return {
      success: true,
      remaining: options.limit - 1,
      resetAt: new Date(currentTime + windowMs),
    };
  }

  if (bucket.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: new Date(bucket.resetAt),
    };
  }

  bucket.count += 1;
  inMemoryStore.set(options.key, bucket);

  return {
    success: true,
    remaining: Math.max(options.limit - bucket.count, 0),
    resetAt: new Date(bucket.resetAt),
  };
}

export function getCmsLoginRateLimitConfig() {
  return authConfig.rateLimit.login;
}

export function getMobileLoginRateLimitConfig() {
  return authConfig.rateLimit.login;
}

export function getMobileRefreshRateLimitConfig() {
  return authConfig.rateLimit.refresh;
}
