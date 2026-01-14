## 2025-02-14 - Information Leakage in Checkout API

**Vulnerability:** The Checkout API (`/api/checkout`) was catching errors from the `wayl` service and returning `error.message` directly to the client in the JSON response.
**Learning:** Returning raw error messages can expose internal system details, database connection strings, or third-party service errors to potential attackers. This information can be used to fingerprint the system or identify further attack vectors.
**Prevention:** Always catch exceptions at the API boundary and return a generic error message (e.g., "Payment creation failed") to the client. Log the specific error details internally for debugging purposes.

## 2025-05-23 - Authorization Bypass in Server Actions

**Vulnerability:** The `sendCampaign` Server Action in `apps/admin` lacked explicit authorization checks, relying solely on middleware protection which is insufficient for endpoint security.
**Learning:** Server Actions are public endpoints. Relying only on middleware creates a single point of failure and "defense in depth" gaps. If middleware is misconfigured or bypassed, the action becomes accessible to unauthorized users.
**Prevention:** Always implement explicit authentication and role-based authorization checks at the beginning of every Server Action that performs sensitive operations.
