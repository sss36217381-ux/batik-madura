const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const turf = require('@turf/turf');
const {
  db,
  saveDb,
  calculateDistanceMeters,
  findDistrictByPoint,
  checkProximityDuplicate
} = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'geobatik_madura_secret_key_2026_sarifatul_maimuna';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for image uploads (BR-16: JPG/PNG, max 2MB)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'batik-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Format file harus JPG, PNG, atau WEBP, maksimal 2 MB!'));
  }
});

// Auth helper
function generateToken(user) {
  return jwt.sign(
    { id_pengguna: user.id_pengguna, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Token tidak valid atau kedaluwarsa' });
    req.user = user;
    next();
  });
}

function roleMiddleware(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak: Peran Anda tidak memiliki izin untuk tindakan ini' });
    }
    next();
  };
}

// ==========================================
// 1. AUTHENTICATION (P1 DFD, F-10, BR-05)
// ==========================================
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, nama_usaha, nama_pemilik, no_whatsapp, id_sentra } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Nama, email, dan kata sandi wajib diisi' });
  }

  // BR-05: kata sandi minimal 8 karakter
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Kata sandi minimal harus 8 karakter (BR-05)' });
  }

  // BR-05: email harus unik
  const existing = db.pengguna.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email sudah terdaftar dalam sistem' });
  }

  const assignedRole = (role === 'perajin') ? 'perajin' : 'pengunjung';
  const newUser = {
    id_pengguna: db.counters.pengguna++,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password_hash: bcrypt.hashSync(password, 10),
    role: assignedRole,
    created_at: new Date().toISOString()
  };

  db.pengguna.push(newUser);

  // Jika mendaftar sebagai perajin, buat profil perajin awal
  let newPerajin = null;
  if (assignedRole === 'perajin') {
    newPerajin = {
      id_perajin: db.counters.perajin++,
      id_pengguna: newUser.id_pengguna,
      id_sentra: id_sentra ? parseInt(id_sentra) : (db.sentra_batik[0] ? db.sentra_batik[0].id_sentra : null),
      nama_usaha: nama_usaha ? nama_usaha.trim() : `Usaha Batik ${name}`,
      nama_pemilik: nama_pemilik ? nama_pemilik.trim() : name,
      no_whatsapp: no_whatsapp ? no_whatsapp.trim() : '',
      tahun_berdiri: new Date().getFullYear()
    };
    db.perajin.push(newPerajin);
  }

  saveDb();

  const token = generateToken(newUser);
  res.json({
    success: true,
    message: 'Registrasi berhasil',
    token,
    user: {
      id_pengguna: newUser.id_pengguna,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    },
    perajin: newPerajin
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan kata sandi wajib diisi' });
  }

  const user = db.pengguna.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Email atau kata sandi tidak sesuai' });
  }

  const token = generateToken(user);
  const perajin = user.role === 'perajin' ? db.perajin.find(p => p.id_pengguna === user.id_pengguna) : null;

  res.json({
    success: true,
    message: 'Login berhasil',
    token,
    user: {
      id_pengguna: user.id_pengguna,
      name: user.name,
      email: user.email,
      role: user.role
    },
    perajin
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.pengguna.find(u => u.id_pengguna === req.user.id_pengguna);
  if (!user) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });

  const perajin = user.role === 'perajin' ? db.perajin.find(p => p.id_pengguna === user.id_pengguna) : null;
  res.json({
    success: true,
    user: {
      id_pengguna: user.id_pengguna,
      name: user.name,
      email: user.email,
      role: user.role
    },
    perajin
  });
});

// ==========================================
// 2. GEOJSON SPASIAL (F-01, F-02, F-03, 7.3)
// ==========================================

// GeoJSON Poligon Batas Kabupaten beserta jumlah sentra (Choropleth sederhana - 7.3 fiturs)
app.get('/api/geojson/kabupaten', (req, res) => {
  const features = db.kabupaten.map(kab => {
    // Cari semua kecamatan di kabupaten ini
    const kecIds = db.kecamatan.filter(k => k.id_kabupaten === kab.id_kabupaten).map(k => k.id_kecamatan);
    // Hitung jumlah sentra terverifikasi
    const sentraCount = db.sentra_batik.filter(s =>
      s.verification_status === 'terverifikasi' && kecIds.includes(s.id_kecamatan)
    ).length;

    return {
      type: 'Feature',
      id: kab.id_kabupaten,
      properties: {
        id_kabupaten: kab.id_kabupaten,
        nama_kabupaten: kab.name,
        color: kab.color,
        sentra_count: sentraCount,
        center: kab.center
      },
      geometry: kab.geom
    };
  });

  res.json({
    type: 'FeatureCollection',
    features
  });
});

