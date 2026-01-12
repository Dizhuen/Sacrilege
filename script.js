const SUPABASE_URL = 'https://cjfxgotljzolykpsuxej.supabase.co';
// ИСПРАВЛЕННЫЙ КЛЮЧ (Восстановлен оригинал)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZnhnb3RsanpvbHlrcHN1eGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzI3OTUsImV4cCI6MjA4MzU0ODc5NX0.fZaXCZh9cAZUIq2A-69Xo0wzH_2zKU4k-4VSFRpRCb4';
const MANAGER_PHONE = '+37362097776';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let cart = [];
try { cart = JSON.parse(localStorage.getItem('sacrilege_cart')) || []; } catch(e) { console.warn("Cart corrupted"); }

const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
let ringX = mouseX, ringY = mouseY;
let idleTimer;
let descInterval; 

// --- I18N SYSTEM ---
const TRANSLATIONS = {
    en: { boot_sys: "SYSTEM_BOOT", scroll_explore: "SCROLL TO EXPLORE", ready_ship: "/// READY TO SHIP", global_log: "/// GLOBAL_TRANSMISSION_LOG", live_status: "LIVE", footer_motto: "NO EXIT. NO RETURN.", size_select: "SIZE_SELECTION", btn_add: "[BIND TO SOUL]", leave_review: "[+] LEAVE PROTOCOL ENTRY", btn_transmit: "TRANSMIT ENTRY", checkout_title: "SHIPPING_DETAILS", total: "TOTAL", btn_order: "PLACE ORDER", cart_title: "CART", btn_checkout: "CHECKOUT", ph_name: "IDENTIFIER (NAME)", ph_sat: "SATISFIED ABOUT...", ph_dis: "DISGRUNTLED ABOUT...", ph_fullname: "FULL NAME", ph_phone: "PHONE (WHATSAPP)", ph_address: "STREET ADDRESS", ph_city: "CITY", ph_zip: "ZIP CODE" },
    ru: { boot_sys: "ЗАГРУЗКА_СИСТЕМЫ", scroll_explore: "СКРОЛЛ ДЛЯ ПОГРУЖЕНИЯ", ready_ship: "/// ГОТОВО К ОТПРАВКЕ", global_log: "/// ГЛОБАЛЬНЫЙ_ПРОТОКОЛ", live_status: "АКТИВНО", footer_motto: "НЕТ ВЫХОДА. НЕТ ВОЗВРАТА.", size_select: "ВЫБОР_РАЗМЕРА", btn_add: "[ПРИВЯЗАТЬ К ДУШЕ]", leave_review: "[+] ОСТАВИТЬ ЗАПИСЬ В ПРОТОКОЛЕ", btn_transmit: "ОТПРАВИТЬ ДАННЫЕ", checkout_title: "ДАННЫЕ_ДОСТАВКИ", total: "ИТОГО", btn_order: "ОФОРМИТЬ ЗАКАЗ", cart_title: "КОРЗИНА", btn_checkout: "ОФОРМИТЬ", ph_name: "ИДЕНТИФИКАТОР (ИМЯ)", ph_sat: "УДОВЛЕТВОРЕН...", ph_dis: "НЕДОВОЛЕН...", ph_fullname: "ПОЛНОЕ ИМЯ", ph_phone: "ТЕЛЕФОН (WHATSAPP)", ph_address: "АДРЕС ДОСТАВКИ", ph_city: "ГОРОД", ph_zip: "ИНДЕКС" },
    ro: { boot_sys: "INIȚIERE_SISTEM", scroll_explore: "DERULEAZĂ PENTRU A EXPLORA", ready_ship: "/// GATA DE LIVRARE", global_log: "/// JURNAL_GLOBAL", live_status: "LIVE", footer_motto: "FĂRĂ IEȘIRE. FĂRĂ ÎNTOARCERE.", size_select: "SELECTARE_MĂRIME", btn_add: "[LEAGĂ DE SUFLET]", leave_review: "[+] LASĂ O INTRARE ÎN PROTOCOL", btn_transmit: "TRANSMITE", checkout_title: "DETALII_LIVRARE", total: "TOTAL", btn_order: "PLASEAZĂ COMANDA", cart_title: "COȘ", btn_checkout: "FINALIZARE", ph_name: "IDENTIFICATOR (NUME)", ph_sat: "MULȚUMIT DE...", ph_dis: "NEMULȚUMIT DE...", ph_fullname: "NUME COMPLET", ph_phone: "ТЕЛЕФОН (WHATSAPP)", ph_address: "ADRESĂ", ph_city: "ORAȘ", ph_zip: "COD POȘTAL" }
};
let currentLang = localStorage.getItem('sacrilege_lang') || 'en';
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ru' : (currentLang === 'ru' ? 'ro' : 'en');
    localStorage.setItem('sacrilege_lang', currentLang); applyLanguage();
}
function applyLanguage() {
    const t = TRANSLATIONS[currentLang];
    const disp = document.getElementById('lang-display'); if(disp) disp.innerText = currentLang.toUpperCase();
    document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if(t[key]) el.innerText = t[key]; });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { const key = el.getAttribute('data-i18n-ph'); if(t[key]) el.placeholder = t[key]; });
}

// --- AUDIO SYSTEM ---
let audioCtx, loopSource, gainNode, loopBuffer = null;
let isMuted = true, isHtmlAudioMode = false;
let proceduralCtx; 

