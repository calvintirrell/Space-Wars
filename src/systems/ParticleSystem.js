/**
 * ParticleSystem.js - Explosions and Visual Effects
 * Object pooled particle effects for performance
 */
import * as THREE from 'three';

/**
 * Single explosion effect
 */
class Explosion {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.particles = null;
        this.light = null;
        this.lifetime = 0;
        this.maxLifetime = 0.8;
        this.position = new THREE.Vector3();
        this.scale = 1;

        this.create();
    }

    create() {
        // Simplified particle system for better performance
        const particleCount = 20; // Reduced from 50
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        // Initialize particles in a sphere
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Random direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = 5 + Math.random() * 15;

            velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
            velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
            velocities[i3 + 2] = Math.cos(phi) * speed;

            // Orange to red gradient
            const t = Math.random();
            colors[i3] = 1.0; // R
            colors[i3 + 1] = 0.3 + t * 0.4; // G
            colors[i3 + 2] = 0.0; // B
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Store velocities for animation
        this.velocities = velocities;

        // Simple point material instead of complex shader
        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geometry, material);
        this.particles.visible = false;
        this.scene.scene.add(this.particles);

        // Simplified light - no dynamic light for performance
        this.light = new THREE.PointLight(0xff6600, 0, 10);
        this.scene.scene.add(this.light);
    }

    activate(position, scale = 1) {
        this.position.copy(position);
        this.scale = scale;
        this.lifetime = 0;
        this.isActive = true;

        // Reset particle positions
        const positions = this.particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i++) {
            positions[i] = 0;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;

        // Position and show
        this.particles.position.copy(position);
        this.particles.visible = true;

        this.light.position.copy(position);
        this.light.intensity = 3 * scale;
    }

    deactivate() {
        this.isActive = false;
        this.particles.visible = false;
        this.light.intensity = 0;
    }

    update(deltaTime) {
        if (!this.isActive) return;

        this.lifetime += deltaTime;
        const progress = this.lifetime / this.maxLifetime;

        if (progress >= 1) {
            this.deactivate();
            return;
        }

        // Update particle positions less frequently for performance
        if (this.lifetime % 0.05 < deltaTime) { // Update every ~3 frames at 60fps
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                const i3 = i * 3;
                positions[i3] += this.velocities[i3] * deltaTime * this.scale * 3; // Compensate for less frequent updates
                positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime * this.scale * 3;
                positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime * this.scale * 3;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }

        // Simplified opacity fade
        this.particles.material.opacity = (1 - progress) * 0.8;

        // Simplified light fade - less frequent updates
        if (this.lifetime % 0.1 < deltaTime) { // Update every ~6 frames
            this.light.intensity = (1 - progress) * 2 * this.scale;
        }
    }

    dispose() {
        this.scene.scene.remove(this.particles);
        this.scene.scene.remove(this.light);
        this.particles.geometry.dispose();
        this.particles.material.dispose();
    }
}

/**
 * Particle System Manager
 */
export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;

        // Explosion pool
        this.explosions = [];
        const explosionPoolSize = 20;

        for (let i = 0; i < explosionPoolSize; i++) {
            this.explosions.push(new Explosion(scene));
        }
    }

    /**
     * Create explosion at position
     */
    createExplosion(position, scale = 1) {
        // Find inactive explosion
        for (const explosion of this.explosions) {
            if (!explosion.isActive) {
                explosion.activate(position, scale);
                return explosion;
            }
        }
        return null;
    }

    /**
     * Create small hit spark
     */
    createHitSpark(position) {
        return this.createExplosion(position, 0.3);
    }

    /**
     * Update all particles
     */
    update(deltaTime) {
        for (const explosion of this.explosions) {
            explosion.update(deltaTime);
        }
    }

    /**
     * Clean up
     */
    dispose() {
        for (const explosion of this.explosions) {
            explosion.dispose();
        }
        this.explosions = [];
    }
}
