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

    // === 1. FITUR ANTI-AMNESIA (LOAD DATA LAMA) ===
    const savedData = StyleState.get();
    
    // A. Balikin Gambar
    if (savedData.referenceUrl) {
        showPreview(savedData.referenceUrl);
        urlInput.value = savedData.referenceUrl; // Isi juga input textnya
    }
    
    // B. Balikin Prompt
    if (savedData.masterPrompt) {
        promptInput.value = savedData.masterPrompt;
    }
    
    // C. Balikin Ratio Button
    if (savedData.ratio) {
        setActiveRatio(savedData.ratio);
    }

    // === EVENT LISTENERS (Sama kayak sebelumnya) ===
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadLoading.classList.remove('hidden');
        uploadLoading.classList.add('flex');

        try {
            const url = await uploadToImgBB(file);
            StyleState.update({ url: url });
            showPreview(url);
            // Opsional: Langsung analyze pas upload
            // triggerAnalyze(url); 
        } catch (error) {
            alert("Upload Gagal: " + error.message);
        } finally {
            uploadLoading.classList.add('hidden');
            uploadLoading.classList.remove('flex');
        }
    });

    btnLoadUrl.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
            StyleState.update({ url: url });
            showPreview(url);
        }
    });

    btnAnalyze.addEventListener('click', () => {
        const currentUrl = StyleState.get().referenceUrl;
        if (!currentUrl) return alert("Upload gambar dulu bro!");
        triggerAnalyze(currentUrl);
    });

    ratioButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const ratio = btn.getAttribute('data-ratio');
            setActiveRatio(ratio);
            StyleState.update({ ratio: ratio });
        });
    });

    promptInput.addEventListener('input', (e) => {
        StyleState.update({ prompt: e.target.value });
    });

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
