// VELQOR JOURNAL — Authentication
import { getApp, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { firebaseConfig } from '../firebase-config.js';
import { DB } from './db.js';

let _app, _auth;
export let currentUser = null;
const DEFAULT_DISCIPLINE_RULES = [
  'No trading during high-impact news without a plan',
  'Maximum 3 trades per session',
  'Never move stop loss against the position',
  'Only trade A+ setups from your playbook',
  'No revenge trading after 2 consecutive losses'
];

export function initFirebase() {
  try { _app = initializeApp(firebaseConfig); } catch(e) { _app = getApp(); }
  _auth = getAuth(_app);
  DB.init(_app);
  return _auth;
}

export function getFirebaseAuth() { return _auth; }

export function watchAuthState(onLogin, onLogout) {
  return onAuthStateChanged(_auth, user => { currentUser = user; user ? onLogin(user) : onLogout(); });
}

export function getAuthErrorMessage(err) {
  const msgs = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/popup-blocked': 'Popup was blocked by your browser. Allow popups, then try Google sign-in again.',
    'auth/operation-not-supported-in-this-environment': 'This browser does not allow popup sign-in. Redirecting to Google instead.',
    'auth/operation-not-allowed': 'Google sign-in is disabled in Firebase Authentication. Enable Google provider and try again.',
    'auth/unauthorized-domain': 'This domain is not authorized in Firebase Auth settings. Add it under Authentication > Settings > Authorized domains.',
    'auth/network-request-failed': 'Network error while contacting Google. Check your connection and retry.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.'
  };
  return msgs[err?.code] || err?.message || 'Authentication failed. Please try again.';
}

async function _ensureProfileForGoogleUser(user) {
  const profile = await DB.getProfile(user.uid);
  if (profile) return;

  const acctRef = await DB.addAccount(user.uid, {
    name: 'Main Account',
    currency: 'USD',
    balance: 10000,
    startingBalance: 10000,
    broker: '',
    colorIndex: 0
  });

  await DB.createProfile(user.uid, {
    displayName:     user.displayName || 'Trader',
    email:           user.email || '',
    activeAccountId: acctRef.id,
    riskPerTrade: 1,
    disciplineRules: DEFAULT_DISCIPLINE_RULES,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
}

export async function loginEmail(email, password) {
  const cred = await signInWithEmailAndPassword(_auth, email, password);
  return cred.user;
}

export async function registerEmail(email, password, displayName, accountData) {
  const cred = await createUserWithEmailAndPassword(_auth, email, password);
  await updateProfile(cred.user, { displayName });
  // Create first account
  const acctRef = await DB.addAccount(cred.user.uid, {
    name:            accountData.name || 'Main Account',
    currency:        accountData.currency || 'USD',
    balance:         parseFloat(accountData.balance) || 10000,
    startingBalance: parseFloat(accountData.balance) || 10000,
    broker:          accountData.broker || '',
    colorIndex:      0
  });
  // Create profile with activeAccountId
  await DB.createProfile(cred.user.uid, {
    displayName,
    email,
    activeAccountId: acctRef.id,
    riskPerTrade: 1,
    disciplineRules: DEFAULT_DISCIPLINE_RULES,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  return cred.user;
}

export async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const cred = await signInWithPopup(_auth, provider);
    await _ensureProfileForGoogleUser(cred.user);
    return cred.user;
  } catch (err) {
    const fallbackCodes = new Set([
      'auth/popup-blocked',
      'auth/operation-not-supported-in-this-environment'
    ]);
    if (fallbackCodes.has(err?.code)) {
      await signInWithRedirect(_auth, provider);
      return null;
    }
    throw err;
  }
}

export async function finalizeRedirectLogin() {
  const cred = await getRedirectResult(_auth);
  if (!cred?.user) return null;
  await _ensureProfileForGoogleUser(cred.user);
  return cred.user;
}

export async function logout() { await signOut(_auth); }

export async function resetPassword(email) { await sendPasswordResetEmail(_auth, email); }

export function initAuthUI(onAuthSuccess) {
  const loginTab    = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const nameField   = document.getElementById('register-name-field');
  const extraFields = document.getElementById('register-extra');
  const form        = document.getElementById('auth-form');
  const emailInput  = document.getElementById('auth-email');
  const passInput   = document.getElementById('auth-password');
  const nameInput   = document.getElementById('auth-name');
  const balanceInput= document.getElementById('auth-balance');
  const currencyInput=document.getElementById('auth-currency');
  const acctNameInput=document.getElementById('auth-acct-name');
  const brokerInput =document.getElementById('auth-broker');
  const submitBtn   = document.getElementById('auth-submit');
  const btnLabel    = document.getElementById('auth-btn-label');
  const spinner     = document.getElementById('auth-spinner');
  const errorDiv    = document.getElementById('auth-error');
  const googleBtn   = document.getElementById('google-btn');
  const forgotLink  = document.getElementById('forgot-link');
  const eyeBtn      = document.getElementById('toggle-password');

  let mode = 'login';

  function setMode(m) {
    mode = m;
    loginTab.classList.toggle('active', m === 'login');
    registerTab.classList.toggle('active', m === 'register');
    nameField.style.display   = m === 'register' ? '' : 'none';
    extraFields.style.display = m === 'register' ? '' : 'none';
    btnLabel.textContent      = m === 'register' ? 'Create Account' : 'Sign In';
    passInput.autocomplete    = m === 'register' ? 'new-password' : 'current-password';
    clearError();
  }
  function showError(msg) { errorDiv.textContent = msg; errorDiv.style.display = ''; }
  function clearError() { errorDiv.style.display = 'none'; }
  function setLoading(v) {
    submitBtn.disabled = v;
    btnLabel.style.display  = v ? 'none' : '';
    spinner.style.display   = v ? '' : 'none';
  }

  loginTab?.addEventListener('click',    () => setMode('login'));
  registerTab?.addEventListener('click', () => setMode('register'));
  eyeBtn?.addEventListener('click', () => { passInput.type = passInput.type === 'password' ? 'text' : 'password'; });

  forgotLink?.addEventListener('click', async e => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) { showError('Enter your email first.'); return; }
    try { await resetPassword(email); clearError(); alert('Password reset email sent.'); }
    catch(err) { showError(err.message); }
  });

  googleBtn?.addEventListener('click', async () => {
    clearError();
    googleBtn.disabled = true;
    try {
      const user = await loginGoogle();
      if (user) onAuthSuccess(user);
    } catch(err) {
      if (err.code !== 'auth/popup-closed-by-user') showError(getAuthErrorMessage(err));
    } finally {
      googleBtn.disabled = false;
    }
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault(); clearError();
    const email = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) { showError('Please fill in all fields.'); return; }
    if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      let user;
      if (mode === 'login') {
        user = await loginEmail(email, password);
      } else {
        user = await registerEmail(email, password, nameInput.value.trim() || 'Trader', {
          name:     acctNameInput?.value.trim() || 'Main Account',
          balance:  balanceInput?.value,
          currency: currencyInput?.value || 'USD',
          broker:   brokerInput?.value.trim() || ''
        });
      }
      onAuthSuccess(user);
    } catch(err) {
      setLoading(false);
      showError(getAuthErrorMessage(err));
    }
  });
}
