# Ark backend pilot

The public landing page stays on GitHub Pages. `account.html` adds email-link accounts, verified early-list enrollment, ZIP/language preferences, phone verification, consent and opt-out, and an authenticated current-alert view. Supabase owns the database, auth and Edge Functions. NWS supplies official severe/extreme active weather alerts. Microsoft Translator translates official wording. Twilio sends short notices linking to the full signed-in alert view.

## Deployment

1. Create a Supabase project and link it with the Supabase CLI. Run `supabase db push`, then deploy `alerts` and `dispatch`. `supabase/config.toml` disables the gateway JWT check because `alerts` validates the end-user token itself and `dispatch` validates a separate server-only secret. Never remove those checks.
2. Set Auth Site URL and allowed redirect URL to `https://pekruse.github.io/Ark/account.html`. Enable email sign-in with a production SMTP sender. Configure CAPTCHA and email/phone OTP rate limits. Enable phone auth using Twilio and require phone-change verification. Test a phone change from an existing account.
3. Set `config.js` to the project URL and **public anon** key only. These are expected to be public. Never put the service-role key, provider keys or dispatch secret in Pages, commits or browser storage.
4. Edge secrets: `CONTACT_EMAIL`, `TRANSLATOR_KEY`, `TRANSLATOR_REGION`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, and a strong random `DISPATCH_SECRET`. Supabase provides its URL and service-role key to Edge Functions. Configure a Twilio Messaging Service with an approved sender, Advanced Opt-Out (STOP/START/HELP), and appropriate sender registration. Configure the support response with Ark's contact email. Verification texts and notification texts both incur provider charges.
5. Keep `SMS_DELIVERY_ENABLED` unset until a private end-to-end test succeeds. Then set it to `true` in Edge secrets. Add GitHub repository Actions secrets `ARK_FUNCTION_URL` (the project URL plus `/functions/v1`) and `ARK_DISPATCH_SECRET`, matching the Edge secret. Set repository Actions variable `ARK_SMS_DELIVERY_ENABLED=true` to enable the scheduled workflow. Do not use automation secrets in Pages builds.
6. Run the workflow manually first with consenting test recipients. Confirm accepted delivery in Twilio, phone verification, STOP blocking, local disable, delete preferences, email links and two-user data isolation. Confirm the translated message and official original, and an expired/cancelled alert exclusion. These checks need real provider accounts; local tests cannot establish live delivery.

## Storage and access

`preferences` contains verified-account early-list entries and preferences. Accounts without saved preferences are not enrolled. Users can access only their own row through row-level security. Auth stores email and verified phone. Users cannot read delivery logs, translation cache or quota records. Service-role access stays in Edge Functions. Deleting preferences stops dispatch; an account deletion through Supabase cascades stored user rows. Establish a retention policy for old delivery records and expired translation cache before broad rollout.

## Pilot limits

- This is an additional information channel, not a replacement for official warning systems. GitHub Actions scheduling can be delayed; the workflow runs approximately every five minutes. No mobile background push is implemented; the account page checks alerts on demand.
- ZIP center lookups use Zippopotam.us and are approximate. NWS point queries may miss hazards elsewhere in a ZIP. The UI exposes official affected areas. Do not claim precise address-level coverage.
- Only active Actual Severe/Extreme NWS alerts are sent. Government notice uploads, shelter databases, plain-language rewriting and local-government feeds are not part of this backend. It never invents shelter locations or emergency instructions.
- The browser and scheduled job translate complete official wording through Microsoft Translator. Failed translations display the official English original in the browser; scheduled non-English texts wait for a successful translation. Human translation QA is required before broader launch.
- Authenticated refresh is limited to 20/hour per user. Configure auth CAPTCHA/rate limits in Supabase before publishing. The scheduler processes pages of 25 subscribers, up to 2,500 per run; upgrade to a durable queue before growth. Large batches can exceed Edge runtime limits; monitor job duration and reduce batch size as needed.
- Delivery claims have a unique user/alert/language key. They prevent concurrent duplicate submission. Accepted means Twilio accepted the request, not confirmed handset delivery. Failed or unknown submissions are not automatically retried; inspect records/provider logs before any manual retry. Provider-level STOP blocking is authoritative; on error 21610 the local preference is disabled too. START does not re-enable the local preference automatically.
- Texts contain a translated event label and link; complete instructions stay in the account view. Links require login and alerts may expire before opened. The `alert` parameter highlights a matching current alert; it does not bypass the saved ZIP or authentication.

## Validation

Run `npm test` and `node --check account.js`. CI also runs `deno check` on both Edge Functions. Apply the migration to a test Supabase project to verify RLS with two accounts and unauthenticated requests. Test provider outages, quota exhaustion, duplicate scheduler runs and STOP before enabling scheduled delivery.

References: [Supabase auth](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [NWS API](https://www.weather.gov/documentation/services-web-api), [Microsoft Translator](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/reference/v3/translate), [Twilio Messaging](https://www.twilio.com/docs/messaging/api/message-resource).
