import { StyleState } from './state.js';
import { uploadToImgBB, analyzeStyleAI } from './api.js';

export default function init() {
    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const urlInput = document.getElementById('url-input');
    const btnLoadUrl = document.getElementById('btn-load-url');
    const imagePreview = document.getElementById('image-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadLoading = document.getElementById('upload-loading');
    
    const promptInput = document.getElementById('prompt-input');
    const btnAnalyze = document.getElementById('btn-analyze');
    const visionLoading = document.getElementById('vision-loading');
    const ratioButtons = document.querySelectorAll('.ratio-btn');
    const btnNext = document.getElementById('btn-next-tab');

    // 1. LOAD DATA (Kalau user balik dari tab lain)
    const savedData = StyleState.get();
    if (savedData.referenceUrl) showPreview(savedData.referenceUrl);
    if (savedData.masterPrompt) promptInput.value = savedData.masterPrompt;
    if (savedData.ratio) setActiveRatio(savedData.ratio);

    // 2. HANDLE FILE UPLOAD (ImgBB)
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // UI Loading
        uploadLoading.classList.remove('hidden');
        uploadLoading.classList.add('flex');

        try {
            // Upload ke ImgBB
            const url = await uploadToImgBB(file);
            
            // Simpan & Preview
            StyleState.update({ url: url });
            showPreview(url);

            // Auto Analyze (Opsional, enak buat UX)
            triggerAnalyze(url);

        } catch (error) {
            alert("Upload Gagal: " + error.message);
        } finally {
            uploadLoading.classList.add('hidden');
            uploadLoading.classList.remove('flex');
        }
    });

    // 3. HANDLE URL INPUT
    btnLoadUrl.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
            StyleState.update({ url: url });
            showPreview(url);
        }
    });

    // 4. HANDLE ANALYZE BUTTON
    btnAnalyze.addEventListener('click', () => {
        const currentUrl = StyleState.get().referenceUrl;
        if (!currentUrl) return alert("Upload gambar dulu bro!");
        triggerAnalyze(currentUrl);
    });

    // 5. HANDLE RATIO BUTTONS
    ratioButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const ratio = btn.getAttribute('data-ratio');
            setActiveRatio(ratio);
            StyleState.update({ ratio: ratio });
        });
    });

    // 6. HANDLE TEXT INPUT (Manual Edit)
    promptInput.addEventListener('input', (e) => {
        StyleState.update({ prompt: e.target.value });
    });

    // 7. NEXT TAB
    btnNext.addEventListener('click', () => {
        document.querySelector('button[data-target="tab3_chars"]').click();
    });

    // --- HELPERS ---

    async function triggerAnalyze(url) {
        visionLoading.classList.remove('hidden');
        visionLoading.classList.add('flex');
        btnAnalyze.disabled = true;

        try {
            const resultPrompt = await analyzeStyleAI(url);
            promptInput.value = resultPrompt;
            StyleState.update({ prompt: resultPrompt });
        } catch (error) {
            alert("Vision Error: " + error.message);
        } finally {
            visionLoading.classList.add('hidden');
            visionLoading.classList.remove('flex');
            btnAnalyze.disabled = false;
        }
    }

    function showPreview(url) {
        imagePreview.src = url;
        imagePreview.classList.remove('hidden');
        uploadPlaceholder.classList.add('opacity-0');
    }

    function setActiveRatio(ratio) {
        ratioButtons.forEach(btn => {
            if (btn.getAttribute('data-ratio') === ratio) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}
