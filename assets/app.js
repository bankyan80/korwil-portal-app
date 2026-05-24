/* ============================================
   PORTAL PENDIDIKAN TIM KERJA KECAMATAN LEMAHABANG
   app.js - Logic Utama Aplikasi
   ============================================ */

// ============================================
// KONFIGURASI
// ============================================
const CONFIG = {
  // Ganti dengan URL Web App Google Apps Script Anda
  API_URL: localStorage.getItem('apiUrl') || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  CACHE_DURATION: 5 * 60 * 1000, // 5 menit
  CACHE_PREFIX: 'pk_',
};

// Firebase Config - Ganti dengan konfigurasi Firebase Anda
let firebaseConfig = {
  apiKey: localStorage.getItem('fbKey') || 'YOUR_API_KEY',
  authDomain: localStorage.getItem('fbProject') ? `${localStorage.getItem('fbProject')}.firebaseapp.com` : 'YOUR_PROJECT.firebaseapp.com',
  projectId: localStorage.getItem('fbProject') || 'YOUR_PROJECT_ID',
};

// ============================================
// STATE
// ============================================
let currentUser = null; // { uid, displayName, email, photoURL, role, id_sekolah, nama_sekolah, organisasi }
let currentPage = 'beranda';
let dbStatus = 'green'; // green, yellow, red

// ============================================
// INISIALISASI
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  loadSession();
  loadPublicData();
  updateBottomNav();
});

function initFirebase() {
  try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
      firebase.initializeApp(firebaseConfig);
    }
  } catch (e) {
    console.warn('Firebase init error:', e.message);
  }
}

function loadSession() {
  const session = localStorage.getItem(CONFIG.CACHE_PREFIX + 'session');
  if (session) {
    try {
      currentUser = JSON.parse(session);
      updateUIForUser();
    } catch (e) {
      localStorage.removeItem(CONFIG.CACHE_PREFIX + 'session');
    }
  }
}

// ============================================
// NAVIGASI
// ============================================
function navigateTo(page) {
  // Halaman yang memerlukan login
  const protectedPages = ['dashboardOperator', 'dashboardAdmin', 'kelolaUser', 'kelolaSekolah', 'pengaturan'];
  const rolePages = {
    dashboardOperator: ['operator', 'admin_organisasi'],
    dashboardAdmin: ['super_admin'],
    kelolaUser: ['super_admin'],
    kelolaSekolah: ['super_admin'],
    pengaturan: ['super_admin'],
  };

  if (protectedPages.includes(page) && !currentUser) {
    navigateTo('login');
    return;
  }

  if (rolePages[page] && currentUser && !rolePages[page].includes(currentUser.role)) {
    showToast('Anda tidak memiliki akses ke halaman ini.', 'error');
    return;
  }

  // Sembunyikan semua halaman
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Mapping page id
  const pageMap = {
    beranda: 'pageBeranda',
    profil: 'pageProfil',
    sekolah: 'pageSekolah',
    berita: 'pageBerita',
    agenda: 'pageAgenda',
    galeri: 'pageGaleri',
    login: 'pageLogin',
    dashboardOperator: 'pageDashboardOperator',
    dashboardAdmin: 'pageDashboardAdmin',
    bup: 'pageBUP',
    spmb: 'pageSPMB',
    alumni: 'pageAlumni',
    arsip: 'pageArsip',
    tugas: 'pageTugas',
    laporan: 'pageLaporan',
    kelolaUser: 'pageKelolaUser',
    kelolaSekolah: 'pageKelolaSekolah',
    pengaturan: 'pagePengaturan',
  };

  const elId = pageMap[page] || 'pageBeranda';
  const el = document.getElementById(elId);
  if (el) {
    el.classList.add('active');
  }

  currentPage = page;
  closeDrawer();
  updateBottomNav();

  // Load data sesuai halaman
  loadPageData(page);

  window.scrollTo(0, 0);
}

function navigateToDashboard() {
  if (!currentUser) {
    navigateTo('login');
    return;
  }
  if (currentUser.role === 'super_admin') {
    navigateTo('dashboardAdmin');
  } else {
    navigateTo('dashboardOperator');
  }
}

function navigateToInformasi() {
  // Tampilkan modal informasi lainnya
  showModal(`
    <div class="modal-header">
      <h3>&#128218; Informasi Lainnya</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="shortcut-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="shortcut-item" onclick="closeModal();navigateTo('bup')">
        <div class="shortcut-icon" style="background:var(--danger-light);color:var(--danger);">&#128100;</div>
        <span class="shortcut-label">BUP</span>
      </div>
      <div class="shortcut-item" onclick="closeModal();navigateTo('spmb')">
        <div class="shortcut-icon" style="background:var(--info-light);color:var(--info);">&#128221;</div>
        <span class="shortcut-label">SPMB</span>
      </div>
      <div class="shortcut-item" onclick="closeModal();navigateTo('alumni')">
        <div class="shortcut-icon" style="background:var(--success-light);color:var(--success);">&#127891;</div>
        <span class="shortcut-label">Alumni</span>
      </div>
      <div class="shortcut-item" onclick="closeModal();navigateTo('arsip')">
        <div class="shortcut-icon" style="background:var(--accent-light);color:var(--accent);">&#128193;</div>
        <span class="shortcut-label">Arsip</span>
      </div>
      <div class="shortcut-item" onclick="closeModal();navigateTo('sekolah')">
        <div class="shortcut-icon">&#127979;</div>
        <span class="shortcut-label">Data Sekolah</span>
      </div>
      <div class="shortcut-item" onclick="closeModal();navigateTo('profil')">
        <div class="shortcut-icon" style="background:var(--warning-light);color:var(--warning);">&#128220;</div>
        <span class="shortcut-label">Profil</span>
      </div>
    </div>
  `);
}

function updateBottomNav() {
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    const page = item.dataset.page;
    if (
      (page === 'beranda' && currentPage === 'beranda') ||
      (page === 'informasi' && ['bup', 'spmb', 'alumni', 'arsip', 'sekolah', 'profil'].includes(currentPage)) ||
      (page === 'dashboard' && ['dashboardOperator', 'dashboardAdmin'].includes(currentPage)) ||
      (page === 'tugas' && currentPage === 'tugas') ||
      (page === 'login' && currentPage === 'login')
    ) {
      item.classList.add('active');
    }
  });

  // Update login button text
  const loginBtn = document.querySelector('.bottom-nav .nav-item[data-page="login"]');
  if (loginBtn) {
    if (currentUser) {
      loginBtn.querySelector('span:last-child').textContent = 'Akun';
      loginBtn.querySelector('.nav-icon').innerHTML = '&#128100;';
    } else {
      loginBtn.querySelector('span:last-child').textContent = 'Login';
      loginBtn.querySelector('.nav-icon').innerHTML = '&#128274;';
    }
  }
}

// ============================================
// DRAWER
// ============================================
function toggleDrawer() {
  document.getElementById('drawerOverlay').classList.toggle('open');
  document.getElementById('sideDrawer').classList.toggle('open');
  buildDrawerMenu();
}

function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('open');
  document.getElementById('sideDrawer').classList.remove('open');
}

function buildDrawerMenu() {
  const menu = document.getElementById('drawerMenu');
  let items = '';

  // Menu publik
  items += `
    <li><a href="#" onclick="navigateTo('beranda')"><span class="menu-icon">&#127968;</span> Beranda</a></li>
    <li><a href="#" onclick="navigateTo('profil')"><span class="menu-icon">&#128220;</span> Profil</a></li>
    <li><a href="#" onclick="navigateTo('sekolah')"><span class="menu-icon">&#127979;</span> Data Sekolah</a></li>
    <li><a href="#" onclick="navigateTo('berita')"><span class="menu-icon">&#128240;</span> Berita</a></li>
    <li><a href="#" onclick="navigateTo('agenda')"><span class="menu-icon">&#128197;</span> Agenda</a></li>
    <li><a href="#" onclick="navigateTo('galeri')"><span class="menu-icon">&#128247;</span> Galeri</a></li>
    <li><div class="menu-divider"></div></li>
    <li><a href="#" onclick="navigateTo('bup')"><span class="menu-icon">&#128100;</span> BUP</a></li>
    <li><a href="#" onclick="navigateTo('spmb')"><span class="menu-icon">&#128221;</span> SPMB</a></li>
    <li><a href="#" onclick="navigateTo('alumni')"><span class="menu-icon">&#127891;</span> Alumni</a></li>
    <li><a href="#" onclick="navigateTo('arsip')"><span class="menu-icon">&#128193;</span> Arsip Pegawai</a></li>
    <li><a href="#" onclick="navigateTo('tugas')"><span class="menu-icon">&#128203;</span> Tugas Operator</a></li>
  `;

  if (currentUser) {
    items += `<li><div class="menu-divider"></div></li>`;
    if (currentUser.role === 'super_admin') {
      items += `
        <li><a href="#" onclick="navigateTo('dashboardAdmin')"><span class="menu-icon">&#128202;</span> Dashboard Admin</a></li>
        <li><a href="#" onclick="navigateTo('kelolaUser')"><span class="menu-icon">&#128100;</span> Kelola User</a></li>
        <li><a href="#" onclick="navigateTo('kelolaSekolah')"><span class="menu-icon">&#127979;</span> Kelola Sekolah</a></li>
        <li><a href="#" onclick="navigateTo('laporan')"><span class="menu-icon">&#128196;</span> Rekap Laporan</a></li>
        <li><a href="#" onclick="navigateTo('pengaturan')"><span class="menu-icon">&#9881;</span> Pengaturan</a></li>
      `;
    } else {
      items += `
        <li><a href="#" onclick="navigateTo('dashboardOperator')"><span class="menu-icon">&#128202;</span> Dashboard</a></li>
        <li><a href="#" onclick="navigateTo('laporan')"><span class="menu-icon">&#128196;</span> Isi Laporan</a></li>
      `;
    }
    items += `
      <li><div class="menu-divider"></div></li>
      <li><button onclick="logout()"><span class="menu-icon" style="color:var(--danger);">&#128682;</span> <span style="color:var(--danger);">Logout</span></button></li>
    `;
  } else {
    items += `
      <li><div class="menu-divider"></div></li>
      <li><a href="#" onclick="navigateTo('login')"><span class="menu-icon">&#128274;</span> Login</a></li>
    `;
  }

  menu.innerHTML = items;
}

