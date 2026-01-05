import { AppState } from '../../core/state.js';
import { SceneState } from './state.js';
import { generateShotImage, uploadToImgBB, breakdownScriptAI } from './api.js';

export default function init() {
    const scriptDisplay = document.getElementById('script-display');
    const scenesContainer = document.getElementById('scenes-container');
    const btnAutoBreakdown = document.getElementById('btn-auto-breakdown');
    const btnAddScene = document.getElementById('btn-add-scene');
    const btnClear = document.getElementById('btn-clear-scenes');
    const emptyTimeline = document.getElementById('empty-timeline');

    // 1. LOAD DATA SKENARIO
    const storyData = AppState.story;
    if (storyData && storyData.finalScript && storyData.finalScript.length > 0) {
        scriptDisplay.innerHTML = storyData.finalScript.map(s => `
            <div class="mb-3 border-b border-white/5 pb-2">
                <div class="flex justify-between text-green-400 text-xs font-bold">
                    <span>${s.timestamp}</span>
                    <span>${s.location}</span>
                </div>
                <p class="text-gray-300 text-xs mt-1">${s.visual}</p>
            </div>
        `).join('');
        btnAutoBreakdown.disabled = false;
    } else {
        scriptDisplay.innerHTML = `<div class="text-center mt-10 text-red-400">Skenario Kosong.</div>`;
        btnAutoBreakdown.disabled = true;
    }

    renderScenes();

    // 2. TOMBOL-TOMBOL UTAMA
    btnClear.addEventListener('click', () => {
        if (confirm("Hapus semua timeline?")) {
            SceneState.update({ scenes: [], storySignature: "" });
            renderScenes();
        }
    });

    btnAutoBreakdown.addEventListener('click', async () => {
        if(SceneState.get().scenes.length > 0 && !confirm("Timpa data lama?")) return;

        btnAutoBreakdown.innerHTML = `<i class="ph ph-spinner animate-spin"></i> Analyzing...`;
        btnAutoBreakdown.disabled = true;

        try {
            const result = await breakdownScriptAI(storyData.finalScript);
            const newScenes = result.scenes.map((s, i) => ({
                id: Date.now() + i,
                location: s.location,
                shots: s.shots.map((sh, j) => ({
                    id: Date.now() + i + j + 100,
                    info: sh.shot_info,
                    visualPrompt: sh.visual_prompt,
                    actionPrompt: sh.video_prompt,
                    charsInShot: sh.characters_in_shot || [],
                    needsCrop: sh.needs_manual_crop || false, // Trigger Upload Manual
                    cropInstruction: sh.crop_instruction || "",
                    imgUrl: null,
                    refImage: null // Tempat Link ImgBB
                }))
            }));

            SceneState.update({ scenes: newScenes });
            renderScenes();
        } catch (error) {
            alert("Gagal: " + error.message);
        } finally {
            btnAutoBreakdown.innerHTML = `<i class="ph ph-film-slate text-lg"></i> AI Director Breakdown`;
            btnAutoBreakdown.disabled = false;
        }
    });

    btnAddScene.addEventListener('click', () => {
        const newScene = { id: Date.now(), location: "New Scene", shots: [] };
        const scenes = SceneState.get().scenes || [];
        scenes.push(newScene);
        SceneState.update({ scenes });
        renderScenes();
    });

    // === RENDER ENGINE ===
    function renderScenes() {
        const scenes = SceneState.get().scenes || [];
        scenesContainer.innerHTML = "";

        if (scenes.length === 0) {
            if(emptyTimeline) emptyTimeline.classList.remove('hidden');
            return;
        }
        if(emptyTimeline) emptyTimeline.classList.add('hidden');

        scenes.forEach((scene, sceneIndex) => {
            const sceneEl = document.createElement('div');
            sceneEl.className = "bg-white/5 border border-white/10 rounded-xl p-4 relative animate-fade-in";
            sceneEl.innerHTML = `
                <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <input type="text" class="bg-transparent border-none text-accent font-bold text-xs uppercase w-full focus:outline-none" value="${scene.location}" id="loc-${scene.id}">
                    <button class="text-red-500 hover:text-red-400" onclick="deleteScene(${sceneIndex})"><i class="ph ph-trash"></i></button>
                </div>
                <div class="grid grid-cols-1 gap-6" id="shots-list-${scene.id}"></div>
                <button class="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-gray-500 hover:text-white text-xs font-bold" id="btn-add-shot-${scene.id}">+ Add Shot</button>
            `;
            scenesContainer.appendChild(sceneEl);

            // Listener Scene
            sceneEl.querySelector(`#loc-${scene.id}`).addEventListener('change', (e) => {
                scene.location = e.target.value;
                SceneState.update();
            });
            sceneEl.querySelector(`#btn-add-shot-${scene.id}`).addEventListener('click', () => {
                scene.shots.push({ id: Date.now(), info: "Manual Shot", visualPrompt: "", actionPrompt: "", charsInShot: [], imgUrl: null, refImage: null });
                SceneState.update();
                renderScenes();
            });

            // RENDER SHOTS
            const shotsContainer = document.getElementById(`shots-list-${scene.id}`);
            scene.shots.forEach((shot, shotIndex) => {
                
                // LOGIKA TOMBOL:
                // 1. Jika butuh crop DAN belum ada link -> Tampilkan Upload Button
                // 2. Jika sudah ada link (refImage) -> Tampilkan Generate Button + Kotak Link
                
                const isWaitingForUpload = shot.needsCrop && !shot.refImage;
                
                let controlArea = "";
                
                if (isWaitingForUpload) {
                    // MODE: WAJIB UPLOAD DULU
                    controlArea = `
                        <div class="bg-yellow-500/10 border border-yellow-500/30 p-2 rounded text-center">
                            <p class="text-[10px] text-yellow-400 mb-2 font-bold">⚠️ ${shot.cropInstruction || "Upload Referensi Dulu!"}</p>
                            <button id="btn-upload-${shot.id}" class="w-full btn-pro bg-yellow-500 hover:bg-yellow-400 text-black text-xs py-2 justify-center">
                                <i class="ph ph-upload"></i> Upload Foto
                            </button>
                            <input type="file" id="file-manual-${shot.id}" class="hidden" accept="image/*">
                        </div>
                    `;
                } else {
                    // MODE: SIAP GENERATE
                    // Cek apakah ada link referensi (baik dari upload manual atau auto detect)
                    let refLinkDisplay = "";
                    if (shot.refImage) {
                        refLinkDisplay = `
                            <div class="mb-2">
                                <label class="text-[9px] text-green-400 font-bold">REFERENSI AKTIF (ImgBB):</label>
                                <input type="text" value="${shot.refImage}" readonly class="w-full bg-black/50 text-[9px] text-gray-400 p-1 rounded border border-green-500/30">
                            </div>
                        `;
                    }

                    controlArea = `
                        ${refLinkDisplay}
                        <button id="btn-gen-${shot.id}" class="w-full btn-pro btn-pro-primary text-xs py-2 justify-center">
                            <i class="ph ph-lightning"></i> Generate Image
                        </button>
                        <!-- Tombol ganti ref manual tetap ada -->
                        <button id="btn-reupload-${shot.id}" class="w-full mt-2 text-[10px] text-gray-500 hover:text-white border border-white/10 rounded py-1">
                            Ganti Referensi
                        </button>
                        <input type="file" id="file-reupload-${shot.id}" class="hidden" accept="image/*">
                    `;
                }

                const shotEl = document.createElement('div');
                shotEl.className = `flex flex-col md:flex-row gap-4 bg-black/30 p-3 rounded-lg border ${isWaitingForUpload ? 'border-yellow-500/50' : 'border-white/5'}`;

                shotEl.innerHTML = `
                    <!-- PREVIEW GAMBAR -->
                    <div class="w-full md:w-1/3 relative group">
                        <div class="aspect-video bg-black rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative">
                            ${shot.imgUrl 
                                ? `<img src="${shot.imgUrl}" class="w-full h-full object-cover">` 
                                : `<div class="text-center p-4 text-gray-600"><i class="ph ph-image text-3xl mb-1"></i><p class="text-[10px]">${isWaitingForUpload ? 'Menunggu Upload...' : 'Preview'}</p></div>`
                            }
                            <div id="loading-${shot.id}" class="absolute inset-0 bg-black/80 hidden flex-col items-center justify-center z-10">
                                <i class="ph ph-spinner animate-spin text-accent text-2xl"></i>
                            </div>
                        </div>
                        ${shot.imgUrl ? `<a href="${shot.imgUrl}" target="_blank" class="absolute top-2 right-2 bg-black/50 p-1 rounded text-white text-xs hover:bg-accent"><i class="ph ph-eye"></i></a>` : ''}
                    </div>

                    <!-- KONTROL -->
                    <div class="w-full md:w-2/3 flex flex-col gap-2">
                        <div class="flex justify-between">
                            <span class="text-[10px] font-bold text-yellow-400">${shot.info || "Shot " + (shotIndex+1)}</span>
                            <button class="text-red-500 text-[10px]" onclick="deleteShot(${sceneIndex}, ${shotIndex})">Hapus</button>
                        </div>
                        
                        <div>
                            <label class="text-[9px] text-gray-500 font-bold uppercase">Visual Prompt</label>
                            <textarea id="vis-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-14 focus:border-accent outline-none resize-none custom-scrollbar">${shot.visualPrompt}</textarea>
                        </div>
                        
                        <div>
                            <label class="text-[9px] text-green-400 font-bold uppercase">Motion Prompt</label>
                            <textarea id="act-${shot.id}" class="w-full bg-black/50 text-gray-300 text-[11px] p-2 rounded border border-white/10 h-10 focus:border-green-500 outline-none resize-none custom-scrollbar">${shot.actionPrompt}</textarea>
                        </div>

                        <!-- AREA TOMBOL DINAMIS -->
                        ${controlArea}
                    </div>
                `;
                shotsContainer.appendChild(shotEl);

                // === EVENT LISTENERS ===
                const visInput = document.getElementById(`vis-${shot.id}`);
                const actInput = document.getElementById(`act-${shot.id}`);

                [visInput, actInput].forEach(inp => {
                    inp.addEventListener('change', () => {
                        shot.visualPrompt = visInput.value;
                        shot.actionPrompt = actInput.value;
                        SceneState.update();
                    });
                });

                // HANDLER UPLOAD (Manual Crop / Re-Upload)
                const handleUpload = async (file) => {
                    const loading = document.getElementById(`loading-${shot.id}`);
                    loading.classList.remove('hidden');
                    loading.classList.add('flex');
                    try {
                        const upload = await uploadToImgBB(file, `ref_${shot.id}`);
                        shot.refImage = upload.url; // SIMPAN LINK DISINI
                        shot.imgUrl = upload.url;   // Tampilkan preview
                        SceneState.update();
                        renderScenes(); // Refresh UI biar tombol Generate muncul
                    } catch (e) { alert(e.message); } 
                    finally { loading.classList.add('hidden'); loading.classList.remove('flex'); }
                };

                if (isWaitingForUpload) {
                    const btnUpload = document.getElementById(`btn-upload-${shot.id}`);
                    const fileInput = document.getElementById(`file-manual-${shot.id}`);
                    btnUpload.addEventListener('click', () => fileInput.click());
                    fileInput.addEventListener('change', (e) => { if(e.target.files[0]) handleUpload(e.target.files[0]); });
                } else {
                    // Tombol Generate
                    const btnGen = document.getElementById(`btn-gen-${shot.id}`);
                    btnGen.addEventListener('click', async () => {
                        const loading = document.getElementById(`loading-${shot.id}`);
                        loading.classList.remove('hidden');
                        loading.classList.add('flex');
                        btnGen.disabled = true;
                        try {
                            // AMBIL LINK REFERENSI (Prioritas: Manual -> Auto)
                            let finalRefUrl = shot.refImage;
                            if (!finalRefUrl) {
                                // Fallback ke Auto Detect Karakter
                                const matchedUrls = [];
                                if (shot.charsInShot && shot.charsInShot.length > 0) {
                                    shot.charsInShot.forEach(charName => {
                                        const charData = AppState.chars.generatedChars.find(c => c.name.toLowerCase().includes(charName.toLowerCase()) || charName.toLowerCase().includes(c.name.toLowerCase()));
                                        if (charData && charData.imgbbUrl) matchedUrls.push(charData.imgbbUrl);
                                    });
                                }
                                if (matchedUrls.length > 0) finalRefUrl = matchedUrls.join(',');
                            }

                            const blob = await generateShotImage(visInput.value, finalRefUrl);
                            const upload = await uploadToImgBB(blob, `shot_${shot.id}`);
                            shot.imgUrl = upload.url;
                            SceneState.update();
                            renderScenes();
                        } catch (e) { alert(e.message); }
                        finally { loading.classList.add('hidden'); loading.classList.remove('flex'); btnGen.disabled = false; }
                    });

                    // Tombol Re-Upload (Ganti Referensi)
                    const btnRe = document.getElementById(`btn-reupload-${shot.id}`);
                    const fileRe = document.getElementById(`file-reupload-${shot.id}`);
                    btnRe.addEventListener('click', () => fileRe.click());
                    fileRe.addEventListener('change', (e) => { if(e.target.files[0]) handleUpload(e.target.files[0]); });
                }
            });
        });
    }

    // Helpers Global
    window.deleteScene = (idx) => { if(confirm("Hapus?")) { SceneState.get().scenes.splice(idx, 1); SceneState.update(); renderScenes(); }};
    window.deleteShot = (sIdx, shIdx) => { if(confirm("Hapus?")) { SceneState.get().scenes[sIdx].shots.splice(shIdx, 1); SceneState.update(); renderScenes(); }};
}
