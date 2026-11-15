import { NextResponse } from "next/server";
import { applicationSubmissionSchema } from "@/lib/application-validation";
import { applicationEvents, applications } from "@/lib/database-schema";

export const runtime = "nodejs";

function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request.headers.get("host");

  if (!origin || !host) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProtocol = (forwardedProtocol ?? new URL(request.url).protocol).replace(/:$/, "");
    return originUrl.host.toLowerCase() === host.toLowerCase() && originUrl.protocol === `${requestProtocol}:`;
  } catch {
    return false;
  }
}

function acceptedResponse(status = 202) {
  return NextResponse.json({ ok: true }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "JSON is required." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 20_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof payload === "object" && payload !== null && "fax" in payload && typeof payload.fax === "string" && payload.fax.trim()) {
    return acceptedResponse();
  }

  const parsed = applicationSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the submitted fields." }, { status: 400 });
  }

  const submission = parsed.data;

  try {
    if (process.env.BACKEND_URL) {
      const upstream = await fetch(`${process.env.BACKEND_URL.replace(/\/$/, "")}/api/v1/applications`, {
        method: "POST", headers: { "Content-Type": "application/json", Origin: request.headers.get("origin")! },
        body: JSON.stringify(submission), cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }
    const { db } = await import("@/lib/database");
    await db.transaction(async (transaction) => {
      const [application] = await transaction
        .insert(applications)
        .values({
          applicationType: submission.applicationType,
          companyName: submission.companyName,
          contactName: submission.contactName,
          email: submission.email,
          phone: submission.phone ?? null,
          country: submission.country ?? null,
          website: submission.website ?? null,
          requestedBranches: submission.requestedBranches ?? null,
          message: submission.message ?? null,
          status: "NEW",
        })
        .returning({ id: applications.id });

      if (!application) {
        throw new Error("Application insert returned no row.");
      }

      await transaction.insert(applicationEvents).values({
        applicationId: application.id,
        eventType: "SUBMITTED",
        newStatus: "NEW",
        details: { consentGiven: submission.consent, source: "PUBLIC_SITE" },
      });
    });

    return acceptedResponse(201);
  } catch (error) {
    console.error("[MIRROR] Public application could not be saved.", error instanceof Error ? error.name : "unknown error");
    return NextResponse.json({ error: "Unable to save the request right now." }, { status: 500 });
  }
}
