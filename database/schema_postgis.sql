-- ============================================================================
-- PERANCANGAN BASIS DATA WEBGIS BATIK MADURA (POSTGRESQL + POSTGIS)
-- Sesuai Dokumen Perancangan Prototype WebGIS Batik Madura (Sarifatul Maimuna)
-- Sistem Koordinat: WGS 84 (EPSG:4326)
-- ============================================================================

-- 1. Aktifkan ekstensi PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Hapus tabel jika sudah ada sebelumnya (urutan drop mematuhi foreign key)
DROP TABLE IF EXISTS ulasan CASCADE;
DROP TABLE IF EXISTS galeri_foto CASCADE;
DROP TABLE IF EXISTS produk CASCADE;
DROP TABLE IF EXISTS motif CASCADE;
DROP TABLE IF EXISTS perajin CASCADE;
DROP TABLE IF EXISTS sentra_batik CASCADE;
DROP TABLE IF EXISTS kecamatan CASCADE;
DROP TABLE IF EXISTS kabupaten CASCADE;
DROP TABLE IF EXISTS pengguna CASCADE;

-- 3. Tabel Pengguna (3 Aktor: Admin, Perajin, Pengunjung)
CREATE TABLE pengguna (
    id_pengguna SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(15) NOT NULL CHECK (role IN ('admin', 'perajin', 'pengunjung')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Kabupaten (Tabel Spasial - MultiPolygon)
CREATE TABLE kabupaten (
    id_kabupaten SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326)
);

-- 5. Tabel Kecamatan (Tabel Spasial - MultiPolygon)
CREATE TABLE kecamatan (
    id_kecamatan SERIAL PRIMARY KEY,
    id_kabupaten INT REFERENCES kabupaten(id_kabupaten) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326)
);

-- 6. Tabel Sentra Batik (Pusat Relasi - Spasial Point)
CREATE TABLE sentra_batik (
    id_sentra SERIAL PRIMARY KEY,
    id_kecamatan INT REFERENCES kecamatan(id_kecamatan) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    address TEXT,
    description TEXT,
    opening_hours VARCHAR(60),
    phone VARCHAR(20),
    geom_point GEOMETRY(Point, 4326) NOT NULL,
    verification_status VARCHAR(15) DEFAULT 'draft' CHECK (verification_status IN ('draft', 'terverifikasi', 'ditolak')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Perajin (UMKM Pengelola)
CREATE TABLE perajin (
    id_perajin SERIAL PRIMARY KEY,
    id_pengguna INT REFERENCES pengguna(id_pengguna) ON DELETE SET NULL,
    id_sentra INT REFERENCES sentra_batik(id_sentra) ON DELETE CASCADE,
    nama_usaha VARCHAR(120) NOT NULL,
    nama_pemilik VARCHAR(100) NOT NULL,
    no_whatsapp VARCHAR(20),
    tahun_berdiri INT
);

-- 8. Tabel Motif (Katalog Warisan Budaya Batik Madura)
CREATE TABLE motif (
    id_motif SERIAL PRIMARY KEY,
    id_kabupaten INT REFERENCES kabupaten(id_kabupaten) ON DELETE CASCADE,
    nama_motif VARCHAR(100) NOT NULL,
    makna TEXT,
    description TEXT,
    foto_motif VARCHAR(255)
);

-- 9. Tabel Produk (Katalog Produk Batik Perajin)
CREATE TABLE produk (
    id_produk SERIAL PRIMARY KEY,
    id_perajin INT REFERENCES perajin(id_perajin) ON DELETE CASCADE,
    id_motif INT REFERENCES motif(id_motif) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    technique VARCHAR(20) CHECK (technique IN ('tulis', 'cap', 'kombinasi')),
    dye_type VARCHAR(20) CHECK (dye_type IN ('alami', 'sintetis')),
    min_price NUMERIC(12, 0) CHECK (min_price >= 0),
    max_price NUMERIC(12, 0) CHECK (max_price >= min_price),
    foto_produk VARCHAR(255)
);

-- 10. Tabel Galeri Foto Sentra
CREATE TABLE galeri_foto (
    id_foto SERIAL PRIMARY KEY,
    id_sentra INT REFERENCES sentra_batik(id_sentra) ON DELETE CASCADE,
    path_foto VARCHAR(255) NOT NULL,
    caption VARCHAR(200)
);

-- 11. Tabel Ulasan (Review & Rating Pengunjung)
CREATE TABLE ulasan (
    id_ulasan SERIAL PRIMARY KEY,
    id_sentra INT REFERENCES sentra_batik(id_sentra) ON DELETE CASCADE,
    id_pengguna INT REFERENCES pengguna(id_pengguna) ON DELETE CASCADE,
    rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status VARCHAR(15) DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'tayang', 'ditolak')),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_sentra_review UNIQUE (id_sentra, id_pengguna)
);

-- ============================================================================
-- INDEKS SPASIAL & QUERY CONTOH (Sesuai Bab 3.2 Dokumen)
-- ============================================================================

-- Indeks Spasial GIST pada titik koordinat sentra batik
CREATE INDEX idx_sentra_geom ON sentra_batik USING GIST (geom_point);
CREATE INDEX idx_kabupaten_geom ON kabupaten USING GIST (geom);
CREATE INDEX idx_kecamatan_geom ON kecamatan USING GIST (geom);

-- Query Uji Jarak Spasial ST_Distance (5 Sentra Terdekat dari Titik Lokasi Pengguna)
-- Contoh titik koordinat: Bangkalan (112.73, -7.05)
SELECT 
    nama_sentra, 
    ST_Distance(
        geom_point::geography, 
        ST_SetSRID(ST_MakePoint(112.73, -7.05), 4326)::geography
    ) AS jarak_m 
FROM sentra_batik 
WHERE verification_status = 'terverifikasi' 
ORDER BY geom_point <-> ST_SetSRID(ST_MakePoint(112.73, -7.05), 4326) 
LIMIT 5;

-- Query Uji Titik di Dalam Poligon (ST_Within) untuk Penentuan Kecamatan Otomatis
-- SELECT k.id_kecamatan, k.name 
-- FROM kecamatan k 
-- WHERE ST_Within(ST_SetSRID(ST_MakePoint(112.73, -7.05), 4326), k.geom);

