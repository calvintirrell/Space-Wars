/**
 * Game.js - Main Game Controller
 * Orchestrates all game systems and manages game state
 */
import { Scene } from './Scene.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from '../systems/InputManager.js';
import { CameraController } from '../systems/CameraController.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { SpawnManager } from '../systems/SpawnManager.js';
import { EnemyWeaponSystem } from '../systems/EnemyWeaponSystem.js';
import { Player } from '../entities/Player.js';
import { EnemyPool } from '../entities/Enemy.js';
import { HUD } from '../ui/HUD.js';

export class Game {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.gameLoop = null;
        this.inputManager = null;
        this.cameraController = null;
        this.weaponSystem = null;
        this.particleSystem = null;
        this.collisionSystem = null;
        this.spawnManager = null;
        this.enemyWeaponSystem = null;
        this.enemyPool = null;
        this.player = null;
        this.hud = null;
        this.isRunning = false;

        // Game state
        this.state = {
            score: 0,
            isPaused: false,
            gameOver: false,
            waveMessage: '',
            waveMessageTimer: 0
        };
    }

    /**
     * Initialize all game systems
     */
    async init() {
        console.log('📦 Initializing game systems...');

        // Create input manager first
        this.inputManager = new InputManager();

        // Create the Three.js scene with starfield and lighting
        this.scene = new Scene(this.container);
        await this.scene.init();

        // Create player ship
        this.player = new Player(this.scene, this.inputManager);

        // Create chase camera
        this.cameraController = new CameraController(this.scene.camera, this.player);

        // Create particle system (explosions)
        this.particleSystem = new ParticleSystem(this.scene);

        // Create weapon system
        this.weaponSystem = new WeaponSystem(this.scene, this.player);

        // Create enemy systems - REDUCED POOL SIZE for performance
        this.enemyPool = new EnemyPool(this.scene, 15); // Reduced from 25
        this.enemyWeaponSystem = new EnemyWeaponSystem(this.scene);
        this.spawnManager = new SpawnManager(this.enemyPool, this.player);

        // Wave callbacks
        this.spawnManager.onWaveStart = (wave, message) => {
            this.state.waveMessage = message;
            this.state.waveMessageTimer = 3;
            this.hud.showWaveMessage(message);
        };

        this.spawnManager.onWaveComplete = (wave) => {
            this.state.waveMessage = `WAVE ${wave} COMPLETE!`;
            this.state.waveMessageTimer = 2;
            this.hud.showWaveMessage(`WAVE ${wave} COMPLETE!`);
        };

        // Create collision system
        this.collisionSystem = new CollisionSystem(this.scene, this.particleSystem, this.cameraController);

        // Create HUD
        this.hud = new HUD(this.container);

        // Create the game loop
        this.gameLoop = new GameLoop(this.scene);

        // Register update callback
        this.gameLoop.onUpdate((deltaTime, elapsedTime) => {
            this.update(deltaTime, elapsedTime);
        });

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // Handle visibility change (pause when tab hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });

        // Handle pointer lock changes for HUD hint
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement) {
                this.hud.hideHint();
                // Start first wave when player clicks to start
                if (!this.spawnManager.waveInProgress && this.spawnManager.currentWave === 0) {
                    setTimeout(() => this.spawnManager.startNextWave(), 1000);
                }
            } else {
                this.hud.showHint();
            }
        });

        // DEBUG MODE: Auto-start Wave 1 without waiting for pointer lock
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') {
            console.log('🔧 DEBUG: Auto-starting Wave 1');
            setTimeout(() => {
                if (!this.spawnManager.waveInProgress && this.spawnManager.currentWave === 0) {
                    this.spawnManager.startNextWave();
                }
            }, 1500);
        }

        console.log('✅ Game systems initialized');
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.gameLoop.start();
        console.log('▶️ Game started');
    }

    /**
     * Pause the game
     */
    pause() {
        if (!this.isRunning || this.state.isPaused) return;

        this.state.isPaused = true;
        this.gameLoop.stop();
        console.log('⏸️ Game paused');
    }

    /**
     * Resume the game
     */
    resume() {
        if (!this.isRunning || !this.state.isPaused) return;

        this.state.isPaused = false;
        this.gameLoop.start();
        console.log('▶️ Game resumed');
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.scene) {
            this.scene.handleResize();
        }
    }

    /**
     * Update game state (called each frame by GameLoop)
     */
    update(deltaTime, elapsedTime) {
        if (this.state.gameOver) return;

        // Get aim input for weapons
        const aim = this.inputManager.getAimInput();

        // Update player
        if (this.player) {
            this.player.update(deltaTime);
        }

        // Update weapons
        if (this.weaponSystem) {
            this.weaponSystem.update(deltaTime, aim);
        }

        // Update spawn manager
        if (this.spawnManager) {
            this.spawnManager.update(deltaTime);
        }

        // Update enemies
        const activeEnemies = this.enemyPool.getActive();

        // Debug: log active enemy count periodically - LESS FREQUENT
        if (!this.lastEnemyLog || Date.now() - this.lastEnemyLog > 5000) { // Every 5 seconds instead of 2
            console.log(`🎯 Active enemies: ${activeEnemies.length}, Player pos: (${this.player.position.x.toFixed(0)},${this.player.position.y.toFixed(0)},${this.player.position.z.toFixed(0)})`);
            this.lastEnemyLog = Date.now();
        }

        this.enemyPool.update(deltaTime, this.player.position, (pos, dir, dmg) => {
            this.enemyWeaponSystem.fire(pos, dir, dmg);
        });

        // Update enemy weapons
        if (this.enemyWeaponSystem) {
            this.enemyWeaponSystem.update(deltaTime);
        }

        // Update particle effects
        if (this.particleSystem) {
            this.particleSystem.update(deltaTime);
        }

        // Check collisions - player weapons vs enemies
        if (this.collisionSystem && this.weaponSystem) {
            const playerProjectiles = this.weaponSystem.getActiveProjectiles();
            const results = this.collisionSystem.checkCollisions(
                this.player,
                activeEnemies,
                playerProjectiles
            );

            // Apply collision results
            this.collisionSystem.applyResults(
                results,
                this.player,
                activeEnemies,
                (points) => this.addScore(points)
            );

            // Handle destroyed enemies
            for (const hit of results.enemiesHit) {
                if (hit.enemy.stats.hull <= 0) {
                    hit.enemy.deactivate();
                    this.spawnManager.enemyDestroyed();
                }
            }
        }

        // Check collisions - enemy weapons vs player
        if (this.enemyWeaponSystem) {
            const enemyProjectiles = this.enemyWeaponSystem.getActiveProjectiles();
            this.checkEnemyHitsPlayer(enemyProjectiles);
        }

        // Update camera to follow player
        if (this.cameraController) {
            this.cameraController.update(deltaTime);
        }

        // Update wave message timer
        if (this.state.waveMessageTimer > 0) {
            this.state.waveMessageTimer -= deltaTime;
            if (this.state.waveMessageTimer <= 0) {
                this.hud.hideWaveMessage();
            }
        }

        // Update HUD
        if (this.hud && this.player) {
            const playerState = this.player.getState();
            const weaponState = this.weaponSystem ? this.weaponSystem.getState() : null;
            const waveInfo = this.spawnManager ? this.spawnManager.getWaveInfo() : null;
            this.hud.update(playerState, this.state.score, weaponState, waveInfo);
        }

        // Check for game over
        if (this.player.stats.hull <= 0) {
            this.gameOver();
        }

        // Reset input frame state at end of update
        if (this.inputManager) {
            this.inputManager.resetFrameState();
        }
    }

    /**
     * Check enemy projectiles hitting player
     */
    checkEnemyHitsPlayer(projectiles) {
        const playerRadius = 2;

        for (const laser of projectiles) {
            if (!laser.isActive || laser.owner !== 'enemy') continue;

            const distance = laser.position.distanceTo(this.player.position);
            if (distance < playerRadius) {
                // Hit player
                this.player.takeDamage(laser.damage);
                laser.deactivate();

                // Effects
                this.particleSystem.createHitSpark(laser.position);
                this.cameraController.shake(0.3, 0.15);
            }
        }
    }

    /**
     * Add to score
     */
    addScore(points) {
        this.state.score += points;
    }

    /**
     * Game over
     */
    gameOver() {
        this.state.gameOver = true;
        console.log('💀 Game Over! Final Score:', this.state.score);
        this.hud.showGameOver(this.state.score);
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.gameLoop.stop();

        if (this.player) this.player.dispose();
        if (this.weaponSystem) this.weaponSystem.dispose();
        if (this.enemyPool) this.enemyPool.dispose();
        if (this.enemyWeaponSystem) this.enemyWeaponSystem.dispose();
        if (this.particleSystem) this.particleSystem.dispose();
        if (this.hud) this.hud.dispose();
        if (this.inputManager) this.inputManager.dispose();

        this.scene.dispose();
        this.isRunning = false;
        console.log('🧹 Game disposed');
    }
}


