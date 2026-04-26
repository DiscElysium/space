export function initDashboard() {
    initRadar();
    initStatsChart();
    initTaikonautsChart();
    initRocketBrowser();
}

/* ---------- 工具：防抖 ---------- */
function debounce(fn, wait = 100) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

/* ============================================================
 * 01 // 发射阵地全息雷达
 * ============================================================ */
function initRadar() {
    const container = document.getElementById('radar-container');
    if (!container) return;

    // 【修复 A】：强制 container 为 relative,确保 radar-viz 的 absolute 定位正确
    if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }

    const sitesData = [
        { id: 'JQ', name: 'JIUQUAN', cnName: '酒泉卫星发射中心', lat: 40.96, lng: 100.28, alt: 1000, est: 1958, orbits: 'LEO / SSO', feature: '载人航天发源地', geoDesc: '戈壁荒漠,气候干燥' },
        { id: 'TY', name: 'TAIYUAN', cnName: '太原卫星发射中心', lat: 38.84, lng: 111.60, alt: 1500, est: 1968, orbits: 'SSO / POLAR', feature: '极轨卫星发射中心', geoDesc: '黄土高原,群山环抱' },
        { id: 'XC', name: 'XICHANG', cnName: '西昌卫星发射中心', lat: 28.24, lng: 102.02, alt: 1500, est: 1970, orbits: 'GTO / GEO', feature: '探月工程母港', geoDesc: '川西南峡谷,纬度较低' },
        { id: 'WC', name: 'WENCHANG', cnName: '文昌航天发射场', lat: 19.61, lng: 110.95, alt: 5, est: 2014, orbits: 'GTO / DEEP SPACE', feature: '深空探测器母港', geoDesc: '海岸线,残骸落入大海' }
    ];

    // 【修复 B】:把当前选中保存在外部变量,避免 resize 重置
    let selectedId = 'WC';

    function updateTelemetry(data) {
        d3.select("#t-name").text(data.name).style("color", "var(--accent-gold)");
        d3.select(".sys-header p").text(data.cnName).style("color", "#fff");
        d3.select("#t-coords").text(`${data.lat}°N, ${data.lng}°E`);
        d3.select("#t-year").text(data.est);
        d3.select("#t-alt").text(`${data.alt} m`);
        d3.select("#t-geo-desc").text(data.geoDesc);
        d3.select("#t-orbits").text(data.orbits);
        d3.select("#t-feature").text(data.feature);
    }

    function render() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) return;

        const viz = document.getElementById('radar-viz');
        viz.innerHTML = '';

        const svg = d3.select("#radar-viz").append("svg")
            .attr("width", width).attr("height", height)
            .style("display", "block"); // 【修复】防止 SVG 默认 inline 留底部空隙

        // 【修复 C】:留出更多左边距给 °N 标签
        const xScale = d3.scaleLinear().domain([90, 120]).range([60, width - 30]);
        const yScale = d3.scaleLinear().domain([15, 45]).range([height - 40, 30]);

        const gridLayer = svg.append("g").attr("class", "grid-layer");

        // 【修复 C】:经度网格只画到 120(domain 上限),不画 125
        d3.range(90, 121, 5).forEach(lng => {
            gridLayer.append("line").attr("class", "grid-line")
                .attr("x1", xScale(lng)).attr("y1", 20)
                .attr("x2", xScale(lng)).attr("y2", height - 20);
            gridLayer.append("text").attr("class", "coord-text")
                .attr("x", xScale(lng)).attr("y", height - 5)
                .text(`${lng}°E`).attr("text-anchor", "middle");
        });
        d3.range(15, 46, 5).forEach(lat => {
            gridLayer.append("line").attr("class", "grid-line")
                .attr("x1", 20).attr("y1", yScale(lat))
                .attr("x2", width - 20).attr("y2", yScale(lat));
            gridLayer.append("text").attr("class", "coord-text")
                .attr("x", 50).attr("y", yScale(lat) + 3)
                .text(`${lat}°N`).attr("text-anchor", "end");
        });

        const nodes = svg.selectAll(".site-node").data(sitesData).enter()
            .append("g").attr("class", "site-node")
            .attr("transform", d => `translate(${xScale(d.lng)},${yScale(d.lat)})`)
            .style("cursor", "pointer")
            .on("click", function (event, d) {
                selectedId = d.id;
                applySelection();
                updateTelemetry(d);
            });

        nodes.append("circle").attr("r", 6)
            .attr("stroke", "var(--text-muted)").attr("stroke-width", 2)
            .attr("fill", "var(--bg-deep)");
        nodes.append("text").attr("x", 12).attr("y", 4)
            .attr("fill", "var(--text-main)")
            .attr("font-family", "Courier New").attr("font-size", "10px")
            .text(d => d.id);

        // 【修复 B】:根据 selectedId 还原选中态,而不是每次 resize 都重置回 WC
        function applySelection() {
            d3.selectAll(".site-node circle")
                .attr("stroke", "var(--text-muted)")
                .attr("fill", "var(--bg-deep)");
            d3.selectAll(".site-node")
                .filter(d => d.id === selectedId)
                .select("circle")
                .attr("stroke", "var(--accent-green)")
                .attr("fill", "rgba(0,229,255,0.2)");
        }
        applySelection();
        // 仅首次同步一次 telemetry(刷新选中点的信息)
        const cur = sitesData.find(d => d.id === selectedId);
        if (cur) updateTelemetry(cur);
    }

    // 【修复】:防抖 + 主动触发首次渲染(应对 ResizeObserver 在某些场景下不立即触发)
    const debounced = debounce(render, 80);
    const observer = new ResizeObserver(debounced);
    observer.observe(container);
    requestAnimationFrame(render);
}

