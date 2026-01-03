import { AppState } from './state.js';

/**
 * ROUTER MODULAR v2.0
 * Fitur:
 * - Dynamic HTML Fetching
 * - CSS Isolation (Cabut-Pasang Style)
 * - JS Dynamic Import
 * - Navigation Guard (Satpam Tab)
 */

export function initRouter() {
    const navButtons = document.querySelectorAll('.tab-btn');
    const contentArea = document.getElementById('app-content');
    
    // Variabel untuk melacak elemen style yang sedang aktif agar bisa dicabut
    let currentStyleElement = null;

    // Variabel untuk Toast Notification
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    let toastTimeout; // Untuk reset timer toast

    // --- HELPER: TAMPILKAN TOAST ERROR ---
    function showToast(message) {
        if (!toast || !toastMsg) return;

        toastMsg.innerText = message;
        
        // Munculkan (Hapus class hide)
        toast.classList.remove('translate-y-20', 'opacity-0');
        
        // Reset timer kalau diklik berkali-kali
        if (toastTimeout) clearTimeout(toastTimeout);

        // Sembunyikan lagi setelah 3 detik
        toastTimeout = setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    }

    // --- 1. EVENT LISTENER NAVIGASI ---
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetModule = btn.getAttribute('data-target');
            
            // A. CEK KEAMANAN (SATPAM TAB)
            // Kita tanya ke State: "Boleh gak masuk tab ini?"
            const isAllowed = AppState.canEnterTab(targetModule);
            
            if (!isAllowed) {
                // Tentukan pesan error yang spesifik
                let msg = "⚠️ Selesaikan tahap sebelumnya dulu!";
                
                if (targetModule === 'tab2_style') msg = "⚠️ Tulis Cerita dulu di Tab 1 (Story)!";
                if (targetModule === 'tab3_chars') msg = "⚠️ Tentukan Style Visual dulu di Tab 2!";
                if (targetModule === 'tab4_scenes') msg = "⚠️ Generate Karakter dulu di Tab 3!";
                if (targetModule === 'tab5_video') msg = "⚠️ Buat Storyboard dulu di Tab 4!";
                
                showToast(msg);
                
                // Efek getar pada tombol biar kerasa "Access Denied"
                btn.classList.add('animate-pulse');
                setTimeout(() => btn.classList.remove('animate-pulse'), 500);
                
                return; // STOP DISINI. Jangan lanjut load module.
            }

            // B. UPDATE UI NAVIGASI
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // C. JALANKAN PROSES PINDAH TAB
            loadModule(targetModule);
        });
    });

    // --- 2. LOAD DEFAULT TAB (Saat Web Pertama Dibuka) ---
    // Cek apakah ada save-an terakhir? Kalau ada, bisa logic redirect (opsional)
    // Untuk sekarang kita default ke Tab 1
    loadModule('tab1_story');


    // --- 3. CORE FUNCTION: LOAD MODULE ---
    async function loadModule(folderName) {
        console.log(`Router: 🔄 Switching to [${folderName}]...`);
        
        // Tampilkan Loading Spinner Keren
        contentArea.innerHTML = `
            <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-500 fade-in">
                <i class="ph ph-spinner animate-spin text-4xl mb-4 text-accent"></i>
                <p class="font-mono text-xs uppercase tracking-widest animate-pulse">Loading Module...</p>
            </div>
        `;

        try {
            // A. FETCH VIEW (HTML)
            const response = await fetch(`modules/${folderName}/view.html`);
            
            if (!response.ok) {
                throw new Error(`Gagal mengambil file view.html (Status: ${response.status})`);
            }
            
            const html = await response.text();
            
            // B. INJECT HTML KE MAIN CONTENT
            // Kita pakai requestAnimationFrame biar transisi lebih smooth
            requestAnimationFrame(() => {
                contentArea.innerHTML = html;
                contentArea.classList.remove('opacity-0');
            });

            // C. SWAP CSS (ISOLASI STYLE)
            // 1. Cabut CSS lama (kalau ada)
            if (currentStyleElement) {
                document.head.removeChild(currentStyleElement);
                currentStyleElement = null;
            }

            // 2. Pasang CSS baru
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = `modules/${folderName}/style.css`;
            document.head.appendChild(cssLink);
            currentStyleElement = cssLink;

            // D. LOAD & RUN LOGIC (JS)
            // Kita tambah timestamp (?t=...) biar browser gak nge-cache file JS saat development
            const timestamp = new Date().getTime(); 
            const modulePath = `../modules/${folderName}/logic.js?t=${timestamp}`;
            
            // Dynamic Import
            const moduleLogic = await import(modulePath);
            
            // Jalankan fungsi init() dari module tersebut
            if (moduleLogic.default) {
                console.log(`Router: ✅ Module [${folderName}] Ready.`);
                moduleLogic.default(); 
            } else {
                console.warn(`Router: ⚠️ Tidak ada 'export default function' di ${folderName}/logic.js`);
            }

        } catch (error) {
            console.error("Router Error:", error);
            
            // Tampilan Error yang enak dilihat user
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center p-8">
                    <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                        <i class="ph ph-warning text-3xl text-red-500"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2">Gagal Memuat Modul</h3>
                    <p class="text-gray-400 text-sm max-w-md mx-auto mb-6">${error.message}</p>
                    
                    <div class="bg-black/30 p-4 rounded-lg border border-white/10 text-left w-full max-w-lg">
                        <p class="text-[10px] text-gray-500 font-mono uppercase mb-2">DEBUG INFO:</p>
                        <ul class="text-xs text-red-300 font-mono space-y-1 list-disc pl-4">
                            <li>Target: modules/${folderName}/</li>
                            <li>Pastikan file <b>view.html</b>, <b>style.css</b>, <b>logic.js</b> ada.</li>
                            <li>Cek Console Log (F12) untuk detail error.</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    }
                             }
