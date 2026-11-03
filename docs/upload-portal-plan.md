Yes, it's possible, and it fits what you already have. Here's what I'd recommend.

**It should be a second Cloud Run service.** The current service sits entirely behind Google sign-in, which only admits your own Workspace accounts, and lawyers won't have those. So the portal has to be a separate service that anyone can reach. It can still be the same repo and the same Docker image: start it with something like `PORTAL_MODE=true`, so it only registers the few portal routes and nothing else. Nothing from the main app would be exposed publicly, and you'd still deploy it with the same script.

**How the lawyer gets in: a private link per case, not an account.**

1. Staff click "Request records" on a case. The app creates a long, unguessable token tied to that case with an expiry date, which is the same idea as the questionnaire `accessToken`.
2. The lawyer gets a link like `upload.evalitas.com/r/<token>`. Optionally, they confirm their email with a one-time code before uploading.
3. Uploads go straight to the bucket through signed URLs. Your app already does this.
4. Uploaded files land in a "pending" state on the case, and staff accept them into the records.
5. The portal is **upload-only**. The lawyer can never see or download anything, which keeps the risk small.

**HIPAA:** Cloud Run and Cloud Storage are both covered by the agreement you already signed with Google, and files are encrypted at rest by default. What you'd add is:

- links that expire;
- limits on file size and file type;
- rate limiting;
- logs of who uploaded what and when;
- possibly a virus scan on uploads.

**Fitting it into your website:** yes. Give the portal its own address like `upload.evalitas.com`, mapped to the new service, and put a "Send us records" button on evalitas.com that links to it. A plain link works better than embedding the upload page inside the website.

**Before building it:** if requests are infrequent at first, a paid file-request tool that will sign a HIPAA agreement (Box, ShareFile) gets you this today with no code. Build your own once the manual step of moving files into the app gets annoying. When you do, it's roughly the size of the tablet work plus a small public page.