// ============================================
// FIREBASE LOGIN GOOGLE
// ============================================
function loginGoogle() {
  if (!firebase.apps.length) {
    showToast('Firebase belum dikonfigurasi. Silakan atur di Pengaturan.', 'error');
    return;
  }

  const btn = document.getElementById('btnLoginGoogle');
  btn.disabled = true;
  btn.innerHTML = '<span>Memproses...</span>';

  const provider = new firebase.auth.GoogleAuthProvider();

  firebase.auth().signInWithPopup(provider)
    .then(result => {
      const user = result.user;
      checkUserInSheet(user);
    })
    .catch(error => {
      console.error('Login error:', error);
      showToast('Login gagal: ' + error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `
        <svg class="google-icon" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Masuk dengan Google
      `;
    });
}

async function checkUserInSheet(firebaseUser) {
  setDbStatus('yellow');
  try {
    const data = await apiGet('checkUser', { email: firebaseUser.email });

    if (!data || !data.found) {
      showToast('Akun Anda belum terdaftar sebagai pengguna Portal Pendidikan Kecamatan Lemahabang.', 'error');
      firebase.auth().signOut();
      resetLoginButton();
      setDbStatus('green');
      return;
    }

    if (data.status !== 'aktif') {
      showToast('Akun Anda belum aktif. Hubungi Super Admin.', 'error');
      firebase.auth().signOut();
      resetLoginButton();
      setDbStatus('green');
      return;
    }

    // Simpan session
    currentUser = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || data.nama,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      role: data.role,
      id_sekolah: data.id_sekolah,
      nama_sekolah: data.nama_sekolah,
      organisasi: data.organisasi || '',
    };

    localStorage.setItem(CONFIG.CACHE_PREFIX + 'session', JSON.stringify(currentUser));

    // Tampilkan konfirmasi
    showLoginSuccess();
    updateUIForUser();
    setDbStatus('green');

  } catch (error) {
    console.error('Check user error:', error);
    showToast('Gagal memvalidasi akun. Coba lagi.', 'error');
    firebase.auth().signOut();
    resetLoginButton();
    setDbStatus('red');
  }
}

function showLoginSuccess() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('loginSuccess').classList.remove('hidden');
  document.getElementById('successNama').textContent = currentUser.displayName;
  document.getElementById('successEmail').textContent = currentUser.email;
  document.getElementById('successRole').textContent = currentUser.role === 'super_admin' ? 'Super Admin' : currentUser.role === 'operator' ? 'Operator' : currentUser.role;
  document.getElementById('successSekolah').textContent = currentUser.nama_sekolah ? 'Sekolah: ' + currentUser.nama_sekolah : '';
}

function resetLoginButton() {
  const btn = document.getElementById('btnLoginGoogle');
  btn.disabled = false;
  btn.innerHTML = `
    <svg class="google-icon" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
    Masuk dengan Google
  `;
}

function logout() {
  if (firebase.apps.length) {
    firebase.auth().signOut();
  }
  currentUser = null;
  localStorage.removeItem(CONFIG.CACHE_PREFIX + 'session');
  updateUIForUser();
  navigateTo('beranda');
  showToast('Berhasil logout.', 'success');
}

function updateUIForUser() {
  const notifBtn = document.getElementById('btnNotif');
  if (currentUser) {
    notifBtn.style.display = 'flex';
    if (currentUser.role === 'super_admin') {
      notifBtn.style.display = 'flex';
    }
  } else {
    notifBtn.style.display = 'none';
  }
  updateBottomNav();

  // Reset login page
  if (!currentUser) {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('loginSuccess').classList.add('hidden');
    resetLoginButton();
  }
}

// ============================================
// DB STATUS LED
// ============================================
function setDbStatus(status) {
  dbStatus = status;
  const led = document.getElementById('dbLed');
  led.className = 'db-led ' + status;
  const labels = { green: 'Database terhubung', yellow: 'Memuat data...', red: 'Database tidak tersambung, menampilkan data terakhir' };
  led.title = labels[status] || '';
}

