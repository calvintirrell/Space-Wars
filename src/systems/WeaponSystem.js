/**
 * WeaponSystem.js - Player Weapon Management
 * Handles firing lasers and missiles
 */
import * as THREE from 'three';
import { LaserBolt, Missile, ProjectilePool } from '../entities/Projectile.js';

export class WeaponSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Projectile pools
        this.laserPool = new ProjectilePool(scene, LaserBolt, 50, 0xff0000); // Red lasers
        this.missilePool = new ProjectilePool(scene, Missile, 10);

        // Weapon stats
        this.laserCooldown = 0.12; // seconds between shots
        this.missileCooldown = 1.5;
        this.lastLaserTime = 0;
        this.lastMissileTime = 0;

        // Ammo
        this.missileCount = 6;
        this.maxMissiles = 6;

        // Muzzle positions (relative to ship, matching wing cannons)
        this.muzzlePositions = [
            new THREE.Vector3(4.2, 0.7, 1.5),   // Top right
            new THREE.Vector3(-4.2, 0.7, 1.5),  // Top left
            new THREE.Vector3(4.2, -0.7, 1.5),  // Bottom right
            new THREE.Vector3(-4.2, -0.7, 1.5), // Bottom left
        ];
        this.currentMuzzle = 0;

        // Audio (will be connected later)
        this.laserSound = null;
        this.missileSound = null;
    }

    /**
     * Update weapon system
     */
    update(deltaTime, aim) {
        const currentTime = performance.now() / 1000;

        // Fire laser
        if (aim.fire && currentTime - this.lastLaserTime >= this.laserCooldown) {
            this.fireLaser();
            this.lastLaserTime = currentTime;
        }

        // Fire missile
        if (aim.missile && currentTime - this.lastMissileTime >= this.missileCooldown) {
            if (this.missileCount > 0) {
                this.fireMissile();
                this.lastMissileTime = currentTime;
            }
        }

        // Update projectiles
        this.laserPool.update(deltaTime);
        this.missilePool.update(deltaTime);
    }

    /**
     * Fire a laser bolt
     */
    fireLaser() {
        const laser = this.laserPool.get();
        if (!laser) return;

        // Get muzzle position in world space
        const muzzleLocal = this.muzzlePositions[this.currentMuzzle];
        const muzzleWorld = muzzleLocal.clone();
        muzzleWorld.applyQuaternion(this.player.quaternion);
        muzzleWorld.add(this.player.position);

        // Get forward direction
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.player.quaternion);

        // Activate laser
        laser.activate(muzzleWorld, forward, 'player');

        // Cycle muzzles for alternating fire
        this.currentMuzzle = (this.currentMuzzle + 1) % this.muzzlePositions.length;

        // Play sound (future)
        // this.playLaserSound();
    }

    /**
     * Fire a homing missile
     */
    fireMissile(target = null) {
        const missile = this.missilePool.get();
        if (!missile) return;

        // Launch from center-bottom of ship
        const launchPos = new THREE.Vector3(0, -0.5, 2);
        launchPos.applyQuaternion(this.player.quaternion);
        launchPos.add(this.player.position);

        // Get forward direction
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.player.quaternion);

        // Activate missile
        missile.activate(launchPos, forward, 'player', target);

        // Consume ammo
        this.missileCount--;

        // Play sound (future)
        // this.playMissileSound();
    }

    /**
     * Get all active projectiles for collision detection
     */
    getActiveProjectiles() {
        return {
            lasers: this.laserPool.getActiveProjectiles(),
            missiles: this.missilePool.getActiveProjectiles()
        };
    }

    /**
     * Get weapon state for HUD
     */
    getState() {
        return {
            missileCount: this.missileCount,
            maxMissiles: this.maxMissiles
        };
    }

    /**
     * Reload missiles (pickup or respawn)
     */
    reloadMissiles(amount = this.maxMissiles) {
        this.missileCount = Math.min(this.missileCount + amount, this.maxMissiles);
    }

    /**
     * Clean up
     */
    dispose() {
        this.laserPool.dispose();
        this.missilePool.dispose();
    }
}
