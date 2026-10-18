// System State
let isAdminLoggedIn = false;
let notifications = [];
let reports = [
  { id: 1, name: 'John Doe', category: 'Road Damage / Pothole', location: 'Main St. cor. 5th Ave', desc: 'Large pothole near crosswalk', status: 'Resolved' }
];

// Execute Safely After DOM Loads
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  updateStats();
});

// Modal Control
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

// Authenticate Admin
function handleAdminLogin(e) {
  e.preventDefault();
  const user = document.getElementById('admin-user').value;
  const pass = document.getElementById('admin-pass').value;

  // Default Credentials: admin / admin123
  if (user === 'admin' && pass === 'admin123') {
    isAdminLoggedIn = true;
    closeLoginModal();
    updateAdminViewUI();
  } else {
    document.getElementById('login-error').classList.remove('hidden');
  }
}

// Toggle Admin Interface Elements
function updateAdminViewUI() {
  const publicTrigger = document.getElementById('public-admin-trigger');
  const adminNotif = document.getElementById('admin-notif-container');
  const adminBadge = document.getElementById('admin-badge');
  const adminPanel = document.getElementById('admin-panel');

  if (isAdminLoggedIn) {
    if (publicTrigger) publicTrigger.classList.add('hidden');
    if (adminNotif) adminNotif.classList.remove('hidden');
    if (adminBadge) {
      adminBadge.classList.remove('hidden');
      adminBadge.classList.add('flex');
    }
    if (adminPanel) adminPanel.classList.remove('hidden');
    renderAdminTable();
  } else {
    if (publicTrigger) publicTrigger.classList.remove('hidden');
    if (adminNotif) adminNotif.classList.add('hidden');
    if (adminBadge) adminBadge.classList.add('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }
}

// Logout Admin
function logoutAdmin() {
  isAdminLoggedIn = false;
  updateAdminViewUI();
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
    status: 'Pending'
  };

  reports.push(newReport);

  // Generate Admin Notification
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
  renderNotifications();
  if (isAdminLoggedIn) renderAdminTable();

  alert('Thank you! Your hazard report has been submitted to city authorities.');
}

// Update Dashboard Statistics
function updateStats() {
  const total = reports.length;
  const pending = reports.filter(r => r.status === 'Pending').length;
  const resolved = reports.filter(r => r.status === 'Resolved').length;

  const totalEl = document.getElementById('stat-total');
  const pendingEl = document.getElementById('stat-pending');
  const resolvedEl = document.getElementById('stat-resolved');

  if (totalEl) totalEl.innerText = total;
  if (pendingEl) pendingEl.innerText = pending;
  if (resolvedEl) resolvedEl.innerText = resolved;
}

// Toggle Notification Menu
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

// Render Notifications
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

// Render Admin Data Table
function renderAdminTable() {
  const tbody = document.getElementById('admin-table-body');
  if (!tbody) return;

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">No reports logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => `
    <tr class="hover:bg-slate-800/50 transition">
      <td class="p-3 font-semibold text-white">${r.name}</td>
      <td class="p-3 text-slate-300">${r.category}</td>
      <td class="p-3 text-slate-300">${r.location}</td>
      <td class="p-3 text-slate-400 max-w-xs truncate">${r.desc}</td>
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
    updateStats();
    renderAdminTable();
  }
}

function deleteReport(id) {
  reports = reports.filter(r => r.id !== id);
  updateStats();
  renderAdminTable();
}