// GeoJSON Titik Sentra Batik (Point)
app.get('/api/geojson/sentra', (req, res) => {
  const statusFilter = req.query.all === 'true' ? null : 'terverifikasi';

  const list = db.sentra_batik.filter(s => !statusFilter || s.verification_status === statusFilter);

  const features = list.map(s => {
    const kec = db.kecamatan.find(k => k.id_kecamatan === s.id_kecamatan);
    const kab = kec ? db.kabupaten.find(kb => kb.id_kabupaten === kec.id_kabupaten) : null;
    const perajinCount = db.perajin.filter(p => p.id_sentra === s.id_sentra).length;
    const galeri = db.galeri_foto.find(g => g.id_sentra === s.id_sentra);

    // Hitung rating rata-rata
    const ulasans = db.ulasan.filter(u => u.id_sentra === s.id_sentra && u.status === 'tayang');
    const avgRating = ulasans.length > 0
      ? (ulasans.reduce((acc, cur) => acc + cur.rating, 0) / ulasans.length).toFixed(1)
      : '5.0';

    return {
      type: 'Feature',
      id: s.id_sentra,
      properties: {
        id_sentra: s.id_sentra,
        name: s.name,
        address: s.address,
        opening_hours: s.opening_hours,
        phone: s.phone,
        status: s.verification_status,
        kabupaten: kab ? kab.name : 'Madura',
        kabupaten_id: kab ? kab.id_kabupaten : null,
        kabupaten_color: kab ? kab.color : '#1F345F',
        kecamatan: kec ? kec.name : '-',
        rating: avgRating,
        review_count: ulasans.length,
        perajin_count: perajinCount,
        foto: galeri ? galeri.path_foto : '/images/galeri_gentong_1.jpg'
      },
      geometry: s.geom_point
    };
  });

  res.json({
    type: 'FeatureCollection',
    features
  });
});

// ==========================================
// 3. SENTRA BATIK & PENCARIAN (P3 DFD, F-04, F-05, F-08)
// ==========================================
app.get('/api/sentra', (req, res) => {
  const { keyword, kabupaten, motif, dye_type, technique, min_price, max_price, lat, lon, user_status } = req.query;

  let results = db.sentra_batik.filter(s => {
    // Filter status verifikasi: pengunjung hanya melihat terverifikasi (BR-01, BR-09)
    if (user_status !== 'all' && s.verification_status !== 'terverifikasi') {
      return false;
    }

    const kec = db.kecamatan.find(k => k.id_kecamatan === s.id_kecamatan);
    const kab = kec ? db.kabupaten.find(kb => kb.id_kabupaten === kec.id_kabupaten) : null;

    // Filter Kata Kunci
    if (keyword) {
      const q = keyword.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchAddress = (s.address || '').toLowerCase().includes(q);
      const matchDesc = (s.description || '').toLowerCase().includes(q);
      const matchKab = kab && kab.name.toLowerCase().includes(q);
      if (!matchName && !matchAddress && !matchDesc && !matchKab) return false;
    }

    // Filter Kabupaten
    if (kabupaten && kabupaten !== 'all') {
      if (!kab || kab.id_kabupaten.toString() !== kabupaten.toString()) return false;
    }

    // Filter Produk & Motif
    const perajinList = db.perajin.filter(p => p.id_sentra === s.id_sentra);
    const perajinIds = perajinList.map(p => p.id_perajin);
    const produkList = db.produk.filter(pr => perajinIds.includes(pr.id_perajin));

    if (motif && motif !== 'all') {
      const matchMotif = produkList.some(pr => pr.id_motif.toString() === motif.toString());
      if (!matchMotif) return false;
    }

    if (dye_type && dye_type !== 'all') {
      const matchDye = produkList.some(pr => pr.dye_type === dye_type);
      if (!matchDye) return false;
    }

    if (technique && technique !== 'all') {
      const matchTech = produkList.some(pr => pr.technique === technique);
      if (!matchTech) return false;
    }

    if (min_price && !isNaN(min_price)) {
      const matchPrice = produkList.some(pr => pr.max_price >= Number(min_price));
      if (!matchPrice && produkList.length > 0) return false;
    }

    if (max_price && !isNaN(max_price)) {
      const matchPrice = produkList.some(pr => pr.min_price <= Number(max_price));
      if (!matchPrice && produkList.length > 0) return false;
    }

    return true;
  });

  // Pemetaan detail tambahan & kalkulasi jarak jika lokasi user diberikan (F-08)
  const mapped = results.map(s => {
    const kec = db.kecamatan.find(k => k.id_kecamatan === s.id_kecamatan);
    const kab = kec ? db.kabupaten.find(kb => kb.id_kabupaten === kec.id_kabupaten) : null;
    const perajinList = db.perajin.filter(p => p.id_sentra === s.id_sentra);
    const galeri = db.galeri_foto.filter(g => g.id_sentra === s.id_sentra);
    const ulasans = db.ulasan.filter(u => u.id_sentra === s.id_sentra && u.status === 'tayang');

    const avgRating = ulasans.length > 0
      ? (ulasans.reduce((acc, cur) => acc + cur.rating, 0) / ulasans.length).toFixed(1)
      : '5.0';

    let jarak_m = null;
    let jarak_km = null;
    if (lat && lon && !isNaN(lat) && !isNaN(lon) && s.geom_point) {
      const [sLon, sLat] = s.geom_point.coordinates;
      jarak_m = Math.round(calculateDistanceMeters(Number(lat), Number(lon), sLat, sLon));
      jarak_km = (jarak_m / 1000).toFixed(1);
    }

    return {
      ...s,
      nama_kabupaten: kab ? kab.name : 'Madura',
      kabupaten_id: kab ? kab.id_kabupaten : null,
      kabupaten_color: kab ? kab.color : '#1F345F',
      nama_kecamatan: kec ? kec.name : '-',
      perajin_count: perajinList.length,
      galeri,
      rating: avgRating,
      review_count: ulasans.length,
      jarak_m,
      jarak_km
    };
  });

  // Jika parameter lat & lon ada, urutkan berdasarkan yang terdekat (F-08)
  if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
    mapped.sort((a, b) => (a.jarak_m || Infinity) - (b.jarak_m || Infinity));
  }

  res.json({
    success: true,
    total: mapped.length,
    data: mapped
  });
});

