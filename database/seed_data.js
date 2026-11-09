const bcrypt = require('bcryptjs');

module.exports = function seedData(db) {
  console.log('Menyiapkan data awal GeoBatik Madura...');

  const passAdmin = bcrypt.hashSync('admin123', 10);
  const passPerajin = bcrypt.hashSync('perajin123', 10);
  const passUser = bcrypt.hashSync('user123', 10);

  // 1. PENGGUNA
  db.pengguna = [
    {
      id_pengguna: 1,
      name: 'Admin Disperindag & Disbudpar',
      email: 'admin@geobatik.id',
      password_hash: passAdmin,
      role: 'admin',
      created_at: new Date('2026-01-10T08:00:00Z').toISOString()
    },
    {
      id_pengguna: 2,
      name: 'Pak Hasan Basri (Perajin Klampar)',
      email: 'perajin@geobatik.id',
      password_hash: passPerajin,
      role: 'perajin',
      created_at: new Date('2026-01-15T09:30:00Z').toISOString()
    },
    {
      id_pengguna: 3,
      name: 'Rina Septiani (Wisatawan)',
      email: 'pengunjung@geobatik.id',
      password_hash: passUser,
      role: 'pengunjung',
      created_at: new Date('2026-02-01T10:15:00Z').toISOString()
    },
    {
      id_pengguna: 4,
      name: 'Hj. Maemunah (Perajin Tanjungbumi)',
      email: 'maemunah@geobatik.id',
      password_hash: passPerajin,
      role: 'perajin',
      created_at: new Date('2026-02-05T11:00:00Z').toISOString()
    }
  ];

  // 2. KABUPATEN
  // Poligon koordinat batas 4 kabupaten di Pulau Madura (WGS 84, EPSG:4326)
  db.kabupaten = [
    {
      id_kabupaten: 1,
      name: 'Bangkalan',
      color: '#1F345F',
      center: [112.82, -7.03],
      geom: {
        type: 'Polygon',
        coordinates: [[
          [112.65, -7.02], [112.72, -6.88], [112.88, -6.84], [113.04, -6.86],
          [113.06, -7.00], [113.02, -7.15], [112.84, -7.19], [112.70, -7.18],
          [112.65, -7.02]
        ]]
      }
    },
    {
      id_kabupaten: 2,
      name: 'Sampang',
      color: '#0e7490',
      center: [113.25, -7.08],
      geom: {
        type: 'Polygon',
        coordinates: [[
          [113.06, -7.00], [113.04, -6.86], [113.20, -6.87], [113.38, -6.89],
          [113.40, -7.02], [113.37, -7.21], [113.22, -7.23], [113.12, -7.18],
          [113.06, -7.00]
        ]]
      }
    },
    {
      id_kabupaten: 3,
      name: 'Pamekasan',
      color: '#8B5A2B',
      center: [113.50, -7.12],
      geom: {
        type: 'Polygon',
        coordinates: [[
          [113.40, -7.02], [113.38, -6.89], [113.56, -6.90], [113.63, -6.95],
          [113.64, -7.18], [113.52, -7.24], [113.41, -7.20], [113.40, -7.02]
        ]]
      }
    },
    {
      id_kabupaten: 4,
      name: 'Sumenep',
      color: '#B23A2B',
      center: [113.86, -7.01],
      geom: {
        type: 'Polygon',
        coordinates: [[
          [113.63, -6.95], [113.56, -6.90], [113.75, -6.85], [113.98, -6.88],
          [114.08, -6.98], [114.02, -7.14], [113.80, -7.16], [113.64, -7.18],
          [113.63, -6.95]
        ]]
      }
    }
  ];

  // 3. KECAMATAN
  db.kecamatan = [
    // Bangkalan
    {
      id_kecamatan: 1,
      id_kabupaten: 1,
      name: 'Tanjungbumi',
      center: [112.92, -6.89],
      geom: {
        type: 'Polygon',
        coordinates: [[[112.85, -6.85], [112.98, -6.85], [112.97, -6.95], [112.85, -6.94], [112.85, -6.85]]]
      }
    },
    {
      id_kecamatan: 2,
      id_kabupaten: 1,
      name: 'Arosbaya',
      center: [112.84, -6.98],
      geom: {
        type: 'Polygon',
        coordinates: [[[112.78, -6.95], [112.90, -6.95], [112.89, -7.05], [112.78, -7.04], [112.78, -6.95]]]
      }
    },
    {
      id_kecamatan: 3,
      id_kabupaten: 1,
      name: 'Bangkalan Kota',
      center: [112.74, -7.04],
      geom: {
        type: 'Polygon',
        coordinates: [[[112.70, -7.00], [112.80, -7.00], [112.80, -7.08], [112.70, -7.08], [112.70, -7.00]]]
      }
    },
    // Sampang
    {
      id_kecamatan: 4,
      id_kabupaten: 2,
      name: 'Camplong',
      center: [113.31, -7.19],
      geom: {
        type: 'Polygon',
        coordinates: [[[113.25, -7.15], [113.36, -7.15], [113.36, -7.23], [113.25, -7.23], [113.25, -7.15]]]
      }
    },
    {
      id_kecamatan: 5,
      id_kabupaten: 2,
      name: 'Sampang Kota',
      center: [113.24, -7.18],
      geom: {
        type: 'Polygon',
        coordinates: [[[113.20, -7.14], [113.28, -7.14], [113.28, -7.22], [113.20, -7.22], [113.20, -7.14]]]
      }
    },
    // Pamekasan
    {
      id_kecamatan: 6,
      id_kabupaten: 3,
      name: 'Proppo',
      center: [113.43, -7.16],
      geom: {
        type: 'Polygon',
        coordinates: [[[113.38, -7.12], [113.48, -7.12], [113.48, -7.20], [113.38, -7.20], [113.38, -7.12]]]
      }
    },
    {
      id_kecamatan: 7,
      id_kabupaten: 3,
      name: 'Pamekasan Kota',
      center: [113.48, -7.15],
      geom: {
        type: 'Polygon',
        coordinates: [[[113.45, -7.12], [113.53, -7.12], [113.53, -7.19], [113.45, -7.19], [113.45, -7.12]]]
      }
    },
    // Sumenep
    {
      id_kecamatan: 8,
      id_kabupaten: 4,
      name: 'Ganding (Pakandangan)',
      center: [113.78, -7.06],
      geom: {
        type: 'Polygon',
        coordinates: [[[113.72, -7.02], [113.84, -7.02], [113.84, -7.11], [113.72, -7.11], [113.72, -7.02]]]
      }
    },
    {
      id_kecamatan: 9,
      id_kabupaten: 4,
      name: 'Sumenep Kota',
      center: [113.86, -7.01],
      geom: {
        type: 'Polygon',
        coordinates: [[[113.82, -6.97], [113.91, -6.97], [113.91, -7.06], [113.82, -7.06], [113.82, -6.97]]]
      }
    }
  ];

  // 4. MOTIF (Katalog Motif Batik Madura beserta Makna dan Filosofi)
  db.motif = [
    {
      id_motif: 1,
      id_kabupaten: 1,
      nama_motif: 'Gentongan',
      makna: 'Melambangkan kesabaran, ketekunan, dan ketahanan hidup. Proses pewarnaannya direndam berbulan-bulan di dalam gentong tanah liat khas Tanjungbumi hingga warnanya meresap abadi dan tidak pudar.',
      description: 'Ciri visual warna pekat dan berani, garis canting tegas dengan ornamen flora pesisir dan fauna laut.',
      foto_motif: '/images/motif_gentongan.jpg'
    },
    {
      id_motif: 2,
      id_kabupaten: 1,
      nama_motif: 'Tarik Jiwo',
      makna: 'Menarik jiwa dan hati siapa pun yang memandangnya. Menggambarkan pesona estetika budaya leluhur Madura barat yang memikat.',
      description: 'Kombinasi ornamen sulur tumbuhan meliuk harmonis dengan latar hitam pekat dan taburan titik (isen-isen) rapat.',
      foto_motif: '/images/motif_tarik_jiwo.jpg'
    },
    {
      id_motif: 3,
      id_kabupaten: 2,
      nama_motif: 'Ombak Segoro',
      makna: 'Melambangkan jiwa maritim masyarakat pesisir Sampang yang pantang menyerah menghadapi deburan ombak kehidupan.',
      description: 'Lekukan garis menyerupai gelombang samudra biru dan hijau tosca dengan aksen perahu nelayan.',
      foto_motif: '/images/motif_ombak_segoro.jpg'
    },
    {
      id_motif: 4,
      id_kabupaten: 3,
      nama_motif: 'Sekar Jagad Madura',
      makna: 'Peta keanekaragaman dunia yang penuh keindahan. Mengandung doa agar pemakainya memancarkan pesona dan wibawa kemuliaan.',
      description: 'Pola bidang geometris berpadu flora aneka warna khas soga madura dengan isen-isen sawut dan cecek yang rumit.',
      foto_motif: '/images/motif_sekar_jagad.jpg'
    },
    {
      id_motif: 5,
      id_kabupaten: 3,
      nama_motif: 'Kar-karan',
      makna: 'Berasal dari kata car-karan (guratan tegas). Menggambarkan karakter masyarakat Madura yang jujur, lugas, tegas, dan pemberani.',
      description: 'Guratan garis-garis silang dinamis kontras tinggi dengan warna merah bata, hitam, dan kuning emas.',
      foto_motif: '/images/motif_kar_karan.jpg'
    },
    {
      id_motif: 6,
      id_kabupaten: 3,
      nama_motif: 'Lancor Pamekasan',
      makna: 'Terinspirasi dari Monumen Arek Lancor, simbol semangat heroisme dan persatuan rakyat Pamekasan mempertahankan kehormatan.',
      description: 'Siluet senjata tradisional lancor dengan hiasan dedaunan tembakau andalan agraris Pamekasan.',
      foto_motif: '/images/motif_lancor.jpg'
    },
    {
      id_motif: 7,
      id_kabupaten: 4,
      nama_motif: 'Melati Rinonce',
      makna: 'Melambangkan kesucian, keanggunan budi pekerti, dan wangi nama baik tradisi putri Keraton Sumenep.',
      description: 'Untaian bunga melati mungil yang berangkai indah dengan nuansa warna pastel lembut dan krem tanah.',
      foto_motif: '/images/motif_melati_rinonce.jpg'
    },
    {
      id_motif: 8,
      id_kabupaten: 4,
      nama_motif: 'Daun Memba',
      makna: 'Daun mimba adalah herbal keraton lambang penolak bala, kesehatan, serta keteduhan batin bagi pemakainya.',
      description: 'Pola daun bergerigi lembut berselang-seling dengan kuncup bunga liar khas Madura timur.',
      foto_motif: '/images/motif_daun_memba.jpg'
    }
  ];

  // 5. SENTRA BATIK (Titik Geometri Spasial Point)
  db.sentra_batik = [
    {
      id_sentra: 1,
      id_kecamatan: 1,
      name: 'Sentra Batik Tulis Gentongan Tanjungbumi',
      address: 'Jl. Raya Tanjungbumi, Desa Telaga Biru, Tanjungbumi, Kabupaten Bangkalan',
      description: 'Sentra batik legendaris tertua di Bangkalan. Terkenal di seluruh nusantara dan mancanegara dengan teknik perendaman gentong tanah liat alami selama 3 hingga 6 bulan.',
      opening_hours: '08:00 - 17:00 WIB',
      phone: '081234567801',
      geom_point: {
        type: 'Point',
        coordinates: [112.9231, -6.8835]
      },
      verification_status: 'terverifikasi',
      updated_at: new Date('2026-02-10T10:00:00Z').toISOString()
    },
    {
      id_sentra: 2,
      id_kecamatan: 2,
      name: 'Galeri Batik Pesisir Arosbaya',
      address: 'Desa Tengket, Kec. Arosbaya, Kabupaten Bangkalan',
      description: 'Pusat batik pesisir khas Arosbaya dengan ciri corak flora laut serta pewarnaan alami mangrove dan kayu mahoni.',
      opening_hours: '08:30 - 16:30 WIB',
      phone: '081234567802',
      geom_point: {
        type: 'Point',
        coordinates: [112.8456, -7.0012]
      },
      verification_status: 'terverifikasi',
      updated_at: new Date('2026-02-12T11:00:00Z').toISOString()
    },
    {
      id_sentra: 3,
      id_kecamatan: 4,
      name: 'Sentra Batik Camplong Bahari',
      address: 'Jl. Raya Camplong No. 45, Kec. Camplong, Kabupaten Sampang',
      description: 'Sentra pengrajin batik Sampang dengan inspirasi biota laut Selat Madura dan keindahan senja pantai Camplong.',
      opening_hours: '08:00 - 17:00 WIB',
      phone: '081234567803',
      geom_point: {
        type: 'Point',
        coordinates: [113.3120, -7.1954]
      },
      verification_status: 'terverifikasi',
      updated_at: new Date('2026-02-14T09:00:00Z').toISOString()
    },
    {
      id_sentra: 4,
      id_kecamatan: 5,
      name: 'Rumah Batik Morbatoh Sampang',
      address: 'Kelurahan Karang Dalem, Kec. Sampang Kota, Kabupaten Sampang',
      description: 'Sentra batik perkotaan Sampang yang menggabungkan motif tradisional dan kontemporer untuk anak muda dan busana formal dinas.',
      opening_hours: '09:00 - 20:00 WIB',
      phone: '081234567804',
      geom_point: {
        type: 'Point',
        coordinates: [113.2389, -7.1652]
      },
      verification_status: 'terverifikasi',
      updated_at: new Date('2026-02-15T13:00:00Z').toISOString()
    },
    {
      id_sentra: 5,
      id_kecamatan: 6,
      name: 'Kampung Batik Klampar Proppo',
      address: 'Desa Klampar, Kec. Proppo, Kabupaten Pamekasan',
      description: 'Kawasan sentra batik terbesar di Madura dengan lebih dari 800 perajin rumahan. Pamekasan dijuluki Kota Batik berkat kekayaan karya dari desa Klampar.',
      opening_hours: '07:30 - 17:30 WIB',
      phone: '081234567805',
      geom_point: {
        type: 'Point',
        coordinates: [113.4352, -7.1623]
      },
      verification_status: 'terverifikasi',
      updated_at: new Date('2026-02-18T14:30:00Z').toISOString()
    },
    {
      id_sentra: 6,
      id_kecamatan: 7,
      name: 'Sentra Batik Podhok Sedangdang',
      address: 'Kompleks Sedangdang, Jl. Ronggosukowati, Pamekasan Kota',
      description: 'Pusat galeri pameran dan bursa transaksi batik Pamekasan di tengah kota, memudahkan wisatawan mendapatkan koleksi premium.',
      opening_hours: '08:00 - 21:00 WIB',
      phone: '081234567806',
      geom_point: {
        type: 'Point',
        coordinates: [113.4721, -7.1485]
      },
      verification_status: 'terverifikasi',
      updated_at: new Date('2026-02-20T10:00:00Z').toISOString()
    },
    {
      id_sentra: 7,
      id_kecamatan: 8,
      name: 'Sentra Batik Tulis Pakandangan Barat',
      address: 'Dusun Karang, Desa Pakandangan Barat, Kec. Ganding, Kabupaten Sumenep',
      description: 'Pusat kerajinan batik tulis halus Sumenep dengan corak klasik Keraton Arya Wiraraja dan nuansa warna merah cabe serta hijau pupus.',
      opening_hours: '08:00 - 16:30 WIB',
      phone: '081234567807',
      geom_point: {
        type: 'Point',
        coordinates: [113.7845, -7.0652]
      },
      verification_status: 'terverifikasi',
      updated_at: new Date('2026-02-22T08:30:00Z').toISOString()
    },
    {
      id_sentra: 8,
      id_kecamatan: 9,
      name: 'Galeri Batik Keraton Sumenep',
      address: 'Jl. Dr. Sutomo No. 12 (Dekat Museum Keraton), Sumenep Kota',
      description: 'Menampilkan batik tulis mahakarya dengan ornamen pakem keraton Sumenep tempo doeloe yang anggun dan berkelas kolektor.',
      opening_hours: '09:00 - 17:00 WIB',
      phone: '081234567808',
      geom_point: {
        type: 'Point',
        coordinates: [113.8641, -7.0094]
      },
      verification_status: 'terverifikasi',
      updated_at: new Date('2026-02-25T15:00:00Z').toISOString()
    },
    // Sentra uji coba draft (untuk pengujian admin verifikasi F-13)
    {
      id_sentra: 9,
      id_kecamatan: 3,
      name: 'Batik Tulis Burneh Makmur (Usulan Baru)',
      address: 'Jl. Raya Burneh No. 10, Bangkalan',
      description: 'Rintisan kelompok perajin muda di Burneh yang mengembangkan batik warna alam indigofera.',
      opening_hours: '09:00 - 16:00 WIB',
      phone: '081234567809',
      geom_point: {
        type: 'Point',
        coordinates: [112.7812, -7.0621]
      },
      verification_status: 'draft',
      updated_at: new Date('2026-03-01T09:00:00Z').toISOString()
    }
  ];

  // 6. PERAJIN
  db.perajin = [
    {
      id_perajin: 1,
      id_pengguna: 4,
      id_sentra: 1,
      nama_usaha: 'Batik Tulis Gentongan Hj. Maemunah',
      nama_pemilik: 'Hj. Maemunah',
      no_whatsapp: '6281234567801',
      tahun_berdiri: 1988
    },
    {
      id_perajin: 2,
      id_pengguna: 2,
      id_sentra: 5,
      nama_usaha: 'Griya Batik Klampar Indah',
      nama_pemilik: 'Pak Hasan Basri',
      no_whatsapp: '6281234567805',
      tahun_berdiri: 1999
    },
    {
      id_perajin: 3,
      id_pengguna: 1,
      id_sentra: 7,
      nama_usaha: 'Batik Canteng Sumekar Pakandangan',
      nama_pemilik: 'H. Abdurrahman',
      no_whatsapp: '6281234567807',
      tahun_berdiri: 1994
    },
    {
      id_perajin: 4,
      id_pengguna: null,
      id_sentra: 3,
      nama_usaha: 'Sanggar Batik Camplong Bahari',
      nama_pemilik: 'Ibu Siti Rohmah',
      no_whatsapp: '6281234567803',
      tahun_berdiri: 2008
    },
    {
      id_perajin: 5,
      id_pengguna: null,
      id_sentra: 6,
      nama_usaha: 'Batik Lancor Mas Pamekasan',
      nama_pemilik: 'Bpk. Fathur Rozak',
      no_whatsapp: '6281234567806',
      tahun_berdiri: 2012
    }
  ];

  // 7. PRODUK (Katalog Produk Batik Perajin)
  db.produk = [
    {
      id_produk: 1,
      id_perajin: 1,
      id_motif: 1,
      name: 'Kain Panjang Tulis Gentongan Sutra Alam',
      technique: 'tulis',
      dye_type: 'alami',
      min_price: 1500000,
      max_price: 3500000,
      foto_produk: '/images/produk_gentongan_1.jpg'
    },
    {
      id_produk: 2,
      id_perajin: 1,
      id_motif: 2,
      name: 'Kain Batik Tulis Primissima Tarik Jiwo',
      technique: 'tulis',
      dye_type: 'sintetis',
      min_price: 450000,
      max_price: 850000,
      foto_produk: '/images/produk_tarik_jiwo_1.jpg'
    },
    {
      id_produk: 3,
      id_perajin: 2,
      id_motif: 4,
      name: 'Selendang Sutra Sekar Jagad Madura Klampar',
      technique: 'tulis',
      dye_type: 'alami',
      min_price: 650000,
      max_price: 1200000,
      foto_produk: '/images/produk_sekar_jagad_1.jpg'
    },
    {
      id_produk: 4,
      id_perajin: 2,
      id_motif: 5,
      name: 'Kemeja Pria Batik Tulis Kar-karan Berani',
      technique: 'tulis',
      dye_type: 'sintetis',
      min_price: 350000,
      max_price: 750000,
      foto_produk: '/images/produk_kar_karan_1.jpg'
    },
    {
      id_produk: 5,
      id_perajin: 5,
      id_motif: 6,
      name: 'Sarimbit Pasangan Batik Motif Lancor Pamekasan',
      technique: 'kombinasi',
      dye_type: 'sintetis',
      min_price: 250000,
      max_price: 550000,
      foto_produk: '/images/produk_lancor_1.jpg'
    },
    {
      id_produk: 6,
      id_perajin: 3,
      id_motif: 7,
      name: 'Kain Batik Tulis Halus Melati Rinonce Keraton',
      technique: 'tulis',
      dye_type: 'alami',
      min_price: 800000,
      max_price: 1800000,
      foto_produk: '/images/produk_melati_1.jpg'
    },
    {
      id_produk: 7,
      id_perajin: 4,
      id_motif: 3,
      name: 'Batik Cap Pesisir Ombak Segoro Sampang',
      technique: 'cap',
      dye_type: 'sintetis',
      min_price: 135000,
      max_price: 250000,
      foto_produk: '/images/produk_ombak_1.jpg'
    }
  ];

  // 8. GALERI FOTO
  db.galeri_foto = [
    {
      id_foto: 1,
      id_sentra: 1,
      path_foto: '/images/galeri_gentong_1.jpg',
      caption: 'Proses perendaman kain dalam gentong tanah liat tradisional'
    },
    {
      id_foto: 2,
      id_sentra: 1,
      path_foto: '/images/galeri_gentong_2.jpg',
      caption: 'Penjemuran kain batik gentongan di bawah sinar matahari pantai'
    },
    {
      id_foto: 3,
      id_sentra: 5,
      path_foto: '/images/galeri_klampar_1.jpg',
      caption: 'Aktivitas ratusan pembatik wanita di serambi rumah desa Klampar'
    },
    {
      id_foto: 4,
      id_sentra: 5,
      path_foto: '/images/galeri_klampar_2.jpg',
      caption: 'Goresan canting malam panas di atas kain mori primissima'
    },
    {
      id_foto: 5,
      id_sentra: 7,
      path_foto: '/images/galeri_sumenep_1.jpg',
      caption: 'Koleksi batik klasik Sumenep di sanggar Pakandangan Barat'
    }
  ];

  // 9. ULASAN
  db.ulasan = [
    {
      id_ulasan: 1,
      id_sentra: 1,
      id_pengguna: 3,
      rating: 5,
      comment: 'Batik Gentongan Tanjungbumi luar biasa! Warnanya sangat awet dan motifnya sangat khas. Pelayanan ramah sekali.',
      status: 'tayang',
      date: new Date('2026-02-15T14:20:00Z').toISOString()
    },
    {
      id_ulasan: 2,
      id_sentra: 5,
      id_pengguna: 3,
      rating: 5,
      comment: 'Klampar adalah surga batik! Pilihannya melimpah dengan harga langsung dari tangan perajin pertama.',
      status: 'tayang',
      date: new Date('2026-02-20T16:45:00Z').toISOString()
    },
    {
      id_ulasan: 3,
      id_sentra: 7,
      id_pengguna: 3,
      rating: 4,
      comment: 'Motif keraton Sumenep sangat elegan untuk acara pernikahan dan resmi. Tempatnya asri dan edukatif.',
      status: 'tayang',
      date: new Date('2026-02-28T10:10:00Z').toISOString()
    },
    // Ulasan menunggu moderasi (untuk uji F-13 dan P5 DFD)
    {
      id_ulasan: 4,
      id_sentra: 3,
      id_pengguna: 3,
      rating: 5,
      comment: 'Lokasi dekat pantai, enak mampir beli oleh-oleh sambil menikmati hembusan angin laut Camplong.',
      status: 'menunggu',
      date: new Date('2026-03-02T11:00:00Z').toISOString()
    }
  ];

  // Update counters
  db.counters = {
    pengguna: 5,
    kabupaten: 5,
    kecamatan: 10,
    sentra_batik: 10,
    perajin: 6,
    motif: 9,
    produk: 8,
    galeri_foto: 6,
    ulasan: 5
  };

  console.log('Seed data GeoBatik Madura berhasil dimuat!');
};