async function setupAudio() {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        proceduralCtx = new AudioContext(); 
        audioCtx = new AudioContext(); 
        const response = await fetch('humloop.mp3');
        if(!response.ok) throw new Error('Fetch failed');
        const arrayBuffer = await response.arrayBuffer();
        loopBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch(e) {
        console.warn("Audio fallback mode:", e.message);
        isHtmlAudioMode = true;
        const el = document.getElementById('bg-audio');
        if(el) { el.volume = 0; el.loop = true; }
    }
}

function startLoop() {
    if(isHtmlAudioMode) { 
        const el = document.getElementById('bg-audio'); 
        if(el) { el.play().catch(()=>{}); gsap.to(el, { volume: 0.15, duration: 2 }); } 
        return; 
    }
    if(!loopBuffer || !audioCtx) return;
    if(loopSource) return; 
    
    loopSource = audioCtx.createBufferSource(); 
    loopSource.buffer = loopBuffer; 
    loopSource.loop = true;
    
    gainNode = audioCtx.createGain(); 
    gainNode.gain.value = 0; 
    
    loopSource.connect(gainNode); 
    gainNode.connect(audioCtx.destination); 
    loopSource.start(0);
    
    gsap.to(gainNode.gain, { value: 0.15, duration: 2 });
}

function stopLoop() {
    if(isHtmlAudioMode) { 
        const el = document.getElementById('bg-audio'); 
        if(el) gsap.to(el, { volume: 0, duration: 1, onComplete: () => el.pause() }); 
        return; 
    }
    if(loopSource && gainNode) {
        gsap.to(gainNode.gain, { value: 0, duration: 1, onComplete: () => { 
            if(loopSource) { 
                try { loopSource.stop(); } catch(e){}
                loopSource = null; 
            } 
        }});
    }
}

function setAmbientVolume(target) {
    if(isMuted) return; 
    if(isHtmlAudioMode) { 
        const el = document.getElementById('bg-audio'); 
        if(el) gsap.to(el, { volume: target, duration: 5 }); 
        return; 
    }
    if(gainNode) gsap.to(gainNode.gain, { value: target, duration: 5 });
}

function toggleSound() {
    isMuted = !isMuted;
    const icon = document.getElementById('sound-icon'), btn = document.getElementById('sound-btn');
    if(proceduralCtx && proceduralCtx.state === 'suspended') proceduralCtx.resume();
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (!isMuted) { icon.setAttribute('data-lucide', 'volume-2'); btn.classList.add('text-red-500'); startLoop(); } 
    else { icon.setAttribute('data-lucide', 'volume-x'); btn.classList.remove('text-red-500'); stopLoop(); }
    lucide.createIcons();
}

function playTone(freq, duration, type = 'sine', gainVal = 0.05) {
    if (isMuted || !proceduralCtx) return;
    try {
        const osc = proceduralCtx.createOscillator(); const g = proceduralCtx.createGain();
        osc.frequency.value = freq; osc.type = type; g.gain.value = gainVal;
        osc.connect(g); g.connect(proceduralCtx.destination);
        osc.start(); g.gain.exponentialRampToValueAtTime(0.00001, proceduralCtx.currentTime + duration);
        osc.stop(proceduralCtx.currentTime + duration);
    } catch(e){}
}
function playHoverSound() { playTone(300, 0.05, 'triangle', 0.05); } 
function playClickSound() { playTone(800, 0.1, 'square', 0.05); }   

// --- PSYCHOSIS SYSTEM ---
class PsychosisSystem {
    constructor() {
        this.layer = document.getElementById('psychosis-layer');
        this.isActive = false;
        this.phrases = ["ARE YOU SURE?", "NO RETURN", "CONSUME", "VOID", "THEY ARE WATCHING", "WAKE UP", "ERROR", "NOTHING IS REAL", "BUY BUY BUY", "SYSTEM FAILURE", "DO NOT LOOK", "RUN", "010101", "NULL"];
        this.timers = [];
    }
    start() { if(this.isActive) return; this.isActive = true; this.layer.classList.add('active'); this.loop(); }
    stop() { this.isActive = false; this.layer.classList.remove('active'); this.layer.innerHTML = ''; this.timers.forEach(t => clearTimeout(t)); this.timers = []; }
    loop() {
        if(!this.isActive) return;
        const text = document.createElement('div');
        text.className = 'psychosis-text';
        text.innerText = this.phrases[Math.floor(Math.random() * this.phrases.length)];
        const size = Math.random() * 5 + 1 + 'rem';
        text.style.fontSize = size;
        text.style.left = Math.random() * 90 + '%';
        text.style.top = Math.random() * 90 + '%';
        text.style.transform = `rotate(${Math.random() * 360 + 'deg'})`;
        this.layer.appendChild(text);
        setTimeout(() => { if(text.parentNode) text.parentNode.removeChild(text); }, 150);
        const nextTime = Math.random() * 10000 + 8000; 
        const t = setTimeout(() => this.loop(), nextTime);
        this.timers.push(t);
    }
}
const psychosisSys = new PsychosisSystem();

