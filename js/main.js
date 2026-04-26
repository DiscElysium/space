import { rawData } from './data.js';
import { initUI, updateCardTransform, activateCardStyle, hexToRgba } from './ui.js';
import { SpaceVisualizer } from './globe.js';
import { initCover, updateCoverByScroll } from './cover.js';
import { initDashboard } from './dashboard.js';

// === 1. 先注入封面 (在最顶层渲染，挡住时间线 UI) ===
initCover(rawData);

// 【修复重叠问题】：强制把后面四个数据页往下推 100vh，正好错开封面的滚动周期
const transitionPages = document.getElementById('transition-pages');
if (transitionPages) {
    transitionPages.style.marginTop = '100vh';
}

// === 2. 时间线 UI 与地球 ===
initUI(rawData);
const visualizer = new SpaceVisualizer('globe-container');

// 【修复 D3 尺寸为 0 的问题】：延迟 150ms 渲染仪表盘，确保浏览器已经计算好 Flex 容器的高度
setTimeout(() => {
    initDashboard();
}, 150);

// === 极简背景图控制逻辑 ===
const bgImagePanel = document.getElementById('bg-image-panel');

function updateBackgroundImage(imgUrl) {
    if (imgUrl) {
        bgImagePanel.style.backgroundImage = `url(${imgUrl})`;
        bgImagePanel.style.opacity = '1';
    } else {
        bgImagePanel.style.opacity = '0';
    }
}

// === BGM 控制模块 ===
const bgMusic = new Audio('./audio/your-music.mp3'); 
bgMusic.loop = true;
bgMusic.volume = 0.5;

let isMusicStarted = false;

function startMusic() {
    if (!isMusicStarted) {
        bgMusic.play().then(() => {
            isMusicStarted = true;
            window.removeEventListener('scroll', startMusic);
            window.removeEventListener('click', startMusic);
            window.removeEventListener('touchstart', startMusic);
        }).catch(err => {
            console.warn("浏览器限制了音频播放，等待用户进一步交互:", err);
        });
    }
}

window.addEventListener('scroll', startMusic);
window.addEventListener('click', startMusic);
window.addEventListener('touchstart', startMusic);

let currentIndex = -1;
let triggeredIndices = new Set();

// === 悬停交互逻辑 ===
document.querySelectorAll('.event-card').forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
        if (index === currentIndex && rawData[index].img) {
            updateBackgroundImage(rawData[index].img);
        }
    });
    
    card.addEventListener('mouseleave', () => {
        if (index === currentIndex) {
            updateBackgroundImage(null);
        }
    });
});

window.addEventListener('scroll', () => {
    const wh = window.innerHeight;
    const sy = window.scrollY;

    // 1. 封面逻辑 (0 - 100vh)
    updateCoverByScroll(sy, wh);

    // 2. 时间轴数学逻辑
    const transitionOffset = 5 * wh; // 1页封面 + 4页数据页
    const effective = Math.max(0, sy - transitionOffset);
    
    const totalTimelineScroll = (rawData.length - 1) * wh; 
    const progress = totalTimelineScroll > 0
        ? Math.max(0, Math.min(1, effective / totalTimelineScroll))
        : 0;
    const exactIndex = progress * (rawData.length - 1);

    const timelineUI = document.getElementById('fixed-ui-layer');
    if (sy > transitionOffset - wh) {
        timelineUI.style.opacity = '1';
        timelineUI.style.pointerEvents = 'auto';
        updateCardTransform(exactIndex);
    } else {
        timelineUI.style.opacity = '0';
        timelineUI.style.pointerEvents = 'none';
    }

    const closestIndex = Math.round(exactIndex);
    if (closestIndex !== currentIndex && sy > transitionOffset) {
        activateEvent(closestIndex);
    }
});

document.getElementById('scroll-proxy').style.height = `${(rawData.length + 5) * 100}vh`;

function activateEvent(index) {
    currentIndex = index;
    const item = rawData[index];
    const { color } = visualizer.getOrbitConfig(item.o);
    const isLunar = item.o.includes('月球');

    activateCardStyle(index, color, item);

    if (!triggeredIndices.has(index)) {
        triggeredIndices.add(index);
        visualizer.addEventData(item, color, hexToRgba);
    }

    visualizer.focusOn(item.lat, item.lng, isLunar);

    const currentCard = document.getElementById(`card-${index}`);
    if (item.img && currentCard && currentCard.matches(':hover')) {
        updateBackgroundImage(item.img);
    } else {
        updateBackgroundImage(null);
    }
}

window.addEventListener('resize', () => {
    visualizer.resize(window.innerWidth, window.innerHeight);
});

setTimeout(() => window.dispatchEvent(new Event('scroll')), 100);
