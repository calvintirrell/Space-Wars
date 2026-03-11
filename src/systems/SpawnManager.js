/**
 * SpawnManager.js - Wave-Based Enemy Spawning
 * Manages enemy waves, difficulty progression, and spawn patterns
 */
import * as THREE from 'three';

export class SpawnManager {
    constructor(enemyPool, playerRef) {
        this.enemyPool = enemyPool;
        this.player = playerRef;

        // Wave state
        this.currentWave = 0;
        this.enemiesRemaining = 0;
        this.enemiesSpawnedThisWave = 0;
        this.waveInProgress = false;

        // Spawning config - closer spawning for more aggressive engagement
        this.spawnDistance = 60;  // Reduced from 80 - spawn closer for immediate engagement
        this.spawnDelay = 1.5;    // Seconds between spawns
        this.timeSinceLastSpawn = 0;

        // Wave definitions
        this.waveConfigs = this.createWaveConfigs();

        // Callbacks
        this.onWaveStart = null;
        this.onWaveComplete = null;
        this.onAllWavesComplete = null;
    }

    /**
     * Create wave configurations
     */
    createWaveConfigs() {
        return [
            // Wave 1: Tutorial - few slow enemies
            {
                enemies: [
                    { type: 'fighter', count: 2 } // Reduced from 3
                ],
                spawnDelay: 1.0,  // Increased from 0.5
                message: 'WAVE 1 - INCOMING HOSTILES'
            },

            // Wave 2: More fighters
            {
                enemies: [
                    { type: 'fighter', count: 3 } // Reduced from 5
                ],
                spawnDelay: 2.0, // Increased from 1.5
                message: 'WAVE 2 - ENEMY REINFORCEMENTS'
            },

            // Wave 3: Mixed enemies
            {
                enemies: [
                    { type: 'fighter', count: 3 }, // Reduced from 4
                    { type: 'interceptor', count: 1 } // Reduced from 2
                ],
                spawnDelay: 2.0, // Increased from 1.2
                message: 'WAVE 3 - INTERCEPTORS DETECTED'
            },

            // Wave 4: Bomber introduction
            {
                enemies: [
                    { type: 'fighter', count: 3 }, // Reduced from 4
                    { type: 'bomber', count: 1 }
                ],
                spawnDelay: 2.5, // Increased from 1.5
                message: 'WAVE 4 - BOMBER INBOUND'
            },

            // Wave 5: Full assault
            {
                enemies: [
                    { type: 'fighter', count: 4 }, // Reduced from 6
                    { type: 'interceptor', count: 2 }, // Reduced from 3
                    { type: 'bomber', count: 1 } // Reduced from 2
                ],
                spawnDelay: 1.5, // Increased from 1.0
                message: 'WAVE 5 - FULL ASSAULT'
            },

            // Wave 6+: Endless with scaling difficulty
            {
                enemies: [
                    { type: 'fighter', count: 5 }, // Reduced from 8
                    { type: 'interceptor', count: 2 }, // Reduced from 4
                    { type: 'bomber', count: 1 } // Reduced from 2
                ],
                spawnDelay: 1.2, // Increased from 0.8
                message: 'WAVE 6 - THEY KEEP COMING!'
            }
        ];
    }

    /**
     * Start the next wave
     */
    startNextWave() {
        this.currentWave++;
        this.waveInProgress = true;
        this.enemiesSpawnedThisWave = 0;
        this.timeSinceLastSpawn = 0;

        // Get wave config (loop last wave for endless mode)
        const waveIndex = Math.min(this.currentWave - 1, this.waveConfigs.length - 1);
        const config = this.waveConfigs[waveIndex];

        // Scale difficulty for waves beyond defined ones
        let scaleFactor = 1;
        if (this.currentWave > this.waveConfigs.length) {
            scaleFactor = 1 + (this.currentWave - this.waveConfigs.length) * 0.2;
        }

        // Calculate total enemies
        this.enemiesRemaining = 0;
        this.spawnQueue = [];

        for (const group of config.enemies) {
            const count = Math.floor(group.count * scaleFactor);
            this.enemiesRemaining += count;

            for (let i = 0; i < count; i++) {
                this.spawnQueue.push(group.type);
            }
        }

        // Shuffle spawn queue for variety
        this.shuffleArray(this.spawnQueue);

        this.spawnDelay = config.spawnDelay;

        // Trigger callback
        if (this.onWaveStart) {
            this.onWaveStart(this.currentWave, config.message);
        }

        console.log(`🌊 Wave ${this.currentWave} started: ${this.enemiesRemaining} enemies`);
    }

    /**
     * Update spawning
     */
    update(deltaTime) {
        if (!this.waveInProgress) return;

        // Check if wave complete
        const activeEnemies = this.enemyPool.getActive();
        if (this.spawnQueue.length === 0 && activeEnemies.length === 0) {
            this.completeWave();
            return;
        }

        // Spawn enemies from queue
        if (this.spawnQueue.length > 0) {
            this.timeSinceLastSpawn += deltaTime;

            if (this.timeSinceLastSpawn >= this.spawnDelay) {
                this.spawnEnemy(this.spawnQueue.shift());
                this.timeSinceLastSpawn = 0;
            }
        }
    }

    /**
     * Spawn a single enemy - spawns in front of player for visibility
     */
    spawnEnemy(type) {
        const enemy = this.enemyPool.get(type);
        if (!enemy) return;

        // Get player's forward direction
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.player.quaternion);

        // Calculate spawn position - primarily in front with some spread
        const playerPos = this.player.position.clone();

        // Angle offset from forward direction (tighter cone for more direct engagement)
        const angleOffset = (Math.random() - 0.5) * Math.PI * 0.4; // Reduced from 0.66 - tighter 72 degree cone
        const elevation = (Math.random() - 0.5) * 0.2; // Reduced vertical variation

        // Rotate forward vector by angle offset (around Y axis)
        const spawnDir = forward.clone();
        const rotationMatrix = new THREE.Matrix4().makeRotationY(angleOffset);
        spawnDir.applyMatrix4(rotationMatrix);

        // Calculate spawn position
        const spawnPos = playerPos.clone();
        spawnPos.add(spawnDir.multiplyScalar(this.spawnDistance));
        spawnPos.y += elevation * this.spawnDistance * 0.5;

        // Activate enemy
        enemy.activate(spawnPos, this.player);
        this.enemiesSpawnedThisWave++;

        console.log(`👾 Enemy spawned at distance ${this.spawnDistance}, type: ${type}`);
    }

    /**
     * Complete current wave
     */
    completeWave() {
        this.waveInProgress = false;

        console.log(`✅ Wave ${this.currentWave} complete!`);

        if (this.onWaveComplete) {
            this.onWaveComplete(this.currentWave);
        }

        // Auto-start next wave after delay
        setTimeout(() => {
            this.startNextWave();
        }, 3000);
    }

    /**
     * Notify that an enemy was destroyed
     */
    enemyDestroyed() {
        this.enemiesRemaining--;
    }

    /**
     * Get current wave info for HUD
     */
    getWaveInfo() {
        return {
            wave: this.currentWave,
            enemiesRemaining: this.enemyPool.getActive().length,
            waveInProgress: this.waveInProgress
        };
    }

    /**
     * Shuffle array in place
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Reset to wave 1
     */
    reset() {
        this.currentWave = 0;
        this.waveInProgress = false;
        this.spawnQueue = [];

        // Deactivate all enemies
        for (const enemy of this.enemyPool.getActive()) {
            enemy.deactivate();
        }
    }
}