// Detail Lengkap Sentra (F-04)
app.get('/api/sentra/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const sentra = db.sentra_batik.find(s => s.id_sentra === id);
  if (!sentra) return res.status(404).json({ success: false, message: 'Sentra batik tidak ditemukan' });

  const kec = db.kecamatan.find(k => k.id_kecamatan === sentra.id_kecamatan);
  const kab = kec ? db.kabupaten.find(kb => kb.id_kabupaten === kec.id_kabupaten) : null;
  const galeri = db.galeri_foto.filter(g => g.id_sentra === sentra.id_sentra);
  const perajinList = db.perajin.filter(p => p.id_sentra === sentra.id_sentra);
  const perajinIds = perajinList.map(p => p.id_perajin);

  // Ambil produk dan lampirkan data motif
  const produkList = db.produk
    .filter(pr => perajinIds.includes(pr.id_perajin))
    .map(pr => {
      const motif = db.motif.find(m => m.id_motif === pr.id_motif);
      const per = perajinList.find(p => p.id_perajin === pr.id_perajin);
      return {
        ...pr,
        nama_motif: motif ? motif.nama_motif : '-',
        nama_usaha: per ? per.nama_usaha : '-'
      };
    });

  // Ulasan yang statusnya tayang
  const ulasanList = db.ulasan
    .filter(u => u.id_sentra === sentra.id_sentra && u.status === 'tayang')
    .map(u => {
      const user = db.pengguna.find(p => p.id_pengguna === u.id_pengguna);
      return {
        ...u,
        nama_pengguna: user ? user.name : 'Anonim'
      };
    });

  const avgRating = ulasanList.length > 0
    ? (ulasanList.reduce((acc, cur) => acc + cur.rating, 0) / ulasanList.length).toFixed(1)
    : '5.0';

  res.json({
    success: true,
    data: {
      ...sentra,
      nama_kabupaten: kab ? kab.name : 'Madura',
      kabupaten_id: kab ? kab.id_kabupaten : null,
      kabupaten_color: kab ? kab.color : '#1F345F',
      nama_kecamatan: kec ? kec.name : '-',
      galeri,
      perajin: perajinList,
      produk: produkList,
      ulasan: ulasanList,
      rating: avgRating,
      review_count: ulasanList.length
    }
  });
});

// ==========================================
// 4. KATALOG MOTIF BATIK (F-06, BR-11)
// ==========================================
app.get('/api/motif', (req, res) => {
  const motifs = db.motif.map(m => {
    const kab = db.kabupaten.find(k => k.id_kabupaten === m.id_kabupaten);
    // Sentra mana saja yang memproduksi motif ini
    const productsWithMotif = db.produk.filter(pr => pr.id_motif === m.id_motif);
    const perajinIds = productsWithMotif.map(pr => pr.id_perajin);
    const sentraIds = db.perajin
      .filter(p => perajinIds.includes(p.id_perajin))
      .map(p => p.id_sentra);
    const sentras = db.sentra_batik.filter(s => sentraIds.includes(s.id_sentra));

    return {
      ...m,
      nama_kabupaten: kab ? kab.name : 'Madura',
      kabupaten_color: kab ? kab.color : '#1F345F',
      sentra_penghasil: sentras.map(s => ({ id_sentra: s.id_sentra, name: s.name }))
    };
  });

  res.json({ success: true, data: motifs });
});

