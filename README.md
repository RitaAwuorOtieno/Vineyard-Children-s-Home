# Vineyard Children's Home website

This project keeps the existing plain HTML, CSS, and JavaScript website and adds Firebase as its backend. The Firebase web configuration is public client configuration; it is not an admin credential. Database and Storage security rules decide who may access data.

## Workspace and files

- Public pages: `index.html`, `about.html`, `programmes.html`, `college.html`, `impact.html`, `gallery.html`, `get involved.html`, `donate.html`, `contact.html`, `Events and news.html`, `Faqs.html`, `future-vision.html`, and `resources.html`.
- Administrator sign-in: `admin-login.html`; authenticated dashboard: `admin-dashboard.html`; `admin.html` forwards to sign-in.
- Firebase public web config: `firebase-config.js` (fill only with values from your Firebase web app).
- Firebase SDK setup: `js/firebase-client.js`; public rendering and enquiry form: `js/public-content.js`; sign-in: `js/login.js`; dashboard: `js/admin-dashboard.js`; enquiry email delivery: `functions/index.js`.
- Firebase project files: `firebase.json`, `firestore.rules`, `storage.rules`, and `cors.json`.
- Existing shared styles and site behavior: `css/style.css` and `js/main.js`.
- `PUBLICATION-CHECKLIST.md` records facts and approvals that the home should confirm before publication.

## What the dashboard manages

The dashboard has sections for announcements, gallery photos, approved public documents, page content blocks, staff profiles, testimonials, donation/support information, and private enquiries. It supports create, edit, draft/publish, and delete for managed content; uploads are limited to JPG/PNG/WebP images (5 MB) and PDF documents (10 MB). Public announcements appear on News & Events and the home page; published images appear in the gallery; published document downloads appear on Public Documents; published team profiles appear on About; and support information appears on Donate. Page content blocks are additions to the matching page; the existing hand-authored page copy is not yet editable through the dashboard.

The admin overview counts and displays up to 100 records per collection. There are no fabricated starter profiles, testimonials, reports, or donation instructions. Existing static content stays in place until an authorized maintainer edits it.

Private enquiries can be read, marked reviewed, or deleted only by an administrator. Public submissions are restricted by Firestore rules and are not displayed publicly. A Cloud Function sends a server-side email notification for each new enquiry to `ritaawuor53@gmail.com`; SMTP credentials are stored as a Firebase secret, not in browser code. The public enquiry form is for general messages only; visitors are told not to submit child case or other sensitive information. Public forms can still attract spam until Firebase App Check is configured and enforced.

## Firebase services and costs

