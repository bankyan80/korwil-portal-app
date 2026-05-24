/* ============================================
   PORTAL PENDIDIKAN TIM KERJA KECAMATAN LEMAHABANG
   Google Apps Script - Backend API
   ============================================

CARA DEPLOY:
1. Buka https://script.google.com
2. Buat project baru
3. Salin seluruh kode ini ke Code.gs
4. Ubah SPREADSHEET_ID dengan ID Google Sheet Anda
5. Klik Deploy > New Deployment > Web App
6. Set "Execute as": Me
7. Set "Who has access": Anyone
8. Deploy, salin URL Web App
9. Tempelkan URL ke Pengaturan > API URL di website

STRUKTUR GOOGLE SHEET:
Buat Google Sheet dengan sheet berikut:
users, sekolah, berita, agenda, galeri, tugas, progres_tugas,
laporan_bulanan, bup, spmb, alumni, arsip_pegawai

*/

const SPREADSHEET_ID = 'GANTI_DENGAN_ID_GOOGLE_SHEET_ANDA';

// ============================================
// HELPER FUNCTIONS
// ============================================

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

function getSheetData(name) {
  const sheet = getSheet(name);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map((row, idx) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    obj._row = idx + 2; // row number (1-based, skip header)
    return obj;
  });
}

function findRowByValue(sheetName, colName, value) {
  const data = getSheetData(sheetName);
  return data.find(r => r[colName] === value);
}

function findRowsByValue(sheetName, colName, value) {
  const data = getSheetData(sheetName);
  return data.filter(r => r[colName] === value);
}

function generateId(prefix) {
  return prefix + String(Date.now()).slice(-6) + Math.floor(Math.random() * 100);
}

function getTimestamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getUserByEmail(email) {
  if (!email) return null;
  return findRowByValue('users', 'email', email);
}

function validateUser(email) {
  const user = getUserByEmail(email);
  if (!user) return { valid: false, error: 'User tidak ditemukan.' };
  if (user.status !== 'aktif') return { valid: false, error: 'Akun tidak aktif.' };
  return { valid: true, user: user };
}

function validateOperator(email) {
  const result = validateUser(email);
  if (!result.valid) return result;
  if (result.user.role !== 'operator' && result.user.role !== 'super_admin') {
    return { valid: false, error: 'Akses ditolak. Bukan operator.' };
  }
  return result;
}

function validateSuperAdmin(email) {
  const result = validateUser(email);
  if (!result.valid) return result;
  if (result.user.role !== 'super_admin') {
    return { valid: false, error: 'Akses ditolak. Bukan Super Admin.' };
  }
  return result;
}

// ============================================
// GET ENDPOINTS
// ============================================

