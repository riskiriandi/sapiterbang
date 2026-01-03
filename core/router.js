import { AppState } from './state.js';

export function initRouter() {
    const navButtons = document.querySelectorAll('.tab-btn');
    const contentArea = document.getElementById('app-content');
    let currentStyleElement = null;

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetModule = btn.getAttribute('data-target');
            
            // UPDATE UI NAVIGASI
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // LANGSUNG LOAD (Gak ada pencegahan lagi)
            loadModule(targetModule);
        });
    });

    // Default Load
    loadModule('tab1_story');

    async function loadModule(folderName) {
        // Tampilan Loading
        contentArea.innerHTML = `
            <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <i class="ph ph-spinner animate-spin text-4xl mb-4 text-accent"></i>
                <p class="font-mono text-xs uppercase tracking-widest animate-pulse">Loading ${folderName}...</p>
            </div>
        `;

        try {
            // 1. Fetch HTML
            const response = await fetch(`modules/${folderName}/view.html`);
            if (!response.ok) throw new Error("View not found");
            const html = await response.text();
            contentArea.innerHTML = html;

            // 2. Swap CSS
            if (currentStyleElement) {
                document.head.removeChild(currentStyleElement);
                currentStyleElement = null;
            }
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = `modules/${folderName}/style.css`;
            document.head.appendChild(cssLink);
            currentStyleElement = cssLink;

            // 3. Load Logic
            const timestamp = new Date().getTime();
            const moduleLogic = await import(`../modules/${folderName}/logic.js?t=${timestamp}`);
            if (moduleLogic.default) moduleLogic.default();

        } catch (error) {
            console.error(error);
            contentArea.innerHTML = `<div class="p-10 text-center text-red-500">Gagal memuat modul: ${error.message}</div>`;
        }
    }
                }
