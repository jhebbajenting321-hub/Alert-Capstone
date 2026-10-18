
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "cityalert-demo.firebaseapp.com",
  databaseURL: "https://cityalert-demo-default-rtdb.firebaseio.com",
  projectId: "cityalert-demo",
  storageBucket: "cityalert-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase App & Realtime Database instance
let db = null;
let reportsRef = null;

try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    reportsRef = db.ref('reports');
  }
} catch (e) {
  console.warn("Firebase config error or not fully populated. Falling back to local state until valid keys are provided.", e);
}

// System State
let isAdminLoggedIn = false;
let notifications = [];
let reportsMap = {}; // Key-value store for cloud reports { firebaseKey: reportObj }
let initialLoadComplete = false;

// DOM Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  if (reportsRef) {
    // Realtime Listener for Firebase Cloud Database Sync
    reportsRef.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      
      // Check for incoming new reports to trigger Admin notifications
      if (initialLoadComplete && isAdminLoggedIn) {
        Object.keys(data).forEach(key => {
          if (!reportsMap[key]) {
            const newRep = data[key];
            const newNotif = {
              id: Date.now(),
              message: `New report by ${newRep.name}: ${newRep.category}`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: false
            };
            notifications.unshift(newNotif);
            renderNotifications();
          }
        });
      }

      reportsMap = data;
      initialLoadComplete = true;

      updateStats();
      renderUserSubmissions();
      if (isAdminLoggedIn) renderAdminTable();
    });
  } else {
    updateStats();
    renderUserSubmissions();
  }
});

// Modal Controls
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

// Admin Authentication (admin / admin123)
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

// Toggle View Modes
function toggleViewMode() {
  const publicNav = document.getElementById('public-nav');
  const adminNav = document.getElementById('admin-nav');
  const publicView = document.getElementById('public-view-container');
  const adminView = document.getElementById('admin-view-container');

  if (isAdminLoggedIn) {
    if (publicNav) publicNav.classList.add('hidden');
    if (publicView) publicView.classList.add('hidden');

    if (adminNav) {
      adminNav.classList.remove('hidden');
      adminNav.classList.add('flex');
    }
    if (adminView) adminView.classList.remove('hidden');

    renderAdminTable();
    updateStats();
  } else {
    if (publicNav) publicNav.classList.remove('hidden');
    if (publicView) publicView.classList.remove('hidden');

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

function logoutAdmin() {
  isAdminLoggedIn = false;
  toggleViewMode();
}

// Public Submission Handler (Writes directly to Firebase Cloud)
function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('reporter-name').value;
  const category = document.getElementById('hazard-category').value;
  const location = document.getElementById('hazard-location').value;
  const desc = document.getElementById('hazard-desc').value;

  const newReport = {
    name,
    category,
    location,
    desc,
    status: 'Pending',
    date: new Date().toLocaleDateString(),
    timestamp: Date.now()
  };

  if (reportsRef) {
    // Push report to cloud database
    reportsRef.push(newReport).then(() => {
      document.getElementById('hazard-form').reset();
      alert('Thank you! Your report has been posted live to the city cloud database.');
    }).catch(err => {
      alert('Firebase Cloud write error: ' + err.message);
    });
  } else {
    // Local fallback
    const key = 'local_' + Date.now();
    reportsMap[key] = newReport;
    document.getElementById('hazard-form').reset();
    updateStats();
    renderUserSubmissions();
    alert('Report saved locally.');
  }
}

// Convert Map Object to Array
function getReportsArray() {
  return Object.keys(reportsMap).map(key => ({
    key,
    ...reportsMap[key]
  })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

// Update Dashboard Counters
function updateStats() {
  const reportsList = getReportsArray();
  const total = reportsList.length;
  const pending = reportsList.filter(r => r.status === 'Pending').length;
  const resolved = reportsList.filter(r => r.status === 'Resolved').length;

  const totalEl = document.getElementById('stat-total');
  const pendingEl = document.getElementById('stat-pending');
  const resolvedEl = document.getElementById('stat-resolved');

  if (totalEl) totalEl.innerText = total;
  if (pendingEl) pendingEl.innerText = pending;
  if (resolvedEl) resolvedEl.innerText = resolved;

  const adminTotalEl = document.getElementById('admin-stat-total');
  const adminPendingEl = document.getElementById('admin-stat-pending');
  const adminResolvedEl = document.getElementById('admin-stat-resolved');

  if (adminTotalEl) adminTotalEl.innerText = total;
  if (adminPendingEl) adminPendingEl.innerText = pending;
  if (adminResolvedEl) adminResolvedEl.innerText = resolved;
}

// Render Public Live Table
function renderUserSubmissions() {
  const tbody = document.getElementById('user-table-body');
  const countBadge = document.getElementById('user-report-count');
  const reportsList = getReportsArray();

  if (!tbody) return;

  if (reportsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">No active hazard reports submitted yet.</td></tr>`;
    if (countBadge) countBadge.innerText = '0 Reports Active';
    return;
  }

  if (countBadge) countBadge.innerText = `${reportsList.length} Reports Active`;

  tbody.innerHTML = reportsList.map(r => `
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

// Render Administrator Database Table
function renderAdminTable() {
  const tbody = document.getElementById('admin-table-body');
  const reportsList = getReportsArray();

  if (!tbody) return;

  if (reportsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500">No reports in cloud database.</td></tr>`;
    return;
  }

  tbody.innerHTML = reportsList.map(r => `
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
          <button onclick="resolveReport('${r.key}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[10px] font-semibold transition">
            Resolve
          </button>
        ` : ''}
        <button onclick="deleteReport('${r.key}')" class="bg-red-600/80 hover:bg-red-500 text-white px-2.5 py-1 rounded text-[10px] font-semibold transition">
          Delete
        </button>
      </td>
    </tr>
  `).join('');
}

// Resolve Report in Firebase Cloud
function resolveReport(key) {
  if (reportsRef && key) {
    reportsRef.child(key).update({ status: 'Resolved' });
  } else if (reportsMap[key]) {
    reportsMap[key].status = 'Resolved';
    updateStats();
    renderAdminTable();
  }
}

// Delete Report from Firebase Cloud
function deleteReport(key) {
  if (reportsRef && key) {
    reportsRef.child(key).remove();
  } else if (reportsMap[key]) {
    delete reportsMap[key];
    updateStats();
    renderAdminTable();
  }
}

// Notifications Logic
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