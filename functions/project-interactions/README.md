# `project-interactions` Appwrite Function

Node.js 22 function, entrypoint `main.mjs`, execution role `All users`, scopes:
- `users.read`
- `documents.write`
- `messages.write` (only needed if using `USE_APPWRITE_MESSAGING=true`)

## Optional Email Notification on New Submissions

When a new submission is created (never on duplicate retries), the function checks the recipient's `prefs.email_on_submission` (default `true`) and sends an email via whichever provider is configured in Function Environment Variables:

1. **Zero-domain SMTP via Appwrite Messaging (recommended for \$0 without a custom domain)**:
   - In Appwrite Console → Messaging → Providers → Create SMTP provider (QQ / 163 / Outlook / Gmail app password).
   - Add scope `messages.write` to `project-interactions`.
   - Set environment variable `USE_APPWRITE_MESSAGING=true` (and optionally `SITE_URL`).
2. **Resend API** (with custom domain):
   - Set `RESEND_API_KEY` and `MAIL_FROM` (e.g. `M1 Infinitas <notify@yourdomain.com>`).
3. **Brevo API**:
   - Set `BREVO_API_KEY` and `MAIL_FROM` (sender email address).

Email failures are logged and never block the in-app submission.