// --- CURSOR GLITCH SYSTEM ---
class CursorGlitchSystem {
    constructor() {
        if(isTouch) return;
        this.container = document.getElementById('cursor-glitch');
        this.active = true;
        this.loop();
    }
    loop() {
        if(isTouch) return;
        const nextTime = Math.random() * 15000 + 10000;
        setTimeout(() => { this.triggerGlitch(); this.loop(); }, nextTime);
    }
    triggerGlitch() {
        if (!this.active || document.body.classList.contains('idle') || isTouch) return;
        const icons = [
            `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M11 20H13V14H18V12H13V4H11V12H6V14H11V20Z" /></svg>`,
            `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21.2 2.8C21.2 2.8 16 9 16 9L18 11L21.2 2.8ZM15 10L3 22L2 21L14 9L15 10Z" /></svg>`,
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`
        ];
        this.container.innerHTML = icons[Math.floor(Math.random() * icons.length)];
        this.container.style.left = mouseX + 'px';
        this.container.style.top = mouseY + 'px';
        document.body.classList.add('glitching');
        this.container.classList.remove('hidden');
        if (!isMuted && proceduralCtx) playTone(100, 0.1, 'sawtooth', 0.1);
        setTimeout(() => {
            document.body.classList.remove('glitching');
            this.container.classList.add('hidden');
        }, 100);
    }
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", async () => {
    const preloader = document.getElementById("preloader");
    if(localStorage.getItem('sacrilege_theme') === 'light') toggleTheme(false);
    applyLanguage(); setupAudio();

    document.addEventListener('click', () => {
        if(proceduralCtx && proceduralCtx.state === 'suspended') proceduralCtx.resume();
        if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }, {once:true});

    if(!isTouch) new CursorGlitchSystem();

    try {
        lucide.createIcons();
        initInteractions();
        await Promise.all([loadConfig(), loadData(), loadReviews()]);
        updateCartUI();
        document.getElementById('product-modal').addEventListener('click', (e) => { if (e.target.id === 'product-modal') closeProductModal(); });
        document.addEventListener('keydown', (e) => { if(e.key === "Escape") closeProductModal(); });
        const addBtn = document.getElementById('confirm-add-btn');
        if (addBtn) addBtn.onclick = addToCart;
    } catch (e) { 
        console.error("Initialization error:", e); 
        // Если ошибка 401, выводим подсказку в консоль
        if(e.status === 401) console.warn("CRITICAL: Supabase 401. Check your API Key.");
    } 
    finally { 
        setTimeout(() => {
            if(preloader) { preloader.style.opacity = "0"; preloader.style.transform = "scaleX(1.5) scaleY(0.01)"; }
            const sub = document.getElementById('hero-sub'); if(sub) sub.style.transform = "translateY(0)"; 
            initScrollReveal();
            // Force reveal to ensure we don't stay in loading
            document.querySelectorAll('.reveal-item').forEach(el => el.classList.add('active'));
            setTimeout(() => { if(preloader) preloader.style.pointerEvents = "none"; initMagneticButtons(); initHoverTriggers(); }, 500);
        }, 1500);
    }
});

function initInteractions() {
    const parallaxLayers = document.querySelectorAll('.parallax-layer');
    const windowWidth = window.innerWidth, windowHeight = window.innerHeight;
    const dot = document.getElementById("cursor-dot");
    const ring = document.getElementById("cursor-ring");
    const glitchContainer = document.getElementById("cursor-glitch");

    const resetIdle = () => {
        if (document.body.classList.contains('idle')) {
            document.body.classList.remove('idle');
            psychosisSys.stop(); 
            if(!isMuted) setAmbientVolume(0.15); 
        }
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            document.body.classList.add('idle'); 
            psychosisSys.start(); 
            if(!isMuted) setAmbientVolume(0.8);
        }, 30000);
    };

    document.documentElement.style.setProperty('--cursor-x', `50vw`);
    document.documentElement.style.setProperty('--cursor-y', `50vh`);

    const setCursor = (x, y) => {
        document.documentElement.style.setProperty('--cursor-x', `${x}px`);
        document.documentElement.style.setProperty('--cursor-y', `${y}px`);
        if(!isTouch && dot) {
            gsap.to(dot, { left: x, top: y, duration: 0 });
            if (!glitchContainer.classList.contains('hidden')) {
                glitchContainer.style.left = x + 'px';
                glitchContainer.style.top = y + 'px';
            }
            const xPos = (x / windowWidth - 0.5) * 2, yPos = (y / windowHeight - 0.5) * 2;
            parallaxLayers.forEach(layer => {
                const speed = parseFloat(layer.getAttribute('data-layer'));
                gsap.to(layer, { x: xPos * 100 * speed, y: yPos * 100 * speed, duration: 0.5, ease: "power2.out" });
            });
        }
    };

    if (!isTouch) {
        gsap.ticker.add(() => {
            if(ring) {
                ringX += (mouseX - ringX) * 0.3; ringY += (mouseY - ringY) * 0.3;
                ring.style.left = `${ringX}px`; ring.style.top = `${ringY}px`;
            }
        });
        document.addEventListener("mousemove", (e) => { 
            mouseX = e.clientX; mouseY = e.clientY; 
            resetIdle();
            requestAnimationFrame(() => setCursor(mouseX, mouseY));
        });
    } else {
        document.addEventListener("touchstart", resetIdle);
        document.addEventListener("scroll", resetIdle);
    }
}

let productsData = [];
let currentProduct = null;
let currentSize = null;
let currentSlideIndex = 0;
let slideImages = [];
let systemLabel = "ARCHIVE_REF"; 

let isChaos = false;
function triggerEasterEgg() {
    if (isChaos) return; isChaos = true;
    if(!isMuted && proceduralCtx) { playTone(50, 1.0, 'sawtooth', 0.2); setTimeout(() => playTone(300, 0.2, 'square', 0.1), 100); }
    document.getElementById('site-content').classList.add('shaking');
    document.getElementById('brand-logo').classList.add('shaking');
    document.getElementById('chaos-overlay').classList.add('active');
    const logo = document.getElementById('brand-logo'); const originalText = logo.innerText;
    const phrases = ["RUN AWAY", "LOOK BEHIND", "NO ESCAPE", "VOID", "ERROR 666", "DON'T LOOK"];
    let interval = setInterval(() => { logo.innerText = phrases[Math.floor(Math.random() * phrases.length)]; logo.style.color = Math.random() > 0.5 ? 'black' : 'red'; }, 100);
    setTimeout(() => {
        clearInterval(interval);
        document.getElementById('site-content').classList.remove('shaking');
        document.getElementById('brand-logo').classList.remove('shaking');
        document.getElementById('chaos-overlay').classList.remove('active');
        logo.innerText = originalText; logo.style.color = ''; isChaos = false;
    }, 1500);
}

function toggleTheme(save = true) {
    let isLightMode = document.body.classList.contains('light-mode');
    isLightMode = !isLightMode;
    if(!save) isLightMode = localStorage.getItem('sacrilege_theme') === 'light';
    const body = document.body; const icon = document.getElementById('theme-icon');
    if (isLightMode) { body.classList.add('light-mode'); if(icon) icon.setAttribute('data-lucide', 'eye-off'); if(save) localStorage.setItem('sacrilege_theme', 'light'); } 
    else { body.classList.remove('light-mode'); if(icon) icon.setAttribute('data-lucide', 'eye'); if(save) localStorage.setItem('sacrilege_theme', 'dark'); }
    lucide.createIcons();
}

async function loadConfig() {
    try {
        const { data } = await sb.from('site_config').select('*').single();
        if(data) {
            document.querySelectorAll('.parallax-layer').forEach(l => l.innerText = data.hero_title || 'LOADING...');
            const sub = document.getElementById('hero-sub'); if(sub) sub.innerText = data.hero_subtitle || '...';
            const tick = document.getElementById('ticker-content'); if(tick) tick.innerHTML = `<span>${(data.ticker_text || 'SACRILEGE') + " /// "}</span>`.repeat(10);
            if(data.system_label) systemLabel = data.system_label;
            const waValue = data.contact_whatsapp || data.contact_telegram;
            if(waValue) {
                const wa = document.getElementById('contact-whatsapp');
                if(wa) { wa.href = waValue.startsWith('http') ? waValue : `https://wa.me/${waValue.replace(/[^0-9]/g, '')}`; wa.style.display = 'flex'; }
            }
            if(data.contact_telegram) {
                const tg = document.getElementById('contact-telegram');
                if(tg) { tg.href = data.contact_telegram.startsWith('http') ? data.contact_telegram : `https://t.me/${data.contact_telegram.replace('@', '')}`; tg.style.display = 'flex'; }
            }
            if(data.contact_email) {
                const em = document.getElementById('contact-email');
                if(em) { em.href = `mailto:${data.contact_email}`; em.style.display = 'flex'; }
            }
            lucide.createIcons();
        }
    } catch(e) { console.warn("Config load failed (check Supabase Key)"); }
}

