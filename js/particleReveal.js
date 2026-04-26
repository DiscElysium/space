const THREE = window.THREE;

export class ParticleRevealPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.container.innerHTML = '<div id="particle-reveal-container"></div>';
        this.canvasContainer = document.getElementById('particle-reveal-container');

        this.width = this.container.clientWidth || 380;
        this.height = this.container.clientHeight || 380;

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.canvasContainer.appendChild(this.renderer.domElement);

        this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
        this.camera.position.z = 1;

        this.clock = new THREE.Clock();
        this.animId = null;
        this.entranceDuration = 2.8; 
        this.isEntering = false;
        
        this.sharedUniforms = {
            u_time: { value: 0 },
            u_entrance_progress: { value: 1.0 } 
        };

        /* ==========================================
           第一层：遮罩与光源层 (双通道渲染)
           ========================================== */
        this.maskScene = new THREE.Scene();
        this.maskScene.background = new THREE.Color(0x000000); 
        this.maskTarget = new THREE.WebGLRenderTarget(this.width, this.height);

        // 1. 实心圆区域 -> 专属写入 R 通道 (只负责透明度遮罩)
        const centerMat = new THREE.ShaderMaterial({
            uniforms: this.sharedUniforms,
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `
                uniform float u_entrance_progress;
                varying vec2 vUv;
                void main() {
                    float dist = distance(vUv, vec2(0.5));
                    float maxRadius = 0.32;
                    float currentRadius = maxRadius * u_entrance_progress;
                    float intensity = 1.0 - smoothstep(currentRadius - 0.05, currentRadius, dist);
                    intensity = max(intensity, 1.0 - smoothstep(0.01, 0.02, dist));
                    
                    // 【关键修复】：仅输出到 R 通道
                    gl_FragColor = vec4(intensity, 0.0, 0.0, 1.0);
                }
            `,
            blending: THREE.AdditiveBlending 
        });
        this.maskScene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), centerMat));

        // 2. 汇聚粒子区 -> 专属写入 G 通道 (既作遮罩，又作发光光源)
        this.particleCount = 60000;
        const posArray = new Float32Array(this.particleCount * 3);
        const randArray = new Float32Array(this.particleCount * 4);

        for(let i = 0; i < this.particleCount; i++) {
            posArray[i*3] = 0; posArray[i*3+1] = 0; posArray[i*3+2] = 0;
            randArray[i*4] = Math.random() * Math.PI * 2; 
            randArray[i*4+1] = Math.random() * 0.1; 
            randArray[i*4+2] = 1.0 + Math.random() * 1.5; 
            randArray[i*4+3] = Math.random(); 
        }

        const pointsGeo = new THREE.BufferGeometry();
        pointsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        pointsGeo.setAttribute('a_rand', new THREE.BufferAttribute(randArray, 4));

        const pointsMat = new THREE.ShaderMaterial({
            uniforms: this.sharedUniforms,
            vertexShader: `
                uniform float u_time;
                uniform float u_entrance_progress;
                attribute vec4 a_rand; 
                varying float vAlpha;

                void main() {
                    float angle = a_rand.x;
                    float targetRadiusOffset = a_rand.y;
                    float speed = a_rand.z;
                    float phaseOffset = a_rand.w;

                    float life = fract(u_time * 0.3 * speed + phaseOffset);

                    float spawnRadius = 0.5; 
                    float finalStopRadius = 0.32 * u_entrance_progress + targetRadiusOffset;
                    
                    float currentRadius = finalStopRadius + (1.0 - life) * (spawnRadius - finalStopRadius);

                    vec3 pos = vec3(cos(angle) * currentRadius, sin(angle) * currentRadius, 0.0);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    
                    gl_PointSize = 1.2 * (1.0 - life * 0.2); 

                    float visibility = life * life;
                    visibility *= (1.0 - smoothstep(0.95, 1.0, life));

                    float currentIntensity = mix(0.12, 0.25, (1.0 - smoothstep(0.8, 1.0, u_entrance_progress)));
                    vAlpha = visibility * currentIntensity; 
                    
                    float clearZone = 0.1 * u_entrance_progress;
                    vAlpha *= smoothstep(clearZone, clearZone + 0.05, currentRadius);
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                void main() {
                    vec2 pt = gl_PointCoord - vec2(0.5);
                    if(length(pt) > 0.5) discard;
                    
                    // 【关键修复】：仅输出到 G 通道
                    gl_FragColor = vec4(0.0, vAlpha, 0.0, 1.0); 
                }
            `,
            blending: THREE.AdditiveBlending, 
            depthWrite: false,
            transparent: true
        });

        this.maskParticles = new THREE.Points(pointsGeo, pointsMat);
        this.maskScene.add(this.maskParticles);

        /* ==========================================
           第二层：主视觉层 (合成发光层)
           ========================================== */
        this.mainScene = new THREE.Scene();
        this.textureLoader = new THREE.TextureLoader();

        this.mainMat = new THREE.ShaderMaterial({
            uniforms: {
                u_image: { value: null },
                u_mask: { value: this.maskTarget.texture },
                u_entrance_progress: this.sharedUniforms.u_entrance_progress
            },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `
                uniform sampler2D u_image;
                uniform sampler2D u_mask;
                uniform float u_entrance_progress;
                varying vec2 vUv;
                
                void main() {
                    vec4 imgColor = texture2D(u_image, vUv);
                    vec4 maskData = texture2D(u_mask, vUv);
                    
                    // 分离读取：R是实心渐变，G是粒子密度
                    float circleAlpha = maskData.r;
                    float particleAlpha = maskData.g;
                    
                    // 1. 基础透明度：由实心圆和粒子共同决定，揭示图片
                    float combinedAlpha = clamp(circleAlpha + particleAlpha, 0.0, 1.0);
                    float entryGlobalAlpha = smoothstep(0.0, 0.08, u_entrance_progress);
                    
                    vec3 finalRGB = imgColor.rgb;
                    
                    // 2. 【发光提亮核心】：强制叠加在图片上方
                    // 取纯白与原图的混合色作为粒子的发光颜色，这样粒子带一点图片的主色调，边缘融合极佳
                    vec3 particleGlowColor = mix(vec3(1.0), imgColor.rgb, 0.4); 
                    
                    // 叠加发光。无论实心圆是否已经100%不透明，粒子都会在这之上额外发光！
                    finalRGB += particleGlowColor * particleAlpha * 1.5;
                    
                    gl_FragColor = vec4(finalRGB, imgColor.a * combinedAlpha * entryGlobalAlpha);
                }
            `,
            transparent: true
        });

        this.mainScene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mainMat));
    }

    updateImage(imageUrl) {
        if (!imageUrl) {
            this.container.classList.remove('active');
            this.stopAnimate();
            return;
        }

        this.sharedUniforms.u_entrance_progress.value = 0.0;
        this.isEntering = false; 

        this.textureLoader.load(imageUrl, (texture) => {
            this.mainMat.uniforms.u_image.value = texture;
            this.container.classList.add('active');
            this.startAnimate(); 
            this.startEntranceAnimation();
        });
    }

    hide() {
        this.container.classList.remove('active');
        this.stopAnimate();
    }

    startEntranceAnimation() {
        this.isEntering = true;
        this.entranceStartTime = this.clock.getElapsedTime();
    }

    startAnimate() { if(!this.animId) this.animate(); }

    stopAnimate() {
        if(this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    }

    animate = () => {
        this.animId = requestAnimationFrame(this.animate);
        
        const elapsedTime = this.clock.getElapsedTime();
        this.sharedUniforms.u_time.value = elapsedTime;

        if (this.isEntering) {
            const currentEntranceTime = elapsedTime - this.entranceStartTime;
            let progress = currentEntranceTime / this.entranceDuration;

            if (progress >= 1.0) {
                progress = 1.0;
                this.isEntering = false; 
            }
            
            this.sharedUniforms.u_entrance_progress.value = THREE.MathUtils.smoothstep(progress, 0.0, 1.0);
        } else {
            this.sharedUniforms.u_entrance_progress.value = 1.0;
        }

        this.renderer.setRenderTarget(this.maskTarget);
        this.renderer.clear();
        this.renderer.render(this.maskScene, this.camera);

        this.renderer.setRenderTarget(null);
        this.renderer.clear();
        this.renderer.render(this.mainScene, this.camera);
    }
}