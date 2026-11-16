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
let currentPhotoBase64 = "";

// Leaflet Map Instances (Centered on General Santos City)
const GENSAN_COORDS = [6.1164, 125.1716];
let publicMap = null;
let publicMarkersLayer = null;
let pickerMap = null;
let pickerMarker = null;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  initMaps();

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
              message: `New report in Brgy. ${newRep.barangay || 'GenSan'} (${newRep.location}): ${newRep.category}`,
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
      updatePublicMapMarkers();
      if (isAdminLoggedIn) renderAdminTable();
    });
  } else {
    updateStats();
    renderUserSubmissions();
  }
});

// ==========================================
// LEAFLET GIS MAP INTEGRATION
// ==========================================
function initMaps() {
  if (typeof L === 'undefined') return;

  // 1. Live Public Hazard Map
  const publicMapEl = document.getElementById('public-map');
  if (publicMapEl) {
    publicMap = L.map('public-map').setView(GENSAN_COORDS, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | CityAlert GenSan'
    }).addTo(publicMap);
    publicMarkersLayer = L.layerGroup().addTo(publicMap);
  }

  // 2. Form Coordinate Picker Map
  const pickerMapEl = document.getElementById('picker-map');
  if (pickerMapEl) {
    pickerMap = L.map('picker-map').setView(GENSAN_COORDS, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(pickerMap);

    pickerMarker = L.marker(GENSAN_COORDS, { draggable: true }).addTo(pickerMap);

    pickerMarker.on('dragend', function (e) {
      const pos = e.target.getLatLng();
      setPickerCoordinates(pos.lat, pos.lng);
    });

    pickerMap.on('click', function (e) {
      pickerMarker.setLatLng(e.latlng);
      setPickerCoordinates(e.latlng.lat, e.latlng.lng);
    });
  }
}

function setPickerCoordinates(lat, lng) {
  const fixedLat = lat.toFixed(6);
  const fixedLng = lng.toFixed(6);
  document.getElementById('hazard-lat').value = fixedLat;
  document.getElementById('hazard-lng').value = fixedLng;
  document.getElementById('display-lat').innerText = fixedLat;
  document.getElementById('display-lng').innerText = fixedLng;
}

function detectUserGPS() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      setPickerCoordinates(latitude, longitude);
      if (pickerMap && pickerMarker) {
        pickerMap.setView([latitude, longitude], 16);
        pickerMarker.setLatLng([latitude, longitude]);
      }
    },
    () => {
      alert("Unable to retrieve GPS location. You can click directly on the map to pin the hazard.");
    }
  );
}

function updatePublicMapMarkers() {
  if (!publicMap || !publicMarkersLayer) return;
  publicMarkersLayer.clearLayers();

  const reportsList = getReportsArray();
  reportsList.forEach(r => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      const markerColor = r.status === 'Resolved' ? '#10b981' : '#f59e0b';
      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color:${markerColor}; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const popupContent = `
        <div class="text-xs space-y-1 max-w-[200px]">
          <p class="font-bold text-slate-900">${r.category}</p>
          <p class="text-blue-600 font-medium">Brgy. ${r.barangay || 'GenSan'} - ${r.location}</p>
          <p class="text-slate-600">${r.desc}</p>
          ${r.photo ? `<img src="${r.photo}" class="w-full h-20 object-cover rounded mt-1 border" />` : ''}
          <p class="pt-1 font-semibold ${r.status === 'Resolved' ? 'text-emerald-600' : 'text-amber-600'}">Status: ${r.status}</p>
        </div>
      `;

      L.marker([lat, lng], { icon: customIcon })
        .bindPopup(popupContent)
        .addTo(publicMarkersLayer);
    }
  });
}

// ==========================================
// PHOTO UPLOAD & COMPRESSION HANDLER
// ==========================================
function previewPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      // Compress image via canvas so it stores cleanly in Firebase RTDB
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 600;
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
      canvas.height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);

      document.getElementById('photo-preview').src = currentPhotoBase64;
      document.getElementById('photo-preview-container').classList.remove('hidden');
      document.getElementById('remove-photo-btn').classList.remove('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearPhoto() {
  currentPhotoBase64 = "";
  document.getElementById('hazard-photo').value = "";
  document.getElementById('photo-preview').src = "";
  document.getElementById('photo-preview-container').classList.add('hidden');
  document.getElementById('remove-photo-btn').classList.add('hidden');
}

function openImageModal(src) {
  if (!src) return;
  document.getElementById('modal-full-img').src = src;
  document.getElementById('image-modal').classList.remove('hidden');
  document.getElementById('image-modal').classList.add('flex');
}

function closeImageModal() {
  document.getElementById('image-modal').classList.add('hidden');
  document.getElementById('image-modal').classList.remove('flex');
}