async function loadData() {
    try {
        const { data: cols } = await sb.from('site_collections').select('*').order('created_at', {ascending: true});
        const collections = cols || [];
        const { data: prods } = await sb.from('products').select('*').order('id', {ascending: false});
        productsData = prods || [];
        renderSections(collections);
    } catch(e) {
        console.error("Data load error:", e);
        document.getElementById('shop-container').innerHTML = `<div class="text-center font-mono text-red-600 mt-20">CONNECTION LOST. RELOAD.</div>`;
    }
}

function renderSections(collections) {
    const container = document.getElementById('shop-container');
    if(!container) return;
    if(collections.length === 0 && productsData.length > 0) {
        container.innerHTML = `<div id="product-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"></div>`;
        renderGrid(productsData, document.getElementById('product-grid'));
    } else if (productsData.length === 0) {
        container.innerHTML = `<div class="text-center font-mono text-theme-muted mt-20">VOID IS EMPTY</div>`;
    } else {
        let html = '';
        const validCollections = collections.filter(col => {
            const colProducts = productsData.filter(p => p.collection_id === col.id);
            return colProducts.length > 0;
        });
        validCollections.forEach((col, idx) => {
            const colProducts = productsData.filter(p => p.collection_id === col.id);
            const gridHtml = colProducts.map(p => getProductCardHTML(p)).join('');
            const isLast = idx === validCollections.length - 1;
            const orphans = productsData.filter(p => !p.collection_id);
            const borderClass = (isLast && orphans.length === 0) ? '' : 'border-b border-theme';
            html += `<div class="mb-20 ${borderClass} pb-10"><div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 reveal-item active gap-2"><h3 class="font-serif text-3xl md:text-4xl text-theme-color">${col.title}</h3><span class="font-wide text-[10px] md:text-xs text-red-600 tracking-widest" data-i18n="ready_ship">/// READY TO SHIP</span></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">${gridHtml}</div></div>`;
        });
        const orphans = productsData.filter(p => !p.collection_id);
        if(orphans.length > 0) {
            const gridHtml = orphans.map(p => getProductCardHTML(p)).join('');
            html += `<div class="mb-20 pb-10"><div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 reveal-item active gap-2"><h3 class="font-serif text-3xl md:text-4xl text-theme-color">ARCHIVE</h3></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">${gridHtml}</div></div>`;
        }
        container.innerHTML = html;
        container.querySelectorAll('.reveal-item').forEach(el => el.classList.add('active'));
    }
    setTimeout(() => { initHoverTriggers(); initScrollReveal(); applyLanguage(); lucide.createIcons(); }, 100);
}

