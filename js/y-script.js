let currentMessages = [];

// Otomatik Formatlama Fonksiyonu (Nokta ve Virgül)
function formatTutar(input) {
    let value = input.value.replace(/[^0-9,]/g, '');
    let splitValue = value.split(',');
    
    if (splitValue.length > 2) {
        value = splitValue[0] + ',' + splitValue[1];
    }

    let tamKisim = splitValue[0];
    let ondalikKisim = splitValue.length > 1 ? ',' + splitValue[1].substring(0, 2) : '';
    
    tamKisim = tamKisim.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    input.value = tamKisim + ondalikKisim;
}

// Mesajları Sunucudan Getir
async function mesajlariGoster() {
    const alan = document.getElementById('mesajlar_alani');
    alan.innerHTML = `<tr><td colspan="4" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;

    try {
        const response = await fetch('/api/admin/messages');
        const mesajlar = await response.json();
        
        currentMessages = mesajlar.slice().reverse(); 
        
        alan.innerHTML = '';

        if (currentMessages.length === 0) {
            alan.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-5 text-secondary">
                        Henüz yeni bir iletişim mesajı bulunmuyor.
                    </td>
                </tr>`;
            return;
        }

        currentMessages.forEach((m, index) => {
            alan.innerHTML += `
                <tr>
                    <td class="ps-3 text-light" style="font-size: 0.9rem;">${m.tarih}</td>
                    <td>
                        <div class="fw-bold text-white mb-1">${m.ad || 'İsimsiz'}</div>
                        <div class="text-secondary" style="font-size: 0.85rem;">${m.eposta || 'E-posta yok'}</div>
                    </td>
                    <td><span class="badge bg-primary px-3 py-2 rounded-pill">${m.konu || 'Genel'}</span></td>
                    <td class="text-end pe-3">
                        <button class="btn btn-outline-light btn-sm rounded-pill fw-medium px-3" onclick="mesajAc(${index})">Mesajı Gör</button>
                        <button class="btn btn-outline-danger btn-sm rounded-pill ms-2" onclick="mesajiSil(${index})" title="Mesajı Sil"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Yükleme hatası: ", e);
        alan.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Mesajlar yüklenirken bir hata oluştu.</td></tr>`;
    }
}

// Modal'ı Doldurup Açma
function mesajAc(index) {
    const m = currentMessages[index];
    document.getElementById('modalKonu').innerText = m.konu || 'Genel';
    document.getElementById('modalAd').innerText = m.ad || 'İsimsiz';
    document.getElementById('modalEposta').innerText = m.eposta || 'Belirtilmemiş';
    document.getElementById('modalTarih').innerText = m.tarih;
    document.getElementById('modalMesaj').innerText = m.mesaj || 'İçerik yok.';
    
    const modal = new bootstrap.Modal(document.getElementById('mesajDetayModal'));
    modal.show();
}

// Tekil Mesajı Silme
async function mesajiSil(index) {
    if(!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
    
    const gercekIndex = (currentMessages.length - 1) - index;
    
    try {
        const res = await fetch(`/api/admin/messages/${gercekIndex}`, { method: 'DELETE' });
        if(res.ok) {
            mesajlariGoster();
        }
    } catch (e) {
        console.error("Silme hatası: ", e);
    }
}

// Tüm Mesajları Silme
async function tumMesajlariSil() {
    if(!confirm('Tüm mesajları kalıcı olarak silmek istiyor musunuz?')) return;
    try {
        await fetch('/api/admin/messages', { method: 'DELETE' });
        mesajlariGoster();
    } catch (e) {
        console.error("Tümünü silme hatası: ", e);
    }
}

// Kıdem Tazminatı Tavanını Güncelleme (Formatlamayı çözüp kaydeder)
function guncelleKidemTavani() {
    const formatliTavan = document.getElementById('yeniTavanDegeri').value;
    
    if (formatliTavan) {
        const hamDeger = formatliTavan.replace(/\./g, '').replace(',', '.');
        localStorage.setItem('kidemTavan', hamDeger);
        alert('Kıdem tazminatı tavan tutarı ' + formatliTavan + ' TL olarak güncellendi!');
        document.getElementById('yeniTavanDegeri').value = '';
    } else {
        alert('Lütfen geçerli bir tutar girin.');
    }
}

// Mobil Menü Aç/Kapa
function menuAcKapa() { 
    document.getElementById('sidebar_cubugu').classList.toggle('show'); 
}

// Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    mesajlariGoster();
});