// ==========================================
// FILE: render.js (Tampilan & Manipulasi DOM)
// ==========================================

function tampilkanPesanNotif(pesan) {
  let notifDiv = document.createElement('div');
  notifDiv.style = "position: fixed; top: 20px; right: 20px; background: #2ecc71; color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; font-weight: bold;";
  notifDiv.innerText = pesan;
  document.body.appendChild(notifDiv);
  setTimeout(() => notifDiv.remove(), 3000);
}

function bukaModalAdmin() {
  var btnAdmin = document.getElementById('btnAdmin');
  if (isAdmin) { // isAdmin membaca dari main.js
    isAdmin = false;
    btnAdmin.innerHTML = "🔑 Akses Admin";
    btnAdmin.className = "outline";
    tampilkanPesanNotif("Berhasil keluar dari mode Admin.");
    
    document.getElementById('labelInputId').innerText = "Masukkan ID Warga";
    document.getElementById('inputId').required = true; 
    document.getElementById('inputId').placeholder = "Ketik ID (misal: P1)";
    document.getElementById('inputId').value = "";
    document.getElementById('btnSubmitForm').innerText = "Cari Data Warga";
    document.getElementById('areaHasil').innerHTML = ''; 
  } else {
    document.getElementById('inputNoWA').value = "";
    document.getElementById('inputOTP').value = "";
    document.getElementById('stepNomorWA').style.display = "block";
    document.getElementById('stepOTP').style.display = "none";
    document.getElementById('modalStatus').innerText = "";
    document.getElementById('modalAdmin').showModal();
  }
}

function tutupModalAdmin() { 
  document.getElementById('modalAdmin').close(); 
}

function renderTabelAdmin(dataServer) {
  var areaHasil = document.getElementById('areaHasil');
  let listWarga = dataServer.dataWarga || [];
  let daftarTigaBulan = dataServer.periodeTigaBulan || [];

  let htmlHeaders = '';
  daftarTigaBulan.forEach((kodeSheet) => {
    let label = formatLabelBulan(kodeSheet);
    htmlHeaders += `
      <th scope="col" width="15%" style="text-align: center;">
        <div><strong>${label}</strong></div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 6px;">
          <input type="checkbox" title="Pilih Semua ${label}" onchange="toggleCheckAll('${kodeSheet}', this.checked)" style="margin: 0; transform: scale(1.2); cursor: pointer;">
          <button type="button" id="btnSimpanKolom_${kodeSheet}" class="outline" style="padding: 0.15rem 0.4rem; font-size: 0.75rem; margin: 0;" title="Simpan Kolom ${label}" onclick="simpanKolomIPL(event, '${kodeSheet}')">💾 Simpan Kolom</button>
        </div>
      </th>
    `;
  });

  let htmlUI = `
    <article style="padding: 1rem; overflow-x: auto;">
      <h5 style="margin-bottom: 1rem;">Rekapitulasi IPL 3 Bulan Terakhir</h5>
      <table role="grid" style="min-width: 700px;">
        <thead>
          <tr>
            <th scope="col" width="8%">ID</th>
            <th scope="col" width="22%">Nama</th>
            <th scope="col" width="15%">Blok</th>
            ${htmlHeaders}
            <th scope="col" width="10%">Aksi</th>
          </tr>
        </thead>
        <tbody>
  `;

  listWarga.forEach(warga => {
    let isKosong = (warga.Nama.trim() === '');

    htmlUI += `<tr>
      <td style="cursor: pointer;" onclick="cariSingleData('${warga.ID}')" title="Klik untuk lihat detail ${warga.ID}">
        <a href="#" class="link-id-warga" onclick="event.preventDefault(); cariSingleData('${warga.ID}');"><strong>${warga.ID}</strong></a>
      </td>`;

    // Kolom Nama dirender sebagai input teks agar bisa diedit langsung (termasuk rumah kosong)
    let nilaiTampilNama = isKosong ? "" : warga.Nama;
    let placeholderTeks = isKosong ? "Rumah Kosong (Silahkan isi jika perlu)" : "";

    htmlUI += `<td><input type="text" id="inputNama_${warga.ID}" value="${nilaiTampilNama}" placeholder="${placeholderTeks}" style="padding: 0.25rem 0.4rem; font-size: 0.85rem; margin: 0; width: 100%;"></td>`;
    htmlUI += `<td>${warga.Blok}-${warga.Nomor}</td>`;

    daftarTigaBulan.forEach(kodeSheet => {
      let dataBayar = warga.riwayatIPL ? warga.riwayatIPL.find(item => item.periode === kodeSheet) : null;
      let isLunas = (dataBayar && dataBayar.lunas === true) ? true : false;

      htmlUI += `<td style="text-align: center;"><input type="checkbox" class="chk-admin" id="chk_${warga.ID}_${kodeSheet}" ${isLunas ? "checked" : ""}></td>`;
    });

    htmlUI += `<td style="text-align: center;">`;
    htmlUI += `<button type="button" id="btnSimpan_${warga.ID}" class="outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; margin: 0;" onclick="simpanBarisIPL(event, '${warga.ID}')">💾 Simpan Baris</button>`;
    htmlUI += `</td></tr>`;
  });

  htmlUI += `</tbody></table></article>`;
  areaHasil.innerHTML = htmlUI;
}

