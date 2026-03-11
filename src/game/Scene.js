/**
 * Scene.js - Three.js Scene Manager
 * Handles the 3D scene, camera, renderer, lighting, and starfield
 */
import * as THREE from 'three';

export class Scene {
    constructor(container) {
        this.container = container;

        // Three.js core objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Scene elements
        this.starfield = null;
        this.ambientLight = null;
        this.directionalLight = null;

        // Camera settings
        this.cameraSettings = {
            fov: 75,
            near: 0.1,
            far: 10000,
            position: new THREE.Vector3(0, 5, 15)
        };
    }

    /**
     * Initialize the Three.js scene
     */
    async init() {
        this.createRenderer();
        this.createScene();
        this.createCamera();
        this.createLighting();
        this.createStarfield();

        // Initial render
        this.render();

        console.log('🌌 Scene initialized');
    }

    /**
     * Create the WebGL renderer - PERFORMANCE OPTIMIZED
     */
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: false, // Disabled for performance
            alpha: false,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Reduced from 2
        this.renderer.setClearColor(0x0a1628, 1);
        
        // Disable shadows for performance
        this.renderer.shadowMap.enabled = false;

        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Create the scene
     */
    createScene() {
        this.scene = new THREE.Scene();

        // Add subtle fog for depth - matched to brighter background
        this.scene.fog = new THREE.FogExp2(0x0a1628, 0.00006);
    }

    /**
     * Create the camera
     */
    createCamera() {
        const aspect = window.innerWidth / window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(
            this.cameraSettings.fov,
            aspect,
            this.cameraSettings.near,
            this.cameraSettings.far
        );

        this.camera.position.copy(this.cameraSettings.position);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Create scene lighting - SIMPLIFIED for performance
     */
    createLighting() {
        // Ambient light - brighter since no shadows
        this.ambientLight = new THREE.AmbientLight(0x1a1a3a, 0.8); // Increased from 0.4
        this.scene.add(this.ambientLight);

        // Main directional light - no shadows
        this.directionalLight = new THREE.DirectionalLight(0xfff5e6, 1.0); // Reduced from 1.2
        this.directionalLight.position.set(100, 50, 50);
        // Shadow settings removed for performance

        this.scene.add(this.directionalLight);

        // Simplified fill light
        const fillLight = new THREE.DirectionalLight(0x4a6fa5, 0.2); // Reduced from 0.3
        fillLight.position.set(-50, -20, -50);
        this.scene.add(fillLight);
    }

    /**
     * Create the starfield background - STATIC VERSION for performance
     */
    createStarfield() {
        const starCount = 5000; // Reduced from 15000
        const starGeometry = new THREE.BufferGeometry();

        // Create star positions
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        // Simplified star colors - fewer variations
        const starColors = [
            new THREE.Color(0xffffff), // White
            new THREE.Color(0xaaccff), // Blue-white
        ];

        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;

            // Distribute stars in a large sphere around the origin
            const radius = 1000 + Math.random() * 4000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);

            // Random star color - simplified
            const color = starColors[Math.random() < 0.8 ? 0 : 1];
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Simple point material instead of complex shader
        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        this.starfield = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starfield);
    }

    /**
     * Update scene elements - STATIC STARFIELD for performance
     */
    update(deltaTime, elapsedTime) {
        // Starfield is now static - no rotation for better performance
        // All starfield animations removed
    }

    /**
     * Render the scene
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Dispose starfield
        if (this.starfield) {
            this.starfield.geometry.dispose();
            this.starfield.material.dispose();
        }

        // Dispose renderer
        this.renderer.dispose();

        // Remove canvas from DOM
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}
