import { jsonb, pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";

export type ApplicationType = "DEMO" | "PARTNERSHIP" | "CONTACT";
export type ApplicationStatus =
  | "NEW"
  | "REVIEWING"
  | "MORE_INFORMATION_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationType: text("application_type").$type<ApplicationType>().notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  country: text("country"),
  website: text("website"),
  requestedBranches: integer("requested_branches"),
  message: text("message"),
  status: text("status").$type<ApplicationStatus>().notNull().default("NEW"),
  assignedTo: uuid("assigned_to"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const applicationEvents = pgTable("application_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").notNull(),
  actorUserId: uuid("actor_user_id"),
  eventType: text("event_type").notNull(),
  previousStatus: text("previous_status").$type<ApplicationStatus>(),
  newStatus: text("new_status").$type<ApplicationStatus>(),
  note: text("note"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
