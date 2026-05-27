# Changelog

## [Unreleased]

### Fixed

- Switched Twilio authentication from Auth Token to scoped API Key (`TWILIO_API_KEY_SID` + `TWILIO_API_KEY_SECRET`). The previous credential type was removed during a routine secrets rotation, leaving all Twilio API requests unauthenticated and the dashboard empty. Updated `lib/twilio.ts` and `.env.local.example` to reflect the new credential shape.

### Security

- Routine `npm audit` — no vulnerabilities found.