// ============================================
// API CALLS
// ============================================
async function apiGet(action, params = {}) {
  const url = new URL(CONFIG.API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const resp = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (e) {
    console.error('API GET error:', action, e);
    throw e;
  }
}

async function apiPost(action, payload = {}) {
  try {
    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (e) {
    console.error('API POST error:', action, e);
    throw e;
  }
}

// ============================================
// CACHE
// ============================================
function getCache(key) {
  const raw = localStorage.getItem(CONFIG.CACHE_PREFIX + key);
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts > CONFIG.CACHE_DURATION) return null;
    return cached.data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(CONFIG.CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {
    console.warn('Cache write error:', e);
  }
}

// ============================================
// LOAD DATA PUBLIK
// ============================================
async function loadPublicData() {
  setDbStatus('yellow');

  // Load dari cache dulu
  const cachedDashboard = getCache('dashboard');
  if (cachedDashboard) {
    renderDashboardStats(cachedDashboard);
  }

  try {
    const data = await apiGet('getDashboard');
    if (data) {
      setCache('dashboard', data);
      renderDashboardStats(data);
      setDbStatus('green');
    }
  } catch (e) {
    if (cachedDashboard) {
      setDbStatus('red');
    } else {
      setDbStatus('red');
    }
  }

  // Load berita, agenda, galeri
  loadBeritaAgendaGaleri();
}

function renderDashboardStats(data) {
  const d = data.stats || data;
  setText('statSekolah', d.total_sekolah || 0);
  setText('statSD', d.total_sd || 0);
  setText('statTK', d.total_tk || 0);
  setText('statPAUD', d.total_paud || 0);
  setText('statSiswa', d.total_siswa || 0);
  setText('statGuru', d.total_guru || 0);
  setText('statTendik', d.total_tendik || 0);
  setText('statLaporan', d.laporan_bulan_ini || 0);
  setText('statTugasAktif', d.tugas_aktif || 0);
  setText('statTugasSelesai', d.tugas_selesai || 0);
  setText('statBUP', d.total_bup || 0);
  setText('statSPMB', d.total_spmb || 0);
  setText('statAlumni', d.total_alumni || 0);
  setText('statArsip', d.total_arsip || 0);

  // Laporan status
  renderLaporanStatusPublik(data.laporan_status || {});

  // Progres tugas
  renderProgresTugasPublik(data.progres_tugas || []);

  // Ringkasan
  renderBUPRingkasPublik(data.bup_ringkas || {});
  renderSPMBRingkasPublik(data.spmb_ringkas || {});
  renderAlumniRingkasPublik(data.alumni_ringkas || {});
  renderArsipRingkasPublik(data.arsip_ringkas || {});
}

function renderLaporanStatusPublik(status) {
  const el = document.getElementById('laporanStatusPublik');
  const selesai = status.selesai || 0;
  const proses = status.proses || 0;
  const belum = status.belum || 0;
  const total = selesai + proses + belum || 1;
  const pctSelesai = Math.round(selesai / total * 100);

  el.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="progress-bar flex-1">
        <div class="progress-fill green" style="width:${pctSelesai}%"></div>
      </div>
      <span class="text-sm fw-bold">${pctSelesai}%</span>
    </div>
    <div class="flex gap-3 mt-1 text-xs text-muted">
      <span>Selesai: ${selesai}</span>
      <span>Proses: ${proses}</span>
      <span>Belum: ${belum}</span>
    </div>
  `;
}

function renderProgresTugasPublik(items) {
  const el = document.getElementById('progresTugasPublik');
  if (!items.length) {
    el.innerHTML = '<div class="empty-state"><p>Belum ada data progres tugas.</p></div>';
    return;
  }
  el.innerHTML = items.slice(0, 5).map(t => `
    <div class="list-item">
      <div class="item-icon">&#128203;</div>
      <div class="item-body">
        <div class="item-title">${esc(t.nama_sekolah || '-')}</div>
        <div class="progress-bar mt-1"><div class="progress-fill ${t.persentase >= 100 ? 'green' : t.persentase > 0 ? 'blue' : 'yellow'}" style="width:${Math.min(t.persentase || 0, 100)}%"></div></div>
      </div>
      <span class="text-sm fw-600">${t.persentase || 0}%</span>
    </div>
  `).join('');
}

function renderBUPRingkasPublik(d) {
  document.getElementById('bupRingkasPublik').innerHTML = `
    <div class="flex justify-between text-sm">
      <span>Pensiun &lt;1 tahun</span><strong class="text-danger">${d.mendekati || 0}</strong>
    </div>
    <div class="flex justify-between text-sm mt-1">
      <span>Pensiun &lt;6 bulan</span><strong class="text-warning">${d.segera || 0}</strong>
    </div>
    <div class="flex justify-between text-sm mt-1">
      <span>Sudah pensiun</span><strong>${d.sudah || 0}</strong>
    </div>
  `;
}

function renderSPMBRingkasPublik(d) {
  document.getElementById('spmbRingkasPublik').innerHTML = `
    <div class="flex justify-between text-sm">
      <span>Pendaftar</span><strong>${d.pendaftar || 0}</strong>
    </div>
    <div class="flex justify-between text-sm mt-1">
      <span>Terverifikasi</span><strong class="text-success">${d.terverifikasi || 0}</strong>
    </div>
    <div class="flex justify-between text-sm mt-1">
      <span>Diterima</span><strong class="text-primary">${d.diterima || 0}</strong>
    </div>
  `;
}

function renderAlumniRingkasPublik(d) {
  document.getElementById('alumniRingkasPublik').innerHTML = `
    <div class="flex justify-between text-sm">
      <span>Lulus tahun ini</span><strong>${d.tahun_ini || 0}</strong>
    </div>
    <div class="flex justify-between text-sm mt-1">
      <span>Total alumni</span><strong>${d.total || 0}</strong>
    </div>
  `;
}

function renderArsipRingkasPublik(d) {
  document.getElementById('arsipRingkasPublik').innerHTML = `
    <div class="flex justify-between text-sm">
      <span>PNS</span><strong>${d.pns || 0}</strong>
    </div>
    <div class="flex justify-between text-sm mt-1">
      <span>PPPK</span><strong class="text-primary">${d.pppk || 0}</strong>
    </div>
    <div class="flex justify-between text-sm mt-1">
      <span>Honorer/Non ASN</span><strong class="text-warning">${d.honorer || 0}</strong>
    </div>
  `;
}

// ============================================
// LOAD BERITA, AGENDA, GALERI
// ============================================
async function loadBeritaAgendaGaleri() {
  // Berita
  const cachedBerita = getCache('berita');
  if (cachedBerita) renderBeritaList(cachedBerita, 'beritaListPublik', 3);

  try {
    const data = await apiGet('getBerita');
    if (data && data.data) {
      setCache('berita', data.data);
      renderBeritaList(data.data, 'beritaListPublik', 3);
    }
  } catch (e) {
    // cache sudah ditampilkan
  }

  // Agenda
  const cachedAgenda = getCache('agenda');
  if (cachedAgenda) renderAgendaList(cachedAgenda, 'agendaListPublik', 3);

  try {
    const data = await apiGet('getAgenda');
    if (data && data.data) {
      setCache('agenda', data.data);
      renderAgendaList(data.data, 'agendaListPublik', 3);
    }
  } catch (e) {}

  // Galeri
  const cachedGaleri = getCache('galeri');
  if (cachedGaleri) renderGaleriGrid(cachedGaleri, 'galeriListPublik', 6);

  try {
    const data = await apiGet('getGaleri');
    if (data && data.data) {
      setCache('galeri', data.data);
      renderGaleriGrid(data.data, 'galeriListPublik', 6);
    }
  } catch (e) {}
}

function renderBeritaList(items, containerId, limit) {
  const el = document.getElementById(containerId);
  if (!items || !items.length) {
    el.innerHTML = '<div class="empty-state"><p>Belum ada berita.</p></div>';
    return;
  }
  el.innerHTML = items.slice(0, limit || items.length).map(b => `
    <div class="berita-card" onclick="showBeritaDetail('${esc(b.id_berita)}')">
      ${b.gambar ? `<img src="${esc(b.gambar)}" alt="${esc(b.judul)}" loading="lazy">` : ''}
      <div class="berita-body">
        <div class="berita-title">${esc(b.judul)}</div>
        <div class="berita-meta">${formatDate(b.tanggal)} | ${esc(b.kategori || '')}</div>
      </div>
    </div>
  `).join('');
}

function renderAgendaList(items, containerId, limit) {
  const el = document.getElementById(containerId);
  if (!items || !items.length) {
    el.innerHTML = '<div class="empty-state"><p>Belum ada agenda.</p></div>';
    return;
  }
  el.innerHTML = items.slice(0, limit || items.length).map(a => {
    const d = new Date(a.tanggal);
    return `
    <div class="agenda-item">
      <div class="agenda-date">
        <div class="date-day">${d.getDate() || '-'}</div>
        <div class="date-month">${getMonthShort(d.getMonth())}</div>
      </div>
      <div class="agenda-body">
        <div class="agenda-title">${esc(a.nama_kegiatan)}</div>
        <div class="agenda-loc">${esc(a.lokasi || '')} ${a.jam ? '| ' + esc(a.jam) : ''}</div>
      </div>
    </div>`;
  }).join('');
}

function renderGaleriGrid(items, containerId, limit) {
  const el = document.getElementById(containerId);
  if (!items || !items.length) {
    el.innerHTML = '<div class="empty-state"><p>Belum ada galeri.</p></div>';
    return;
  }
  el.innerHTML = items.slice(0, limit || items.length).map(g => `
    <div class="galeri-item">
      ${g.gambar ? `<img src="${esc(g.gambar)}" alt="${esc(g.judul)}" loading="lazy">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gray-400);font-size:1.5rem;">&#128247;</div>'}
    </div>
  `).join('');
}

// ============================================
// LOAD PAGE DATA
// ============================================
function loadPageData(page) {
  switch (page) {
    case 'berita': loadBerita(); break;
    case 'agenda': loadAgenda(); break;
    case 'galeri': loadGaleri(); break;
    case 'sekolah': loadSekolah(); break;
    case 'bup': loadBUP(); break;
    case 'spmb': loadSPMB(); break;
    case 'alumni': loadAlumni(); break;
    case 'arsip': loadArsip(); break;
    case 'tugas': loadTugas(); break;
    case 'laporan': setupLaporanPage(); break;
    case 'dashboardOperator': loadOperatorDashboard(); break;
    case 'dashboardAdmin': loadAdminDashboard(); break;
    case 'kelolaUser': loadUsers(); break;
    case 'kelolaSekolah': loadSekolahAdmin(); break;
    case 'pengaturan': loadPengaturan(); break;
  }
}

// ============================================
// BERITA
// ============================================
async function loadBerita() {
  const el = document.getElementById('beritaList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    const data = await apiGet('getBerita');
    if (data && data.data) {
      renderBeritaList(data.data, 'beritaList');
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat berita.</p></div>';
  }
}

function showBeritaDetail(id) {
  showToast('Detail berita: ' + id, 'info');
}

// ============================================
// AGENDA
// ============================================
async function loadAgenda() {
  const el = document.getElementById('agendaList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    const data = await apiGet('getAgenda');
    if (data && data.data) {
      renderAgendaList(data.data, 'agendaList');
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat agenda.</p></div>';
  }
}

// ============================================
// GALERI
// ============================================
async function loadGaleri() {
  const el = document.getElementById('galeriList');
  el.innerHTML = '';

  try {
    const data = await apiGet('getGaleri');
    if (data && data.data) {
      renderGaleriGrid(data.data, 'galeriList');
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat galeri.</p></div>';
  }
}

// ============================================
// SEKOLAH
// ============================================
let allSekolah = [];

async function loadSekolah() {
  const el = document.getElementById('sekolahList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    const data = await apiGet('getSekolah');
    if (data && data.data) {
      allSekolah = data.data;
      renderSekolahList(allSekolah);
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat data sekolah.</p></div>';
  }
}

function renderSekolahList(items) {
  const el = document.getElementById('sekolahList');
  if (!items || !items.length) {
    el.innerHTML = '<div class="empty-state"><p>Tidak ada data sekolah.</p></div>';
    return;
  }
  el.innerHTML = items.map(s => `
    <div class="card">
      <div class="flex items-center gap-2">
        <div class="item-icon">&#127979;</div>
        <div class="item-body">
          <div class="item-title">${esc(s.nama_sekolah)}</div>
          <div class="item-subtitle">${esc(s.jenjang || '')} | ${esc(s.desa || '')} | NPSN: ${esc(s.npsn || '-')}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function filterSekolah() {
  const search = document.getElementById('searchSekolah').value.toLowerCase();
  const jenjang = document.getElementById('filterJenjang').value;
  let filtered = allSekolah;
  if (search) {
    filtered = filtered.filter(s =>
      (s.nama_sekolah || '').toLowerCase().includes(search) ||
      (s.npsn || '').includes(search) ||
      (s.desa || '').toLowerCase().includes(search)
    );
  }
  if (jenjang) {
    filtered = filtered.filter(s => s.jenjang === jenjang);
  }
  renderSekolahList(filtered);
}

// ============================================
// BUP
// ============================================
async function loadBUP() {
  const el = document.getElementById('bupList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    let data;
    if (currentUser && currentUser.role === 'operator') {
      data = await apiGet('getBUPByUser', { email: currentUser.email });
    } else {
      data = await apiGet('getBUP');
    }
    if (data && data.data) {
      renderBUPList(data.data);
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat data BUP.</p></div>';
  }
}

function renderBUPList(items) {
  const el = document.getElementById('bupList');
  const filter = document.getElementById('filterBUP').value;

  let filtered = items || [];
  const now = new Date();

  if (filter === '1tahun') {
    filtered = filtered.filter(b => {
      const tmt = new Date(b.tmt_pensiun);
      const diff = tmt - now;
      return diff > 0 && diff <= 365 * 24 * 60 * 60 * 1000;
    });
  } else if (filter === '6bulan') {
    filtered = filtered.filter(b => {
      const tmt = new Date(b.tmt_pensiun);
      const diff = tmt - now;
      return diff > 0 && diff <= 180 * 24 * 60 * 60 * 1000;
    });
  } else if (filter === '3bulan') {
    filtered = filtered.filter(b => {
      const tmt = new Date(b.tmt_pensiun);
      const diff = tmt - now;
      return diff > 0 && diff <= 90 * 24 * 60 * 60 * 1000;
    });
  } else if (filter === 'sudah') {
    filtered = filtered.filter(b => b.sisa_hari <= 0);
  }

  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><p>Tidak ada data BUP.</p></div>';
    return;
  }

  el.innerHTML = filtered.map(b => {
    const sisa = parseInt(b.sisa_hari) || 0;
    let badgeClass = 'badge-success';
    let badgeText = 'Aman';
    let cardClass = '';
    if (sisa <= 0) { badgeClass = 'badge-danger'; badgeText = 'Pensiun'; cardClass = 'bup-pensiun'; }
    else if (sisa <= 90) { badgeClass = 'badge-danger'; badgeText = 'Segera'; cardClass = 'bup-segera'; }
    else if (sisa <= 180) { badgeClass = 'badge-warning'; badgeText = 'Perhatian'; cardClass = 'bup-perhatian'; }
    else if (sisa <= 365) { badgeClass = 'badge-warning'; badgeText = 'Perhatian'; cardClass = 'bup-perhatian'; }

    return `
    <div class="stat-card ${cardClass}" style="flex-direction:column;align-items:flex-start;max-height:none;">
      <div class="flex items-center justify-between w-full">
        <div class="item-title fw-600">${esc(b.nama_pegawai)}</div>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="text-xs text-muted mt-1">NIP: ${esc(b.nip || '-')} | ${esc(b.jabatan || '-')}</div>
      <div class="text-xs text-muted">${esc(b.status_pegawai || '-')} | ${esc(b.nama_sekolah || '-')}</div>
      <div class="text-xs mt-1">TMT Pensiun: <strong>${formatDate(b.tmt_pensiun)}</strong> | Sisa: <strong class="${sisa <= 90 ? 'text-danger' : sisa <= 365 ? 'text-warning' : 'text-success'}">${sisa} hari</strong></div>
    </div>`;
  }).join('');
}

// ============================================
// SPMB
// ============================================
async function loadSPMB() {
  const el = document.getElementById('spmbList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    let data;
    if (currentUser && currentUser.role === 'operator') {
      data = await apiGet('getSPMBByUser', { email: currentUser.email });
    } else {
      data = await apiGet('getSPMB');
    }
    if (data && data.data) {
      renderSPMBList(data.data);
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat data SPMB.</p></div>';
  }
}

function renderSPMBList(items) {
  const el = document.getElementById('spmbList');
  if (!items || !items.length) {
    el.innerHTML = '<div class="empty-state"><p>Tidak ada data SPMB.</p></div>';
    return;
  }

  // Filter
  const fTahun = document.getElementById('filterSPMBTahun').value;
  const fVerif = document.getElementById('filterSPMBVerifikasi').value;
  const fDiterima = document.getElementById('filterSPMBDiterima').value;

  let filtered = items;
  if (fTahun) filtered = filtered.filter(s => s.tahun_ajaran === fTahun);
  if (fVerif) filtered = filtered.filter(s => s.status_verifikasi === fVerif);
  if (fDiterima) filtered = filtered.filter(s => s.status_diterima === fDiterima);

  // Tombol tambah (operator)
  let addBtn = '';
  if (currentUser && currentUser.role === 'operator') {
    addBtn = `<button class="btn btn-sm btn-primary mb-2" onclick="showModalSPMB()">+ Tambah Pendaftar</button>`;
  }

  el.innerHTML = addBtn + `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>No</th><th>Nama</th><th>NISN</th><th>Jalur</th><th>Verifikasi</th><th>Diterima</th></tr>
        </thead>
        <tbody>
          ${filtered.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${esc(s.nama_siswa)}</td>
              <td>${esc(s.nisn || '-')}</td>
              <td>${esc(s.jalur_pendaftaran || '-')}</td>
              <td><span class="badge ${s.status_verifikasi === 'Terverifikasi' ? 'badge-success' : 'badge-warning'}">${esc(s.status_verifikasi || '-')}</span></td>
              <td><span class="badge ${s.status_diterima === 'Diterima' ? 'badge-success' : 'badge-gray'}">${esc(s.status_diterima || '-')}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================
// ALUMNI
// ============================================
async function loadAlumni() {
  const el = document.getElementById('alumniList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    let data;
    if (currentUser && currentUser.role === 'operator') {
      data = await apiGet('getAlumniByUser', { email: currentUser.email });
    } else {
      data = await apiGet('getAlumni');
    }
    if (data && data.data) {
      renderAlumniList(data.data);
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat data alumni.</p></div>';
  }
}

function renderAlumniList(items) {
  const el = document.getElementById('alumniList');
  if (!items || !items.length) {
    el.innerHTML = '<div class="empty-state"><p>Tidak ada data alumni.</p></div>';
    return;
  }

  const fTahun = document.getElementById('filterAlumniTahun').value;
  let filtered = items;
  if (fTahun) filtered = filtered.filter(a => a.tahun_lulus === fTahun);

  let addBtn = '';
  if (currentUser && currentUser.role === 'operator') {
    addBtn = `<button class="btn btn-sm btn-primary mb-2" onclick="showModalAlumni()">+ Tambah Alumni</button>`;
  }

  el.innerHTML = addBtn + `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>No</th><th>Nama</th><th>NISN</th><th>Tahun Lulus</th><th>Lanjut Ke</th></tr>
        </thead>
        <tbody>
          ${filtered.map((a, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${esc(a.nama_siswa)}</td>
              <td>${esc(a.nisn || '-')}</td>
              <td>${esc(a.tahun_lulus || '-')}</td>
              <td>${esc(a.nama_sekolah_lanjutan || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================
// ARSIP PEGAWAI
// ============================================
async function loadArsip() {
  const el = document.getElementById('arsipList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    let data;
    if (currentUser && currentUser.role === 'operator') {
      data = await apiGet('getArsipPegawaiByUser', { email: currentUser.email });
    } else {
      data = await apiGet('getArsipPegawai');
    }
    if (data && data.data) {
      renderArsipList(data.data);
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat arsip pegawai.</p></div>';
  }
}

function renderArsipList(items) {
  const el = document.getElementById('arsipList');
  if (!items || !items.length) {
    el.innerHTML = '<div class="empty-state"><p>Tidak ada data arsip.</p></div>';
    return;
  }

  const fStatus = document.getElementById('filterArsipStatus').value;
  const fKat = document.getElementById('filterArsipKategori').value;
  let filtered = items;
  if (fStatus) filtered = filtered.filter(a => a.status_pegawai === fStatus);
  if (fKat) filtered = filtered.filter(a => a.kategori === fKat);

  let addBtn = '';
  if (currentUser && currentUser.role === 'operator') {
    addBtn = `<button class="btn btn-sm btn-primary mb-2" onclick="showModalArsip()">+ Tambah Arsip</button>`;
  }

  el.innerHTML = addBtn + filtered.map(a => `
    <div class="card">
      <div class="flex items-center gap-2">
        <div class="item-icon" style="background:var(--accent-light);color:var(--accent);">&#128193;</div>
        <div class="item-body">
          <div class="item-title">${esc(a.nama_pegawai)}</div>
          <div class="item-subtitle">NIP: ${esc(a.nip || '-')} | ${esc(a.status_pegawai)} | ${esc(a.kategori || '-')}</div>
          <div class="item-subtitle">${esc(a.jabatan || '-')} | ${esc(a.golongan || '-')}</div>
        </div>
        <span class="badge ${a.status_pegawai === 'PNS' ? 'badge-primary' : a.status_pegawai === 'PPPK' ? 'badge-info' : 'badge-warning'}">${esc(a.status_pegawai)}</span>
      </div>
      ${a.file_arsip ? `<a href="${esc(a.file_arsip)}" target="_blank" class="btn btn-sm btn-outline mt-1">&#128196; Lihat File</a>` : ''}
    </div>
  `).join('');
}

// ============================================
// TUGAS
// ============================================
async function loadTugas() {
  const el = document.getElementById('tugasList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    let data;
    if (currentUser && currentUser.role === 'operator') {
      data = await apiGet('getTugasByUser', { email: currentUser.email });
    } else if (currentUser && currentUser.role === 'super_admin') {
      data = await apiGet('getTugas');
    } else {
      data = await apiGet('getTugas');
    }
    if (data && data.data) {
      renderTugasList(data.data);
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat tugas.</p></div>';
  }
}

function renderTugasList(items) {
  const el = document.getElementById('tugasList');
  if (!items || !items.length) {
    el.innerHTML = '<div class="empty-state"><p>Tidak ada tugas.</p></div>';
    return;
  }

  let addBtn = '';
  if (currentUser && currentUser.role === 'super_admin') {
    addBtn = `<button class="btn btn-sm btn-primary mb-2" onclick="showModalTugas()">+ Buat Tugas</button>`;
  }

  el.innerHTML = addBtn + items.map(t => {
    const statusClass = t.status_pengerjaan === 'selesai' ? 'badge-success' : t.status_pengerjaan === 'proses' ? 'badge-warning' : 'badge-gray';
    return `
    <div class="card">
      <div class="flex items-center justify-between">
        <div class="item-title fw-600">${esc(t.judul_tugas)}</div>
        <span class="badge ${statusClass}">${esc(t.status_pengerjaan || t.status || '-')}</span>
      </div>
      <div class="text-xs text-muted mt-1">${esc(t.jenjang || '')} | Batas: ${formatDate(t.batas_waktu)}</div>
      ${t.deskripsi ? `<p class="text-sm text-muted mt-1">${esc(t.deskripsi).substring(0, 100)}</p>` : ''}
      ${t.link_tugas ? `<a href="${esc(t.link_tugas)}" target="_blank" class="btn btn-sm btn-outline mt-1">&#128279; Link Tugas</a>` : ''}
      ${currentUser && currentUser.role === 'operator' ? `
        <div class="flex gap-2 mt-2">
          <button class="btn btn-sm btn-success" onclick="updateStatusTugas('${esc(t.id_tugas)}','selesai')">&#9989; Selesai</button>
          <button class="btn btn-sm btn-outline" onclick="updateStatusTugas('${esc(t.id_tugas)}','proes')">&#9203; Proses</button>
          <button class="btn btn-wa" onclick="shareWA('${esc(t.judul_tugas)}','${esc(t.batas_waktu)}','${esc(t.link_tugas || '')}')">&#128172; WA</button>
        </div>
      ` : ''}
    </div>`;
  }).join('');
}

async function updateStatusTugas(idTugas, status) {
  try {
    await apiPost('submitProgresTugas', {
      id_tugas: idTugas,
      email: currentUser.email,
      id_sekolah: currentUser.id_sekolah,
      nama_sekolah: currentUser.nama_sekolah,
      status_pengerjaan: status,
    });
    showToast('Status tugas diperbarui.', 'success');
    loadTugas();
  } catch (e) {
    showToast('Gagal memperbarui status tugas.', 'error');
  }
}

function shareWA(judul, batasWaktu, link) {
  const msg = encodeURIComponent(
    `Assalamu'alaikum Bapak/Ibu Operator.\nMohon segera mengerjakan tugas berikut:\n\nJudul: ${judul}\nBatas Waktu: ${batasWaktu}\nLink: ${link}\n\nTerima kasih.`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// ============================================
// LAPORAN BULANAN
// ============================================
function setupLaporanPage() {
  if (!currentUser) return;
  const formWrap = document.getElementById('laporanFormWrap');
  const rekapWrap = document.getElementById('rekapLaporanWrap');

  if (currentUser.role === 'super_admin') {
    formWrap.classList.add('hidden');
    rekapWrap.classList.remove('hidden');
    loadRekapLaporan();
  } else {
    formWrap.classList.remove('hidden');
    rekapWrap.classList.add('hidden');
  }
}

function hitungTotalSiswa() {
  const l = parseInt(document.getElementById('lapSiswaL').value) || 0;
  const p = parseInt(document.getElementById('lapSiswaP').value) || 0;
  document.getElementById('lapSiswaTotal').value = l + p;
}

async function submitLaporan(e) {
  e.preventDefault();
  if (!currentUser) return;

  const payload = {
    bulan: document.getElementById('lapBulan').value,
    tahun: document.getElementById('lapTahun').value,
    id_sekolah: currentUser.id_sekolah,
    nama_sekolah: currentUser.nama_sekolah,
    email: currentUser.email,
    jumlah_siswa_l: document.getElementById('lapSiswaL').value,
    jumlah_siswa_p: document.getElementById('lapSiswaP').value,
    jumlah_siswa_total: document.getElementById('lapSiswaTotal').value,
    jumlah_guru: document.getElementById('lapGuru').value,
    jumlah_tendik: document.getElementById('lapTendik').value,
    jumlah_rombel: document.getElementById('lapRombel').value,
    kondisi_sarpras: document.getElementById('lapSarpras').value,
    keterangan: document.getElementById('lapKeterangan').value,
  };

  try {
    await apiPost('submitLaporanBulanan', payload);
    showToast('Laporan berhasil dikirim.', 'success');
    document.getElementById('laporanForm').reset();
  } catch (e) {
    showToast('Gagal mengirim laporan: ' + e.message, 'error');
  }
}

async function loadRekapLaporan() {
  const el = document.getElementById('rekapLaporanList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    const data = await apiGet('getRekapLaporan');
    if (data && data.data) {
      renderRekapLaporan(data.data);
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat rekap laporan.</p></div>';
  }
}

function renderRekapLaporan(items) {
  const el = document.getElementById('rekapLaporanList');
  if (!items || !items.length) {
    el.innerHTML = '<div class="empty-state"><p>Tidak ada data laporan.</p></div>';
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>No</th><th>Sekolah</th><th>Bulan</th><th>Siswa</th><th>Guru</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${items.map((l, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${esc(l.nama_sekolah)}</td>
              <td>${esc(l.bulan || '-')}/${esc(l.tahun || '-')}</td>
              <td>${l.jumlah_siswa_total || 0}</td>
              <td>${l.jumlah_guru || 0}</td>
              <td><span class="badge ${l.status_laporan === 'sudah' ? 'badge-success' : 'badge-warning'}">${esc(l.status_laporan || '-')}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function exportLaporanCSV() {
  showToast('Export CSV akan diimplementasikan.', 'info');
}

function cetakLaporan() {
  const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('printTgl').textContent = `Lemahabang, ${tgl}`;
  window.print();
}

// ============================================
// DASHBOARD OPERATOR
// ============================================
async function loadOperatorDashboard() {
  if (!currentUser || currentUser.role === 'super_admin') return;

  document.getElementById('opWelcome').textContent = `Selamat Datang, ${currentUser.displayName}`;
  document.getElementById('opSekolahBadge').textContent = `🏫 ${currentUser.nama_sekolah}`;

  try {
    // Laporan by user
    const lapData = await apiGet('getLaporanByUser', { email: currentUser.email });
    if (lapData && lapData.data) {
      const laporan = lapData.data;
      const bulanIni = laporan.filter(l => {
        const now = new Date();
        return l.tahun == now.getFullYear() && l.bulan == String(now.getMonth() + 1).padStart(2, '0');
      });
      setText('opLaporan', bulanIni.length);

      // Donut
      const selesai = laporan.filter(l => l.status_laporan === 'sudah').length;
      const proses = laporan.filter(l => l.status_laporan === 'proses').length;
      const belum = laporan.filter(l => l.status_laporan === 'belum' || !l.status_laporan).length;
      const total = selesai + proses + belum || 1;
      setText('opLapSelesai', selesai);
      setText('opLapProses', proses);
      setText('opLapBelum', belum);

      const pctSelesai = Math.round(selesai / total * 100);
      const pctProses = Math.round(proses / total * 100);
      const donut = document.getElementById('opDonutLaporan');
      donut.style.background = `conic-gradient(var(--success) 0% ${pctSelesai}%, var(--warning) ${pctSelesai}% ${pctSelesai + pctProses}%, var(--gray-300) ${pctSelesai + pctProses}% 100%)`;
      document.getElementById('opDonutLaporanCenter').textContent = pctSelesai + '%';
    }

    // Tugas
    const tugasData = await apiGet('getTugasByUser', { email: currentUser.email });
    if (tugasData && tugasData.data) {
      const aktif = tugasData.data.filter(t => t.status === 'aktif').length;
      setText('opTugasAktif', aktif);
      document.getElementById('opTugasList').innerHTML = tugasData.data.slice(0, 5).map(t => `
        <div class="list-item">
          <div class="item-icon">&#128203;</div>
          <div class="item-body">
            <div class="item-title">${esc(t.judul_tugas)}</div>
            <div class="item-subtitle">Batas: ${formatDate(t.batas_waktu)}</div>
            <div class="progress-bar mt-1"><div class="progress-fill ${t.status_pengerjaan === 'selesai' ? 'green' : 'yellow'}" style="width:${t.status_pengerjaan === 'selesai' ? 100 : t.status_pengerjaan === 'proses' ? 50 : 0}%"></div></div>
          </div>
          <span class="badge ${t.status_pengerjaan === 'selesai' ? 'badge-success' : t.status_pengerjaan === 'proses' ? 'badge-warning' : 'badge-gray'}">${esc(t.status_pengerjaan || 'belum')}</span>
        </div>
      `).join('') || '<div class="empty-state"><p>Tidak ada tugas.</p></div>';
    }

    // BUP
    const bupData = await apiGet('getBUPByUser', { email: currentUser.email });
    if (bupData && bupData.data) {
      setText('opBUP', bupData.data.length);
      document.getElementById('opBUPList').innerHTML = bupData.data.slice(0, 3).map(b => {
        const sisa = parseInt(b.sisa_hari) || 0;
        return `
        <div class="list-item">
          <div class="item-icon" style="background:var(--danger-light);color:var(--danger);">&#128100;</div>
          <div class="item-body">
            <div class="item-title">${esc(b.nama_pegawai)}</div>
            <div class="item-subtitle">${esc(b.status_pegawai)} | Pensiun: ${formatDate(b.tmt_pensiun)}</div>
          </div>
          <span class="badge ${sisa <= 90 ? 'badge-danger' : sisa <= 365 ? 'badge-warning' : 'badge-success'}">${sisa} hari</span>
        </div>`;
      }).join('') || '<div class="empty-state"><p>Tidak ada data BUP.</p></div>';
    }

    // SPMB ringkas
    const spmbData = await apiGet('getSPMBByUser', { email: currentUser.email });
    if (spmbData && spmbData.data) {
      const d = spmbData.data;
      setText('opSPMB', d.length);
      document.getElementById('opSPMBRingkas').innerHTML = `
        <div class="flex justify-between text-sm"><span>Pendaftar</span><strong>${d.length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>Terverifikasi</span><strong class="text-success">${d.filter(s => s.status_verifikasi === 'Terverifikasi').length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>Diterima</span><strong class="text-primary">${d.filter(s => s.status_diterima === 'Diterima').length}</strong></div>
      `;
    }

    // Alumni ringkas
    const alumniData = await apiGet('getAlumniByUser', { email: currentUser.email });
    if (alumniData && alumniData.data) {
      setText('opAlumni', alumniData.data.length);
      document.getElementById('opAlumniRingkas').innerHTML = `
        <div class="flex justify-between text-sm"><span>Siswa Lulus</span><strong>${alumniData.data.length}</strong></div>
      `;
    }

    // Arsip ringkas
    const arsipData = await apiGet('getArsipPegawaiByUser', { email: currentUser.email });
    if (arsipData && arsipData.data) {
      setText('opArsip', arsipData.data.length);
      document.getElementById('opArsipRingkas').innerHTML = `
        <div class="flex justify-between text-sm"><span>PNS</span><strong>${arsipData.data.filter(a => a.status_pegawai === 'PNS').length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>PPPK</span><strong class="text-primary">${arsipData.data.filter(a => a.status_pegawai === 'PPPK').length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>Honorer/Non ASN</span><strong class="text-warning">${arsipData.data.filter(a => a.status_pegawai === 'Honorer' || a.status_pegawai === 'Non ASN').length}</strong></div>
      `;
    }
  } catch (e) {
    console.error('Operator dashboard error:', e);
  }
}

// ============================================
// DASHBOARD SUPER ADMIN
// ============================================
async function loadAdminDashboard() {
  if (!currentUser || currentUser.role !== 'super_admin') return;

  try {
    const data = await apiGet('getDashboard');
    if (data) {
      const d = data.stats || data;
      setText('admSekolah', d.total_sekolah || 0);
      setText('admOperator', d.total_operator || 0);
      setText('admLaporan', d.laporan_bulan_ini || 0);
      setText('admTugasAktif', d.tugas_aktif || 0);
      setText('admBUP', d.total_bup || 0);
      setText('admSPMB', d.total_spmb || 0);
      setText('admAlumni', d.total_alumni || 0);
      setText('admArsip', d.total_arsip || 0);
    }

    // Monitoring tugas
    const progresData = await apiGet('getProgresTugas');
    if (progresData && progresData.data) {
      document.getElementById('admMonitoringTugas').innerHTML = progresData.data.slice(0, 8).map(t => `
        <div class="list-item">
          <div class="item-icon">&#127979;</div>
          <div class="item-body">
            <div class="item-title">${esc(t.nama_sekolah)}</div>
            <div class="progress-bar mt-1"><div class="progress-fill ${t.persentase >= 100 ? 'green' : 'blue'}" style="width:${Math.min(t.persentase || 0, 100)}%"></div></div>
          </div>
          <span class="text-sm fw-600">${t.persentase || 0}%</span>
        </div>
      `).join('') || '<div class="empty-state"><p>Tidak ada data monitoring.</p></div>';
    }

    // Ringkasan arsip
    const arsipData = await apiGet('getArsipPegawai');
    if (arsipData && arsipData.data) {
      const ar = arsipData.data;
      document.getElementById('admArsipRingkas').innerHTML = `
        <div class="flex justify-between text-sm"><span>PNS</span><strong>${ar.filter(a => a.status_pegawai === 'PNS').length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>PPPK</span><strong class="text-primary">${ar.filter(a => a.status_pegawai === 'PPPK').length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>Honorer</span><strong class="text-warning">${ar.filter(a => a.status_pegawai === 'Honorer').length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>Total Arsip</span><strong>${ar.length}</strong></div>
      `;
    }

    // BUP ringkas
    const bupData = await apiGet('getBUP');
    if (bupData && bupData.data) {
      const bd = bupData.data;
      const mendekati = bd.filter(b => parseInt(b.sisa_hari) > 0 && parseInt(b.sisa_hari) <= 365).length;
      const sudah = bd.filter(b => parseInt(b.sisa_hari) <= 0).length;
      document.getElementById('admBUPRingkas').innerHTML = `
        <div class="flex justify-between text-sm"><span>Total Pegawai BUP</span><strong>${bd.length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>Mendekati (&lt;1 tahun)</span><strong class="text-danger">${mendekati}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>Sudah Pensiun</span><strong>${sudah}</strong></div>
      `;
    }

    // SPMB ringkas
    const spmbData = await apiGet('getSPMB');
    if (spmbData && spmbData.data) {
      const sd = spmbData.data;
      document.getElementById('admSPMBRingkas').innerHTML = `
        <div class="flex justify-between text-sm"><span>Pendaftar</span><strong>${sd.length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>Terverifikasi</span><strong class="text-success">${sd.filter(s => s.status_verifikasi === 'Terverifikasi').length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>Diterima</span><strong class="text-primary">${sd.filter(s => s.status_diterima === 'Diterima').length}</strong></div>
        <div class="flex justify-between text-sm mt-1"><span>Belum Verifikasi</span><strong class="text-warning">${sd.filter(s => s.status_verifikasi !== 'Terverifikasi').length}</strong></div>
      `;
    }

    // Alumni ringkas
    const alumniData = await apiGet('getAlumni');
    if (alumniData && alumniData.data) {
      document.getElementById('admAlumniRingkas').innerHTML = `
        <div class="flex justify-between text-sm"><span>Total Alumni</span><strong>${alumniData.data.length}</strong></div>
      `;
    }

    // Aktivitas terbaru (simplified)
    document.getElementById('admAktivitas').innerHTML = `
      <div class="activity-item"><div class="activity-dot" style="background:var(--success)"></div><div class="activity-text">Selamat datang di dashboard Super Admin</div><div class="activity-time">Baru</div></div>
    `;

    loadAdminLaporan();
  } catch (e) {
    console.error('Admin dashboard error:', e);
  }
}

async function loadAdminLaporan() {
  const el = document.getElementById('admLaporanChart');
  try {
    const data = await apiGet('getRekapLaporan');
    if (data && data.data) {
      const items = data.data;
      const sudah = items.filter(l => l.status_laporan === 'sudah').length;
      const belum = items.filter(l => l.status_laporan !== 'sudah').length;
      el.innerHTML = `
        <div class="flex gap-3">
          <div class="text-center">
            <div style="width:60px;height:60px;border-radius:50%;background:var(--success);color:var(--white);display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;">${sudah}</div>
            <div class="text-xs mt-1">Sudah</div>
          </div>
          <div class="text-center">
            <div style="width:60px;height:60px;border-radius:50%;background:var(--warning);color:var(--white);display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;">${belum}</div>
            <div class="text-xs mt-1">Belum</div>
          </div>
        </div>
      `;
    }
  } catch (e) {
    el.innerHTML = '<div class="text-sm text-muted">Gagal memuat data laporan.</div>';
  }
}

// ============================================
// KELOLA USER (Super Admin)
// ============================================
async function loadUsers() {
  if (!currentUser || currentUser.role !== 'super_admin') return;
  const el = document.getElementById('userList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    const data = await apiGet('getDashboard'); // Users included in dashboard
    // For now, show placeholder
    el.innerHTML = `
      <div class="card">
        <p class="text-sm text-muted">Daftar user dimuat dari sheet "users" melalui API.</p>
        <button class="btn btn-sm btn-primary mt-2" onclick="showModalUser()">+ Tambah User</button>
      </div>
    `;
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat data user.</p></div>';
  }
}

// ============================================
// KELOLA SEKOLAH (Super Admin)
// ============================================
async function loadSekolahAdmin() {
  if (!currentUser || currentUser.role !== 'super_admin') return;
  const el = document.getElementById('sekolahAdminList');
  el.innerHTML = '<div class="skeleton skeleton-text"></div>';

  try {
    const data = await apiGet('getSekolah');
    if (data && data.data) {
      el.innerHTML = data.data.map(s => `
        <div class="card">
          <div class="flex items-center gap-2">
            <div class="item-icon">&#127979;</div>
            <div class="item-body">
              <div class="item-title">${esc(s.nama_sekolah)}</div>
              <div class="item-subtitle">${esc(s.jenjang)} | NPSN: ${esc(s.npsn || '-')}</div>
            </div>
            <button class="btn btn-sm btn-outline" onclick="showModalSekolah('${esc(s.id_sekolah)}')">Edit</button>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Gagal memuat data sekolah.</p></div>';
  }
}

// ============================================
// PENGATURAN
// ============================================
function loadPengaturan() {
  document.getElementById('settingApiUrl').value = CONFIG.API_URL;
  document.getElementById('settingFbKey').value = firebaseConfig.apiKey;
  document.getElementById('settingFbProject').value = firebaseConfig.projectId;
}

function saveApiUrl() {
  const url = document.getElementById('settingApiUrl').value.trim();
  if (url) {
    localStorage.setItem('apiUrl', url);
    CONFIG.API_URL = url;
    showToast('URL API berhasil disimpan.', 'success');
  }
}

function saveFirebaseConfig() {
  const key = document.getElementById('settingFbKey').value.trim();
  const project = document.getElementById('settingFbProject').value.trim();
  if (key) localStorage.setItem('fbKey', key);
  if (project) localStorage.setItem('fbProject', project);
  showToast('Konfigurasi Firebase disimpan. Refresh halaman untuk menerapkan.', 'success');
}

// ============================================
// MODAL FORMS
// ============================================
function showModal(content) {
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) {
    closeModal();
  }
}

function showModalUser() {
  showModal(`
    <div class="modal-header">
      <h3>Tambah User</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <form onsubmit="submitUser(event)">
      <div class="form-group"><label>Email</label><input type="email" class="form-control" id="muEmail" required></div>
      <div class="form-group"><label>Nama</label><input type="text" class="form-control" id="muNama" required></div>
      <div class="form-group"><label>Role</label>
        <select class="form-control" id="muRole">
          <option value="operator">Operator</option>
          <option value="admin_organisasi">Admin Organisasi</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>
      <div class="form-group"><label>ID Sekolah</label><input type="text" class="form-control" id="muIdSekolah"></div>
      <div class="form-group"><label>Nama Sekolah</label><input type="text" class="form-control" id="muNamaSekolah"></div>
      <button type="submit" class="btn btn-primary btn-block">Simpan</button>
    </form>
  `);
}

async function submitUser(e) {
  e.preventDefault();
  try {
    await apiPost('addUser', {
      email: document.getElementById('muEmail').value,
      nama: document.getElementById('muNama').value,
      role: document.getElementById('muRole').value,
      id_sekolah: document.getElementById('muIdSekolah').value,
      nama_sekolah: document.getElementById('muNamaSekolah').value,
    });
    showToast('User berhasil ditambahkan.', 'success');
    closeModal();
    loadUsers();
  } catch (err) {
    showToast('Gagal menambahkan user: ' + err.message, 'error');
  }
}

function showModalSekolah(editId) {
  const isEdit = !!editId;
  showModal(`
    <div class="modal-header">
      <h3>${isEdit ? 'Edit' : 'Tambah'} Sekolah</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <form onsubmit="submitSekolah(event, '${editId || ''}')">
      <div class="form-group"><label>NPSN</label><input type="text" class="form-control" id="msNpsn" required></div>
      <div class="form-group"><label>Nama Sekolah</label><input type="text" class="form-control" id="msNama" required></div>
      <div class="form-group"><label>Jenjang</label>
        <select class="form-control" id="msJenjang">
          <option value="SD">SD</option><option value="MI">MI</option>
          <option value="SMP">SMP</option><option value="TK">TK</option>
          <option value="RA">RA</option><option value="PAUD">PAUD</option><option value="KB">KB</option>
        </select>
      </div>
      <div class="form-group"><label>Desa</label><input type="text" class="form-control" id="msDesa"></div>
      <div class="form-group"><label>Alamat</label><input type="text" class="form-control" id="msAlamat"></div>
      <div class="form-group"><label>Kepala Sekolah</label><input type="text" class="form-control" id="msKepsek"></div>
      <div class="form-group"><label>Email Operator</label><input type="email" class="form-control" id="msEmailOp"></div>
      <div class="form-group"><label>No WA</label><input type="text" class="form-control" id="msWa"></div>
      <button type="submit" class="btn btn-primary btn-block">Simpan</button>
    </form>
  `);
}

async function submitSekolah(e, editId) {
  e.preventDefault();
  try {
    const action = editId ? 'updateSekolah' : 'addSekolah';
    await apiPost(action, {
      id_sekolah: editId,
      npsn: document.getElementById('msNpsn').value,
      nama_sekolah: document.getElementById('msNama').value,
      jenjang: document.getElementById('msJenjang').value,
      desa: document.getElementById('msDesa').value,
      alamat: document.getElementById('msAlamat').value,
      kepala_sekolah: document.getElementById('msKepsek').value,
      email_operator: document.getElementById('msEmailOp').value,
      no_wa: document.getElementById('msWa').value,
    });
    showToast('Sekolah berhasil disimpan.', 'success');
    closeModal();
    loadSekolahAdmin();
  } catch (err) {
    showToast('Gagal menyimpan sekolah: ' + err.message, 'error');
  }
}

function showModalTugas() {
  showModal(`
    <div class="modal-header">
      <h3>Buat Tugas Operator</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <form onsubmit="submitTugas(event)">
      <div class="form-group"><label>Judul Tugas</label><input type="text" class="form-control" id="mtJudul" required></div>
      <div class="form-group"><label>Deskripsi</label><textarea class="form-control" id="mtDeskripsi" rows="2"></textarea></div>
      <div class="flex gap-2">
        <div class="form-group flex-1"><label>Target Jenjang</label>
          <select class="form-control" id="mtJenjang">
            <option value="">Semua</option><option value="SD">SD</option><option value="TK">TK</option><option value="PAUD">PAUD</option>
          </select>
        </div>
        <div class="form-group flex-1"><label>Batas Waktu</label><input type="date" class="form-control" id="mtBatas" required></div>
      </div>
      <div class="form-group"><label>Link Tugas</label><input type="url" class="form-control" id="mtLink" placeholder="https://..."></div>
      <button type="submit" class="btn btn-primary btn-block">Buat Tugas</button>
    </form>
  `);
}

async function submitTugas(e) {
  e.preventDefault();
  try {
    await apiPost('addTugas', {
      judul_tugas: document.getElementById('mtJudul').value,
      deskripsi: document.getElementById('mtDeskripsi').value,
      jenjang: document.getElementById('mtJenjang').value,
      batas_waktu: document.getElementById('mtBatas').value,
      link_tugas: document.getElementById('mtLink').value,
      created_by: currentUser.email,
    });
    showToast('Tugas berhasil dibuat.', 'success');
    closeModal();
    loadTugas();
  } catch (err) {
    showToast('Gagal membuat tugas: ' + err.message, 'error');
  }
}

function showModalSPMB() {
  showModal(`
    <div class="modal-header">
      <h3>Tambah Pendaftar SPMB</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <form onsubmit="submitSPMB(event)">
      <div class="form-group"><label>Tahun Ajaran</label><input type="text" class="form-control" id="mspTahun" value="2026/2027" required></div>
      <div class="flex gap-2">
        <div class="form-group flex-1"><label>NIK</label><input type="text" class="form-control" id="mspNik" required></div>
        <div class="form-group flex-1"><label>NISN</label><input type="text" class="form-control" id="mspNisn"></div>
      </div>
      <div class="form-group"><label>Nama Siswa</label><input type="text" class="form-control" id="mspNama" required></div>
      <div class="flex gap-2">
        <div class="form-group flex-1"><label>Tanggal Lahir</label><input type="date" class="form-control" id="mspTglLahir"></div>
        <div class="form-group flex-1"><label>Jenis Kelamin</label>
          <select class="form-control" id="mspJK"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
        </div>
      </div>
      <div class="form-group"><label>Alamat</label><input type="text" class="form-control" id="mspAlamat"></div>
      <div class="flex gap-2">
        <div class="form-group flex-1"><label>Nama Ortu</label><input type="text" class="form-control" id="mspOrtu"></div>
        <div class="form-group flex-1"><label>No HP</label><input type="text" class="form-control" id="mspHp"></div>
      </div>
      <div class="form-group"><label>Jalur Pendaftaran</label>
        <select class="form-control" id="mspJalur"><option value="Zonasi">Zonasi</option><option value="Afirmasi">Afirmasi</option><option value="Perpindahan">Perpindahan</option><option value="Prestasi">Prestasi</option></select>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Simpan</button>
    </form>
  `);
}

async function submitSPMB(e) {
  e.preventDefault();
  try {
    await apiPost('addSPMB', {
      tahun_ajaran: document.getElementById('mspTahun').value,
      id_sekolah: currentUser.id_sekolah,
      nama_sekolah: currentUser.nama_sekolah,
      nik: document.getElementById('mspNik').value,
      nisn: document.getElementById('mspNisn').value,
      nama_siswa: document.getElementById('mspNama').value,
      tanggal_lahir: document.getElementById('mspTglLahir').value,
      jenis_kelamin: document.getElementById('mspJK').value,
      alamat: document.getElementById('mspAlamat').value,
      nama_ortu: document.getElementById('mspOrtu').value,
      no_hp: document.getElementById('mspHp').value,
      jalur_pendaftaran: document.getElementById('mspJalur').value,
    });
    showToast('Data SPMB berhasil disimpan.', 'success');
    closeModal();
    loadSPMB();
  } catch (err) {
    showToast('Gagal menyimpan SPMB: ' + err.message, 'error');
  }
}

function showModalAlumni() {
  showModal(`
    <div class="modal-header">
      <h3>Tambah Alumni</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <form onsubmit="submitAlumni(event)">
      <div class="flex gap-2">
        <div class="form-group flex-1"><label>Tahun Lulus</label><input type="text" class="form-control" id="malTahun" value="2026" required></div>
        <div class="form-group flex-1"><label>NISN</label><input type="text" class="form-control" id="malNisn"></div>
      </div>
      <div class="form-group"><label>Nama Siswa</label><input type="text" class="form-control" id="malNama" required></div>
      <div class="form-group"><label>Jenis Kelamin</label>
        <select class="form-control" id="malJK"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
      </div>
      <div class="flex gap-2">
        <div class="form-group flex-1"><label>Lanjut Ke</label><input type="text" class="form-control" id="malLanjut"></div>
        <div class="form-group flex-1"><label>Nama Sekolah Lanjutan</label><input type="text" class="form-control" id="malSekolahLanjut"></div>
      </div>
      <div class="form-group"><label>Keterangan</label><input type="text" class="form-control" id="malKet"></div>
      <button type="submit" class="btn btn-primary btn-block">Simpan</button>
    </form>
  `);
}

async function submitAlumni(e) {
  e.preventDefault();
  try {
    await apiPost('addAlumni', {
      tahun_lulus: document.getElementById('malTahun').value,
      id_sekolah: currentUser.id_sekolah,
      nama_sekolah: currentUser.nama_sekolah,
      nisn: document.getElementById('malNisn').value,
      nama_siswa: document.getElementById('malNama').value,
      jenis_kelamin: document.getElementById('malJK').value,
      lanjut_ke: document.getElementById('malLanjut').value,
      nama_sekolah_lanjutan: document.getElementById('malSekolahLanjut').value,
      keterangan: document.getElementById('malKet').value,
    });
    showToast('Data alumni berhasil disimpan.', 'success');
    closeModal();
    loadAlumni();
  } catch (err) {
    showToast('Gagal menyimpan alumni: ' + err.message, 'error');
  }
}

function showModalArsip() {
  showModal(`
    <div class="modal-header">
      <h3>Tambah Arsip Pegawai</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <form onsubmit="submitArsip(event)">
      <div class="form-group"><label>Nama Pegawai</label><input type="text" class="form-control" id="marNama" required></div>
      <div class="flex gap-2">
        <div class="form-group flex-1"><label>NIP</label><input type="text" class="form-control" id="marNip"></div>
        <div class="form-group flex-1"><label>NIK</label><input type="text" class="form-control" id="marNik"></div>
      </div>
      <div class="flex gap-2">
        <div class="form-group flex-1"><label>Status Pegawai</label>
          <select class="form-control" id="marStatus"><option value="PNS">PNS</option><option value="PPPK">PPPK</option><option value="Honorer">Honorer</option><option value="Non ASN">Non ASN</option></select>
        </div>
        <div class="form-group flex-1"><label>Kategori Arsip</label>
          <select class="form-control" id="marKategori"><option value="SK PNS">SK PNS</option><option value="SK PPPK">SK PPPK</option><option value="SK Pangkat">SK Pangkat</option><option value="SK Berkala">SK Berkala</option><option value="Ijazah">Ijazah</option><option value="Sertifikat">Sertifikat</option><option value="Dokumen Lainnya">Dokumen Lainnya</option></select>
        </div>
      </div>
      <div class="flex gap-2">
        <div class="form-group flex-1"><label>Jabatan</label><input type="text" class="form-control" id="marJabatan"></div>
        <div class="form-group flex-1"><label>Golongan</label><input type="text" class="form-control" id="marGolongan"></div>
      </div>
      <div class="form-group"><label>Link File Arsip (Google Drive)</label><input type="url" class="form-control" id="marFile" placeholder="https://drive.google.com/..."></div>
      <div class="form-group"><label>Keterangan</label><input type="text" class="form-control" id="marKet"></div>
      <button type="submit" class="btn btn-primary btn-block">Simpan</button>
    </form>
  `);
}

async function submitArsip(e) {
  e.preventDefault();
  try {
    await apiPost('addArsipPegawai', {
      id_sekolah: currentUser.id_sekolah,
      nama_sekolah: currentUser.nama_sekolah,
      nama_pegawai: document.getElementById('marNama').value,
      nip: document.getElementById('marNip').value,
      nik: document.getElementById('marNik').value,
      status_pegawai: document.getElementById('marStatus').value,
      kategori: document.getElementById('marKategori').value,
      jabatan: document.getElementById('marJabatan').value,
      golongan: document.getElementById('marGolongan').value,
      file_arsip: document.getElementById('marFile').value,
      keterangan: document.getElementById('marKet').value,
    });
    showToast('Arsip pegawai berhasil disimpan.', 'success');
    closeModal();
    loadArsip();
  } catch (err) {
    showToast('Gagal menyimpan arsip: ' + err.message, 'error');
  }
}

// ============================================
// NOTIFIKASI
// ============================================
function showNotifications() {
  showModal(`
    <div class="modal-header">
      <h3>&#128276; Notifikasi</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="activity-item">
      <div class="activity-dot" style="background:var(--primary)"></div>
      <div class="activity-text">Selamat datang di Portal Pendidikan</div>
      <div class="activity-time">Baru</div>
    </div>
  `);
}

// ============================================
// TOAST
// ============================================
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ============================================
// UTILITIES
// ============================================
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getMonthShort(monthIndex) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  return months[monthIndex] || '';
}

// ============================================
// BOTTOM NAV: INFORMASI
// ============================================
// Override the data-page="informasi" click
document.addEventListener('DOMContentLoaded', () => {
  const infoBtn = document.querySelector('.bottom-nav .nav-item[data-page="informasi"]');
  if (infoBtn) {
    infoBtn.onclick = () => navigateToInformasi();
  }
});