app.post('/api/motif', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const { id_kabupaten, nama_motif, makna, description, foto_motif } = req.body;

  // BR-11: Setiap motif wajib memiliki nama, daerah asal, dan minimal satu foto
  if (!nama_motif || !id_kabupaten || !foto_motif) {
    return res.status(400).json({ success: false, message: 'Nama motif, kabupaten asal, dan foto motif wajib diisi (BR-11)' });
  }

  const newMotif = {
    id_motif: db.counters.motif++,
    id_kabupaten: parseInt(id_kabupaten),
    nama_motif: nama_motif.trim(),
    makna: makna ? makna.trim() : '',
    description: description ? description.trim() : '',
    foto_motif: foto_motif.trim()
  };

  db.motif.push(newMotif);
  saveDb();

  res.json({ success: true, message: 'Motif batik berhasil ditambahkan', data: newMotif });
});

app.put('/api/motif/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = parseInt(req.params.id);
  const index = db.motif.findIndex(m => m.id_motif === id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Motif tidak ditemukan' });

  const { id_kabupaten, nama_motif, makna, description, foto_motif } = req.body;
  if (nama_motif) db.motif[index].nama_motif = nama_motif.trim();
  if (id_kabupaten) db.motif[index].id_kabupaten = parseInt(id_kabupaten);
  if (makna !== undefined) db.motif[index].makna = makna.trim();
  if (description !== undefined) db.motif[index].description = description.trim();
  if (foto_motif) db.motif[index].foto_motif = foto_motif.trim();

  saveDb();
  res.json({ success: true, message: 'Motif berhasil diperbarui', data: db.motif[index] });
});

app.delete('/api/motif/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = parseInt(req.params.id);
  db.motif = db.motif.filter(m => m.id_motif !== id);
  saveDb();
  res.json({ success: true, message: 'Motif berhasil dihapus (BR-04)' });
});

// ==========================================
// 5. ULASAN & RATING (P4 DFD, F-09, BR-14, BR-15)
// ==========================================
app.post('/api/ulasan', authMiddleware, (req, res) => {
  const { id_sentra, rating, comment } = req.body;
  const userId = req.user.id_pengguna;

  if (!id_sentra || !rating || !comment) {
    return res.status(400).json({ success: false, message: 'Sentra, rating (1-5), dan komentar wajib diisi' });
  }

  const numRating = parseInt(rating);
  if (numRating < 1 || numRating > 5) {
    return res.status(400).json({ success: false, message: 'Rating harus antara 1 sampai 5 (BR-14)' });
  }

  // BR-14: Satu pengguna hanya boleh memberi satu ulasan per sentra
  const existing = db.ulasan.find(u => u.id_sentra === parseInt(id_sentra) && u.id_pengguna === userId);
  if (existing) {
    return res.status(400).json({ success: false, message: 'Anda sudah pernah memberikan ulasan untuk sentra ini (BR-14)' });
  }

  // BR-15: Ulasan berstatus 'menunggu' sampai dimoderasi oleh admin
  const newReview = {
    id_ulasan: db.counters.ulasan++,
    id_sentra: parseInt(id_sentra),
    id_pengguna: userId,
    rating: numRating,
    comment: comment.trim(),
    status: 'menunggu',
    date: new Date().toISOString()
  };

  db.ulasan.push(newReview);
  saveDb();

  res.json({
    success: true,
    message: 'Ulasan Anda berhasil dikirim dan sedang menunggu moderasi admin sebelum ditayangkan (BR-15)',
    data: newReview
  });
});

// ==========================================
// 6. PRODUK SAYA & MANAJEMEN PRODUK (F-11, BR-03, BR-12, BR-13)
// ==========================================
app.get('/api/produk', (req, res) => {
  const products = db.produk.map(pr => {
    const per = db.perajin.find(p => p.id_perajin === pr.id_perajin);
    const mot = db.motif.find(m => m.id_motif === pr.id_motif);
    return {
      ...pr,
      nama_usaha: per ? per.nama_usaha : '-',
      nama_motif: mot ? mot.nama_motif : '-'
    };
  });
  res.json({ success: true, data: products });
});

