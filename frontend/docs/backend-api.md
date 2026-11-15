# Backend API

## Public application submission

### `POST /api/applications`

Accepts demo, partnership, and contact requests from the public website. The handler requires a same-origin JSON request, validates the body on the server, and inserts the application and its initial event in one database transaction.

Example request:

```json
{
  "applicationType": "DEMO",
  "companyName": "Example Retail",
  "contactName": "A. Example",
  "email": "a@example.com",
  "phone": "+998 90 000 00 00",
  "country": "Uzbekistan",
  "website": "https://example.com",
  "requestedBranches": 4,
  "message": "We are exploring an in-store fitting experience.",
  "consent": true,
  "fax": ""
}
```

`applicationType` must be `DEMO`, `PARTNERSHIP`, or `CONTACT`. Company name, contact name, email, and consent are required. Optional text is length-limited; branch count must be an integer from 1 to 10,000. The `fax` field is a hidden honeypot and must remain empty.

Responses:

- `201 { "ok": true }` — request and initial `SUBMITTED` event were saved.
- `202 { "ok": true }` — honeypot was filled; the response intentionally does not reveal bot detection.
- `400` — malformed JSON or invalid fields.
- `403` — missing or mismatched request origin.
- `413` — request body exceeds 20 KB.
- `415` — request is not JSON.
- `500` — request could not be saved; the response does not expose database details.

The `applications` row starts in `NEW`. The matching `application_events` row records the submission, the `NEW` status, consent, and the `PUBLIC_SITE` source. The application ID is not returned to the browser.

## Protected endpoints

Authentication, session inspection, role and tenant checks, admin application review, catalog CRUD, inventory, and audit endpoints are not implemented yet. Existing admin screens are preview-only and are not backed by this public API. Do not expose them as production administration until server-side authentication and RBAC are complete.
