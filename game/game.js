
/* ==========================================================
   COZY PAINTING STUDIO
   Memorial Diamond Painting — Complete Game Script
   ========================================================== */

(() => {
    "use strict";

    const canvas = document.getElementById("gameCanvas");
    const palette = document.getElementById("palette");
    const modeButton = document.getElementById("modeBtn");

    if (!canvas || !palette) {
        console.error("Missing gameCanvas or palette element.");
        return;
    }

    if (
        typeof gameData === "undefined" ||
        !Array.isArray(gameData.grid) ||
        !gameData.palette
    ) {
        console.error("Load level.js before game.js.");
        return;
    }

    const ctx = canvas.getContext("2d");

    const STORAGE_KEY = "diamondPaintingProgress";
    const SPACING = 30;
    const RADIUS = 12;
    const MAX_ZOOM = 5;
    const TOTAL = gameData.width * gameData.height;
    const GRID_W = gameData.width * SPACING;
    const GRID_H = gameData.height * SPACING;

    const colors = Object.keys(gameData.palette).sort(
        (a, b) => Number(a) - Number(b)
    );

    let progress = createEmptyProgress();
    let selectedColor = colors.includes("1") ? "1" : colors[0];
    let mode = "paint";

    let zoom = 1;
    let minZoom = 0.1;
    let panX = 0;
    let panY = 0;

    let viewWidth = 1;
    let viewHeight = 1;
    let canvasInitialized = false;

    let pointerDown = false;
    let previousX = 0;
    let previousY = 0;

    let touchDistance = 0;
    let lastTouchCenter = null;

    let winStarted = false;
    let animationRunning = false;
    let animationFrame = null;

    let status;
    let progressBar;
    let selectedLabel;

    /* ------------------------------------------------------
       STYLES
       ------------------------------------------------------ */

    function addStyles() {
        if (document.getElementById("cozy-game-styles")) return;

        const style = document.createElement("style");
        style.id = "cozy-game-styles";

        style.textContent = `
            #canvas-container {
                position: relative;
                width: min(90vw, 500px);
                height: min(60vh, 500px);
                margin: 0 auto;
                overflow: hidden;
                background-color: #fcdbd8;
                border-radius: 20px;
                padding: 12px;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 25px rgba(142, 138, 167, 0.15);
                touch-action: none;
            }

            #gameCanvas {
                display: block;
                width: 100%;
                height: 100%;
                touch-action: none;
                cursor: crosshair;
                background-color: transparent;
            }

            #palette-bar {
                box-sizing: border-box;
                width: min(90vw, 500px);
                background-color: #f7ebd9;
                border-radius: 24px;
                padding: 15px;
                margin: 30px auto 0;
                box-shadow: 0 8px 20px rgba(0,0,0,0.06);
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 12px;
                min-width: 0;
            }

            #modeBtn {
                flex: 0 0 auto;
                min-width: 112px;
                border: none;
                border-radius: 13px;
                padding: 11px 16px;
                color: white;
                background: #26a978;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 10px rgba(30,120,85,.18);
                transition: transform .15s ease, background .15s ease;
            }

            #modeBtn:hover {
                transform: translateY(-1px);
            }

            #modeBtn.move-mode {
                background: #ff9800;
            }

            #palette {
                display: flex;
                flex: 1 1 auto;
                min-width: 0;
                gap: 10px;
                overflow-x: auto;
                align-items: center;
                padding: 8px 4px;
                scrollbar-width: thin;
                scrollbar-color: #c7b5ec transparent;
                -webkit-overflow-scrolling: touch;
            }

            #palette::-webkit-scrollbar {
                display: none;
            }

            #palette .color-dot {
                position: relative;
                display: inline-flex;
                flex: 0 0 38px;
                width: 38px;
                height: 38px;
                padding: 0;
                align-items: center;
                justify-content: center;
                border: 2px solid rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                font-weight: 700;
                font-size: 0.85rem;
                color: #555;
                cursor: pointer;
                box-shadow: 0 4px 6px rgba(0,0,0,0.06);
                transition: transform .15s ease, outline .15s ease;
            }

            #palette .color-dot:hover {
                transform: translateY(-2px);
            }

            #palette .color-dot.active {
                border-color: #fff;
                transform: scale(1.08);
                box-shadow: 0 0 0 3px #8bc34a,
                            0 6px 12px rgba(0,0,0,0.15);
                color: #fff;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                z-index: 1;
            }

            #game-status {
                width: min(90vw, 560px);
                margin: 10px auto;
                color: #62566e;
                text-align: center;
                font: 500 13px/1.5 system-ui, sans-serif;
            }

            #game-progress {
                width: min(90vw, 560px);
                height: 7px;
                overflow: hidden;
                margin: 8px auto 16px;
                border-radius: 99px;
                background: rgba(100,80,130,.15);
            }

            #game-progress-fill {
                width: 0;
                height: 100%;
                border-radius: inherit;
                background: linear-gradient(90deg,#26a978,#86dfb9);
                transition: width .2s ease;
            }

            #selected-color-label {
                width: min(90vw, 500px);
                box-sizing: border-box;
                color: #6b5c7e;
                text-align: center;
                font: 600 12px system-ui, sans-serif;
                margin: 8px auto 0;
            }

            #win-screen-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow-y: auto;
                padding: 24px;
                box-sizing: border-box;
                background: rgba(243, 240, 251, 0.98);
                opacity: 0;
                transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            #win-screen-overlay .memory-card {
                text-align: center;
                max-width: 480px;
                width: 100%;
                font-family: 'Segoe UI', system-ui, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            #win-screen-overlay h2 {
                color: #7a7693;
                font-size: 2rem;
                margin: 0 0 8px 0;
                font-weight: 800;
                letter-spacing: -0.5px;
            }

            #win-screen-overlay .memory-message {
                color: #6a6683;
                font-size: 1.05rem;
                line-height: 1.5;
                margin: 0 0 20px 0;
                font-weight: 600;
                font-style: italic;
                padding: 0 15px;
            }

            #win-screen-overlay .memory-art {
                max-width: 85%;
                max-height: 45vh;
                border-radius: 20px;
                box-shadow: 0 15px 35px rgba(142,138,167,0.25);
                border: 4px solid #fff;
                object-fit: contain;
                transform: scale(0.92);
                transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s;
            }

            #win-screen-overlay .dedication {
                color: #8e8aa7;
                font-size: 1.2rem;
                font-weight: 800;
                margin: 18px 0 22px 0;
                letter-spacing: 0.5px;
            }

            #win-screen-overlay .redo-button {
                background-color: #8bc34a;
                color: white;
                border: none;
                padding: 12px 28px;
                font-weight: bold;
                border-radius: 16px;
                cursor: pointer;
                box-shadow: 0 6px 15px rgba(139,195,74,0.3);
                font-size: 1rem;
                transition: transform 0.2s, background-color 0.2s;
            }

            #win-screen-overlay .redo-button:hover {
                background-color: #7cb342;
                transform: translateY(-1px);
            }

            @media (max-width: 480px) {
                #canvas-container {
                    width: 94vw;
                    height: 55vh;
                }

                #palette-bar {
                    width: 94vw;
                    padding: 10px;
                    gap: 8px;
                }

                #modeBtn {
                    min-width: 95px;
                    padding: 10px 9px;
                    font-size: 12px;
                }

                #palette {
                    gap: 8px;
                }

                #palette .color-dot {
                    flex-basis: 34px;
                    width: 34px;
                    height: 34px;
                    font-size: 12px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* ------------------------------------------------------
       PROGRESS
       ------------------------------------------------------ */

    function createEmptyProgress() {
        return gameData.grid.map(row => row.map(() => false));
    }

    function loadProgress() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (
                Array.isArray(saved) &&
                saved.length === gameData.height &&
                saved.every(row =>
                    Array.isArray(row) &&
                    row.length === gameData.width &&
                    row.every(value => typeof value === "boolean")
                )
            ) {
                progress = saved;
            }
        } catch (error) {
            console.warn("Could not load painting progress.", error);
        }
    }

    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } catch (error) {
            console.warn("Could not save painting progress.", error);
        }
    }

    function countPainted() {
        let count = 0;

        for (const row of progress) {
            for (const painted of row) {
                if (painted) count++;
            }
        }

        return count;
    }

    function updateStatus(message) {
        if (status) {
            status.textContent = message ||
                `${countPainted()} / ${TOTAL} diamonds placed`;
        }

        if (progressBar) {
            progressBar.style.width =
                `${(countPainted() / TOTAL) * 100}%`;
        }
    }

    /* ------------------------------------------------------
       INTERFACE
       ------------------------------------------------------ */

    function buildInterface() {
        addStyles();

        status = document.getElementById("game-status");

        if (!status) {
            status = document.createElement("div");
            status.id = "game-status";
            canvas.parentElement.insertAdjacentElement("afterend", status);
        }

        let progressWrapper = document.getElementById("game-progress");

        if (!progressWrapper) {
            progressWrapper = document.createElement("div");
            progressWrapper.id = "game-progress";
            progressWrapper.innerHTML =
                '<div id="game-progress-fill"></div>';
            status.insertAdjacentElement("afterend", progressWrapper);
        }

        progressBar = document.getElementById("game-progress-fill");

        // Remove the three bottom zoom controls if they already exist.
        const controls = document.getElementById("game-controls");
        if (controls) controls.remove();

        // Prevent the HTML onclick and JavaScript listener from
        // toggling Painting/Moving twice.
        if (modeButton) {
            modeButton.type = "button";

            if (!modeButton.hasAttribute("onclick")) {
                modeButton.addEventListener("click", togglePlayMode);
            }
        }

        buildPalette();
        updateModeButton();
    }

    function buildPalette() {
        palette.replaceChildren();

        colors.forEach(code => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "color-dot";
            button.dataset.code = code;
            button.textContent = code;
            button.style.backgroundColor = gameData.palette[code];
            button.title = `Color ${code}: ${gameData.palette[code]}`;

            button.setAttribute(
                "aria-label",
                `Choose color ${code}, ${gameData.palette[code]}`
            );

            button.addEventListener("click", () => {
                selectedColor = code;
                updatePalette();
            });

            palette.appendChild(button);
        });

        // Keep the selected-colour label outside the scrolling palette.
        selectedLabel = document.getElementById("selected-color-label");

        if (!selectedLabel) {
            selectedLabel = document.createElement("div");
            selectedLabel.id = "selected-color-label";
            palette.parentElement.insertAdjacentElement(
                "afterend",
                selectedLabel
            );
        }

        updatePalette();
    }

    function updatePalette() {
        palette.querySelectorAll(".color-dot").forEach(button => {
            const active = button.dataset.code === selectedColor;

            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        });

        if (selectedLabel) {
            selectedLabel.textContent =
                `Selected color: ${selectedColor} · ${gameData.palette[selectedColor]}`;
        }

        updateStatus();
    }

    function togglePlayMode() {
        mode = mode === "paint" ? "move" : "paint";
        updateModeButton();
    }

    function updateModeButton() {
        if (!modeButton) return;

        modeButton.textContent =
            mode === "paint" ? "✏️ Painting" : "🖐️ Moving";

        modeButton.classList.toggle("move-mode", mode === "move");
    }

    /* ------------------------------------------------------
       CANVAS AND ZOOM
       ------------------------------------------------------ */

    function measureCanvas() {
        const rect = canvas.getBoundingClientRect();

        viewWidth = Math.max(1, rect.width);
        viewHeight = Math.max(1, rect.height);
    }

    function fitPainting() {
        measureCanvas();

        const scaleX = viewWidth / GRID_W;
        const scaleY = viewHeight / GRID_H;

        minZoom = Math.min(scaleX, scaleY) * 0.95;

        zoom = Math.max(minZoom, Math.min(MAX_ZOOM, zoom));
        clampPan();
    }

    function clampPan() {
        const scaledWidth = GRID_W * zoom;
        const scaledHeight = GRID_H * zoom;

        if (scaledWidth <= viewWidth) {
            panX = (viewWidth - scaledWidth) / 2;
        } else {
            panX = Math.min(0, Math.max(viewWidth - scaledWidth, panX));
        }

        if (scaledHeight <= viewHeight) {
            panY = (viewHeight - scaledHeight) / 2;
        } else {
            panY = Math.min(0, Math.max(viewHeight - scaledHeight, panY));
        }
    }

    function resizeCanvas() {
        const width = Math.max(1, Math.round(canvas.clientWidth));
        const height = Math.max(1, Math.round(canvas.clientHeight));

        // Avoid resetting the canvas unnecessarily.
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        measureCanvas();

        const scaleX = viewWidth / GRID_W;
        const scaleY = viewHeight / GRID_H;

        minZoom = Math.min(scaleX, scaleY) * 0.95;

        if (!canvasInitialized) {
            zoom = minZoom;
            panX = (viewWidth - GRID_W * zoom) / 2;
            panY = (viewHeight - GRID_H * zoom) / 2;
            canvasInitialized = true;
        } else {
            zoom = Math.max(minZoom, Math.min(MAX_ZOOM, zoom));
            clampPan();
        }

        draw();
    }

    const layoutObserver = new ResizeObserver(() => {
        resizeCanvas();
    });

    layoutObserver.observe(canvas.parentElement);

    function zoomAt(clientX, clientY, factor) {
        measureCanvas();

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const oldZoom = zoom;
        const newZoom = Math.max(
            minZoom,
            Math.min(MAX_ZOOM, oldZoom * factor)
        );

        const worldX = (x - panX) / oldZoom;
        const worldY = (y - panY) / oldZoom;

        zoom = newZoom;
        panX = x - worldX * zoom;
        panY = y - worldY * zoom;

        clampPan();
        draw();
    }

    function cellAt(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();

        const localX = clientX - rect.left;
        const localY = clientY - rect.top;

        return {
            c: Math.floor((localX - panX) / zoom / SPACING),
            r: Math.floor((localY - panY) / zoom / SPACING)
        };
    }

    /* ------------------------------------------------------
       DRAWING
       ------------------------------------------------------ */

    function rgb(hex) {
        const value = parseInt(hex.replace("#", ""), 16);

        return {
            r: (value >> 16) & 255,
            g: (value >> 8) & 255,
            b: value & 255
        };
    }

    function shade(hex, amount) {
        const c = rgb(hex);

        const r = Math.max(0, Math.min(255, c.r + amount));
        const g = Math.max(0, Math.min(255, c.g + amount));
        const b = Math.max(0, Math.min(255, c.b + amount));

        return `#${((r << 16) | (g << 8) | b)
            .toString(16)
            .padStart(6, "0")}`;
    }

    function drawDiamond(x, y, color, painted, code) {
        ctx.beginPath();
        ctx.arc(x, y, RADIUS, 0, Math.PI * 2);

        if (painted) {
            const gradient = ctx.createRadialGradient(
                x - 3, y - 3, 1,
                x, y, RADIUS
            );

            gradient.addColorStop(0, "#ffffff");
            gradient.addColorStop(0.2, color);
            gradient.addColorStop(1, shade(color, -40));

            ctx.fillStyle = gradient;
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

            // Hide numbers when zoomed out so they cannot overlap.
            // Scale the font with zoom so it remains readable up close.
            const screenRadius = RADIUS * zoom;

            if (screenRadius >= 7) {
                const fontSize = Math.max(
                    7,
                    Math.min(11, 11 * zoom)
                );

                ctx.fillStyle = "#625b76";
                ctx.font = `bold ${fontSize / zoom}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(String(code), x, y);
            }
        }
    }

    function draw() {
        measureCanvas();

        ctx.clearRect(0, 0, viewWidth, viewHeight);

        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        for (let r = 0; r < gameData.height; r++) {
            for (let c = 0; c < gameData.width; c++) {
                const code = String(gameData.grid[r][c]);
                const color = gameData.palette[code] || "#cccccc";

                drawDiamond(
                    c * SPACING + SPACING / 2,
                    r * SPACING + SPACING / 2,
                    color,
                    progress[r][c],
                    code
                );
            }
        }

        ctx.restore();

        updateStatus();
        checkCompletion();
    }

    /* ------------------------------------------------------
       PAINTING
       ------------------------------------------------------ */

    function floodFill(startR, startC) {
        const target = String(gameData.grid[startR][startC]);

        if (target !== selectedColor || progress[startR][startC]) {
            return false;
        }

        const queue = [[startR, startC]];
        let head = 0;
        let changed = false;

        while (head < queue.length) {
            const [r, c] = queue[head++];

            if (
                r < 0 ||
                r >= gameData.height ||
                c < 0 ||
                c >= gameData.width
            ) {
                continue;
            }

            if (progress[r][c]) continue;
            if (String(gameData.grid[r][c]) !== target) continue;

            progress[r][c] = true;
            changed = true;

            queue.push(
                [r + 1, c],
                [r - 1, c],
                [r, c + 1],
                [r, c - 1]
            );
        }

        return changed;
    }

    function paintAt(clientX, clientY) {
        const { r, c } = cellAt(clientX, clientY);

        if (
            r < 0 ||
            r >= gameData.height ||
            c < 0 ||
            c >= gameData.width
        ) {
            return;
        }

        if (String(gameData.grid[r][c]) !== selectedColor) return;

        if (floodFill(r, c)) {
            saveProgress();
            draw();
        }
    }

    /* ------------------------------------------------------
       MOUSE AND TOUCH INPUT
       ------------------------------------------------------ */

    canvas.addEventListener("contextmenu", event => {
        event.preventDefault();
    });

    canvas.addEventListener("wheel", event => {
        event.preventDefault();

        zoomAt(
            event.clientX,
            event.clientY,
            event.deltaY < 0 ? 1.15 : 1 / 1.15
        );
    }, { passive: false });

    canvas.addEventListener("pointerdown", event => {
        if (event.pointerType === "touch") return;
        if (animationRunning || winStarted) return;

        pointerDown = true;
        previousX = event.clientX;
        previousY = event.clientY;

        if (mode === "paint" && event.button === 0) {
            paintAt(event.clientX, event.clientY);
        }

        try {
            canvas.setPointerCapture(event.pointerId);
        } catch (_) {}
    });

    canvas.addEventListener("pointermove", event => {
        if (!pointerDown || event.pointerType === "touch") return;

        const dx = event.clientX - previousX;
        const dy = event.clientY - previousY;

        if (
            mode === "move" ||
            event.buttons === 2 ||
            event.buttons === 4
        ) {
            panX += dx;
            panY += dy;

            clampPan();
            draw();
        } else if (mode === "paint" && event.buttons === 1) {
            paintAt(event.clientX, event.clientY);
        }

        previousX = event.clientX;
        previousY = event.clientY;
    });

    function stopPointer() {
        pointerDown = false;
    }

    canvas.addEventListener("pointerup", stopPointer);
    canvas.addEventListener("pointercancel", stopPointer);

    canvas.addEventListener("touchstart", event => {
        if (animationRunning || winStarted) return;

        event.preventDefault();

        if (event.touches.length === 1) {
            const touch = event.touches[0];

            pointerDown = true;
            previousX = touch.clientX;
            previousY = touch.clientY;

            if (mode === "paint") {
                paintAt(touch.clientX, touch.clientY);
            }
        } else if (event.touches.length === 2) {
            pointerDown = false;

            const a = event.touches[0];
            const b = event.touches[1];

            touchDistance = Math.hypot(
                a.clientX - b.clientX,
                a.clientY - b.clientY
            );

            lastTouchCenter = {
                x: (a.clientX + b.clientX) / 2,
                y: (a.clientY + b.clientY) / 2
            };
        }
    }, { passive: false });

    canvas.addEventListener("touchmove", event => {
        event.preventDefault();

        if (event.touches.length === 1) {
            const touch = event.touches[0];

            if (mode === "move" && pointerDown) {
                panX += touch.clientX - previousX;
                panY += touch.clientY - previousY;

                clampPan();
                draw();
            } else if (mode === "paint" && pointerDown) {
                paintAt(touch.clientX, touch.clientY);
            }

            previousX = touch.clientX;
            previousY = touch.clientY;
        } else if (event.touches.length === 2) {
            const a = event.touches[0];
            const b = event.touches[1];

            const distance = Math.hypot(
                a.clientX - b.clientX,
                a.clientY - b.clientY
            );

            const center = {
                x: (a.clientX + b.clientX) / 2,
                y: (a.clientY + b.clientY) / 2
            };

            const rect = canvas.getBoundingClientRect();
            const localX = center.x - rect.left;
            const localY = center.y - rect.top;

            if (lastTouchCenter && touchDistance > 0) {
                panX += center.x - lastTouchCenter.x;
                panY += center.y - lastTouchCenter.y;

                const worldX = (localX - panX) / zoom;
                const worldY = (localY - panY) / zoom;

                zoom = Math.max(
                    minZoom,
                    Math.min(MAX_ZOOM, zoom * distance / touchDistance)
                );

                panX = localX - worldX * zoom;
                panY = localY - worldY * zoom;
            }

            touchDistance = distance;
            lastTouchCenter = center;

            clampPan();
            draw();
        }
    }, { passive: false });

    function finishTouch() {
        pointerDown = false;
        touchDistance = 0;
        lastTouchCenter = null;
    }

    canvas.addEventListener("touchend", finishTouch);
    canvas.addEventListener("touchcancel", finishTouch);

    /* ------------------------------------------------------
       COMPLETION ANIMATION
       ------------------------------------------------------ */

    function checkCompletion() {
        if (winStarted || countPainted() !== TOTAL) return;

        winStarted = true;
        saveProgress();
        playEndingAnimation();
    }

    function playEndingAnimation() {
        if (animationRunning) return;

        animationRunning = true;

        const startZoom = zoom;
        const startPanX = panX;
        const startPanY = panY;

        measureCanvas();

        const endZoom = Math.min(
            viewWidth / GRID_W,
            viewHeight / GRID_H
        ) * 0.95;

        const endPanX = (viewWidth - GRID_W * endZoom) / 2;
        const endPanY = (viewHeight - GRID_H * endZoom) / 2;

        let startedAt;

        function zoomFrame(now) {
            if (startedAt === undefined) startedAt = now;

            const t = Math.min(1, (now - startedAt) / 1200);

            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

            zoom = startZoom + (endZoom - startZoom) * eased;
            panX = startPanX + (endPanX - startPanX) * eased;
            panY = startPanY + (endPanY - startPanY) * eased;

            drawGameBaseNoWin();

            if (t < 1) {
                animationFrame = requestAnimationFrame(zoomFrame);
            } else {
                zoom = endZoom;
                panX = endPanX;
                panY = endPanY;

                drawGameBaseNoWin();
                startShimmer();
            }
        }

        animationFrame = requestAnimationFrame(zoomFrame);
    }

    function drawGameBaseNoWin() {
        ctx.clearRect(0, 0, viewWidth, viewHeight);

        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        ctx.fillStyle = "rgba(25, 25, 35, 0.4)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.roundRect(-10, -10, GRID_W + 20, GRID_H + 20, 16);
        ctx.fill();
        ctx.stroke();

        for (let r = 0; r < gameData.height; r++) {
            for (let c = 0; c < gameData.width; c++) {
                const code = String(gameData.grid[r][c]);
                const color = gameData.palette[code] || "#cccccc";

                const x = c * SPACING + SPACING / 2;
                const y = r * SPACING + SPACING / 2;

                ctx.beginPath();
                ctx.arc(x, y, RADIUS, 0, Math.PI * 2);

                const gradient = ctx.createRadialGradient(
                    x - 3, y - 3, 1,
                    x, y, RADIUS
                );

                gradient.addColorStop(0, "#ffffff");
                gradient.addColorStop(0.2, color);
                gradient.addColorStop(1, shade(color, -40));

                ctx.fillStyle = gradient;
                ctx.fill();

                ctx.lineWidth = 1;
                ctx.strokeStyle = "rgba(0,0,0,0.15)";
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    function startShimmer() {
        const start = performance.now();

        function frame(now) {
            const amount = Math.min(1, (now - start) / 800);

            drawGameBaseNoWin();

            ctx.save();
            ctx.translate(panX, panY);
            ctx.scale(zoom, zoom);

            const sweepX = (GRID_W * 2) * amount - (GRID_W * 0.5);

            ctx.beginPath();
            ctx.moveTo(sweepX - 80, 0);
            ctx.lineTo(sweepX + 20, 0);
            ctx.lineTo(sweepX + 120, GRID_H);
            ctx.lineTo(sweepX + 20, GRID_H);
            ctx.closePath();

            const shimmerGradient = ctx.createLinearGradient(
                sweepX - 50, 0,
                sweepX + 50, 0
            );

            shimmerGradient.addColorStop(0, "rgba(255,255,255,0)");
            shimmerGradient.addColorStop(0.5, "rgba(255,255,255,0.45)");
            shimmerGradient.addColorStop(1, "rgba(255,255,255,0)");

            ctx.fillStyle = shimmerGradient;
            ctx.fill();

            ctx.restore();

            if (amount < 1) {
                animationFrame = requestAnimationFrame(frame);
            } else {
                buildFinalRevealCard();
            }
        }

        animationFrame = requestAnimationFrame(frame);
    }

    function buildFinalRevealCard() {
        if (document.getElementById("win-screen-overlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "win-screen-overlay";

        const card = document.createElement("section");
        card.className = "memory-card";

        card.innerHTML = `
            <h2>Beautifully Completed!</h2>
            <p class="memory-message">
                "Like a tiny angel resting on the clouds, a beautiful rose
                kept safe, and a warm lighthouse casting light across the
                ocean... May you always remember that the ones we love never
                truly leave us. They are always watching over you from above,
                shining bright like the stars."
            </p>
            <img
                src="memorial_scene.png"
                class="memory-art"
                alt="A comforting memorial scene"
            >
            <p class="dedication">I love you always ❤️</p>
            <button type="button" class="redo-button">
                🔄 Redo Painting
            </button>
        `;

        const redoBtn = card.querySelector(".redo-button");
        redoBtn.addEventListener("click", resetPainting);

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = "1";

            const img = card.querySelector("img");
            if (img) img.style.transform = "scale(1)";
        });
    }

    /* ------------------------------------------------------
       REPLAY
       ------------------------------------------------------ */

    function resetPainting() {
        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }

        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (_) {}

        progress = createEmptyProgress();
        winStarted = false;
        animationRunning = false;

        const overlay = document.getElementById("win-screen-overlay");
        if (overlay) overlay.remove();

        zoom = 1;
        canvasInitialized = false;
        resizeCanvas();
    }

    window.togglePlayMode = togglePlayMode;
    window.resetEntirePainting = resetPainting;
    window.resetPainting = resetPainting;

    /* ------------------------------------------------------
       START GAME
       ------------------------------------------------------ */

    buildInterface();
    loadProgress();
    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);
})();
