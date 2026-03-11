/**
 * Player.js - Player Ship Entity
 * X-wing inspired spacecraft with flight physics and controls
 */
import * as THREE from 'three';

export class Player {
    constructor(scene, inputManager) {
        this.scene = scene;
        this.inputManager = inputManager;

        // Ship mesh and group
        this.mesh = null;
        this.group = new THREE.Group();

        // Physics state
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.quaternion = new THREE.Quaternion();

        // Ship stats - BALANCED for combat
        this.stats = {
            maxSpeed: 30,
            boostSpeed: 50,
            acceleration: 15,
            deceleration: 10,
            brakePower: 25,
            pitchSpeed: 0.8,    // Was 0.4 - doubled for tighter turns
            rollSpeed: 0.6,
            yawSpeed: 0.6,      // Was 0.3 - doubled for tighter turns

            // Combat stats
            maxShields: 100,
            maxHull: 100,
            shields: 100,
            hull: 100,
            shieldRegenRate: 5,
            shieldRegenDelay: 3
        };

        // Current state
        this.currentSpeed = 0;
        this.targetSpeed = 50; // Initial cruise speed
        this.isBoosting = false;
        this.lastHitTime = 0;

        // Visual roll for banking effect
        this.visualRoll = 0;
        this.targetVisualRoll = 0;

        // Engine glow
        this.engineLights = [];

        // Build the ship
        this.createShip();
    }

