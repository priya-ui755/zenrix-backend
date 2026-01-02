(function(){
  // Wait for DOM
  document.addEventListener('DOMContentLoaded', async () => {
    // ensure admin scope
    const root = document.querySelector('.admin-app');
    if (!root) return;

    // Chart utilities and dynamic loader
    function loadScript(src){
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script'); s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error('Failed to load '+src)); document.head.appendChild(s);
      });
    }

    function createChart(ctx, type, data, options) {
      if (!window.Chart) return null;
      return new Chart(ctx, { type, data, options: options || {} });
    }

    // Fallback sample data
    const sampleOrders = { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], data:[12,18,9,22,14,26,30] };
    const sampleProducts = { labels:['Electronics','Fashion','Home','Beauty','Sports'], data:[12,8,10,6,5] };

    // try fetch live metrics (safe: will not throw if blocked)
    async function fetchOrdersChartData(){
      try{
        const token = localStorage.getItem('adminToken');
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await safeFetch('/api/admin/orders?limit=500', { headers }, { silent: true });
        const j = res ? await res.json() : null;
        if (j && j.success && Array.isArray(j.data)){
          // bucket by day (last 7 days)
          const days = Array.from({length:7},(_,i)=>{
            const d=new Date(); d.setDate(d.getDate()-6+i); return d.toLocaleDateString(undefined,{weekday:'short'});
          });
          const counts = days.map(day => 0);
          j.data.forEach(o=>{
            const d = new Date(o.createdAt);
            const short = d.toLocaleDateString(undefined,{weekday:'short'});
            const idx = days.indexOf(short);
            if (idx>=0) counts[idx] += 1;
          });
          return { labels: days, data: counts };
        }
      }catch(e){/* ignore */}
      return sampleOrders;
    }

    async function fetchProductsByCategory(){
      try{
        const res = await safeFetch('/api/products', {}, { silent: true });
        const j = res ? await res.json() : null;
        if (j && j.success && Array.isArray(j.data)){
          const groups = {};
          j.data.forEach(p=> groups[p.category] = (groups[p.category]||0)+1);
          return { labels: Object.keys(groups), data: Object.values(groups) };
        }
      }catch(e){/* ignore */}
      return sampleProducts;
    }

    async function fetchRevenueByDay(){
      try{
        const token = localStorage.getItem('adminToken');
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await safeFetch('/api/admin/orders?limit=1000', { headers }, { silent: true });
        const j = res ? await res.json() : null;
        if (j && j.success && Array.isArray(j.data)){
          // aggregate revenue by last 7 days
          const days = Array.from({length:7},(_,i)=>{const d=new Date(); d.setDate(d.getDate()-6+i); return d.toLocaleDateString(undefined,{weekday:'short'});});
          const sums = days.map(()=>0);
          j.data.forEach(o=>{const short=new Date(o.createdAt).toLocaleDateString(undefined,{weekday:'short'}); const idx=days.indexOf(short); if (idx>=0) sums[idx]+=Number(o.total||0)});
          return { labels: days, data: sums };
        }
      }catch(e){}
      return { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], data: [12000,18000,9000,22000,14000,26000,30000] };
    }

    async function fetchPaymentBreakdown(){
      try{
        const res = await safeFetch('/api/admin/orders?limit=1000', {}, { silent: true });
        const j = res ? await res.json() : null;
        if (j && j.success && Array.isArray(j.data)){
          const counts = {};
          j.data.forEach(o=>{const m = o.payment?.method || 'unknown'; counts[m]=(counts[m]||0)+1});
          return { labels: Object.keys(counts), data: Object.values(counts) };
        }
      }catch(e){}
      return { labels:['cod','bank-transfer','esewa','khalti','imepay'], data:[40,25,18,10,7] };
    }

    // render charts
    try{
      // ensure Chart.js is available (lazy-load if needed)
      if (!window.Chart) {
        try{ await loadScript('https://cdn.jsdelivr.net/npm/chart.js'); }catch(e){ console.warn('Failed to load Chart.js', e && e.message); }
      }

      const ordersCtx = document.getElementById('chartOrders')?.getContext('2d');
      const productsCtx = document.getElementById('chartProducts')?.getContext('2d');

      const ordersData = await fetchOrdersChartData();
      const productsData = await fetchProductsByCategory();

      if (ordersCtx) createChart(ordersCtx,'line',{labels:ordersData.labels,datasets:[{label:'Orders',data:ordersData.data,backgroundColor:'rgba(79,70,229,0.12)',borderColor:'#4f46e5',fill:true,tension:0.3}]}, {scales:{y:{beginAtZero:true}}});

      // small sparkline in AOV area (tiny chart)
      const aovSparkCtx = document.getElementById('aovSpark')?.getContext('2d');
      try{
        const aov = await fetchAOVSpark();
        if (aovSparkCtx) createChart(aovSparkCtx,'line',{labels:aov.labels,datasets:[{data:aov.data,borderColor:'#7c3aed',borderWidth:1,pointRadius:0,fill:false}]} , {plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}});
      }catch(e){}
      if (productsCtx) createChart(productsCtx,'doughnut',{labels:productsData.labels,datasets:[{label:'Products by category',data:productsData.data,backgroundColor:['#667eea','#a78bfa','#7dd3fc','#f472b6','#fbbf24']}]});

      // revenue chart and payments chart
      const revCtx = document.getElementById('chartRevenue')?.getContext('2d');
      const payCtx = document.getElementById('chartPayments')?.getContext('2d');
      // revenue by day
      try{
        const rev = await fetchRevenueByDay();
        if (revCtx) createChart(revCtx,'line',{labels:rev.labels,datasets:[{label:'Revenue',data:rev.data,backgroundColor:'rgba(5,150,105,0.12)',borderColor:'#059669',fill:true,tension:0.3}]}, {scales:{y:{beginAtZero:true}}});
      }catch(e){}
      // payments
      try{
        const payments = await fetchPaymentBreakdown();
        if (payCtx) createChart(payCtx,'doughnut',{labels:payments.labels,datasets:[{data:payments.data,backgroundColor:['#34d399','#60a5fa','#f97316','#fb7185','#a78bfa']}]});
      }catch(e){}


      // sidebar toggle with aria handling and persistence
      const sidebarToggle = document.getElementById('sidebarToggle');
      const sidebar = document.querySelector('.admin-sidebar');
      const collapsed = localStorage.getItem('adminSidebarCollapsed') === '1';
      if (collapsed) { sidebar.classList.add('collapsed'); sidebar.style.width='64px'; sidebarToggle.setAttribute('aria-expanded','true'); }
      sidebarToggle?.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        sidebar.style.width = isCollapsed ? '64px' : '220px';
        sidebarToggle.setAttribute('aria-expanded', String(isCollapsed));
        localStorage.setItem('adminSidebarCollapsed', isCollapsed ? '1' : '0');
      });

    }catch(e){console.warn('Charts init failed', e.message)}

    // Quick KPI numbers
    try{
      const pRes = await safeFetch('/api/products', {}, { silent: true });
      const p = pRes ? await pRes.json() : null;
      if (p && p.success) { const el = document.getElementById('totalProducts'); if (el) { el.textContent = p.data.length; el.classList.remove('skeleton'); } }
    }catch(e){ console.warn('Quick KPI load failed', e && e.message); }

    // revenue, conversion, refunds
    async function fetchRevenueConversion(){
      // added Average Order Value computation helper
      function computeAOV(orders){
        if (!orders || !orders.length) return 0;
        const total = orders.reduce((s,o)=>s + (o.total||0),0);
        return Math.round(total / orders.length);
      }

      try{
        const token = localStorage.getItem('adminToken');
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch('/api/admin/orders?limit=10', { headers });
        const j = await res.json();
        if (j && j.success && Array.isArray(j.data)){
          // limit to recent orders
          const recent = j.data.slice(0,10);
          // populate recent orders table
          const tbody = document.getElementById('recentOrdersBody');
          if (tbody) {
            tbody.innerHTML = recent.map(o => `
              <tr>
                <td style="padding:.6rem .75rem">#${(o._id||'').slice(-6).toUpperCase()}</td>
                <td style="padding:.6rem .75rem">${(o.user && (o.user.firstName||'') + ' ' + (o.user.lastName||'')) || (o.user && o.user.email) || 'Guest'}</td>
                <td style="padding:.6rem .75rem">NPR ${Number(o.total||0).toLocaleString()}</td>
                <td style="padding:.6rem .75rem"><span class="badge ${o.status === 'Completed' ? 'success' : (o.status === 'Canceled' ? 'danger' : 'warn')}">${o.status || '—'}</span></td>
                <td style="padding:.6rem .75rem">${new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            `).join('');
          }
        }
      }catch(e){/* ignore */}

      try{
        const token = localStorage.getItem('adminToken');
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch('/api/admin/orders?limit=1000', { headers });
        const j = await res.json();
        if (j && j.success && Array.isArray(j.data)){
          const orders = j.data;
          const totalRevenue = orders.reduce((s,o)=>s + (o.total||0), 0);
          const completed = orders.filter(o=>o.status === 'Completed').length;
          const total = orders.length || 1;
          const refunds = orders.filter(o=>o.status === 'Canceled').reduce((s,o)=>s + (o.total||0), 0);
          const aov = computeAOV(orders);

          // compute last 7 days vs previous 7 days revenue for trend
          const now = Date.now();
          const DAY = 24*60*60*1000;
          let last7 = 0, prev7 = 0;
          orders.forEach(o=>{
            const d = Date.parse(o.createdAt);
            if (isNaN(d)) return;
            const diffDays = Math.floor((now - d)/DAY);
            if (diffDays >=0 && diffDays < 7) last7 += Number(o.total||0);
            else if (diffDays >=7 && diffDays < 14) prev7 += Number(o.total||0);
          });
          let revenueTrendDelta = 0;
          if (prev7 > 0) revenueTrendDelta = Math.round(((last7 - prev7)/prev7)*100);
          else revenueTrendDelta = last7 > 0 ? 100 : 0;

      return { revenue: totalRevenue, conversion: Math.round((completed/total)*100), refunds, aov, revenueTrendDelta };
        }
      }catch(e){}
      return { revenue: 0, conversion: 0, refunds: 0, aov: 0, revenueTrendDelta: 0 };
    }

    try{
      const m = await fetchRevenueConversion();
      const revEl = document.getElementById('revenueTotal'); if (revEl) { revEl.textContent = 'NPR ' + (m.revenue || 0).toLocaleString(); revEl.classList.remove('skeleton'); }
      const convEl = document.getElementById('conversionRate'); if (convEl) { convEl.textContent = (m.conversion || 0) + '%'; convEl.classList.remove('skeleton'); }
      const refEl = document.getElementById('refundsTotal'); if (refEl) { refEl.textContent = 'NPR ' + (m.refunds || 0).toLocaleString(); refEl.classList.remove('skeleton'); }
      const aovEl = document.getElementById('aovValue'); if (aovEl) { aovEl.textContent = 'NPR ' + (m.aov || 0).toLocaleString(); aovEl.classList.remove('skeleton'); }

      // revenue trend
      const trendEl = document.getElementById('revenueTrend');
      if (trendEl) {
        const d = Number(m.revenueTrendDelta || 0);
        if (d > 0) { trendEl.className = 'trend-up'; trendEl.textContent = `▲ ${d}%`; }
        else if (d < 0) { trendEl.className = 'trend-down'; trendEl.textContent = `▼ ${Math.abs(d)}%`; }
        else { trendEl.className = 'trend-neutral'; trendEl.textContent = '—'; }
      }

    }catch(e){/* ignore */}

    // ensure admin body class so admin css is active
    document.body.classList.add('admin');

  });
})();
