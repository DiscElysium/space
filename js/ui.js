export const nodeSpacing = 260; 

export function initUI(rawData) {
    const trackContainer = document.getElementById('timeline-track');
    const cardsContainer = document.getElementById('cards-container');
    document.getElementById('scroll-proxy').style.height = `${rawData.length * 100}vh`;

    rawData.forEach((item, index) => {
        const yearStr = item.d.substring(0, 4);
        trackContainer.innerHTML += `
            <div class="timeline-node" id="node-${index}" style="top: ${index * nodeSpacing}px">
                <span class="year-label">${yearStr}</span>
            </div>
        `;
        cardsContainer.innerHTML += `
            <div class="event-card" id="card-${index}" style="top: ${index * nodeSpacing}px">
                <div class="date">${item.d}</div>
                <div class="mission">${item.m}</div>
                <div class="tags">
                    <span class="tag">${item.s}</span>
                    <span class="tag">${item.r}</span>
                    <span class="tag orbit-tag">${item.o}</span>
                </div>
                <div class="details">${item.ms}</div>
            </div>
        `;
    });
}

export function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function updateCardTransform(exactIndex) {
    const trackY = -exactIndex * nodeSpacing;
    document.getElementById('timeline-track').style.transform = `translateY(${trackY}px)`;
    document.getElementById('cards-container').style.transform = `translateY(${trackY}px)`;
    
    document.querySelectorAll('.event-card').forEach((card, i) => {
        const distance = Math.abs(exactIndex - i);
        const opacity = Math.max(0.1, 1 - distance * 0.65); 
        const scale = Math.max(0.85, 1 - distance * 0.08); 
        const zIndex = Math.round(100 - distance * 10);

        card.style.opacity = opacity;
        card.style.transform = `scale(${scale})`;
        card.style.zIndex = zIndex;
        card.style.pointerEvents = distance < 0.5 ? 'auto' : 'none';
    });
}

export function activateCardStyle(index, color, item) {
    const fixedPointer = document.getElementById('fixed-pointer');
    fixedPointer.style.backgroundColor = color;
    fixedPointer.style.boxShadow = `0 0 10px ${color}`;

    document.querySelectorAll('.timeline-node').forEach((n, i) => {
        if (i === index) {
            n.classList.add('active'); n.style.backgroundColor = color;
            n.style.boxShadow = `0 0 15px ${color}`; n.style.color = color;
        } else {
            n.classList.remove('active'); n.style.backgroundColor = 'var(--text-muted)';
            n.style.boxShadow = 'none'; n.style.color = 'var(--text-muted)';
        }
    });

    document.querySelectorAll('.event-card').forEach((card, i) => {
        if (i === index) {
            card.classList.add('active');
            card.style.borderTopColor = color;
            card.querySelector('.date').style.backgroundColor = color;
            card.querySelector('.date').style.color = '#000';
            card.querySelector('.orbit-tag').style.borderColor = color;
            card.querySelector('.orbit-tag').style.color = color;
        } else {
            card.classList.remove('active');
            card.style.borderTopColor = 'var(--text-muted)';
            card.querySelector('.date').style.backgroundColor = 'rgba(255,255,255,0.1)';
            card.querySelector('.date').style.color = 'var(--text-muted)';
            card.querySelector('.orbit-tag').style.borderColor = 'rgba(255,255,255,0.1)';
            card.querySelector('.orbit-tag').style.color = 'var(--text-main)';
        }
    });

    const yearDisplay = document.getElementById('year-display');
    yearDisplay.innerText = item.d.substring(0, 4);
    yearDisplay.style.textShadow = `0 0 40px ${hexToRgba(color, 0.1)}`;
}