function getProductCardHTML(p) {
    const stock = p.stock || {S:true, M:true, L:true, XL:true};
    const isTotallySoldOut = !stock.S && !stock.M && !stock.L && !stock.XL;
    return `<div class="reveal-item active group relative spotlight-card rounded-md hover-trigger pointer-events-auto" style="z-index: 1;"><div class="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur px-2 py-1 border border-white/10 pointer-events-none"><span class="font-mono text-[10px] ${isTotallySoldOut ? 'text-neutral-500' : 'text-red-500'}">${isTotallySoldOut ? 'SOLD_OUT' : p.tag || 'NEW'}</span></div><div class="relative aspect-[4/5] overflow-hidden bg-neutral-900 ${isTotallySoldOut ? 'grayscale opacity-50' : 'grayscale group-hover:grayscale-0'} transition-all duration-700 ease-out cursor-pointer pointer-events-auto" onclick="openProductModal(${p.id})"><img src="${p.image}" loading="lazy" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none" /><div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"><div class="bg-red-600/90 text-black font-wide font-bold px-4 py-2 text-xs tracking-widest backdrop-blur-sm">VIEW ARTIFACT</div></div></div><div class="mt-4 flex flex-col items-start gap-1 p-2 pointer-events-none"><h3 class="font-serif text-lg leading-none text-theme-color group-hover:text-red-500 transition-colors">${p.name}</h3><div class="w-full flex justify-between items-center border-t border-theme-light pt-2 mt-1"><span class="font-mono text-[10px] text-theme-muted">${p.category || '///'}</span><span class="font-mono text-sm text-theme-muted">$${p.price}</span></div></div></div>`;
}

function renderGrid(products, container) {
    if(!container) return;
    container.innerHTML = products.map(p => getProductCardHTML(p)).join('');
    setTimeout(() => { initHoverTriggers(); initScrollReveal(); }, 50);
}

function generateSigils() {
    const container = document.getElementById('modal-sigils-container');
    if(!container) return;
    container.innerHTML = ''; 
    const createShape = () => {
        const types = ['circle', 'line', 'triangle'];
        const type = types[Math.floor(Math.random() * types.length)];
        const size = Math.random() * 300 + 200; 
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.width = `${size}px`;
        div.style.height = `${size}px`;
        div.style.pointerEvents = 'none';
        div.style.zIndex = '1';
        div.style.opacity = '0.4';
        div.style.mixBlendMode = 'difference';
        const isLeft = Math.random() > 0.5;
        if(isLeft) div.style.left = `-${size/2}px`; else div.style.right = `-${size/2}px`;
        div.style.top = `${Math.random() * 80 + 10}%`;
        div.style.transform = `translateY(-50%) rotate(${Math.random() * 360}deg)`;
        let svg = '';
        const stroke = '#DC2626';
        if(type === 'circle') svg = `<svg width="100%" height="100%" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="${stroke}" stroke-width="0.5" stroke-dasharray="5,5" /></svg>`;
        else if(type === 'line') svg = `<svg width="100%" height="100%" viewBox="0 0 100 100"><line x1="0" y1="50" x2="100" y2="50" stroke="${stroke}" stroke-width="1" /></svg>`;
        else svg = `<svg width="100%" height="100%" viewBox="0 0 100 100"><polygon points="50,5 95,95 5,95" fill="none" stroke="${stroke}" stroke-width="0.5" /></svg>`;
        div.innerHTML = svg;
        const anim = div.animate([{ transform: `translateY(-50%) rotate(0deg)` }, { transform: `translateY(-50%) rotate(360deg)` }], { duration: Math.random() * 20000 + 20000, iterations: Infinity, direction: Math.random() > 0.5 ? 'normal' : 'reverse' });
        return div;
    };
    for(let i=0; i<3; i++) {
        const shape = createShape();
        container.appendChild(shape);
    }
}

