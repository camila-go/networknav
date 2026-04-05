import { z } from "zod";

// ============================================
// Auth Validations
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    name: z.string().min(2, "Name must be at least 2 characters"),
    position: z.string().min(2, "Position is required"),
    title: z.string().min(2, "Title is required"),
    company: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================
// Profile Validations
// ============================================

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  position: z.string().min(2, "Position is required"),
  title: z.string().min(2, "Title is required"),
  company: z.string().optional(),
  location: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

// ============================================
// Questionnaire Validations
// ============================================

export const questionnaireResponseSchema = z.object({
  roleSummary: z.string().max(2000).optional(),
  archetype: z.string().optional(),
  teamQualities: z.array(z.string()).max(5).optional(),
  growthArea: z.string().max(2000).optional(),
  talkTopic: z.string().max(2000).optional(),
  refinedInterest: z.string().max(2000).optional(),
  personalInterest: z.string().max(2000).optional(),
  personalInterestPhoto: z.enum(["uploaded", "skipped"]).optional(),
  personalityTags: z.array(z.string()).max(8).optional(),
  joyTrigger: z.string().max(500).optional(),
  threeWords: z.string().max(200).optional(),
  headline: z.string().max(500).optional(),
  funFact: z.string().max(2000).optional(),
});

// ============================================
// Message Validations
// ============================================

export const messageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long (max 2000 characters)"),
});

// ============================================
// Type Exports
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type QuestionnaireInput = z.infer<typeof questionnaireResponseSchema>;
export type MessageInput = z.infer<typeof messageSchema>;

