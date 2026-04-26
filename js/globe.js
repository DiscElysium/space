const THREE = window.THREE;
const Globe = window.Globe;

export class SpaceVisualizer {
    constructor(containerId) {
        this.containerId = containerId;
        this.myGlobe = Globe({ animateIn: true })(document.getElementById(containerId))
            .backgroundColor('#00000000')
            .showGlobe(true).showAtmosphere(true)
            .atmosphereColor('#00E5FF').atmosphereAltitude(0.15)
            .pointOfView({ lat: 35, lng: 105, altitude: 2.2 });

        this.myGlobe.controls().enableZoom = false;
        document.getElementById(containerId).style.transform = 'translateX(10%)';
        // 新增：用于管理地球轨迹动画帧
        this.earthAnimId = null;
        
        this.setupMaterial();
        this.loadGeography();
        this.setupMoonSystem();
        this.setupInteractions();

        this.globalArcs = [];
        this.globalPaths = [];
        this.transferAnimId = null; // 用于管理转移轨道的动画帧
    }

    setupMaterial() {
        const globeMaterial = this.myGlobe.globeMaterial();
        globeMaterial.color = new THREE.Color('#05080E');
        globeMaterial.emissive = new THREE.Color('#020305');
        globeMaterial.roughness = 0.8;
    }

    loadGeography() {
        fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(countries => {
                this.myGlobe.polygonsData(countries.features)
                    .polygonCapColor(() => '#0B121A')
                    .polygonSideColor(() => '#05080C')
                    .polygonStrokeColor(() => '#1A2938');
            });

        this.myGlobe
            .arcStartLat(d => d.startLat).arcStartLng(d => d.startLng)
            .arcEndLat(d => d.endLat).arcEndLng(d => d.endLng)
            .arcColor(d => d.color).arcAltitude(d => d.alt).arcStroke(d => d.stroke)
            .arcDashLength(d => d.dashLength).arcDashGap(d => d.dashGap).arcDashAnimateTime(d => d.animateTime)
            .pathsData([]).pathPoints(d => d.coords).pathPointLat(p => p[0]).pathPointLng(p => p[1]).pathPointAlt(p => p[2])
            .pathColor(d => d.color).pathDashLength(0.05).pathDashGap(0.01).pathDashAnimateTime(6000).pathStroke(1.5);
    }

