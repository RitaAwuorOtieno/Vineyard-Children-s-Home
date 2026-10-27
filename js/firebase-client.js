import { firebaseConfig, recaptchaEnterpriseSiteKey } from '../firebase-config.js';

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && firebaseConfig.authDomain && firebaseConfig.storageBucket);
export let firebaseApp = null; export let auth = null; export let db = null; export let storage = null;
export const firebaseSdk = {};
export let appCheckReady = false;
if (firebaseReady) {
  const [appSdk, authSdk, firestoreSdk, storageSdk] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-storage.js')
  ]);
  firebaseApp = appSdk.getApps()[0] || appSdk.initializeApp(firebaseConfig);
  if (recaptchaEnterpriseSiteKey) {
    const appCheckSdk = await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app-check.js');
    appCheckSdk.initializeAppCheck(firebaseApp, {
      provider: new appCheckSdk.ReCaptchaEnterpriseProvider(recaptchaEnterpriseSiteKey),
      isTokenAutoRefreshEnabled: true
    });
    appCheckReady = true;
  }
  auth = authSdk.getAuth(firebaseApp); db = firestoreSdk.getFirestore(firebaseApp); storage = storageSdk.getStorage(firebaseApp);
  Object.assign(firebaseSdk, authSdk, firestoreSdk, storageSdk);
}

export function safeFirebaseMessage(error) {
  const known = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/too-many-requests': 'Too many attempts. Wait a while and try again.',
    'auth/network-request-failed': 'Could not reach Firebase. Check your connection and try again.',
    'permission-denied': 'Firebase denied this action. Confirm this account is active in the admins collection and that the latest Firestore and Storage rules are deployed.',
    'failed-precondition': 'A required Firebase service is not ready. Check that Firestore and Storage are enabled in Firebase Console.',
    'unavailable': 'Firebase is temporarily unreachable. Check your connection and try again.',
    'storage/unauthorized': 'This account is not authorized to access that file.',
    'storage/retry-limit-exceeded': 'The upload could not finish. Try again when your connection is stable.'
  };
  return known[error && error.code] || 'The request could not be completed. Check the Firebase setup and try again.';
}
