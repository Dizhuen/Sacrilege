const SUPABASE_URL = 'https://cjfxgotljzolykpsuxej.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZnhnb3RsanpvbHlrcHN1eGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzI3OTUsImV4cCI6MjA4MzU0ODc5NX0.fZaXCZh9cAZUIq2A-69Xo0wzH_2zKU4k-4VSFRpRCb4';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentProducts = [];

async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        showApp();
        return true;
    }
    return false;
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-content').classList.remove('hidden');
    setTimeout(() => document.getElementById('app-content').classList.remove('opacity-0'), 50);
    lucide.createIcons();
    loadData();
    loadReviews();
    loadContacts();
}

function showAuthError(message) {
    const msgEl = document.getElementById('auth-message');
    if (msgEl) {
        msgEl.textContent = message;
        msgEl.classList.remove('hidden');
        setTimeout(() => msgEl.classList.add('hidden'), 5000);
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = `<div class="loader"></div> Authenticating...`;
    submitBtn.disabled = true;
    
    try {
        const { data, error } = await sb.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        showApp();
    } catch (err) {
        showAuthError(err.message || "Authentication failed");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

document.getElementById('magic-link-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('magic-email').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = `<div class="loader"></div> Sending...`;
    submitBtn.disabled = true;
    
    try {
        const { error } = await sb.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: window.location.origin + window.location.pathname
            }
        });
        
        if (error) throw error;
        showAuthError("Check your email for the magic link!");
    } catch (err) {
        showAuthError(err.message || "Failed to send magic link");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

document.getElementById('switch-to-magic-link').addEventListener('click', () => {
    document.getElementById('login-tab').classList.add('hidden');
    document.getElementById('magic-link-tab').classList.remove('hidden');
});

document.getElementById('switch-to-password').addEventListener('click', () => {
    document.getElementById('magic-link-tab').classList.add('hidden');
    document.getElementById('login-tab').classList.remove('hidden');
});

sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        showApp();
    } else if (event === 'SIGNED_OUT') {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
    }
});

checkAuth();

