// ... (Arama yapma, geçmişe ekleme, sesle arama vb. yukarıdaki mevcut kodlarınız aynı kalıyor, sadece iletisimGonder fonksiyonunu güncelliyoruz) ...

async function aramaYap(event) {
    event.preventDefault(); 
    
    const sorgu = document.getElementById('aranan_kutu').value;
    const sonucKutusu = document.getElementById('sonuc_kutusu');
    const cevapKutusu = document.getElementById('cevap_kutusu');
    const cvpKts = document.querySelector('.cvp_kts');

    if (!sorgu) return alert("Lütfen bir şey yazın!");

    sonucKutusu.innerHTML = `
        <div class="spinner-border spinner-border-sm text-dark me-2" role="status"></div> 
        Aranıyor...
    `;
    cvpKts.classList.add('d-none');

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sorgu }) 
        });

        const data = await response.json();
        
        // 🚨 SORUN BURADAYDI, ÇÖZÜLDÜ! 🚨
        // Sunucu zaten her şeyi yapay zekaya hazırlatıp 'data.result' içinde bize gönderiyor.
        // Bizim ön yüzde tekrar Google verisi (organic, knowledgeGraph) aramamıza gerek yok!
        let metin = data.result || "Arama sırasında bir hata oluştu.";

        sonucKutusu.innerHTML = `<strong>Arama Sonucu:</strong> ${sorgu}`;
        
        // 🚨 EKSTRA DÜZELTME: innerText yerine innerHTML kullandık ki, 
        // Gemini'nin yaptığı kalın yazılar (**bold**) gibi formatlar ekranda düzgün görünsün.
        // Markdown formatını HTML'e çeviren ufak bir kod ekliyoruz:
        const formatliMetin = metin.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        cevapKutusu.innerHTML = formatliMetin; 
        
        cvpKts.classList.remove('d-none');
        gecmiseEkle(sorgu);

    } catch (error) {
        console.error("Hata:", error);
        sonucKutusu.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> Sunucuya bağlanılamadı.</span>`;
    }
}

function kopyala() {
    let text = document.getElementById("cevap_kutusu").innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Kopyalandı!");
    }).catch(err => console.error("Kopyalama hatası:", err));
}

function paylas() {
    let text = document.getElementById("cevap_kutusu").innerText;
    if (navigator.share) {
        navigator.share({ title: "Mercek AI", text: text });
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

    // Local Storage kontrolü
    const kayitliTema = localStorage.getItem('mercekTema') || 'light';
    if (kayitliTema === 'dark') {
        htmlEtiketi.setAttribute('data-bs-theme', 'dark');
        temaButonu.innerHTML = '<i class="bi bi-brightness-high-fill fs-4 text-warning"></i>'; // Güneş ikonu (Sarı)
        temaButonu.className = 'btn btn-outline-light rounded-circle d-flex align-items-center justify-content-center shadow-sm';
    } else {
        // Eğer sayfa ilk açıldığında aydınlık moddaysa (Ay ikonu) onu da beyaz yapıyoruz
        temaButonu.innerHTML = '<i class="bi bi-moon-fill fs-4 text-white"></i>'; 
        temaButonu.className = 'btn btn-outline-light rounded-circle d-flex align-items-center justify-content-center shadow-sm';
    }

    temaButonu.addEventListener('click', () => {
        const suankiTema = htmlEtiketi.getAttribute('data-bs-theme');

        if (suankiTema === 'dark') {
            // AYDINLIK MODA GEÇİŞ
            htmlEtiketi.setAttribute('data-bs-theme', 'light');
            // Menü zemini koyu olduğu için Ay ikonunu beyaz yapıyoruz (text-white)
            temaButonu.innerHTML = '<i class="bi bi-moon-fill fs-4 text-white"></i>'; 
            temaButonu.className = 'btn btn-outline-light rounded-circle d-flex align-items-center justify-content-center shadow-sm';
            localStorage.setItem('mercekTema', 'light');
        } else {
            // KARANLIK MODA GEÇİŞ
            htmlEtiketi.setAttribute('data-bs-theme', 'dark');
            // Güneş ikonu sarı kalıyor (text-warning)
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

function gecmisiYukle() {
    const liste = document.getElementById('gecmis_listesi');
    if(!liste) return;
    let gecmis = JSON.parse(localStorage.getItem('aramaGecmisi')) || [];
    liste.innerHTML = ''; 
    gecmis.forEach(sorgu => {
        liste.innerHTML += `
            <li class="nav-item">
                <a class="nav-link text-secondary" href="#" onclick="gecmistenAra('${sorgu}')">
                    <i class="bi bi-clock-history me-2"></i>${sorgu}
                </a>
            </li>
        `;
    });
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
            aramaKutusu.placeholder = "Ara...";
            isListening = false;
            document.querySelector('form button[type="submit"]').click();
        };

        recognition.onspeechend = () => {
            recognition.stop();
            aramaKutusu.placeholder = "Ara...";
            isListening = false;
        };

        recognition.onerror = (event) => {
            console.error("Ses tanıma hatası:", event.error);
            aramaKutusu.placeholder = "Ara...";
            isListening = false;
            if (event.error !== 'aborted') {
                alert("Ses algılanamadı, lütfen tekrar deneyin.");
            }
        };
    } else {
        if (recognition) recognition.stop();
        aramaKutusu.placeholder = "Ara...";
        isListening = false;
    }
}

function menuAcKapa() {
    const sidebar = document.getElementById('sidebar_cubugu');
    sidebar.classList.toggle('show');
}

// YENİDEN YAZILAN İLETİŞİM GÖNDERME FONKSİYONU
// LocalStorage kirliliği kaldırıldı, sadece sunucuya atılıyor
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Mesajınız başarıyla iletildi! Yönetim panelinde görebilirsiniz.');
            
            // Modalı Kapatma
            const modalElement = document.getElementById('iletisimModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }

            // Formu temizle
            event.target.reset();
        } else {
            alert('Mesaj gönderilirken bir hata oluştu.');
        }
    } catch (error) {
        console.error('Hata:', error);
        alert('Sunucuya bağlanılamadı.');
    }
}