app.post('/api/produk', authMiddleware, (req, res) => {
  const { name, id_motif, technique, dye_type, min_price, max_price, foto_produk } = req.body;

  let perajin = null;
  if (req.user.role === 'perajin') {
    perajin = db.perajin.find(p => p.id_pengguna === req.user.id_pengguna);
    if (!perajin) return res.status(403).json({ success: false, message: 'Profil perajin Anda belum terdaftar' });
  } else if (req.user.role === 'admin') {
    const targetPerajinId = req.body.id_perajin ? parseInt(req.body.id_perajin) : (db.perajin[0] ? db.perajin[0].id_perajin : 1);
    perajin = db.perajin.find(p => p.id_perajin === targetPerajinId);
  } else {
    return res.status(403).json({ success: false, message: 'Hanya perajin atau admin yang dapat menambah produk' });
  }

  // BR-12: Harga minimum tidak boleh lebih besar dari harga maksimum; dalam Rupiah dan tidak negatif
  const minP = parseFloat(min_price) || 0;
  const maxP = parseFloat(max_price) || 0;
  if (minP < 0 || maxP < 0 || minP > maxP) {
    return res.status(400).json({ success: false, message: 'Harga tidak boleh negatif dan harga minimum tidak boleh lebih besar dari harga maksimum (BR-12)' });
  }

  // BR-13: Teknik hanya bernilai tulis, cap, atau kombinasi; pewarna hanya alami atau sintetis
  const validTech = ['tulis', 'cap', 'kombinasi'];
  const validDye = ['alami', 'sintetis'];
  if (!validTech.includes(technique)) {
    return res.status(400).json({ success: false, message: 'Teknik harus berupa: tulis, cap, atau kombinasi (BR-13)' });
  }
  if (!validDye.includes(dye_type)) {
    return res.status(400).json({ success: false, message: 'Jenis pewarna harus berupa: alami atau sintetis (BR-13)' });
  }

  const newProduct = {
    id_produk: db.counters.produk++,
    id_perajin: perajin.id_perajin,
    id_motif: id_motif ? parseInt(id_motif) : null,
    name: name.trim(),
    technique,
    dye_type,
    min_price: minP,
    max_price: maxP,
    foto_produk: foto_produk || '/images/produk_gentongan_1.jpg'
  };

  db.produk.push(newProduct);
  saveDb();

  res.json({ success: true, message: 'Produk berhasil ditambahkan', data: newProduct });
});

app.put('/api/produk/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const product = db.produk.find(pr => pr.id_produk === id);
  if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

  // BR-03: Perajin hanya dapat mengubah produk milik akunnya sendiri
  if (req.user.role === 'perajin') {
    const perajin = db.perajin.find(p => p.id_pengguna === req.user.id_pengguna);
    if (!perajin || product.id_perajin !== perajin.id_perajin) {
      return res.status(403).json({ success: false, message: 'Anda hanya dapat mengubah produk usaha Anda sendiri (BR-03)' });
    }
  }

  const { name, id_motif, technique, dye_type, min_price, max_price, foto_produk } = req.body;
  if (min_price !== undefined && max_price !== undefined) {
    if (parseFloat(min_price) > parseFloat(max_price)) {
      return res.status(400).json({ success: false, message: 'Harga min tidak boleh lebih besar dari harga maks (BR-12)' });
    }
    product.min_price = parseFloat(min_price);
    product.max_price = parseFloat(max_price);
  }
  if (name) product.name = name.trim();
  if (id_motif) product.id_motif = parseInt(id_motif);
  if (technique) product.technique = technique;
  if (dye_type) product.dye_type = dye_type;
  if (foto_produk) product.foto_produk = foto_produk;

  saveDb();
  res.json({ success: true, message: 'Produk berhasil diperbarui', data: product });
});

app.delete('/api/produk/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const product = db.produk.find(pr => pr.id_produk === id);
  if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

  if (req.user.role === 'perajin') {
    const perajin = db.perajin.find(p => p.id_pengguna === req.user.id_pengguna);
    if (!perajin || product.id_perajin !== perajin.id_perajin) {
      return res.status(403).json({ success: false, message: 'Anda hanya dapat menghapus produk usaha Anda sendiri' });
    }
  }

  db.produk = db.produk.filter(pr => pr.id_produk !== id);
  saveDb();
  res.json({ success: true, message: 'Produk berhasil dihapus' });
});

// Profil Perajin Sendiri (F-11, BR-03, BR-10)
app.get('/api/perajin/my-profile', authMiddleware, roleMiddleware(['perajin']), (req, res) => {
  const perajin = db.perajin.find(p => p.id_pengguna === req.user.id_pengguna);
  if (!perajin) return res.status(404).json({ success: false, message: 'Profil perajin belum dibuat' });

  const sentra = db.sentra_batik.find(s => s.id_sentra === perajin.id_sentra);
  const products = db.produk.filter(pr => pr.id_perajin === perajin.id_perajin);

  res.json({
    success: true,
    data: {
      ...perajin,
      nama_sentra: sentra ? sentra.name : '-',
      sentra_status: sentra ? sentra.verification_status : '-',
      produk: products
    }
  });
});

