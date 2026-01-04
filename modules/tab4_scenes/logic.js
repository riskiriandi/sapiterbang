import { AppState } from '../../core/state.js';
import { SceneState } from './state.js';
import { generateShotImage, analyzeContinuity, uploadToImgBB } from './api.js'; // Pastikan api.js ada uploadToImgBB

export default function init() {
    const scriptDisplay = document.getElementById('script-display');
    const scenesContainer = document.getElementById('scenes-container');
    const btnAddScene = document.getElementById('btn-add-scene');

    // 1. LOAD NASKAH DARI TAB 1
    const storyData = AppState.story;
    if (storyData && storyData.script) {
        scriptDisplay.innerText = storyData.script;
    } else {
        scriptDisplay.innerHTML = `<span class="text-red-400">Naskah kosong. Generate di Tab 1 dulu.</span>`;
    }

    // 2. LOAD SCENES DARI STATE (Kalau ada save-an)
    renderScenes();

    // 3. EVENT: TAMBAH SCENE BARU
    btnAddScene.addEventListener('click', () => {
        const newScene = {
            id: Date.now(), // ID Unik pake waktu
            location: "Describe location here...",
            shots: [] // Belum ada shot
        };
        
        // Update State
        const currentScenes = SceneState.get().scenes || [];
        currentScenes.push(newScene);
        SceneState.update({ scenes: currentScenes });
        
        renderScenes();
    });

    // === CORE RENDER FUNCTION ===
    function renderScenes() {
        const scenes = SceneState.get().scenes || [];
        scenesContainer.innerHTML = "";

        scenes.forEach((scene, sceneIndex) => {
            // Bikin Kotak Scene
            const sceneEl = document.createElement('div');
            sceneEl.className = "bg-white/5 border border-white/10 rounded-xl p-4 relative";
            
            sceneEl.innerHTML = `
                <!-- SCENE HEADER -->
                <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <div class="flex items-center gap-2 w-full mr-4">
                        <span class="text-accent font-bold text-xs uppercase">SCENE ${sceneIndex + 1}</span>
                        <input type="text" class="bg-transparent border-none text-white font-bold text-sm w-full focus:outline-none focus:ring-1 focus:ring-accent rounded px-2" 
                            value="${scene.location}" id="loc-${scene.id}" placeholder="Ketik Lokasi Utama (Misal: Dapur Luas)...">
                    </div>
                    <button class="text-red-500 hover:text-red-400" onclick="deleteScene(${sceneIndex})"><i class="ph ph-trash"></i></button>
                </div>

                <!-- SHOTS CONTAINER -->
                <div class="grid grid-cols-1 gap-6" id="shots-list-${scene.id}">
                    <!-- Shots bakal render disini -->
                </div>

                <!-- ADD SHOT BUTTON -->
                <button class="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-accent hover:bg-accent/10 transition-all text-xs font-bold flex items-center justify-center gap-2" id="btn-add-shot-${scene.id}">
                    <i class="ph ph-plus-circle"></i> Add Shot / Frame
                </button>
            `;

            scenesContainer.appendChild(sceneEl);

            // Listener: Update Lokasi Scene
            sceneEl.querySelector(`#loc-${scene.id}`).addEventListener('change', (e) => {
                scenes[sceneIndex].location = e.target.value;
                SceneState.update({ scenes });
            });

            // Listener: Add Shot
            sceneEl.querySelector(`#btn-add-shot-${scene.id}`).addEventListener('click', () => {
                const newShot = {
                    id: Date.now(),
                    visualPrompt: "", // Prompt Gambar
                    actionPrompt: "", // Prompt Video/Gerakan
                    imgUrl: null,     // Hasil Generate
                    refImage: null    // Screenshot Uploadan User
                };
                scene.shots.push(newShot);
                SceneState.update({ scenes });
                renderShots(scene, sceneIndex);
            });

            // Render Shots di dalam Scene ini
            renderShots(scene, sceneIndex);
        });
    }

    function renderShots(scene, sceneIndex) {
        const shotsContainer = document.getElementById(`shots-list-${scene.id}`);
        shotsContainer.innerHTML = "";

        scene.shots.forEach((shot, shotIndex) => {
            const shotEl = document.createElement('div');
            shotEl.className = "flex flex-col md:flex-row gap-4 bg-black/30 p-3 rounded-lg border border-white/5";

            shotEl.innerHTML = `
                <!-- KOLOM KIRI: PREVIEW GAMBAR (DROP ZONE) -->
                <div class="w-full md:w-1/3 relative group">
                    <div class="aspect-video bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer relative" id="drop-zone-${shot.id}">
                        ${shot.imgUrl 
                            ? `<img src="${shot.imgUrl}" class="w-full h-full object-cover">` 
                            : `<div class="text-center p-4 text-gray-600">
                                 <i class="ph ph-upload-simple text-2xl mb-1"></i>
                                 <p class="text-[10px]">Drop Screenshot / Generate</p>
                               </div>`
                        }
                        
                        <!-- Input File Tersembunyi -->
                        <input type="file" id="file-${shot.id}" class="hidden" accept="image/*">
                        
                        <!-- Loading Overlay -->
                        <div id="loading-${shot.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-10">
                            <i class="ph ph-spinner animate-spin text-accent text-2xl"></i>
                            <p class="text-[9px] text-white mt-1" id="status-${shot.id}">Processing...</p>
                        </div>
                    </div>
                    
                    <!-- Tombol Download / View -->
                    ${shot.imgUrl ? `<div class="absolute top-2 right-2 flex gap-1"><a href="${shot.imgUrl}" target="_blank" class="bg-black/50 p-1 rounded text-white text-xs hover:bg-accent"><i class="ph ph-eye"></i></a></div>` : ''}
                </div>

                <!-- KOLOM KANAN: PROMPTING -->
                <div class="w-full md:w-2/3 flex flex-col gap-2">
                    <div class="flex justify-between">
                        <span class="text-[10px] font-bold text-gray-500">SHOT #${shotIndex + 1}</span>
                        <button class="text-red-500 text-[10px] hover:text-white" id="del-shot-${shot.id}">Hapus</button>
                    </div>

                    <!-- Visual Prompt (Buat Gambar) -->
                    <div>
                        <label class="text-[9px] text-accent font-bold uppercase">Visual Prompt (Image)</label>
                        <textarea id="vis-prompt-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-16 focus:border-accent outline-none resize-none" placeholder="Deskripsi visual (Posisi, lighting, background)...">${shot.visualPrompt}</textarea>
                    </div>

                    <!-- Action Prompt (Buat Video Nanti) -->
                    <div>
                        <label class="text-[9px] text-green-400 font-bold uppercase">Motion Prompt (Video Action)</label>
                        <textarea id="act-prompt-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-12 focus:border-green-500 outline-none resize-none" placeholder="Deskripsi gerakan (Menoleh, berjalan, kamera pan)...">${shot.actionPrompt}</textarea>
                    </div>

                    <!-- Generate Button -->
                    <button id="btn-gen-${shot.id}" class="btn-pro btn-pro-primary text-xs py-2 justify-center mt-auto">
                        <i class="ph ph-lightning"></i> Generate Image
                    </button>
                </div>
            `;

            shotsContainer.appendChild(shotEl);

            // === EVENT LISTENERS PER SHOT ===

            // 1. Update Text Realtime
            const visInput = document.getElementById(`vis-prompt-${shot.id}`);
            const actInput = document.getElementById(`act-prompt-${shot.id}`);
            
            [visInput, actInput].forEach(input => {
                input.addEventListener('change', () => {
                    shot.visualPrompt = visInput.value;
                    shot.actionPrompt = actInput.value;
                    SceneState.update(); // Auto Save
                });
            });

            // 2. Handle Delete Shot
            document.getElementById(`del-shot-${shot.id}`).addEventListener('click', () => {
                if(confirm("Hapus shot ini?")) {
                    scene.shots.splice(shotIndex, 1);
                    SceneState.update();
                    renderScenes(); // Re-render semua
                }
            });

            // 3. HANDLE DROP SCREENSHOT (FITUR UTAMA)
            const dropZone = document.getElementById(`drop-zone-${shot.id}`);
            const fileInput = document.getElementById(`file-${shot.id}`);
            
            dropZone.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                handleScreenshotUpload(file, shot, scene.location);
            });

            // Drag & Drop Support
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-accent'); });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-accent'));
            dropZone.addEventListener('drop', async (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-accent');
                const file = e.dataTransfer.files[0];
                if (file) handleScreenshotUpload(file, shot, scene.location);
            });

            // 4. GENERATE IMAGE BUTTON
            const btnGen = document.getElementById(`btn-gen-${shot.id}`);
            btnGen.addEventListener('click', async () => {
                await runGenerateImage(shot);
            });
        });
    }

    // === LOGIC: UPLOAD SCREENSHOT & VISION AI ===
    async function handleScreenshotUpload(file, shot, locationContext) {
        const loading = document.getElementById(`loading-${shot.id}`);
        const status = document.getElementById(`status-${shot.id}`);
        const visInput = document.getElementById(`vis-prompt-${shot.id}`);
        const actInput = document.getElementById(`act-prompt-${shot.id}`);

        loading.classList.remove('hidden');
        loading.classList.add('flex');
        status.innerText = "Uploading Screenshot...";

        try {
            // 1. Upload ke ImgBB
            const uploadRes = await uploadToImgBB(file, `shot_ref_${shot.id}`);
            shot.refImage = uploadRes.url; // Simpan URL Screenshot
            
            // Tampilkan Preview Screenshot
            const dropZone = document.getElementById(`drop-zone-${shot.id}`);
            dropZone.innerHTML = `
                <img src="${shot.refImage}" class="w-full h-full object-cover opacity-50">
                <div class="absolute inset-0 flex items-center justify-center"><span class="bg-black/70 text-white text-[10px] px-2 py-1 rounded">Reference Set</span></div>
                <div id="loading-${shot.id}" class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10"><i class="ph ph-spinner animate-spin text-accent text-2xl"></i><p class="text-[9px] text-white mt-1" id="status-${shot.id}">Analyzing...</p></div>
            `;
            // Re-select loading element karena DOM berubah
            const newLoading = document.getElementById(`loading-${shot.id}`);
            const newStatus = document.getElementById(`status-${shot.id}`);

            // 2. Vision Analysis (Analisa Kontinuitas)
            newStatus.innerText = "AI Analyzing Pose...";
            
            // Kita panggil fungsi Vision di API (Perlu update api.js dikit buat ini)
            // Atau kita pake logic simple: "Same character, same background"
            
            // Simulasi Vision Response (Atau panggil API beneran kalau api.js udah support)
            // Disini gw bikin logic simple dulu:
            const autoPrompt = `(Continuity). Same scene as reference image. ${locationContext}. Character in same position/outfit.`;
            
            visInput.value = autoPrompt;
            shot.visualPrompt = autoPrompt;
            
            // Auto isi action prompt (kosongin biar user isi)
            actInput.placeholder = "AI: Screenshot terdeteksi. Tulis gerakan selanjutnya...";
            
            SceneState.update();

        } catch (error) {
            alert("Error Upload/Vision: " + error.message);
        } finally {
            // Hide loading
            const finalLoading = document.getElementById(`loading-${shot.id}`);
            if(finalLoading) finalLoading.classList.add('hidden');
        }
    }

    // === LOGIC: GENERATE IMAGE ===
    async function runGenerateImage(shot) {
        const loading = document.getElementById(`loading-${shot.id}`);
        const status = document.getElementById(`status-${shot.id}`);
        const dropZone = document.getElementById(`drop-zone-${shot.id}`);

        if (!shot.visualPrompt) return alert("Isi Visual Prompt dulu!");

        loading.classList.remove('hidden');
        loading.classList.add('flex');
        status.innerText = "Painting...";

        try {
            // Panggil API Generate (Support Img2Img kalau shot.refImage ada)
            // Kita pake model 'seedream-pro' default
            const imageBlob = await generateShotImage(shot.visualPrompt, shot.refImage, "seedream-pro");

            status.innerText = "Uploading Result...";
            const uploadRes = await uploadToImgBB(imageBlob, `shot_final_${shot.id}`);

            // Update Shot Data
            shot.imgUrl = uploadRes.url;
            SceneState.update();

            // Update Tampilan
            dropZone.innerHTML = `
                <img src="${shot.imgUrl}" class="w-full h-full object-cover">
                <input type="file" id="file-${shot.id}" class="hidden" accept="image/*">
                <div id="loading-${shot.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-10"><i class="ph ph-spinner animate-spin text-accent text-2xl"></i><p class="text-[9px] text-white mt-1" id="status-${shot.id}">Processing...</p></div>
            `;
            
            // Re-attach event listener buat drop zone (karena HTML ditimpa)
            // (Opsional: idealnya pake event delegation biar gak ribet re-attach)

        } catch (error) {
            alert("Generate Error: " + error.message);
        } finally {
            const finalLoading = document.getElementById(`loading-${shot.id}`);
            if(finalLoading) finalLoading.classList.add('hidden');
            finalLoading.classList.remove('flex');
        }
    }

    // Expose delete function ke window biar bisa dipanggil onclick HTML string
    window.deleteScene = (index) => {
        if(confirm("Hapus Scene beserta isinya?")) {
            const scenes = SceneState.get().scenes;
            scenes.splice(index, 1);
            SceneState.update({ scenes });
            renderScenes();
        }
    };
}
