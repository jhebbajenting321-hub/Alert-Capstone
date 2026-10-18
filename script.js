// ==========================================
// FIREBASE CONFIGURATION (Project: city-alert-123)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyB-mquyQjD862qE20iK078xk0-5iLv40wA",
  authDomain: "city-alert-123.firebaseapp.com",
  databaseURL: "https://city-alert-123-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "city-alert-123",
  storageBucket: "city-alert-123.firebasestorage.app",
  messagingSenderId: "88853751811",
  appId: "1:88853751811:web:96a3282dcf2e7a5eb0636",
  measurementId: "G-N7BG5BWQGZ"
};

// Initialize Firebase
let db = null;
let reportsRef = null;

try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    reportsRef = db.ref('reports');
  }
} catch (e) {
  console.warn("Firebase initialization error:", e);
}

// System State
let isAdminLoggedIn = false;
let notifications = [];
let reportsMap = {};
let initialLoadComplete = false;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  if (reportsRef) {
    // Realtime Listener for Cross-Device Cloud Syncing
    reportsRef.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      
      if (initialLoadComplete && isAdminLoggedIn) {
        Object.keys(data).forEach(key => {
          if (!reportsMap[key]) {
            const newRep = data[key];
            const newNotif = {
              id: Date.now(),
              message: `New report in ${newRep.location}: ${newRep.category}`,
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
    publicNav.classList.add('hidden');
    publicView.classList.add('hidden');
    adminNav.classList.remove('hidden');
    adminNav.classList.add('flex');
    adminView.classList.remove('hidden');
    renderAdminTable();
    updateStats();
  } else {
    publicNav.classList.remove('hidden');
    publicView.classList.remove('hidden');
    adminNav.classList.add('hidden');
    adminNav.classList.remove('flex');
    adminView.classList.add('hidden');
    document.getElementById('notif-dropdown').classList.add('hidden');
    renderUserSubmissions();
    updateStats();
  }
}

function logoutAdmin() {
  isAdminLoggedIn = false;
  toggleViewMode();
}

// Public Submission Handler (Writes to Firebase Cloud)
function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Submitting...';

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
    reportsRef.push(newReport).then(() => {
      document.getElementById('hazard-form').reset();
      submitBtn.disabled = false;
      submitBtn.innerText = 'Submit Hazard Report';
      alert('Salamat! Your report has been submitted to General Santos City safety monitor.');
    }).catch(err => {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Submit Hazard Report';
      alert('Error: ' + err.message);
    });
  } else {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Submit Hazard Report';
    alert('Database connection not established.');
  }
}

// Convert Map to Sorted Array
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

  document.getElementById('stat-total').innerText = total;
  document.getElementById('stat-pending').innerText = pending;
  document.getElementById('stat-resolved').innerText = resolved;

  const adminTotal = document.getElementById('admin-stat-total');
  if (adminTotal) {
    adminTotal.innerText = total;
    document.getElementById('admin-stat-pending').innerText = pending;
    document.getElementById('admin-stat-resolved').innerText = resolved;
  }
}

// Render Public Live Feed
function renderUserSubmissions() {
  const tbody = document.getElementById('user-table-body');
  const countBadge = document.getElementById('user-report-count');
  const reportsList = getReportsArray();

  if (!tbody) return;

  countBadge.innerText = `${reportsList.length} Active Reports`;

  if (reportsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">No active hazard reports submitted in General Santos City yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = reportsList.map(r => `
    <tr class="hover:bg-slate-50/80 transition">
      <td class="p-3 font-semibold text-slate-800">${r.category}</td>
      <td class="p-3 font-medium text-blue-700">${r.location}</td>
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

// Render Admin Table
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
      <td class="p-3 text-blue-400 font-medium">${r.location}</td>
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

function resolveReport(key) {
  if (reportsRef && key) {
    reportsRef.child(key).update({ status: 'Resolved' });
  }
}

function deleteReport(key) {
  if (reportsRef && key) {
    reportsRef.child(key).remove();
  }
}

// Notifications
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