app.put('/api/perajin/my-profile', authMiddleware, roleMiddleware(['perajin']), (req, res) => {
  const perajin = db.perajin.find(p => p.id_pengguna === req.user.id_pengguna);
  if (!perajin) return res.status(404).json({ success: false, message: 'Profil perajin tidak ditemukan' });

  const { nama_usaha, nama_pemilik, no_whatsapp, tahun_berdiri, id_sentra } = req.body;
  if (nama_usaha) perajin.nama_usaha = nama_usaha.trim();
  if (nama_pemilik) perajin.nama_pemilik = nama_pemilik.trim();
  if (no_whatsapp !== undefined) perajin.no_whatsapp = no_whatsapp.trim();
  if (tahun_berdiri) perajin.tahun_berdiri = parseInt(tahun_berdiri);
  if (id_sentra) perajin.id_sentra = parseInt(id_sentra);

  // BR-10: Perubahan data oleh perajin mengembalikan status sentra ke draft sampai disetujui admin
  const sentra = db.sentra_batik.find(s => s.id_sentra === perajin.id_sentra);
  if (sentra) {
    sentra.verification_status = 'draft';
    sentra.updated_at = new Date().toISOString();
  }

  saveDb();
  res.json({
    success: true,
    message: 'Profil perajin berhasil diperbarui. Status sentra terkait disesuaikan ke draft untuk peninjauan admin (BR-10)',
    data: perajin
  });
});

// ==========================================
// 7. PANEL ADMIN & MODERASI (P5 DFD, F-12, F-13, F-14)
// ==========================================

// Dashboard Statistik Admin (F-14)
app.get('/api/admin/stats', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const totalSentra = db.sentra_batik.length;
  const sentraTerverifikasi = db.sentra_batik.filter(s => s.verification_status === 'terverifikasi').length;
  const sentraDraft = db.sentra_batik.filter(s => s.verification_status === 'draft').length;
  const totalPerajin = db.perajin.length;
  const totalMotif = db.motif.length;
  const totalProduk = db.produk.length;
  const ulasanMenunggu = db.ulasan.filter(u => u.status === 'menunggu').length;

  const perKabupaten = db.kabupaten.map(kab => {
    const kecIds = db.kecamatan.filter(k => k.id_kabupaten === kab.id_kabupaten).map(k => k.id_kecamatan);
    const count = db.sentra_batik.filter(s => kecIds.includes(s.id_kecamatan)).length;
    return {
      id_kabupaten: kab.id_kabupaten,
      nama: kab.name,
      color: kab.color,
      count
    };
  });

  res.json({
    success: true,
    data: {
      totalSentra,
      sentraTerverifikasi,
      sentraDraft,
      totalPerajin,
      totalMotif,
      totalProduk,
      ulasanMenunggu,
      perKabupaten
    }
  });
});

// CRUD Sentra oleh Admin (F-12)
app.post('/api/admin/sentra', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const { name, address, description, opening_hours, phone, lat, lon, id_kecamatan, verification_status } = req.body;

  if (!name || lat === undefined || lon === undefined) {
    return res.status(400).json({ success: false, message: 'Nama sentra, latitude, dan longitude wajib diisi' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  // BR-06: Koordinat valid (EPSG:4326) di wilayah Pulau Madura
  if (longitude < 112.5 || longitude > 114.4 || latitude < -7.4 || latitude > -6.7) {
    return res.status(400).json({
      success: false,
      message: 'Koordinat di luar wilayah Pulau Madura! Pastikan berada di kisaran Lon 112.5-114.4 dan Lat -7.4 hingga -6.7 (BR-06)'
    });
  }

  // BR-08: Dua sentra dengan nama sama tidak boleh berjarak < 50m
  const proxCheck = checkProximityDuplicate(name, latitude, longitude);
  if (proxCheck.duplicate) {
    return res.status(400).json({
      success: false,
      message: `Terdeteksi sentra dengan nama serupa dalam radius ${proxCheck.distance} meter (minimal harus 50m - BR-08)`
    });
  }

  // BR-07: Kecamatan ditentukan otomatis jika tidak dipilih lewat titik koordinat
  let assignedKecId = id_kecamatan ? parseInt(id_kecamatan) : null;
  if (!assignedKecId) {
    const detectedKec = findDistrictByPoint(latitude, longitude);
    if (detectedKec) assignedKecId = detectedKec.id_kecamatan;
  }

  const newSentra = {
    id_sentra: db.counters.sentra_batik++,
    id_kecamatan: assignedKecId || 1,
    name: name.trim(),
    address: address ? address.trim() : '',
    description: description ? description.trim() : '',
    opening_hours: opening_hours ? opening_hours.trim() : '08:00 - 17:00 WIB',
    phone: phone ? phone.trim() : '',
    geom_point: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    // BR-09: default 'draft' jika bukan diverifikasi langsung oleh admin
    verification_status: verification_status || 'terverifikasi',
    updated_at: new Date().toISOString()
  };

  db.sentra_batik.push(newSentra);

  // Simpan foto galeri awal jika diunggah
  if (req.body.path_foto) {
    db.galeri_foto.push({
      id_foto: db.counters.galeri_foto++,
      id_sentra: newSentra.id_sentra,
      path_foto: req.body.path_foto,
      caption: req.body.caption || 'Foto Utama Sentra'
    });
  }

  saveDb();
  res.json({ success: true, message: 'Sentra batik berhasil ditambahkan', data: newSentra });
});

app.put('/api/admin/sentra/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = parseInt(req.params.id);
  const sentra = db.sentra_batik.find(s => s.id_sentra === id);
  if (!sentra) return res.status(404).json({ success: false, message: 'Sentra tidak ditemukan' });

  const { name, address, description, opening_hours, phone, lat, lon, id_kecamatan, verification_status } = req.body;

  if (name) sentra.name = name.trim();
  if (address !== undefined) sentra.address = address.trim();
  if (description !== undefined) sentra.description = description.trim();
  if (opening_hours !== undefined) sentra.opening_hours = opening_hours.trim();
  if (phone !== undefined) sentra.phone = phone.trim();
  if (id_kecamatan) sentra.id_kecamatan = parseInt(id_kecamatan);
  if (verification_status) sentra.verification_status = verification_status;

  if (lat !== undefined && lon !== undefined) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    if (longitude < 112.5 || longitude > 114.4 || latitude < -7.4 || latitude > -6.7) {
      return res.status(400).json({ success: false, message: 'Koordinat di luar Pulau Madura (BR-06)' });
    }
    sentra.geom_point = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
  }

  sentra.updated_at = new Date().toISOString();
  saveDb();
  res.json({ success: true, message: 'Data sentra berhasil diperbarui', data: sentra });
});

