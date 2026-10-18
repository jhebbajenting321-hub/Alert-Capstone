// System State
let isAdminLoggedIn = false;
let notifications = [];

// Default Initial Reports
const defaultReports = [
  { id: 101, name: 'Sample Citizen', category: 'Road Damage / Pothole', location: 'Main St. cor. 5th Ave', desc: 'Large pothole near crosswalk', status: 'Resolved', date: '10/18/2026' }
];

// Load persisted reports or use default
let reports = JSON.parse(localStorage.getItem('cityalert_reports')) || defaultReports;

// Safe Initialization on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  updateStats();
  renderUserSubmissions();
});

// Save to LocalStorage
function saveReports() {
  localStorage.setItem('cityalert_reports', JSON.stringify(reports));
}

// Login Modal Controls
function openLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  const errorMsg = document.getElementById('login-error');
  if (errorMsg) errorMsg.classList.add('hidden');
}

// Authenticate Administrator (Credentials: admin / admin123)
function handleAdminLogin(e) {
  e.preventDefault();
  const user = document.getElementById('admin-user').value;
  const pass = document.getElementById('admin-pass').value;

  if (user === 'admin' && pass === 'admin123') {
    isAdminLoggedIn = true;
    closeLoginModal();
    toggleViewMode();
  } else {
    document.getElementById('login-error').classList.remove('hidden');
  }
}

// Toggle Between Public View & Exclusive Administrator View
function toggleViewMode() {
  const publicNav = document.getElementById('public-nav');
  const adminNav = document.getElementById('admin-nav');
  const publicView = document.getElementById('public-view-container');
  const adminView = document.getElementById('admin-view-container');

  if (isAdminLoggedIn) {
    // Hide Public Mode Entirely
    if (publicNav) publicNav.classList.add('hidden');
    if (publicView) publicView.classList.add('hidden');

    // Show Administrator Mode Entirely
    if (adminNav) {
      adminNav.classList.remove('hidden');
      adminNav.classList.add('flex');
    }
    if (adminView) adminView.classList.remove('hidden');

    renderAdminTable();
    updateStats();
  } else {
    // Show Public Mode Entirely
    if (publicNav) publicNav.classList.remove('hidden');
    if (publicView) publicView.classList.remove('hidden');

    // Hide Administrator Mode Entirely
    if (adminNav) {
      adminNav.classList.add('hidden');
      adminNav.classList.remove('flex');
    }
    if (adminView) adminView.classList.add('hidden');

    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    renderUserSubmissions();
    updateStats();
  }
}

// Logout Administrator
function logoutAdmin() {
  isAdminLoggedIn = false;
  toggleViewMode();
}

// Public Submission Handler
function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('reporter-name').value;
  const category = document.getElementById('hazard-category').value;
  const location = document.getElementById('hazard-location').value;
  const desc = document.getElementById('hazard-desc').value;

  const newReport = {
    id: Date.now(),
    name,
    category,
    location,
    desc,
    status: 'Pending',
    date: new Date().toLocaleDateString()
  };

  reports.push(newReport);
  saveReports();

  // Create Admin Notification
  const newNotif = {
    id: Date.now(),
    message: `New report by ${name}: ${category}`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: false
  };
  notifications.unshift(newNotif);

  // Reset Form
  document.getElementById('hazard-form').reset();

  // Refresh Views
  updateStats();
  renderUserSubmissions();
  renderNotifications();

  alert('Thank you! Your hazard report has been submitted to city authorities.');
}

// Update Statistics (Synchronizes both Public and Admin Counters)
function updateStats() {
  const total = reports.length;
  const pending = reports.filter(r => r.status === 'Pending').length;
  const resolved = reports.filter(r => r.status === 'Resolved').length;

  // Public Stats Elements
  const totalEl = document.getElementById('stat-total');
  const pendingEl = document.getElementById('stat-pending');
  const resolvedEl = document.getElementById('stat-resolved');

  if (totalEl) totalEl.innerText = total;
  if (pendingEl) pendingEl.innerText = pending;
  if (resolvedEl) resolvedEl.innerText = resolved;

  // Admin Stats Elements
  const adminTotalEl = document.getElementById('admin-stat-total');
  const adminPendingEl = document.getElementById('admin-stat-pending');
  const adminResolvedEl = document.getElementById('admin-stat-resolved');

  if (adminTotalEl) adminTotalEl.innerText = total;
  if (adminPendingEl) adminPendingEl.innerText = pending;
  if (adminResolvedEl) adminResolvedEl.innerText = resolved;
}

// Render Public Submissions Table
function renderUserSubmissions() {
  const tbody = document.getElementById('user-table-body');
  const countBadge = document.getElementById('user-report-count');

  if (!tbody) return;

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">You haven't submitted any hazard reports yet.</td></tr>`;
    if (countBadge) countBadge.innerText = '0 Submitted';
    return;
  }

  if (countBadge) countBadge.innerText = `${reports.length} Submitted`;

  tbody.innerHTML = reports.map(r => `
    <tr class="hover:bg-slate-50/80 transition">
      <td class="p-3 font-semibold text-slate-800">${r.category}</td>
      <td class="p-3">${r.location}</td>
      <td class="p-3 text-slate-500 max-w-xs truncate">${r.desc}</td>
      <td class="p-3 text-slate-400">${r.date || 'Today'}</td>
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

// Render Exclusive Admin Table
function renderAdminTable() {
  const tbody = document.getElementById('admin-table-body');
  if (!tbody) return;

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
      <td class="p-3 text-slate-400">${r.date || 'Today'}</td>
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
  const report = reports.find(r => r.id === id);
  if (report) {
    report.status = 'Resolved';
    saveReports();
    updateStats();
    renderAdminTable();
  }
}

function deleteReport(id) {
  reports = reports.filter(r => r.id !== id);
  saveReports();
  updateStats();
  renderAdminTable();
}

// Admin Notifications
function toggleNotifications() {
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      notifications.forEach(n => n.read = true);
      renderNotifications();
    }
  }
}

function renderNotifications() {
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');
  const unreadCount = notifications.filter(n => !n.read).length;

  if (badge) {
    if (unreadCount > 0) {
      badge.innerText = unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  if (list) {
    if (notifications.length === 0) {
      list.innerHTML = `<p class="p-4 text-xs text-slate-400 text-center">No new notifications</p>`;
      return;
    }

    list.innerHTML = notifications.map(n => `
      <div class="p-3 text-xs hover:bg-slate-50 transition ${!n.read ? 'bg-blue-50/60' : ''}">
        <p class="font-semibold text-slate-800 mb-1">${n.message}</p>
        <span class="text-[10px] text-slate-400">${n.time}</span>
      </div>
    `).join('');
  }
}

function clearNotifications() {
  notifications = [];
  renderNotifications();
}