This implementation uses Firebase Authentication (email/password), Cloud Firestore, and Cloud Storage. The website is still hosted as static files. Firebase's modular JavaScript SDK is loaded from Google's CDN only after Firebase configuration is present; no build step or package install is needed. Firebase recommends npm for most bundled applications; the CDN is used here to fit this existing no-build site. See [Firebase's CDN setup](https://firebase.google.com/docs/web/alt-setup).

**Cloud Storage currently requires the pay-as-you-go Blaze plan and a linked billing account.** Usage can incur charges; some no-cost usage may apply depending on bucket location and current pricing. Review Firebase pricing and set budget alerts before enabling Storage. The site does not upgrade the project or enable billing. See [Firebase's current Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

## Create and configure the Firebase project

You need a Google account with permission to create/manage the Firebase project. These actions happen in your own Firebase/Google Cloud account; no project, account, credentials, or billing configuration has been created by this code change.

1. In the [Firebase Console](https://console.firebase.google.com/), create a project. Choose a Firestore location near the people who will manage the website; the database location cannot be changed later.
2. Register a **Web app** in Project settings. Copy its web app configuration values into `firebase-config.js`. These values identify the project and are safe for a browser app; never paste a service-account JSON file, Admin SDK credential, password, or private key there.
3. In Authentication, enable **Email/Password**. Do not enable public sign-up. Add your production site domain and `localhost` to the authorized domains.
4. Create the Firestore database. The deployment file `firestore.rules` starts from deny-by-default behavior and allows public reads only for published managed records. Authenticated admin records are provisioned outside the browser.
5. Review the Storage billing requirement above. If you decide to proceed, link a billing account, set budget alerts, and create the default Storage bucket. The `storageBucket` value in `firebase-config.js` must match the bucket shown in Project settings.
6. In the Firebase Console Rules tabs, or by using the Firebase CLI deployment commands below, deploy `firestore.rules` and `storage.rules`. Do not replace these with test-mode/open rules.
7. Configure Cloud Storage CORS for your development and production origins. Replace `https://YOUR-PRODUCTION-DOMAIN` in `cors.json` with your exact HTTPS origin, then run `gsutil cors set cors.json gs://YOUR_BUCKET_NAME`. Browser downloads use Firebase's SDK so Storage rules are checked; direct browser downloads require CORS. See [Firebase download and CORS instructions](https://firebase.google.com/docs/storage/web/download-files).
8. Configure Firebase App Check for the web app with reCAPTCHA Enterprise. Create a score-based web key for your production domain in Google Cloud, register the web app under Firebase Console > App Check, then add that public site key to `recaptchaEnterpriseSiteKey` in `firebase-config.js`. Do not add localhost to the production reCAPTCHA key; for local tests use a staging HTTPS domain or follow Firebase's debug-provider setup without committing its debug token. The SDK initialization is already implemented. Verify valid traffic in App Check metrics, then enable Firestore enforcement. The enquiry form can submit without App Check because the current Firestore rules allow constrained public enquiry creation; configure and enforce App Check before relying on the public form to reduce automated abuse. reCAPTCHA Enterprise currently includes up to 10,000 assessments per month at no cost, with charges beyond that; review current pricing and usage before enabling it.

## Create the first administrator securely

There is no public account-registration page and no default password.

1. In Firebase Authentication > Users, use **Add user** to create the administrator's email/password account. Give the password to the administrator through a secure channel and require a unique password.
2. In Authentication > Users, copy that user's UID.
3. In Firestore, create a document in the `admins` collection whose document ID is exactly that UID. Add the field `active` with Boolean value `true`.
4. Only a trusted Firebase project owner should create or remove `admins/{uid}` documents. Browser rules deny writing admin records. For another administrator, repeat these steps with their own account and UID. Set `active` to false or remove the admin record to revoke dashboard authorization.
5. Open `admin-login.html`, sign in, and use the password-reset button if needed. Firebase sends the reset email; configure your project email templates and authorized domains first.

The dashboard checks the admin record for its interface, and Firestore/Storage rules check it again for every protected operation. A signed-in non-admin is redirected away and cannot write content using the client. The Firebase Console project owner remains trusted and can change project data/rules.

## Run locally

1. Configure Firebase as above, or leave `firebase-config.js` blank to keep the static public site working without backend features.
2. Start any static HTTP server from the project root. In VS Code, use Live Server; its default origin is `http://localhost:5500`. Do not open the pages as `file://` URLs.
3. Visit `http://localhost:5500/` for the website and `http://localhost:5500/admin-login.html` for sign-in. The dashboard is `admin-dashboard.html` and requires a Firebase administrator record.
4. If you use a different local port or hostname, add that exact origin to Firebase Authentication and the Storage CORS configuration.

## Content workflow

1. Sign in at `admin-login.html`; the Admin Login link is in the public-site footer.
2. Choose a dashboard section. Add or edit a record, review the child-safeguarding notice before uploading photos, and leave **Published** unchecked to keep a draft private.
3. Preview the record in the dashboard and check its title, text, alt text, category, and publication status. Only publish material that the home has verified and approved.
4. Save the record. Published content appears in its supported public section on the next page load. Unpublishing immediately removes database visibility and Storage-rule access for that asset. Public content/downloads are requested through Firebase SDK operations instead of long-lived download-token links.
5. Deleting a record asks for confirmation. It permanently deletes that Firestore record and attempts to remove its uploaded file.

Use only documents approved for public distribution. Do not upload children's case files, health information, private financial records, confidential donor/staff information, or images without documented permission and safeguarding approval. The dashboard is a basic content manager, not a records-retention or multi-role approval system.

## Contact form and privacy

The existing call and WhatsApp options remain available. The contact and volunteering pages have Firebase enquiry forms. Firestore stores submissions in a private `enquiries` collection; administrators can read them in the dashboard, while unauthenticated visitors can only submit a constrained new enquiry. The `emailNewEnquiry` Cloud Function sends new submissions to the home's fixed email address. Before use, configure App Check and SMTP, deploy the function and security rules, and complete an actual submission and admin-only read test.

### Enquiry email setup

1. Configure the Firebase project and App Check site key as described above, then verify and enforce App Check in Firebase Console before public launch.
2. Select a transactional SMTP provider. Set the `SMTP_HOST`, `SMTP_PORT`, and `SMTP_USER` function parameters when deploying. `SMTP_USER` must be an address the provider authorizes as the sender; replies are directed to the enquirer's email address.
3. Store the SMTP credential using `firebase functions:secrets:set SMTP_PASSWORD`. Never commit SMTP credentials or put them in `firebase-config.js`.
4. Install the function dependencies with `npm install --prefix functions`, then deploy with `firebase deploy --only functions:emailNewEnquiry`.
5. Submit a test enquiry using non-sensitive test data and confirm receipt at `ritaawuor53@gmail.com`. New Firestore records are stored even if email delivery later fails; check the Cloud Function logs and SMTP provider if a notification does not arrive.

Cloud Functions deployment requires the Firebase project to be on the Blaze plan and may incur usage charges. Do not enable public submissions until App Check is configured and enforced, the function and rules are deployed, and test delivery succeeds.

Review `privacy.html` and the home's retention procedure before enabling submissions. Decide who monitors enquiries, how long they are retained, and how deletion/privacy requests are handled. Avoid collecting sensitive information. The policy and operational practices must reflect the home's actual approved process.

## Deploying rules and hosting

Install the Firebase CLI on your own machine if needed, sign in, and select your project:

```powershell
npm install -g firebase-tools
firebase login
firebase use --add
```

From this project root, deploy only the rules first if you are not ready to publish the site:

```powershell
firebase deploy --only firestore:rules,storage
```

When ready and authorized to publish the static site, use:

```powershell
firebase deploy
```

The hosting configuration publishes the project root. Review `firebase.json` and the deployment target before running commands. These commands have not been run for this project, and this site has not been deployed.

## Security notes and limitations

- Firebase client config is public; access control comes from deployed rules and Auth. Never use a service-role key in browser code.
- Public managed documents are queried with `published == true`, matching the rules. Drafts and enquiry records are not public reads.
- The `admins` collection is read-only from the client and must be provisioned in the Firebase Console.
- Storage accepts bounded image/PDF types and sizes; verify file content and approvals before upload. CORS is limited to the listed origins.
- App Check client integration is present, but keys, registration, monitoring, and enforcement need setup. A single active admin role has broad dashboard permissions over managed collections; admin-account provisioning and revocation still happen in Firebase Console. Audit-log collection and multi-role access need further implementation. Basic Firestore `updatedAt`/`updatedBy` values are present, but this is not a tamper-proof audit log.
- Existing long-form site pages remain hand-authored. The dashboard can add page content blocks and manage the listed collections; it does not yet provide field-by-field editing for every existing paragraph, static gallery photo, donation instruction, or every existing page section.
- The previous local JSON editor files (`js/admin.js` and `site-content.json`) are retained for workspace history but are no longer used by the Firebase dashboard or public content renderer.
- Firebase services, rules, uploads, login, reset email, and live public rendering cannot be verified until a project is configured. Do not treat the current implementation as deployed or production-tested.

## Checks

There is no existing automated test runner. Run the syntax and configuration checks available in the project, then test against a Firebase Emulator or a separate Firebase test project before production. Confirm anonymous requests cannot read drafts/enquiries or write managed content; confirm a non-admin user is denied writes; and test administrator sign-in, reset, logout, publish/unpublish, uploads, deletion, forms, mobile layouts, and browser console/network behavior. Do not use real children's or enquiry data for test content.