window.openProductModal = function(productId) {
    const product = productsData.find(p => p.id === productId);
    if(!product) return;
    currentProduct = product; currentSize = null; currentSlideIndex = 0;
    generateSigils();
    const nameEl = document.getElementById('modal-product-name');
    if(nameEl) { nameEl.innerText = product.name; nameEl.setAttribute('data-text', product.name); }
    const priceEl = document.getElementById('modal-product-price');
    if(priceEl) priceEl.innerText = `$${product.price}`;
    const catEl = document.getElementById('modal-category');
    if(catEl) catEl.innerText = product.category || 'UNCATEGORIZED';
    const refEl = document.getElementById('ref-id');
    if(refEl) refEl.innerText = product.id;
    const labelEl = document.getElementById('system-label');
    if(labelEl) labelEl.innerText = systemLabel;
    const stock = product.stock || {S:true, M:true, L:true, XL:true};
    const btn = document.getElementById('confirm-add-btn');
    const btnText = document.getElementById('btn-text');
    if(btnText) btnText.innerText = "[BIND TO SOUL]"; 
    if(btn) { btn.disabled = true; btn.classList.add('grayscale', 'cursor-not-allowed', 'opacity-50', 'bg-neutral-800'); btn.classList.remove('bg-red-600'); btn.onclick = addToCart; }
    document.querySelectorAll('.size-btn').forEach(btn => {
        const size = btn.innerText; const available = stock[size] === true;
        btn.classList.remove('bg-theme-color', 'text-theme-main', 'border-theme-color', 'disabled');
        btn.classList.add('border-theme');
        btn.style.backgroundColor = ''; btn.style.color = '';
        if(!available) { btn.classList.add('disabled'); btn.removeAttribute('onclick'); } 
        else { btn.setAttribute('onclick', `selectSize('${size}', this)`); }
    });
    const desc = product.description || "No description available in the archives.";
    const descEl = document.getElementById('modal-desc');
    if(descInterval) clearInterval(descInterval);
    let charIndex = 0; const speed = 3;
    descInterval = setInterval(() => {
        if(charIndex >= desc.length) { clearInterval(descInterval); descEl.innerText = desc; return; }
        let displayText = desc.slice(0, charIndex);
        const remaining = desc.length - charIndex; const randomCharsCount = Math.min(remaining, 20);
        for(let i = 0; i < randomCharsCount; i++) displayText += String.fromCharCode(65 + Math.floor(Math.random() * 26));
        descEl.innerText = displayText; charIndex += speed;
    }, 50);
    slideImages = [product.image, ...(product.gallery || [])].filter(img => img && img.trim() !== '');
    slideImages = [...new Set(slideImages)];
    const sliderTrack = document.getElementById('slider-track');
    if(sliderTrack) {
        sliderTrack.innerHTML = slideImages.map(img => `<div class="w-full h-full flex-shrink-0 flex items-center justify-center bg-black slider-slide"><img src="${img}" class="w-full h-full object-cover pointer-events-none select-none" draggable="false" style="max-height: 85vh;"></div>`).join('');
    }
    const galleryStrip = document.getElementById('modal-gallery-strip');
    if(galleryStrip) {
        galleryStrip.innerHTML = slideImages.map((img, idx) => `<div onclick="goToSlide(${idx})" class="gallery-thumb w-16 h-16 flex-shrink-0 border border-neutral-800 cursor-pointer hover:border-white transition-all overflow-hidden ${idx === 0 ? 'active' : ''}"><img src="${img}" class="w-full h-full object-cover pointer-events-none"></div>`).join('');
    }
    updateSliderPosition(); initSliderEvents();
    const formArea = document.getElementById('product-review-area'); 
    if(formArea) { formArea.style.maxHeight = '500px'; formArea.style.opacity = '1'; }
    if(!isMuted) playClickSound();
    document.body.classList.add('modal-open');
    const modal = document.getElementById('product-modal');
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }
}

window.addToCart = function() {
    if(currentProduct && currentSize) {
        if (!isMuted) playClickSound();
        if (!cart) cart = [];
        cart.push({ ...currentProduct, size: currentSize }); 
        saveCart(); closeProductModal(); toggleCart(true);
        showToast(`BOUND: ${currentProduct.name} [${currentSize}]`);
    } else showToast("SELECT A SIZE FIRST");
};

window.toggleReviewForm = function() {
    const formArea = document.getElementById('product-review-area');
    if (formArea.style.maxHeight === '0px' || formArea.style.maxHeight === '') { formArea.style.maxHeight = '500px'; formArea.style.opacity = '1'; } 
    else { formArea.style.maxHeight = '0px'; formArea.style.opacity = '0'; }
};

function initSliderEvents() {
    const track = document.getElementById('gallery-viewport'); 
    if(!track) return;
    const newTrack = track.cloneNode(true); track.parentNode.replaceChild(newTrack, track);
    const viewport = document.getElementById('gallery-viewport');
    document.getElementById('prev-slide').onclick = (e) => { e.stopPropagation(); prevSlide(); };
    document.getElementById('next-slide').onclick = (e) => { e.stopPropagation(); nextSlide(); };
    let isDown = false; let startX; let diff = 0;
    viewport.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX; diff = 0; viewport.classList.add('grabbing-cursor'); });
    viewport.addEventListener('mouseleave', () => { if(isDown) { isDown = false; viewport.classList.remove('grabbing-cursor'); }});
    viewport.addEventListener('mouseup', () => { if(!isDown) return; isDown = false; viewport.classList.remove('grabbing-cursor'); handleSwipe(diff); });
    viewport.addEventListener('mousemove', (e) => { if(!isDown) return; e.preventDefault(); diff = e.pageX - startX; });
    viewport.addEventListener('touchstart', (e) => { isDown = true; startX = e.touches[0].pageX; diff = 0; });
    viewport.addEventListener('touchmove', (e) => { if(!isDown) return; diff = e.touches[0].pageX - startX; });
    viewport.addEventListener('touchend', () => { if(!isDown) return; isDown = false; handleSwipe(diff); });
}
function handleSwipe(diff) { if (diff > 50) prevSlide(); else if (diff < -50) nextSlide(); }
function updateSliderPosition() {
    document.getElementById('slider-track').style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    document.querySelectorAll('.gallery-thumb').forEach((t, i) => i === currentSlideIndex ? t.classList.add('active') : t.classList.remove('active'));
    const prev = document.getElementById('prev-slide'), next = document.getElementById('next-slide');
    if(slideImages.length <= 1) { prev.classList.add('hidden'); next.classList.add('hidden'); return; }
    currentSlideIndex === 0 ? prev.classList.add('hidden') : prev.classList.remove('hidden');
    currentSlideIndex === slideImages.length - 1 ? next.classList.add('hidden') : next.classList.remove('hidden');
}
window.goToSlide = function(index) { currentSlideIndex = index; updateSliderPosition(); if(!isMuted) playClickSound(); }
function prevSlide() { if (currentSlideIndex > 0) { currentSlideIndex--; updateSliderPosition(); if(!isMuted) playClickSound(); } }
function nextSlide() { if (currentSlideIndex < slideImages.length - 1) { currentSlideIndex++; updateSliderPosition(); if(!isMuted) playClickSound(); } }

