/**
 * Dollop Logger
 *
 * Controlled by EXPO_PUBLIC_APP_ENV ('development' | 'production') in .env.
 *
 * - development: logs print to console with a `[Tag]` prefix, visible via
 *   `adb logcat` (see commands.md in the project root for filter commands).
 * - production: all log calls are no-ops — nothing is printed, zero overhead.
 *
 * Usage:
 *   import { logger } from '@utils/logger';
 *   logger.debug('LocalMusic', 'starting scan');
 *   logger.info('Auth', 'user signed in', { email: user.email });
 *   logger.warn('Player', 'no preview URL', { songId });
 *   logger.error('API', 'request failed', err);
 *
 * Output format: `[Tag] message <data>` — e.g. `[LocalMusic] scan complete {"count":42}`
 */

const APP_ENV = process.env['EXPO_PUBLIC_APP_ENV'] ?? 'development';
const IS_DEV = APP_ENV === 'development';

function formatData(data: unknown): string {
    if (data === undefined) return '';
    if (data instanceof Error) return `${data.name}: ${data.message}`;
    try {
        return JSON.stringify(data);
    } catch {
        return String(data);
    }
}

function emit(level: 'debug' | 'info' | 'warn' | 'error', tag: string, message: string, data?: unknown): void {
    if (!IS_DEV) return; // Complete no-op in production

    const prefix = `[${tag}]`;
    const dataStr = formatData(data);
    const parts = dataStr ? [prefix, message, dataStr] : [prefix, message];

    switch (level) {
        case 'debug':
        case 'info':
            console.log(...parts);
            break;
        case 'warn':
            console.warn(...parts);
            break;
        case 'error':
            console.error(...parts);
            break;
    }
}

export const logger = {
    debug: (tag: string, message: string, data?: unknown) => emit('debug', tag, message, data),
    info: (tag: string, message: string, data?: unknown) => emit('info', tag, message, data),
    warn: (tag: string, message: string, data?: unknown) => emit('warn', tag, message, data),
    error: (tag: string, message: string, data?: unknown) => emit('error', tag, message, data),
};

/** True when EXPO_PUBLIC_APP_ENV === 'development' */
export const isDevEnv = IS_DEV;