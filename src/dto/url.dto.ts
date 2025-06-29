import { z } from "zod";

/**
 * Schema for URL shortening request validation
 */
export const ShortenUrlSchema = z.object({
  url: z
    .string({ required_error: "URL is required" })
    .min(1, "URL is required")
    .url("Invalid URL format")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ["http:", "https:"].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: "URL must have http or https protocol" },
    ),
  title: z.string().max(100, "Title must be at most 100 characters").optional(),
  description: z
    .string()
    .max(300, "Description must be at most 300 characters")
    .optional(),
});

/**
 * Schema for URL deletion request validation
 */
export const DeleteUrlSchema = z.object({
  slug: z
    .string({ required_error: "Slug is required" })
    .min(6, "Slug must be at least 6 characters")
    .max(32, "Slug must be at most 32 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Slug must be alphanumeric"),
});

/**
 * Schema for user authentication request validation
 */
export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/**
 * Schema for user registration request validation
 */
export const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number",
    ),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
});

/**
 * Schema for password change request validation
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "New password must contain at least one lowercase letter, one uppercase letter, and one number",
    ),
});

/**
 * Schema for profile update request validation
 */
export const UpdateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
});

// Type exports for use in controllers
export type ShortenUrlRequest = z.infer<typeof ShortenUrlSchema>;
export type DeleteUrlRequest = z.infer<typeof DeleteUrlSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;
