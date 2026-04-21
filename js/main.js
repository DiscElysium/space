import { rawData } from './data.js';
import { initUI, updateCardTransform, activateCardStyle, hexToRgba } from './ui.js';
import { SpaceVisualizer } from './globe.js';

initUI(rawData);
const visualizer = new SpaceVisualizer('globe-container');

let currentIndex = -1;
let triggeredIndices = new Set();

window.addEventListener('scroll', () => {
    const hint = document.getElementById('scroll-hint');
    if(window.scrollY > 50 && hint.style.opacity !== '0') hint.style.opacity = '0';

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    const exactIndex = progress * (rawData.length - 1);
    
    updateCardTransform(exactIndex);

    const closestIndex = Math.round(exactIndex);
    if (closestIndex !== currentIndex) {
        activateEvent(closestIndex);
    }
});

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
    
    // 把 isLunar 状态传给 focusOn 决定相机高度
    visualizer.focusOn(item.lat, item.lng, isLunar);
}

window.addEventListener('resize', () => { 
    visualizer.resize(window.innerWidth, window.innerHeight); 
});

setTimeout(() => window.dispatchEvent(new Event('scroll')), 100);