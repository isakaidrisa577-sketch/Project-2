# ISAKA DIGITAL HUB: setup
1. **Supabase**: create a project, open SQL Editor, run `schema.sql`. Register in the app, then run
   `update profiles set role='owner' where email='YOUR_EMAIL';`
2. **config.js**: paste Project URL and anon key (Settings > API).
3. **Netlify**: push this folder to GitHub, import in Netlify. Add environment variables:
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service_role key, server-side only, never in config.js).
4. Supabase Auth > URL Configuration: add your Netlify URL (needed for password reset).
5. Test: register > add service > checkout > submit a reference > sign in as owner > Owner > Orders > Approve.
## Needs external setup / not built yet
- Stage 2 gateway (Flutterwave): needs approved merchant account. `flutterwave-webhook.js` is a disabled stub.
- File uploads: owner currently pastes a delivery link (Drive/Dropbox). Supabase Storage upload is the next step.
- Charts, service images, logo upload, and the Terms/Privacy/Refund texts (short drafts) need expansion/legal review.
- Backups: enable Supabase daily backups (Pro) or schedule pg_dump.
