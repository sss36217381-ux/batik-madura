# GeoBatik Madura (WebGIS Pemetaan Sentra & Motif Batik Madura)

> **"Jelajahi Sentra dan Motif Batik Madura dalam Satu Peta"**  
> Proyek Perancangan Prototype WebGIS Batik Madura  
> **Nama Pengembang:** SARIFATUL MAIMUNA  
> **NPM:** 20241230009  

---

## 📌 Ringkasan Sistem

**GeoBatik Madura** adalah aplikasi WebGIS berbasis web interaktif responsif yang memetakan sentra, perajin, motif, galeri, dan produk batik di 4 kabupaten Pulau Madura: **Bangkalan**, **Sampang**, **Pamekasan**, dan **Sumenep**.

Aplikasi ini dibangun mengacu langsung pada dokumen perancangan sistem, diagram ERD (9 tabel relasional), DFD Level 0 & Level 1 (5 proses utama), 14 kebutuhan fungsional (F-01 s/d F-14), serta 18 aturan bisnis (*Business Rules* BR-01 s/d BR-18).

---

## 🚀 Fitur Unggulan Sistem

### 🗺️ Fitur Geospasial & Peta WebGIS (F-01 s/d F-08, 7.3)
1. **Peta Interaktif & Multi-Basemap:** Pilihan peta dasar OpenStreetMap, Esri World Imagery (Satelit), dan CartoDB Positron.
2. **Layer Poligon Batas Kabupaten (Choropleth):** Layer batas administrasi 4 kabupaten Madura dengan pewarnaan tematik dan tooltip interaktif yang menampilkan jumlah sentra batik aktif.
3. **Marker Tematik Geometri Point:** Marker titik koordinat sentra batik (WGS 84 / EPSG:4326) dengan warna spesifik per kabupaten (*Bangkalan: Biru Nilai, Sampang: Cyan Bahari, Pamekasan: Cokelat Soga, Sumenep: Merah Bata Keraton*).
4. **Popup Sentra Informatif:** Menampilkan foto sentra, nama, alamat, jam buka, rating bintang, tombol **"Lihat Detail"**, dan tombol **"Buka Rute"** langsung ke Google Maps (F-07).
5. **Geolokasi GPS ("Lokasiku"):** Mendeteksi koordinat posisi perangkat pengguna.
6. **Pencarian Sentra Terdekat (F-08):** Mengkalkulasi jarak spasial (*geodesic distance*) dalam meter dan kilometer, serta mengurutkan daftar sentra terdekat dari posisi pengguna secara otomatis.
7. **Pencarian & Multi-Filter Fleksibel (F-05):**
   - Pencarian kata kunci (nama sentra, nama motif, alamat).
   - Filter kabupaten (Bangkalan, Sampang, Pamekasan, Sumenep).
   - Filter motif batik khas.
   - Filter jenis pewarna (*Alami / Sintetis*).
   - Filter teknik pembuatan (*Tulis, Cap, Kombinasi*).
   - Filter rentang harga minimum & maksimum.

### 🎨 Katalog Motif & Warisan Budaya (F-06, BR-11)
- Dokumentasi motif otentik Madura: **Gentongan**, **Tarik Jiwo**, **Ombak Segoro**, **Sekar Jagad Madura**, **Kar-karan**, **Lancor Pamekasan**, **Melati Rinonce**, dan **Daun Memba**.
- Informasi filosofi mendalam, makna spiritual, ciri visual guratan canting, serta tautan langsung untuk menampilkan sentra-sentra yang memproduksi motif tersebut.

### 👥 3 Hak Akses / Peran Aktor (P1 DFD, F-10, BR-01 s/d BR-03)
1. **Pengunjung (Publik):** Eksplorasi peta WebGIS, filter sentra, katalog motif, navigasi rute, serta menulis review & rating (1–5) setelah masuk.
2. **Perajin (UMKM):** Dashboard khusus untuk mengelola profil usaha sendiri (*nama usaha, nama pemilik, WhatsApp, tahun berdiri*) dan manajemen produk batik milik sendiri (*harga, teknik, pewarna, foto*).
3. **Admin Dinas / Pengelola:**
   - **Dashboard Statistik & Grafik Distribusi:** Jumlah total sentra, motif, perajin, produk, dan antrean ulasan menunggu.
   - **CRUD Sentra Batik + Peta Pemilih Koordinat Interaktif:** Tambah sentra baru dengan mengklik titik pada peta mini, otomatis mendeteksi batas kecamatan, validasi batas wilayah Madura (BR-06) dan pencegahan duplikasi radius < 50m (BR-08).
   - **Moderasi Ulasan (F-13, BR-15):** Setujui (*tayang*) atau tolak ulasan yang masuk.
   - **Verifikasi Sentra (F-13, BR-09):** Mengubah status sentra (*draft, terverifikasi, ditolak*).
   - **Ekspor Laporan (F-14):** Unduh seluruh data sentra dalam format **GeoJSON (WGS 84)** untuk SIG/QGIS dan format tabel **CSV (Excel)**.

---

## 🔑 Akun Demo Siap Pakai

Tersedia tombol autofill 1-klik di modal login, atau gunakan kredensial berikut:

| Peran | Email | Kata Sandi | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@geobatik.id` | `admin123` | Dinas / Pengelola Sistem |
| **Perajin** | `perajin@geobatik.id` | `perajin123` | Pak Hasan Basri (Griya Batik Klampar) |
| **Pengunjung** | `pengunjung@geobatik.id` | `user123` | Rina Septiani (Wisatawan) |

---

## 📂 Struktur Berkas & Direktori

```
c:\batik madura/
├── database/
│   ├── db.js                     # Inisialisasi basis data relasional & fungsi kalkulasi spasial
│   ├── seed_data.js              # Data awal 4 kabupaten, sentra, motif, perajin, & produk
│   ├── schema_postgis.sql        # DDL SQL resmi PostgreSQL + PostGIS (Bab 3.2 Dokumen)
│   └── generate_assets.js        # Generator aset visual ilustratif
├── public/
│   ├── index.html                # Tampilan antarmuka WebGIS (Palet Nilai, Soga, Bata, Krem)
│   ├── app.js                    # Logika klien Leaflet WebGIS, filter, modal, & dashboard
│   ├── images/                   # Berkas grafis motif, galeri sentra, dan produk
│   └── uploads/                  # Direktori berkas unggahan gambar
├── server.js                     # Backend API Express.js (REST, GeoJSON, Autentikasi JWT)
├── package.json                  # Dependensi Node.js (@turf/turf, express, bcryptjs, dll.)
└── README.md                     # Dokumentasi teknis proyek
```

---

## 🛠️ Panduan Menjalankan Aplikasi

Aplikasi berjalan pada runtime Node.js di komputer Anda:

```bash
# 1. Masuk ke direktori aplikasi
cd "c:\batik madura"

# 2. Menjalankan server aplikasi
node server.js
```

Buka peramban (*browser*) Anda dan akses:
👉 **`http://localhost:3000`**

---

## 🗄️ Basis Data Spasial PostgreSQL + PostGIS (Bab 3 Dokumen)

Bagi penguji atau kebutuhan deployment server PostgreSQL dengan ekstensi PostGIS, berkas DDL SQL lengkap tersedia di:
`database/schema_postgis.sql`

Skrip ini memuat definisi 9 tabel, relasi kunci asing (*Foreign Key*), indeks spasial GIST (`idx_sentra_geom`), serta query jarak `ST_Distance` dan `ST_Within` sesuai standar yang tercantum pada dokumen perancangan Bab 3.

