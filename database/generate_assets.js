const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'images');
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

function createSvg(title, subtitle, bgColor, patternColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="${bgColor}"/>
    <g opacity="0.25" stroke="${patternColor}" stroke-width="2.5" fill="none">
      <circle cx="100" cy="100" r="50"/>
      <circle cx="300" cy="100" r="50"/>
      <circle cx="500" cy="100" r="50"/>
      <circle cx="200" cy="240" r="60"/>
      <circle cx="400" cy="240" r="60"/>
      <path d="M0,180 Q150,90 300,180 T600,180" />
      <path d="M0,220 Q150,310 300,220 T600,220" />
      <polygon points="300,50 325,110 395,110 340,150 360,210 300,170 240,210 260,150 205,110 275,110"/>
    </g>
    <rect x="30" y="270" width="540" height="100" rx="14" fill="#000000" fill-opacity="0.72"/>
    <text x="50" y="312" font-family="Poppins, Arial, sans-serif" font-weight="700" font-size="22" fill="#FFFFFF">${title}</text>
    <text x="50" y="344" font-family="Inter, Arial, sans-serif" font-size="14" fill="#F5ECD7">${subtitle}</text>
  </svg>`;
}

const assets = [
  ['motif_gentongan.jpg', 'Motif Gentongan', 'Bangkalan - Rendaman Gentong Alami', '#3b1d11', '#c29b38'],
  ['motif_tarik_jiwo.jpg', 'Motif Tarik Jiwo', 'Bangkalan - Pesona Jiwa Leluhur', '#1A2536', '#E2A855'],
  ['motif_ombak_segoro.jpg', 'Motif Ombak Segoro', 'Sampang - Maritim & Tangguh', '#0F3846', '#48CAE4'],
  ['motif_sekar_jagad.jpg', 'Motif Sekar Jagad Madura', 'Pamekasan - Keindahan Keanekaragaman', '#4A2810', '#E9C46A'],
  ['motif_kar_karan.jpg', 'Motif Kar-karan', 'Pamekasan - Karakter Lugas & Berani', '#6b1d1d', '#F4A261'],
  ['motif_lancor.jpg', 'Motif Lancor Pamekasan', 'Pamekasan - Simbol Semangat Arek Lancor', '#2C3E50', '#E74C3C'],
  ['motif_melati_rinonce.jpg', 'Motif Melati Rinonce', 'Sumenep - Keanggunan Keraton Sumekar', '#42273B', '#F3C68F'],
  ['motif_daun_memba.jpg', 'Motif Daun Memba', 'Sumenep - Kesejukan & Tradisi Keraton', '#1E3F20', '#A3E635'],
  ['produk_gentongan_1.jpg', 'Kain Sutra Gentongan', 'Batik Tulis Alami 3 Bulan', '#2b1408', '#d4af37'],
  ['produk_tarik_jiwo_1.jpg', 'Kain Primissima Tarik Jiwo', 'Batik Tulis Corak Madura Barat', '#14213d', '#fca311'],
  ['produk_sekar_jagad_1.jpg', 'Selendang Sutra Sekar Jagad', 'Batik Tulis Klampar Pamekasan', '#381e11', '#e7c169'],
  ['produk_kar_karan_1.jpg', 'Kemeja Batik Kar-karan', 'Pria Berwibawa & Elegan', '#4c1111', '#f39c12'],
  ['produk_lancor_1.jpg', 'Sarimbit Pasangan Lancor', 'Batik Kombinasi Tulis & Cap', '#1e293b', '#ef4444'],
  ['produk_melati_1.jpg', 'Kain Melati Rinonce Keraton', 'Batik Halus Sutra Sumenep', '#3b1c32', '#fbcfe8'],
  ['produk_ombak_1.jpg', 'Batik Cap Ombak Segoro', 'Katun Adem Pesisir Camplong', '#082f49', '#38bdf8'],
  ['galeri_gentong_1.jpg', 'Gentong Tanah Liat Tradisional', 'Dokumentasi Sentra Tanjungbumi', '#24140e', '#c49752'],
  ['galeri_gentong_2.jpg', 'Penjemuran Kain Pesisir', 'Dokumentasi Sentra Tanjungbumi', '#1b2a4a', '#f5ecd7'],
  ['galeri_klampar_1.jpg', 'Aktivitas Serambi Pembatik', 'Dokumentasi Kampung Batik Klampar', '#3d2614', '#e8c547'],
  ['galeri_klampar_2.jpg', 'Canting Malam Primissima', 'Dokumentasi Kampung Batik Klampar', '#401818', '#f28e2b'],
  ['galeri_sumenep_1.jpg', 'Koleksi Batik Klasik Sumekar', 'Dokumentasi Sanggar Pakandangan', '#2d1b2e', '#e0a96d']
];

for (const [fname, title, sub, bg, pat] of assets) {
  fs.writeFileSync(path.join(dir, fname), createSvg(title, sub, bg, pat), 'utf-8');
}
console.log('Semua aset visual SVG untuk WebGIS Batik Madura berhasil disimpan di public/images/');

