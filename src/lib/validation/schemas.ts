import { z } from 'zod';

// ============================================
// Profile Validation Schemas
// ============================================

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),

  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .nullable(),

  interests: z
    .array(z.string().max(50))
    .max(10, 'Maximum 10 interests allowed')
    .optional()
    .nullable(),

  location: z
    .string()
    .max(100, 'Location too long')
    .optional()
    .nullable(),

  age: z
    .number()
    .int()
    .min(18, 'Must be 18 or older')
    .max(120, 'Invalid age')
    .optional()
    .nullable(),

  // Extended Jynx profile fields
  position: z
    .string()
    .max(100, 'Position too long')
    .optional()
    .nullable(),

  title: z
    .string()
    .max(100, 'Title too long')
    .optional()
    .nullable(),

  company: z
    .string()
    .max(100, 'Company name too long')
    .optional()
    .nullable(),

  photoUrl: z
    .string()
    .url('Invalid photo URL')
    .optional()
    .nullable(),

  questionnaireData: z
    .record(z.unknown())
    .optional()
    .nullable(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ============================================
// Meeting Validation Schemas
// ============================================

export const meetingScheduleSchema = z.object({
  matchedUserId: z.string().uuid('Invalid user ID'),

  platform: z.enum(['google', 'microsoft'], {
    errorMap: () => ({ message: 'Platform must be google or microsoft' }),
  }),

  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long'),

  startTime: z
    .string()
    .datetime('Invalid start time format'),

  durationMinutes: z
    .number()
    .int()
    .min(15, 'Minimum 15 minutes')
    .max(240, 'Maximum 4 hours')
    .default(30),
});

export type MeetingScheduleInput = z.infer<typeof meetingScheduleSchema>;

// ============================================
// User Safety Validation Schemas
// ============================================

export const reportUserSchema = z.object({
  reportedUserId: z.string().uuid('Invalid user ID'),

  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(50, 'Reason too long'),

  description: z
    .string()
    .max(500, 'Description too long')
    .optional(),
});

export type ReportUserInput = z.infer<typeof reportUserSchema>;

export const blockUserSchema = z.object({
  blockedUserId: z.string().uuid('Invalid user ID'),
});

export type BlockUserInput = z.infer<typeof blockUserSchema>;

// ============================================
// Search/Filter Validation Schemas
// ============================================

export const searchFiltersSchema = z.object({
  industries: z.array(z.string()).optional(),
  leadershipLevels: z.array(z.string()).optional(),
  organizationSizes: z.array(z.string()).optional(),
  yearsExperience: z.array(z.string()).optional(),
  leadershipChallenges: z.array(z.string()).optional(),
  leadershipPriorities: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  location: z.string().optional(),
  keywords: z.string().max(200).optional(),
});

export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;

export const searchRequestSchema = z.object({
  query: z.string().max(200).optional(),
  filters: searchFiltersSchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  sortOrder: z.enum(['relevance', 'match-percentage', 'name', 'leadership-level']).default('relevance'),
});

export type SearchRequestInput = z.infer<typeof searchRequestSchema>;

// ============================================
// Compute Matches Validation Schema
// ============================================

export const computeMatchesSchema = z.object({
  userId: z.string().uuid().optional(),
  forAllUsers: z.boolean().optional(),
});

export type ComputeMatchesInput = z.infer<typeof computeMatchesSchema>;

// ============================================
// Meeting Request Validation (existing system)
// ============================================

export const meetingRequestSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),

  proposedTimes: z
    .array(z.string().datetime())
    .min(1, 'At least one proposed time required')
    .max(3, 'Maximum 3 proposed times'),

  duration: z
    .number()
    .int()
    .min(15, 'Minimum 15 minutes')
    .max(120, 'Maximum 2 hours'),

  meetingType: z.enum(['video', 'coffee', 'conference', 'phone']),

  contextMessage: z
    .string()
    .max(500, 'Message too long')
    .optional(),
});

export type MeetingRequestInput = z.infer<typeof meetingRequestSchema>;

// ============================================
// Calendar Read Validation Schema
// ============================================

export const calendarQuerySchema = z.object({
  mode: z.enum(['events', 'availability']),
  platform: z.enum(['google', 'microsoft']).optional(),
  targetUserId: z.string().optional(),
  timeMin: z.string().datetime('Invalid timeMin format'),
  timeMax: z.string().datetime('Invalid timeMax format'),
});

export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;