function renderTampilanWargaBiasa(dataWarga) {
  var areaHasil = document.getElementById('areaHasil');
  
  // Deteksi apakah rumah kosong
  let isKosong = (dataWarga.Nama.trim() === '');

  let htmlUI = `
    <article>
	   <span id="spanNama_${dataWarga.ID}" hidden>${dataWarga.Nama}</span>
      <header>
        <strong>${isKosong ? "Rumah Kosong" : dataWarga.Nama}</strong> (${dataWarga.ID})
      </header>
      <ul style="margin-bottom: 1rem;">
        <li><strong>Alamat:</strong> ${dataWarga.Alamat}</li>
        <li><strong>Blok / No:</strong> ${dataWarga.Blok} - ${dataWarga.Nomor}</li>
      </ul>
      <h5 style="margin-bottom: 0.5rem;">Status IPL 3 Bulan Terakhir:</h5>
  `;

  if (isAdmin) htmlUI += `<form id="formUpdateIPL" onsubmit="simpanStatusIPL(event, '${dataWarga.ID}')">`;
  htmlUI += `<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 1rem;">`;
  
  let adaDataTampil = false;
  let daftarTigaBulan = dataWarga.periodeTigaBulan || [];

  daftarTigaBulan.forEach(kodeSheet => {
    let dataBayar = dataWarga.riwayatIPL.find(item => item.periode === kodeSheet);
    let labelBulan = formatLabelBulan(kodeSheet);
    let isLunas = dataBayar ? true : false;
    
    if (!isAdmin && !isLunas) return; 
    
    adaDataTampil = true;
    let bgCard = isLunas ? "#e8f8f5" : (isKosong ? "#f2f4f4" : "#fdf2f2");
    let borderColor = isLunas ? "#2ecc71" : (isKosong ? "#bdc3c7" : "#e74c3c");
    
    htmlUI += `
      <div style="flex: 1; min-width: 140px; background: ${bgCard}; border: 1px solid ${borderColor}; padding: 12px; border-radius: 8px; text-align: center;">
        <strong style="display: block; margin-bottom: 5px; color: #333;">${labelBulan}</strong>
    `;

    if (isKosong) {
      htmlUI += `<span style="color: #95a5a6; font-size: 0.85rem; font-style: italic; display: block; margin-top: 5px;">Kosong</span>`;
    } else {
      // Tampilan normal dengan checkbox
      htmlUI += `
        <label style="cursor: ${isAdmin ? "pointer" : "default"}; font-size: 0.85rem; font-weight: bold; display: inline-flex; align-items: center; justify-content: center; width: 100%; gap: 5px;">
          <input type="checkbox" name="chk_${kodeSheet}" ${isLunas ? "checked" : ""} ${isAdmin ? "" : "disabled"} style="margin: 0;">
          ${isLunas ? '<span style="color: #27ae60;">LUNAS</span>' : '<span style="color: #c0392b;">BELUM</span>'}
        </label>
      `;

      if (isLunas) {
        let dtWarga = JSON.stringify(dataWarga).replace(/"/g, '&quot;');
        let dtBayar = JSON.stringify(dataBayar).replace(/"/g, '&quot;');
        htmlUI += `<div style="margin-top: 8px;"><button type="button" class="btn-kwitansi outline secondary" style="font-size: 0.7rem; padding: 4px 8px;" onclick="downloadInvoiceJPG(${dtWarga}, ${dtBayar})">📥 Kwitansi</button></div>`;
      }
    }
    
    htmlUI += `</div>`;
  });

  if (!isAdmin && !adaDataTampil) {
    htmlUI += `<p style="color: #7f8c8d; font-style: italic; width: 100%;">Belum ada catatan pembayaran lunas untuk 3 bulan terakhir.</p>`;
  }
  htmlUI += `</div>`;
  
  // Jika admin login DAN rumahnya ADA PENGHUNINYA (tidak kosong), baru tampilkan tombol Simpan
  if (isAdmin && !isKosong) {
    htmlUI += `<div style="margin-top: 1.5rem; text-align: right;"><button type="submit" id="btnSimpanIPL" class="contrast">💾 Simpan</button></div>`;
  }
  
  if (isAdmin) {
    htmlUI += `</form></article>`;
  } else {
    htmlUI += `</article>`;
  }
  
  areaHasil.innerHTML = htmlUI;
}

function toggleCheckAll(kodeSheet, isChecked) {
  document.querySelectorAll(`.chk-admin[id$="_${kodeSheet}"]`).forEach(chk => {
    if (!chk.disabled) {
      chk.checked = isChecked;
    }
  });
}

function downloadInvoiceJPG(dataWarga, dataBayar) {
  let warga = typeof dataWarga === 'string' ? JSON.parse(dataWarga) : dataWarga;
  let bayar = typeof dataBayar === 'string' ? JSON.parse(dataBayar) : dataBayar;

  request("ambilNamaBendahara").then(res => {
    document.getElementById('invPeriode').innerText = formatLabelBulan(bayar.periode);
    document.getElementById('invNama').innerText = warga.Nama;
    document.getElementById('invAlamat').innerText = warga.Alamat;
    document.getElementById('invBlokNo').innerText = "Blok / No: " + warga.Blok + " - " + warga.Nomor;
    document.getElementById('invHarga').innerText = "Rp " + (Number(bayar.nominal) || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('invTanggal').innerText = bayar.waktuBayar;
    document.getElementById('invBendahara').innerText = res.data !== undefined ? res.data : res;

    html2canvas(document.getElementById('invoiceCard'), { scale: 3, useCORS: true }).then(canvas => {
      let link = document.createElement('a');
      link.download = `Invoice_${bayar.periode}_${warga.Nama.replace(/\s+/g, '_')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    });
  });
}