/* ============================================================
 * 02 // 历史发射统计 (无需改动)
 * ============================================================ */
function initStatsChart() {
    const chartDom = document.getElementById('stats-chart-container');
    if (!chartDom) return;
    const myChart = echarts.init(chartDom);

    const option = {
        title: { text: 'LAUNCH STATS', subtext: '历年发射统计', left: '20', top: '10', textStyle: { color: '#00E5FF', fontFamily: 'Courier New', fontSize: 18 } },
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(5, 8, 14, 0.85)' },
        legend: { data: ['成功', '商业'], top: '15', right: '20', textStyle: { color: '#E2E8F0' } },
        grid: { left: '5%', right: '5%', bottom: '10%', top: '25%', containLabel: true },
        xAxis: [{ type: 'category', data: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'], axisLabel: { color: '#E2E8F0' } }],
        yAxis: [
            { type: 'value', name: '总数', splitLine: { lineStyle: { type: 'dashed', color: 'rgba(255,255,255,0.05)' } } },
            { type: 'value', name: '商业', splitLine: { show: false } }
        ],
        series: [
            { name: '成功', type: 'bar', barWidth: '40%', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#00E5FF' }, { offset: 1, color: 'rgba(0, 229, 255, 0.1)' }]), borderRadius: [2, 2, 0, 0] }, data: [21, 16, 38, 32, 35, 53, 62, 65] },
            { name: '商业', type: 'line', yAxisIndex: 1, smooth: true, itemStyle: { color: '#FFC857', shadowBlur: 10 }, lineStyle: { width: 3 }, data: [1, 1, 4, 8, 10, 16, 22, 26] }
        ]
    };
    myChart.setOption(option);

    const observer = new ResizeObserver(() => myChart.resize());
    observer.observe(chartDom);
}

/* ============================================================
 * 03 // 航天员在轨记录 (无需改动)
 * ============================================================ */
function initTaikonautsChart() {
    const chartDom = document.getElementById('taikonauts-chart-container');
    if (!chartDom) return;
    const myChart = echarts.init(chartDom);

    const data = [
        { name: '杨利伟', days: 1 }, { name: '刘伯明', days: 95 }, { name: '聂海胜', days: 111 },
        { name: '王亚平', days: 197 }, { name: '景海鹏', days: 201 }, { name: '陈冬', days: 214 }, { name: '汤洪波', days: 279 }
    ];

    const option = {
        title: { text: 'ORBITAL TIME', subtext: '航天员在轨天数', left: 'center', top: '15', textStyle: { color: '#FFC857', fontFamily: 'Courier New', fontSize: 18 } },
        polar: { radius: ['25%', '70%'], center: ['50%', '55%'] },
        angleAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { color: '#E2E8F0' }, axisLine: { show: false } },
        radiusAxis: { type: 'value', axisLabel: { show: false }, splitLine: { lineStyle: { type: 'dashed', color: 'rgba(0,229,255,0.1)' } } },
        tooltip: { formatter: p => `${p.name}: <span style="color:#00E5FF">${p.value}</span> 天` },
        series: [{
            type: 'bar', data: data.map(d => d.days), coordinateSystem: 'polar', barWidth: '60%',
            itemStyle: {
                color: p => new echarts.graphic.LinearGradient(0, 0, 1, 1, p.value > 200 ? [{ offset: 0, color: 'rgba(0, 229, 255, 0.1)' }, { offset: 1, color: '#00E5FF' }] : (p.value === 1 ? [{ offset: 0, color: 'rgba(255, 200, 87, 0.1)' }, { offset: 1, color: '#FFC857' }] : [{ offset: 0, color: 'rgba(130, 146, 166, 0.1)' }, { offset: 1, color: '#8292A6' }])),
                borderRadius: [0, 10, 10, 0]
            },
            label: { show: true, position: 'end', formatter: '{c} 天', color: '#00E5FF', fontSize: 10 }
        }]
    };
    myChart.setOption(option);

    const observer = new ResizeObserver(() => myChart.resize());
    observer.observe(chartDom);
}

/* ============================================================
 * 04 // 火箭运力谱系
 * ============================================================ */
function initRocketBrowser() {
    const container = document.getElementById('rocket-viz');
    if (!container) return;

    // 【修复 D】:给 rocket-viz 一个最小高度,避免父级 flex 没分配高度时被压扁
    if (!container.style.minHeight) {
        container.style.minHeight = '320px';
    }
    container.style.position = 'relative';

    const rockets = [
        { name: '长征一号', year: 1970, leo: 300, thrust: 1020, fuel: '常温', cat: 'active' },
        { name: '长征二号丙', year: 1982, leo: 3850, thrust: 2962, fuel: '常温', cat: 'active' },
        { name: '长征五号', year: 2016, leo: 25000, thrust: 10620, fuel: '液氢液氧', cat: 'active' },
        { name: '长征七号', year: 2016.5, leo: 13500, thrust: 7200, fuel: '液氧煤油', cat: 'active' }, // 微调避免 curveMonotoneX 同 x 退化
        { name: '长征八号', year: 2020, leo: 8100, thrust: 4800, fuel: '液氧煤油', cat: 'active' },
        { name: '朱雀二号', year: 2022, leo: 6000, thrust: 2620, fuel: '甲烷', cat: 'commercial' },
        { name: '力箭一号', year: 2022.5, leo: 1500, thrust: 2000, fuel: '固体', cat: 'commercial' }
    ];

    let currentType = 'all';
    // 【修复 E】:把这些声明在外层,事件回调统一从这里读取最新引用
    let nodes, activePath, commPath;

    function applyFilter() {
        if (!nodes) return;
        nodes.transition().duration(400)
            .style("opacity", d => (currentType === 'all' || d.cat === currentType) ? 1 : 0.1);
        activePath.transition().duration(400)
            .style("opacity", (currentType === 'all' || currentType === 'active') ? 0.3 : 0);
        commPath.transition().duration(400)
            .style("opacity", (currentType === 'all' || currentType === 'commercial') ? 0.3 : 0);
    }

    function showHUD(d) {
        const hud = d3.select("#hud");
        const color = d.cat === 'commercial' ? 'var(--accent-gold)' : 'var(--accent-green)';
        d3.select("#hud-name").text(d.name).style("color", color);
        d3.select("#hud-year").text(Math.floor(d.year)).style("color", color);
        d3.select("#hud-leo").text(d.leo.toLocaleString() + 'kg').style("color", color);
        d3.select("#hud-thrust").text(d.thrust.toLocaleString() + 'kN').style("color", color);
        d3.select("#hud-fuel").text(d.fuel).style("color", color);
        d3.select("#hud-tag").style("color", color).style("border-color", color).text(d.cat.toUpperCase());
        hud.style("border-color", color).classed("active", true);
    }

    function render() {
        const width = container.clientWidth;
        const height = container.clientHeight || 350;
        if (width === 0) return;

        container.innerHTML = '';

        const svg = d3.select(container).append("svg")
            .attr("width", width).attr("height", height)
            .style("display", "block");

        const x = d3.scaleLinear().domain([1965, 2025]).range([40, width - 30]);
        const y = d3.scaleLog().domain([100, 50000]).range([height - 30, 20]);

        svg.append("g").attr("class", "axis")
            .attr("transform", `translate(0,${height - 30})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(5));

        const lineGen = d3.line().x(d => x(d.year)).y(d => y(d.leo)).curve(d3.curveMonotoneX);

        activePath = svg.append("path")
            .datum(rockets.filter(d => d.cat === 'active').sort((a, b) => a.year - b.year))
            .attr("fill", "none").attr("stroke", "var(--accent-green)")
            .attr("stroke-width", 1.5)
            .attr("d", lineGen)
            .attr("opacity", (currentType === 'all' || currentType === 'active') ? 0.3 : 0);

        commPath = svg.append("path")
            .datum(rockets.filter(d => d.cat === 'commercial').sort((a, b) => a.year - b.year))
            .attr("fill", "none").attr("stroke", "var(--accent-gold)")
            .attr("stroke-width", 1.5)
            .attr("d", lineGen)
            .attr("opacity", (currentType === 'all' || currentType === 'commercial') ? 0.3 : 0);

        nodes = svg.selectAll(".node").data(rockets).enter()
            .append("circle").attr("class", "node")
            .attr("cx", d => x(d.year)).attr("cy", d => y(d.leo))
            .attr("r", 5)
            .attr("fill", d => d.cat === 'commercial' ? 'var(--accent-gold)' : 'var(--accent-green)')
            .style("opacity", d => (currentType === 'all' || d.cat === currentType) ? 1 : 0.1)
            .style("cursor", "pointer")
            .on("mouseenter", (e, d) => {
                d3.select(e.target).attr("r", 8);
                showHUD(d);
                activePath.attr("stroke-width", d.cat === 'active' ? 3 : 1)
                    .attr("opacity", d.cat === 'active' ? 1 : 0.1);
                commPath.attr("stroke-width", d.cat === 'commercial' ? 3 : 1)
                    .attr("opacity", d.cat === 'commercial' ? 1 : 0.1);
            })
            .on("mouseleave", (e) => {
                d3.select(e.target).attr("r", 5);
                d3.select("#hud").classed("active", false);
                activePath.attr("stroke-width", 1.5)
                    .attr("opacity", (currentType === 'all' || currentType === 'active') ? 0.3 : 0);
                commPath.attr("stroke-width", 1.5)
                    .attr("opacity", (currentType === 'all' || currentType === 'commercial') ? 0.3 : 0);
            });

        // 节点标签(年份小提示),便于辨认
        svg.selectAll(".node-label").data(rockets).enter()
            .append("text").attr("class", "node-label")
            .attr("x", d => x(d.year) + 8).attr("y", d => y(d.leo) + 3)
            .attr("font-family", "Courier New").attr("font-size", "9px")
            .attr("fill", d => d.cat === 'commercial' ? 'var(--accent-gold)' : 'var(--accent-green)')
            .style("opacity", d => (currentType === 'all' || d.cat === currentType) ? 0.7 : 0.05)
            .style("pointer-events", "none")
            .text(d => d.name);
    }

    // 【修复 E】:nav 事件只绑定一次,通过共享变量 currentType 控制
    let navBound = false;
    function bindNav() {
        if (navBound) return;
        navBound = true;
        document.querySelectorAll('.rocket-nav-item').forEach(el => {
            el.addEventListener('click', (e) => {
                document.querySelectorAll('.rocket-nav-item').forEach(n => n.classList.remove('active'));
                e.currentTarget.classList.add('active');
                currentType = e.currentTarget.getAttribute('data-filter');
                applyFilter();
            });
        });
    }

    const debounced = debounce(render, 80);
    const observer = new ResizeObserver(debounced);
    observer.observe(container);
    requestAnimationFrame(() => {
        render();
        bindNav();
    });
}