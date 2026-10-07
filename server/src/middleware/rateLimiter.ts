import rateLimit from 'express-rate-limit';
import {
  RATE_LIMIT_JOIN_WINDOW_MS, RATE_LIMIT_JOIN_MAX,
  RATE_LIMIT_CREATE_WINDOW_MS, RATE_LIMIT_CREATE_MAX,
  RATE_LIMIT_MSG_WINDOW_MS, RATE_LIMIT_MSG_MAX,
} from '@chatx/shared/constants';

export const createRoomLimiter = rateLimit({
  windowMs: RATE_LIMIT_CREATE_WINDOW_MS,
  max: RATE_LIMIT_CREATE_MAX,
  message: { error: 'Too many rooms created. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

export const joinRoomLimiter = rateLimit({
  windowMs: RATE_LIMIT_JOIN_WINDOW_MS,
  max: RATE_LIMIT_JOIN_MAX,
  message: { error: 'Too many join attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'File upload limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
