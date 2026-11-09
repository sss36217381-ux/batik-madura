// ============================================================================
// GeoBatik Madura - Frontend WebGIS Client Application
// Sesuai Perancangan Prototype WebGIS Batik Madura (Sarifatul Maimuna - 20241230009)
// ============================================================================

// Global State
let map = null;
let pickerMap = null;
let pickerMarker = null;
let kabupatenGeoJsonLayer = null;
let sentraLayerGroup = null;
let currentBasemap = 'osm';
let basemapLayers = {};

let currentUser = null;
let currentToken = localStorage.getItem('geobatik_token') || null;

let allSentras = [];
let allMotifs = [];
let allKecamatans = [];
let userLocation = null;
let activeSentraDetailId = null;

// Kabupaten Colors (Section 6.4 Visual Identity)
const KABUPATEN_COLORS = {
  1: '#1F345F', // Bangkalan - Biru Nilai
  2: '#0e7490', // Sampang - Cyan/Biru Bahari
  3: '#8B5A2B', // Pamekasan - Cokelat Soga
  4: '#B23A2B'  // Sumenep - Merah Bata Keraton
};

// ==========================================
// 1. INITIALIZATION ON DOM LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await checkAuthStatus();
  await loadMotifs();
  await loadKecamatans();
  await loadSentras();
  await loadKabupatenGeoJson();
  initPickerMap();

  // Keyword filter search listener
  const searchInput = document.getElementById('filter-keyword');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => applyFilters(), 350));
  }
});

// ==========================================
// 2. LEAFLET WEBGIS INITIALIZATION (F-01, F-02, F-03)
// ==========================================
function initMap() {
  // Center on Madura Island: Lat -7.05, Lon 113.35, Zoom 10
  map = L.map('map', {
    zoomControl: false
  }).setView([-7.05, 113.35], 10);

  // Custom Zoom Control (bottom-left)
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  // Scale bar
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

  // Basemap Tile Layers
  basemapLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap kontributor | GeoBatik Madura'
  });

  basemapLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; GeoBatik Madura'
  });

  basemapLayers.carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; CartoDB &mdash; GeoBatik Madura'
  });

  // Default OSM
  basemapLayers.osm.addTo(map);

  // Layer Groups
  sentraLayerGroup = L.layerGroup().addTo(map);
}

// Switch Basemap Layer (F-03)
function switchBasemap(type) {
  if (basemapLayers[currentBasemap]) {
    map.removeLayer(basemapLayers[currentBasemap]);
  }
  if (basemapLayers[type]) {
    basemapLayers[type].addTo(map);
    currentBasemap = type;
  }
}

// Load Kabupaten GeoJSON Polygon (F-02, Choropleth Sederhana 7.3)
async function loadKabupatenGeoJson() {
  try {
    const res = await fetch('/api/geojson/kabupaten');
    const geojson = await res.json();

    if (kabupatenGeoJsonLayer) {
      map.removeLayer(kabupatenGeoJsonLayer);
    }

    kabupatenGeoJsonLayer = L.geoJSON(geojson, {
      style: feature => {
        const color = feature.properties.color || '#1F345F';
        return {
          fillColor: color,
          weight: 2.5,
          opacity: 0.8,
          color: color,
          dashArray: '4, 4',
          fillOpacity: 0.15
        };
      },
      onEachFeature: (feature, layer) => {
        // Tooltip nama kabupaten & jumlah sentra
        const props = feature.properties;
        layer.bindTooltip(`
          <div class="text-xs p-1 font-sans">
            <span class="font-bold text-slate-800">${props.nama_kabupaten}</span><br>
            <span class="text-slate-500">${props.sentra_count} Sentra Batik Terverifikasi</span>
          </div>
        `, { sticky: true, className: 'custom-tooltip' });

        layer.on({
          mouseover: e => {
            const l = e.target;
            l.setStyle({ fillOpacity: 0.35, weight: 3.5 });
          },
          mouseout: e => {
            kabupatenGeoJsonLayer.resetStyle(e.target);
          },
          click: e => {
            map.fitBounds(e.target.getBounds());
            // Filter by kabupaten
            const sel = document.getElementById('filter-kabupaten');
            if (sel) {
              sel.value = props.id_kabupaten;
              applyFilters();
            }
          }
        });
      }
    }).addTo(map);
  } catch (err) {
    console.error('Gagal memuat batas kabupaten GeoJSON:', err);
  }
}

// Toggle Layers
function toggleKabupatenLayer() {
  const chk = document.getElementById('layer-toggle-kabupaten');
  if (!kabupatenGeoJsonLayer) return;
  if (chk.checked) {
    map.addLayer(kabupatenGeoJsonLayer);
  } else {
    map.removeLayer(kabupatenGeoJsonLayer);
  }
}

function toggleSentraLayer() {
  const chk = document.getElementById('layer-toggle-sentra');
  if (chk.checked) {
    map.addLayer(sentraLayerGroup);
  } else {
    map.removeLayer(sentraLayerGroup);
  }
}

// Custom Marker SVG Generator
function createMarkerIcon(color, rating) {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="position: relative; width: 34px; height: 42px; transform: translate(-50%, -100%);">
        <svg viewBox="0 0 384 512" width="34" height="42" fill="${color}" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.3));">
          <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
        </svg>
        <div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 14px; height: 14px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: ${color};">
          ★
        </div>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38]
  });
}