function switchTab(tab) {
    ['products', 'collections', 'reviews', 'contacts'].forEach(t => {
        document.getElementById(`view-${t}`).classList.add('hidden');
        document.getElementById(`tab-${t}`).classList.replace('tab-active', 'tab-inactive');
    });
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-${tab}`).classList.replace('tab-inactive', 'tab-active');
    if(tab === 'contacts') loadContacts();
}

// Gallery Management
let galleryImages = [];
let draggedIndex = null;

async function getImgbbApiKey() {
    try {
        const { data } = await sb.from('site_config').select('imgbb_api_key').single();
        return data?.imgbb_api_key || '';
    } catch(e) {
        console.warn("Failed to load imgbb API key");
        return '';
    }
}

async function uploadToImgbb(file) {
    const apiKey = await getImgbbApiKey();
    if(!apiKey) {
        throw new Error("ImgBB API key not configured. Please add it in Contacts tab.");
    }
    
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', file);
    
    const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    if(!result.success) {
        throw new Error(result.error?.message || "Upload failed");
    }
    
    return result.data.url;
}

function renderGallery() {
    const container = document.getElementById('gallery-list');
    if(!container) return;
    
    if(galleryImages.length === 0) {
        container.innerHTML = '<div class="col-span-2 text-center text-gray-500 text-xs py-8">No images. Add images to create gallery.</div>';
        return;
    }
    
    container.innerHTML = galleryImages.map((img, idx) => `
        <div class="gallery-item relative group cursor-move" draggable="true" data-index="${idx}">
            <div class="aspect-square rounded border-2 ${idx === 0 ? 'border-red-600' : 'border-[#3f3f46]'} overflow-hidden bg-black relative">
                <img src="${img}" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%23999%22 x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2214%22%3EError%3C/text%3E%3C/svg%3E'">
                ${idx === 0 ? '<div class="absolute top-1 left-1 bg-red-600 text-black text-[8px] font-bold px-1.5 py-0.5 rounded">MAIN</div>' : ''}
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onclick="removeGalleryImage(${idx})" class="p-2 bg-red-600 hover:bg-red-700 rounded text-white"><i data-lucide="trash-2" width="14"></i></button>
                    ${idx > 0 ? `<button onclick="setMainImage(${idx})" class="p-2 bg-white hover:bg-gray-200 rounded text-black"><i data-lucide="star" width="14"></i></button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    initGalleryDragDrop();
    lucide.createIcons();
}

function initGalleryDragDrop() {
    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedIndex = parseInt(e.currentTarget.dataset.index);
            e.currentTarget.style.opacity = '0.5';
        });
        item.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
            draggedIndex = null;
        });
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if(draggedIndex === null) return;
            const targetIndex = parseInt(e.currentTarget.dataset.index);
            if(draggedIndex !== targetIndex) {
                const draggedImg = galleryImages[draggedIndex];
                galleryImages.splice(draggedIndex, 1);
                galleryImages.splice(targetIndex, 0, draggedImg);
                renderGallery();
            }
        });
    });
}

window.removeGalleryImage = function(index) {
    galleryImages.splice(index, 1);
    renderGallery();
};

window.setMainImage = function(index) {
    const mainImg = galleryImages[0];
    galleryImages[0] = galleryImages[index];
    galleryImages[index] = mainImg;
    renderGallery();
};

document.getElementById('btn-add-image-file')?.addEventListener('click', () => {
    document.getElementById('gallery-file-input').click();
});

document.getElementById('btn-add-image-url')?.addEventListener('click', () => {
    const urlInput = document.getElementById('gallery-url-input');
    urlInput.classList.toggle('hidden');
    if(!urlInput.classList.contains('hidden')) {
        urlInput.focus();
    }
});

document.getElementById('gallery-file-input')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if(files.length === 0) return;
    
    const btn = document.getElementById('btn-add-image-file');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<div class="loader"></div> Uploading...`;
    btn.disabled = true;
    
    try {
        for(const file of files) {
            if(file.size > 10 * 1024 * 1024) {
                showToast(`File ${file.name} is too large (>10MB)`, "error");
                continue;
            }
            const url = await uploadToImgbb(file);
            galleryImages.push(url);
        }
        renderGallery();
        e.target.value = '';
    } catch(err) {
        showToast(err.message, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

document.getElementById('gallery-url-input')?.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
        const url = e.target.value.trim();
        if(url && (url.startsWith('http://') || url.startsWith('https://'))) {
            galleryImages.push(url);
            renderGallery();
            e.target.value = '';
            e.target.classList.add('hidden');
        } else {
            showToast("Invalid URL", "error");
        }
    }
});

// Initialize gallery on load
if(document.getElementById('gallery-list')) {
    renderGallery();
}

async function loadData() {
    try {
        // Collections
        const { data: cols } = await sb.from('site_collections').select('*').order('created_at', {ascending: true});
        
        // Populate select
        const select = document.getElementById('prod-col');
        if(select) {
            select.innerHTML = '<option value="">No Collection (Archive)</option>' + 
                (cols || []).map(c => `<option value="${c.id}">${c.title}</option>`).join('');
        }
        
        // Populate list
        const colList = document.getElementById('collections-list');
        if(colList) {
            colList.innerHTML = (cols || []).map(c => `
                <div class="flex justify-between items-center p-3 bg-black/30 rounded border border-[#3f3f46]">
                    <span>${c.title}</span>
                    <button onclick="deleteCollection(${c.id})" class="text-red-500 hover:text-white"><i data-lucide="trash-2" width="14"></i></button>
                </div>
            `).join('');
        }

        // Products
        const { data: products } = await sb.from('products').select('*').order('id', { ascending: false });
        currentProducts = products || [];
        renderTable(currentProducts);
        lucide.createIcons();
    } catch (e) {
        console.error("Load Data Error:", e);
    }
}

function renderTable(products) {
    const list = document.getElementById('product-list');
    if(!list) return;

    list.innerHTML = products.map(p => {
        let stock = {S:true, M:true, L:true, XL:true};
        try { stock = p.stock || stock; } catch(e) {}
        const stockDisplay = Object.keys(stock).map(k => `<span class="${stock[k] ? 'text-white' : 'text-neutral-600 line-through'}">${k}</span>`).join(' ');

        return `
        <tr class="hover:bg-white/5 transition-colors group">
            <td class="p-4 flex items-center gap-3"><div class="w-10 h-10 rounded bg-[#27272a] overflow-hidden border border-[#3f3f46]"><img src="${p.image}" class="w-full h-full object-cover"></div><div><div class="font-bold text-white">${p.name}</div><div class="text-xs text-gray-500 font-mono">${p.category || '///'}</div></div></td>
            <td class="p-4 font-mono text-[10px] space-x-1">${stockDisplay}</td>
            <td class="p-4 font-mono text-gray-300">$${p.price}</td>
            <td class="p-4 text-right">
                    <button onclick="editProduct(${p.id})" class="p-2 hover:bg-[#27272a] rounded text-gray-400 hover:text-white"><i data-lucide="pencil" width="16"></i></button>
                    <button onclick="deleteProduct(${p.id})" class="p-2 hover:bg-red-900/30 rounded text-red-600 hover:text-red-500"><i data-lucide="trash-2" width="16"></i></button>
            </td>
        </tr>`}).join('');
}

let isEditing = false;

window.editProduct = (id) => {
    const product = currentProducts.find(p => p.id === id);
    if(!product) return;
    isEditing = true;
    document.getElementById('form-title').innerHTML = `<i data-lucide="pencil" width="18"></i> Edit Product #${id}`;
    document.getElementById('submit-btn').innerText = "Update Artifact";
    document.getElementById('cancel-edit-btn').classList.remove('hidden');

    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-desc').value = product.description || '';
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-tag').value = product.tag;
    
    // Set collection
    const colSelect = document.getElementById('prod-col');
    if(colSelect) colSelect.value = product.collection_id || "";
    
    // Load gallery
    galleryImages = [];
    if(product.image) galleryImages.push(product.image);
    if(product.gallery && Array.isArray(product.gallery)) {
        galleryImages.push(...product.gallery.filter(img => img && img !== product.image));
    }
    renderGallery();
    
    let stock = {S:true, M:true, L:true, XL:true};
    try { stock = product.stock || stock; } catch(e){}
    document.getElementById('stock-s').checked = !!stock.S;
    document.getElementById('stock-m').checked = !!stock.M;
    document.getElementById('stock-l').checked = !!stock.L;
    document.getElementById('stock-xl').checked = !!stock.XL;

    lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.resetForm = () => {
    isEditing = false;
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('form-title').innerHTML = `<i data-lucide="plus-circle" width="18"></i> Add New Product`;
    document.getElementById('submit-btn').innerText = "Create Artifact";
    document.getElementById('cancel-edit-btn').classList.add('hidden');
    galleryImages = [];
    renderGallery();
    const urlInput = document.getElementById('gallery-url-input');
    if(urlInput) urlInput.classList.add('hidden');
    lucide.createIcons();
};

const prodForm = document.getElementById('product-form');
if(prodForm) {
    prodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<div class="loader"></div> Processing...`;
        try {
            const formData = new FormData(e.target);
            
            if (galleryImages.length === 0 && !isEditing) {
                throw new Error("Please add at least one image to gallery");
            }
            
            const mainImage = galleryImages[0] || null;
            const galleryArray = galleryImages.length > 1 ? galleryImages.slice(1) : [];
            
            const stockData = {
                S: document.getElementById('stock-s').checked,
                M: document.getElementById('stock-m').checked,
                L: document.getElementById('stock-l').checked,
                XL: document.getElementById('stock-xl').checked
            };
            
            const colId = document.getElementById('prod-col').value || null;

            const payload = {
                name: formData.get('name'), 
                description: formData.get('description'),
                price: formData.get('price'), 
                tag: formData.get('tag'), 
                image: mainImage,
                gallery: galleryArray,
                stock: stockData,
                collection_id: colId
            };

            let dbError;
            if(isEditing) {
                const id = document.getElementById('prod-id').value;
                if(!mainImage) delete payload.image;
                const { error } = await sb.from('products').update(payload).eq('id', id);
                dbError = error;
            } else {
                const { error } = await sb.from('products').insert([payload]);
                dbError = error;
            }

            if (dbError) throw dbError;
            showToast(isEditing ? "Artifact Updated" : "Artifact Created", "success");
            resetForm();
            loadData();
        } catch (err) { showToast(err.message, "error"); } finally { btn.innerHTML = originalText; }
    });
}

// Collection Form Submit
const colForm = document.getElementById('collection-form');
if(colForm) {
    colForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('col-title').value;
        if(!title) return;
        const { error } = await sb.from('site_collections').insert([{ title }]);
        if(!error) { showToast("Collection Created", "success"); e.target.reset(); loadData(); }
    });
}

window.deleteCollection = async (id) => {
    if(confirm('Delete collection? Products will be moved to Archive.')) {
        await sb.from('site_collections').delete().eq('id', id);
        loadData();
    }
};

async function loadReviews() {
    const { data: reviews } = await sb.from('reviews').select('*, products(name)').order('created_at', { ascending: false });
    const grid = document.getElementById('reviews-grid');
    if(!grid) return;
    if(!reviews || reviews.length === 0) { grid.innerHTML = '<div class="text-gray-500 col-span-3 text-center py-10">No reviews found.</div>'; return; }
    
    grid.innerHTML = reviews.map(r => {
        const productName = r.products ? r.products.name : 'Unknown Artifact';
        return `
        <div class="bg-[#27272a]/20 border border-[#3f3f46] p-4 rounded-lg flex flex-col gap-2 relative group">
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-xs font-mono text-gray-500">${new Date(r.created_at).toLocaleDateString()}</span>
                    <h4 class="font-bold text-white text-sm">${r.name}</h4>
                    <div class="text-[10px] text-red-400 font-mono mt-1">RE: ${productName}</div>
                </div>
            </div>
            ${r.content_satisfied ? `<div class="mt-2 text-xs font-mono text-green-500 bg-green-900/10 p-2 rounded border border-green-900/30"><strong>+</strong> ${r.content_satisfied}</div>` : ''}
            ${r.content_disgruntled ? `<div class="mt-2 text-xs font-mono text-red-500 bg-red-900/10 p-2 rounded border border-red-900/30"><strong>-</strong> ${r.content_disgruntled}</div>` : ''}
            
            <button onclick="deleteReview(${r.id})" class="absolute top-2 right-2 p-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><i data-lucide="trash-2" width="14"></i></button>
        </div>`}).join('');
    lucide.createIcons();
}

window.deleteReview = async (id) => {
    if(confirm('Delete review?')) {
        await sb.from('reviews').delete().eq('id', id);
        loadReviews();
        showToast("Review Deleted", "success");
    }
};

window.deleteProduct = async (id) => { if(confirm('Delete artifact?')) { await sb.from('products').delete().eq('id', id); loadData(); } };

async function loadContacts() {
    try {
        const { data, error } = await sb.from('site_config').select('*').single();
        if(error && error.code !== 'PGRST116') { console.warn("Contacts load failed:", error); return; }
        if(data) {
            const waInput = document.getElementById('contact-whatsapp-input');
            if(waInput) waInput.value = data.contact_whatsapp || data.contact_telegram || '';
            const tgInput = document.getElementById('contact-telegram-input');
            if(tgInput) tgInput.value = data.contact_telegram || '';
            const emInput = document.getElementById('contact-email-input');
            if(emInput) emInput.value = data.contact_email || '';
            const imgbbInput = document.getElementById('imgbb-api-key-input');
            if(imgbbInput) imgbbInput.value = data.imgbb_api_key || '';
        }
    } catch(e) { console.warn("Contacts load failed:", e); }
}

const contactsForm = document.getElementById('contacts-form');
if(contactsForm) {
    contactsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = contactsForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<div class="loader"></div> Saving...`;
        try {
            const whatsapp = document.getElementById('contact-whatsapp-input').value.trim();
            const telegram = document.getElementById('contact-telegram-input').value.trim();
            const email = document.getElementById('contact-email-input').value.trim();
            const imgbbKey = document.getElementById('imgbb-api-key-input').value.trim();
            const { data: existing, error: fetchError } = await sb.from('site_config').select('*').single();
            const payload = {};
            if(whatsapp) payload.contact_whatsapp = whatsapp;
            else payload.contact_whatsapp = null;
            if(telegram) payload.contact_telegram = telegram;
            else payload.contact_telegram = null;
            if(email) payload.contact_email = email;
            else payload.contact_email = null;
            if(imgbbKey) payload.imgbb_api_key = imgbbKey;
            else payload.imgbb_api_key = null;
            if(existing && !fetchError) {
                const { error: updateError } = await sb.from('site_config').update(payload).eq('id', existing.id);
                if(updateError) throw updateError;
            } else {
                const { error: insertError } = await sb.from('site_config').insert([payload]);
                if(insertError) throw insertError;
            }
            showToast("Contacts Saved", "success");
        } catch(err) { showToast(err.message, "error"); } finally { btn.innerHTML = originalText; }
    });
}

async function logout() {
    await sb.auth.signOut();
    window.location.reload();
}

function showToast(text, type) { let bg = type === "success" ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)"; Toastify({ text, duration: 3000, gravity: "top", position: "right", style: { background: bg, borderRadius: "8px" } }).showToast(); }
