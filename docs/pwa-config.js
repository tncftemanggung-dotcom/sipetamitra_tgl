/* Konfigurasi PWA SIPETA MITRA v5.0 — sinkron dengan Code.gs & api.gs */
window.PWA_CONFIG = {
  // Apps Script Web App URL (berakhir dengan /exec)
  endpoint: "https://script.google.com/macros/s/AKfycbzn5gSAderWaS-IsIF0KGBz1GY7Oqg59IFd7fJyWqy1IzI_GONmBC0i3c1586WyGIjN/exec",

  // Sama dengan Script Property PWA_TOKEN di Apps Script (opsional, kosongkan jika tidak dipakai)
  token: '',

  // Timeout 60 detik agar upload foto Base64 ke Google Drive tidak mudah terputus di jaringan lambat
  timeoutMs: 60000,

  // Fungsi WRITE lapangan yang masuk antrean offline (IndexedDB outbox) jika tidak ada sinyal.
  // Tugas ADMIN (saveUser, saveTrader, savePenugasanPic, saveJadwalTanam, saveInfoTambahan)
  // dan updateUserProfilePhoto sengaja online-only.
  queueable: [
    "savePetani",
    "saveLahan",
    "saveKoordinator",
    "toggleStatusEntity",
    "saveVerifikasiLahan",
    "saveStokOpname",
    "saveSerahTerima",
    "saveDistribusiBenih",
    "saveSebarBenih",
    "savePembibitan"
  ],

  // Fungsi READ yang di-cache untuk tampilan saat offline (termasuk jadwalTanam & infoTambahan)
  cacheable: ["getAppData"],

  // Nilai balikan tiruan saat data disimpan ke antrean offline agar UI tetap berjalan mulus
  queuedResult: function (fn, args) {
    var p = (args && typeof args[1] === 'object' && args[1] !== null) ? args[1] : {};
    var d = Object.assign({}, p);
    if (!d.id && p._tmpId) d.id = p._tmpId;
    return { success: true, queued: true, data: d };
  },

  labels: {
    offline: "Offline",
    pending: "menunggu",
    failed: "gagal",
    syncing: "Menyinkronkan…"
  }
};