app.delete('/api/admin/sentra/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = parseInt(req.params.id);
  // BR-04: Hanya admin yang dapat menghapus data sentra
  db.sentra_batik = db.sentra_batik.filter(s => s.id_sentra !== id);
  // Hapus cascade galeri foto dan perajin terkait
  db.galeri_foto = db.galeri_foto.filter(g => g.id_sentra !== id);
  db.ulasan = db.ulasan.filter(u => u.id_sentra !== id);
  saveDb();
  res.json({ success: true, message: 'Sentra batik berhasil dihapus (BR-04)' });
});

// Verifikasi Sentra (F-13, BR-09)
app.patch('/api/admin/sentra/:id/verify', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = parseInt(req.params.id);
  const sentra = db.sentra_batik.find(s => s.id_sentra === id);
  if (!sentra) return res.status(404).json({ success: false, message: 'Sentra tidak ditemukan' });

  const { status } = req.body;
  if (!['draft', 'terverifikasi', 'ditolak'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status verifikasi tidak valid' });
  }

  sentra.verification_status = status;
  sentra.updated_at = new Date().toISOString();
  saveDb();

  res.json({ success: true, message: `Status sentra berhasil diubah menjadi: ${status}`, data: sentra });
});

// Moderasi Ulasan oleh Admin (F-13, BR-15)
app.get('/api/admin/ulasan', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const list = db.ulasan.map(u => {
    const user = db.pengguna.find(p => p.id_pengguna === u.id_pengguna);
    const sentra = db.sentra_batik.find(s => s.id_sentra === u.id_sentra);
    return {
      ...u,
      nama_pengguna: user ? user.name : 'Anonim',
      email_pengguna: user ? user.email : '-',
      nama_sentra: sentra ? sentra.name : '-'
    };
  });
  res.json({ success: true, data: list });
});

app.patch('/api/admin/ulasan/:id/status', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = parseInt(req.params.id);
  const ulasan = db.ulasan.find(u => u.id_ulasan === id);
  if (!ulasan) return res.status(404).json({ success: false, message: 'Ulasan tidak ditemukan' });

  const { status } = req.body;
  if (!['tayang', 'ditolak', 'menunggu'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status ulasan tidak valid' });
  }

  ulasan.status = status;
  saveDb();
  res.json({ success: true, message: `Status ulasan berhasil diubah menjadi: ${status}`, data: ulasan });
});

// Data Perajin CRUD untuk Admin (F-12)
app.get('/api/admin/perajin', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const list = db.perajin.map(p => {
    const s = db.sentra_batik.find(st => st.id_sentra === p.id_sentra);
    const u = db.pengguna.find(usr => usr.id_pengguna === p.id_pengguna);
    return {
      ...p,
      nama_sentra: s ? s.name : '-',
      nama_pengguna: u ? u.name : 'Belum dihubungkan',
      email_pengguna: u ? u.email : '-'
    };
  });
  res.json({ success: true, data: list });
});

