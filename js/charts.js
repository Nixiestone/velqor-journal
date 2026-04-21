// VELQOR JOURNAL — Chart Utilities
const _charts = {};

function destroy(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 800, easing: 'easeInOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(11,13,27,0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      titleColor: 'rgba(255,255,255,0.9)',
      bodyColor: 'rgba(255,255,255,0.6)',
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: "'DM Mono', monospace", size: 12 },
      bodyFont:  { family: "'DM Sans', sans-serif",  size: 12 },
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11, family: "'DM Sans', sans-serif" } },
      border: { display: false }
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11, family: "'DM Mono', monospace" } },
      border: { display: false }
    }
  }
};

function canvas(id) {
  return document.getElementById(id);
}

export const Charts = {
  equity(id, data, currency = 'USD') {
    destroy(id);
    const c = canvas(id); if (!c) return;
    const labels  = data.map(p => {
      const d = p.date instanceof Date ? p.date : new Date(p.date);
      return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
    });
    const balances = data.map(p => p.balance);
    const last = balances[balances.length - 1] || 0;
    const first = balances[0] || 0;
    const isPos = last >= first;
    const lineColor  = isPos ? '#00e676' : '#ff3d57';
    const gradientId = id + '_grad';

    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, c.offsetHeight || 200);
    grad.addColorStop(0, isPos ? 'rgba(0,230,118,0.25)' : 'rgba(255,61,87,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    _charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: balances,
          borderColor: lineColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: lineColor,
          fill: true,
          backgroundColor: grad,
          tension: 0.3
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          tooltip: {
            ...CHART_DEFAULTS.plugins.tooltip,
            callbacks: {
              label: ctx => {
                const sym = { USD:'$',EUR:'€',GBP:'£',NGN:'₦',JPY:'¥',AUD:'A$',CAD:'C$' }[currency] || '$';
                return ` ${sym}${ctx.raw.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})}`;
              }
            }
          }
        },
        scales: {
          x: { ...CHART_DEFAULTS.scales.x, grid: { display: false } },
          y: {
            ...CHART_DEFAULTS.scales.y,
            ticks: {
              ...CHART_DEFAULTS.scales.y.ticks,
              callback: v => { const s = { USD:'$',EUR:'€',GBP:'£',NGN:'₦',JPY:'¥',AUD:'A$',CAD:'C$' }[currency] || '$'; return s+v.toLocaleString(); }
            }
          }
        }
      }
    });
  },

  monthlyBar(id, groups, currency = 'USD') {
    destroy(id);
    const c = canvas(id); if (!c) return;
    const keys   = Object.keys(groups).sort();
    const labels = keys.map(k => {
      const [y, m] = k.split('-');
      return new Date(+y, +m-1, 1).toLocaleDateString('en-US', { month:'short', year:'2-digit' });
    });
    const values = keys.map(k => groups[k].reduce((s,t) => s + (t.pnl||0), 0));
    const colors = values.map(v => v >= 0 ? 'rgba(0,230,118,0.7)' : 'rgba(255,61,87,0.7)');
    const borders= values.map(v => v >= 0 ? '#00e676' : '#ff3d57');
    const ctx = c.getContext('2d');
    _charts[id] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: borders, borderWidth: 1, borderRadius: 4 }] },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          tooltip: {
            ...CHART_DEFAULTS.plugins.tooltip,
            callbacks: {
              label: ctx => {
                const sym = { USD:'$',EUR:'€',GBP:'£',NGN:'₦',JPY:'¥',AUD:'A$',CAD:'C$' }[currency] || '$';
                const v = ctx.raw;
                return ` ${v>=0?'+':''}${sym}${Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
              }
            }
          }
        },
        scales: {
          x: { ...CHART_DEFAULTS.scales.x, grid: { display: false } },
          y: { ...CHART_DEFAULTS.scales.y }
        }
      }
    });
  },

  winRateLine(id, groups) {
    destroy(id);
    const c = canvas(id); if (!c) return;
    const keys = Object.keys(groups).sort();
    const labels = keys.map(k => {
      const [y,m] = k.split('-');
      return new Date(+y,+m-1,1).toLocaleDateString('en-US',{month:'short',year:'2-digit'});
    });
    const rates = keys.map(k => {
      const t = groups[k];
      const w = t.filter(x=>x.result==='win').length;
      return t.length ? parseFloat((w/t.length*100).toFixed(1)) : 0;
    });
    const ctx = c.getContext('2d');
    _charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: rates, borderColor: '#00d4ff', borderWidth: 2,
          pointRadius: 3, pointBackgroundColor: '#00d4ff',
          fill: false, tension: 0.3
        }, {
          data: rates.map(() => 50),
          borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1,
          borderDash: [4,4], pointRadius: 0, fill: false
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          tooltip: {
            ...CHART_DEFAULTS.plugins.tooltip,
            callbacks: { label: ctx => ` ${ctx.raw}%` }
          }
        },
        scales: {
          x: { ...CHART_DEFAULTS.scales.x, grid: { display: false } },
          y: { ...CHART_DEFAULTS.scales.y, min: 0, max: 100,
            ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => v+'%' }
          }
        }
      }
    });
  },

  rHistogram(id, bins) {
    destroy(id);
    const c = canvas(id); if (!c) return;
    const labels = Object.keys(bins);
    const values = Object.values(bins);
    const colors = labels.map(l => parseFloat(l) >= 0 ? 'rgba(0,230,118,0.65)' : 'rgba(255,61,87,0.65)');
    const ctx = c.getContext('2d');
    _charts[id] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 3, borderSkipped: false }] },
      options: {
        ...CHART_DEFAULTS,
        plugins: {
          ...CHART_DEFAULTS.plugins,
          tooltip: { ...CHART_DEFAULTS.plugins.tooltip, callbacks: { label: ctx => ` ${ctx.raw} trades` } }
        },
        scales: {
          x: { ...CHART_DEFAULTS.scales.x, grid: { display: false }, title: { display: true, text: 'R-Multiple', color: 'rgba(255,255,255,0.3)', font: { size: 11 } } },
          y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, stepSize: 1 } }
        }
      }
    });
  },

  drawdown(id, series) {
    destroy(id);
    const c = canvas(id); if (!c) return;
    const labels = series.map(p => { const d = p.date instanceof Date ? p.date : new Date(p.date); return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); });
    const values = series.map(p => -p.drawdown);
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(255,61,87,0.25)');
    grad.addColorStop(1, 'rgba(255,61,87,0.0)');
    _charts[id] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data: values, borderColor: '#ff3d57', borderWidth: 1.5, pointRadius: 0, fill: true, backgroundColor: grad, tension: 0.3 }] },
      options: {
        ...CHART_DEFAULTS,
        plugins: { ...CHART_DEFAULTS.plugins, tooltip: { ...CHART_DEFAULTS.plugins.tooltip, callbacks: { label: ctx => ` ${Math.abs(ctx.raw).toFixed(2)}%` } } },
        scales: {
          x: { ...CHART_DEFAULTS.scales.x, grid: { display: false } },
          y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => v+'%' } }
        }
      }
    });
  },

  sessionBar(id, sessions) {
    destroy(id);
    const c = canvas(id); if (!c) return;
    const labels = Object.keys(sessions);
    const pnls   = labels.map(k => sessions[k].pnl);
    const ctx = c.getContext('2d');
    _charts[id] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data: pnls, backgroundColor: pnls.map(v => v>=0?'rgba(0,230,118,0.6)':'rgba(255,61,87,0.6)'), borderRadius: 4, borderSkipped: false }] },
      options: { ...CHART_DEFAULTS, scales: { x: { ...CHART_DEFAULTS.scales.x, grid: { display: false } }, y: { ...CHART_DEFAULTS.scales.y } }, plugins: { ...CHART_DEFAULTS.plugins } }
    });
  },

  dayOfWeekBar(id, data) {
    destroy(id);
    const c = canvas(id); if (!c) return;
    const ctx = c.getContext('2d');
    _charts[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d=>d.day),
        datasets: [{
          data: data.map(d=>d.pnl),
          backgroundColor: data.map(d => d.pnl>=0?'rgba(0,230,118,0.6)':'rgba(255,61,87,0.6)'),
          borderRadius: 4, borderSkipped: false
        }]
      },
      options: { ...CHART_DEFAULTS, scales: { x: { ...CHART_DEFAULTS.scales.x, grid: { display: false } }, y: { ...CHART_DEFAULTS.scales.y } }, plugins: { ...CHART_DEFAULTS.plugins } }
    });
  },

  riskScatter(id, trades) {
    destroy(id);
    const c = canvas(id); if (!c) return;
    const data = trades.filter(t=>t.rMultiple!=null && t.riskPercent!=null).map(t => ({
      x: t.riskPercent, y: t.rMultiple,
      pnl: t.pnl
    }));
    const ctx = c.getContext('2d');
    _charts[id] = new Chart(ctx, {
      type: 'scatter',
      data: { datasets: [{ data, backgroundColor: data.map(p => p.pnl>=0?'rgba(0,230,118,0.6)':'rgba(255,61,87,0.6)'), pointRadius: 5, pointHoverRadius: 7 }] },
      options: {
        ...CHART_DEFAULTS,
        plugins: { ...CHART_DEFAULTS.plugins, tooltip: { ...CHART_DEFAULTS.plugins.tooltip, callbacks: { label: ctx => [`Risk: ${ctx.parsed.x}%`, `R: ${ctx.parsed.y}R`] } } },
        scales: {
          x: { ...CHART_DEFAULTS.scales.x, title: { display: true, text: 'Risk %', color: 'rgba(255,255,255,0.3)' } },
          y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'R-Multiple', color: 'rgba(255,255,255,0.3)' } }
        }
      }
    });
  },

  disciplineTimeline(id, trades) {
    destroy(id);
    const c = canvas(id); if (!c) return;
    const sorted = [...trades].sort((a,b) => (a.date?.toDate?.()??new Date(a.date)) - (b.date?.toDate?.()??new Date(b.date)));
    const window = 10;
    const labels=[], values=[];
    for (let i = window-1; i < sorted.length; i++) {
      const slice = sorted.slice(i-window+1, i+1);
      const followed = slice.filter(t=>t.followedRules===true).length;
      const avg = (followed/window) * 100;
      const d = (sorted[i].date?.toDate?.() ?? new Date(sorted[i].date));
      labels.push(d.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
      values.push(parseFloat(avg.toFixed(1)));
    }
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0,0,0,200);
    grad.addColorStop(0,'rgba(0,212,255,0.2)');
    grad.addColorStop(1,'rgba(0,212,255,0)');
    _charts[id] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data: values, borderColor: '#00d4ff', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: grad, tension: 0.4 }] },
      options: {
        ...CHART_DEFAULTS,
        plugins: { ...CHART_DEFAULTS.plugins, tooltip: { ...CHART_DEFAULTS.plugins.tooltip, callbacks: { label: ctx => ` ${ctx.raw}% compliance` } } },
        scales: {
          x: { ...CHART_DEFAULTS.scales.x, grid: { display: false } },
          y: { ...CHART_DEFAULTS.scales.y, min: 0, max: 100, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => v+'%' } }
        }
      }
    });
  },

  donut(id, values, labels, colors) {
    destroy(id);
    const c = canvas(id); if (!c) return;
    const ctx = c.getContext('2d');
    _charts[id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4, borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '72%',
        plugins: { legend: { display: true, position: 'bottom', labels: { color: 'rgba(255,255,255,0.55)', padding: 16, font: { size: 12, family: "'DM Sans'" }, boxWidth: 10, boxHeight: 10, borderRadius: 3 } },
          tooltip: { ...CHART_DEFAULTS.plugins.tooltip }
        }
      }
    });
  },

  destroy
};
