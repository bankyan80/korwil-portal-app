# Portal Pendidikan Tim Kerja Kecamatan Lemahabang

Portal Pendidikan digital untuk mengelola data pendidikan, laporan, tugas operator, BUP, SPMB, alumni, dan arsip pegawai di Kecamatan Lemahabang Kabupaten Cirebon.

## Struktur File

```
/index.html              - Halaman utama (SPA)
/assets/logo-kabupaten-cirebon.png  - Logo Kabupaten Cirebon
/assets/favicon.png      - Favicon
/assets/style.css        - Stylesheet
/assets/app.js           - Logic JavaScript
/google-apps-script.js   - Kode backend Google Apps Script
/README.md               - Dokumentasi
```

## Teknologi

- **Frontend**: HTML, CSS, JavaScript murni (tanpa framework)
- **Backend**: Google Apps Script Web App
- **Database**: Google Sheet
- **Login**: Firebase Authentication (Google Login saja)
- **Deploy**: Vercel (via GitHub)
- **Domain**: portalkorwil.online

---

## Panduan Setup

### 1. Buat Google Sheet

1. Buka [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru
2. Beri nama: **Portal Pendidikan Lemahabang**
3. Buat sheet-sheet berikut dengan header baris pertama:

#### Sheet: users
| id_user | email | nama | role | id_sekolah | nama_sekolah | organisasi | status | created_at | updated_at |
|---------|-------|------|------|------------|--------------|------------|--------|------------|------------|

#### Sheet: sekolah
| id_sekolah | npsn | nama_sekolah | jenjang | desa | alamat | kepala_sekolah | operator | email_operator | no_wa | status |
|------------|------|-------------|---------|------|--------|---------------|----------|---------------|-------|--------|

#### Sheet: berita
| id_berita | tanggal | judul | isi | gambar | kategori | status | created_by | created_at | updated_at |
|-----------|---------|-------|-----|--------|----------|--------|------------|------------|------------|

#### Sheet: agenda
| id_agenda | tanggal | jam | nama_kegiatan | lokasi | keterangan | status | created_by | created_at | updated_at |
|-----------|---------|-----|---------------|--------|------------|--------|------------|------------|------------|

#### Sheet: galeri
| id_galeri | tanggal | judul | gambar | kategori | organisasi | status | created_by | created_at | updated_at |
|-----------|---------|-------|--------|----------|------------|--------|------------|------------|------------|

#### Sheet: tugas
| id_tugas | tanggal | judul_tugas | deskripsi | jenjang | target | link_tugas | batas_waktu | status | created_by | created_at | updated_at |
|----------|---------|-------------|-----------|---------|--------|------------|-------------|--------|------------|------------|------------|

#### Sheet: progres_tugas
| id_progres | id_tugas | id_sekolah | status_pengerjaan | tanggal_kirim | keterangan | created_at | updated_at |
|------------|----------|------------|-------------------|---------------|------------|------------|------------|

**Catatan**: Kolom `nama_sekolah` ditambahkan setelah `id_sekolah` untuk memudahkan pembacaan.

#### Sheet: laporan_bulanan
| id_laporan | bulan | tahun | id_sekolah | nama_sekolah | jumlah_siswa_l | jumlah_siswa_p | jumlah_siswa_total | jumlah_guru | jumlah_tendik | jumlah_rombel | kondisi_sarpras | status_laporan | tanggal_kirim | created_at | updated_at |
|------------|-------|-------|------------|--------------|---------------|---------------|-------------------|-------------|---------------|---------------|----------------|----------------|---------------|------------|------------|

#### Sheet: bup
| id_bup | id_sekolah | nama_sekolah | nama_pegawai | nip | jabatan | status_pegawai | tanggal_lahir | tmt_pensiun | sisa_hari | keterangan | status | created_at | updated_at |
|--------|------------|--------------|-------------|-----|---------|---------------|--------------|-------------|-----------|------------|--------|------------|------------|

#### Sheet: spmb
| id_spmb | tahun_ajaran | id_sekolah | nama_sekolah | nik | nisn | nama_siswa | tanggal_lahir | usia | jenis_kelamin | alamat | nama_ortu | no_hp | jalur_pendaftaran | status_verifikasi | status_diterima | created_at | updated_at |
|---------|-------------|------------|--------------|-----|------|-----------|--------------|------|--------------|--------|----------|-------|-------------------|-------------------|-----------------|------------|------------|

#### Sheet: alumni
| id_alumni | tahun_lulus | id_sekolah | nama_sekolah | nisn | nama_siswa | jenis_kelamin | tanggal_lahir | lanjut_ke | nama_sekolah_lanjutan | keterangan | created_at | updated_at |
|-----------|------------|------------|--------------|------|-----------|--------------|--------------|-----------|----------------------|------------|------------|------------|

#### Sheet: arsip_pegawai
| id_arsip | id_sekolah | nama_sekolah | nama_pegawai | nip | nik | status_pegawai | kategori | jabatan | golongan | tmt | file_arsip | keterangan | created_at | updated_at |
|----------|------------|--------------|-------------|-----|-----|---------------|----------|---------|----------|-----|-----------|------------|------------|------------|

4. Salin **Spreadsheet ID** dari URL:
   - URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Salin bagian `SPREADSHEET_ID`

### 2. Contoh Data Awal

Tambahkan data berikut ke masing-masing sheet:

**users:**
```
USR001 | admin@gmail.com | Super Admin | super_admin | ALL | Semua Sekolah | | aktif | 2026-01-01 | 2026-01-01
USR002 | operator.sdn1@gmail.com | Operator SDN 1 Lemahabang | operator | SD001 | SDN 1 Lemahabang | | aktif | 2026-01-01 | 2026-01-01
```

**sekolah:**
```
SD001 | 20210001 | SDN 1 Lemahabang | SD | Lemahabang | Jl. Raya Lemahabang | Budi Santoso | Operator SDN 1 | operator.sdn1@gmail.com | 081234567890 | aktif
SD002 | 20210002 | SDN 2 Lemahabang | SD | Lemahabang | Jl. Merdeka | Siti Aminah | Operator SDN 2 | operator.sdn2@gmail.com | 081234567891 | aktif
TK001 | 20210003 | TK Al-Hikmah | TK | Lemahabang | Jl. Pendidikan | Dewi Lestari | Operator TK | operator.tk@gmail.com | 081234567892 | aktif
```

### 3. Setup Firebase Authentication

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Klik **Add Project** / **Buat Project**
3. Beri nama project, misal: `portal-pendidikan-lemahabang`
4. Nonaktifkan Google Analytics (tidak diperlukan)
5. Klik **Create Project**
6. Di dashboard, buka **Authentication** (Build > Authentication)
7. Klik **Get Started**
8. Di tab **Sign-in method**, aktifkan **Google**:
   - Klik Google
   - Enable: **On**
   - Isi Project support email
   - Klik **Save**
9. Buka **Project Settings** (ikon gear > Project settings)
10. Salin konfigurasi berikut:
    - **API Key**
    - **Project ID**

Masukkan konfigurasi ini ke website melalui menu **Pengaturan** > Firebase Config, atau edit langsung di file `app.js` pada bagian `firebaseConfig`.

### 4. Setup Google Apps Script

1. Buka [Google Apps Script](https://script.google.com)
2. Klik **New Project**
3. Hapus kode default, salin seluruh isi file `google-apps-script.js`
4. Ubah baris berikut:
   ```javascript
   const SPREADSHEET_ID = 'GANTI_DENGAN_ID_GOOGLE_SHEET_ANDA';
   ```
   Ganti dengan Spreadsheet ID yang sudah disalin.
5. Klik **Deploy** > **New Deployment**
6. Pilih tipe: **Web App**
7. Set:
   - **Execute as**: Me
   - **Who has access**: Anyone
8. Klik **Deploy**
9. Beri izin akses ke Google Sheets jika diminta
10. **Salin URL Web App** yang muncul

Masukkan URL ini ke website melalui menu **Pengaturan** > API URL, atau edit langsung di file `app.js` pada bagian `CONFIG.API_URL`.

### 5. Deploy ke Vercel via GitHub

1. Buat repository baru di GitHub:
   - Nama: `portalkorwil`
   - Set **Public**
   - Jangan centau Add README
2. Upload file-file proyek ke repository:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/USERNAME/portalkorwil.git
   git push -u origin main
   ```
3. Buka [Vercel](https://vercel.com)
4. Klik **Add New** > **Project**
5. Import repository GitHub `portalkorwil`
6. Framework Preset: **Other**
7. Klik **Deploy**
8. Tunggu hingga selesai, salin URL deployment

### 6. Setting Domain portalkorwil.online

1. Di Vercel dashboard, buka project
2. Buka **Settings** > **Domains**
3. Tambahkan domain: `portalkorwil.online`
4. Tambahkan juga: `www.portalkorwil.online`
5. Vercel akan memberikan DNS records yang harus ditambahkan:
   - **A Record**: `76.76.21.21` (ke @)
   - **CNAME**: `cname.vercel-dns.com` (ke www)
6. Login ke panel DNS domain Anda
7. Tambahkan DNS records sesuai petunjuk Vercel
8. Tunggu propagasi DNS (biasanya 5-30 menit, maksimal 48 jam)
9. Setelah domain aktif, Vercel akan otomatis memberikan SSL

---

## Panduan Testing

### Test 1: Login Super Admin
1. Buka website
2. Klik menu **Login**
3. Klik **Masuk dengan Google**
4. Login dengan email `admin@gmail.com`
5. Pastikan: halaman konfirmasi muncul, role "Super Admin"
6. Klik **Masuk Dashboard**
7. Pastikan: Dashboard Super Admin muncul dengan semua menu

### Test 2: Login Operator
1. Login dengan email `operator.sdn1@gmail.com`
2. Pastikan: role "Operator", sekolah "SDN 1 Lemahabang"
3. Pastikan: Dashboard Operator muncul
4. Pastikan: hanya data SDN 1 Lemahabang yang terlihat

### Test 3: Akun Tidak Terdaftar
1. Login dengan email Google yang tidak ada di sheet "users"
2. Pastikan: muncul pesan "Akun Anda belum terdaftar sebagai pengguna Portal Pendidikan Kecamatan Lemahabang."
3. Pastikan: user tidak masuk ke dashboard

### Test 4: Akun Nonaktif
1. Di Google Sheet, ubah status user menjadi "nonaktif"
2. Login dengan email tersebut
3. Pastikan: muncul pesan "Akun Anda belum aktif. Hubungi Super Admin."

### Test 5: Operator Hanya Melihat Sekolahnya
1. Login sebagai operator
2. Buka menu BUP, SPMB, Alumni, Arsip
3. Pastikan: semua data yang tampil hanya dari sekolah operator tersebut
4. Coba ubah `id_sekolah` di localStorage melalui inspect element
5. Pastikan: data tetap terfilter berdasarkan email operator (validasi di backend)

### Test 6: Super Admin Melihat Semua Data
1. Login sebagai super_admin
2. Buka semua menu
3. Pastikan: semua data dari semua sekolah terlihat

---

## Panduan Audit Jika Data Tidak Muncul

1. **Cek LED status** di header:
   - Hijau: Database terhubung
   - Kuning: Memuat data
   - Merah: Database tidak tersambung

2. **Cek URL API** di Pengaturan > API URL:
   - Pastikan URL berakhiran `/exec`
   - Buka URL langsung di browser dengan parameter `?action=getDashboard`
   - Jika muncul JSON, berarti API berjalan

3. **Cek Google Sheet**:
   - Pastikan Spreadsheet ID benar di Apps Script
   - Pastikan nama sheet sesuai (users, sekolah, dll)
   - Pastikan header baris pertama sesuai

4. **Cek Firebase**:
   - Pastikan API Key dan Project ID benar
   - Pastikan Google Sign-In sudah diaktifkan di Firebase Console

5. **Cek Console Browser** (F12):
   - Buka tab Console
   - Lihat error message
   - Buka tab Network untuk melihat API calls

6. **Cek CORS**:
   - Apps Script sudah menangani CORS via ContentService
   - Jika masih masalah CORS, pastikan deploy sebagai Web App dengan akses "Anyone"

7. **Clear Cache**:
   - Buka Pengaturan > Application > Local Storage
   - Hapus semua data dengan prefix `pk_`
   - Refresh halaman

---

## Panduan Mengubah Logo Kabupaten Cirebon

1. Siapkan file logo dengan format PNG
2. Ukuran yang disarankan: 200x200 pixel
3. Simpan file sebagai `logo-kabupaten-cirebon.png`
4. Upload ke folder `/assets/` di repository GitHub
5. Push ke GitHub, Vercel akan otomatis deploy ulang

Atau jika ingin menggunakan logo yang sudah online:
- Edit file `index.html`
- Ubah semua `src="assets/logo-kabupaten-cirebon.png"` dengan URL logo Anda

---

## Panduan Menambah Menu Baru

### 1. Tambah halaman di index.html
Tambahkan section baru setelah section halaman lainnya:
```html
<div class="page" id="pageNamaMenu">
  <div class="section-title">Nama Menu</div>
  <div id="namaMenuContent">Loading...</div>
</div>
```

### 2. Tambah mapping di app.js
Di fungsi `navigateTo()`, tambahkan di `pageMap`:
```javascript
namaMenu: 'pageNamaMenu',
```

### 3. Tambah di drawer menu
Di fungsi `buildDrawerMenu()`, tambahkan item menu:
```html
<li><a href="#" onclick="navigateTo('namaMenu')"><span class="menu-icon">ICON</span> Nama Menu</a></li>
```

### 4. Tambah fungsi load data
Di `loadPageData()`, tambahkan case:
```javascript
case 'namaMenu': loadNamaMenu(); break;
```

### 5. Tambah sheet di Google Sheet
Buat sheet baru dengan kolom yang diperlukan.

### 6. Tambah endpoint di Apps Script
Tambahkan handler GET dan POST untuk menu baru.

---

## Konfigurasi Cepat

Edit file `assets/app.js` langsung untuk konfigurasi awal:

```javascript
// Baris 6-7: URL API
API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',

// Baris 12-14: Firebase Config
apiKey: 'YOUR_API_KEY',
authDomain: 'YOUR_PROJECT.firebaseapp.com',
projectId: 'YOUR_PROJECT_ID',
```

Atau gunakan menu **Pengaturan** di dashboard Super Admin setelah login.

---

## Keamanan

- User yang belum login tidak bisa membuka dashboard
- Email login harus terdaftar di sheet "users"
- Status user harus "aktif"
- Role menentukan hak akses
- Operator tidak bisa melihat data sekolah lain (divalidasi di backend)
- Apps Script memvalidasi ulang email, role, dan id_sekolah di setiap request
- Tidak ada password yang disimpan
- Tidak ada private key di frontend
- Data detail hanya untuk user login sesuai role

---

&copy; 2026 Portal Pendidikan Tim Kerja Kecamatan Lemahabang Kabupaten Cirebon
