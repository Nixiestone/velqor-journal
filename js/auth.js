// VELQOR JOURNAL — Authentication
import { getApp, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile,
  GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { firebaseConfig } from '../firebase-config.js';
import { DB } from './db.js';
import { toast } from './app.js';

let _app, _auth;
export let currentUser = null;

export function initFirebase() {
  try {
    _app  = initializeApp(firebaseConfig);
  } catch(e) {
    _app = getApp();
  }
  _auth = getAuth(_app);
  DB.init(_app);
  return _auth;
}

export function getFirebaseAuth() { return _auth; }

export function watchAuthState(onLogin, onLogout) {
  return onAuthStateChanged(_auth, user => {
    currentUser = user;
    if (user) onLogin(user);
    else       onLogout();
  });
}

export async function loginEmail(email, password) {
  const cred = await signInWithEmailAndPassword(_auth, email, password);
  return cred.user;
}

export async function registerEmail(email, password, displayName, balance, currency) {
  const cred = await createUserWithEmailAndPassword(_auth, email, password);
  await updateProfile(cred.user, { displayName });
  await DB.createProfile(cred.user.uid, {
    displayName, email,
    accountBalance:  parseFloat(balance) || 10000,
    startingBalance: parseFloat(balance) || 10000,
    currency: currency || 'USD',
    riskPerTrade: 1,
    disciplineRules: [
      'No trading during major news events without plan',
      'Maximum 3 trades per day',
      'Never move stop loss against position',
      'Follow setup criteria strictly',
      'No revenge trading after 2 consecutive losses'
    ],
    tradingPairs: ['EUR/USD','GBP/USD','XAU/USD'],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  return cred.user;
}

export async function loginGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(_auth, provider);
  const profile = await DB.getProfile(cred.user.uid);
  if (!profile) {
    await DB.createProfile(cred.user.uid, {
      displayName:     cred.user.displayName || 'Trader',
      email:           cred.user.email,
      accountBalance:  10000,
      startingBalance: 10000,
      currency: 'USD',
      riskPerTrade: 1,
      disciplineRules: [
        'No trading during major news events without plan',
        'Maximum 3 trades per day',
        'Never move stop loss against position',
        'Follow setup criteria strictly',
        'No revenge trading after 2 consecutive losses'
      ],
      tradingPairs: ['EUR/USD','GBP/USD','XAU/USD'],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }
  return cred.user;
}

export async function logout() {
  await signOut(_auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(_auth, email);
}

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
  const currencyInput= document.getElementById('auth-currency');
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
    nameField.style.display = m === 'register' ? '' : 'none';
    extraFields.style.display = m === 'register' ? '' : 'none';
    btnLabel.textContent = m === 'register' ? 'Create Account' : 'Sign In';
    passInput.autocomplete = m === 'register' ? 'new-password' : 'current-password';
    clearError();
  }

  function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.style.display = '';
  }
  function clearError() { errorDiv.style.display = 'none'; }

  function setLoading(v) {
    submitBtn.disabled = v;
    btnLabel.style.display = v ? 'none' : '';
    spinner.style.display  = v ? '' : 'none';
  }

  loginTab.addEventListener('click',    () => setMode('login'));
  registerTab.addEventListener('click', () => setMode('register'));

  eyeBtn.addEventListener('click', () => {
    const isPass = passInput.type === 'password';
    passInput.type = isPass ? 'text' : 'password';
  });

  forgotLink.addEventListener('click', async e => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) { showError('Enter your email address first.'); return; }
    try {
      await resetPassword(email);
      clearError();
      toast('Password reset email sent.', 'info');
    } catch(err) {
      showError(err.message);
    }
  });

  googleBtn.addEventListener('click', async () => {
    clearError();
    try {
      const user = await loginGoogle();
      onAuthSuccess(user);
    } catch(err) {
      if (err.code !== 'auth/popup-closed-by-user') showError(err.message);
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearError();
    const email    = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) { showError('Please fill in all required fields.'); return; }
    if (password.length < 6)  { showError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      let user;
      if (mode === 'login') {
        user = await loginEmail(email, password);
      } else {
        const name    = nameInput.value.trim() || 'Trader';
        const balance = balanceInput.value;
        const currency= currencyInput.value;
        user = await registerEmail(email, password, name, balance, currency);
      }
      onAuthSuccess(user);
    } catch(err) {
      setLoading(false);
      const msgs = {
        'auth/user-not-found':  'No account found with this email.',
        'auth/wrong-password':  'Incorrect password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password':   'Password must be at least 6 characters.',
        'auth/invalid-email':   'Invalid email address.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      showError(msgs[err.code] || err.message);
    }
  });
}