window.selectSize = function(size, btnElement) {
    currentSize = size; if(!isMuted) playClickSound();
    document.querySelectorAll('.size-btn').forEach(btn => {
        if(!btn.classList.contains('disabled')) { btn.style.backgroundColor = ''; btn.style.color = ''; btn.classList.remove('bg-theme-color', 'text-theme-main', 'border-theme-color'); btn.classList.add('border-theme'); }
    });
    btnElement.classList.remove('border-theme'); btnElement.style.backgroundColor = 'var(--text-color)'; btnElement.style.color = 'var(--bg-color)'; btnElement.style.borderColor = 'var(--text-color)';
    const addBtn = document.getElementById('confirm-add-btn');
    if(addBtn) { addBtn.disabled = false; addBtn.classList.remove('grayscale', 'cursor-not-allowed', 'opacity-50', 'bg-neutral-800'); addBtn.classList.add('bg-red-600'); }
}

window.closeProductModal = function() { 
    if (!isMuted) playClickSound();
    if(descInterval) { clearInterval(descInterval); descInterval = null; }
    document.body.classList.remove('modal-open');
    const modal = document.getElementById('product-modal');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
    }
    currentProduct = null;
    const sigils = document.getElementById('modal-sigils-container');
    if(sigils) sigils.innerHTML = '';
}

window.submitProductReview = async () => {
    if(!currentProduct) return;
    const name = document.getElementById('rev-name').value;
    const satisfied = document.getElementById('rev-satisfied').value;
    const disgruntled = document.getElementById('rev-disgruntled').value;
    if(!name || (!satisfied && !disgruntled)) return showToast("PLEASE FILL NAME AND AT LEAST ONE FIELD");
    try {
        await sb.from('reviews').insert([{ name, content_satisfied: satisfied || null, content_disgruntled: disgruntled || null, content: "Combined review", type: "mixed", product_id: currentProduct.id }]);
        showToast("TRANSMISSION RECEIVED");
        document.getElementById('product-review-area').style.maxHeight = '0px';
        document.getElementById('rev-name').value = ''; document.getElementById('rev-satisfied').value = ''; document.getElementById('rev-disgruntled').value = '';
        loadReviews(); 
    } catch (err) { console.error(err); showToast("ERROR"); }
};

