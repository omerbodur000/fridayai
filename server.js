const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Oturum Yönetimi
app.use(session({
    secret: process.env.SESSION_SECRET || 'cok-gizli-anahtar',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 15 * 60 * 1000 }
}));

// ANA SAYFA 
app.get('/', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) console.error("Oturum sonlandırılamadı:", err);
            res.clearCookie('connect.sid');
            res.sendFile(__dirname + '/index.html');
        });
    } else {
        res.sendFile(__dirname + '/index.html');
    }
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SERPER_API_KEY;

// Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

function girisKontrol(req, res, next) {
    if (req.session.adminGirisli) next();
    else res.redirect('/admin/login');
}

// ============================================
// YAPAY ZEKA (GEMINI) DESTEKLİ ARAMA API
// ============================================
app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        
        // 1. Serper'den Veri Çek
        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query, hl: "tr", gl: "tr" })
        });
        const searchResults = await response.json();

        // 2. Verileri Birleştir
        let metin = "";
        if (searchResults.knowledgeGraph && searchResults.knowledgeGraph.description) {
            metin += searchResults.knowledgeGraph.description + " ";
        }
        if (searchResults.answerBox && searchResults.answerBox.snippet) {
            metin += searchResults.answerBox.snippet + " ";
        }
        if (searchResults.organic && searchResults.organic.length > 0) {
            // Daha fazla veri gitsin diye ilk 5 sonucu alıyoruz
            metin += searchResults.organic.slice(0, 5).map(item => item.snippet || "").join(" ");
        }

        if (!metin.trim()) {
            return res.json({ result: "Bu sorgu için internette hiçbir veri bulunamadı. Lütfen daha farklı bir kelime aratın." });
        }

        // 3. Aşama: GEMINI'ye Gönder (GÜÇLÜ KOMUT)
        try {
            const aiResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash', // Hızlı ve kararlı ana model
                contents: `Sen profesyonel bir asistansın. Aşağıdaki Google arama sonuçlarını (Arama Verileri) incele ve bana sadece bu verilere dayanarak kullanıcı için akıcı, doğal ve tek bir paragraftan oluşan Türkçe bir özet hazırla. Eğer veriler kısıtlıysa bile elindeki bilgileri toparlayıp tatmin edici bir cevap üret. Asla 'bilgi bulunamadı' veya 'özet çıkaramam' deme.\n\nArama Verileri: ${metin}`
            });

            res.json({ result: aiResponse.text });

        } catch (aiError) {
            console.error("Yapay Zeka Hatası:", aiError.message);
            res.json({ 
                result: "Yapay zeka sunucularında anlık bir yoğunluk var, ancak arama sonuçlarınızın özeti aşağıdadır:\n\n" + metin 
            });
        }

    } catch (error) {
        console.error("Sunucu Hatası:", error);
        res.status(500).json({ error: "Arama sırasında bir hata oluştu." });
    }
});

let mesajlar = [];

app.post('/api/contact', (req, res) => {
    const { ad, eposta, konu, mesaj } = req.body;
    mesajlar.push({
        ad, eposta, konu, mesaj,
        tarih: new Date().toLocaleString('tr-TR'),
        timestamp: Date.now()
    });
    res.status(200).json({ success: true, message: "Başarıyla kaydedildi." });
});

// ADMİN GİRİŞ SAYFASI
app.get('/admin/login', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="tr" data-bs-theme="dark">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Yönetim Paneli Giriş</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body { background-color: var(--bs-body-bg); height: 100vh; display: flex; align-items: center; justify-content: center; }
            .login-box { background: rgba(33, 37, 41, 0.9); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important; border-radius: 30px !important; border: 1px solid var(--bs-border-color); padding: 40px; width: 90%; max-width: 400px; }
        </style>
    </head>
    <body>
        <div class="login-box text-center shadow-sm">
            <div class="mb-3"><img src="/logo/logo1.png" alt="Mercek AI Logo" style="width: 64px; height: 64px;"></div>
            <h4 class="mb-4 fw-bold">MERCEK AI - Admin</h4>
            <form action="/admin/login" method="POST">
                <div class="mb-3 text-start"><label class="form-label small text-muted">Kullanıcı Adı</label><input type="text" class="form-control rounded-pill" name="username" required></div>
                <div class="mb-3 text-start"><label class="form-label small text-muted">Şifre</label><input type="password" class="form-control rounded-pill" name="password" required></div>
                <button type="submit" class="btn btn-light text-dark w-100 rounded-pill mt-3">Giriş Yap</button>
                <a href="/" class="btn btn-outline-light w-100 rounded-pill mt-2">Ana Sayfaya Dön</a>
            </form>
        </div>
    </body>
    </html>
    `);
});

// GİRİŞ İŞLEMİ KONTROLÜ
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;

    if (!ADMIN_USER || !ADMIN_PASS) return res.send(`<script>alert('Yönetici bilgileri eksik!'); window.location.href = '/admin/login';</script>`);
    if (username === ADMIN_USER && password === ADMIN_PASS) { req.session.adminGirisli = true; res.redirect('/admin'); } 
    else { res.send(`<script>alert('Kullanıcı adı veya şifre hatalı!'); window.location.href = '/admin/login';</script>`); }
});

// ÇIKIŞ İŞLEMİ
app.get('/admin/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(() => { res.clearCookie('connect.sid'); res.redirect('/admin/login'); });
    } else { res.redirect('/admin/login'); }
});

// --- REST API ROTALARI ---
app.get('/api/admin/messages', girisKontrol, (req, res) => {
    const BİR_AY_MS = 30 * 24 * 60 * 60 * 1000;
    const simdi = Date.now();
    mesajlar = mesajlar.filter(m => (simdi - (m.timestamp || 0)) < BİR_AY_MS || !m.timestamp);
    res.json(mesajlar);
});

app.delete('/api/admin/messages/:index', girisKontrol, (req, res) => {
    const index = parseInt(req.params.index);
    if (index >= 0 && index < mesajlar.length) mesajlar.splice(index, 1);
    res.json(mesajlar);
});

app.delete('/api/admin/messages', girisKontrol, (req, res) => {
    mesajlar = []; res.json(mesajlar);
});

app.get('/admin', girisKontrol, (req, res) => {
    res.sendFile(__dirname + '/yonetim.html');
});

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor!`);
});