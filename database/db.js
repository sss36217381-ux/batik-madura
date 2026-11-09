const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const DB_FILE = path.join(__dirname, 'geobatik_data.json');

// Initial in-memory state
let db = {
  pengguna: [],
  kabupaten: [],
  kecamatan: [],
  sentra_batik: [],
  perajin: [],
  motif: [],
  produk: [],
  galeri_foto: [],
  ulasan: [],
  counters: {
    pengguna: 1,
    kabupaten: 1,
    kecamatan: 1,
    sentra_batik: 1,
    perajin: 1,
    motif: 1,
    produk: 1,
    galeri_foto: 1,
    ulasan: 1
  }
};

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menyimpan database:', err);
  }
}

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
    } catch (e) {
      console.error('Error membaca DB_FILE, membuat baru...', e);
      saveDb();
    }
  } else {
    // Generate initial seed if file does not exist
    require('./seed_data')(db);
    saveDb();
  }
}

// Spatial helper: ST_Distance calculation in meters using Turf.js
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  return turf.distance(from, to, { units: 'meters' });
}

// Spatial helper: ST_Within to auto-detect kecamatan & kabupaten from coordinates (BR-07)
function findDistrictByPoint(lat, lon) {
  const pt = turf.point([lon, lat]);
  for (const kec of db.kecamatan) {
    if (kec.geom && kec.geom.coordinates) {
      try {
        let poly;
        if (kec.geom.type === 'Polygon') {
          poly = turf.polygon(kec.geom.coordinates);
        } else if (kec.geom.type === 'MultiPolygon') {
          poly = turf.multiPolygon(kec.geom.coordinates);
        }
        if (poly && turf.booleanPointInPolygon(pt, poly)) {
          return kec;
        }
      } catch (err) {
        // continue
      }
    }
  }
  // Fallback: cari kecamatan terdekat jika titik berada di pesisir / toleransi batas
  let nearestKec = null;
  let minD = Infinity;
  for (const kec of db.kecamatan) {
    if (kec.center) {
      const d = calculateDistanceMeters(lat, lon, kec.center[1], kec.center[0]);
      if (d < minD) {
        minD = d;
        nearestKec = kec;
      }
    }
  }
  return nearestKec;
}

// Business rule check BR-08: dua sentra dengan nama sama tidak boleh berjarak < 50m
function checkProximityDuplicate(name, lat, lon, excludeId = null) {
  const normalizedName = name.trim().toLowerCase();
  for (const s of db.sentra_batik) {
    if (excludeId && s.id_sentra === excludeId) continue;
    if (s.name.trim().toLowerCase() === normalizedName && s.geom_point) {
      const [sLon, sLat] = s.geom_point.coordinates;
      const dist = calculateDistanceMeters(lat, lon, sLat, sLon);
      if (dist < 50) {
        return { duplicate: true, distance: Math.round(dist), existing: s.name };
      }
    }
  }
  return { duplicate: false };
}

// Inisialisasi DB
loadDb();

module.exports = {
  db,
  saveDb,
  loadDb,
  calculateDistanceMeters,
  findDistrictByPoint,
  checkProximityDuplicate
};

