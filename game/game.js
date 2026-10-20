const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const paletteContainer = document.getElementById('palette');

let activeColorCode = "1";
let isDrawing = false;
let isPanning = false;

// CAMERA TRANSFORM VECTORS
let zoom = 1.0;
let minZoom = 1.0; 
let panX = 0;
let panY = 0;
let startX = 0;
let startY = 0;

const cellRadius = 13;
const spacing = 30; 

const gridWidthPx = gameData.width * spacing;
const gridHeightPx = gameData.height * spacing;

// FEATURE 1: LOCAL STORAGE PROGRESS MANAGEMENT
let progressGrid = gameData.grid.map(row => row.map(() => false));

if (localStorage.getItem('diamondPaintingProgress')) {
    try {
        const savedProgress = JSON.parse(localStorage.getItem('diamondPaintingProgress'));
        if (savedProgress.length === gameData.height && savedProgress[0].length === gameData.width) {
            progressGrid = savedProgress;
        }
    } catch (e) {
        console.error("Progress save sync error:", e);
    }
}

function saveProgressToStorage() {
    localStorage.setItem('diamondPaintingProgress', JSON.stringify(progressGrid));
}

window.resetEntirePainting = function() {
    localStorage.removeItem('diamondPaintingProgress');
    progressGrid = gameData.grid.map(row => row.map(() => false));
    hasWon = false;
    
    const oldOverlay = document.getElementById('win-screen-overlay');
    if (oldOverlay) oldOverlay.remove();
    
    centerGrid();
    drawGame();
};

// FEATURE 2: PERFECT MATCHING CONTAINMENT CENTERING
function centerGrid() {
    // Calculates scaling bounds directly relative to the canvas internal resolution
    const scaleX = canvas.width / gridWidthPx;
    const scaleY = canvas.height / gridHeightPx;
    
    minZoom = Math.min(scaleX, scaleY) * 0.95; 
    
    if (zoom <= minZoom || zoom === 1.0) {
        zoom = minZoom;
        panX = (canvas.width - gridWidthPx * zoom) / 2;
        panY = (canvas.height - gridHeightPx * zoom) / 2;
    } else {
        // Enforce boundary safety frames relative to container boundaries
        const maxX = canvas.width - (gridWidthPx * zoom * 0.2);
        const minX = -(gridWidthPx * zoom * 0.8);
        const maxY = canvas.height - (gridHeightPx * zoom * 0.2);
        const minY = -(gridHeightPx * zoom * 0.8);
        
        if (panX > maxX) panX = maxX;
        if (panX < minX) panX = minX;
        if (panY > maxY) panY = maxY;
        if (panY < minY) panY = minY;
    }
}

Object.keys(gameData.palette).forEach(code => {
    const dot = document.createElement('div');
    dot.className = `color-dot ${code === activeColorCode ? 'active' : ''}`;
    dot.style.backgroundColor = gameData.palette[code];
    dot.innerText = code;
    dot.onclick = () => {
        document.querySelector('.color-dot.active')?.classList.remove('active');
        dot.classList.add('active');
        activeColorCode = code;
    };
    paletteContainer.appendChild(dot);
});

function resizeCanvas() {
    // Blocks execution if container box properties haven't fully rendered yet
    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;
    
    // Explicitly syncs the internal pixel resolution with the physical CSS dimensions
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    centerGrid();
    drawGame();
}

// PREMIUM AUTO-LAYOUT: Layout observer triggers calculations when elements render on screen
const layoutObserver = new ResizeObserver(() => {
    resizeCanvas();
});
layoutObserver.observe(canvas);

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    for (let r = 0; r < gameData.height; r++) {
        for (let c = 0; c < gameData.width; c++) {
            const targetColorCode = String(gameData.grid[r][c]);
            const posX = c * spacing + (spacing / 2);
            const posY = r * spacing + (spacing / 2);
            
            ctx.beginPath();
            ctx.arc(posX, posY, cellRadius, 0, Math.PI * 2);
            
            if (progressGrid[r][c]) {
                ctx.fillStyle = gameData.palette[targetColorCode];
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = "rgba(0,0,0,0.15)";
                ctx.stroke();
            } else {
                ctx.fillStyle = "#e8e5f2";
                ctx.fill();
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = "#d6d2e6";
                ctx.stroke();
                
                ctx.fillStyle = "#7a7693";
                ctx.font = "bold 11px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(targetColorCode, posX, posY);
            }
        }
    }
    ctx.restore();
    checkWinCondition();
}

function getGridCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const worldX = (screenX - panX) / zoom;
    const worldY = (screenY - panY) / zoom;
    return {
        c: Math.floor(worldX / spacing),
        r: Math.floor(worldY / spacing)
    };
}