    setupMoonSystem() {
        const scene = this.myGlobe.scene();

        // --- 新增：地球原生轨迹组，挂载在场景中 ---
        this.earthTrajectoriesGroup = new THREE.Group();
        scene.add(this.earthTrajectoriesGroup);

        this.moonPivot = new THREE.Group();
        scene.add(this.moonPivot);

        const coreGeo = new THREE.SphereGeometry(15, 32, 32);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0x1A2938, roughness: 0.9, metalness: 0.1
        });
        this.moonCore = new THREE.Mesh(coreGeo, coreMat);

        const wireGeo = new THREE.IcosahedronGeometry(16, 2);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x00E5FF, wireframe: true, transparent: true, opacity: 0.15
        });
        this.moonWire = new THREE.Mesh(wireGeo, wireMat);
        
        this.moonCore.add(this.moonWire);
        this.moonCore.position.set(280, 40, 0); 
        
        // 环月轨道组
        this.lunarOrbitsGroup = new THREE.Group();
        this.moonCore.add(this.lunarOrbitsGroup);

        // 新增：地月转移轨道组，挂载在 moonPivot 上以同步公转
        this.transferGroup = new THREE.Group();
        this.moonPivot.add(this.transferGroup);

        this.moonPivot.add(this.moonCore);
        this.animateMoon();
    }

    setupInteractions() {
        this.isZoomedOut = false;
        document.getElementById(this.containerId).addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'canvas') {
                this.isZoomedOut = !this.isZoomedOut;
                const currentPOV = this.myGlobe.pointOfView();
                const targetAlt = this.isZoomedOut ? 6.5 : 2.2;
                this.myGlobe.pointOfView({ lat: currentPOV.lat, lng: currentPOV.lng, altitude: targetAlt }, 1000);
            }
        });
    }

    animateMoon = () => {
        this.moonPivot.rotation.y += 0.0008;
        this.moonCore.rotation.y -= 0.005;
        this.moonWire.rotation.x += 0.002;
        this.lunarOrbitsGroup.rotation.y += 0.001; 
        requestAnimationFrame(this.animateMoon);
    }

    getOrbitConfig(orbitStr) {
        let alt = 0.15, inc = 42, color = '#00E5FF'; 
        if (orbitStr.includes('GEO')) { alt = 0.6; inc = 0; color = '#FFC857'; } 
        else if (orbitStr.includes('SSO')) { alt = 0.2; inc = 90; color = '#00E5FF'; }
        else if (orbitStr.includes('月球')) { alt = 0.3; inc = 90; color = '#E2E8F0'; } 
        return { alt, inc, color };
    }

    generateOrbitPath(inc, alt) {
        const points = [];
        for (let i = 0; i <= 100; i++) {
            const t = (i / 100) * Math.PI * 2;
            points.push([Math.sin(t) * inc, (t * 180 / Math.PI) - 180, alt]);
        }
        return points;
    }

    // 核心新增：绘制地月转移轨道
    drawEarthToMoonTransfer(color) {
        // 1. 缩小转移轨道的控制点空间微扰动 (仅偏离 +/- 1.5 到 2 的距离)
        const r1 = (Math.random() - 0.5) * 3;
        const r2 = (Math.random() - 0.5) * 4;
        const r3 = (Math.random() - 0.5) * 2;

        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(105, r1 * 0.5, r1 * 0.5),             // LEO 起飞点散布
            new THREE.Vector3(150 + r1, 15 + r2, 60 + r1),          // TLI 注入点散布
            new THREE.Vector3(230 + r2, 30 + r3, -30 + r2),         // 中途修正区散布
            new THREE.Vector3(280, 40 + r3 * 0.5, r3 * 0.5)         // 被月球引力捕获点散布
        ]);

        const points = curve.getPoints(100);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: new THREE.Color(color), linewidth: 2,
            dashSize: 4, gapSize: 6, transparent: true, opacity: 0.4
        });

        const transferLine = new THREE.Line(geometry, material);
        transferLine.computeLineDistances(); 
        this.transferGroup.add(transferLine);

        // 添加探测器光点
        const probeGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const probeMat = new THREE.MeshBasicMaterial({ color: 0xFFC857 }); 
        const probe = new THREE.Mesh(probeGeo, probeMat);
        
        const probeLight = new THREE.PointLight(0xFFC857, 1.5, 50);
        probe.add(probeLight);
        this.transferGroup.add(probe);

        // 2. 赋予随机的转移飞行速度 (缩小差异)
        const flightSpeed = 0.0012 + Math.random() * 0.0004;
        let progress = 0; 
        
        const animateProbe = () => {
            progress += flightSpeed; 
            if (progress > 1) {
                progress = 0; 
            }
            
            const pos = curve.getPointAt(progress);
            probe.position.copy(pos);
            requestAnimationFrame(animateProbe); 
        };
        animateProbe();
    }

    addEventData(item, color, hexToRgba) {
        const isLunar = item.o.includes('月球');
        const { alt, inc } = this.getOrbitConfig(item.o);

        if (isLunar) {
            // 绘制月球轨道
            const radius = 16 + alt * 20; 
            const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(64);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ 
                color: new THREE.Color(color), transparent: true, opacity: 0.6 
            });
            const orbitLine = new THREE.Line(geometry, material);
            
            orbitLine.rotation.x = Math.PI / 2 + (inc * Math.PI / 180);
            orbitLine.rotation.y = Math.random() * Math.PI;
            
            this.lunarOrbitsGroup.add(orbitLine);
            
            // 触发地月转移轨道的绘制与动画
            this.drawEarthToMoonTransfer(color);
            
            // [已删除：切去月球任务时清理地球空间的逻辑]
            
        } else {
            // [已删除：切回地球任务时清理月球转移空间的逻辑]
            
            // 调用三维地球轨道方法直接叠加
            this.drawEarthMission(item, color);
        }
    }

    focusOn(lat, lng, isLunar) {
        const baseAlt = this.isZoomedOut ? 6.5 : (isLunar ? 4.5 : 2.2);
        this.myGlobe.pointOfView({ lat: lat - 5, lng: lng + 10, altitude: baseAlt }, 1200);
    }

    resize(w, h) {
        this.myGlobe.width(w).height(h);
    }
    // 核心新增：绘制逼真的地球发射轨迹与目标轨道
