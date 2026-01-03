// Router Modular
// Bertugas mengganti konten #app-content berdasarkan folder modules

export function initRouter() {
    const navButtons = document.querySelectorAll('.tab-btn');
    const contentArea = document.getElementById('app-content');
    let currentStyleElement = null;

    // 1. Setup Click Listeners
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetModule = btn.getAttribute('data-target');
            
            // Update UI Tombol
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Load Module
            loadModule(targetModule);
        });
    });

    // 2. Load Default Tab (Tab 1)
    loadModule('tab1_story');

    // --- CORE FUNCTION ---
    async function loadModule(folderName) {
        console.log(`Router: Loading module [${folderName}]...`);
        contentArea.innerHTML = `<div class="flex h-64 items-center justify-center text-gray-500"><i class="ph ph-spinner animate-spin text-2xl"></i></div>`;

        try {
            // A. LOAD HTML VIEW
            // Kita fetch file view.html dari folder module
            const response = await fetch(`modules/${folderName}/view.html`);
            if (!response.ok) throw new Error(`View not found for ${folderName}`);
            const html = await response.text();
            
            // B. INJECT HTML
            contentArea.innerHTML = html;

            // C. HANDLE CSS (ISOLATION)
            // Hapus CSS module sebelumnya biar gak bentrok
            if (currentStyleElement) {
                document.head.removeChild(currentStyleElement);
                currentStyleElement = null;
            }
            // Pasang CSS module baru
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = `modules/${folderName}/style.css`;
            document.head.appendChild(cssLink);
            currentStyleElement = cssLink;

            // D. LOAD & RUN JS LOGIC
            // Kita pakai dynamic import. Pastikan setiap logic.js punya export default function init()
            // Timestamp dipakai biar browser gak cache file JS saat kita lagi development
            const modulePath = `../modules/${folderName}/logic.js?t=${new Date().getTime()}`;
            const moduleLogic = await import(modulePath);
            
            if (moduleLogic.default) {
                moduleLogic.default(); // Jalankan fungsi init() di module tersebut
            } else {
                console.warn(`Router: No default export (init function) found in ${folderName}/logic.js`);
            }

        } catch (error) {
            console.error("Router Error:", error);
            contentArea.innerHTML = `
                <div class="p-8 text-center text-red-400 border border-red-500/30 rounded-xl bg-red-500/10">
                    <h3 class="font-bold text-lg mb-2">Gagal Memuat Modul</h3>
                    <p class="text-sm font-mono">${error.message}</p>
                    <p class="text-xs mt-4 text-gray-500">Pastikan folder 'modules/${folderName}' dan filenya (view.html, logic.js, style.css) sudah dibuat.</p>
                </div>
            `;
        }
    }
}
