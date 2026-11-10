# Technical handover and release checklist

## Architecture and ownership

- Static HTML/CSS/JavaScript website deployed through Netlify (`netlify.toml`, publish directory `.`; no build step).
- Firebase Authentication, Cloud Firestore, and Cloud Storage provide the admin and content backend. Firebase CLI is for Firestore and Storage rules only.
- The browser Firebase config is public client configuration. Never place service-account credentials, passwords, private keys, or reCAPTCHA secret keys in this repository.
- Keep the domain registrar, Netlify team, Firebase project, source repository, and recovery methods under organization-controlled accounts. Keep at least two trusted maintainers.
- Admin access requires an individual Firebase Authentication user and an `admins/{uid}` Firestore document with Boolean `active: true`. Provision and revoke this in the Firebase Console; browser code cannot edit the admin roster.

## Firebase App Check: configuration is not confirmed

The client initializes reCAPTCHA Enterprise App Check when `recaptchaEnterpriseSiteKey` is set in `firebase-config.js`. Code presence does not prove the app is registered or enforcement is active.

1. Register the production web app and exact domain in Firebase App Check.
2. Create/use a reCAPTCHA Enterprise web key registered for the production domain and set its public site key in `firebase-config.js`.
3. Deploy to a staging or production Netlify domain and check App Check metrics for valid requests from real site flows.
4. Test sign-in, public enquiries, content reads, uploads, and downloads before enabling enforcement.
5. Enable enforcement for the required Firebase products only after valid traffic is verified; monitor errors after enforcement.
6. Keep local development on a documented staging/debug-provider setup. Never commit a debug token.

**Current repository status:** client integration exists; Console registration, site-key correctness, observed valid traffic, and enforcement state require owner verification.

## Rules and security verification

Deploy the reviewed `firestore.rules` and `storage.rules` with:

```powershell
firebase deploy --only firestore:rules,storage
```

Before production use, validate rules in Firebase Emulator Suite or a separate Firebase test project. Use synthetic accounts/data and verify all of these:

- Anonymous visitors can create only constrained new enquiries; they cannot read enquiries/drafts or write managed content.
- A normal authenticated Firebase user without an active `admins/{uid}` record is redirected from the dashboard and receives denied read/write access to protected data.
- An active admin can manage records, status updates, and approved files.
- Public visitors can read only published content and its associated assets.
- Enquiry updates can only be performed by active admins.

**Current status:** rules are in the repository; no live project, emulator, or normal-user security test was available in this workspace. Deployment and tests are not confirmed.

## Content approval and donation details

Before launch, an authorized Vineyard representative must verify the official name, registration details, location, services, impact figures, leadership, contact details, donation channels, bank/M-PESA information, and any suggested monthly giving amounts. Do not publish example or unconfirmed financial information. Verify the recipient account and payment instructions independently, and document who can issue receipts and answer donor questions.

For photographs and stories, retain documented consent and safeguarding approval. Avoid names, identifying case details, health information, and other sensitive information about children. Gallery captions and album labels are public content.

## Backups and recovery

The organization’s Google Cloud/Firebase owner must configure:

- Scheduled Firestore exports to an access-restricted bucket with documented retention.
- A separate backup/versioning and retention plan for Cloud Storage uploads.
- A protected copy of the website source, deployed rules, Netlify configuration, and release notes.
- A periodic restore test for both Firestore records and uploaded assets.
- A documented incident/recovery contact and access-transfer process.

Do not store private enquiry exports in the public Netlify site or a public bucket. Backup schedules, retention, access, and restore capability are not configured by this repository.

## Release verification record

The maintainer releasing a version should record the date, commit, Netlify deploy ID, Firebase project ID, rule deployment result, App Check enforcement state, and test results in the organization’s handover log. Test all public pages and navigation; mobile/tablet/desktop layouts; enquiry submissions; gallery, documents, links and donation instructions; admin publishing; image replacement/deletion; and keyboard/accessibility behavior.

This workspace review can check source syntax and configuration files, but cannot confirm the live Netlify site, Firebase project, real administrator roles, App Check metrics/enforcement, production rules, donation account details, backups, or device/browser behavior. Complete the relevant project-owner checks before treating the site as production-ready.
