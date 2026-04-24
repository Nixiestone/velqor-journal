// VELQOR JOURNAL — Help & Guide Page

export function renderHelp() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header">
    <div class="page-title">Help &amp; Guide</div>
    <div class="page-subtitle">Everything you need to know about VELQOR JOURNAL</div>
  </div>

  <!-- Quick nav -->
  <div class="help-quick-nav" id="help-nav">
    ${['Getting Started','Log a Trade','Pages Explained','Multi-Account','Export PDF','Firebase Setup','FAQ','Tips'].map((l,i)=>`<a class="help-nav-item" href="#help-sec-${i}">${l}</a>`).join('')}
  </div>

  <div class="help-content">

    <!-- 0: Getting Started -->
    <div class="help-section" id="help-sec-0">
      <div class="help-section-header">
        <div class="help-section-icon" style="background:var(--cyan-dim);color:var(--cyan);">
          <svg viewBox="0 0 20 20" fill="none" width="20"><polygon points="10,2 12.4,7.3 18.1,8.1 14.1,12 15.1,17.7 10,15 4.9,17.7 5.9,12 1.9,8.1 7.6,7.3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </div>
        <h2 class="help-section-title">Getting Started</h2>
      </div>
      <div class="help-body">
        <p>VELQOR JOURNAL is a professional trading journal that syncs across all your devices in real time. Here's how to get up and running in 5 minutes.</p>
        <div class="help-steps">
          <div class="help-step">
            <div class="help-step-num">01</div>
            <div>
              <div class="help-step-title">Create Your Account</div>
              <p>On the login screen, click <strong>Register</strong>. Enter your name, email, and password. Then set up your first trading account — give it a name (e.g. "ICMarkets USD"), your starting balance, and currency. You can add more accounts later in Settings.</p>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">02</div>
            <div>
              <div class="help-step-title">Build Your Playbook</div>
              <p>Go to <strong>Playbook</strong> and add your trading setups. For each setup, give it a name, description, and the entry rules you follow. Linking trades to setups enables powerful performance breakdowns later.</p>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">03</div>
            <div>
              <div class="help-step-title">Log Your Trades</div>
              <p>Click <strong>Log Trade</strong> from anywhere in the app. Fill in the symbol (searchable dropdown), direction, prices, P&L, result, and psychology fields. The R-multiple auto-calculates from your entry, stop, and exit.</p>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">04</div>
            <div>
              <div class="help-step-title">Review &amp; Improve</div>
              <p>Use the <strong>Analytics</strong>, <strong>Time Analysis</strong>, <strong>Risk Analysis</strong>, and <strong>Discipline</strong> pages to identify patterns. Write weekly and monthly reviews in the <strong>Review</strong> page. Track your goals in <strong>Milestones</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 1: Log a Trade -->
    <div class="help-section" id="help-sec-1">
      <div class="help-section-header">
        <div class="help-section-icon" style="background:var(--purple-dim);color:var(--purple);">
          <svg viewBox="0 0 20 20" fill="none" width="20"><rect x="2.5" y="2.5" width="15" height="15" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="10.5" x2="14" y2="10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <h2 class="help-section-title">How to Log a Trade</h2>
      </div>
      <div class="help-body">
        <p>Click <strong>Log Trade</strong> (the + button) from any page. The trade form has these sections:</p>
        <div class="help-field-grid">
          ${[
            ['Symbol','Click the dropdown and type to search. Includes Forex, Crypto, Metals, Indices and Commodities. You can also type a custom symbol.'],
            ['Direction','Long (Buy) or Short (Sell). Required for R-multiple calculation.'],
            ['Date &amp; Time','When the trade was taken. Determines which session it belongs to.'],
            ['Setup','Link to a playbook entry. This powers the setup performance breakdown.'],
            ['Session','Auto-detected from time, or manually set: Asian / London / NY / etc.'],
            ['Entry / Stop / Take Profit / Exit','Used to auto-calculate your R-multiple. Entry and Stop are required for R to work.'],
            ['P&L','Your actual profit or loss in your account currency. Required.'],
            ['R-Multiple','Auto-calculated from Entry/Stop/Exit. Can also be typed manually.'],
            ['Risk %','What percentage of your account you risked. Feeds Risk Analysis.'],
            ['Result','Win / Loss / Breakeven. Required.'],
            ['Execution Score','Rate your execution from 1–10. Used in Discipline tracking.'],
            ['Emotion','How you felt going into the trade. Feeds the emotion vs win rate chart.'],
            ['Followed Rules','Did you follow all your trading rules? Critical for Discipline score.'],
            ['Notes &amp; Mistakes','Write your rationale, what went wrong, what to improve.'],
          ].map(([f,d])=>`<div class="help-field"><div class="help-field-name">${f}</div><div class="help-field-desc">${d}</div></div>`).join('')}
        </div>
      </div>
    </div>

    <!-- 2: Pages Explained -->
    <div class="help-section" id="help-sec-2">
      <div class="help-section-header">
        <div class="help-section-icon" style="background:var(--green-dim);color:var(--green);">
          <svg viewBox="0 0 20 20" fill="none" width="20"><polyline points="2,14 7,8 11,11 15,5 18,2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="2" y1="18" x2="18" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <h2 class="help-section-title">Pages Explained</h2>
      </div>
      <div class="help-body">
        <div class="help-pages-list">
          ${[
            ['Dashboard','Your command centre. Shows equity curve, monthly P&L bars, recent trades, win rate trend, and all key metrics at a glance. Updates in real time as you log trades.'],
            ['Calendar','Visual month-by-month view of every trading day. Each cell shows trade count and P&L, colour-coded by intensity. Click any day to see all trades for that session. The Summary column on the right shows week totals.'],
            ['Trade Journal','Your complete trade log. Filter by result (Win/Loss/BE), direction (Long/Short), or search by symbol. Switch between table and card views. Click any trade to open the full detail modal.'],
            ['Playbook','Your strategy library. Add all your trading setups here with their rules and criteria. Each setup shows live stats — win rate, avg R, net P&L — based on the trades you\'ve linked to it.'],
            ['Analytics','Deep dive into performance. Equity curve, drawdown chart, R-distribution histogram, monthly table, and symbol/setup breakdowns. Filter by All Time, last 30d, 90d, or YTD.'],
            ['Time Analysis','Find your edge by time. P&L by market session, by day of the week, and a 24-hour heatmap. Identify which hours and sessions you perform best in.'],
            ['Risk Analysis','Track your risk management. Drawdown timeline, risk vs R scatter plot, R-bucket distribution, and a table of trades where you exceeded your risk target.'],
            ['Discipline','Your psychological edge score (0–100). Tracks rule compliance, execution quality, emotional patterns, and consecutive streaks. The lower score, the more to work on.'],
            ['Review','Write weekly and monthly reviews. Each review auto-links the trades from that period and shows their stats. Write lessons, improvements, and what went well.'],
            ['Milestones','Set and track trading goals — balance targets, P&L goals, win rate targets, streak goals. Each milestone shows a progress bar and auto-updates as you trade.'],
            ['Settings','Manage your accounts, update starting balance, change currency, set risk % target, manage discipline rules, and export your data as JSON.'],
          ].map(([name,desc])=>`<div class="help-page-item"><div class="help-page-name">${name}</div><div class="help-page-desc">${desc}</div></div>`).join('')}
        </div>
      </div>
    </div>

    <!-- 3: Multi-Account -->
    <div class="help-section" id="help-sec-3">
      <div class="help-section-header">
        <div class="help-section-icon" style="background:var(--amber-dim);color:var(--amber);">
          <svg viewBox="0 0 20 20" fill="none" width="20"><circle cx="10" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M2 17c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <h2 class="help-section-title">Multiple Accounts</h2>
      </div>
      <div class="help-body">
        <p>VELQOR JOURNAL supports multiple trading accounts — for example, a live Forex account, a crypto account, a prop firm account, and a demo account, all with different currencies.</p>
        <div class="help-steps">
          <div class="help-step">
            <div class="help-step-num">01</div>
            <div><div class="help-step-title">Adding an Account</div><p>Go to <strong>Settings</strong> and scroll to the Accounts section. Click <strong>Add Account</strong>. Give it a name, broker, currency, starting balance, and choose a colour. The colour appears in the sidebar account switcher.</p></div>
          </div>
          <div class="help-step">
            <div class="help-step-num">02</div>
            <div><div class="help-step-title">Switching Accounts</div><p>In the sidebar, click the account card at the top (just below the VELQOR logo). A dropdown appears showing all your accounts. Click one to switch — all pages update immediately to show only that account's trades and balance.</p></div>
          </div>
          <div class="help-step">
            <div class="help-step-num">03</div>
            <div><div class="help-step-title">Logging Trades</div><p>When you log a trade, it automatically attaches to whichever account is currently active. The P&L updates that account's balance. Trade currency is inherited from the account currency.</p></div>
          </div>
          <div class="help-step">
            <div class="help-step-num">04</div>
            <div><div class="help-step-title">Editing or Deleting</div><p>Click the pencil icon next to any account in the switcher dropdown to edit its name, broker, or colour. Deleting an account keeps the trades (unlinked) so you never lose data.</p></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4: Export PDF -->
    <div class="help-section" id="help-sec-4">
      <div class="help-section-header">
        <div class="help-section-icon" style="background:rgba(255,61,87,0.1);color:var(--red);">
          <svg viewBox="0 0 20 20" fill="none" width="20"><path d="M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><polyline points="7,10 10,13 13,10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="10" y1="3" x2="10" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <h2 class="help-section-title">Export as PDF</h2>
      </div>
      <div class="help-body">
        <p>You can export a full trade report for the active account as a PDF at any time.</p>
        <div class="help-steps">
          <div class="help-step">
            <div class="help-step-num">01</div>
            <div><div class="help-step-title">Click Export PDF</div><p>In the sidebar, click <strong>Export PDF</strong> (the download icon). Make sure you're on the account you want to export first by switching accounts in the account switcher.</p></div>
          </div>
          <div class="help-step">
            <div class="help-step-num">02</div>
            <div><div class="help-step-title">A New Window Opens</div><p>A print-ready report opens in a new browser tab. It includes: full performance summary (12 KPIs), monthly breakdown table, and a complete trade log with all fields.</p></div>
          </div>
          <div class="help-step">
            <div class="help-step-num">03</div>
            <div><div class="help-step-title">Save as PDF</div><p>Click the <strong>Save as PDF</strong> button in the report, or press <kbd>Ctrl+P</kbd> (Windows) / <kbd>Cmd+P</kbd> (Mac). In the print dialog, set Destination to <strong>Save as PDF</strong>. Set margins to <strong>Minimum</strong> for best results.</p></div>
          </div>
        </div>
        <div class="help-callout">
          <strong>Pop-up blocked?</strong> If nothing opens, check your browser's address bar for a pop-up blocked notification and allow pop-ups from this site.
        </div>
      </div>
    </div>

    <!-- 5: Firebase Setup -->
    <div class="help-section" id="help-sec-5">
      <div class="help-section-header">
        <div class="help-section-icon" style="background:rgba(255,208,96,0.1);color:var(--amber);">
          <svg viewBox="0 0 20 20" fill="none" width="20"><path d="M10 2l2.4 5.3 5.7.8-4 4 1 5.7L10 15l-5.1 2.8 1-5.7-4-4 5.7-.8L10 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </div>
        <h2 class="help-section-title">Firebase Setup Guide</h2>
      </div>
      <div class="help-body">
        <p>VELQOR JOURNAL uses Firebase for authentication and data sync. This is free for personal use. Follow these steps exactly.</p>
        <div class="help-steps">
          <div class="help-step">
            <div class="help-step-num">01</div>
            <div><div class="help-step-title">Create a Firebase Project</div>
              <p>Go to <a href="https://console.firebase.google.com" target="_blank" style="color:var(--cyan);">console.firebase.google.com</a> → <strong>Add project</strong> → Name it anything → Disable Google Analytics → <strong>Create project</strong>.</p>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">02</div>
            <div><div class="help-step-title">Enable Authentication</div>
              <p>In the left sidebar → <strong>Build → Authentication → Get started</strong>. Click <strong>Email/Password</strong> → Enable → Save. Then <strong>Add new provider → Google</strong> → Enable → add your support email → Save.</p>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">03</div>
            <div><div class="help-step-title">Enable Firestore</div>
              <p>Left sidebar → <strong>Build → Firestore Database → Create database</strong> → <strong>Start in production mode</strong> → choose a location → Done.</p>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">04</div>
            <div><div class="help-step-title">Set Security Rules</div>
              <p>In Firestore → <strong>Rules tab</strong>, paste this and click <strong>Publish</strong>:</p>
              <div class="help-code">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         &amp;&amp; request.auth.uid == userId;
    }
  }
}</div>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">05</div>
            <div><div class="help-step-title">Get Your Config Keys</div>
              <p>Gear icon (top-left) → <strong>Project settings</strong> → scroll to <strong>Your apps</strong> → click <strong>&lt;/&gt;</strong> → App nickname: "velqor" → Register app. Copy the config object shown.</p>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">06</div>
            <div><div class="help-step-title">Update firebase-config.js</div>
              <p>Open <code>firebase-config.js</code> in your project folder and paste your config values. Then commit and push to GitHub.</p>
              <div class="help-code">export const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456",
  appId:             "1:123456:web:abcdef"
};</div>
            </div>
          </div>
          <div class="help-step">
            <div class="help-step-num">07</div>
            <div><div class="help-step-title">Add Your GitHub Pages Domain</div>
              <p>Firebase → Authentication → <strong>Settings tab</strong> → Authorized domains → <strong>Add domain</strong> → Enter: <code>YOUR_USERNAME.github.io</code> → Add.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 6: FAQ -->
    <div class="help-section" id="help-sec-6">
      <div class="help-section-header">
        <div class="help-section-icon" style="background:var(--cyan-dim);color:var(--cyan);">
          <svg viewBox="0 0 20 20" fill="none" width="20"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 8c0-1.1.9-2 2-2s2 .9 2 2c0 1-.6 1.5-1.2 1.9C10.3 10.2 10 10.6 10 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="14" r="0.8" fill="currentColor"/></svg>
        </div>
        <h2 class="help-section-title">Frequently Asked Questions</h2>
      </div>
      <div class="help-body">
        <div class="help-faq-list">
          ${[
            ['Is my data safe?','Yes. All data is stored in Firebase Firestore, which is encrypted at rest and in transit. Only you (via your Firebase UID) can read or write your data — the security rules enforce this.'],
            ['Does it work offline?','The app requires an internet connection to sync, but Firebase caches recent data locally. You can view previously loaded data offline, but adding new trades requires connectivity.'],
            ['Can I use it on my phone?','Yes. VELQOR JOURNAL is fully responsive. On mobile, use the bottom navigation bar. The sidebar is accessible via the hamburger menu. All pages work on both iOS and Android.'],
            ['How does the R-multiple calculate?','R = (Exit - Entry) / (Entry - Stop) for long trades, reversed for shorts. It represents how many times your initial risk you made or lost. A +2R trade means you made twice your risk amount.'],
            ['What is the Discipline Score?','A score from 0–100. It\'s calculated from: % of recent trades where you followed rules (weighted 80%), and your average execution score (weighted 20%). Higher is better.'],
            ['What is Profit Factor?','Gross Wins divided by Gross Losses. A PF of 1.5 means for every $1 you lose, you make $1.50. Generally, 1.5+ is considered good. Below 1.0 means you are losing money overall.'],
            ['How do I change an account\'s balance manually?','Go to Settings → Accounts → click Edit on the account → update the Balance field. Use this to correct discrepancies or sync with your real broker balance.'],
            ['Can I delete all my trades?','Individual trades can be deleted from the Journal page. There is no bulk delete — this is intentional to protect your historical data. You can export everything first via Export PDF or the JSON export in Settings.'],
            ['Why is my equity curve flat?','The equity curve starts from your first trade. If all trades have the same date, or if account balance data is missing, the curve may appear flat. Make sure you enter the P&L field for every trade.'],
            ['What currencies are supported?','USD, EUR, GBP, NGN, JPY, AUD, CAD, CHF, USDT, and ZAR. You can set a different currency per account. The display currency follows whichever account is active.'],
          ].map(([q,a])=>`<div class="help-faq-item"><div class="help-faq-q">${q}</div><div class="help-faq-a">${a}</div></div>`).join('')}
        </div>
      </div>
    </div>

    <!-- 7: Tips -->
    <div class="help-section" id="help-sec-7">
      <div class="help-section-header">
        <div class="help-section-icon" style="background:var(--green-dim);color:var(--green);">
          <svg viewBox="0 0 20 20" fill="none" width="20"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 10.5l2 2 4-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h2 class="help-section-title">Pro Tips</h2>
      </div>
      <div class="help-body">
        <div class="help-tips-grid">
          ${[
            ['Log Immediately','Log every trade right when it closes, while the details are fresh. Don\'t batch-log at the end of the week — you\'ll forget the psychology.'],
            ['Always Fill P&L','The P&L field drives your equity curve, dashboard stats, and account balance. Even on breakeven trades, enter 0.'],
            ['Use Execution Score Honestly','The execution score only helps you if it\'s accurate. A 10/10 should be rare — reserved for perfect entries, sizing, and management.'],
            ['Link Trades to Setups','Linking every trade to a playbook setup is what unlocks the Setup Performance breakdown in Analytics. Without it, you can\'t see which setups are profitable.'],
            ['Write Notes on Losses','Force yourself to write in the Mistakes field for every losing trade. Over time, you\'ll see which mistakes repeat and can target them specifically.'],
            ['Check Time Analysis Weekly','The session and day-of-week charts often reveal that you perform much better at certain times. Restricting trading to your best windows can dramatically improve results.'],
            ['Set Realistic Milestones','Start with achievable milestones — 25 trades, 60% win rate over 30 days. Big goals feel far away. Stack small wins first.'],
            ['Write Weekly Reviews','Even a 3-sentence review each Friday builds the habit of self-reflection. The Review page auto-populates the stats for the period — you just need to write the lesson.'],
            ['Use the Discipline Rules','Go to Settings and write out your actual trading rules. Then tick "Followed Rules" honestly for each trade. The Discipline Score tracks your compliance over the last 50 trades.'],
            ['Export Monthly','Use Export PDF once a month to keep an offline archive of your performance. Store it in a folder for year-end review.'],
          ].map(([t,d])=>`<div class="help-tip-card"><div class="help-tip-title">${t}</div><div class="help-tip-desc">${d}</div></div>`).join('')}
        </div>
      </div>
    </div>

  </div>
</div>`;
}

export function initHelp() {
  // Smooth scroll for nav links
  document.querySelectorAll('.help-nav-item').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Highlight active section on scroll
  const sections = document.querySelectorAll('.help-section');
  const navItems = document.querySelectorAll('.help-nav-item');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navItems.forEach(n => n.classList.toggle('active', n.getAttribute('href') === '#'+id));
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => observer.observe(s));
}
