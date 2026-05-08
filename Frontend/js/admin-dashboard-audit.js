// Admin testimonials audit modal helper
(async function(){
  function fmtDate(d){ return new Date(d).toLocaleString(); }

  window.showTestimonialAuditModal = async function(testimonialId){
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-lg font-semibold">Testimonial Audit Trail</h3>
          <button id="auditCloseBtn" class="btn btn-ghost">Close</button>
        </div>
        <div id="auditContent" class="max-h-80 overflow-auto text-sm text-slate-700">
          <p class="text-sm text-gray-500">Loading audit...</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#auditCloseBtn').addEventListener('click', ()=> modal.remove());

    try{
      const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
      const headers = token ? { Authorization: 'Bearer ' + token } : {};
      const res = await fetch(`${window.API_URL || '/api'}/testimonials/admin/${testimonialId}/audits`, { headers });
      const json = await res.json();
      const el = modal.querySelector('#auditContent');
      if (!json || !json.success) {
        if (el) el.innerHTML = `<p class="text-sm text-red-600">Failed to load audit: ${json && json.error ? json.error : 'Unknown'}</p>`;
        return;
      }
      if (!json.data || !json.data.length) {
        el.innerHTML = `<p class="text-sm text-gray-500">No audit entries found.</p>`;
        return;
      }

      el.innerHTML = json.data.map(a => `
        <div class="border-b border-slate-100 py-3">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <div><strong class="text-slate-800">${a.action.replace('_',' ')}</strong> ${a.adminName ? `by ${a.adminName}` : ''}</div>
              <div class="text-xs text-slate-500">${fmtDate(a.createdAt)}</div>
            </div>
            <div class="text-xs text-slate-600 text-right">
              ${a.previousStatus ? `<div class="text-rose-600">${a.previousStatus}</div>` : ''}
              ${a.newStatus ? `<div class="text-emerald-600">${a.newStatus}</div>` : ''}
            </div>
          </div>
          ${a.note ? `<div class="mt-2 text-sm text-slate-700">${a.note}</div>` : ''}
        </div>
      `).join('');

    }catch(err){
      const el = document.querySelector('#auditContent');
      if (el) el.innerHTML = `<p class="text-sm text-red-600">Error loading audit: ${err.message}</p>`;
    }
  };
})();