// ==========================================
// MODAL & ADMIN AUTHENTICATION
// ==========================================
function openLoginModal() {
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('login-modal').classList.add('flex');
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('login-modal').classList.remove('flex');
  document.getElementById('login-error').classList.add('hidden');
}

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
    if (publicMap) setTimeout(() => publicMap.invalidateSize(), 200);
  }
}

function logoutAdmin() {
  isAdminLoggedIn = false;
  toggleViewMode();
}

// ==========================================
// PUBLIC SUBMISSION HANDLER
// ==========================================
function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Submitting...';

  const name = document.getElementById('reporter-name').value;
  const category = document.getElementById('hazard-category').value;
  const barangay = document.getElementById('hazard-barangay').value;
  const location = document.getElementById('hazard-location').value;
  const desc = document.getElementById('hazard-desc').value;
  const lat = document.getElementById('hazard-lat').value;
  const lng = document.getElementById('hazard-lng').value;

  const newReport = {
    name,
    category,
    barangay,
    location,
    desc,
    lat,
    lng,
    photo: currentPhotoBase64 || null,
    status: 'Pending',
    date: new Date().toLocaleDateString(),
    timestamp: Date.now()
  };

  if (reportsRef) {
    reportsRef.push(newReport).then(() => {
      document.getElementById('hazard-form').reset();
      clearPhoto();
      setPickerCoordinates(GENSAN_COORDS[0], GENSAN_COORDS[1]);
      if (pickerMap && pickerMarker) {
        pickerMap.setView(GENSAN_COORDS, 14);
        pickerMarker.setLatLng(GENSAN_COORDS);
      }
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

// ==========================================
// DATA RENDERING & DASHBOARD UPDATES
// ==========================================
function getReportsArray() {
  return Object.keys(reportsMap).map(key => ({
    key,
    ...reportsMap[key]
  })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

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

function renderUserSubmissions() {
  const tbody = document.getElementById('user-table-body');
  const countBadge = document.getElementById('user-report-count');
  const filterVal = document.getElementById('feed-status-filter')?.value || 'ALL';
  
  let reportsList = getReportsArray();
  if (filterVal !== 'ALL') {
    reportsList = reportsList.filter(r => r.status === filterVal);
  }

  if (!tbody) return;

  countBadge.innerText = `${reportsList.length} Reports`;

  if (reportsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">No hazard reports matching the current filter in General Santos City.</td></tr>`;
    return;
  }

  tbody.innerHTML = reportsList.map(r => `
    <tr class="hover:bg-slate-50/80 transition">
      <td class="p-3">
        ${r.photo 
          ? `<img src="${r.photo}" onclick="openImageModal('${r.photo}')" alt="Hazard" class="w-10 h-10 object-cover rounded-md border border-slate-200 cursor-pointer hover:opacity-80 transition">`
          : `<div class="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">No img</div>`
        }
      </td>
      <td class="p-3 font-semibold text-slate-800">${r.category}</td>
      <td class="p-3">
        <span class="block font-bold text-blue-700">${r.barangay ? `Brgy. ${r.barangay}` : 'General Santos'}</span>
        <span class="text-slate-500 text-[11px]">${r.location}</span>
      </td>
      <td class="p-3 text-slate-500 max-w-xs truncate" title="${r.desc}">${r.desc}</td>
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

function renderAdminTable() {
  const tbody = document.getElementById('admin-table-body');
  const reportsList = getReportsArray();

  if (!tbody) return;

  if (reportsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-500">No reports in cloud database.</td></tr>`;
    return;
  }

  tbody.innerHTML = reportsList.map(r => `
    <tr class="hover:bg-slate-800/50 transition">
      <td class="p-3">
        ${r.photo 
          ? `<img src="${r.photo}" onclick="openImageModal('${r.photo}')" alt="Hazard" class="w-10 h-10 object-cover rounded-md border border-slate-700 cursor-pointer hover:opacity-80 transition">`
          : `<div class="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-[10px]">None</div>`
        }
      </td>
      <td class="p-3 font-semibold text-white">${r.name}</td>
      <td class="p-3 text-slate-300">${r.category}</td>
      <td class="p-3">
        <span class="block text-blue-400 font-semibold">${r.barangay ? `Brgy. ${r.barangay}` : 'GenSan'}</span>
        <span class="text-slate-400 text-[11px]">${r.location}</span>
      </td>
      <td class="p-3 text-slate-400 max-w-xs truncate" title="${r.desc}">${r.desc}</td>
      <td class="p-3 text-slate-400">${r.date || 'Today'}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 text-[10px] rounded-full font-semibold ${
          r.status === 'Resolved' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-amber-900/60 text-amber-300 border border-amber-700'
        }">
          ${r.status}
        </span>
      </td>
      <td class="p-3 text-right space-x-1.5 whitespace-nowrap">
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

// ==========================================
// NOTIFICATIONS
// ==========================================
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