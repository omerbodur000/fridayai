// Mobil Menü Aç/Kapa
function menuAcKapa() { 
    document.getElementById('sidebar_cubugu').classList.toggle('show'); 
}

// Tema Değiştirme Fonksiyonu
function temaDegistir() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Otomatik Formatlama Fonksiyonu (Giriş yapıldıkça nokta ve virgül ekler)
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

// Formatlı görsel sayıyı (Örn: 35.000,50) matematiğe (35000.50) çevirir
function parseTutar(value) {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}

// Sayfa yüklendiğinde çalışacaklar (Tavan çekme ve Tema kontrolü)
document.addEventListener('DOMContentLoaded', () => {
    // 1. Kayıtlı temayı kontrol et ve şalteri ayarla
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    if (darkModeSwitch) {
        darkModeSwitch.checked = (savedTheme === 'dark');
    }

    // 2. Güncel Tavanı Göster
    const tavanGuncelDeger = localStorage.getItem('kidemTavan');
    const tavan = tavanGuncelDeger ? parseFloat(tavanGuncelDeger) : 64948.77; 
    
    const gosterge = document.getElementById('guncelTavanGosterge');
    if (gosterge) {
        gosterge.innerText = tavan.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
    }
});

// Kıdem Hesaplama İşlemi
function hesaplaKidem() {
    const maasGirdisi = document.getElementById('brutMaas').value;
    const yilGirdisi = document.getElementById('calismaYil').value;

    if (!maasGirdisi || !yilGirdisi) {
        alert("Lütfen brüt maaşınızı ve çalışma sürenizi eksiksiz girin.");
        return;
    }

    const hamMaas = parseTutar(maasGirdisi);
    const yil = parseFloat(yilGirdisi);

    if (yil <= 0) {
        alert("Çalışma yılı sıfırdan büyük olmalıdır.");
        return;
    }

    // Yönetim panelinden kaydedilen kıdem tavanını al (Bulamazsa güncel varsayılan tavanı kullan)
    const tavanGuncelDeger = localStorage.getItem('kidemTavan');
    const tavan = tavanGuncelDeger ? parseFloat(tavanGuncelDeger) : 64948.77; 

    // Kıdem tazminatı, brüt maaş ve kıdem tavanı kıyaslanarak küçük olan değer üzerinden hesaplanır
    const esasMaas = Math.min(hamMaas, tavan);
    const toplamTazminat = esasMaas * yil;

    // Sonucu ekranda göster
    const sonucAlani = document.getElementById('sonucAlani');
    const sonucYazi = document.getElementById('kidemSonuc');

    sonucAlani.classList.remove('d-none');
    
    // Sonucu TL formatında (Noktalı ve virgüllü) basar
    sonucYazi.innerText = toplamTazminat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
}