app.post('/api/admin/perajin', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const { id_sentra, nama_usaha, nama_pemilik, no_whatsapp, tahun_berdiri } = req.body;
  if (!nama_usaha || !nama_pemilik || !id_sentra) {
    return res.status(400).json({ success: false, message: 'Nama usaha, nama pemilik, dan sentra wajib diisi' });
  }

  const newPerajin = {
    id_perajin: db.counters.perajin++,
    id_pengguna: req.body.id_pengguna ? parseInt(req.body.id_pengguna) : null,
    id_sentra: parseInt(id_sentra),
    nama_usaha: nama_usaha.trim(),
    nama_pemilik: nama_pemilik.trim(),
    no_whatsapp: no_whatsapp ? no_whatsapp.trim() : '',
    tahun_berdiri: tahun_berdiri ? parseInt(tahun_berdiri) : new Date().getFullYear()
  };

  db.perajin.push(newPerajin);
  saveDb();
  res.json({ success: true, message: 'Perajin berhasil ditambahkan', data: newPerajin });
});

app.delete('/api/admin/perajin/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = parseInt(req.params.id);
  db.perajin = db.perajin.filter(p => p.id_perajin !== id);
  db.produk = db.produk.filter(pr => pr.id_perajin !== id);
  saveDb();
  res.json({ success: true, message: 'Data perajin dan produk terkait berhasil dihapus' });
});

// ==========================================
// 8. EKSPOR DATA GEOJSON & CSV (F-14, P5 DFD)
// ==========================================
app.get('/api/export/geojson', (req, res) => {
  const features = db.sentra_batik.map(s => {
    const kec = db.kecamatan.find(k => k.id_kecamatan === s.id_kecamatan);
    const kab = kec ? db.kabupaten.find(kb => kb.id_kabupaten === kec.id_kabupaten) : null;
    return {
      type: 'Feature',
      id: s.id_sentra,
      properties: {
        id_sentra: s.id_sentra,
        nama_sentra: s.name,
        kabupaten: kab ? kab.name : '-',
        kecamatan: kec ? kec.name : '-',
        alamat: s.address,
        jam_operasional: s.opening_hours,
        telepon: s.phone,
        status_verifikasi: s.verification_status,
        diperbarui_pada: s.updated_at
      },
      geometry: s.geom_point
    };
  });

  const geojson = {
    type: 'FeatureCollection',
    name: 'geobatik_madura_sentra',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="geobatik_madura_sentra.geojson"');
  res.send(JSON.stringify(geojson, null, 2));
});

app.get('/api/export/csv', (req, res) => {
  const headers = ['id_sentra', 'nama_sentra', 'kabupaten', 'kecamatan', 'alamat', 'jam_operasional', 'no_telepon', 'latitude', 'longitude', 'status_verifikasi'];
  const rows = db.sentra_batik.map(s => {
    const kec = db.kecamatan.find(k => k.id_kecamatan === s.id_kecamatan);
    const kab = kec ? db.kabupaten.find(kb => kb.id_kabupaten === kec.id_kabupaten) : null;
    const [lon, lat] = s.geom_point ? s.geom_point.coordinates : ['', ''];
    return [
      s.id_sentra,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${kab ? kab.name : '-'}"`,
      `"${kec ? kec.name : '-'}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      `"${(s.opening_hours || '').replace(/"/g, '""')}"`,
      `"${s.phone || ''}"`,
      lat,
      lon,
      s.verification_status
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="geobatik_madura_sentra.csv"');
  res.send(csvContent);
});

// ==========================================
// 9. UPLOAD BERKAS MEDIA (BR-16)
// ==========================================
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada berkas yang diunggah' });
  }
  const relativePath = '/uploads/' + req.file.filename;
  res.json({
    success: true,
    message: 'Berkas berhasil diunggah',
    filePath: relativePath
  });
});

// Master Wilayah
app.get('/api/wilayah/kabupaten', (req, res) => {
  res.json({ success: true, data: db.kabupaten });
});

app.get('/api/wilayah/kecamatan', (req, res) => {
  const { id_kabupaten } = req.query;
  let list = db.kecamatan;
  if (id_kabupaten) {
    list = list.filter(k => k.id_kabupaten === parseInt(id_kabupaten));
  }
  res.json({ success: true, data: list });
});

// Fallback untuk SPA jika rute tidak cocok
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`=====================================================`);
  console.log(`  GeoBatik Madura WebGIS berjalan di http://localhost:${PORT}`);
  console.log(`  Nama Aplikasi : GeoBatik Madura`);
  console.log(`  Oleh          : Sarifatul Maimuna (NPM: 20241230009)`);
  console.log(`=====================================================`);
});