function floodFillGems(startR, startC, targetColor) {
    let queue = [[startR, startC]];
    let count = 0;
    while (queue.length > 0 && count < 300) {
        let [r, c] = queue.shift();
        if (r < 0 || r >= gameData.height || c < 0 || c >= gameData.width) continue;
        if (progressGrid[r][c]) continue;
        if (String(gameData.grid[r][c]) !== targetColor) continue;
        
        progressGrid[r][c] = true;
        count++;
        queue.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
    }
}

function handlePaint(clientX, clientY) {
    const { r, c } = getGridCoords(clientX, clientY);
    if (r >= 0 && r < gameData.height && c >= 0 && c < gameData.width) {
        const requiredCode = String(gameData.grid[r][c]);
        if (requiredCode === activeColorCode && !progressGrid[r][c]) {
            floodFillGems(r, c, activeColorCode);
            saveProgressToStorage();
            drawGame();
        }
    }
}

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2 || e.shiftKey) {
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
    } else if (e.button === 0) {
        isDrawing = true;
        handlePaint(e.clientX, e.clientY);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        centerGrid();
        drawGame();
    } else if (isDrawing) {
        handlePaint(e.clientX, e.clientY);
    }
});

window.addEventListener('mouseup', () => { isDrawing = false; isPanning = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.12;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldX = (mouseX - panX) / zoom;
    const worldY = (mouseY - panY) / zoom;

    if (e.deltaY < 0) {
        zoom = Math.min(zoom * zoomFactor, 5.0);
    } else {
        zoom = Math.max(zoom / zoomFactor, minZoom);
    }
    
    panX = mouseX - worldX * zoom;
    panY = mouseY - worldY * zoom;
    
    centerGrid();
    drawGame();
}, { passive: false });

let touchStartDist = 0;
canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isDrawing = true;
        handlePaint(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
        isDrawing = false;
        isPanning = true;
        startX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - panX;
        startY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - panY;
        touchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDrawing) {
        handlePaint(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && isPanning) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        panX = midX - startX;
        panY = midY - startY;
        
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (touchStartDist > 0) {
            const factor = dist / touchStartDist;
            zoom = Math.min(Math.max(zoom * factor, minZoom), 5.0);
            touchStartDist = dist;
        }
        centerGrid();
        drawGame();
    }
}, { passive: false });

window.addEventListener('touchend', () => { isDrawing = false; isPanning = false; touchStartDist = 0; });

let hasWon = false;
function checkWinCondition() {
    if (hasWon) return;
    for (let r = 0; r < gameData.height; r++) {
        for (let c = 0; c < gameData.width; c++) {
            if (!progressGrid[r][c]) return;
        }
    }
    hasWon = true;
    triggerWinSequence();
}
function triggerWinSequence() {
    // Phase 1: Lock user input structures immediately
    isDrawing = false;
    isPanning = false;

    // Phase 2: Smooth Zoom Out Animation Loop
    // Animate the camera transformation matrix back to full screen fit layout
    let startZoom = zoom;
    let startPanX = panX;
    let startPanY = panY;

    // Calculate baseline center points
    const scaleX = canvas.width / gridWidthPx;
    const scaleY = canvas.height / gridHeightPx;
    let targetZoom = Math.min(scaleX, scaleY) * 0.95;
    let targetPanX = (canvas.width - gridWidthPx * targetZoom) / 2;
    let targetPanY = (canvas.height - gridHeightPx * targetZoom) / 2;

    let startTime = null;
    const duration = 1200; // 1.2 seconds smooth camera pan & zoom crawl

    function animateZoomOut(timestamp) {
        if (!startTime) startTime = timestamp;
        let progress = (timestamp - startTime) / duration;
        if (progress > 1) progress = 1;

        // Cubic Easing out equation curves
        let ease = 1 - Math.pow(1 - progress, 3);

        zoom = startZoom + (targetZoom - startZoom) * ease;
        panX = startPanX + (targetPanX - startPanX) * ease;
        panY = startPanY + (targetPanY - startPanY) * ease;

        drawGame();

        if (progress < 1) {
            requestAnimationFrame(animateZoomOut);
        } else {
            // Trigger Phase 3: Shimmer Effect Sweep across the Completed Diamonds Matrix
            triggerShimmerSweep();
        }
    }
    requestAnimationFrame(animateZoomOut);
}

