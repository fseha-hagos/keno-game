import { z } from 'zod';
import { LimitType, LimitDuration } from '@keno/shared-types';

export const RegisterSchema = z.object({
  phone: z
    .string()
    .min(7, 'Phone number must be at least 7 digits')
    .regex(/^[+0-9\s\-()]+$/, 'Invalid phone number format'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscore'),
  email: z.string().email().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format').optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions and privacy policy' }),
  }),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string().min(1, 'Password is required'),
  deviceId: z.string().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const PlaceBetSchema = z.object({
  roundId: z.string().uuid('Invalid round ID'),
  stakeMinor: z
    .string()
    .regex(/^\d+$/, 'Stake must be a positive integer minor amount string')
    .refine((val) => {
      const num = BigInt(val);
      return num >= 10n && num <= 1000000n; // $0.10 to $10,000.00
    }, 'Stake must be between 10 ($0.10) and 1,000,000 ($10,000.00) minor units'),
  currency: z.string().length(3).toUpperCase(),
  selectedNumbers: z
    .array(z.number().int().min(1).max(80))
    .min(1, 'Must select at least 1 number')
    .max(10, 'Cannot select more than 10 numbers')
    .refine((items) => new Set(items).size === items.length, {
      message: 'Selected numbers must be unique without duplicates',
    }),
  idempotencyKey: z.string().min(10).max(64),
});

export type PlaceBetInput = z.infer<typeof PlaceBetSchema>;

export const DepositSchema = z.object({
  amountMinor: z.string().regex(/^\d+$/),
  currency: z.string().length(3).toUpperCase(),
  paymentMethodId: z.string().min(1),
  idempotencyKey: z.string().min(10).max(64),
});

export type DepositInput = z.infer<typeof DepositSchema>;

export const WithdrawalSchema = z.object({
  amountMinor: z.string().regex(/^\d+$/),
  currency: z.string().length(3).toUpperCase(),
  destinationAccount: z.string().min(1),
  idempotencyKey: z.string().min(10).max(64),
});

export type WithdrawalInput = z.infer<typeof WithdrawalSchema>;

export const SetLimitSchema = z.object({
  limitType: z.nativeEnum(LimitType),
  duration: z.nativeEnum(LimitDuration),
  amountMinor: z.string().regex(/^\d+$/).optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export type SetLimitInput = z.infer<typeof SetLimitSchema>;

export const SelfExclusionSchema = z.object({
  durationDays: z.number().int().min(1).max(3650), // 1 day to 10 years
  reason: z.string().optional(),
});

export type SelfExclusionInput = z.infer<typeof SelfExclusionSchema>;
