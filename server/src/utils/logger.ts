import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  // IMPORTANT: Never log plaintext messages or encryption keys
  // Strip any potentially sensitive fields before logging
  const safeMeta = { ...meta };
  delete safeMeta['encryptedContent'];
  delete safeMeta['roomKey'];
  delete safeMeta['key'];
  delete safeMeta['password'];

  const metaStr = Object.keys(safeMeta).length > 0
    ? ' ' + JSON.stringify(safeMeta)
    : '';

  return `${timestamp} [${level}] ${stack || message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat,
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        errors({ stack: true }),
        timestamp({ format: 'HH:mm:ss' }),
        logFormat,
      ),
    }),
  ],
});

// In production, add file transport
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  }));
}
