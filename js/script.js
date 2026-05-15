// Resmi hafızada tutacağımız değişken
let selectedImageBase64 = null;

// ==========================================
// RESİM SEÇME VE ÖNİZLEME (YENİ EKLENDİ)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    // Base64 formatını sunucuya uygun hale getiriyoruz
                    selectedImageBase64 = event.target.result.split(',')[1]; 
                    document.getElementById('previewImg').src = event.target.result;
                    document.getElementById('imagePreview').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// Resmi arayüzden ve hafızadan silen fonksiyon
function clearImage() {
    selectedImageBase64 = null;
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    const preview = document.getElementById('imagePreview');
    if (preview) preview.style.display = 'none';
    const img = document.getElementById('previewImg');
    if (img) img.src = '';
}

// ==========================================
// ARAMA YAPMA (METİN + GÖRSEL DESTEKLİ)
// ==========================================
async function aramaYap(event) {
    if(event) event.preventDefault(); 
    
    const sorgu = document.getElementById('aranan_kutu').value.trim();
    const sonucKutusu = document.getElementById('sonuc_kutusu');
    const cevapKutusu = document.getElementById('cevap_kutusu');
    const cvpKts = document.querySelector('.cvp_kts');

    // Hem resim hem yazı yoksa uyar
    if (!sorgu && !selectedImageBase64) return alert("Lütfen bir soru yazın veya bir resim yükleyin!");

    sonucKutusu.innerHTML = `
        <div class="spinner-border spinner-border-sm text-dark me-2" role="status"></div> 
        F.R.I.D.A.Y. inceliyor...
    `;
    cvpKts.classList.add('d-none');

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Sunucuya artık hem sorguyu hem de resmi (varsa) gönderiyoruz
            body: JSON.stringify({ query: sorgu, image: selectedImageBase64 }) 
        });

        const data = await response.json();
        let metin = data.result || "Arama sırasında bir hata oluştu.";

        sonucKutusu.innerHTML = sorgu ? `<strong>Arama Sonucu:</strong> ${sorgu}` : `<strong>Görsel Analizi Tamamlandı</strong>`;
        
        // Markdown formatını HTML'e çevirme
        let formatliMetin = metin.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatliMetin = formatliMetin.replace(/\n/g, '<br>');
        cevapKutusu.innerHTML = formatliMetin; 
        
        cvpKts.classList.remove('d-none');
        if(sorgu) gecmiseEkle(sorgu);

    } catch (error) {
        console.error("Hata:", error);
        sonucKutusu.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> Sunucuya bağlanılamadı.</span>`;
    } finally {
        // İşlem bitince resmi ekrandan kaldır, bir sonraki arama için temizle
        clearImage();
        document.getElementById('aranan_kutu').value = '';
    }
}

// ==========================================
// DİĞER MEVCUT FONKSİYONLAR (BOZULMADAN KALDI)
// ==========================================
function kopyala() {
    let text = document.getElementById("cevap_kutusu").innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Kopyalandı!");
    }).catch(err => console.error("Kopyalama hatası:", err));
}

function paylas() {
    let text = document.getElementById("cevap_kutusu").innerText;
    if (navigator.share) {
        navigator.share({ title: "F.R.I.D.A.Y.", text: text });
    } else {
        alert("Paylaşım özelliği bu tarayıcıda desteklenmiyor.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    gecmisiYukle();
    const kayitliTema = localStorage.getItem('tema');
    if (kayitliTema === 'dark') {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        const darkModeSwitch = document.getElementById('darkModeSwitch');
        if (darkModeSwitch) {
            darkModeSwitch.checked = true;
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const temaButonu = document.getElementById('temaButonu');
    const htmlEtiketi = document.documentElement;

    const kayitliTema = localStorage.getItem('mercekTema') || 'light';
    if (kayitliTema === 'dark') {
        htmlEtiketi.setAttribute('data-bs-theme', 'dark');
        temaButonu.innerHTML = '<i class="bi bi-brightness-high-fill fs-4 text-warning"></i>';
        temaButonu.className = 'btn btn-outline-light rounded-circle d-flex align-items-center justify-content-center shadow-sm';
    } else {
        temaButonu.innerHTML = '<i class="bi bi-moon-fill fs-4 text-white"></i>'; 
        temaButonu.className = 'btn btn-outline-light rounded-circle d-flex align-items-center justify-content-center shadow-sm';
    }

    temaButonu.addEventListener('click', () => {
        const suankiTema = htmlEtiketi.getAttribute('data-bs-theme');

        if (suankiTema === 'dark') {
            htmlEtiketi.setAttribute('data-bs-theme', 'light');
            temaButonu.innerHTML = '<i class="bi bi-moon-fill fs-4 text-white"></i>'; 
            temaButonu.className = 'btn btn-outline-light rounded-circle d-flex align-items-center justify-content-center shadow-sm';
            localStorage.setItem('mercekTema', 'light');
        } else {
            htmlEtiketi.setAttribute('data-bs-theme', 'dark');
            temaButonu.innerHTML = '<i class="bi bi-brightness-high-fill fs-4 text-warning"></i>'; 
            temaButonu.className = 'btn btn-outline-light rounded-circle d-flex align-items-center justify-content-center shadow-sm';
            localStorage.setItem('mercekTema', 'dark');
        }
    });
});

function gecmiseEkle(sorgu) {
    let gecmis = JSON.parse(localStorage.getItem('aramaGecmisi')) || [];
    gecmis = gecmis.filter(item => item !== sorgu);
    gecmis.unshift(sorgu); 
    if (gecmis.length > 5) {
        gecmis.pop(); 
    }
    localStorage.setItem('aramaGecmisi', JSON.stringify(gecmis));
    gecmisiYukle();
}

// GÜNCELLENMİŞ: Geçmişi Yükleme (Yanına silme butonu eklendi)
function gecmisiYukle() {
    const liste = document.getElementById('gecmis_listesi');
    if(!liste) return;
    let gecmis = JSON.parse(localStorage.getItem('aramaGecmisi')) || [];
    liste.innerHTML = ''; 
    gecmis.forEach(sorgu => {
        // İçinde tek tırnak geçen aramaların kodu bozmasını engellemek için
        const guvenliSorgu = sorgu.replace(/'/g, "\\'");
        
        liste.innerHTML += `
            <li class="nav-item d-flex justify-content-between align-items-center mb-1 pe-2 rounded" style="transition: background 0.2s;">
                <a class="nav-link text-white-50 p-1 small text-truncate" href="#" onclick="gecmistenAra('${guvenliSorgu}')" style="max-width: 85%;">
                    <i class="bi bi-clock-history me-2"></i>${sorgu}
                </a>
                <i class="bi bi-trash text-white-50" role="button" onclick="gecmistenSil('${guvenliSorgu}')" title="Bu aramayı sil" style="cursor: pointer; font-size: 0.9rem;" onmouseover="this.classList.replace('text-white-50', 'text-danger')" onmouseout="this.classList.replace('text-danger', 'text-white-50')"></i>
            </li>
        `;
    });
}

// YENİ: Geçmişten Tekil Öğe Silme Fonksiyonu
function gecmistenSil(sorgu) {
    let gecmis = JSON.parse(localStorage.getItem('aramaGecmisi')) || [];
    // Tıklanan sorguyu diziden çıkar (filtrele)
    gecmis = gecmis.filter(item => item !== sorgu);
    // Kalan listeyi tekrar kaydet
    localStorage.setItem('aramaGecmisi', JSON.stringify(gecmis));
    // Listeyi ekranda anında güncelle
    gecmisiYukle();
}

function gecmistenAra(sorgu) {
    document.getElementById('aranan_kutu').value = sorgu;
    document.querySelector('form button[type="submit"]').click();
}

let recognition = null;
let isListening = false;

function sesleAra() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Tarayıcınız ses tanıma özelliğini desteklemiyor.");
        return;
    }
    const aramaKutusu = document.getElementById('aranan_kutu');
    if (!isListening) {
        recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        aramaKutusu.placeholder = "Dinleniyor...";
        isListening = true;
        recognition.start();

        recognition.onresult = (event) => {
            const konusmaMetni = event.results[0][0].transcript;
            aramaKutusu.value = konusmaMetni;
            aramaKutusu.placeholder = "F.R.I.D.A.Y.'e sor veya resim yükle...";
            isListening = false;
            document.querySelector('form button[type="submit"]').click();
        };

        recognition.onspeechend = () => {
            recognition.stop();
            aramaKutusu.placeholder = "F.R.I.D.A.Y.'e sor veya resim yükle...";
            isListening = false;
        };

        recognition.onerror = (event) => {
            console.error("Ses tanıma hatası:", event.error);
            aramaKutusu.placeholder = "F.R.I.D.A.Y.'e sor veya resim yükle...";
            isListening = false;
            if (event.error !== 'aborted') {
                alert("Ses algılanamadı, lütfen tekrar deneyin.");
            }
        };
    } else {
        if (recognition) recognition.stop();
        aramaKutusu.placeholder = "F.R.I.D.A.Y.'e sor veya resim yükle...";
        isListening = false;
    }
}

function menuAcKapa() {
    const sidebar = document.getElementById('sidebar_cubugu');
    sidebar.classList.toggle('show');
}

async function iletisimGonder(event) {
    event.preventDefault();

    const data = {
        ad: document.getElementById('iletisimAd').value,
        eposta: document.getElementById('iletisimEposta').value,
        konu: document.getElementById('iletisimKonu').value,
        mesaj: document.getElementById('iletisimMesaj').value
    };

    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Mesajınız başarıyla iletildi! Yönetim panelinde görebilirsiniz.');
            const modalElement = document.getElementById('iletisimModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            event.target.reset();
        } else {
            alert('Mesaj gönderilirken bir hata oluştu.');
        }
    } catch (error) {
        console.error('Hata:', error);
        alert('Sunucuya bağlanılamadı.');
    }
}