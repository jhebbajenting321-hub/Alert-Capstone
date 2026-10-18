let isAdminLoggedIn = false;
let autoRefreshTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  loadPublicData();
  
  // Auto refresh data every 5 seconds
  autoRefreshTimer = setInterval(() => {
    if (isAdminLoggedIn) {
      loadAdminData();
    } else {
      loadPublicData();
    }
  }, 5000);
});

// Fetch Public Feed and Stats from PHP
function loadPublicData() {
  fetch('api.php?action=get_public_feed')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        updateStats(data.stats);
        renderPublicTable(data.reports);
      }
    })
    .catch(err => console.error("Error loading public data:", err));
}

// Fetch Admin Data & Notifications from PHP
function loadAdminData() {
  fetch('api.php?action=get_admin_data')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        renderAdminTable(data.reports);
        renderNotifications(data.notifications);
        
        // Recalculate stats
        const total = data.reports.length;
        const pending = data.reports.filter(r => r.status === 'Pending').length;
        const resolved = data.reports.filter(r => r.status === 'Resolved').length;
        updateStats({ total, pending, resolved });
      }
    })
    .catch(err => console.error("Error loading admin data:", err));
}

// Public Form Submission
function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('reporter-name').value;
  const category = document.getElementById('hazard-category').value;
  const location = document.getElementById('hazard-location').value;
  const desc = document.getElementById('hazard-desc').value;

  fetch('api.php?action=submit_report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category, location, desc })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      document.getElementById('hazard-form').reset();
      alert('Thank you! Your report has been saved to the database.');
      loadPublicData();
    } else {
      alert(data.message || 'Submission failed.');
    }
  })
  .catch(err => alert('Network error: ' + err.message));
}

// Modal Control
function openLoginModal() {
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('login-modal').classList.add('flex');
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('login-modal').classList.remove('flex');
  document.getElementById('login-error').classList.add('hidden');
}

// Admin Login
function handleAdminLogin(e) {
  e.preventDefault();
  const user = document.getElementById('admin-user').value;
  const pass = document.getElementById('admin-pass').value;

  fetch('api.php?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, pass })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      isAdminLoggedIn = true;
      closeLoginModal();
      toggleViewMode();
    } else {
      document.getElementById('login-error').classList.remove('hidden');
    }
  });
}

// Toggle Views
function toggleViewMode() {
  const publicNav = document.getElementById('public-nav');
  const adminNav = document.getElementById('admin-nav');
  const publicView = document.getElementById('public-view-container');
  const adminView = document.getElementById('admin-view-container');

  if (isAdminLoggedIn) {
    publicNav.classList.add('hidden');
    publicView.classList.add('hidden');
    adminNav.classList.remove('hidden');
    adminNav.classList.add('flex');
    adminView.classList.remove('hidden');
    loadAdminData();
  } else {
    publicNav.classList.remove('hidden');
    publicView.classList.remove('hidden');
    adminNav.classList.add('hidden');
    adminNav.classList.remove('flex');
    adminView.classList.add('hidden');
    loadPublicData();
  }
}

function logoutAdmin() {
  fetch('api.php?action=logout')
    .then(() => {
      isAdminLoggedIn = false;
      toggleViewMode();
    });
}

// Render Public Stats & Feed
function updateStats(stats) {
  document.getElementById('stat-total').innerText = stats.total || 0;
  document.getElementById('stat-pending').innerText = stats.pending || 0;
  document.getElementById('stat-resolved').innerText = stats.resolved || 0;

  const adminTotal = document.getElementById('admin-stat-total');
  if (adminTotal) {
    adminTotal.innerText = stats.total || 0;
    document.getElementById('admin-stat-pending').innerText = stats.pending || 0;
    document.getElementById('admin-stat-resolved').innerText = stats.resolved || 0;
  }
}

function renderPublicTable(reports) {
  const tbody = document.getElementById('user-table-body');
  const badge = document.getElementById('user-report-count');

  badge.innerText = `${reports.length} Reports`;

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">No hazard reports submitted yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => `
    <tr class="hover:bg-slate-50/80 transition">
      <td class="p-3 font-semibold text-slate-800">${r.category}</td>
      <td class="p-3">${r.location}</td>
      <td class="p-3 text-slate-500 max-w-xs truncate">${r.description}</td>
      <td class="p-3 text-slate-400">${r.date}</td>
      <td class="p-3 text-right">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
          r.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
        }">
          <span class="w-1.5 h-1.5 rounded-full ${r.status === 'Resolved' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
          ${r.status}
        </span>
      </td>
    </tr>
  `).join('');
}

// Render Admin Control Table
function renderAdminTable(reports) {
  const tbody = document.getElementById('admin-table-body');

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500">No reports in database.</td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => `
    <tr class="hover:bg-slate-800/50 transition">
      <td class="p-3 font-semibold text-white">${r.name}</td>
      <td class="p-3 text-slate-300">${r.category}</td>
      <td class="p-3 text-slate-300">${r.location}</td>
      <td class="p-3 text-slate-400 max-w-xs truncate">${r.desc}</td>
      <td class="p-3 text-slate-400">${r.date}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 text-[10px] rounded-full font-semibold ${
          r.status === 'Resolved' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-amber-900/60 text-amber-300 border border-amber-700'
        }">
          ${r.status}
        </span>
      </td>
      <td class="p-3 text-right space-x-1.5">
        ${r.status === 'Pending' ? `
          <button onclick="resolveReport(${r.id})" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[10px] font-semibold transition">
            Resolve
          </button>
        ` : ''}
        <button onclick="deleteReport(${r.id})" class="bg-red-600/80 hover:bg-red-500 text-white px-2.5 py-1 rounded text-[10px] font-semibold transition">
          Delete
        </button>
      </td>
    </tr>
  `).join('');
}

function resolveReport(id) {
  fetch('api.php?action=resolve_report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  }).then(() => loadAdminData());
}

function deleteReport(id) {
  fetch('api.php?action=delete_report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  }).then(() => loadAdminData());
}

// Notifications
function renderNotifications(notifs) {
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');

  if (notifs.length > 0) {
    badge.innerText = notifs.length;
    badge.classList.remove('hidden');
    list.innerHTML = notifs.map(n => `
      <div class="p-3 text-xs bg-blue-50/60 hover:bg-slate-50 transition">
        <p class="font-semibold text-slate-800 mb-1">New report by ${n.reporter_name}: ${n.category}</p>
        <span class="text-[10px] text-slate-400">${n.time}</span>
      </div>
    `).join('');
  } else {
    badge.classList.add('hidden');
    list.innerHTML = `<p class="p-4 text-xs text-slate-400 text-center">No new notifications</p>`;
  }
}

function toggleNotifications() {
  document.getElementById('notif-dropdown').classList.toggle('hidden');
}

function clearNotifications() {
  fetch('api.php?action=clear_notifs', { method: 'POST' })
    .then(() => loadAdminData());
}