    /**
     * Create X-wing inspired ship geometry
     */
    createShip() {
        // Main fuselage - elongated body
        const fuselageGeometry = new THREE.BoxGeometry(1, 0.6, 5);
        const fuselageMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.7,
            roughness: 0.3
        });
        const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
        fuselage.castShadow = true;
        fuselage.receiveShadow = true;
        this.group.add(fuselage);

        // Cockpit - raised canopy
        const cockpitGeometry = new THREE.SphereGeometry(0.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const cockpitMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.8
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 0.35, 0.5);
        cockpit.rotation.x = Math.PI;
        cockpit.castShadow = true;
        this.group.add(cockpit);

        // Nose cone
        const noseGeometry = new THREE.ConeGeometry(0.35, 1.5, 8);
        const noseMaterial = new THREE.MeshStandardMaterial({
            color: 0xff4444,
            metalness: 0.6,
            roughness: 0.4
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 0, 3.2);
        nose.rotation.x = Math.PI / 2;
        nose.castShadow = true;
        this.group.add(nose);

        // Create the four wing assemblies (X-wing style)
        this.createWings();

        // Engine section
        this.createEngines();

        // Add the group to scene
        this.scene.scene.add(this.group);

        console.log('🛸 Player ship created');
    }

    /**
     * Create X-wing style wings
     */
    createWings() {
        const wingMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            metalness: 0.6,
            roughness: 0.4
        });

        const wingPositions = [
            { x: 0.5, y: 0.4, angle: 0.15 },   // Top right
            { x: -0.5, y: 0.4, angle: -0.15 }, // Top left
            { x: 0.5, y: -0.4, angle: -0.15 }, // Bottom right
            { x: -0.5, y: -0.4, angle: 0.15 }  // Bottom left
        ];

        wingPositions.forEach((pos, index) => {
            // Wing strut
            const strutGeometry = new THREE.BoxGeometry(3.5, 0.1, 0.6);
            const strut = new THREE.Mesh(strutGeometry, wingMaterial);
            strut.position.set(pos.x * 2.2, pos.y, -0.5);
            strut.rotation.z = pos.angle;
            strut.castShadow = true;
            this.group.add(strut);

            // Wing tip with laser cannon
            const tipGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8);
            const tipMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.8,
                roughness: 0.2
            });
            const tip = new THREE.Mesh(tipGeometry, tipMaterial);
            tip.position.set(pos.x * 4.2, pos.y + (pos.angle * 2), 0.5);
            tip.rotation.x = Math.PI / 2;
            tip.castShadow = true;
            this.group.add(tip);

            // Cannon muzzle (red accent)
            const muzzleGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.3, 8);
            const muzzleMaterial = new THREE.MeshStandardMaterial({
                color: 0xff3333,
                emissive: 0x331111,
                metalness: 0.7,
                roughness: 0.3
            });
            const muzzle = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
            muzzle.position.set(pos.x * 4.2, pos.y + (pos.angle * 2), 1.5);
            muzzle.rotation.x = Math.PI / 2;
            this.group.add(muzzle);
        });
    }

    /**
     * Create engine section with glow
     */
    createEngines() {
        const engineMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.2
        });

        // Four engine nacelles matching wing positions
        const enginePositions = [
            { x: 1.0, y: 0.25 },
            { x: -1.0, y: 0.25 },
            { x: 1.0, y: -0.25 },
            { x: -1.0, y: -0.25 }
        ];

        enginePositions.forEach(pos => {
            // Engine housing
            const engineGeometry = new THREE.CylinderGeometry(0.2, 0.25, 1, 12);
            const engine = new THREE.Mesh(engineGeometry, engineMaterial);
            engine.position.set(pos.x, pos.y, -2.8);
            engine.rotation.x = Math.PI / 2;
            engine.castShadow = true;
            this.group.add(engine);

            // Engine glow (emissive)
            const glowGeometry = new THREE.CircleGeometry(0.18, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x00aaff,
                transparent: true,
                opacity: 0.9
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.set(pos.x, pos.y, -3.3);
            this.group.add(glow);
            this.engineLights.push(glow);

            // Point light for engine
            const engineLight = new THREE.PointLight(0x00aaff, 0.5, 5);
            engineLight.position.set(pos.x, pos.y, -3.5);
            this.group.add(engineLight);
            this.engineLights.push(engineLight);
        });
    }

    /**
     * Update player each frame
     */
    update(deltaTime) {
        // Get input
        const movement = this.inputManager.getMovementInput();
        const aim = this.inputManager.getAimInput();

        // Update flight
        this.updateFlight(deltaTime, movement, aim);

        // Update shield regen
        this.updateShields(deltaTime);

        // Update engine effects
        this.updateEngineEffects(deltaTime, movement);

        // Apply to mesh
        this.group.position.copy(this.position);
        this.group.quaternion.copy(this.quaternion);

        // Apply visual banking
        this.group.rotation.z = this.visualRoll;
    }

    /**
     * Update flight physics - ARCADE STYLE (always upright, never upside down)
     */
    updateFlight(deltaTime, movement, aim) {
        // Determine target speed
        let targetSpeed = this.stats.maxSpeed * 0.4; // Default cruise

        if (movement.z > 0) {
            targetSpeed = movement.boost ? this.stats.boostSpeed : this.stats.maxSpeed;
            this.isBoosting = movement.boost;
        } else if (movement.z < 0 || movement.brake) {
            targetSpeed = movement.brake ? 0 : this.stats.maxSpeed * 0.2;
        }

        // Accelerate/decelerate toward target speed
        const speedDiff = targetSpeed - this.currentSpeed;
        const accelRate = speedDiff > 0 ? this.stats.acceleration : this.stats.deceleration;

        if (movement.brake) {
            this.currentSpeed -= this.stats.brakePower * deltaTime;
            this.currentSpeed = Math.max(0, this.currentSpeed);
        } else {
            this.currentSpeed += Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), accelRate * deltaTime);
        }

        // ARCADE CONTROLS: Use Euler angles to stay upright
        // Update yaw (left/right turn) - accumulates
        this.rotation.y += -aim.x * this.stats.yawSpeed;

        // Update pitch (up/down) - CLAMPED so ship can't flip
        this.rotation.x += -aim.y * this.stats.pitchSpeed;
        this.rotation.x = THREE.MathUtils.clamp(this.rotation.x, -Math.PI / 3, Math.PI / 3); // Max 60 degrees up/down

        // Convert Euler to Quaternion (always upright - no roll)
        this.quaternion.setFromEuler(new THREE.Euler(this.rotation.x, this.rotation.y, 0, 'YXZ'));

        // Calculate forward direction
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.quaternion);

        // Move in forward direction
        this.velocity.copy(forward).multiplyScalar(this.currentSpeed);
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Visual banking when turning (cosmetic only)
        this.targetVisualRoll = aim.x * 0.25;
        this.targetVisualRoll = THREE.MathUtils.clamp(this.targetVisualRoll, -0.3, 0.3);
        this.visualRoll = THREE.MathUtils.lerp(this.visualRoll, this.targetVisualRoll, deltaTime * 5);
    }

    /**
     * Update shield regeneration
     */
    updateShields(deltaTime) {
        const timeSinceHit = performance.now() / 1000 - this.lastHitTime;

        if (timeSinceHit > this.stats.shieldRegenDelay && this.stats.shields < this.stats.maxShields) {
            this.stats.shields += this.stats.shieldRegenRate * deltaTime;
            this.stats.shields = Math.min(this.stats.shields, this.stats.maxShields);
        }
    }

    /**
     * Update engine visual effects based on speed
     */
    updateEngineEffects(deltaTime, movement) {
        const speedRatio = this.currentSpeed / this.stats.maxSpeed;
        const intensity = this.isBoosting ? 1.5 : 0.3 + speedRatio * 0.7;

        // Pulsing effect
        const pulse = Math.sin(performance.now() * 0.01) * 0.1 + 0.9;

        this.engineLights.forEach(light => {
            if (light.isPointLight) {
                light.intensity = intensity * pulse;
            } else if (light.isMesh) {
                light.material.opacity = intensity * pulse * 0.9;
                // Color shift for boost
                if (this.isBoosting) {
                    light.material.color.setHex(0xff6600);
                } else {
                    light.material.color.setHex(0x00aaff);
                }
            }
        });
    }

    /**
     * Take damage
     */
    takeDamage(amount) {
        this.lastHitTime = performance.now() / 1000;

        // Shields absorb damage first
        if (this.stats.shields > 0) {
            const shieldDamage = Math.min(amount, this.stats.shields);
            this.stats.shields -= shieldDamage;
            amount -= shieldDamage;
        }

        // Remaining damage hits hull
        if (amount > 0) {
            this.stats.hull -= amount;
        }

        // Check for destruction
        if (this.stats.hull <= 0) {
            this.destroy();
        }
    }

    /**
     * Handle ship destruction
     */
    destroy() {
        console.log('💥 Player destroyed!');
        // Future: explosion effect, game over
    }

    /**
     * Get current state for HUD
     */
    getState() {
        return {
            speed: Math.round(this.currentSpeed),
            maxSpeed: this.isBoosting ? this.stats.boostSpeed : this.stats.maxSpeed,
            shields: Math.round(this.stats.shields),
            maxShields: this.stats.maxShields,
            hull: Math.round(this.stats.hull),
            maxHull: this.stats.maxHull,
            isBoosting: this.isBoosting,
            position: this.position.clone()
        };
    }

    /**
     * Clean up
     */
    dispose() {
        this.scene.scene.remove(this.group);

        // Dispose geometries and materials
        this.group.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }
}
