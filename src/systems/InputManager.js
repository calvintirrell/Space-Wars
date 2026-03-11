/**
 * InputManager.js - Keyboard and Mouse Input Handler
 * Tracks input state and provides clean interface for game systems
 */

export class InputManager {
    constructor() {
        // Check for debug mode via URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.debugMode = urlParams.get('debug') === 'true';

        if (this.debugMode) {
            console.log('🔧 DEBUG MODE ENABLED - Pointer lock bypassed for automated testing');
        }

        // Keyboard state
        this.keys = {};
        this.keysPressed = {}; // For one-shot detection

        // Mouse state
        this.mouse = {
            x: 0,           // Normalized -1 to 1
            y: 0,           // Normalized -1 to 1
            deltaX: 0,      // Frame movement
            deltaY: 0,      // Frame movement
            locked: this.debugMode,  // Auto-locked in debug mode!
            leftButton: false,
            rightButton: false
        };

        // Sensitivity settings
        this.mouseSensitivity = 0.002;

        // Bind event handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
        this.handleClick = this.handleClick.bind(this);

        // Initialize listeners
        this.init();
    }

    /**
     * Initialize event listeners
     */
    init() {
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        // Mouse events
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);
        window.addEventListener('click', this.handleClick);

        // Pointer lock
        document.addEventListener('pointerlockchange', this.handlePointerLockChange);

        console.log(`🎮 InputManager initialized${this.debugMode ? ' (DEBUG MODE)' : ''}`);
    }

    /**
     * Handle key down
     */
    handleKeyDown(event) {
        // Prevent default for game keys
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
            event.preventDefault();
        }

        // Track one-shot press
        if (!this.keys[event.code]) {
            this.keysPressed[event.code] = true;
        }

        this.keys[event.code] = true;
    }

    /**
     * Handle key up
     */
    handleKeyUp(event) {
        this.keys[event.code] = false;
    }

    /**
     * Handle mouse movement
     */
    handleMouseMove(event) {
        if (this.mouse.locked) {
            // Use movement data for flight control
            this.mouse.deltaX += event.movementX * this.mouseSensitivity;
            this.mouse.deltaY += event.movementY * this.mouseSensitivity;
        } else {
            // Normalized screen position
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        }
    }

    /**
     * Handle mouse button down
     */
    handleMouseDown(event) {
        if (event.button === 0) this.mouse.leftButton = true;
        if (event.button === 2) this.mouse.rightButton = true;
    }

    /**
     * Handle mouse button up
     */
    handleMouseUp(event) {
        if (event.button === 0) this.mouse.leftButton = false;
        if (event.button === 2) this.mouse.rightButton = false;
    }

    /**
     * Handle click to request pointer lock
     */
    handleClick() {
        if (!this.mouse.locked) {
            document.body.requestPointerLock();
        }
    }

    /**
     * Handle pointer lock change
     */
    handlePointerLockChange() {
        this.mouse.locked = document.pointerLockElement === document.body;
        console.log(`🔒 Pointer lock: ${this.mouse.locked ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if key is currently held down
     */
    isKeyDown(code) {
        return this.keys[code] === true;
    }

    /**
     * Check if key was just pressed this frame
     */
    wasKeyPressed(code) {
        return this.keysPressed[code] === true;
    }

    /**
     * Get movement input vector (WASD + Arrows)
     */
    getMovementInput() {
        let x = 0; // Roll / Strafe
        let y = 0; // Pitch
        let z = 0; // Thrust forward/back

        // Forward/Back (thrust)
        if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) z = 1;
        if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) z = -1;

        // Roll (A/D)
        if (this.isKeyDown('KeyA')) x = -1;
        if (this.isKeyDown('KeyD')) x = 1;

        // Yaw (Q/E)
        let yaw = 0;
        if (this.isKeyDown('KeyQ')) yaw = 1;
        if (this.isKeyDown('KeyE')) yaw = -1;

        // Boost
        const boost = this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight');

        // Brake
        const brake = this.isKeyDown('ControlLeft') || this.isKeyDown('ControlRight');

        return { x, y, z, yaw, boost, brake };
    }

    /**
     * Get mouse aim input
     */
    getAimInput() {
        const aim = {
            x: this.mouse.deltaX,
            y: this.mouse.deltaY,
            fire: this.mouse.leftButton || this.isKeyDown('Space'),
            missile: this.mouse.rightButton || this.isKeyDown('KeyF')
        };

        return aim;
    }

    /**
     * Reset per-frame state (call at end of update)
     */
    resetFrameState() {
        this.keysPressed = {};
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
    }

    /**
     * Clean up event listeners
     */
    dispose() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('click', this.handleClick);
        document.removeEventListener('pointerlockchange', this.handlePointerLockChange);

        // Exit pointer lock if active
        if (this.mouse.locked) {
            document.exitPointerLock();
        }
    }
}
