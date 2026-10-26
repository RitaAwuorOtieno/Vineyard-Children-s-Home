import { auth, firebaseReady, safeFirebaseMessage, firebaseSdk } from './firebase-client.js';

const form = document.getElementById('login-form');
const status = document.getElementById('login-status');
const submit = form.querySelector('[type="submit"]');

if (!firebaseReady) status.textContent = 'Firebase is not configured yet. Follow the setup steps in README.md.';
else firebaseSdk.onAuthStateChanged(auth, function (user) {
  if (user) window.location.replace('admin-dashboard.html');
});

document.getElementById('toggle-password').addEventListener('click', function () {
  const input = document.getElementById('password'); const reveal = input.type === 'password';
  input.type = reveal ? 'text' : 'password'; this.textContent = reveal ? 'Hide' : 'Show';
  this.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password'); this.setAttribute('aria-pressed', String(reveal));
});

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  if (!firebaseReady) return;
  submit.disabled = true; submit.textContent = 'Signing in…'; status.textContent = 'Checking your sign-in…';
  try {
    await firebaseSdk.signInWithEmailAndPassword(auth, form.elements.email.value.trim(), form.elements.password.value);
    window.location.replace('admin-dashboard.html');
  } catch (error) { status.textContent = safeFirebaseMessage(error); }
  finally { submit.disabled = false; submit.textContent = 'Sign in'; }
});

document.getElementById('reset-password').addEventListener('click', async function () {
  if (!firebaseReady) return;
  const email = form.elements.email.value.trim();
  if (!email) { status.textContent = 'Enter your email address first, then choose password reset.'; form.elements.email.focus(); return; }
  this.disabled = true; status.textContent = 'Sending password reset email…';
  try { await firebaseSdk.sendPasswordResetEmail(auth, email); status.textContent = 'If an account is registered for this address, a password reset email has been sent.'; }
  catch (error) { status.textContent = safeFirebaseMessage(error); }
  finally { this.disabled = false; }
});
