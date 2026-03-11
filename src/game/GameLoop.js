/**
 * GameLoop.js - Fixed Timestep Game Loop
 * Handles update/render cycle with delta time calculation
 */

export class GameLoop {
    constructor(scene) {
        this.scene = scene;

        // Loop state
        this.isRunning = false;
        this.animationFrameId = null;

        // Timing
        this.lastTime = 0;
        this.elapsedTime = 0;
        this.deltaTime = 0;

        // For fixed timestep updates (physics, etc.)
        this.fixedTimeStep = 1 / 60; // 60 updates per second
        this.accumulator = 0;

        // Performance monitoring
        this.frameCount = 0;
        this.fpsTime = 0;
        this.fps = 0;

        // Update callbacks
        this.updateCallbacks = [];

        // Bind the loop function
        this.loop = this.loop.bind(this);
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Main loop function
     */
    loop(currentTime) {
        if (!this.isRunning) return;

        // Calculate delta time in seconds
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Clamp delta time to prevent spiral of death
        this.deltaTime = Math.min(this.deltaTime, 0.1);

        // Update elapsed time
        this.elapsedTime += this.deltaTime;

        // Fixed timestep accumulator for physics
        this.accumulator += this.deltaTime;

        // Run fixed updates
        while (this.accumulator >= this.fixedTimeStep) {
            this.fixedUpdate(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }

        // Variable update (animations, etc.)
        this.update(this.deltaTime);

        // Render
        this.render();

        // FPS calculation
        this.updateFPS(currentTime);

        // Continue loop
        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    /**
     * Fixed timestep update (for physics)
     */
    fixedUpdate(deltaTime) {
        // Future: Physics updates, collision detection
    }

    /**
     * Variable timestep update (for visuals)
     */
    update(deltaTime) {
        // Update scene elements
        this.scene.update(deltaTime, this.elapsedTime);

        // Run registered callbacks
        for (const callback of this.updateCallbacks) {
            callback(deltaTime, this.elapsedTime);
        }
    }

    /**
     * Render the scene
     */
    render() {
        this.scene.render();
    }

    /**
     * Calculate and log FPS
     */
    updateFPS(currentTime) {
        this.frameCount++;

        if (currentTime - this.fpsTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTime = currentTime;

            // Log FPS every second (dev only)
            if (import.meta.env.DEV) {
                // console.log(`FPS: ${this.fps}`);
            }
        }
    }

    /**
     * Register an update callback
     */
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }

    /**
     * Remove an update callback
     */
    offUpdate(callback) {
        const index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
            this.updateCallbacks.splice(index, 1);
        }
    }

    /**
     * Get current FPS
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Get elapsed time since start
     */
    getElapsedTime() {
        return this.elapsedTime;
    }
}
