# Technical review and release report

**Review date:** 10 November 2026  
**Review scope:** Current website source, dashboard publish flow, Firebase rule files, and Netlify deployment configuration.  
**Release status:** Source review completed. Production release is **not verified**; complete the live service checks below before describing the site as production-ready.

## Publish button finding

The dashboard previously waited for the selected collection to reload before showing a successful save. A Firestore write could resolve successfully while that follow-up read was slow or blocked, leaving the interface looking as if it were still publishing. The dashboard now reports the Firestore save phase, displays a wait message if Firebase has not confirmed the write after 15 seconds, and reports success as soon as `setDoc` resolves. It refreshes the list and removes replaced files afterward, with a warning if either follow-up operation fails. Gallery media copied from an existing Storage upload also gets its own progress message.

This is a source-level fix for the stuck status. It does not establish whether the configured Firebase project accepts a particular publication. If the write is rejected, the dashboard should now show the Firebase error; verify with a real admin account and an approved test record after deploying the current source and matching rules.

## Remaining code-level limitations

- **Dashboard collection lists cap at 500 records.** Search, filters, sorting, and pagination operate on the records loaded for the selected collection. Older records beyond that cap will not be discoverable there.
- **Public content queries cap at 40 published records per collection.** The public pages can therefore show fewer items than the dashboard contains. This is most relevant to gallery and news as collections grow.
- **Page content management is additive.** Dashboard page blocks can add content, while existing hand-authored page copy still needs a source edit.
- **File removal is a two-service operation.** A saved record can succeed while deletion of its replaced Storage object fails. The dashboard reports this cleanup failure, but an administrator must remove the orphaned file in Firebase Console.
- **No automated test suite or browser test configuration was found.** The checks below are syntax/configuration hygiene checks, not behavioral coverage.

## Firebase and hosting review boundaries

The Firestore and Storage rules were inspected in the repository. They use an active `admins/{uid}` record for protected operations, allow public reads of published managed content, and constrain public enquiry creation. Storage rules restrict file types and sizes and gate public asset reads on a published record. This is a review of the files only: the Firebase CLI could not be used in this environment because it failed with `EPERM` while trying to read the user-level Firebase CLI config outside the workspace. The rules have not been deployed, compiled by the Firebase emulator, or tested against the live project. Confirm the deployed rules match these files and test both an administrator and a normal authenticated user.

The repository configures Netlify as the static host through `netlify.toml`. No Netlify site, domain, deploy, or production response was accessed during this review. Netlify deployment and hosting behavior are unverified.

## Checks run

- JavaScript syntax check for every `js/*.js` file using Node: **passed**.
- `firebase.json` JSON parse: **passed**.
- `git diff --check`: **passed** (Git reported only its LF-to-CRLF working-copy notice).
- Firebase CLI check: **not completed**; it failed with `EPERM` reading user-level configuration outside the workspace.
- Firebase Authentication, Firestore, Storage, App Check, and deployed security rules: **not tested**.
- Netlify build/deploy, domain, and production site: **not tested**.
- Browser interaction, mobile layouts, file upload, public rendering after publication, enquiry delivery, and restore/backups: **not tested**.

## Release checks still needed

1. Deploy the current Firestore and Storage rules to the intended Firebase project and verify the Firebase project configuration used by this site.
2. Sign in as an administrator and publish a harmless test record and test gallery image; confirm both appear publicly, then remove the test content.
3. Sign in as a normal authenticated user and confirm dashboard access and writes are denied. Confirm a visitor can submit a test enquiry and that only an administrator can read it.
4. Configure and observe App Check on the production domain, then enable enforcement after valid requests are confirmed.
5. Deploy through the organization’s Netlify account and verify the production domain, page links, image loading, and responsive layouts on phone, tablet, and desktop.
6. Confirm donation instructions and published child-related images/stories are approved. Confirm backup and restore procedures in the Firebase/Google Cloud account.