async function loadReviews() {
    try {
        const { data: reviews } = await sb.from('reviews').select('*, products(name)').order('created_at', {ascending: false}).limit(20);
        const list = document.getElementById('reviews-list');
        if(!reviews || reviews.length === 0) { list.innerHTML = `<div class="font-mono text-xs text-theme-muted">NO TRANSMISSIONS YET.</div>`; return; }
        list.innerHTML = reviews.map(r => `<div class="review-card p-3 mb-2"><div class="flex justify-between items-baseline mb-2"><span class="font-bold text-sm text-theme-color">${r.name}</span><span class="text-[10px] font-mono text-theme-muted">${new Date(r.created_at).toLocaleDateString()}</span></div>${r.products ? `<div class="text-[9px] text-theme-muted mb-2">RE: ${r.products.name}</div>` : ''}${r.content_satisfied ? `<div class="mb-2 text-xs md:text-sm font-mono text-green-500 bg-green-900/10 p-2 border-l-2 border-green-800"><span class="opacity-50 text-[10px] block mb-1">/// SATISFIED:</span>${r.content_satisfied}</div>` : ''}${r.content_disgruntled ? `<div class="mb-1 text-xs md:text-sm font-mono text-red-500 bg-red-900/10 p-2 border-l-2 border-red-800"><span class="opacity-50 text-[10px] block mb-1">/// DISGRUNTLED:</span>${r.content_disgruntled}</div>` : ''}${!r.content_satisfied && !r.content_disgruntled ? `<p class="text-xs md:text-sm font-mono text-theme-muted leading-relaxed">${r.content}</p>` : ''}</div>`).join('');
    } catch(e) {}
}

function saveCart() { localStorage.setItem('sacrilege_cart', JSON.stringify(cart)); updateCartUI(); }
function updateCartUI() {
    const container = document.getElementById('cart-items');
    document.getElementById('cart-count-header').innerText = cart.length;
    document.getElementById('cart-badge').classList.toggle('hidden', cart.length === 0);
    document.getElementById('cart-total').innerText = cart.reduce((sum, item) => sum + item.price, 0);
    if (cart.length === 0) { container.innerHTML = '<div class="text-theme-muted font-mono text-xs text-center mt-10 animate-pulse">VOID IS EMPTY</div>'; return; }
    container.innerHTML = cart.map((item, index) => `<div class="flex gap-4 bg-theme-secondary p-2 border border-theme relative group animate-pulse-fast"><div class="relative w-16 h-20"><img src="${item.image}" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"><div class="absolute bottom-0 right-0 bg-white text-black text-[10px] font-bold px-1">${item.size}</div></div><div class="flex flex-col justify-between w-full"><div><div class="font-serif text-sm text-theme-color">${item.name}</div><div class="font-mono text-xs text-red-500">$${item.price}</div></div><button onclick="removeFromCart(${index})" class="text-[10px] font-mono text-theme-muted text-left hover:text-theme-color hover-trigger">REMOVE</button></div></div>`).join('');
}
window.removeFromCart = function(index) { cart.splice(index, 1); saveCart(); }
window.toggleCart = function(open) { const drawer = document.getElementById('cart-drawer'); open ? drawer.classList.add('open') : drawer.classList.remove('open'); }
window.openCheckout = function() {
    if(cart.length === 0) return;
    const modal = document.getElementById('checkout-modal'); modal.classList.remove('hidden');
    document.getElementById('checkout-total').innerText = '$' + cart.reduce((sum, item) => sum + item.price, 0);
    toggleCart(false);
}
document.getElementById('checkout-form').addEventListener('submit', (e) => {
    e.preventDefault(); const formData = new FormData(e.target);
    let message = `:: ORDER ::\nName: ${formData.get('fullname')}\nPhone: ${formData.get('phone')}\nAddr: ${formData.get('address')}, ${formData.get('city')}\n\nITEMS:\n`;
    cart.forEach(item => { message += `- ${item.name} (${item.size}) $${item.price}\n`; });
    message += `\nTOTAL: $${document.getElementById('cart-total').innerText}`;
    window.open(`https://wa.me/${MANAGER_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
});

function initMagneticButtons() {
    if (isTouch) return;
    document.querySelectorAll('.magnet-btn').forEach(btn => {
        const computed = window.getComputedStyle(btn); if(computed.position === 'static') btn.style.position = 'relative';
        const xTo = gsap.quickTo(btn, "x", {duration: 0.4, ease: "elastic.out(1, 0.3)"}), yTo = gsap.quickTo(btn, "y", {duration: 0.4, ease: "elastic.out(1, 0.3)"});
        btn.addEventListener('mousemove', (e) => { const rect = btn.getBoundingClientRect(); xTo((e.clientX - (rect.left + rect.width / 2)) * 0.4); yTo((e.clientY - (rect.top + rect.height / 2)) * 0.4); });
        btn.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    });
}

function initHoverTriggers() {
    if (isTouch) return;
    const addSound = (el) => {
        el.addEventListener('mouseenter', () => { document.body.classList.add('hovering'); playHoverSound(); });
        el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
    }
    document.querySelectorAll('.hover-trigger').forEach(el => {
        const clone = el.cloneNode(true); el.parentNode.replaceChild(clone, el); addSound(clone);
        if(clone.classList.contains('magnet-btn')) initMagneticButtons(); 
    });
    const logo = document.getElementById('brand-logo'); if(logo) addSound(logo);
}

function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('active'); });
    }, { threshold: 0.05, rootMargin: "200px" });
    document.querySelectorAll('.reveal-item').forEach(el => observer.observe(el));
    setTimeout(() => { document.querySelectorAll('.reveal-item:not(.active)').forEach(el => el.classList.add('active')); }, 500);
}
function showToast(text) { Toastify({ text, duration: 3000, gravity: "bottom", position: "right", style: { background: "#000", border: "1px solid #333", color: "white", boxShadow: "0 0 10px rgba(220,38,38,0.2)" } }).showToast(); }

window.toggleMenu = function() {
    const menu = document.getElementById('nav-menu');
    if(!menu) return;
    const isOpening = menu.classList.contains('hidden');
    menu.classList.toggle('active');
    menu.classList.toggle('hidden');
    if(isOpening) {
        document.body.classList.add('menu-open');
        if(!isMuted) playClickSound();
        document.addEventListener('keydown', handleMenuEscape);
    } else {
        document.body.classList.remove('menu-open');
        document.removeEventListener('keydown', handleMenuEscape);
    }
    lucide.createIcons();
};

function handleMenuEscape(e) {
    if(e.key === 'Escape') {
        toggleMenu();
    }
}

window.scrollToSection = function(sectionId) {
    const section = document.getElementById(sectionId) || document.querySelector(`#${sectionId}`);
    if(!section) {
        if(sectionId === 'hero') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if(sectionId === 'shop-container') {
            const shop = document.getElementById('shop-container');
            if(shop) shop.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if(sectionId === 'reviews-list') {
            const reviews = document.getElementById('reviews-list');
            if(reviews) reviews.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if(sectionId === 'footer') {
            const footer = document.querySelector('footer');
            if(footer) footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
    }
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
};