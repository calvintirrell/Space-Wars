/**
 * CollisionSystem.js - Hit Detection
 * Bounding sphere collision detection for projectiles and ships
 */
import * as THREE from 'three';

export class CollisionSystem {
    constructor(scene, particleSystem, cameraController) {
        this.scene = scene;
        this.particleSystem = particleSystem;
        this.cameraController = cameraController;

        // Collision radii
        this.playerRadius = 2;
        this.enemyRadius = 1.5;
        this.asteroidRadius = 3;
    }

    /**
     * Check all collisions
     */
    checkCollisions(player, enemies, projectiles) {
        const results = {
            playerHit: false,
            enemiesHit: [],
            playerDamage: 0
        };

        // Check player lasers hitting enemies
        for (const laser of projectiles.lasers) {
            if (!laser.isActive || laser.owner !== 'player') continue;

            for (const enemy of enemies) {
                if (!enemy.isActive) continue;

                const distance = laser.position.distanceTo(enemy.position);
                if (distance < this.enemyRadius) {
                    // Hit!
                    results.enemiesHit.push({
                        enemy: enemy,
                        damage: laser.damage,
                        position: laser.position.clone()
                    });

                    // Deactivate laser
                    laser.deactivate();

                    // Create hit spark
                    this.particleSystem.createHitSpark(laser.position);

                    break;
                }
            }
        }

        // Check player missiles hitting enemies
        for (const missile of projectiles.missiles) {
            if (!missile.isActive || missile.owner !== 'player') continue;

            for (const enemy of enemies) {
                if (!enemy.isActive) continue;

                const distance = missile.position.distanceTo(enemy.position);
                if (distance < this.enemyRadius + 0.5) {
                    // Hit!
                    results.enemiesHit.push({
                        enemy: enemy,
                        damage: missile.damage,
                        position: missile.position.clone()
                    });

                    // Deactivate missile
                    missile.deactivate();

                    // Create bigger explosion
                    this.particleSystem.createExplosion(missile.position, 1.5);

                    // Camera shake
                    if (this.cameraController) {
                        this.cameraController.shake(0.3, 0.2);
                    }

                    break;
                }
            }
        }

        // Check enemy projectiles hitting player
        // (Will be implemented when enemies are added)

        return results;
    }

    /**
     * Check if a point is within player bounds
     */
    checkPlayerHit(position, radius = 0.5) {
        // Simplified for now
        return false;
    }

    /**
     * Apply collision results
     */
    applyResults(results, player, enemies, addScore) {
        // Apply damage to enemies
        for (const hit of results.enemiesHit) {
            hit.enemy.takeDamage(hit.damage);

            // If enemy destroyed, add score and create explosion
            if (hit.enemy.stats.hull <= 0) {
                this.particleSystem.createExplosion(hit.enemy.position, 2);

                if (this.cameraController) {
                    this.cameraController.shake(0.5, 0.3);
                }

                if (addScore) {
                    addScore(hit.enemy.scoreValue || 100);
                }
            }
        }

        // Apply damage to player
        if (results.playerDamage > 0) {
            player.takeDamage(results.playerDamage);

            if (this.cameraController) {
                this.cameraController.shake(0.4, 0.2);
            }
        }
    }
}
