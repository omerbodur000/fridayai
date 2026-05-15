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
let selectedImageBase64 = null;
let sohbetHafizasi = []; // YENİ: F.R.I.D.A.Y.'in kısa süreli belleği

// ==========================================
// ARAMA YAPMA (METİN + GÖRSEL + HAFIZA DESTEKLİ)
// ==========================================
async function aramaYap(event) {
    if(event) event.preventDefault(); 
    
    const sorgu = document.getElementById('aranan_kutu').value.trim();
    const sonucKutusu = document.getElementById('sonuc_kutusu');
    const cevapKutusu = document.getElementById('cevap_kutusu');
    const cvpKts = document.querySelector('.cvp_kts');

    if (!sorgu && !selectedImageBase64) return alert("Lütfen bir soru yazın veya bir resim yükleyin!");

    sonucKutusu.innerHTML = `<div class="spinner-border spinner-border-sm text-dark me-2" role="status"></div> F.R.I.D.A.Y. inceliyor...`;
    cvpKts.classList.add('d-none');

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // YENİ: Artık sunucuya 'history' (hafıza) dizisini de gönderiyoruz
            body: JSON.stringify({ query: sorgu, image: selectedImageBase64, history: sohbetHafizasi }) 
        });

        const data = await response.json();
        let metin = data.result || "Arama sırasında bir hata oluştu.";

        // YENİ: Konuşmayı hafızaya kaydet 
        if (sorgu) {
            sohbetHafizasi.push({ role: "user", text: sorgu });
            sohbetHafizasi.push({ role: "model", text: metin });
            // Sunucu çok şişmesin diye sadece son 6 mesajı (3 soru-cevap) aklında tutsun
            if (sohbetHafizasi.length > 6) sohbetHafizasi.splice(0, 2);
        }

        sonucKutusu.innerHTML = sorgu ? `<strong>Arama Sonucu:</strong> ${sorgu}` : `<strong>Görsel Analizi Tamamlandı</strong>`;
        
        // Kod bloklarını siyah kutuya çevirme
        let formatliMetin = metin.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
            let safeCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<div class="bg-dark text-light p-3 rounded my-3 position-relative shadow-sm" style="overflow-x: auto; font-family: 'Courier New', Courier, monospace;">
                        <span class="badge bg-secondary position-absolute top-0 end-0 m-2 opacity-75">${lang || 'kod'}</span>
                        <pre class="m-0"><code>${safeCode}</code></pre>
                    </div>`;
        });

        formatliMetin = formatliMetin.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        cevapKutusu.style.whiteSpace = 'pre-wrap';
        cevapKutusu.innerHTML = formatliMetin; 
        
        cvpKts.classList.remove('d-none');
        if(sorgu) gecmiseEkle(sorgu);

    } catch (error) {
        console.error("Hata:", error);
        sonucKutusu.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> Sunucuya bağlanılamadı.</span>`;
    } finally {
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

// GÜNCELLENDİ: Geçmişe eklerken uzun metinleri kısalt ve HTML'i temizle
function gecmiseEkle(sorgu) {
    // 1. Satır atlamalarını boşluğa çevir ve < > işaretlerini zararsız hale getir (Güvenlik)
    let temizSorgu = sorgu.replace(/\n/g, " ").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // 2. Eğer arama çok uzunsa (mesela kod yapıştırdıysan) sadece ilk 40 harfini kaydet
    if (temizSorgu.length > 40) {
        temizSorgu = temizSorgu.substring(0, 40) + "...";
    }

    let gecmis = JSON.parse(localStorage.getItem('aramaGecmisi')) || [];
    gecmis = gecmis.filter(item => item !== temizSorgu);
    gecmis.unshift(temizSorgu); 
    
    if (gecmis.length > 5) {
        gecmis.pop(); 
    }
    localStorage.setItem('aramaGecmisi', JSON.stringify(gecmis));
    gecmisiYukle();
}

// GÜNCELLENDİ: Çift tırnak hatalarına karşı ekstra koruma
function gecmisiYukle() {
    const liste = document.getElementById('gecmis_listesi');
    if(!liste) return;
    let gecmis = JSON.parse(localStorage.getItem('aramaGecmisi')) || [];
    liste.innerHTML = ''; 
    gecmis.forEach(sorgu => {
        // Hem tek tırnak hem çift tırnakların kodu bozmasını engelliyoruz
        const guvenliSorgu = sorgu.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        
        liste.innerHTML += `
            <li class="nav-item d-flex justify-content-between align-items-center mb-1 pe-2 w-100 rounded" style="transition: background 0.2s; overflow: hidden;">
                <a class="nav-link text-white-50 p-1 small text-truncate" href="#" onclick="gecmistenAra('${guvenliSorgu}')" style="width: 85%; display: inline-block;">
                    <i class="bi bi-clock-history me-2"></i>${sorgu}
                </a>
                <i class="bi bi-trash text-white-50 flex-shrink-0" role="button" onclick="gecmistenSil('${guvenliSorgu}')" title="Bu aramayı sil" style="cursor: pointer; font-size: 1rem;" onmouseover="this.classList.replace('text-white-50', 'text-danger')" onmouseout="this.classList.replace('text-danger', 'text-white-50')"></i>
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

// ==========================================
// YENİ: SESLİ OKUMA (TEXT TO SPEECH)
// ==========================================
let konusuyor = false;
let sentezleyici = window.speechSynthesis;

function sesliOku() {
    const metin = document.getElementById("cevap_kutusu").innerText;
    const ikon = document.getElementById("sesIkonu");

    if (!metin) return;

    if (konusuyor) {
        // Eğer asistan zaten konuşuyorsa ve butona tekrar basılırsa sustur
        sentezleyici.cancel();
        konusuyor = false;
        ikon.className = "bi bi-volume-up text-secondary fs-5"; // İkonu eski haline getir
        return;
    }

    // Okunacak metni hazırlıyoruz (kod bloklarını vs. temizleyip düz okuması için innerText kullandık)
    const okuma = new SpeechSynthesisUtterance(metin);
    okuma.lang = 'tr-TR'; // Türkçe aksan
    okuma.rate = 1.0; // Okuma hızı (0.5 yavaş, 1 normal, 1.5 hızlı)

    // Konuşma bittiğinde ikonu otomatik düzelt
    okuma.onend = function() {
        konusuyor = false;
        ikon.className = "bi bi-volume-up text-secondary fs-5";
    };

    // Konuşmayı başlat
    sentezleyici.speak(okuma);
    konusuyor = true;
    
    // Konuşurken ikonun rengini mavi yap ve içini doldur (görsel geri bildirim)
    ikon.className = "bi bi-volume-up-fill text-primary fs-5";
}