import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URL: z.string().min(1, 'MONGO_URL is required and cannot be empty'),
  DASHBOARD_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_ENABLED: z
    .union([z.boolean(), z.string()])
    .default('true')
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      return val === 'true' || val === '1';
    }),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  INGEST_ENABLED: z
    .union([z.boolean(), z.string()])
    .default('true')
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      return val === 'true' || val === '1';
    }),
  PAGES_LIMIT: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    process.stderr.write(
      `Configuration error: Invalid environment configuration\n${formattedErrors}\n`,
    );
    process.exit(1);
  }
  return result.data;
}
