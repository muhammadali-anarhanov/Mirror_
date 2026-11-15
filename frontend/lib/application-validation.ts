import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const applicationSubmissionSchema = z.object({
  applicationType: z.enum(["DEMO", "PARTNERSHIP", "CONTACT"]),
  companyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: optionalText(40),
  country: optionalText(80),
  website: z
    .union([z.literal(""), z.string().trim().url().max(500)])
    .optional()
    .transform((value) => (value ? value : undefined)),
  requestedBranches: z.preprocess(
    (value) => (value === "" || value == null ? undefined : Number(value)),
    z.number().int().min(1).max(10_000).optional(),
  ),
  message: optionalText(2_000),
  consent: z.literal(true),
  fax: z.string().max(200).optional(),
});

export type ApplicationSubmission = z.infer<typeof applicationSubmissionSchema>;
