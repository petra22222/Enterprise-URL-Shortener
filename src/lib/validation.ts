// FILE: src/lib/validation.ts
import { z } from "zod";

export const createLinkSchema = z.object({
  originalUrl: z.string().min(1).max(2048),
  alias: z.string().min(3).max(30).optional(),
  title: z.string().max(200).optional(),
  expiresAt: z.string().datetime().optional(),
  password: z.string().min(4).max(100).optional(),
  customDomainId: z.string().cuid().optional(),
});

export const updateLinkSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  originalUrl: z.string().min(1).max(2048).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(4).max(100).nullable().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const reportSchema = z.object({
  shortCodeOrUrl: z.string().min(1).max(2048),
  reason: z.string().min(3).max(200),
  details: z.string().max(2000).optional(),
});

export const domainSchema = z.object({
  hostname: z
    .string()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9.-]+$/i, "Enter a valid hostname, e.g. links.example.com"),
});