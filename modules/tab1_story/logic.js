import { AppState } from '../../core/state.js';
import { StoryState } from './state.js';
import { generateStoryAI } from './api.js';

export default function init() {
    const inputStory = document.getElementById('story-input');
    const toggleDialog = document.getElementById('toggle-dialog');
    const btnGenerate = document.getElementById('btn-generate');
    const btnClear = document.getElementById('btn-clear');
    
    const loadingOverlay = document.getElementById('loading-overlay');
    const emptyState = document.getElementById('empty-state');
    const contentArea = document.getElementById('content-area');
    const outputScript = document.getElementById('output-script'); // Container Naskah
    const outputChars = document.getElementById('output-chars');
    const statusBadge = document.getElementById('story-status');

    // 1. LOAD DATA
    const currentData = StoryState.get(); 
    if (currentData.rawIdea && inputStory) inputStory.value = currentData.rawIdea;
    if (toggleDialog) toggleDialog.checked = currentData.isDialogMode || false;

    // Render ulang kalau ada data
    if (currentData.segmentedStory && currentData.segmentedStory.length > 0) {
        renderResult(currentData.segmentedStory, currentData.characters);
    }

    // 2. GENERATE
    if (btnGenerate) {
        btnGenerate.addEventListener('click', async () => {
            const idea = inputStory ? inputStory.value.trim() : "";
            const useDialog = toggleDialog ? toggleDialog.checked : false;

            if (!idea) return alert("⚠️ Masukkan ide cerita dulu!");

            if(loadingOverlay) {
                loadingOverlay.classList.remove('hidden');
