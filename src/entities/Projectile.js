/**
 * Projectile.js - Laser and Missile Projectiles
 * Object pooling for performance, collision detection
 */
import * as THREE from 'three';

/**
 * Base Projectile class
 */
class Projectile {
    constructor() {
        this.mesh = null;
        this.velocity = new THREE.Vector3();
        this.position = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.isActive = false;
        this.lifetime = 0;
        this.maxLifetime = 3; // seconds
        this.damage = 10;
        this.owner = null; // 'player' or 'enemy'
    }

    activate(position, direction, owner) {
        this.position.copy(position);
        this.direction.copy(direction).normalize();
        this.owner = owner;
        this.lifetime = 0;
        this.isActive = true;

        if (this.mesh) {
            this.mesh.position.copy(position);
            this.mesh.visible = true;
        }
    }

    deactivate() {
        this.isActive = false;
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }

    update(deltaTime) {
        if (!this.isActive) return;

        this.lifetime += deltaTime;
        if (this.lifetime >= this.maxLifetime) {
            this.deactivate();
            return;
        }
    }
}

/**
 * Laser bolt projectile
 */
export class LaserBolt extends Projectile {
    constructor(scene, color = 0xff0000) {
        super();
        this.scene = scene;
        this.speed = 90;        // Was 180 - VERY SLOW for testing
        this.damage = 15;
        this.maxLifetime = 5;   // Was 3 - even longer lifetime

        this.createMesh(color);
    }

    createMesh(color) {
        // Simplified laser bolt - just a basic cylinder without glow or lights
        const geometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 6); // Reduced segments from 8 to 6
        geometry.rotateX(Math.PI / 2);

        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.visible = false;

        // No glow effect or point light for performance
        this.scene.scene.add(this.mesh);
    }

    update(deltaTime) {
        if (!this.isActive) return;

        super.update(deltaTime);
        if (!this.isActive) return;

        // Move laser
        this.velocity.copy(this.direction).multiplyScalar(this.speed * deltaTime);
        this.position.add(this.velocity);

        // Update mesh position only (skip expensive lookAt)
        this.mesh.position.copy(this.position);
        
        // Simple rotation instead of lookAt for performance
        this.mesh.rotation.setFromVector3(this.direction);
    }

    dispose() {
        if (this.mesh) {
            this.scene.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}

/**
 * Homing missile projectile
 */
export class Missile extends Projectile {
    constructor(scene) {
        super();
        this.scene = scene;
        this.speed = 40;        // Was 80 - VERY SLOW for testing
        this.turnSpeed = 0.8;   // Was 1.5 - slower turning
        this.damage = 50;
        this.maxLifetime = 12;  // Was 8 - even longer lifetime
        this.target = null;
        this.trail = null;
        this.trailPositions = [];

        this.createMesh();
        this.createTrail();
    }

    createMesh() {
        // Missile body
        const bodyGeometry = new THREE.ConeGeometry(0.15, 1, 8);
        bodyGeometry.rotateX(Math.PI / 2);

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.3
        });

        this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.visible = false;

        // Fins
        const finGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.2);
        const finMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            metalness: 0.6,
            roughness: 0.4
        });

        const fin1 = new THREE.Mesh(finGeometry, finMaterial);
        fin1.position.set(0, 0, -0.3);
        this.mesh.add(fin1);

        const fin2 = new THREE.Mesh(finGeometry.clone(), finMaterial);
        fin2.rotation.z = Math.PI / 2;
        fin2.position.set(0, 0, -0.3);
        this.mesh.add(fin2);

        // Engine glow
        const glowGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 0, -0.5);
        this.mesh.add(glow);

        this.scene.scene.add(this.mesh);
    }

    createTrail() {
        // Particle trail for missile
        const trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(60 * 3); // 60 trail points
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.6
        });

        this.trail = new THREE.Line(trailGeometry, trailMaterial);
        this.trail.visible = false;
        this.scene.scene.add(this.trail);
    }

    activate(position, direction, owner, target = null) {
        super.activate(position, direction, owner);
        this.target = target;
        this.trailPositions = [];

        if (this.trail) {
            this.trail.visible = true;
        }
    }

    deactivate() {
        super.deactivate();
        if (this.trail) {
            this.trail.visible = false;
        }
        this.target = null;
    }

    update(deltaTime) {
        if (!this.isActive) return;

        super.update(deltaTime);
        if (!this.isActive) return;

        // Homing behavior
        if (this.target && this.target.isActive !== false) {
            const targetPos = this.target.position || this.target;
            const toTarget = new THREE.Vector3().subVectors(targetPos, this.position).normalize();

            // Gradually turn toward target
            this.direction.lerp(toTarget, this.turnSpeed * deltaTime);
            this.direction.normalize();
        }

        // Move missile
        this.velocity.copy(this.direction).multiplyScalar(this.speed * deltaTime);
        this.position.add(this.velocity);

        // Update mesh
        this.mesh.position.copy(this.position);
        this.mesh.lookAt(this.position.clone().add(this.direction));

        // Update trail
        this.updateTrail();
    }

    updateTrail() {
        // Add current position to trail
        this.trailPositions.unshift(this.position.clone());

        // Limit trail length
        if (this.trailPositions.length > 60) {
            this.trailPositions.pop();
        }

        // Update trail geometry
        const positions = this.trail.geometry.attributes.position.array;
        for (let i = 0; i < this.trailPositions.length; i++) {
            const pos = this.trailPositions[i];
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;
        }

        // Zero out unused positions
        for (let i = this.trailPositions.length; i < 60; i++) {
            positions[i * 3] = positions[(this.trailPositions.length - 1) * 3] || 0;
            positions[i * 3 + 1] = positions[(this.trailPositions.length - 1) * 3 + 1] || 0;
            positions[i * 3 + 2] = positions[(this.trailPositions.length - 1) * 3 + 2] || 0;
        }

        this.trail.geometry.attributes.position.needsUpdate = true;
    }

    dispose() {
        if (this.mesh) {
            this.scene.scene.remove(this.mesh);
            this.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        if (this.trail) {
            this.scene.scene.remove(this.trail);
            this.trail.geometry.dispose();
            this.trail.material.dispose();
        }
    }
}

/**
 * Projectile Pool - Object pooling for performance
 */
export class ProjectilePool {
    constructor(scene, ProjectileClass, poolSize, ...args) {
        this.pool = [];
        this.scene = scene;

        // Pre-create projectiles
        for (let i = 0; i < poolSize; i++) {
            const projectile = new ProjectileClass(scene, ...args);
            this.pool.push(projectile);
        }
    }

    get() {
        // Find inactive projectile
        for (const projectile of this.pool) {
            if (!projectile.isActive) {
                return projectile;
            }
        }
        return null; // Pool exhausted
    }

    update(deltaTime) {
        for (const projectile of this.pool) {
            projectile.update(deltaTime);
        }
    }

    getActiveProjectiles() {
        return this.pool.filter(p => p.isActive);
    }

    dispose() {
        for (const projectile of this.pool) {
            projectile.dispose();
        }
        this.pool = [];
    }
}