drawEarthMission(item, color) {
        const { alt, inc } = this.getOrbitConfig(item.o);
        
        // 1. 缩小随机扰动变量 (微扰动)
        const altRandom = alt + (Math.random() - 0.5) * 0.03;  // 高度仅波动 +/- 0.015
        const incRandom = inc + (Math.random() - 0.5) * 3;     // 倾角仅波动 +/- 1.5度
        const lngOffset = (Math.random() - 0.5) * 5;           // 注入点经度散布 +/- 2.5度
        const latOffset = (Math.random() - 0.5) * 2;           // 注入点纬度散布 +/- 1度

        // 2. 生成散布的发射轨迹 (微小偏移)
        const startPos = this.myGlobe.getCoords(item.lat, item.lng, 0); 
        const midPos = this.myGlobe.getCoords(
            item.lat + latOffset * 0.3, 
            item.lng + 25 + lngOffset * 0.5, 
            altRandom * 0.5
        );
        const endPos = this.myGlobe.getCoords(
            item.lat + latOffset, 
            item.lng + 50 + lngOffset, 
            altRandom
        );

        const launchCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(startPos.x, startPos.y, startPos.z),
            new THREE.Vector3(midPos.x, midPos.y, midPos.z),
            new THREE.Vector3(endPos.x, endPos.y, endPos.z)
        ]);
        
        const launchGeo = new THREE.BufferGeometry().setFromPoints(launchCurve.getPoints(50));
        const launchMat = new THREE.LineDashedMaterial({
            color: new THREE.Color(color), linewidth: 2,
            dashSize: 2, gapSize: 3, transparent: true, opacity: 0.5
        });
        const launchLine = new THREE.Line(launchGeo, launchMat);
        launchLine.computeLineDistances(); 
        this.earthTrajectoriesGroup.add(launchLine);

        // 3. 生成交织的环绕轨道网
        const orbitRadius = 100 * (1 + altRandom); 
        const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0);
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitCurve.getPoints(100));
        const orbitMat = new THREE.LineDashedMaterial({
            color: new THREE.Color(color), linewidth: 1.5,
            dashSize: 4, gapSize: 6, transparent: true, opacity: 0.25 
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        orbitLine.computeLineDistances();
        
        // 应用微随机倾角和轨道面旋转
        orbitLine.rotation.x = Math.PI / 2 + (incRandom * Math.PI / 180);
        orbitLine.rotation.y = (item.lng + 50 + lngOffset) * Math.PI / 180; 
        orbitLine.rotation.z = (Math.random() - 0.5) * 0.08; // 极轻微的轨道面扭转
        this.earthTrajectoriesGroup.add(orbitLine);

        // 4. 添加探测器与发光效果
        const probeGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const probeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
        const probe = new THREE.Mesh(probeGeo, probeMat);
        
        const probeLight = new THREE.PointLight(new THREE.Color(color), 1.5, 40);
        probe.add(probeLight);
        this.earthTrajectoriesGroup.add(probe);

        // 5. 赋予随机的飞行速度 (保留轻微差异)
        const launchSpeed = 0.0035 + Math.random() * 0.001; 
        const orbitSpeed = 0.0015 + Math.random() * 0.0005;  
        let progress = 0;
        let flightPhase = 'launch'; 

        const animateEarthProbe = () => {
            if (flightPhase === 'launch') {
                progress += launchSpeed; 
                if (progress >= 1) {
                    flightPhase = 'orbit'; 
                    progress = 0;
                } else {
                    const pos = launchCurve.getPointAt(progress);
                    probe.position.copy(pos);
                }
            } else if (flightPhase === 'orbit') {
                progress += orbitSpeed; 
                if (progress > 1) progress = 0;
                
                const pt2d = orbitCurve.getPointAt(progress);
                const pos3d = new THREE.Vector3(pt2d.x, pt2d.y, 0);
                pos3d.applyEuler(orbitLine.rotation); 
                probe.position.copy(pos3d);
            }
            requestAnimationFrame(animateEarthProbe);
        };
        animateEarthProbe();
    }
}
