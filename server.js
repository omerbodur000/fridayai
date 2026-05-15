const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());

// Resim verileri için limitleri yüksek tutuyoruz
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
// YAPAY ZEKA (GEMINI) DESTEKLİ ARAMA, GÖRSEL VE HAFIZA API (KURŞUNGEÇİRMEZ VERSİYON)
// ============================================
app.post('/api/search', async (req, res) => {
    try {
        const { query, image, history } = req.body;
        
        // 1. HAFIZAYI DÜZ METNE ÇEVİR (En güvenli ve hatasız yöntem)
        let gecmisMetni = "";
        if (history && history.length > 0) {
            gecmisMetni = "--- ÖNCEKİ KONUŞMALAR ---\n";
            history.forEach(msg => {
                let kim = msg.role === "user" ? "Kullanıcı" : "Sen (F.R.I.D.A.Y.)";
                gecmisMetni += `${kim}: ${msg.text}\n`;
            });
            gecmisMetni += "-------------------------\n\n";
        }

        // --- 1. SENARYO: GÖRSEL ANALİZ ---
        if (image) {
            let textPrompt = query ? query : "Lütfen bu resmi analiz et.";
            let visionPrompt = gecmisMetni + "Kullanıcının Yeni Sorusu: " + textPrompt;
            
            try {
                const aiResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [{
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: image } },
                            { text: visionPrompt }
                        ]
                    }]
                });
                return res.json({ result: aiResponse.text });
            } catch (e) {
                return res.json({ result: "Görsel işlenirken Google sunucularında hata: " + e.message });
            }
        }

        if (!query) return res.json({ result: "Lütfen aramak için bir metin girin." });

        // --- 2. ZEKİ YOL AYRIMI (ROUTER) ---
        let karar = "DIREKT"; // Her ihtimale karşı varsayılan olarak kendi çözsün
        try {
            const routerPrompt = `Kullanıcının sorusu: "${query}"\nEğer bu soru; sadece güncel haber, anlık fiyat veya hava durumu ise SADECE "ARAMA" yaz.\nDiğer tüm durumlarda (sohbet, matematik, kod, bağlam vb.) SADECE "DIREKT" yaz.`;
            const routerResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: routerPrompt
            });
            karar = routerResponse.text.trim().toUpperCase();
        } catch (e) {
            console.error("Yol Ayrımı Hatası (Atlandı):", e.message);
        }
        
        // --- DOĞRUDAN SOHBET SENARYOSU ---
        if (karar.includes("DIREKT") || karar.includes("DİREKT")) {
            try {
                const directPrompt = `Sen F.R.I.D.A.Y. adında zeki bir asistansın. ÖNEMLİ KURALLAR:\n1. Kod düzeltmesi istenirse kodu Markdown formatında (\`\`\`) ver.\n2. Matematiksel işlemlerde KESİNLİKLE $ işareti veya LaTeX kullanma, düz dilde (örn: x kare) yaz.\n\n${gecmisMetni}Kullanıcının Yeni Sorusu: "${query}"`;
                
                const directResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: directPrompt
                });
                return res.json({ result: directResponse.text });
            } catch (e) {
                return res.json({ result: "Cevap üretilirken hata oluştu: " + e.message });
            }
        }

        // --- 3. SENARYO: İNTERNET ARAMASI (SERPER) ---
        try {
            const response = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ q: query, hl: "tr", gl: "tr" })
            });
            const searchResults = await response.json();

            let metin = "";
            if (searchResults.knowledgeGraph && searchResults.knowledgeGraph.description) metin += searchResults.knowledgeGraph.description + " ";
            if (searchResults.answerBox && searchResults.answerBox.snippet) metin += searchResults.answerBox.snippet + " ";
            if (searchResults.organic && searchResults.organic.length > 0) metin += searchResults.organic.slice(0, 5).map(item => item.snippet || "").join(" ");

            if (!metin.trim()) {
                const fallbackPrompt = `${gecmisMetni}İnternette güncel veri bulunamadı. Lütfen şu soruya kendi bilginle cevap ver: "${query}"`;
                const fallbackResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: fallbackPrompt
                });
                return res.json({ result: fallbackResponse.text });
            }

            const searchContents = `Aşağıdaki Google sonuçlarına göre bir özet hazırla:\n\nArama Verileri: ${metin}\n\n${gecmisMetni}Kullanıcının Yeni Sorusu: ${query}`;
            const aiResponse = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: searchContents
            });

            res.json({ result: aiResponse.text });

        } catch (e) {
            res.json({ result: "İnternet araması (Serper) sırasında sorun oluştu: " + e.message });
        }

    } catch (error) {
        console.error("Kritik Sunucu Hatası:", error);
        res.json({ result: "Sistemde kritik bir hata oluştu: " + error.message });
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
            <div class="mb-3"><img src="/logo/logo1.png" alt="F.R.I.D.A.Y. Logo" style="width: 64px; height: 64px;"></div>
            <h4 class="mb-4 fw-bold">F.R.I.D.A.Y. - Admin</h4>
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

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;
    
    if (!ADMIN_USER || !ADMIN_PASS) return res.send(`<script>alert('Yönetici bilgileri eksik!'); window.location.href = '/admin/login';</script>`);
    if (username === ADMIN_USER && password === ADMIN_PASS) { req.session.adminGirisli = true; res.redirect('/admin'); } 
    else { res.send(`<script>alert('Kullanıcı adı veya şifre hatalı!'); window.location.href = '/admin/login';</script>`); }
});

app.get('/admin/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(() => { res.clearCookie('connect.sid'); res.redirect('/admin/login'); });
    } else { res.redirect('/admin/login'); }
});

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