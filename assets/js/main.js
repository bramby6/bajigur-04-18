// ==========================================
// FILE: main.js (State, Events, & Komunikasi API)
// ==========================================

let isAdmin = false; 

/**
 * Fungsi global untuk merapikan nama sheet (misal: "IPL_NAMA_JULI_26" menjadi "JULI 26")
 */
const formatLabelBulan = (kodeSheet) => kodeSheet.replace(/^IPL_[^_]+_/, '').replace('_', ' ');

/**
 * Fungsi pembungkus untuk semua HTTP Request ke Google Apps Script
 * Semua diubah menjadi POST menggunakan text/plain agar bebas dari CORS.
 */
async function request(action, data = {}) {
  const payload = {
    appID: CONFIG.APP_ID,
    action: action,
    ...data
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload)
  };

  try {
    const response = await fetch(CONFIG.URL_API, options);
    return await response.json(); // Langsung kembalikan hasil parsing JSON
  } catch (error) {
    throw new Error("Gagal terhubung ke server: " + error.message);
  }
}

// --- BAGIAN EVENT LISTENER DOM ---
document.getElementById('formCari').addEventListener('submit', function(e) {
  e.preventDefault(); 
  var areaHasil = document.getElementById('areaHasil');
  var idWarga = document.getElementById('inputId').value.trim().toUpperCase(); 
  areaHasil.innerHTML = '<p aria-busy="true">Sedang menyeduh data...</p>';

  if (isAdmin && idWarga === "") {
    request("ambilSemuaDataWarga")
      .then(res => {
        if (res.status === "error") throw new Error(res.pesan);
        renderTabelAdmin(res.data);
      })
      .catch(err => {
        areaHasil.innerHTML = `<p style="color:#e74c3c; font-weight:bold;">❌ ${err.message}</p>`;
      });
  } else {
    cariSingleData(idWarga);
  }
});

document.getElementById('formCari').addEventListener('reset', function() {
  document.getElementById('areaHasil').innerHTML = '';
});

// --- BAGIAN COMMANDS / REQUEST API ---
function kirimOTP() {
  let noWA = document.getElementById('inputNoWA').value.trim();
  if (!noWA) { 
    document.getElementById('modalStatus').innerText = "Nomor WhatsApp kosong!"; 
    return; 
  }
  
  let btnKirim = document.querySelector('#stepNomorWA button');
  btnKirim.setAttribute('aria-busy', 'true');
  btnKirim.innerText = 'Mengirim OTP...';
  document.getElementById('modalStatus').innerText = "";

  request("requestOTP", { noWA: noWA })
  .then(res => {
    btnKirim.removeAttribute('aria-busy');
    btnKirim.innerText = 'Kirim Kode OTP';
    if (res.status === "error") throw new Error(res.pesan);
    
    document.getElementById('stepNomorWA').style.display = "none";
    document.getElementById('stepOTP').style.display = "block";
  })
  .catch(err => {
    btnKirim.removeAttribute('aria-busy');
    btnKirim.innerText = 'Kirim Kode OTP';
    document.getElementById('modalStatus').innerText = err.message;
  });
}

function verifikasiOTP() {
  let pinInput = document.getElementById('inputOTP').value.trim();
  if (!pinInput) {
    document.getElementById('modalStatus').innerText = "Kode OTP kosong!";
    return;
  }

  let btnVerif = document.querySelector('#stepOTP button');
  btnVerif.setAttribute('aria-busy', 'true');
  btnVerif.innerText = 'Memverifikasi...';
  document.getElementById('modalStatus').innerText = "";

  request("verifyOTP", { pinInput: pinInput })
  .then(res => {
    btnVerif.removeAttribute('aria-busy');
    btnVerif.innerText = 'Verifikasi Kode';
    if (res.status === "error") throw new Error(res.pesan);

    isAdmin = true;
    document.getElementById('btnAdmin').innerHTML = "🔓 Admin Aktif";
    document.getElementById('btnAdmin').className = ""; 
    tutupModalAdmin();
    tampilkanPesanNotif(res.pesan); 

    document.getElementById('labelInputId').innerText = "Mode Admin (Kosongkan ID untuk tarik semua data)";
    document.getElementById('inputId').required = false; 
    document.getElementById('inputId').placeholder = "Ketik ID atau biarkan kosong";
    document.getElementById('inputId').value = "";
    document.getElementById('btnSubmitForm').innerText = "Cari / Tampilkan Rekap";
    document.getElementById('areaHasil').innerHTML = '';
  })
  .catch(err => {
    btnVerif.removeAttribute('aria-busy');
    btnVerif.innerText = 'Verifikasi Kode';
    document.getElementById('modalStatus').innerText = err.message;
  });
}

