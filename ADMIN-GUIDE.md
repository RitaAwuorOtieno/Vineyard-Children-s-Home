# Administrator guide

## Sign in and access

1. Open the website's `admin-login.html` page and use the individual account created for you by the Firebase project owner.
2. If sign-in fails, check the message on the page. Use **Send password reset email** if needed. Never share your password or reset link.
3. A normal Firebase account is not an administrator. The Firebase project owner must activate its matching UID in the private `admins` collection.
4. Choose **Log out** when finished. The sign-in page confirms that the session ended.

## Check the overview

The overview shows total enquiries, unread enquiries, published and draft announcements, gallery records, and uploaded public documents. Firestore aggregate counts are used for these totals. The latest five enquiries appear separately. The live **New** indicator opens the enquiry manager when a new message arrives.

## Handle enquiries

Use search to find a person's name, email, phone, category, or message. Filter by New, In progress, Responded, or Resolved; use the sort control to order by date or name. Each page shows up to ten records. Email and telephone buttons open the administrator's email or calling app. The internal status is private and helps track follow-up. Do not put case notes or sensitive child information in enquiry records.

Delete only when the home’s retention procedure permits it. If a file cleanup warning appears, follow its path and remove the orphaned upload from Firebase Storage through the approved project account.

## Publish announcements, photographs, and documents

1. Open the relevant section and choose **Add record** or **Edit**.
2. For gallery media, choose a file or an existing gallery photo. Check the image or video preview before saving. JPG, PNG, and WebP images up to 5 MB are accepted; MP4 or WebM gallery videos can be up to 20 MB; PDF documents can be up to 10 MB.
3. Gallery records support captions and album categories. Captions are public. Use only approved wording and photos/videos with documented consent and safeguarding approval.
4. Leave **Published** unchecked to keep a draft private. Publishing asks for confirmation. Watch the upload percentage and wait for the success message.
5. Reopen the public page after publishing to confirm the result. Public content updates on the next page load.
6. When replacing a file, the record is saved before the previous file is removed. A warning means the old file may remain in Storage and needs cleanup.

## Page content and approval

The Page content blocks section can add, edit, publish, and delete approved blocks associated with a page name such as `home` or `about`. Those blocks are appended to the existing hand-written page. Editing every existing paragraph and layout in place is a later content-migration phase; use the source repository for current static page copy.

Only publish facts, donation instructions, public documents, biographies, and images that the organization has confirmed and approved. Do not put confidential records in public content.
