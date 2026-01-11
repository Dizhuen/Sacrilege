const SUPABASE_URL = 'https://cjfxgotljzolykpsuxej.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZnhnb3RsanpvbHlrcHN1eGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzI3OTUsImV4cCI6MjA4MzU0ODc5NX0.fZaXCZh9cAZUIq2A-69Xo0wzH_2zKU4k-4VSFRpRCb4';
const ACCESS_CODE = "admin";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentProducts = [];

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if(document.getElementById('access-code').value === ACCESS_CODE) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        setTimeout(() => document.getElementById('app-content').classList.remove('opacity-0'), 50);
        lucide.createIcons();
        loadData();
        loadReviews();
    } else { showToast("Access Denied", "error"); }
});

function switchTab(tab) {
    ['products', 'collections', 'reviews'].forEach(t => {
        document.getElementById(`view-${t}`).classList.add('hidden');
        document.getElementById(`tab-${t}`).classList.replace('tab-active', 'tab-inactive');
    });
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-${tab}`).classList.replace('tab-inactive', 'tab-active');
}

const btnFile = document.getElementById('btn-mode-file'), btnUrl = document.getElementById('btn-mode-url');
const areaFile = document.getElementById('input-file-area'), areaUrl = document.getElementById('input-url');
let uploadMode = 'file';

if(btnFile && btnUrl) {
    btnFile.onclick = () => { uploadMode = 'file'; btnFile.className = "flex-1 text-xs py-2 bg-[#27272a] text-white rounded active-mode"; btnUrl.className = "flex-1 text-xs py-2 bg-transparent text-gray-500 border border-[#3f3f46] rounded"; areaFile.classList.remove('hidden'); areaUrl.classList.add('hidden'); };
    btnUrl.onclick = () => { uploadMode = 'url'; btnUrl.className = "flex-1 text-xs py-2 bg-[#27272a] text-white rounded"; btnFile.className = "flex-1 text-xs py-2 bg-transparent text-gray-500 border border-[#3f3f46] rounded"; areaUrl.classList.remove('hidden'); areaFile.classList.add('hidden'); };
}

const fileInput = document.getElementById('file-upload');
if(fileInput) {
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) { 
            if(file.size > 5 * 1024 * 1024) return showToast("File too large (>5MB)", "error");
            const reader = new FileReader(); 
            reader.onload = (e) => { document.getElementById('file-preview-img').src = e.target.result; document.getElementById('file-preview-img').classList.remove('hidden'); }; 
            reader.readAsDataURL(file); 
        }
    });
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
    
    document.getElementById('input-url').value = product.image;
    
    let stock = {S:true, M:true, L:true, XL:true};
    try { stock = product.stock || stock; } catch(e){}
    document.getElementById('stock-s').checked = !!stock.S;
    document.getElementById('stock-m').checked = !!stock.M;
    document.getElementById('stock-l').checked = !!stock.L;
    document.getElementById('stock-xl').checked = !!stock.XL;

    if(product.image) {
        document.getElementById('file-preview-img').src = product.image;
        document.getElementById('file-preview-img').classList.remove('hidden');
        uploadMode = 'url';
        btnUrl.click();
    }
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
    document.getElementById('file-preview-img').classList.add('hidden');
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
            let finalImageUrl = formData.get('image_url');
            
            if (uploadMode === 'file' && document.getElementById('file-upload').files.length > 0) {
                const file = document.getElementById('file-upload').files[0];
                const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
                const { error: uploadError } = await sb.storage.from('images').upload(fileName, file);
                if (uploadError) throw uploadError;
                const { data: urlData } = sb.storage.from('images').getPublicUrl(fileName);
                finalImageUrl = urlData.publicUrl;
            }
            
            if (!finalImageUrl && !isEditing) throw new Error("Image missing");
            
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
                image: finalImageUrl,
                stock: stockData,
                collection_id: colId
            };

            let dbError;
            if(isEditing) {
                const id = document.getElementById('prod-id').value;
                if(!finalImageUrl) delete payload.image;
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
function showToast(text, type) { let bg = type === "success" ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)"; Toastify({ text, duration: 3000, gravity: "top", position: "right", style: { background: bg, borderRadius: "8px" } }).showToast(); }