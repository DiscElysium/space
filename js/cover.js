/* ============================================================
   cover.js  ·  封面 HUD 模块
   - 动态注入 HUD DOM，垫入视频背景
   - 鼠标视差(微旋转 stage)
   - tsParticles 氛围粒子
   - HUD 数字计数动画
   ============================================================ */

function buildHTML(rawData) {
    const years = rawData
        .map(d => parseInt((d.d || '').substring(0, 4), 10))
        .filter(y => !isNaN(y));
    const startYear = years.length ? Math.min(...years) : '----';
    const endYear   = years.length ? Math.max(...years) : '----';
    const total     = rawData.length;
    const lunar     = rawData.filter(d => (d.o || '').includes('月球')).length;

    // 顶部水平刻度线（增加数量以铺满顶部）
    const tickCount = 60;
    const tickHTML = '<i></i>'.repeat(tickCount);

    return `
    <div id="cover">
        <video class="cover-bg-video" src="./images/your-video.mp4" autoplay loop muted playsinline></video>

        <div id="cover-particles"></div>
        <div class="cover-vignette"></div>

        <div class="cover-stage" id="cover-stage">

            <div class="top-ticks">${tickHTML}</div>

            <div class="cover-title-block">
                <div class="title-eyebrow">CLASSIFIED · ARCHIVE 0451</div>
                <h1 class="cover-title">中国<span class="accent">航天</span>简史</h1>
                <div class="cover-subtitle">CHINA SPACE CHRONICLE</div>
                <div class="year-range">
                    <span>${startYear}</span><span class="dash"></span><span>${endYear}</span>
                </div>
            </div>

            <div class="hud hud-tl">
                <div class="hud-frame">
                    <div class="hud-label"><span class="hud-dot"></span>MISSION CONTROL</div>
                    <div class="hud-value">SYS · ONLINE</div>
                    <div class="hud-meta">UPLINK STABLE · 0.42 MS</div>
                    <div class="hud-bar"><i style="width: 87%"></i></div>
                </div>
            </div>

            <div class="hud hud-tr">
                <div class="hud-frame">
                    <div class="hud-label">CHRONOLOGY<span class="hud-dot"></span></div>
                    <div class="hud-value gold" data-counter="${total}" data-pad="2">00</div>
                    <div class="hud-meta">RECORDED MISSIONS</div>
                    <div class="hud-bar"><i class="gold" style="width: 100%"></i></div>
                </div>
            </div>

            <div class="hud hud-bl">
                <div class="hud-frame">
                    <div class="hud-label"><span class="hud-dot"></span>COORDINATES</div>
                    <div class="hud-value-small">
                        JIUQUAN&nbsp;&nbsp;41.118°N<br>
                        WENCHANG&nbsp;19.614°N<br>
                        XICHANG&nbsp;&nbsp;28.246°N
                    </div>
                    <div class="hud-meta">PRIMARY LAUNCH SITES</div>
                </div>
            </div>

            <div class="hud hud-br">
                <div class="hud-frame">
                    <div class="hud-label">TELEMETRY<span class="hud-dot"></span></div>
                    <div class="hud-value" data-counter="${lunar}" data-pad="2">00</div>
                    <div class="hud-meta">LUNAR OPERATIONS</div>
                    <div class="hud-bar">
                        <i style="width: ${total ? (lunar / total * 100).toFixed(1) : 0}%"></i>
                    </div>
                </div>
            </div>

            <div class="cover-scroll">
                <div>SCROLL TO ENGAGE</div>
                <div class="cover-scroll-arrow"></div>
            </div>

        </div>
    </div>`;
}

function setupMouseParallax() {
    const stage = document.getElementById('cover-stage');
    if (!stage) return;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let active = true;

    window.addEventListener('mousemove', (e) => {
        const w = window.innerWidth, h = window.innerHeight;
        tx = ((e.clientY - h / 2) / (h / 2)) * -3;
        ty = ((e.clientX - w / 2) / (w / 2)) * 4;
    });

    function tick() {
        cx += (tx - cx) * 0.06;
        cy += (ty - cy) * 0.06;
        stage.style.transform = `rotateX(${cx.toFixed(3)}deg) rotateY(${cy.toFixed(3)}deg)`;
        if (active) requestAnimationFrame(tick);
    }
    tick();

    return {
        pause: () => { active = false; },
        resume: () => { if (!active) { active = true; tick(); } }
    };
}

function setupParticles() {
    if (typeof tsParticles === 'undefined') return;
    tsParticles.load({
        id: "cover-particles",
        options: {
            fullScreen: { enable: false },
            background: { color: "transparent" },
            fpsLimit: 60,
            particles: {
                color: { value: ["#00E5FF", "#FFC857", "#E2E8F0"] },
                number: { value: 70, density: { enable: true, area: 1000 } },
                opacity: {
                    value: { min: 0.08, max: 0.55 },
                    animation: { enable: true, speed: 0.6, sync: false }
                },
                size: { value: { min: 0.4, max: 1.8 } },
                move: {
                    enable: true,
                    speed: { min: 0.1, max: 0.5 },
                    direction: "none",
                    random: true,
                    straight: false,
                    outModes: { default: "out" }
                },
                shape: { type: "circle" }
            },
            detectRetina: true
        }
    }).catch(err => console.warn('[cover] particles init failed:', err));
}

function animateCounters() {
    const els = document.querySelectorAll('#cover [data-counter]');
    els.forEach(el => {
        const target = parseInt(el.dataset.counter, 10) || 0;
        const pad = parseInt(el.dataset.pad, 10) || target.toString().length;
        const duration = 1800;
        const delay = 1200; 
        const start = performance.now() + delay;

        function step(now) {
            if (now < start) {
                el.textContent = '0'.padStart(pad, '0');
                requestAnimationFrame(step);
                return;
            }
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const v = Math.floor(eased * target);
            el.textContent = v.toString().padStart(pad, '0');
            if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    });
}

let parallaxCtl = null;
let coverEl = null;

export function initCover(rawData) {
    document.body.insertAdjacentHTML('afterbegin', buildHTML(rawData));
    coverEl = document.getElementById('cover');
    document.body.classList.add('cover-active');

    parallaxCtl = setupMouseParallax();
    setupParticles();
    animateCounters();
}

export function updateCoverByScroll(scrollY, viewportH) {
    if (!coverEl) return false;
    const p = Math.max(0, Math.min(1, scrollY / viewportH)); 
    const visible = p < 1;

    coverEl.style.opacity = (1 - p).toFixed(3);
    coverEl.style.transform = `translateY(${(-p * 40).toFixed(2)}px) scale(${(1 - p * 0.06).toFixed(3)})`;
    coverEl.style.pointerEvents = p > 0.95 ? 'none' : 'auto';

    if (p > 0.7) document.body.classList.remove('cover-active');
    else document.body.classList.add('cover-active');

    if (parallaxCtl) {
        if (!visible) parallaxCtl.pause();
        else parallaxCtl.resume();
    }

    return visible;
}