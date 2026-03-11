/**
 * CameraController.js - Third-Person Chase Camera
 * Smooth following camera with situational awareness
 */
import * as THREE from 'three';

export class CameraController {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target; // Player ship

        // Camera offset (relative to target)
        this.offset = new THREE.Vector3(0, 3, -12);
        this.lookAtOffset = new THREE.Vector3(0, 0, 15);

        // Smooth following
        this.currentPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();
        this.positionSmoothness = 5;
        this.lookAtSmoothness = 8;

        // Camera shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;

        // Dynamic FOV for speed effect
        this.baseFOV = 75;
        this.boostFOV = 90;
        this.currentFOV = this.baseFOV;

        // Initialize position
        if (target) {
            this.currentPosition.copy(target.position).add(this.offset);
            this.currentLookAt.copy(target.position);
        }
    }

    /**
     * Update camera each frame
     */
    update(deltaTime) {
        if (!this.target) return;

        // Calculate target camera position in world space
        const targetOffset = this.offset.clone();
        targetOffset.applyQuaternion(this.target.quaternion);
        const targetPosition = this.target.position.clone().add(targetOffset);

        // Calculate look-at point
        const targetLookAtOffset = this.lookAtOffset.clone();
        targetLookAtOffset.applyQuaternion(this.target.quaternion);
        const targetLookAt = this.target.position.clone().add(targetLookAtOffset);

        // Smooth interpolation
        this.currentPosition.lerp(targetPosition, deltaTime * this.positionSmoothness);
        this.currentLookAt.lerp(targetLookAt, deltaTime * this.lookAtSmoothness);

        // Apply camera shake
        let shakeOffset = new THREE.Vector3();
        if (this.shakeTimer > 0) {
            this.shakeTimer -= deltaTime;
            const shakeAmount = this.shakeIntensity * (this.shakeTimer / this.shakeDuration);
            shakeOffset.set(
                (Math.random() - 0.5) * shakeAmount,
                (Math.random() - 0.5) * shakeAmount,
                (Math.random() - 0.5) * shakeAmount * 0.5
            );
        }

        // Update camera position
        this.camera.position.copy(this.currentPosition).add(shakeOffset);
        this.camera.lookAt(this.currentLookAt);

        // Dynamic FOV based on speed
        const playerState = this.target.getState();
        const targetFOV = playerState.isBoosting ? this.boostFOV : this.baseFOV;
        this.currentFOV = THREE.MathUtils.lerp(this.currentFOV, targetFOV, deltaTime * 3);
        this.camera.fov = this.currentFOV;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Trigger camera shake
     */
    shake(intensity = 0.5, duration = 0.3) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    /**
     * Set target to follow
     */
    setTarget(target) {
        this.target = target;
    }
}