function handleGet(e) {
  const action = e.parameter.action;
  
  try {
    switch (action) {
      case 'checkUser': return handleCheckUser(e);
      case 'getDashboard': return handleGetDashboard(e);
      case 'getSekolah': return handleGetSekolah(e);
      case 'getBerita': return handleGetBerita(e);
      case 'getAgenda': return handleGetAgenda(e);
      case 'getGaleri': return handleGetGaleri(e);
      case 'getTugas': return handleGetTugas(e);
      case 'getTugasByUser': return handleGetTugasByUser(e);
      case 'getLaporanByUser': return handleGetLaporanByUser(e);
      case 'getRekapLaporan': return handleGetRekapLaporan(e);
      case 'getProgresTugas': return handleGetProgresTugas(e);
      case 'getBUP': return handleGetBUP(e);
      case 'getBUPByUser': return handleGetBUPByUser(e);
      case 'getSPMB': return handleGetSPMB(e);
      case 'getSPMBByUser': return handleGetSPMBByUser(e);
      case 'getAlumni': return handleGetAlumni(e);
      case 'getAlumniByUser': return handleGetAlumniByUser(e);
      case 'getArsipPegawai': return handleGetArsipPegawai(e);
      case 'getArsipPegawaiByUser': return handleGetArsipPegawaiByUser(e);
      default: return jsonResponse({ error: 'Action tidak dikenali: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: 'Server error: ' + err.message });
  }
}

// --- checkUser ---
function handleCheckUser(e) {
  const email = e.parameter.email;
  if (!email) return jsonResponse({ found: false, error: 'Email diperlukan.' });
  
  const user = getUserByEmail(email);
  if (!user) return jsonResponse({ found: false, error: 'Akun belum terdaftar.' });
  
  return jsonResponse({
    found: true,
    nama: user.nama,
    email: user.email,
    role: user.role,
    id_sekolah: user.id_sekolah,
    nama_sekolah: user.nama_sekolah,
    organisasi: user.organisasi || '',
    status: user.status,
  });
}

// --- getDashboard ---
function handleGetDashboard(e) {
  const sekolah = getSheetData('sekolah');
  const laporan = getSheetData('laporan_bulanan');
  const tugas = getSheetData('tugas');
  const progres = getSheetData('progres_tugas');
  const bup = getSheetData('bup');
  const spmb = getSheetData('spmb');
  const alumni = getSheetData('alumni');
  const arsip = getSheetData('arsip_pegawai');
  const users = getSheetData('users');
  
  const now = new Date();
  const bulanIni = String(now.getMonth() + 1).padStart(2, '0');
  const tahunIni = now.getFullYear();
  
  // Statistik
  const stats = {
    total_sekolah: sekolah.length,
    total_sd: sekolah.filter(s => s.jenjang === 'SD' || s.jenjang === 'MI').length,
    total_tk: sekolah.filter(s => s.jenjang === 'TK' || s.jenjang === 'RA').length,
    total_paud: sekolah.filter(s => s.jenjang === 'PAUD' || s.jenjang === 'KB').length,
    total_siswa: laporan.reduce((sum, l) => sum + (parseInt(l.jumlah_siswa_total) || 0), 0),
    total_guru: laporan.reduce((sum, l) => sum + (parseInt(l.jumlah_guru) || 0), 0),
    total_tendik: laporan.reduce((sum, l) => sum + (parseInt(l.jumlah_tendik) || 0), 0),
    laporan_bulan_ini: laporan.filter(l => l.bulan === bulanIni && parseInt(l.tahun) === tahunIni).length,
    tugas_aktif: tugas.filter(t => t.status === 'aktif').length,
    tugas_selesai: progres.filter(p => p.status_pengerjaan === 'selesai').length,
    total_bup: bup.length,
    total_spmb: spmb.length,
    total_alumni: alumni.length,
    total_arsip: arsip.length,
    total_operator: users.filter(u => u.role === 'operator').length,
  };
  
  // Laporan status
  const laporanBulanIni = laporan.filter(l => l.bulan === bulanIni && parseInt(l.tahun) === tahunIni);
  const laporan_status = {
    selesai: laporanBulanIni.filter(l => l.status_laporan === 'sudah').length,
    proses: laporanBulanIni.filter(l => l.status_laporan === 'proses').length,
    belum: Math.max(0, sekolah.length - laporanBulanIni.length),
  };
  
  // Progres tugas per sekolah
  const tugasAktif = tugas.filter(t => t.status === 'aktif');
  const progresTugas = sekolah.map(s => {
    const progresSekolah = progres.filter(p => p.id_sekolah === s.id_sekolah);
    const selesai = progresSekolah.filter(p => p.status_pengerjaan === 'selesai').length;
    const total = tugasAktif.length || 1;
    return {
      nama_sekolah: s.nama_sekolah,
      persentase: Math.round(selesai / total * 100),
    };
  });
  
  // BUP ringkas
  const bup_ringkas = {
    mendekati: bup.filter(b => parseInt(b.sisa_hari) > 0 && parseInt(b.sisa_hari) <= 365).length,
    segera: bup.filter(b => parseInt(b.sisa_hari) > 0 && parseInt(b.sisa_hari) <= 180).length,
    sudah: bup.filter(b => parseInt(b.sisa_hari) <= 0).length,
  };
  
  // SPMB ringkas
  const spmb_ringkas = {
    pendaftar: spmb.length,
    terverifikasi: spmb.filter(s => s.status_verifikasi === 'Terverifikasi').length,
    diterima: spmb.filter(s => s.status_diterima === 'Diterima').length,
  };
  
  // Alumni ringkas
  const alumni_ringkas = {
    tahun_ini: alumni.filter(a => parseInt(a.tahun_lulus) === tahunIni).length,
    total: alumni.length,
  };
  
  // Arsip ringkas
  const arsip_ringkas = {
    pns: arsip.filter(a => a.status_pegawai === 'PNS').length,
    pppk: arsip.filter(a => a.status_pegawai === 'PPPK').length,
    honorer: arsip.filter(a => a.status_pegawai === 'Honorer' || a.status_pegawai === 'Non ASN').length,
  };
  
  return jsonResponse({
    stats: stats,
    laporan_status: laporan_status,
    progres_tugas: progresTugas,
    bup_ringkas: bup_ringkas,
    spmb_ringkas: spmb_ringkas,
    alumni_ringkas: alumni_ringkas,
    arsip_ringkas: arsip_ringkas,
  });
}

// --- getSekolah ---
function handleGetSekolah(e) {
  const data = getSheetData('sekolah');
  return jsonResponse({ data: data });
}

// --- getBerita ---
function handleGetBerita(e) {
  const data = getSheetData('berita');
  const filtered = data.filter(b => b.status === 'publish' || b.status === 'aktif');
  return jsonResponse({ data: filtered.reverse() });
}

// --- getAgenda ---
function handleGetAgenda(e) {
  const data = getSheetData('agenda');
  const filtered = data.filter(a => a.status === 'aktif');
  return jsonResponse({ data: filtered.reverse() });
}

// --- getGaleri ---
function handleGetGaleri(e) {
  const data = getSheetData('galeri');
  const filtered = data.filter(g => g.status === 'aktif');
  return jsonResponse({ data: filtered.reverse() });
}

// --- getTugas ---
function handleGetTugas(e) {
  const data = getSheetData('tugas');
  return jsonResponse({ data: data.reverse() });
}

// --- getTugasByUser ---
function handleGetTugasByUser(e) {
  const email = e.parameter.email;
  const validation = validateOperator(email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  const tugas = getSheetData('tugas');
  const progres = getSheetData('progres_tugas');
  const userSekolah = validation.user.id_sekolah;
  
  // Filter tugas sesuai jenjang/sekolah operator
  const userTugas = tugas.filter(t => {
    if (t.status !== 'aktif') return false;
    if (!t.jenjang || t.jenjang === '') return true;
    // Cek apakah operator punya tugas ini
    return true; // Semua tugas aktif untuk operator
  });
  
  // Gabungkan dengan progres
  const result = userTugas.map(t => {
    const prog = progres.find(p => p.id_tugas === t.id_tugas && p.id_sekolah === userSekolah);
    return {
      ...t,
      status_pengerjaan: prog ? prog.status_pengerjaan : 'belum dikerjakan',
    };
  });
  
  return jsonResponse({ data: result });
}

// --- getLaporanByUser ---
function handleGetLaporanByUser(e) {
  const email = e.parameter.email;
  const validation = validateOperator(email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  const laporan = getSheetData('laporan_bulanan');
  const userLaporan = laporan.filter(l => l.id_sekolah === validation.user.id_sekolah);
  
  return jsonResponse({ data: userLaporan });
}

// --- getRekapLaporan ---
function handleGetRekapLaporan(e) {
  const data = getSheetData('laporan_bulanan');
  return jsonResponse({ data: data });
}

// --- getProgresTugas ---
function handleGetProgresTugas(e) {
  const tugas = getSheetData('tugas');
  const progres = getSheetData('progres_tugas');
  const sekolah = getSheetData('sekolah');
  const tugasAktif = tugas.filter(t => t.status === 'aktif');
  const totalTugas = tugasAktif.length || 1;
  
  const result = sekolah.map(s => {
    const progSekolah = progres.filter(p => p.id_sekolah === s.id_sekolah);
    const selesai = progSekolah.filter(p => p.status_pengerjaan === 'selesai').length;
    return {
      nama_sekolah: s.nama_sekolah,
      id_sekolah: s.id_sekolah,
      persentase: Math.round(selesai / totalTugas * 100),
    };
  });
  
  return jsonResponse({ data: result });
}

// --- getBUP ---
function handleGetBUP(e) {
  const data = getSheetData('bup');
  // Hitung ulang sisa hari
  const now = new Date();
  const result = data.map(b => {
    const tmt = new Date(b.tmt_pensiun);
    const sisa = Math.ceil((tmt - now) / (1000 * 60 * 60 * 24));
    return { ...b, sisa_hari: sisa };
  });
  return jsonResponse({ data: result });
}

// --- getBUPByUser ---
function handleGetBUPByUser(e) {
  const email = e.parameter.email;
  const validation = validateOperator(email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  const data = getSheetData('bup');
  const now = new Date();
  const filtered = data.filter(b => b.id_sekolah === validation.user.id_sekolah)
    .map(b => {
      const tmt = new Date(b.tmt_pensiun);
      const sisa = Math.ceil((tmt - now) / (1000 * 60 * 60 * 24));
      return { ...b, sisa_hari: sisa };
    });
  
  return jsonResponse({ data: filtered });
}

// --- getSPMB ---
function handleGetSPMB(e) {
  const data = getSheetData('spmb');
  return jsonResponse({ data: data });
}

// --- getSPMBByUser ---
function handleGetSPMBByUser(e) {
  const email = e.parameter.email;
  const validation = validateOperator(email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  const data = getSheetData('spmb');
  const filtered = data.filter(s => s.id_sekolah === validation.user.id_sekolah);
  
  return jsonResponse({ data: filtered });
}

// --- getAlumni ---
function handleGetAlumni(e) {
  const data = getSheetData('alumni');
  return jsonResponse({ data: data });
}

// --- getAlumniByUser ---
function handleGetAlumniByUser(e) {
  const email = e.parameter.email;
  const validation = validateOperator(email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  const data = getSheetData('alumni');
  const filtered = data.filter(a => a.id_sekolah === validation.user.id_sekolah);
  
  return jsonResponse({ data: filtered });
}

// --- getArsipPegawai ---
function handleGetArsipPegawai(e) {
  const data = getSheetData('arsip_pegawai');
  return jsonResponse({ data: data });
}

// --- getArsipPegawaiByUser ---
function handleGetArsipPegawaiByUser(e) {
  const email = e.parameter.email;
  const validation = validateOperator(email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  const data = getSheetData('arsip_pegawai');
  const filtered = data.filter(a => a.id_sekolah === validation.user.id_sekolah);
  
  return jsonResponse({ data: filtered });
}

// ============================================
// POST ENDPOINTS
// ============================================

function handlePost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: 'Payload tidak valid.' });
  }
  
  const action = payload.action;
  
  try {
    switch (action) {
      case 'addUser': return handleAddUser(payload);
      case 'updateUser': return handleUpdateUser(payload);
      case 'disableUser': return handleDisableUser(payload);
      
      case 'addSekolah': return handleAddSekolah(payload);
      case 'updateSekolah': return handleUpdateSekolah(payload);
      
      case 'addBerita': return handleAddBerita(payload);
      case 'updateBerita': return handleUpdateBerita(payload);
      case 'deleteBerita': return handleDeleteBerita(payload);
      
      case 'addAgenda': return handleAddAgenda(payload);
      case 'updateAgenda': return handleUpdateAgenda(payload);
      case 'deleteAgenda': return handleDeleteAgenda(payload);
      
      case 'addGaleri': return handleAddGaleri(payload);
      case 'updateGaleri': return handleUpdateGaleri(payload);
      case 'deleteGaleri': return handleDeleteGaleri(payload);
      
      case 'addTugas': return handleAddTugas(payload);
      case 'updateTugas': return handleUpdateTugas(payload);
      case 'submitProgresTugas': return handleSubmitProgresTugas(payload);
      
      case 'submitLaporanBulanan': return handleSubmitLaporanBulanan(payload);
      
      case 'addBUP': return handleAddBUP(payload);
      case 'updateBUP': return handleUpdateBUP(payload);
      case 'deleteBUP': return handleDeleteBUP(payload);
      
      case 'addSPMB': return handleAddSPMB(payload);
      case 'updateSPMB': return handleUpdateSPMB(payload);
      case 'deleteSPMB': return handleDeleteSPMB(payload);
      
      case 'addAlumni': return handleAddAlumni(payload);
      case 'updateAlumni': return handleUpdateAlumni(payload);
      case 'deleteAlumni': return handleDeleteAlumni(payload);
      
      case 'addArsipPegawai': return handleAddArsipPegawai(payload);
      case 'updateArsipPegawai': return handleUpdateArsipPegawai(payload);
      case 'deleteArsipPegawai': return handleDeleteArsipPegawai(payload);
      
      default: return jsonResponse({ error: 'Action tidak dikenali: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: 'Server error: ' + err.message });
  }
}

// ============================================
// WRITE OPERATIONS
// ============================================

// --- User Management ---
function handleAddUser(p) {
  const validation = validateSuperAdmin(p.email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('users');
    const ts = getTimestamp();
    const idUser = generateId('USR');
    
    sheet.appendRow([
      idUser, p.email, p.nama, p.role, p.id_sekolah || '', p.nama_sekolah || '',
      p.organisasi || '', 'aktif', ts, ts
    ]);
    
    return jsonResponse({ success: true, id_user: idUser });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateUser(p) {
  const validation = validateSuperAdmin(p.email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const user = findRowByValue('users', 'email', p.target_email);
    if (!user) return jsonResponse({ error: 'User tidak ditemukan.' });
    
    const sheet = getSheet('users');
    const ts = getTimestamp();
    
    if (p.nama) sheet.getRange(user._row, 3).setValue(p.nama);
    if (p.role) sheet.getRange(user._row, 4).setValue(p.role);
    if (p.id_sekolah) sheet.getRange(user._row, 5).setValue(p.id_sekolah);
    if (p.nama_sekolah) sheet.getRange(user._row, 6).setValue(p.nama_sekolah);
    if (p.organisasi) sheet.getRange(user._row, 7).setValue(p.organisasi);
    sheet.getRange(user._row, 10).setValue(ts);
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDisableUser(p) {
  const validation = validateSuperAdmin(p.email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const user = findRowByValue('users', 'email', p.target_email);
    if (!user) return jsonResponse({ error: 'User tidak ditemukan.' });
    
    const sheet = getSheet('users');
    sheet.getRange(user._row, 8).setValue('nonaktif');
    sheet.getRange(user._row, 10).setValue(getTimestamp());
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// --- Sekolah ---
function handleAddSekolah(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('sekolah');
    const idSekolah = generateId('SK');
    
    sheet.appendRow([
      idSekolah, p.npsn || '', p.nama_sekolah, p.jenjang || '', p.desa || '',
      p.alamat || '', p.kepala_sekolah || '', p.operator || '', p.email_operator || '',
      p.no_wa || '', 'aktif'
    ]);
    
    return jsonResponse({ success: true, id_sekolah: idSekolah });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateSekolah(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sekolah = findRowByValue('sekolah', 'id_sekolah', p.id_sekolah);
    if (!sekolah) return jsonResponse({ error: 'Sekolah tidak ditemukan.' });
    
    const sheet = getSheet('sekolah');
    if (p.npsn) sheet.getRange(sekolah._row, 2).setValue(p.npsn);
    if (p.nama_sekolah) sheet.getRange(sekolah._row, 3).setValue(p.nama_sekolah);
    if (p.jenjang) sheet.getRange(sekolah._row, 4).setValue(p.jenjang);
    if (p.desa) sheet.getRange(sekolah._row, 5).setValue(p.desa);
    if (p.alamat) sheet.getRange(sekolah._row, 6).setValue(p.alamat);
    if (p.kepala_sekolah) sheet.getRange(sekolah._row, 7).setValue(p.kepala_sekolah);
    if (p.operator) sheet.getRange(sekolah._row, 8).setValue(p.operator);
    if (p.email_operator) sheet.getRange(sekolah._row, 9).setValue(p.email_operator);
    if (p.no_wa) sheet.getRange(sekolah._row, 10).setValue(p.no_wa);
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// --- Berita ---
function handleAddBerita(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('berita');
    const ts = getTimestamp();
    const id = generateId('BR');
    
    sheet.appendRow([
      id, p.tanggal || ts.split(' ')[0], p.judul, p.isi || '', p.gambar || '',
      p.kategori || '', p.status || 'draft', p.created_by || '', ts, ts
    ]);
    
    return jsonResponse({ success: true, id_berita: id });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateBerita(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('berita', 'id_berita', p.id_berita);
    if (!item) return jsonResponse({ error: 'Berita tidak ditemukan.' });
    
    const sheet = getSheet('berita');
    const ts = getTimestamp();
    
    if (p.judul) sheet.getRange(item._row, 3).setValue(p.judul);
    if (p.isi) sheet.getRange(item._row, 4).setValue(p.isi);
    if (p.gambar) sheet.getRange(item._row, 5).setValue(p.gambar);
    if (p.kategori) sheet.getRange(item._row, 6).setValue(p.kategori);
    if (p.status) sheet.getRange(item._row, 7).setValue(p.status);
    sheet.getRange(item._row, 10).setValue(ts);
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteBerita(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('berita', 'id_berita', p.id_berita);
    if (!item) return jsonResponse({ error: 'Berita tidak ditemukan.' });
    
    const sheet = getSheet('berita');
    sheet.deleteRow(item._row);
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// --- Agenda ---
function handleAddAgenda(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('agenda');
    const ts = getTimestamp();
    const id = generateId('AG');
    
    sheet.appendRow([
      id, p.tanggal || ts.split(' ')[0], p.jam || '', p.nama_kegiatan,
      p.lokasi || '', p.keterangan || '', p.status || 'aktif', p.created_by || '', ts, ts
    ]);
    
    return jsonResponse({ success: true, id_agenda: id });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateAgenda(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('agenda', 'id_agenda', p.id_agenda);
    if (!item) return jsonResponse({ error: 'Agenda tidak ditemukan.' });
    
    const sheet = getSheet('agenda');
    if (p.nama_kegiatan) sheet.getRange(item._row, 4).setValue(p.nama_kegiatan);
    if (p.lokasi) sheet.getRange(item._row, 5).setValue(p.lokasi);
    if (p.keterangan) sheet.getRange(item._row, 6).setValue(p.keterangan);
    sheet.getRange(item._row, 10).setValue(getTimestamp());
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteAgenda(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('agenda', 'id_agenda', p.id_agenda);
    if (!item) return jsonResponse({ error: 'Agenda tidak ditemukan.' });
    
    getSheet('agenda').deleteRow(item._row);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// --- Galeri ---
function handleAddGaleri(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('galeri');
    const ts = getTimestamp();
    const id = generateId('GL');
    
    sheet.appendRow([
      id, p.tanggal || ts.split(' ')[0], p.judul, p.gambar || '', p.kategori || '',
      p.organisasi || '', p.status || 'aktif', p.created_by || '', ts, ts
    ]);
    
    return jsonResponse({ success: true, id_galeri: id });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateGaleri(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('galeri', 'id_galeri', p.id_galeri);
    if (!item) return jsonResponse({ error: 'Galeri tidak ditemukan.' });
    
    const sheet = getSheet('galeri');
    if (p.judul) sheet.getRange(item._row, 3).setValue(p.judul);
    if (p.gambar) sheet.getRange(item._row, 4).setValue(p.gambar);
    sheet.getRange(item._row, 10).setValue(getTimestamp());
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteGaleri(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('galeri', 'id_galeri', p.id_galeri);
    if (!item) return jsonResponse({ error: 'Galeri tidak ditemukan.' });
    
    getSheet('galeri').deleteRow(item._row);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// --- Tugas ---
function handleAddTugas(p) {
  const validation = validateSuperAdmin(p.created_by);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('tugas');
    const ts = getTimestamp();
    const id = generateId('TG');
    
    sheet.appendRow([
      id, p.tanggal || ts.split(' ')[0], p.judul_tugas, p.deskripsi || '',
      p.jenjang || '', p.target || '', p.link_tugas || '', p.batas_waktu || '',
      p.status || 'aktif', p.created_by, ts, ts
    ]);
    
    return jsonResponse({ success: true, id_tugas: id });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateTugas(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('tugas', 'id_tugas', p.id_tugas);
    if (!item) return jsonResponse({ error: 'Tugas tidak ditemukan.' });
    
    const sheet = getSheet('tugas');
    if (p.judul_tugas) sheet.getRange(item._row, 3).setValue(p.judul_tugas);
    if (p.deskripsi) sheet.getRange(item._row, 4).setValue(p.deskripsi);
    if (p.status) sheet.getRange(item._row, 9).setValue(p.status);
    sheet.getRange(item._row, 12).setValue(getTimestamp());
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// --- Progres Tugas ---
function handleSubmitProgresTugas(p) {
  const validation = validateOperator(p.email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  // Validasi id_sekolah cocok
  if (p.id_sekolah !== validation.user.id_sekolah) {
    return jsonResponse({ error: 'Anda tidak memiliki akses ke sekolah ini.' });
  }
  
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('progres_tugas');
    const ts = getTimestamp();
    
    // Cek apakah sudah ada progres
    const existing = getSheetData('progres_tugas');
    const found = existing.find(r => r.id_tugas === p.id_tugas && r.id_sekolah === p.id_sekolah);
    
    if (found) {
      // Update
      if (p.status_pengerjaan) sheet.getRange(found._row, 4).setValue(p.status_pengerjaan);
      sheet.getRange(found._row, 5).setValue(ts.split(' ')[0]);
      if (p.keterangan) sheet.getRange(found._row, 6).setValue(p.keterangan);
      sheet.getRange(found._row, 8).setValue(ts);
    } else {
      // Insert
      const idProgres = generateId('PR');
      sheet.appendRow([
        idProgres, p.id_tugas, p.id_sekolah, p.status_pengerjaan || 'belum dikerjakan',
        ts.split(' ')[0], p.keterangan || '', ts, ts
      ]);
    }
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// --- Laporan Bulanan ---
function handleSubmitLaporanBulanan(p) {
  const validation = validateOperator(p.email);
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  // Validasi id_sekolah cocok
  if (p.id_sekolah !== validation.user.id_sekolah) {
    return jsonResponse({ error: 'Anda tidak memiliki akses ke sekolah ini.' });
  }
  
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('laporan_bulanan');
    const ts = getTimestamp();
    const id = generateId('LP');
    
    sheet.appendRow([
      id, p.bulan, p.tahun, p.id_sekolah, p.nama_sekolah,
      p.jumlah_siswa_l || 0, p.jumlah_siswa_p || 0, p.jumlah_siswa_total || 0,
      p.jumlah_guru || 0, p.jumlah_tendik || 0, p.jumlah_rombel || 0,
      p.kondisi_sarpras || '', 'sudah', ts.split(' ')[0], ts, ts
    ]);
    
    return jsonResponse({ success: true, id_laporan: id });
  } finally {
    lock.releaseLock();
  }
}

// --- BUP ---
function handleAddBUP(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('bup');
    const ts = getTimestamp();
    const id = generateId('BP');
    const tmt = new Date(p.tmt_pensiun);
    const now = new Date();
    const sisa = Math.ceil((tmt - now) / (1000 * 60 * 60 * 24));
    
    sheet.appendRow([
      id, p.id_sekolah, p.nama_sekolah, p.nama_pegawai, p.nip || '',
      p.jabatan || '', p.status_pegawai || '', p.tanggal_lahir || '', p.tmt_pensiun,
      sisa, p.keterangan || '', p.status || 'aktif', ts, ts
    ]);
    
    return jsonResponse({ success: true, id_bup: id });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateBUP(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('bup', 'id_bup', p.id_bup);
    if (!item) return jsonResponse({ error: 'Data BUP tidak ditemukan.' });
    
    const sheet = getSheet('bup');
    if (p.nama_pegawai) sheet.getRange(item._row, 4).setValue(p.nama_pegawai);
    if (p.jabatan) sheet.getRange(item._row, 6).setValue(p.jabatan);
    if (p.keterangan) sheet.getRange(item._row, 11).setValue(p.keterangan);
    sheet.getRange(item._row, 14).setValue(getTimestamp());
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteBUP(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('bup', 'id_bup', p.id_bup);
    if (!item) return jsonResponse({ error: 'Data BUP tidak ditemukan.' });
    
    getSheet('bup').deleteRow(item._row);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// --- SPMB ---
function handleAddSPMB(p) {
  const validation = validateOperator(p.email || '');
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  if (p.id_sekolah !== validation.user.id_sekolah) {
    return jsonResponse({ error: 'Anda tidak memiliki akses ke sekolah ini.' });
  }
  
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('spmb');
    const ts = getTimestamp();
    const id = generateId('SP');
    
    // Hitung usia
    let usia = '';
    if (p.tanggal_lahir) {
      const birthDate = new Date(p.tanggal_lahir);
      const now = new Date();
      usia = Math.floor((now - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    }
    
    sheet.appendRow([
      id, p.tahun_ajaran, p.id_sekolah, p.nama_sekolah,
      p.nik || '', p.nisn || '', p.nama_siswa, p.tanggal_lahir || '', usia,
      p.jenis_kelamin || '', p.alamat || '', p.nama_ortu || '', p.no_hp || '',
      p.jalur_pendaftaran || '', 'Belum', 'Belum', ts, ts
    ]);
    
    return jsonResponse({ success: true, id_spmb: id });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateSPMB(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('spmb', 'id_spmb', p.id_spmb);
    if (!item) return jsonResponse({ error: 'Data SPMB tidak ditemukan.' });
    
    const sheet = getSheet('spmb');
    if (p.status_verifikasi) sheet.getRange(item._row, 15).setValue(p.status_verifikasi);
    if (p.status_diterima) sheet.getRange(item._row, 16).setValue(p.status_diterima);
    sheet.getRange(item._row, 18).setValue(getTimestamp());
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteSPMB(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('spmb', 'id_spmb', p.id_spmb);
    if (!item) return jsonResponse({ error: 'Data SPMB tidak ditemukan.' });
    
    getSheet('spmb').deleteRow(item._row);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// --- Alumni ---
function handleAddAlumni(p) {
  const validation = validateOperator(p.email || '');
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  if (p.id_sekolah !== validation.user.id_sekolah) {
    return jsonResponse({ error: 'Anda tidak memiliki akses ke sekolah ini.' });
  }
  
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('alumni');
    const ts = getTimestamp();
    const id = generateId('AL');
    
    sheet.appendRow([
      id, p.tahun_lulus, p.id_sekolah, p.nama_sekolah,
      p.nisn || '', p.nama_siswa, p.jenis_kelamin || '', p.tanggal_lahir || '',
      p.lanjut_ke || '', p.nama_sekolah_lanjutan || '', p.keterangan || '', ts, ts
    ]);
    
    return jsonResponse({ success: true, id_alumni: id });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateAlumni(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('alumni', 'id_alumni', p.id_alumni);
    if (!item) return jsonResponse({ error: 'Data alumni tidak ditemukan.' });
    
    const sheet = getSheet('alumni');
    if (p.nama_siswa) sheet.getRange(item._row, 6).setValue(p.nama_siswa);
    if (p.keterangan) sheet.getRange(item._row, 11).setValue(p.keterangan);
    sheet.getRange(item._row, 13).setValue(getTimestamp());
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteAlumni(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('alumni', 'id_alumni', p.id_alumni);
    if (!item) return jsonResponse({ error: 'Data alumni tidak ditemukan.' });
    
    getSheet('alumni').deleteRow(item._row);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// --- Arsip Pegawai ---
function handleAddArsipPegawai(p) {
  const validation = validateOperator(p.email || '');
  if (!validation.valid) return jsonResponse({ error: validation.error });
  
  if (p.id_sekolah !== validation.user.id_sekolah) {
    return jsonResponse({ error: 'Anda tidak memiliki akses ke sekolah ini.' });
  }
  
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const sheet = getSheet('arsip_pegawai');
    const ts = getTimestamp();
    const id = generateId('AR');
    
    sheet.appendRow([
      id, p.id_sekolah, p.nama_sekolah, p.nama_pegawai, p.nip || '',
      p.nik || '', p.status_pegawai || '', p.kategori || '', p.jabatan || '',
      p.golongan || '', p.tmt || '', p.file_arsip || '', p.keterangan || '', ts, ts
    ]);
    
    return jsonResponse({ success: true, id_arsip: id });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateArsipPegawai(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('arsip_pegawai', 'id_arsip', p.id_arsip);
    if (!item) return jsonResponse({ error: 'Arsip tidak ditemukan.' });
    
    const sheet = getSheet('arsip_pegawai');
    if (p.nama_pegawai) sheet.getRange(item._row, 4).setValue(p.nama_pegawai);
    if (p.kategori) sheet.getRange(item._row, 8).setValue(p.kategori);
    if (p.file_arsip) sheet.getRange(item._row, 12).setValue(p.file_arsip);
    if (p.keterangan) sheet.getRange(item._row, 13).setValue(p.keterangan);
    sheet.getRange(item._row, 15).setValue(getTimestamp());
    
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteArsipPegawai(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  try {
    const item = findRowByValue('arsip_pegawai', 'id_arsip', p.id_arsip);
    if (!item) return jsonResponse({ error: 'Arsip tidak ditemukan.' });
    
    getSheet('arsip_pegawai').deleteRow(item._row);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

// ============================================
// MAIN HANDLER
// ============================================

function doGet(e) {
  return handleGet(e);
}

function doPost(e) {
  return handlePost(e);
}
