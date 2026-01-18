(function(){
  // Wait for DOM
  document.addEventListener('DOMContentLoaded', async () => {
    // Ensure product list loads when Products tab is shown
    function showTab(tab) {
      // Hide all content sections robustly
      document.querySelectorAll('[id^="content-"]').forEach(el => { el.classList.add('hidden'); try { el.style.display = 'none'; } catch(e){} });

      // Close common modals/overlays so they don't persist across tabs
      const modalIds = ['#ticketDetailsModal','#editProductModal','#editCareerModal','#editPageModal','#editComponentModal','#orderDetailsModal'];
      modalIds.forEach(sel => { try { const m = document.querySelector(sel); if (m) { m.classList.add('hidden'); } } catch(e){} });

      // Show requested content
      const el = document.getElementById('content-' + tab);
      if (el) {
        el.classList.remove('hidden');
        try { el.style.display = ''; } catch(e){}
        markLoading(el);
        // scroll top for better UX
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){}
      }

      // Update sidebar nav active states
      document.querySelectorAll('[data-jump-tab]').forEach(a => {
        try { a.classList.toggle('active', a.getAttribute('data-jump-tab') === tab); } catch(e){}
      });

      // Update top tab buttons
      document.querySelectorAll('[data-tab]').forEach(btn => {
        try {
          const t = btn.getAttribute('data-tab');
          btn.classList.toggle('border-blue-600', t === tab);
          btn.classList.toggle('text-blue-600', t === tab);
        } catch(e){}
      });

      // Per-tab loaders
      if (tab === 'products' && typeof loadProducts === 'function') {
        loadProducts().then(() => { markLoaded(document.getElementById('content-products')); }).catch(()=>{ markLoaded(document.getElementById('content-products')); });
      }
      if (tab === 'testimonials' && typeof loadTestimonials === 'function') {
        loadTestimonials().then(() => { markLoaded(document.getElementById('content-testimonials')); }).catch(()=>{ markLoaded(document.getElementById('content-testimonials')); });
      }

      // Some tabs need additional refreshes
      if (tab === 'tickets' && typeof loadTickets === 'function') {
        try { loadTickets(); } catch(e){}
      }
      if (tab === 'subscribers' && typeof loadSubscribers === 'function') {
        try { loadSubscribers({ silent: true }); } catch(e){}
      }
    }
    document.querySelectorAll('[data-jump-tab]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const tab = btn.getAttribute('data-jump-tab');
        if (tab) showTab(tab);
      });
    });
    // Reprocess images button
    const reprocessBtn = document.getElementById('reprocessImagesBtn');
    if (reprocessBtn) {
      reprocessBtn.addEventListener('click', async () => {
        if (!confirm('Reprocess all product images to modern format? This may take a while.')) return;
        reprocessBtn.disabled = true;
        reprocessBtn.textContent = 'Processing...';
        try {
          const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
          const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
          const res = await fetch('/api/products/reprocess-images', {
            method: 'POST',
            credentials: 'include',
            headers
          });
          const j = await res.json();
          if (j && j.success) {
            alert(`Reprocessed: ${j.updated} products. Failed: ${j.failed}`);
          } else {
            alert('Failed: ' + (j && j.error ? j.error : 'Unknown error'));
          }
        } catch (e) {
          alert('Error: ' + (e && e.message ? e.message : e));
        }
        reprocessBtn.disabled = false;
        reprocessBtn.textContent = 'Reprocess All Product Images';
      });
    }
    // ensure admin scope
    const root = document.querySelector('.admin-app');
    if (!root) return;

    // keyboard navigation for sidebar (accessibility)
    (function setupSidebarKeyboard(){
      try {
        const links = Array.from(document.querySelectorAll('#adminSidebar a.nav-link'));
        if (!links.length) return;
        links.forEach((a, idx) => {
          a.setAttribute('tabindex', '0');
          a.setAttribute('role', 'menuitem');
          const tab = a.getAttribute('data-jump-tab');
          if (tab) a.setAttribute('aria-controls', 'content-' + tab);
          a.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              const next = links[(idx + 1) % links.length]; next.focus();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              const prev = links[(idx - 1 + links.length) % links.length]; prev.focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              a.click();
            }
          });
          a.addEventListener('click', () => {
            links.forEach(l => l.setAttribute('aria-current', 'false'));
            a.setAttribute('aria-current', 'true');
          });
        });
      } catch (e) { /* ignore */ }
    })();

    // lightweight skeleton helper: add .skeleton when switching tabs and remove after data loads
    function markLoading(el) {
      if (!el) return; el.classList.add('skeleton');
    }
    function markLoaded(el) {
      if (!el) return; el.classList.remove('skeleton');
    }

    // Chart utilities and dynamic loader

    // --- Product List Rendering for Admin Panel ---
    function formatNpr(amount) {
      return 'NPR ' + Number(amount || 0).toLocaleString();
    }

    let productsCache = {};
    let productSaleCountdownInterval = null;

    function startProductSaleCountdowns(products = []) {
      if (productSaleCountdownInterval) {
        clearInterval(productSaleCountdownInterval);
        productSaleCountdownInterval = null;
      }
      const lookup = {};
      products.forEach(p => {
        if (p.onSale && p.saleEnd) lookup[p._id] = new Date(p.saleEnd).getTime();
      });
      if (!Object.keys(lookup).length) return;
      function render() {
        Object.entries(lookup).forEach(([id, endTs]) => {
          const el = document.querySelector(`[data-sale-countdown="${id}"]`);
          if (!el) return;
          const now = Date.now();
          let diff = Math.max(0, endTs - now);
          const days = Math.floor(diff / (24*60*60*1000));
          diff -= days * 24*60*60*1000;
          const hours = Math.floor(diff / (60*60*1000));
          diff -= hours * 60*60*1000;
          const minutes = Math.floor(diff / (60*1000));
          diff -= minutes * 60*1000;
          const seconds = Math.floor(diff / 1000);
          const dayPrefix = days > 0 ? `${days}d ` : '';
          el.textContent = `Ends in ${dayPrefix}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        });
      }
      render();
      productSaleCountdownInterval = setInterval(render, 1000);
    }

    function attachProductEventListeners() {
      console.log('[DEBUG] Attaching product event listeners...');
      // Use event delegation to avoid duplicate listeners
      const productsList = document.getElementById('productsList');
      if (!productsList) {
        return;
      }

      // Remove existing listener if it exists
      if (productsList._productEventListener) {
        productsList.removeEventListener('click', productsList._productEventListener);
      }

      // Create and attach new listener
      productsList._productEventListener = function(e) {
        const target = e.target;
        const editBtn = target.closest('[data-edit-product]');
        const deleteBtn = target.closest('[data-delete-product]');

        if (editBtn) {
          e.preventDefault();
          const id = editBtn.getAttribute('data-edit-product');
          editProduct(id);
        } else if (deleteBtn) {
          e.preventDefault();
          const id = deleteBtn.getAttribute('data-delete-product');
          deleteProduct(id);
        }
      };

      productsList.addEventListener('click', productsList._productEventListener);
    }

    // Show edit modal and populate fields
    function editProduct(id) {
      const product = productsCache[id];
      if (!product) return alert('Product not found');
      try { console.debug('[UI DEBUG] editProduct called, id=', id, 'adminToken=', (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null))); } catch(e) {}
      const modal = document.getElementById('editProductModal');
      const form = document.getElementById('editProductForm');
      if (!modal || !form) return alert('Edit modal not found');
      form.reset();
      form.elements['id'].value = product._id;
      form.elements['name'].value = product.name || '';
      form.elements['price'].value = product.price || '';
      form.elements['description'].value = product.description || '';
      form.elements['category'].value = product.category || '';
      form.elements['stock'].value = product.stock || 0;
      form.elements['image'].value = product.image || '';
      form.elements['images'].value = (product.images || []).join('\n');
      form.elements['featured'].checked = !!product.featured;
      form.elements['onSale'].checked = !!product.onSale;
      form.elements['salePrice'].value = product.salePrice || '';
      form.elements['saleEnd'].value = product.saleEnd ? new Date(product.saleEnd).toISOString().slice(0,16) : '';
      form.elements['saleLabel'].value = product.saleLabel || '';
      modal.classList.remove('hidden');
    }

    // Handle edit form submit
    document.addEventListener('DOMContentLoaded', function() {
      const form = document.getElementById('editProductForm');
      if (form) {
        form.onsubmit = async function(e) {
          e.preventDefault();
          const id = form.elements['id'].value;
          try { console.debug('[UI DEBUG] submit edit form, id=', id, 'adminToken=', (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null))); } catch(e) {}
          const data = {
            name: form.elements['name'].value,
            price: form.elements['price'].value,
            description: form.elements['description'].value,
            category: form.elements['category'].value,
            stock: form.elements['stock'].value,
            image: form.elements['image'].value,
            images: form.elements['images'].value.split('\n').filter(Boolean),
            featured: form.elements['featured'].checked,
            onSale: form.elements['onSale'].checked,
            salePrice: form.elements['salePrice'].value,
            saleEnd: form.elements['saleEnd'].value,
            saleLabel: form.elements['saleLabel'].value
          };
          try {
            const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
            try { console.debug('[UI DEBUG] sending PUT /api/products/' + id + ' tokenExists=' + !!token); } catch(e) {}
            const res = await fetch(`/api/products/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': 'Bearer ' + token } : {})
              },
              body: JSON.stringify(data)
            });
            const j = await res.json();
            if (j && j.success) {
              showToast && showToast('success', 'Product updated');
              document.getElementById('editProductModal').classList.add('hidden');
              loadProducts();
            } else {
              showToast && showToast('error', j && j.error ? j.error : 'Update failed');
            }
          } catch (err) {
            showToast && showToast('error', err && err.message ? err.message : 'Update failed');
          }
        };
      }
      // Close modal
      const closeBtn = document.getElementById('closeEditModalBtn');
      if (closeBtn) closeBtn.onclick = () => document.getElementById('editProductModal').classList.add('hidden');
    });

    // Delete product
    async function deleteProduct(id) {
      try { console.debug('[UI DEBUG] deleteProduct called, id=', id, 'adminToken=', (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null))); } catch(e) {}
      if (!confirm('Delete this product? This cannot be undone.')) return;
      try {
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        try { console.debug('[UI DEBUG] sending DELETE /api/products/' + id + ' tokenExists=' + !!token); } catch(e) {}
        const res = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });
        const j = await res.json();
        if (j && j.success) {
          showToast && showToast('success', 'Product deleted');
          loadProducts();
        } else {
          showToast && showToast('error', j && j.error ? j.error : 'Delete failed');
        }
      } catch (err) {
        showToast && showToast('error', err && err.message ? err.message : 'Delete failed');
      }
    }

    let allProducts = [];
    let currentCategory = 'all';
    let currentSearch = '';
    let currentViewMode = 'list';
    let listenersAdded = false;

    async function loadProducts() {
      try {
        console.debug('loadProducts: fetching products from', window.API_URL || '/api');
        const res = await fetch(`${window.API_URL || '/api'}/products`);
        const data = await res.json();
        console.debug('loadProducts: response', data && (data.success ? `${data.data.length} items` : 'no success'));
        if (data && data.success) {
          productsCache = {};
          data.data.forEach(p => productsCache[p._id] = p);
          allProducts = data.data;
          if (!listenersAdded) {
            document.getElementById('viewByCategory').addEventListener('change', e => {
              currentCategory = e.target.value;
              applyFilters();
            });
            document.getElementById('viewMode').addEventListener('change', e => {
              currentViewMode = e.target.value;
              applyFilters();
            });
            document.getElementById('searchProducts').addEventListener('input', e => {
              currentSearch = e.target.value;
              applyFilters();
            });
            listenersAdded = true;
          }
          try {
            const totalProductsEl = document.getElementById('totalProducts');
            if (totalProductsEl) totalProductsEl.textContent = data.count;
            else console.debug('loadProducts: totalProducts element not found');
          } catch (e) { console.error('loadProducts: totalProducts update failed', e); }
          try {
            const inStockEl = document.getElementById('inStock');
            if (inStockEl) inStockEl.textContent = data.data.filter(p => p.stock > 0).length;
            else console.debug('loadProducts: inStock element not found');
          } catch (e) { console.error('loadProducts: inStock update failed', e); }
          try {
            const list = document.getElementById('productsList');
            if (list) {
              renderProducts(allProducts);
            } else {
              console.debug('loadProducts: productsList element not found');
            }
          } catch (e) { console.error('loadProducts: productsList render failed', e); }
        }
      } catch (err) {
        console.error('loadProducts: caught error', err && err.stack ? err.stack : err);
        if (typeof showToast === 'function') showToast('error', 'Failed to load products: ' + (err && err.message ? err.message : err));
      }
    }

    function renderProducts(products) {
      const list = document.getElementById('productsList');
      if (!list) return;
      let html = '';
      if (currentViewMode === 'list') {
        html = products.map(p => {
          const images = p.images && p.images.length > 0 ? p.images : [p.image];
          const saleEndTs = p?.saleEnd ? new Date(p.saleEnd).getTime() : null;
          const saleActive = p.onSale && Number(p.salePrice) > 0 && (!saleEndTs || saleEndTs > Date.now());
          const displayPrice = saleActive ? `${formatNpr(p.salePrice)} (was ${formatNpr(p.price)})` : formatNpr(p.price);
          return `
            <div class="bg-white border border-gray-200 rounded-lg p-6 card-hover">
              <div class="flex items-start justify-between">
                <div class="flex items-start space-x-4 flex-1">
                  ${p.image ? `<img src="${p.image}" alt="${p.name}" class="w-20 h-20 object-cover rounded-lg">` : ''}
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-800 text-lg">${p.name}</h3>
                    <p class="text-sm text-gray-600 mt-1">${p.description || ''}</p>
                    <div class="flex items-center space-x-4 mt-2 text-sm">
                      <span class="text-blue-600 font-semibold">${displayPrice}</span>
                      <span class="text-gray-500">${p.category}</span>
                      <span class="${p.stock > 0 ? 'text-green-600' : 'text-red-600'}">Stock: ${p.stock}</span>
                      ${p.featured ? '<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">Featured</span>' : ''}
                      ${saleActive ? `<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs">${p.saleLabel || 'On Sale'}</span>` : ''}
                      ${(saleActive && saleEndTs) ? `<span class="text-xs text-emerald-700" data-sale-countdown="${p._id}"></span>` : ''}
                    </div>
                    ${images.length > 1 ? `
                      <div class="flex space-x-2 mt-3">
                        ${images.slice(0, 4).map(img => `<img src="${img}" class="image-preview rounded border">`).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
                <div class="flex flex-col space-y-2 ml-4">
                  <button data-edit-product="${p._id}" class="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition whitespace-nowrap">Edit</button>
                  <button data-delete-product="${p._id}" class="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition whitespace-nowrap">Delete</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      } else if (currentViewMode === 'tile') {
        html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">` + products.map(p => {
          const saleEndTs = p?.saleEnd ? new Date(p.saleEnd).getTime() : null;
          const saleActive = p.onSale && Number(p.salePrice) > 0 && (!saleEndTs || saleEndTs > Date.now());
          const displayPrice = saleActive ? `${formatNpr(p.salePrice)} (was ${formatNpr(p.price)})` : formatNpr(p.price);
          return `
            <div class="bg-white border border-gray-200 rounded-lg p-4 card-hover">
              ${p.image ? `<img src="${p.image}" alt="${p.name}" class="w-full h-32 object-cover rounded-lg mb-3">` : ''}
              <h3 class="font-semibold text-gray-800 text-base mb-1">${p.name}</h3>
              <p class="text-sm text-gray-600 mb-2 line-clamp-2">${p.description || ''}</p>
              <div class="flex items-center justify-between">
                <span class="text-blue-600 font-semibold">${displayPrice}</span>
                <span class="text-gray-500 text-sm">${p.category}</span>
              </div>
              <div class="flex items-center justify-between mt-2">
                <span class="${p.stock > 0 ? 'text-green-600' : 'text-red-600'} text-sm">Stock: ${p.stock}</span>
                <div class="flex space-x-1">
                  <button data-edit-product="${p._id}" class="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-xs">Edit</button>
                  <button data-delete-product="${p._id}" class="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs">Delete</button>
                </div>
              </div>
            </div>
          `;
        }).join('') + `</div>`;
      } else if (currentViewMode === 'small-icon') {
        html = `<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">` + products.map(p => {
          return `
            <div class="bg-white border border-gray-200 rounded-lg p-3 card-hover text-center">
              ${p.image ? `<img src="${p.image}" alt="${p.name}" class="w-16 h-16 object-cover rounded-lg mx-auto mb-2">` : ''}
              <h3 class="font-semibold text-gray-800 text-sm mb-1 line-clamp-1">${p.name}</h3>
              <p class="text-xs text-gray-500">${p.category}</p>
              <div class="flex justify-center space-x-1 mt-2">
                <button data-edit-product="${p._id}" class="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200">E</button>
                <button data-delete-product="${p._id}" class="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200">D</button>
              </div>
            </div>
          `;
        }).join('') + `</div>`;
      } else if (currentViewMode === 'table') {
        html = `
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                ${products.map(p => {
                  const saleEndTs = p?.saleEnd ? new Date(p.saleEnd).getTime() : null;
                  const saleActive = p.onSale && Number(p.salePrice) > 0 && (!saleEndTs || saleEndTs > Date.now());
                  const displayPrice = saleActive ? `${formatNpr(p.salePrice)} (was ${formatNpr(p.price)})` : formatNpr(p.price);
                  return `
                    <tr class="hover:bg-gray-50">
                      <td class="px-4 py-2">
                        ${p.image ? `<img src="${p.image}" alt="${p.name}" class="w-12 h-12 object-cover rounded">` : ''}
                      </td>
                      <td class="px-4 py-2 text-sm font-medium text-gray-900">${p.name}</td>
                      <td class="px-4 py-2 text-sm text-gray-500">${displayPrice}</td>
                      <td class="px-4 py-2 text-sm text-gray-500">${p.category}</td>
                      <td class="px-4 py-2 text-sm ${p.stock > 0 ? 'text-green-600' : 'text-red-600'}">${p.stock}</td>
                      <td class="px-4 py-2 text-sm">
                        <button data-edit-product="${p._id}" class="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                        <button data-delete-product="${p._id}" class="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
      list.innerHTML = html;
      attachProductEventListeners();
      startProductSaleCountdowns(products);
    }

    function applyFilters() {
      let filtered = allProducts;
      if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
      }
      if (currentSearch) {
        const search = currentSearch.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || (p.description && p.description.toLowerCase().includes(search)));
      }
      renderProducts(filtered);
    }

    // Expose to global scope for inline HTML handlers that call these
    try {
      window.loadProducts = loadProducts;
      window.attachProductEventListeners = attachProductEventListeners;
      window.startProductSaleCountdowns = startProductSaleCountdowns;
    } catch (e) {/* ignore in strict CSP contexts */}
    
    // --- Testimonials Management ---
    async function loadTestimonials() {
      try {
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch(`${window.API_URL || '/api'}/testimonials/admin/all`, { headers, credentials: 'include' });
        const data = await res.json();
        if (data && data.success) {
          renderTestimonials(data.data);
        } else {
          console.error('Failed to load testimonials:', data);
          if (typeof showToast === 'function') showToast('error', 'Failed to load testimonials');
        }
      } catch (err) {
        console.error('Error loading testimonials:', err);
        if (typeof showToast === 'function') showToast('error', 'Error loading testimonials: ' + (err.message || err));
      }
    }

    function getStatusColor(status) {
      switch (status) {
        case 'approved': return 'bg-green-100 text-green-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }

    function renderTestimonials(testimonials) {
      const table = document.getElementById('testimonialsTable');
      if (!table) return;

      const html = testimonials.map(t => `
        <tr class="hover:bg-gray-50" data-testimonial-id="${t._id}">
          <td class="px-4 py-3 text-sm font-medium text-gray-900">${t.name}</td>
          <td class="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title="${t.review}">${t.review}</td>
          <td class="px-4 py-3 text-sm text-gray-500">
            ${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}
          </td>
          <td class="px-4 py-3 text-sm">
            <span class="px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(t.status)} status-badge">
              ${t.status}
            </span>
          </td>
          <td class="px-4 py-3 text-sm text-gray-500">${new Date(t.createdAt).toLocaleDateString()}</td>
          <td class="px-4 py-3 text-right text-sm font-medium space-x-2">
            <button data-edit-testimonial="${t._id}" class="text-blue-600 hover:text-blue-900">Edit</button>
            <button data-delete-testimonial="${t._id}" class="text-red-600 hover:text-red-900">Delete</button>
            <button data-audit-testimonial="${t._id}" class="text-slate-600 hover:text-slate-900">Audit</button>
            ${t.status === 'pending' ? `<button data-approve-testimonial="${t._id}" class="text-green-600 hover:text-green-900">Approve</button>
            <button data-reject-testimonial="${t._id}" class="text-rose-600 hover:text-rose-900">Reject</button>` : (t.status === 'approved' ? `<button data-unapprove-testimonial="${t._id}" class="text-yellow-600 hover:text-yellow-900">Unapprove</button>` : `<button data-approve-testimonial="${t._id}" class="text-green-600 hover:text-green-900">Approve</button>`)}
          </td>
        </tr>
      `).join('');

      table.innerHTML = html;
      attachTestimonialEventListeners();
    }

    function attachTestimonialEventListeners() {
      // Add testimonial button
      const addBtn = document.getElementById('addTestimonialBtn');
      if (addBtn) {
        addBtn.addEventListener('click', () => showTestimonialModal());
      }

      // Use event delegation on the testimonials table to handle actions
      const table = document.getElementById('testimonialsTable');
      if (!table) return;

      // Remove existing delegated listener if present
      if (table._testimonialListener) {
        table.removeEventListener('click', table._testimonialListener);
      }

      table._testimonialListener = function (e) {
        const target = e.target;
        const editBtn = target.closest('[data-edit-testimonial]');
        const deleteBtn = target.closest('[data-delete-testimonial]');
        const approveBtn = target.closest('[data-approve-testimonial]');
        const rejectBtn = target.closest('[data-reject-testimonial]');
        const unapproveBtn = target.closest('[data-unapprove-testimonial]');

        if (editBtn) {
          e.preventDefault();
          const id = editBtn.getAttribute('data-edit-testimonial');
          editTestimonial(id);
          return;
        }
        if (deleteBtn) {
          e.preventDefault();
          const id = deleteBtn.getAttribute('data-delete-testimonial');
          deleteTestimonial(id);
          return;
        }
        if (approveBtn) {
          e.preventDefault();
          const id = approveBtn.getAttribute('data-approve-testimonial');
          approveTestimonial(id);
          return;
        }
        if (rejectBtn) {
          e.preventDefault();
          const id = rejectBtn.getAttribute('data-reject-testimonial');
          rejectTestimonial(id);
          return;
        }
        if (unapproveBtn) {
          e.preventDefault();
          const id = unapproveBtn.getAttribute('data-unapprove-testimonial');
          unapproveTestimonial(id);
          return;
        }
        const auditBtn = target.closest('[data-audit-testimonial]');
        if (auditBtn) {
          e.preventDefault();
          const id = auditBtn.getAttribute('data-audit-testimonial');
          if (typeof window.showTestimonialAuditModal === 'function') window.showTestimonialAuditModal(id);
          else alert('Audit view not available');
          return;
        }
      };

      table.addEventListener('click', table._testimonialListener);
    }

    function updateTestimonialRow(id, updated) {
      const row = document.querySelector(`[data-testimonial-id="${id}"]`);
      if (!row) return;
      const badge = row.querySelector('.status-badge');
      if (badge) {
        badge.textContent = updated.status;
        badge.className = 'px-2 py-1 rounded-full text-xs font-medium ' + getStatusColor(updated.status) + ' status-badge';
      }
      const actionsTd = row.querySelector('td:last-child');
      if (actionsTd) {
        let actionsHtml = `<button data-edit-testimonial="${id}" class="text-blue-600 hover:text-blue-900">Edit</button>`;
        actionsHtml += ` <button data-delete-testimonial="${id}" class="text-red-600 hover:text-red-900">Delete</button>`;
        if (updated.status === 'pending') {
          actionsHtml += ` <button data-approve-testimonial="${id}" class="text-green-600 hover:text-green-900">Approve</button> <button data-reject-testimonial="${id}" class="text-rose-600 hover:text-rose-900">Reject</button>`;
        } else if (updated.status === 'approved') {
          actionsHtml += ` <button data-unapprove-testimonial="${id}" class="text-yellow-600 hover:text-yellow-900">Unapprove</button>`;
        } else if (updated.status === 'rejected') {
          actionsHtml += ` <button data-approve-testimonial="${id}" class="text-green-600 hover:text-green-900">Approve</button>`;
        }
        actionsTd.innerHTML = actionsHtml;
      }

      // Visual highlight for updated row
      row.classList.add('row-flash');
      setTimeout(() => row.classList.remove('row-flash'), 1200);
    }

    async function approveTestimonial(id) {
      if (!confirm('Approve this testimonial and publish it publicly?')) return;
      const row = document.querySelector(`[data-testimonial-id="${id}"]`);
      const prevStatus = row?.querySelector('.status-badge')?.textContent || 'pending';
      try {
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        };
        const res = await fetch(`${window.API_URL || '/api'}/testimonials/admin/${id}`, {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({ status: 'approved', isActive: true })
        });
        const data = await res.json();
        if (data && data.success) {
          updateTestimonialRow(id, data.data);
          showErrorBanner('Testimonial approved', { actionText: 'Undo', actionCallback: async () => {
            try {
              const revRes = await fetch(`${window.API_URL || '/api'}/testimonials/admin/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: prevStatus, isActive: prevStatus === 'approved' })
              });
              const rev = await revRes.json();
              if (rev && rev.success) {
                updateTestimonialRow(id, rev.data);
                if (typeof showToast === 'function') showToast('success', 'Reverted');
              }
            } catch (e) { console.error('Undo approve failed', e); }
          } });
        } else {
          alert('Failed to approve testimonial: ' + (data && data.error ? data.error : 'Unknown error'));
        }
      } catch (err) {
        console.error('Error approving testimonial:', err);
        alert('Error approving testimonial: ' + (err.message || err));
      }
    }

    async function rejectTestimonial(id) {
      if (!confirm('Reject this testimonial? It will not be published.')) return;
      const row = document.querySelector(`[data-testimonial-id="${id}"]`);
      const prevStatus = row?.querySelector('.status-badge')?.textContent || 'pending';
      try {
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        };
        const res = await fetch(`${window.API_URL || '/api'}/testimonials/admin/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: 'rejected', isActive: false })
        });
        const data = await res.json();
        if (data && data.success) {
          updateTestimonialRow(id, data.data);
          showErrorBanner('Testimonial rejected', { actionText: 'Undo', actionCallback: async () => {
            try {
              const revRes = await fetch(`${window.API_URL || '/api'}/testimonials/admin/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: prevStatus, isActive: prevStatus === 'approved' })
              });
              const rev = await revRes.json();
              if (rev && rev.success) {
                updateTestimonialRow(id, rev.data);
                if (typeof showToast === 'function') showToast('success', 'Reverted');
              }
            } catch (e) { console.error('Undo reject failed', e); }
          } });
        } else {
          alert('Failed to reject testimonial: ' + (data && data.error ? data.error : 'Unknown error'));
        }
      } catch (err) {
        console.error('Error rejecting testimonial:', err);
        alert('Error rejecting testimonial: ' + (err.message || err));
      }
    }

    async function unapproveTestimonial(id) {
      if (!confirm('Unapprove this testimonial (move back to pending)?')) return;
      const row = document.querySelector(`[data-testimonial-id="${id}"]`);
      const prevStatus = row?.querySelector('.status-badge')?.textContent || 'approved';
      try {
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        };
        const res = await fetch(`${window.API_URL || '/api'}/testimonials/admin/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status: 'pending', isActive: false })
        });
        const data = await res.json();
        if (data && data.success) {
          updateTestimonialRow(id, data.data);
          showErrorBanner('Testimonial moved to pending', { actionText: 'Undo', actionCallback: async () => {
            try {
              const revRes = await fetch(`${window.API_URL || '/api'}/testimonials/admin/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: prevStatus, isActive: prevStatus === 'approved' })
              });
              const rev = await revRes.json();
              if (rev && rev.success) {
                updateTestimonialRow(id, rev.data);
                if (typeof showToast === 'function') showToast('success', 'Reverted');
              }
            } catch (e) { console.error('Undo unapprove failed', e); }
          } });
        } else {
          alert('Failed to unapprove testimonial: ' + (data && data.error ? data.error : 'Unknown error'));
        }
      } catch (err) {
        console.error('Error unapproving testimonial:', err);
        alert('Error unapproving testimonial: ' + (err.message || err));
      }
    }

    function showTestimonialModal(testimonial = null) {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <h3 class="text-lg font-semibold mb-4">${testimonial ? 'Edit' : 'Add'} Testimonial</h3>
          <form id="testimonialForm">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" id="testimonialName" class="w-full px-3 py-2 border border-gray-300 rounded-md" required value="${testimonial?.name || ''}">
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Review</label>
              <textarea id="testimonialReview" class="w-full px-3 py-2 border border-gray-300 rounded-md" rows="3" required>${testimonial?.review || ''}</textarea>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
              <input type="number" id="testimonialRating" class="w-full px-3 py-2 border border-gray-300 rounded-md" min="1" max="5" value="${testimonial?.rating || 5}">
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select id="testimonialStatus" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="pending" ${testimonial?.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="approved" ${testimonial?.status === 'approved' ? 'selected' : ''}>Approved</option>
                <option value="rejected" ${testimonial?.status === 'rejected' ? 'selected' : ''}>Rejected</option>
              </select>
            </div>
            <div class="flex justify-end space-x-2">
              <button type="button" class="cancelBtn px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
          </form>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const form = modal.querySelector('#testimonialForm');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = modal.querySelector('#testimonialName').value.trim();
        const review = modal.querySelector('#testimonialReview').value.trim();
        const rating = parseInt(modal.querySelector('#testimonialRating').value);
        const status = modal.querySelector('#testimonialStatus').value;
        
        if (!name || !review) {
          alert('Name and review are required');
          return;
        }
        
        try {
          const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
          const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {})
          };
          
          const method = testimonial ? 'PUT' : 'POST';
          const url = testimonial 
            ? `${window.API_URL || '/api'}/testimonials/admin/${testimonial._id}`
            : `${window.API_URL || '/api'}/testimonials/admin`;
          
          const res = await fetch(url, { headers, credentials: 'include', method, body: JSON.stringify({ name, review, rating, status }) });

          const data = await res.json();
          if (data && data.success) {
            document.body.removeChild(modal);
            loadTestimonials();
            if (typeof showToast === 'function') showToast('success', `Testimonial ${testimonial ? 'updated' : 'added'} successfully`);
          } else {
            alert('Failed to save testimonial: ' + (data.error || 'Unknown error'));
          }
        } catch (err) {
          console.error('Error saving testimonial:', err);
          alert('Error saving testimonial: ' + (err.message || err));
        }
      });
      
      modal.querySelector('.cancelBtn').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }

    async function editTestimonial(id) {
      try {
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch(`${window.API_URL || '/api'}/testimonials/admin/all`, { headers });
        const data = await res.json();
        if (data && data.success) {
          const testimonial = data.data.find(t => t._id === id);
          if (testimonial) {
            showTestimonialModal(testimonial);
          }
        }
      } catch (err) {
        console.error('Error fetching testimonial for edit:', err);
      }
    }

    async function deleteTestimonial(id) {
      if (!confirm('Are you sure you want to delete this testimonial?')) return;
      
      try {
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await fetch(`${window.API_URL || '/api'}/testimonials/admin/${id}`, {
          method: 'DELETE',
          headers
        });
        
        const data = await res.json();
        if (data && data.success) {
          loadTestimonials();
          if (typeof showToast === 'function') showToast('success', 'Testimonial deleted successfully');
        } else {
          alert('Failed to delete testimonial: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error deleting testimonial:', err);
        alert('Error deleting testimonial: ' + (err.message || err));
      }
    }

    // Expose testimonials functions
    try {
      window.loadTestimonials = loadTestimonials;
    } catch (e) {/* ignore */}
    
    function loadScript(src){
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script'); s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error('Failed to load '+src)); document.head.appendChild(s);
      });
    }

    // Keep a weak map of canvas -> Chart instance so we can destroy prior instances
    const _charts = new WeakMap();

    function createChart(ctx, type, data, options) {
      if (!window.Chart) return null;
      try {
        const canvas = (ctx && ctx.canvas) ? ctx.canvas : ctx;
        const prev = _charts.get(canvas);
        if (prev && typeof prev.destroy === 'function') {
          try { prev.destroy(); } catch (e) { /* ignore */ }
          _charts.delete(canvas);
        }
        const chart = new Chart(ctx, { type, data, options: options || {} });
        try { _charts.set(canvas, chart); } catch(e){}
        return chart;
      } catch (e) {
        console.error('createChart error', e);
        return null;
      }
    }

    // Fallback sample data
    const sampleOrders = { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], data:[12,18,9,22,14,26,30] };
    const sampleProducts = { labels:['Electronics','Fashion','Home','Beauty','Sports'], data:[12,8,10,6,5] };

    // try fetch live metrics (safe: will not throw if blocked)
    async function fetchOrdersChartData(){
      try{
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        if (!token) return sampleOrders;
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
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        if (!token) throw new Error('No admin token');
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
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        if (!token) throw new Error('No admin token');
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const res = await safeFetch('/api/admin/orders?limit=1000', { headers }, { silent: true });
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


      // sidebar toggle with AdminLTE collapse state
      const sidebarToggle = document.getElementById('sidebarToggle');
      const sidebar = document.querySelector('.main-sidebar');
      const bodyEl = document.body;
      if (sidebar && sidebarToggle) {
        const collapsed = localStorage.getItem('adminSidebarCollapsed') === '1';
        if (collapsed) bodyEl.classList.add('sidebar-collapse');
        sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
        sidebarToggle.addEventListener('click', () => {
          const isCollapsed = bodyEl.classList.toggle('sidebar-collapse');
          sidebarToggle.setAttribute('aria-expanded', String(!isCollapsed));
          localStorage.setItem('adminSidebarCollapsed', isCollapsed ? '1' : '0');
        });
      }

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
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        if (!token) throw new Error('No admin token');
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
        const token = (typeof getAdminToken === 'function' ? getAdminToken() : (localStorage ? localStorage.getItem('adminToken') : null));
        if (!token) throw new Error('No admin token');
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

    // Attempt to pre-load products on dashboard open (safe no-op if function unavailable)
    try { if (typeof loadProducts === 'function') loadProducts(); } catch(e) { /* ignore */ }

  });
})();