// Phase 3: The Sparkle Shimmer Light Sweep Effect
function triggerShimmerSweep() {
    let startTime = null;
    const duration = 800; // 0.8 seconds high-speed specular lens flare wipe

    function animateShimmer(timestamp) {
        if (!startTime) startTime = timestamp;
        let progress = (timestamp - startTime) / duration;
        if (progress > 1) progress = 1;

        // Re-draw standard grid base
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        // Core map iteration loop rendering true diamond mosaic states
        for (let r = 0; r < gameData.height; r++) {
            for (let c = 0; c < gameData.width; c++) {
                const targetColorCode = String(gameData.grid[r][c]);
                const posX = c * spacing + (spacing / 2);
                const posY = r * spacing + (spacing / 2);
                const baseColor = gameData.palette[targetColorCode];

                ctx.beginPath();
                ctx.arc(posX, posY, cellRadius, 0, Math.PI * 2);
                
                let gradient = ctx.createRadialGradient(
                    posX - cellRadius*0.3, posY - cellRadius*0.3, cellRadius*0.1, 
                    posX, posY, cellRadius
                );
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.2, baseColor);
                gradient.addColorStop(1, darkenColor(baseColor, -40));
                ctx.fillStyle = gradient;
                ctx.fill();
            }
        }

        // DRAW THE SPARKLING DIAGONAL LIGHT BEAM SWEEP OVER THE CANVAS WINDOW
        // Maps a dynamic linear highlight axis using the progress variable parameters
        let sweepX = (gridWidthPx * 2) * progress - (gridWidthPx * 0.5);
        ctx.beginPath();
        ctx.moveTo(sweepX - 80, 0);
        ctx.lineTo(sweepX + 20, 0);
        ctx.lineTo(sweepX + 120, gridHeightPx);
        ctx.lineTo(sweepX + 20, gridHeightPx);
        ctx.closePath();

        let shimmerGradient = ctx.createLinearGradient(sweepX - 50, 0, sweepX + 50, 0);
        shimmerGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        shimmerGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.45)"); // Core glint spark beam
        shimmerGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = shimmerGradient;
        ctx.fill();

        ctx.restore();

        if (progress < 1) {
            requestAnimationFrame(animateShimmer);
        } else {
            // Trigger Phase 4: Final Screen Cross-fade Image Card Reveal Transitions!
            buildFinalRevealCard();
        }
    }
    requestAnimationFrame(animateShimmer);
}

// Phase 4: Fade in the Final High-Res Portrait Card Over the Centered Game Board
function buildFinalRevealCard() {
    const winOverlay = document.createElement('div');
    winOverlay.id = 'win-screen-overlay';
    winOverlay.style.position = 'fixed';
    winOverlay.style.top = '0'; winOverlay.style.left = '0';
    winOverlay.style.width = '100vw'; winOverlay.style.height = '100vh';
    winOverlay.style.backgroundColor = 'rgba(243, 240, 251, 0.98)'; // Relaxing warm cream background tint
    winOverlay.style.display = 'flex'; winOverlay.style.flexDirection = 'column';
    winOverlay.style.alignItems = 'center'; winOverlay.style.justifyContent = 'center';
    winOverlay.style.zIndex = '9999'; winOverlay.style.opacity = '0';
    winOverlay.style.transition = 'opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1)';
    winOverlay.style.padding = '24px';
    winOverlay.style.boxSizing = 'border-box';
    
    winOverlay.innerHTML = `
        <div style="text-align: center; max-width: 480px; font-family: 'Segoe UI', system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            
            <!-- THOUGHTFUL MESSAGE ON TOP -->
            <h1 style="color: #7a7693; font-size: 2rem; margin: 0 0 8px 0; font-weight: 800; letter-spacing: -0.5px;">Beautifully Completed!</h1>
            <p style="color: #6a6683; font-size: 1.05rem; line-height: 1.5; margin: 0 0 20px 0; font-weight: 600; font-style: italic; padding: 0 15px;">
                "Like a tiny angel resting on the clouds, a beautiful rose kept safe, 
                and a warm lighthouse casting light across the ocean... 
                May you always remember that the ones we love never truly leave us. 
                They are always watching over you from above, shining bright like the stars."
            </p>
            
            <!-- HIGH-RES REVEAL IMAGE IN THE MIDDLE WITH TRANSITION POP -->
            <img src="memorial_scene.png" style="max-width: 85%; max-height: 45vh; border-radius: 20px; box-shadow: 0 15px 35px rgba(142,138,167,0.25); border: 4px solid #fff; object-fit: contain; transform: scale(0.92); transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s;">
            
            <!-- I LOVE YOU ALWAYS TEXT AT THE BOTTOM -->
            <div style="color: #8e8aa7; font-size: 1.2rem; font-weight: 800; margin: 18px 0 22px 0; letter-spacing: 0.5px;">
                I love you always ❤️
            </div>
            
            <!-- REDO BUTTON -->
            <button onclick="resetEntirePainting()" style="background-color: #8bc34a; color: white; border: none; padding: 12px 28px; font-weight: bold; border-radius: 16px; cursor: pointer; box-shadow: 0 6px 15px rgba(139,195,74,0.3); font-size: 1rem; transition: transform 0.2s, background-color 0.2s;">
                🔄 Redo Painting
            </button>
        </div>
    `;
    
    document.body.appendChild(winOverlay);
    
    requestAnimationFrame(() => {
        winOverlay.style.opacity = '1';
        const img = winOverlay.querySelector('img');
        if (img) img.style.transform = 'scale(1)';
    });
}

// --- UTILITY MATH FUNCTION TO GENERATE DEEP FOR SHIMMER DIAMONDS ---
function darkenColor(hex, percent) {
    let num = parseInt(hex.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
}