// ==========================================
// 3. DATA LOADERS & SEARCH FILTERS (F-05)
// ==========================================
async function loadSentras(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/sentra?${query}`);
    const data = await res.json();
    if (data.success) {
      allSentras = data.data;
      renderMapMarkers(allSentras);
      renderSearchResults(allSentras);
      renderBerandaCards(allSentras);
      document.getElementById('results-count').innerText = `${allSentras.length} Sentra`;
    }
  } catch (err) {
    console.error('Gagal memuat data sentra:', err);
  }
}

async function loadMotifs() {
  try {
    const res = await fetch('/api/motif');
    const data = await res.json();
    if (data.success) {
      allMotifs = data.data;
      // Populate select filter
      const sel = document.getElementById('filter-motif');
      if (sel) {
        sel.innerHTML = '<option value="all">Semua Motif Batik</option>' +
          allMotifs.map(m => `<option value="${m.id_motif}">${m.nama_motif} (${m.nama_kabupaten})</option>`).join('');
      }
      renderMotifCards(allMotifs);
    }
  } catch (err) {
    console.error('Gagal memuat data motif:', err);
  }
}

async function loadKecamatans() {
  try {
    const res = await fetch('/api/wilayah/kecamatan');
    const data = await res.json();
    if (data.success) {
      allKecamatans = data.data;
      const sel = document.getElementById('sentra-form-kecamatan');
      if (sel) {
        sel.innerHTML = allKecamatans.map(k => `<option value="${k.id_kecamatan}">${k.name}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Gagal memuat kecamatan:', err);
  }
}

