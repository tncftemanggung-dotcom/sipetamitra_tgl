/* Konfigurasi PWA SIPETA MITRA v4.8.4 — sinkron dengan Code.gs & api.gs */
window.PWA_CONFIG = {
  // Apps Script Web App URL (berakhir dengan /exec)
  endpoint: "https://script.google.com/macros/s/AKfycbxMt5b-AvFI29amFHmnkQxsC4gZNTxN6IQ3MA5CErOhVNYmS91VCSqaFftDBmU1NLkPVQ/exec",

  // Sama dengan Script Property PWA_TOKEN di Apps Script (opsional, kosongkan jika tidak dipakai)
  token: '',

  // Timeout dinaikkan ke 60 detik agar upload foto Base64 ke Google Drive tidak mudah terputus di jaringan lambat
  timeoutMs: 60000,

  // Fungsi WRITE yang masuk antrean offline (IndexedDB outbox) jika tidak ada sinyal
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

  // Fungsi READ yang di-cache untuk tampilan saat offline
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