function cariSingleData(idWarga) {
  var areaHasil = document.getElementById('areaHasil');
  if (idWarga) {
    document.getElementById('inputId').value = idWarga;
  }
  areaHasil.innerHTML = '<p aria-busy="true">Sedang menyeduh data...</p>';

  request("cariDataWarga", { id: idWarga })
    .then(res => {
      if (res.status === "error") throw new Error(res.pesan);
      renderTampilanWargaBiasa(res.data); 
    })
    .catch(err => {
      areaHasil.innerHTML = `<p style="color:#e74c3c; font-weight:bold;">❌ ${err.message}</p>`;
    });
}

function simpanStatusIPL(e, idWarga) {
  e.preventDefault();
  let btn = document.getElementById('btnSimpanIPL');
  btn.setAttribute('aria-busy', 'true');
  btn.innerText = 'Menyimpan...';
	
  let spanNama = document.getElementById('spanNama_' + idWarga);
  
  let statusPerBulan = {};
  document.querySelectorAll('#formUpdateIPL input[type="checkbox"]').forEach(chk => {
    statusPerBulan[chk.name.replace("chk_", "")] = chk.checked;
  });

  request("simpanPerubahanIPL", { idWarga: idWarga, namaWarga: spanNama.textContent, statusPerBulan: statusPerBulan })
  .then(res => {
    if (res.status === "error") throw new Error(res.pesan);
    tampilkanPesanNotif(res.pesan);
    return request("cariDataWarga", { id: idWarga });
  })
  .then(res => {
    btn.removeAttribute('aria-busy');
    btn.innerText = '💾 Simpan';
    if (res.status === "error") throw new Error(res.pesan);
    renderTampilanWargaBiasa(res.data);
  })
  .catch(err => {
    btn.removeAttribute('aria-busy');
    btn.innerText = '💾 Simpan';
    alert("Gagal: " + err.message);
  });
}

function simpanBarisIPL(e, idWarga) {
  e.preventDefault();
  let btn = document.getElementById('btnSimpan_' + idWarga);
  btn.setAttribute('aria-busy', 'true');
  btn.innerText = '...';

  let inputNama = document.getElementById('inputNama_' + idWarga);
  
  let statusPerBulan = {};
  document.querySelectorAll(`.chk-admin[id^="chk_${idWarga}_"]`).forEach(chk => {
    let kodeSheet = chk.id.replace(`chk_${idWarga}_`, "");
    statusPerBulan[kodeSheet] = chk.checked;
  });

  request("simpanPerubahanIPL", { idWarga: idWarga, namaWarga: inputNama.value, statusPerBulan: statusPerBulan })
  .then(res => {
    btn.removeAttribute('aria-busy');
    btn.innerText = '💾 Simpan Baris';
    if (res.status === "error") throw new Error(res.pesan);

    tampilkanPesanNotif(res.pesan);
    btn.className = "outline success";
    setTimeout(() => { btn.className = "outline"; }, 2000);
  })
  .catch(err => {
    btn.removeAttribute('aria-busy');
    btn.innerText = '💾 Simpan Baris';
    alert("Gagal: " + err.message);
  });
}

function simpanKolomIPL(e, kodeSheet) {
  e.preventDefault();
  let btn = document.getElementById('btnSimpanKolom_' + kodeSheet);
  if (btn) {
    btn.setAttribute('aria-busy', 'true');
    btn.innerText = '...';
  }

  let listData = [];
  document.querySelectorAll(`.chk-admin[id$="_${kodeSheet}"]`).forEach(chk => {
    if (!chk.disabled) {
      let idWarga = chk.id.substring(4, chk.id.length - (kodeSheet.length + 1));
      listData.push({ idWarga: idWarga, lunas: chk.checked });
    }
  });

  request("simpanKolomIPL", { kodeSheet: kodeSheet, data: listData })
  .then(res => {
    if (btn) {
      btn.removeAttribute('aria-busy');
      btn.innerText = '💾 Simpan Kolom';
    }
    if (res.status === "error") throw new Error(res.pesan);

    tampilkanPesanNotif(res.pesan);
    if (btn) {
      btn.className = "outline success";
      setTimeout(() => { btn.className = "outline"; }, 2000);
    }
  })
  .catch(err => {
    if (btn) {
      btn.removeAttribute('aria-busy');
      btn.innerText = '💾 Simpan Kolom';
    }
    alert("Gagal: " + err.message);
  });
}