// Render Leaflet Markers
function renderMapMarkers(sentras) {
  sentraLayerGroup.clearLayers();

  sentras.forEach(s => {
    if (!s.geom_point || !s.geom_point.coordinates) return;
    const [lon, lat] = s.geom_point.coordinates;
    const color = s.kabupaten_color || '#1F345F';
    const marker = L.marker([lat, lon], {
      icon: createMarkerIcon(color, s.rating)
    });

    const photo = (s.galeri && s.galeri.length > 0) ? s.galeri[0].path_foto : '/images/galeri_gentong_1.jpg';

    // Popup Sesuai Wireframe Bab 6.3
    const popupHtml = `
      <div class="custom-popup max-w-[270px] overflow-hidden text-slate-800">
        <div class="h-32 w-full bg-slate-200 relative overflow-hidden">
          <img src="${photo}" alt="${s.name}" class="w-full h-full object-cover">
          <span class="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow" style="background: ${color};">
            ${s.nama_kabupaten}
          </span>
        </div>
        <div class="p-3.5 space-y-2">
          <h4 class="font-bold font-display text-sm text-slate-900 leading-snug">${s.name}</h4>
          <p class="text-[11px] text-slate-500 line-clamp-2"><i class="fa-solid fa-location-dot text-bata mr-1"></i>${s.address || '-'}</p>
          <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span class="text-amber-500 font-bold flex items-center gap-1">
              ★ ${s.rating} <span class="text-[10px] text-slate-400">(${s.review_count || 0})</span>
            </span>
            ${s.jarak_km ? `<span class="text-slate-500 font-semibold text-[11px]"><i class="fa-solid fa-route text-soga mr-1"></i>${s.jarak_km} km</span>` : ''}
          </div>
          <div class="flex items-center gap-1.5 pt-1">
            <button onclick="openSentraDetail(${s.id_sentra})" class="flex-1 py-1.5 px-2 bg-nilai hover:bg-nilai/90 text-white rounded-lg text-xs font-semibold text-center transition">
              Lihat Detail
            </button>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" title="Buka Rute Google Maps" class="py-1.5 px-2.5 bg-soga hover:bg-soga/90 text-white rounded-lg text-xs font-semibold transition">
              <i class="fa-solid fa-location-arrow"></i>
            </a>
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    sentraLayerGroup.addLayer(marker);
  });
}

// Render Sidebar Result List
function renderSearchResults(sentras) {
  const container = document.getElementById('sentra-results-list');
  if (!container) return;

  if (sentras.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 px-4 text-slate-400 space-y-2">
        <i class="fa-regular fa-folder-open text-3xl"></i>
        <p class="text-xs">Tidak ditemukan sentra batik yang sesuai dengan filter.</p>
        <button onclick="resetFilters()" class="text-xs text-soga font-semibold underline">Reset Semua Filter</button>
      </div>
    `;
    return;
  }

  container.innerHTML = sentras.map(s => {
    const photo = (s.galeri && s.galeri.length > 0) ? s.galeri[0].path_foto : '/images/galeri_gentong_1.jpg';
    return `
      <div onclick="focusSentraOnMap(${s.id_sentra})" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-nilai/40 hover:shadow-md transition cursor-pointer flex gap-3 text-xs group">
        <img src="${photo}" alt="${s.name}" class="w-16 h-16 rounded-lg object-cover bg-slate-100 flex-shrink-0">
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-white" style="background: ${s.kabupaten_color || '#1F345F'};">
              ${s.nama_kabupaten}
            </span>
            <span class="text-amber-500 font-bold text-[11px]">★ ${s.rating}</span>
          </div>
          <h4 class="font-bold text-slate-800 truncate group-hover:text-nilai transition">${s.name}</h4>
          <p class="text-[11px] text-slate-400 truncate">${s.nama_kecamatan} &bull; ${s.address || '-'}</p>
          ${s.jarak_km ? `<p class="text-[11px] text-soga font-semibold"><i class="fa-solid fa-location-crosshairs mr-1"></i>${s.jarak_km} km dari posisi Anda</p>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Focus on Sentra when clicking in sidebar
function focusSentraOnMap(id) {
  const sentra = allSentras.find(s => s.id_sentra === id);
  if (!sentra || !sentra.geom_point) return;
  const [lon, lat] = sentra.geom_point.coordinates;
  map.setView([lat, lon], 14, { animate: true });

  // Open popup
  sentraLayerGroup.eachLayer(layer => {
    const latLng = layer.getLatLng();
    if (Math.abs(latLng.lat - lat) < 0.0001 && Math.abs(latLng.lng - lon) < 0.0001) {
      layer.openPopup();
    }
  });
}

// Render Beranda Cards
function renderBerandaCards(sentras) {
  const container = document.getElementById('beranda-sentra-list');
  if (!container) return;

  const top3 = sentras.slice(0, 3);
  container.innerHTML = top3.map(s => {
    const photo = (s.galeri && s.galeri.length > 0) ? s.galeri[0].path_foto : '/images/galeri_gentong_1.jpg';
    return `
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg transition flex flex-col group">
        <div class="h-44 w-full relative overflow-hidden bg-slate-100">
          <img src="${photo}" alt="${s.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
          <span class="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full text-white shadow" style="background: ${s.kabupaten_color || '#1F345F'};">
            ${s.nama_kabupaten}
          </span>
          <span class="absolute top-3 right-3 bg-white/95 px-2.5 py-0.5 rounded-full text-xs font-bold text-amber-500 shadow flex items-center gap-1">
            ★ ${s.rating}
          </span>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <h3 class="font-display font-bold text-base text-slate-900 group-hover:text-nilai transition">${s.name}</h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2">${s.description || s.address}</p>
          </div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500"><i class="fa-regular fa-clock mr-1 text-soga"></i>${s.opening_hours || '08:00 - 17:00'}</span>
            <button onclick="openSentraDetail(${s.id_sentra})" class="text-nilai font-bold hover:underline">
              Lihat Profil &rarr;
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Render Motif Grid Cards (F-06)
function renderMotifCards(motifs) {
  const container = document.getElementById('motif-card-grid');
  if (!container) return;

  container.innerHTML = motifs.map(m => {
    return `
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col group">
        <div class="h-48 w-full relative overflow-hidden bg-slate-800">
          <img src="${m.foto_motif}" alt="${m.nama_motif}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
          <span class="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white shadow" style="background: ${m.kabupaten_color || '#1F345F'};">
            ${m.nama_kabupaten}
          </span>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between space-y-3">
          <div class="space-y-2">
            <h3 class="font-display font-bold text-lg text-slate-900">${m.nama_motif}</h3>
            <p class="text-xs text-soga font-medium leading-relaxed italic">"${m.makna || '-'}"</p>
            <p class="text-xs text-slate-500 line-clamp-3">${m.description || '-'}</p>
          </div>
          <div class="pt-3 border-t border-slate-100">
            <button onclick="filterByMotifDirect(${m.id_motif})" class="w-full py-2 bg-tulang hover:bg-krem text-nilai font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-map-pin text-bata"></i> Cari Sentra Motif Ini
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Apply Filters
function applyFilters() {
  const keyword = document.getElementById('filter-keyword').value;
  const kabupaten = document.getElementById('filter-kabupaten').value;
  const dye_type = document.getElementById('filter-dye').value;
  const technique = document.getElementById('filter-technique').value;
  const motif = document.getElementById('filter-motif').value;
  const min_price = document.getElementById('filter-min-price').value;
  const max_price = document.getElementById('filter-max-price').value;

  const params = {};
  if (keyword) params.keyword = keyword;
  if (kabupaten && kabupaten !== 'all') params.kabupaten = kabupaten;
  if (dye_type && dye_type !== 'all') params.dye_type = dye_type;
  if (technique && technique !== 'all') params.technique = technique;
  if (motif && motif !== 'all') params.motif = motif;
  if (min_price) params.min_price = min_price;
  if (max_price) params.max_price = max_price;

  if (userLocation) {
    params.lat = userLocation.lat;
    params.lon = userLocation.lon;
  }

  loadSentras(params);
}

function resetFilters() {
  document.getElementById('filter-keyword').value = '';
  document.getElementById('filter-kabupaten').value = 'all';
  document.getElementById('filter-dye').value = 'all';
  document.getElementById('filter-technique').value = 'all';
  document.getElementById('filter-motif').value = 'all';
  document.getElementById('filter-min-price').value = '';
  document.getElementById('filter-max-price').value = '';
  loadSentras();
}

function filterByKabupatenDirect(kabId) {
  navigateTab('peta');
  document.getElementById('filter-kabupaten').value = kabId;
  applyFilters();
}

function filterByMotifDirect(motifId) {
  navigateTab('peta');
  document.getElementById('filter-motif').value = motifId;
  applyFilters();
}

const applyFiltersDebounced = debounce(() => applyFilters(), 400);

// ==========================================
// 4. GEOLOCATION: LOKASIKU & SENTRA TERDEKAT (F-08)
// ==========================================
let userLocationMarker = null;

function locateUserPosition() {
  if (!navigator.geolocation) {
    showToast('Browser Anda tidak mendukung geolokasi GPS.', 'error');
    return;
  }
  showToast('Mencari posisi perangkat Anda...', 'info');

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      userLocation = { lat, lon };

      if (userLocationMarker) map.removeLayer(userLocationMarker);

      userLocationMarker = L.circleMarker([lat, lon], {
        radius: 9,
        fillColor: '#B23A2B',
        color: '#FFFFFF',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);

      userLocationMarker.bindTooltip('Posisi Anda Sekarang', { permanent: true, direction: 'top' });
      map.setView([lat, lon], 12);
      showToast('Posisi berhasil ditemukan!', 'success');
      applyFilters();
    },
    err => {
      console.warn('GPS browser ditolak/gagal:', err.message);
      // Fallback simulasi posisi di Pulau Madura (Bangkalan / Jembatan Suramadu)
      showToast('Akses GPS tidak diizinkan. Menggunakan koordinat simulasi Madura.', 'info');
      userLocation = { lat: -7.05, lon: 112.75 };
      if (userLocationMarker) map.removeLayer(userLocationMarker);
      userLocationMarker = L.circleMarker([-7.05, 112.75], {
        radius: 9,
        fillColor: '#B23A2B',
        color: '#FFFFFF',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);
      map.setView([-7.05, 112.75], 11);
      applyFilters();
    },
    { timeout: 8000 }
  );
}

function findNearestSentras() {
  if (!userLocation) {
    locateUserPosition();
  } else {
    showToast('Mengurutkan sentra terdekat dari lokasi Anda...', 'info');
    applyFilters();
  }
}

// ==========================================
// 5. DETAIL SENTRA MODAL (F-04, F-07, F-09)
// ==========================================
async function openSentraDetail(id) {
  activeSentraDetailId = id;
  try {
    const res = await fetch(`/api/sentra/${id}`);
    const json = await res.json();
    if (!json.success) return showToast(json.message, 'error');

    const s = json.data;
    document.getElementById('modal-sentra-name').innerText = s.name;
    document.getElementById('modal-sentra-kabupaten').innerText = s.nama_kabupaten;
    document.getElementById('modal-sentra-address').innerHTML = `<i class="fa-solid fa-location-dot text-bata mr-1.5"></i> ${s.address || '-'}`;
    document.getElementById('modal-sentra-hours').innerHTML = `<i class="fa-regular fa-clock text-soga mr-1.5"></i> ${s.opening_hours || '08:00 - 17:00 WIB'}`;
    document.getElementById('modal-sentra-phone').innerHTML = `<i class="fa-solid fa-phone text-nilai mr-1.5"></i> ${s.phone || '-'}`;
    document.getElementById('modal-sentra-desc').innerText = s.description || 'Informasi deskripsi sentra batik sedang diperbarui.';

    // Google Maps Navigation Route (F-07)
    if (s.geom_point && s.geom_point.coordinates) {
      const [lon, lat] = s.geom_point.coordinates;
      document.getElementById('modal-sentra-route-btn').href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    }

    // WhatsApp Contact
    const waPhone = (s.perajin && s.perajin[0] && s.perajin[0].no_whatsapp) ? s.perajin[0].no_whatsapp : (s.phone || '');
    const cleanWa = waPhone.replace(/[^0-9]/g, '');
    document.getElementById('modal-sentra-wa-btn').href = `https://wa.me/${cleanWa}?text=Halo%20saya%20tertarik%20dengan%20batik%20di%20${encodeURIComponent(s.name)}`;

    // Render Perajin
    const perajinContainer = document.getElementById('modal-sentra-perajin-list');
    if (s.perajin && s.perajin.length > 0) {
      perajinContainer.innerHTML = s.perajin.map(p => `
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <p class="font-bold text-slate-800">${p.nama_usaha}</p>
            <p class="text-slate-500">Pemilik: ${p.nama_pemilik} &bull; Berdiri sejak ${p.tahun_berdiri || '-'}</p>
          </div>
          <span class="text-emerald-700 font-semibold"><i class="fa-brands fa-whatsapp text-sm mr-1"></i>${p.no_whatsapp || '-'}</span>
        </div>
      `).join('');
    } else {
      perajinContainer.innerHTML = '<p class="text-xs text-slate-400">Belum ada UMKM perajin yang terhubung di sentra ini.</p>';
    }

    // Render Produk
    const produkContainer = document.getElementById('modal-sentra-produk-grid');
    if (s.produk && s.produk.length > 0) {
      produkContainer.innerHTML = s.produk.map(pr => `
        <div class="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex gap-3 text-xs">
          <img src="${pr.foto_produk}" alt="${pr.name}" class="w-20 h-20 rounded-xl object-cover bg-slate-100 flex-shrink-0">
          <div class="flex-1 space-y-1">
            <h5 class="font-bold text-slate-800 line-clamp-1">${pr.name}</h5>
            <p class="text-slate-500">Motif: <span class="font-semibold text-nilai">${pr.nama_motif}</span></p>
            <div class="flex items-center gap-1.5 text-[10px]">
              <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold uppercase">${pr.technique}</span>
              <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold uppercase">${pr.dye_type}</span>
            </div>
            <p class="font-bold text-soga text-xs pt-1">Rp ${formatRupiah(pr.min_price)} - ${formatRupiah(pr.max_price)}</p>
          </div>
        </div>
      `).join('');
    } else {
      produkContainer.innerHTML = '<p class="text-xs text-slate-400 col-span-2">Belum ada produk yang didaftarkan untuk sentra ini.</p>';
    }

    // Render Galeri
    const galeriContainer = document.getElementById('modal-sentra-galeri-grid');
    if (s.galeri && s.galeri.length > 0) {
      galeriContainer.innerHTML = s.galeri.map(g => `
        <div class="space-y-1">
          <img src="${g.path_foto}" alt="${g.caption}" class="w-full h-32 rounded-xl object-cover bg-slate-100 shadow-sm">
          <p class="text-[11px] text-slate-500 italic truncate">${g.caption || ''}</p>
        </div>
      `).join('');
    } else {
      galeriContainer.innerHTML = '<p class="text-xs text-slate-400 col-span-3">Belum ada foto galeri.</p>';
    }

    // Render Ulasan
    renderSentraReviews(s.ulasan || []);

    // Tampilkan auth warning jika belum login
    const reviewAlert = document.getElementById('review-auth-alert');
    const reviewForm = document.getElementById('form-add-review');
    if (!currentUser) {
      reviewAlert.classList.remove('hidden');
      reviewForm.classList.add('opacity-50', 'pointer-events-none');
    } else {
      reviewAlert.classList.add('hidden');
      reviewForm.classList.remove('opacity-50', 'pointer-events-none');
    }

    switchDetailTab('ringkasan');
    document.getElementById('modal-detail-sentra').classList.remove('hidden');
  } catch (err) {
    console.error('Error openSentraDetail:', err);
  }
}

function closeSentraModal() {
  document.getElementById('modal-detail-sentra').classList.add('hidden');
}

function switchDetailTab(tabName) {
  ['ringkasan', 'produk', 'galeri', 'ulasan'].forEach(t => {
    document.getElementById(`detail-tab-${t}`).classList.add('hidden');
    document.getElementById(`tab-btn-${t}`).className = 'py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800';
  });

  document.getElementById(`detail-tab-${tabName}`).classList.remove('hidden');
  document.getElementById(`tab-btn-${tabName}`).className = 'py-3 border-b-2 border-nilai text-nilai font-semibold';
}

function renderSentraReviews(reviews) {
  const container = document.getElementById('modal-sentra-ulasan-list');
  if (reviews.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400">Belum ada ulasan yang disetujui untuk sentra ini. Jadilah yang pertama memberikan ulasan!</p>';
    return;
  }

  container.innerHTML = reviews.map(u => `
    <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-800">${u.nama_pengguna}</span>
        <span class="text-amber-500 font-bold">${'★'.repeat(u.rating)}<span class="text-slate-300">${'★'.repeat(5 - u.rating)}</span></span>
      </div>
      <p class="text-slate-600 leading-relaxed">${u.comment}</p>
      <span class="text-[10px] text-slate-400 block">${new Date(u.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
    </div>
  `).join('');
}

// Submit Ulasan Baru (F-09, BR-14, BR-15)
let selectedRating = 5;
function setRatingValue(val) {
  selectedRating = val;
  document.getElementById('review-rating-input').value = val;
  const stars = document.querySelectorAll('#star-rating-selector .star-btn');
  stars.forEach((btn, idx) => {
    if (idx < val) {
      btn.classList.add('text-amber-400');
      btn.classList.remove('text-slate-300');
    } else {
      btn.classList.remove('text-amber-400');
      btn.classList.add('text-slate-300');
    }
  });
}

async function submitReview(e) {
  e.preventDefault();
  if (!currentUser) return openAuthModal('login');

  const comment = document.getElementById('review-comment-input').value;
  try {
    const res = await fetch('/api/ulasan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        id_sentra: activeSentraDetailId,
        rating: selectedRating,
        comment
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      document.getElementById('review-comment-input').value = '';
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Gagal mengirim ulasan.', 'error');
  }
}

// ==========================================
// 6. AUTHENTICATION & SESSIONS (F-10, BR-05)
// ==========================================
let currentAuthMode = 'login';

function openAuthModal(mode = 'login') {
  currentAuthMode = mode;
  switchAuthMode(mode);
  document.getElementById('modal-auth').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('modal-auth').classList.add('hidden');
}

function switchAuthMode(mode) {
  currentAuthMode = mode;
  const isReg = mode === 'register';

  document.getElementById('auth-modal-title').innerText = isReg ? 'Daftar Akun GeoBatik' : 'Masuk ke GeoBatik';
  document.getElementById('btn-auth-submit').innerText = isReg ? 'Daftar Sekarang' : 'Masuk';
  document.getElementById('field-register-name').classList.toggle('hidden', !isReg);
  document.getElementById('field-register-role').classList.toggle('hidden', !isReg);
  document.getElementById('demo-login-box').classList.toggle('hidden', isReg);

  if (isReg) {
    document.getElementById('auth-tab-register').className = 'flex-1 py-2 rounded-lg bg-white shadow-sm text-nilai';
    document.getElementById('auth-tab-login').className = 'flex-1 py-2 rounded-lg text-slate-500';
  } else {
    document.getElementById('auth-tab-login').className = 'flex-1 py-2 rounded-lg bg-white shadow-sm text-nilai';
    document.getElementById('auth-tab-register').className = 'flex-1 py-2 rounded-lg text-slate-500';
  }
}

function togglePerajinFields(show) {
  document.getElementById('field-perajin-extra').classList.toggle('hidden', !show);
}

function fillDemo(type) {
  if (type === 'admin') {
    document.getElementById('auth-email').value = 'admin@geobatik.id';
    document.getElementById('auth-password').value = 'admin123';
  } else if (type === 'perajin') {
    document.getElementById('auth-email').value = 'perajin@geobatik.id';
    document.getElementById('auth-password').value = 'perajin123';
  } else if (type === 'pengunjung') {
    document.getElementById('auth-email').value = 'pengunjung@geobatik.id';
    document.getElementById('auth-password').value = 'user123';
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  const endpoint = currentAuthMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const body = { email, password };

  if (currentAuthMode === 'register') {
    body.name = document.getElementById('auth-name').value;
    body.role = document.querySelector('input[name="auth-role"]:checked').value;
    if (body.role === 'perajin') {
      body.nama_usaha = document.getElementById('auth-nama-usaha').value;
      body.no_whatsapp = document.getElementById('auth-whatsapp').value;
    }
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (json.success) {
      currentToken = json.token;
      currentUser = json.user;
      localStorage.setItem('geobatik_token', currentToken);
      updateAuthUI();
      closeAuthModal();
      showToast(`Selamat datang, ${currentUser.name}!`, 'success');
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan koneksi server.', 'error');
  }
}

async function checkAuthStatus() {
  if (!currentToken) return;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const json = await res.json();
    if (json.success) {
      currentUser = json.user;
      updateAuthUI();
    } else {
      handleLogout();
    }
  } catch (err) {
    console.warn('Gagal memverifikasi token');
  }
}

function updateAuthUI() {
  const guestBox = document.getElementById('auth-buttons-guest');
  const userBox = document.getElementById('auth-buttons-user');

  if (currentUser) {
    guestBox.classList.add('hidden');
    userBox.classList.remove('hidden');

    document.getElementById('nav-user-name').innerText = currentUser.name.split(' ')[0];
    document.getElementById('dropdown-user-name').innerText = currentUser.name;
    document.getElementById('dropdown-user-email').innerText = currentUser.email;

    const badge = document.getElementById('nav-user-role-badge');
    badge.innerText = currentUser.role;

    // Show Panel Admin or Perajin button
    const btnAdmin = document.getElementById('btn-panel-admin');
    const btnPerajin = document.getElementById('btn-panel-perajin');
    btnAdmin.classList.toggle('hidden', currentUser.role !== 'admin');
    btnPerajin.classList.toggle('hidden', currentUser.role !== 'perajin');
  } else {
    guestBox.classList.remove('hidden');
    userBox.classList.add('hidden');
  }
}

function handleLogout() {
  currentUser = null;
  currentToken = null;
  localStorage.removeItem('geobatik_token');
  updateAuthUI();
  document.getElementById('user-dropdown-menu').classList.add('hidden');
  showToast('Anda telah keluar dari sistem.', 'info');
}

function toggleUserDropdown() {
  const d = document.getElementById('user-dropdown-menu');
  d.classList.toggle('hidden');
}

// ==========================================
// 7. PANEL ADMIN & MODERASI (F-12, F-13, F-14)
// ==========================================
function openAdminPanel() {
  document.getElementById('modal-admin-panel').classList.remove('hidden');
  switchAdminTab('stats');
}

function closeAdminPanel() {
  document.getElementById('modal-admin-panel').classList.add('hidden');
}

function switchAdminTab(tab) {
  const tabs = ['stats', 'sentra', 'verifikasi', 'motif', 'perajin', 'ekspor'];
  tabs.forEach(t => {
    document.getElementById(`adm-content-${t}`).classList.add('hidden');
    document.getElementById(`adm-tab-btn-${t}`).className = 'px-3.5 py-2 rounded-lg text-slate-600 hover:bg-white/50';
  });

  document.getElementById(`adm-content-${tab}`).classList.remove('hidden');
  document.getElementById(`adm-tab-btn-${tab}`).className = 'px-3.5 py-2 rounded-lg bg-white shadow-sm text-nilai';

  if (tab === 'stats') loadAdminStats();
  if (tab === 'sentra') loadAdminSentras();
  if (tab === 'verifikasi') loadAdminModeration();
  if (tab === 'motif') loadAdminMotifs();
  if (tab === 'perajin') loadAdminPerajin();
}

async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const json = await res.json();
    if (json.success) {
      const d = json.data;
      document.getElementById('adm-stat-sentra').innerText = d.totalSentra;
      document.getElementById('adm-stat-sentra-sub').innerText = `${d.sentraTerverifikasi} Terverifikasi / ${d.sentraDraft} Draft`;
      document.getElementById('adm-stat-perajin').innerText = d.totalPerajin;
      document.getElementById('adm-stat-ulasan').innerText = d.ulasanMenunggu;
      document.getElementById('adm-stat-motif').innerText = `${d.totalMotif} Motif`;
      document.getElementById('adm-stat-produk-sub').innerText = `${d.totalProduk} Koleksi Produk`;

      // Kabupaten distribution
      const dist = document.getElementById('adm-kabupaten-distribution');
      dist.innerHTML = d.perKabupaten.map(k => `
        <div class="p-3 bg-white rounded-xl border border-slate-200">
          <span class="text-xs font-bold" style="color: ${k.color};">${k.nama}</span>
          <p class="text-xl font-bold font-display text-slate-800 mt-1">${k.count} Sentra</p>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error stats:', err);
  }
}

// Mini Picker Map in Admin Form (F-12)
function initPickerMap() {
  setTimeout(() => {
    if (pickerMap) return;
    const el = document.getElementById('picker-map');
    if (!el) return;

    pickerMap = L.map('picker-map').setView([-7.05, 113.35], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(pickerMap);

    pickerMap.on('click', e => {
      const { lat, lng } = e.latlng;
      setPickerCoordinates(lat, lng);
    });
  }, 500);
}

function setPickerCoordinates(lat, lon) {
  document.getElementById('sentra-form-lat').value = lat.toFixed(6);
  document.getElementById('sentra-form-lon').value = lon.toFixed(6);

  if (pickerMarker) pickerMap.removeLayer(pickerMarker);
  pickerMarker = L.marker([lat, lon]).addTo(pickerMap);
}

function toggleFormAddSentra() {
  const box = document.getElementById('form-add-sentra-container');
  box.classList.toggle('hidden');
  if (!box.classList.contains('hidden') && pickerMap) {
    setTimeout(() => pickerMap.invalidateSize(), 300);
  }
}

async function loadAdminSentras() {
  try {
    const res = await fetch('/api/sentra?user_status=all');
    const json = await res.json();
    if (json.success) {
      const tbody = document.getElementById('adm-sentra-table-body');
      tbody.innerHTML = json.data.map(s => `
        <tr>
          <td class="p-3 font-mono">${s.id_sentra}</td>
          <td class="p-3 font-semibold text-slate-800">${s.name}</td>
          <td class="p-3">${s.nama_kabupaten} (${s.nama_kecamatan})</td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.verification_status === 'terverifikasi' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              ${s.verification_status}
            </span>
          </td>
          <td class="p-3 text-right space-x-1">
            <button onclick="handleVerifySentra(${s.id_sentra}, '${s.verification_status === 'terverifikasi' ? 'draft' : 'terverifikasi'}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold text-slate-700">
              ${s.verification_status === 'terverifikasi' ? 'Jadikan Draft' : 'Verifikasi'}
            </button>
            <button onclick="handleDeleteSentra(${s.id_sentra})" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded text-[11px] font-semibold text-rose-600">
              Hapus
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loadAdminSentras:', err);
  }
}

async function handleSaveSentra(e) {
  e.preventDefault();
  const name = document.getElementById('sentra-form-name').value;
  const id_kecamatan = document.getElementById('sentra-form-kecamatan').value;
  const opening_hours = document.getElementById('sentra-form-hours').value;
  const phone = document.getElementById('sentra-form-phone').value;
  const address = document.getElementById('sentra-form-address').value;
  const description = document.getElementById('sentra-form-desc').value;
  const lat = document.getElementById('sentra-form-lat').value;
  const lon = document.getElementById('sentra-form-lon').value;
  const verification_status = document.getElementById('sentra-form-status').value;

  try {
    const res = await fetch('/api/admin/sentra', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        name, id_kecamatan, opening_hours, phone, address, description, lat, lon, verification_status
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      toggleFormAddSentra();
      loadAdminSentras();
      loadSentras();
      loadKabupatenGeoJson();
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menyimpan sentra.', 'error');
  }
}

async function handleVerifySentra(id, status) {
  try {
    const res = await fetch(`/api/admin/sentra/${id}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      loadAdminSentras();
      loadSentras();
      loadKabupatenGeoJson();
    }
  } catch (err) {
    showToast('Gagal mengubah status verifikasi.', 'error');
  }
}

async function handleDeleteSentra(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus sentra batik ini? (BR-04)')) return;
  try {
    const res = await fetch(`/api/admin/sentra/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      loadAdminSentras();
      loadSentras();
      loadKabupatenGeoJson();
    }
  } catch (err) {
    showToast('Gagal menghapus sentra.', 'error');
  }
}

// Moderasi Ulasan
async function loadAdminModeration() {
  try {
    const res = await fetch('/api/admin/ulasan', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const json = await res.json();
    if (json.success) {
      const tbody = document.getElementById('adm-ulasan-table-body');
      tbody.innerHTML = json.data.map(u => `
        <tr>
          <td class="p-3 font-semibold">${u.nama_sentra}</td>
          <td class="p-3">${u.nama_pengguna} (${u.email_pengguna})</td>
          <td class="p-3 text-amber-500 font-bold">${u.rating} ★</td>
          <td class="p-3 max-w-xs truncate">${u.comment}</td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.status === 'tayang' ? 'bg-emerald-100 text-emerald-800' : (u.status === 'menunggu' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}">
              ${u.status}
            </span>
          </td>
          <td class="p-3 text-right space-x-1">
            <button onclick="handleModerateReview(${u.id_ulasan}, 'tayang')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold">
              Setujui
            </button>
            <button onclick="handleModerateReview(${u.id_ulasan}, 'ditolak')" class="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold">
              Tolak
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loadAdminModeration:', err);
  }
}

async function handleModerateReview(id, status) {
  try {
    const res = await fetch(`/api/admin/ulasan/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      loadAdminModeration();
      loadSentras();
    }
  } catch (err) {
    showToast('Gagal moderasi ulasan.', 'error');
  }
}

// Motif Admin CRUD
function openAddMotifForm() {
  document.getElementById('adm-motif-form-container').classList.toggle('hidden');
}

async function handleSaveMotif(e) {
  e.preventDefault();
  const nama_motif = document.getElementById('motif-form-name').value;
  const id_kabupaten = document.getElementById('motif-form-kabupaten').value;
  const makna = document.getElementById('motif-form-makna').value;
  const description = document.getElementById('motif-form-desc').value;

  try {
    const res = await fetch('/api/motif', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        nama_motif,
        id_kabupaten,
        makna,
        description,
        foto_motif: '/images/motif_gentongan.jpg'
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      openAddMotifForm();
      loadMotifs();
      loadAdminMotifs();
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menyimpan motif.', 'error');
  }
}

async function loadAdminMotifs() {
  const container = document.getElementById('adm-motif-list');
  container.innerHTML = allMotifs.map(m => `
    <div class="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
      <div>
        <p class="font-bold text-slate-800">${m.nama_motif}</p>
        <p class="text-slate-500">${m.nama_kabupaten}</p>
      </div>
      <button onclick="handleDeleteMotif(${m.id_motif})" class="text-rose-600 hover:text-rose-800 font-bold p-1">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');
}

async function handleDeleteMotif(id) {
  if (!confirm('Hapus motif batik ini? (BR-04)')) return;
  try {
    const res = await fetch(`/api/motif/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      loadMotifs();
      loadAdminMotifs();
    }
  } catch (err) {
    showToast('Gagal menghapus motif.', 'error');
  }
}

// Data Perajin Admin
async function loadAdminPerajin() {
  try {
    const res = await fetch('/api/admin/perajin', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const json = await res.json();
    if (json.success) {
      const tbody = document.getElementById('adm-perajin-table-body');
      tbody.innerHTML = json.data.map(p => `
        <tr>
          <td class="p-3 font-semibold">${p.nama_usaha}</td>
          <td class="p-3">${p.nama_pemilik}</td>
          <td class="p-3">${p.nama_sentra}</td>
          <td class="p-3 text-emerald-700 font-medium">${p.no_whatsapp || '-'}</td>
          <td class="p-3 font-mono">${p.tahun_berdiri || '-'}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loadAdminPerajin:', err);
  }
}

// ==========================================
// 8. PANEL PERAJIN (F-11, BR-03, BR-10)
// ==========================================
function openPerajinPanel() {
  document.getElementById('modal-perajin-panel').classList.remove('hidden');
  loadPerajinMyProfile();
}

function closePerajinPanel() {
  document.getElementById('modal-perajin-panel').classList.add('hidden');
}

async function loadPerajinMyProfile() {
  try {
    const res = await fetch('/api/perajin/my-profile', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const json = await res.json();
    if (json.success) {
      const p = json.data;
      document.getElementById('perajin-edit-usaha').value = p.nama_usaha;
      document.getElementById('perajin-edit-pemilik').value = p.nama_pemilik;
      document.getElementById('perajin-edit-wa').value = p.no_whatsapp || '';
      document.getElementById('perajin-edit-tahun').value = p.tahun_berdiri || '';

      // Populate motif selector
      const motifSel = document.getElementById('prod-motif');
      motifSel.innerHTML = allMotifs.map(m => `<option value="${m.id_motif}">${m.nama_motif}</option>`).join('');

      renderPerajinProducts(p.produk || []);
    }
  } catch (err) {
    console.error('Error loadPerajinMyProfile:', err);
  }
}

async function handleSavePerajinProfile(e) {
  e.preventDefault();
  const nama_usaha = document.getElementById('perajin-edit-usaha').value;
  const nama_pemilik = document.getElementById('perajin-edit-pemilik').value;
  const no_whatsapp = document.getElementById('perajin-edit-wa').value;
  const tahun_berdiri = document.getElementById('perajin-edit-tahun').value;

  try {
    const res = await fetch('/api/perajin/my-profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ nama_usaha, nama_pemilik, no_whatsapp, tahun_berdiri })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      loadPerajinMyProfile();
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menyimpan profil usaha.', 'error');
  }
}

function toggleFormAddProduct() {
  document.getElementById('form-add-product-container').classList.toggle('hidden');
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const name = document.getElementById('prod-name').value;
  const id_motif = document.getElementById('prod-motif').value;
  const technique = document.getElementById('prod-technique').value;
  const dye_type = document.getElementById('prod-dye').value;
  const min_price = document.getElementById('prod-min-price').value;
  const max_price = document.getElementById('prod-max-price').value;

  try {
    const res = await fetch('/api/produk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        name, id_motif, technique, dye_type, min_price, max_price
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      toggleFormAddProduct();
      loadPerajinMyProfile();
      loadSentras();
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Gagal menyimpan produk.', 'error');
  }
}

function renderPerajinProducts(products) {
  const container = document.getElementById('perajin-my-products-list');
  if (products.length === 0) {
    container.innerHTML = '<p class="text-slate-400 col-span-2">Belum ada produk yang didaftarkan.</p>';
    return;
  }
  container.innerHTML = products.map(pr => `
    <div class="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
      <div class="flex items-center justify-between">
        <h5 class="font-bold text-slate-800">${pr.name}</h5>
        <button onclick="handleDeleteProduct(${pr.id_produk})" class="text-rose-600 hover:text-rose-800"><i class="fa-solid fa-trash"></i></button>
      </div>
      <p class="text-slate-500">${pr.technique} &bull; Pewarna ${pr.dye_type}</p>
      <p class="font-bold text-soga">Rp ${formatRupiah(pr.min_price)} - ${formatRupiah(pr.max_price)}</p>
    </div>
  `).join('');
}

async function handleDeleteProduct(id) {
  if (!confirm('Hapus produk ini?')) return;
  try {
    const res = await fetch(`/api/produk/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      loadPerajinMyProfile();
      loadSentras();
    }
  } catch (err) {
    showToast('Gagal menghapus produk.', 'error');
  }
}

// ==========================================
// 9. NAVIGATION & GENERAL HELPERS
// ==========================================
function navigateTab(tabName) {
  ['beranda', 'peta', 'motif', 'tentang'].forEach(t => {
    const sec = document.getElementById(`section-${t}`);
    const nav = document.getElementById(`nav-${t}`);
    if (sec) sec.classList.add('hidden');
    if (nav) {
      nav.classList.remove('text-white', 'bg-white/10');
      nav.classList.add('text-krem');
    }
  });

  const targetSec = document.getElementById(`section-${tabName}`);
  const targetNav = document.getElementById(`nav-${tabName}`);
  if (targetSec) targetSec.classList.remove('hidden');
  if (targetNav) {
    targetNav.classList.remove('text-krem');
    targetNav.classList.add('text-white', 'bg-white/10');
  }

  // Trigger leaflet redraw if navigating to map
  if (tabName === 'peta' && map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }
}

function toggleMobileMenu() {
  const m = document.getElementById('mobile-menu');
  m.classList.toggle('hidden');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-slate-900');
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info');

  toast.className = `${bg} text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold pointer-events-auto animate-fade-in transition duration-300 max-w-sm`;
  toast.innerHTML = `<i class="fa-solid ${icon} text-base"></i><span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatRupiah(num) {
  if (!num) return '0';
  return Number(num).toLocaleString('id-ID');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

