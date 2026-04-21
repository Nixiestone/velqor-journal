// VELQOR JOURNAL — Discipline Analysis
import { AppState, openModal } from '../app.js';
import { getDisciplineScore, groupByPeriod, computeMetrics, toDate } from '../utils.js';
import { Charts } from '../charts.js';

export function renderDiscipline() {
  return `
<div class="page-wrapper page-enter">
  <div class="page-header">
    <div class="page-title">Discipline Analysis</div>
    <div class="page-subtitle">Track rule adherence and execution quality</div>
  </div>
  <div id="discipline-content"></div>
</div>`;
}

export function initDiscipline() {
  const { trades, profile } = AppState;
  const content = document.getElementById('discipline-content');
  if (!content) return;

  const score     = getDisciplineScore(trades);
  const rules     = profile?.disciplineRules || [];
  const followed  = trades.filter(t => t.followedRules === true).length;
  const broken    = trades.filter(t => t.followedRules === false).length;
  const followPct = trades.length ? Math.round(followed / trades.length * 100) : 0;
  const avgExec   = trades.filter(t=>t.executionScore).reduce((s,t,_,a)=>s+t.executionScore/a.length,0);
  const emotionMap= {};
  trades.forEach(t => { if (t.emotion) emotionMap[t.emotion] = (emotionMap[t.emotion]||0)+1; });
  const topEmotions = Object.entries(emotionMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Consecutive compliance streaks
  const sorted = [...trades].sort((a,b) => toDate(a.date)-toDate(b.date));
  let streak = 0, bestStreak = 0, cur = 0;
  sorted.forEach(t => {
    if (t.followedRules === true) { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
  });
  if (sorted.length && sorted[sorted.length-1]?.followedRules === true) streak = cur;

  // Execution score distribution
  const execBuckets = [1,2,3,4,5,6,7,8,9,10].map(s => ({
    score: s,
    count: trades.filter(t=>t.executionScore===s).length
  }));

  // Emotion vs result
  const emotResult = {};
  trades.forEach(t => {
    if (!t.emotion) return;
    if (!emotResult[t.emotion]) emotResult[t.emotion] = { wins:0, total:0 };
    emotResult[t.emotion].total++;
    if (t.result==='win') emotResult[t.emotion].wins++;
  });

  const ringCircum = 2 * Math.PI * 54;
  const ringOffset = ringCircum - (score / 100) * ringCircum;
  const ringColor  = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--cyan)' : score >= 40 ? 'var(--amber)' : 'var(--red)';

  content.innerHTML = `
    <!-- Score ring + stats -->
    <div class="grid-2" style="margin-bottom:24px;align-items:start;">
      <div class="card">
        <div class="card-header"><span class="card-title">Discipline Score</span></div>
        <div class="card-body" style="display:flex;flex-direction:column;align-items:center;gap:24px;">
          <div class="score-ring-wrap">
            <div class="score-ring">
              <svg viewBox="0 0 120 120" width="140" height="140">
                <circle class="score-ring-track" cx="60" cy="60" r="54"/>
                <circle class="score-ring-fill" cx="60" cy="60" r="54"
                  stroke="${ringColor}"
                  stroke-dasharray="${ringCircum}"
                  stroke-dashoffset="${ringOffset}"/>
              </svg>
              <div class="score-ring-center">
                <div class="score-ring-num" style="color:${ringColor};">${score}</div>
                <div class="score-ring-label">/100</div>
              </div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;">
            <div style="text-align:center;padding:12px;background:rgba(0,0,0,0.2);border-radius:var(--radius);">
              <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:var(--green);">${followPct}%</div>
              <div style="font-size:11px;color:var(--text-3);margin-top:3px;text-transform:uppercase;letter-spacing:0.08em;">Rule Compliance</div>
            </div>
            <div style="text-align:center;padding:12px;background:rgba(0,0,0,0.2);border-radius:var(--radius);">
              <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:var(--cyan);">${avgExec.toFixed(1)}</div>
              <div style="font-size:11px;color:var(--text-3);margin-top:3px;text-transform:uppercase;letter-spacing:0.08em;">Avg Execution</div>
            </div>
            <div style="text-align:center;padding:12px;background:rgba(0,0,0,0.2);border-radius:var(--radius);">
              <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:var(--green);">${streak}</div>
              <div style="font-size:11px;color:var(--text-3);margin-top:3px;text-transform:uppercase;letter-spacing:0.08em;">Current Streak</div>
            </div>
            <div style="text-align:center;padding:12px;background:rgba(0,0,0,0.2);border-radius:var(--radius);">
              <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:var(--cyan);">${bestStreak}</div>
              <div style="font-size:11px;color:var(--text-3);margin-top:3px;text-transform:uppercase;letter-spacing:0.08em;">Best Streak</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Rule Compliance Trend</span></div>
        <div class="card-body">
          <div class="chart-wrap" style="height:280px;"><canvas id="disc-timeline"></canvas></div>
        </div>
      </div>
    </div>

    <!-- Trading rules -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title">Your Trading Rules</span>
        <button class="btn-secondary" style="font-size:12px;padding:6px 12px;" id="edit-rules-btn">Edit Rules</button>
      </div>
      <div class="card-body">
        ${rules.length ? `
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${rules.map((r, i) => `
              <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:rgba(0,0,0,0.2);border-radius:var(--radius);border:1px solid var(--glass-border);">
                <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--cyan);margin-top:1px;flex-shrink:0;">${String(i+1).padStart(2,'0')}</span>
                <span style="font-size:13px;color:var(--text-2);line-height:1.5;">${r}</span>
              </div>`).join('')}
          </div>` : `
          <div class="empty-state" style="padding:24px;">
            <div class="empty-title">No rules defined</div>
            <div class="empty-desc">Add your trading rules to track compliance</div>
          </div>`}
      </div>
    </div>

    <!-- Emotion analysis -->
    ${Object.keys(emotResult).length > 0 ? `
    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header"><span class="card-title">Emotion vs Win Rate</span></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${Object.entries(emotResult).sort((a,b)=>b[1].total-a[1].total).map(([e,d]) => {
              const wr = Math.round(d.wins/d.total*100);
              const color = wr >= 60 ? 'var(--green)' : wr >= 40 ? 'var(--amber)' : 'var(--red)';
              return `
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="width:80px;font-size:12px;color:var(--text-2);">${e}</div>
                  <div style="flex:1;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${wr}%;background:${color};border-radius:4px;"></div>
                  </div>
                  <div style="font-family:'DM Mono',monospace;font-size:12px;color:${color};width:36px;text-align:right;">${wr}%</div>
                  <div style="font-size:11px;color:var(--text-3);width:20px;text-align:right;">${d.total}</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Execution Score Distribution</span></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${execBuckets.filter(b=>b.count>0).map(b => `
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--cyan);width:24px;">${b.score}</div>
                <div style="flex:1;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                  <div style="height:100%;width:${Math.max(4,(b.count/Math.max(...execBuckets.map(x=>x.count)))*100)}%;background:rgba(0,212,255,0.5);border-radius:4px;"></div>
                </div>
                <div style="font-size:12px;color:var(--text-3);width:20px;text-align:right;">${b.count}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>` : ''}

    <!-- Broken rules trades -->
    ${broken > 0 ? `
    <div class="card" style="border-color:rgba(255,61,87,0.2);">
      <div class="card-header"><span class="card-title" style="color:var(--red);">Rule-Breaking Trades (${broken})</span></div>
      <div class="card-body-pad">
        <table>
          <thead><tr><th>Date</th><th>Symbol</th><th>Emotion</th><th>Result</th><th>P&L</th><th>Notes</th></tr></thead>
          <tbody>
            ${trades.filter(t=>t.followedRules===false).sort((a,b)=>toDate(b.date)-toDate(a.date)).slice(0,15).map(t=>`
              <tr>
                <td style="font-size:12px;color:var(--text-3);">${new Date(toDate(t.date)).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</td>
                <td class="td-symbol">${t.symbol||'—'}</td>
                <td style="font-size:12px;">${t.emotion||'—'}</td>
                <td><span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-be'}">${t.result||'—'}</span></td>
                <td class="td-mono ${(t.pnl||0)>=0?'text-green':'text-red'}">${t.pnl>=0?'+':''}${(t.pnl||0).toFixed(2)}</td>
                <td style="font-size:12px;color:var(--text-2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.notes||'—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}
  `;

  if (trades.length >= 10) Charts.disciplineTimeline('disc-timeline', trades);
  else {
    const el = document.getElementById('disc-timeline');
    if (el) el.parentElement.innerHTML = '<div class="chart-loading">Need at least 10 trades</div>';
  }

  document.getElementById('edit-rules-btn')?.addEventListener('click', () => openModal('edit-rules'));
}
