/**
 * EnemyWeaponSystem.js - Enemy Laser Projectiles
 * Handles enemy firing with green lasers (distinct from player red)
 */
import * as THREE from 'three';
import { LaserBolt, ProjectilePool } from '../entities/Projectile.js';

export class EnemyWeaponSystem {
    constructor(scene) {
        this.scene = scene;

        // Green laser pool for enemies
        this.laserPool = new ProjectilePool(scene, LaserBolt, 100, 0x00ff00);
    }

    /**
     * Fire laser from enemy position
     */
    fire(position, direction, damage) {
        const laser = this.laserPool.get();
        if (!laser) return;

        laser.damage = damage;
        laser.activate(position, direction, 'enemy');
    }

    /**
     * Update all enemy projectiles
     */
    update(deltaTime) {
        this.laserPool.update(deltaTime);
    }

    /**
     * Get active enemy projectiles
     */
    getActiveProjectiles() {
        return this.laserPool.getActiveProjectiles();
    }

    /**
     * Clean up
     */
    dispose() {
        this.laserPool.dispose();
    }
}
