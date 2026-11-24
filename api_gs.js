// api.gs — Router POST untuk jembatan PWA (gas-bridge.js) ke Google Apps Script
// SIPETA MITRA v5.4.2 | Pastikan file ini berada di project Apps Script yang sama dengan Code.gs

/**
 * Daftar 21 fungsi backend yang diizinkan dipanggil oleh PWA.
 * Fungsi internal & darurat (setupDatabase, hashPassword, uploadBase64ToDrive,
 * resetPasswordAdmin, dll.) sengaja TIDAK dimasukkan demi keamanan.
 */
function getApiHandlers_() {
  return {
    // Autentikasi & Sesi
    loginUser: loginUser,
    destroySession: destroySession,

    // Read Data Utama (termasuk jadwalTanam & infoTambahan)
    getAppData: getAppData,

    // Registrasi (Koordinator, Petani, Lahan) & Ubah Status
    saveKoordinator: saveKoordinator,
    savePetani: savePetani,
    saveLahan: saveLahan,
    toggleStatusEntity: toggleStatusEntity,

    // Verifikasi Lahan
    saveVerifikasiLahan: saveVerifikasiLahan,

    // Stok Benih, Serah Terima & Distribusi Benih
    saveStokOpname: saveStokOpname,
    deleteStokOpname: deleteStokOpname,
    saveSerahTerima: saveSerahTerima,
    saveDistribusiBenih: saveDistribusiBenih,

    // GAP (Sebar Benih & Pembibitan)
    saveSebarBenih: saveSebarBenih,
    savePembibitan: savePembibitan,

    // Profil Pengguna (Foto & Spesimen TTD)
    updateUserProfilePhoto: updateUserProfilePhoto,
    updateUserSignature: updateUserSignature,

    // Administrator (Pengguna, Trader, Penugasan PIC, Jadwal Tanam, Informasi Tambahan)
    saveUser: saveUser,
    saveTrader: saveTrader,
    savePenugasanPic: savePenugasanPic,
    saveJadwalTanam: saveJadwalTanam,
    saveInfoTambahan: saveInfoTambahan
  };
}

/**
 * Fungsi yang tidak perlu deduplikasi (read / auth).
 */
var NON_DEDUP_FUNCTIONS_ = {
  loginUser: true,
  destroySession: true,
  getAppData: true
};

/**
 * Helper output JSON standar untuk gas-bridge.js
 */
function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Entry point HTTP POST dari gas-bridge.js
 * Payload JSON: { fn: string, args: Array, id: string, token: string }
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOutput_({ ok: false, error: 'Request body kosong.' });
    }

    var req;
    try {
      req = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonOutput_({ ok: false, error: 'Format JSON tidak valid.' });
    }

    // Validasi opsional PWA_TOKEN (jika diatur di Project Settings > Script Properties)
    var expectedToken = PropertiesService.getScriptProperties().getProperty('PWA_TOKEN');
    if (expectedToken && req.token !== expectedToken) {
      return jsonOutput_({ ok: false, error: 'Unauthorized: token PWA tidak cocok.' });
    }

    var fnName = req.fn;
    var args = Array.isArray(req.args) ? req.args : [];
    var reqId = req.id ? String(req.id) : '';

    var handlers = getApiHandlers_();
    var handler = handlers[fnName];

    if (typeof handler !== 'function') {
      return jsonOutput_({ ok: false, error: 'Fungsi tidak diizinkan atau tidak ditemukan: ' + fnName });
    }

    // Deduplikasi untuk operasi tulis (mencegah data ganda saat outbox offline replay)
    var cache = CacheService.getScriptCache();
    var dedupKey = (reqId && !NON_DEDUP_FUNCTIONS_[fnName]) ? ('PWA_DEDUP_' + reqId) : '';

    if (dedupKey) {
      var cachedRes = cache.get(dedupKey);
      if (cachedRes) {
        try {
          return jsonOutput_({ ok: true, result: JSON.parse(cachedRes), deduplicated: true });
        } catch (ignore) {}
      }
    }

    // Eksekusi fungsi target di Code.gs
    var result = handler.apply(null, args);

    // Simpan hasil sukses ke cache deduplikasi (maksimal 6 jam / 21600 detik)
    if (dedupKey && result && result.success === true) {
      try {
        cache.put(dedupKey, JSON.stringify(result), 21600);
      } catch (cacheErr) {
        // Abaikan jika payload hasil terlalu besar untuk CacheService (>100KB)
      }
    }

    return jsonOutput_({ ok: true, result: result });
  } catch (err) {
    return jsonOutput_({
      ok: false,
      error: (err && err.message) ? err.message : String(err)
    });
  }
}
