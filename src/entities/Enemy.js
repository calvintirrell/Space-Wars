/**
 * Enemy.js - Enemy Ship Entities
 * TIE Fighter inspired designs with AI behavior
 */
import * as THREE from 'three';

/**
 * Base Enemy class
 */
export class Enemy {
  constructor(scene, type = 'fighter') {
    this.scene = scene;
    this.type = type;
    this.group = new THREE.Group();
    this.mesh = null;

    // State
    this.isActive = false;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.quaternion = new THREE.Quaternion();

    // Stats vary by type
    this.stats = this.getStatsByType(type);

    // AI state
    this.target = null;
    this.aiState = 'idle'; // idle, pursue, attack, evade, strafe
    this.lastFireTime = 0;
    this.stateTimer = 0;
    this.evadeTimer = 0;
    this.evadeDirection = new THREE.Vector3();

    // Score value
    this.scoreValue = this.stats.scoreValue;

    // Reusable vectors for performance (avoid creating new ones each frame)
    this._tempVector1 = new THREE.Vector3();
    this._tempVector2 = new THREE.Vector3();
    this._tempVector3 = new THREE.Vector3();
    this._tempQuat = new THREE.Quaternion();
    this._tempMatrix = new THREE.Matrix4();
    
    // Performance optimization - reduce calculation frequency
    this._frameCounter = 0;

    // Create the ship
    this.createShip();
  }

  /**
   * Get stats based on enemy type - more aggressive combat
   */
  getStatsByType(type) {
    const types = {
      fighter: {
        maxSpeed: 35,         // Slightly faster than player for pursuit
        acceleration: 30,     
        turnSpeed: 3.5,       // Very responsive turning
        maxHull: 30,
        hull: 30,
        fireRate: 1.2,        // Much faster firing (was 1.8)
        damage: 5,
        scoreValue: 100,
        aggressiveness: 0.9   // Increased aggression (was 0.8)
      },
      interceptor: {
        maxSpeed: 45,         // Much faster - hit and run tactics
        acceleration: 40,     
        turnSpeed: 4.5,       // Extremely agile
        maxHull: 20,
        hull: 20,
        fireRate: 0.8,        // Very fast firing (was 1.2)
        damage: 4,
        scoreValue: 150,
        aggressiveness: 0.95  // Maximum aggression
      },
      bomber: {
        maxSpeed: 25,         // Slower but steady
        acceleration: 20,     
        turnSpeed: 2.0,       // Decent turning
        maxHull: 80,
        hull: 80,
        fireRate: 1.8,        // Faster firing (was 2.5)
        damage: 10,
        scoreValue: 200,
        aggressiveness: 0.7   // Increased (was 0.6)
      }
    };

    return { ...types[type] || types.fighter };
  }

  /**
   * Create TIE Fighter inspired geometry
   */
  createShip() {
    // Central ball cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.8, 16, 12);
    const cockpitMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.3
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.castShadow = true;
    this.group.add(cockpit);

    // Cockpit window (dark viewport)
    const windowGeometry = new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x111122,
      metalness: 0.9,
      roughness: 0.1
    });
    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    window.position.z = 0.4;
    window.rotation.x = Math.PI / 2;
    this.group.add(window);

    // Wing struts (connecting cockpit to wings)
    const strutGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8);
    const strutMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.7,
      roughness: 0.4
    });

    const leftStrut = new THREE.Mesh(strutGeometry, strutMaterial);
    leftStrut.rotation.z = Math.PI / 2;
    leftStrut.position.x = -1;
    this.group.add(leftStrut);

    const rightStrut = new THREE.Mesh(strutGeometry, strutMaterial);
    rightStrut.rotation.z = Math.PI / 2;
    rightStrut.position.x = 1;
    this.group.add(rightStrut);

    // Hexagonal solar panel wings
    this.createWing(-1.8); // Left wing
    this.createWing(1.8);  // Right wing

    // Add to scene (hidden by default)
    this.group.visible = false;
    this.scene.scene.add(this.group);
  }

  /**
   * Create hexagonal TIE wing
   */
  createWing(xPos) {
    const wingShape = new THREE.Shape();
    const size = 1.8;

    // Hexagon shape
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (i === 0) {
        wingShape.moveTo(x, y);
      } else {
        wingShape.lineTo(x, y);
      }
    }
    wingShape.closePath();

    const wingGeometry = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.05,
      bevelEnabled: false
    });

    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.6,
      roughness: 0.5,
      side: THREE.DoubleSide
    });

    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.rotation.y = Math.PI / 2;
    wing.position.x = xPos;
    wing.castShadow = true;

    // Wing frame (brighter edges)
    const frameGeometry = new THREE.EdgesGeometry(wingGeometry);
    const frameMaterial = new THREE.LineBasicMaterial({
      color: 0x666666,
      linewidth: 2
    });
    const frame = new THREE.LineSegments(frameGeometry, frameMaterial);
    wing.add(frame);

    this.group.add(wing);
  }

  /**
   * Activate enemy at position - faces toward player
   */
  activate(position, target = null) {
    this.position.copy(position);
    this.target = target;
    this.stats.hull = this.stats.maxHull;
    this.isActive = true;
    this.aiState = 'attack';
    this.stateTimer = 0;
    this.lastFireTime = 0;

    // Face toward the player using lookAt
    if (target && target.position) {
      // Use lookAt to face the player position (reuse temp vectors)
      const dirToPlayer = this._tempVector1
        .subVectors(target.position, position)
        .normalize();
      this._tempMatrix.lookAt(this._tempVector2.set(0, 0, 0), dirToPlayer, this._tempVector3.set(0, 1, 0));
      this.quaternion.setFromRotationMatrix(this._tempMatrix);
    } else {
      this.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
    }

    this.group.position.copy(position);
    this.group.quaternion.copy(this.quaternion);
    this.group.visible = true;

    console.log(`👾 Enemy activated, facing player at distance: ${position.distanceTo(target?.position || position).toFixed(1)}`);
  }

  /**
   * Deactivate enemy
   */
  deactivate() {
    this.isActive = false;
    this.group.visible = false;
    this.target = null;
  }

  /**
   * Update enemy each frame - optimized for performance
   */
  update(deltaTime, playerPosition, onFire) {
    if (!this.isActive) return;

    if (!playerPosition) {
      console.warn('⚠️ Enemy update called with no playerPosition!');
      return;
    }

    this._frameCounter++;

    // Calculate direction and distance to player (reuse temp vectors)
    const toPlayer = this._tempVector1.subVectors(playerPosition, this.position);
    const distanceToPlayer = toPlayer.length();
    const dirToPlayer = this._tempVector2.copy(toPlayer).normalize();

    // TELEPORT if too far (300 units) - only check every 10 frames for performance
    if (this._frameCounter % 10 === 0 && distanceToPlayer > 300) {
      const spawnDistance = 60 + Math.random() * 40; // 60-100 units
      const angleOffset = (Math.random() - 0.5) * Math.PI * 0.5; // ±45 degrees

      const spawnDir = this._tempVector3.set(
        Math.sin(angleOffset),
        (Math.random() - 0.5) * 0.3,
        Math.cos(angleOffset)
      ).normalize();

      this.position.copy(playerPosition).add(spawnDir.multiplyScalar(spawnDistance));
      this.lastFireTime = 0;
    }

    // AI STATE MACHINE - simplified
    this.stateTimer += deltaTime;
    
    // Handle evade state timer
    if (this.aiState === 'evade') {
      this.evadeTimer -= deltaTime;
      if (this.evadeTimer <= 0) {
        this.aiState = 'pursue'; // Return to normal behavior
      }
    }
    
    // Determine AI state based on distance (if not evading) - only every 5 frames
    if (this.aiState !== 'evade' && this._frameCounter % 5 === 0) {
      if (distanceToPlayer > 80) { // Reduced from 100 - pursue closer
        this.aiState = 'pursue';
      } else if (distanceToPlayer > 20) { // Reduced from 30 - attack range is larger
        this.aiState = 'attack';
      } else {
        this.aiState = 'strafe'; // Only strafe when very close
      }
    }

    // Execute AI behavior - simplified and optimized
    this.executeAIBehavior(deltaTime, dirToPlayer, distanceToPlayer, onFire);

    // Apply movement
    this.position.add(this._tempVector3.copy(this.velocity).multiplyScalar(deltaTime));

    // Update mesh position
    this.group.position.copy(this.position);
    this.group.quaternion.copy(this.quaternion);
  }

  /**
   * Execute AI behavior - optimized single method
   */
  executeAIBehavior(deltaTime, dirToPlayer, distance, onFire) {
    const currentTime = this.stateTimer; // Use stateTimer instead of performance.now()
    
    switch (this.aiState) {
      case 'pursue':
        // Turn toward player and fly directly at them
        this.turnTowardOptimized(dirToPlayer, deltaTime);
        this.velocity.copy(dirToPlayer).multiplyScalar(this.stats.maxSpeed);
        
        // Fire while pursuing if close enough
        if (distance < 120 && currentTime - this.lastFireTime >= this.stats.fireRate) {
          if (onFire) {
            onFire(this.position.clone(), dirToPlayer.clone(), this.stats.damage);
          }
          this.lastFireTime = currentTime;
        }
        break;
        
      case 'attack':
        // Circle strafe while firing - more aggressive
        const strafeAngle = Math.sin(currentTime * 3) * 0.7; // Increased from 0.5, faster oscillation
        const right = this._tempVector3.crossVectors(dirToPlayer, this._tempVector2.set(0, 1, 0)).normalize();
        const strafeDir = this._tempVector1.copy(dirToPlayer).add(right.multiplyScalar(strafeAngle)).normalize();
        
        this.turnTowardOptimized(strafeDir, deltaTime);
        this.velocity.copy(strafeDir).multiplyScalar(this.stats.maxSpeed * 0.8); // Increased from 0.7
        
        // Fire more frequently in attack mode
        if (currentTime - this.lastFireTime >= this.stats.fireRate * 0.8) { // Fire 25% faster
          if (onFire) {
            onFire(this.position.clone(), dirToPlayer.clone(), this.stats.damage);
          }
          this.lastFireTime = currentTime;
        }
        break;
        
      case 'strafe':
        // Back away while firing
        this.turnTowardOptimized(dirToPlayer, deltaTime);
        
        const awayFromPlayer = this._tempVector1.copy(dirToPlayer).negate();
        const rightStrafe = this._tempVector3.crossVectors(dirToPlayer, this._tempVector2.set(0, 1, 0)).normalize();
        const strafeComponent = Math.sin(currentTime * 3) * 0.8;
        const moveDir = awayFromPlayer.add(rightStrafe.multiplyScalar(strafeComponent)).normalize();
        
        this.velocity.copy(moveDir).multiplyScalar(this.stats.maxSpeed * 0.5);
        
        // Fire very rapidly when close
        if (currentTime - this.lastFireTime >= this.stats.fireRate * 0.5) { // Fire twice as fast
          if (onFire) {
            onFire(this.position.clone(), dirToPlayer.clone(), this.stats.damage);
          }
          this.lastFireTime = currentTime;
        }
        break;
        
      case 'evade':
        // Erratic evasive movement - but still try to fire occasionally
        const evadeDir = this._tempVector1.copy(this.evadeDirection);
        const randomFactor = Math.sin(currentTime * 10) * 0.3;
        const rightEvade = this._tempVector3.crossVectors(evadeDir, this._tempVector2.set(0, 1, 0)).normalize();
        evadeDir.add(rightEvade.multiplyScalar(randomFactor)).normalize();
        
        this.turnTowardOptimized(evadeDir, deltaTime);
        this.velocity.copy(evadeDir).multiplyScalar(this.stats.maxSpeed * 1.2);
        
        // Occasionally fire while evading
        if (Math.random() < 0.1 && currentTime - this.lastFireTime >= this.stats.fireRate * 1.5) {
          if (onFire) {
            onFire(this.position.clone(), dirToPlayer.clone(), this.stats.damage);
          }
          this.lastFireTime = currentTime;
        }
        break;
    }
  }

  /**
   * Optimized turn toward direction
   */
  turnTowardOptimized(targetDir, deltaTime) {
    // Calculate target quaternion using temp objects
    this._tempMatrix.lookAt(this._tempVector3.set(0, 0, 0), targetDir, this._tempVector2.set(0, 1, 0));
    this._tempQuat.setFromRotationMatrix(this._tempMatrix);

    // Calculate turn rate
    const baseTurnRate = this.stats.turnSpeed * deltaTime;
    const aggressiveTurnRate = baseTurnRate * (1 + this.stats.aggressiveness);
    
    // Smoothly rotate toward target
    this.quaternion.slerp(this._tempQuat, Math.min(aggressiveTurnRate, 1));
    this.quaternion.normalize();
  }

  /**
   * Apply velocity to position
   */
  applyMovement(deltaTime) {
    this.position.add(this._tempVector1.copy(this.velocity).multiplyScalar(deltaTime));
  }

  /**
   * Take damage and potentially trigger evasive maneuvers
   */
  takeDamage(amount) {
    this.stats.hull -= amount;

    if (this.stats.hull <= 0) {
      this.stats.hull = 0;
      return true; // Destroyed
    }

    // Reduced chance to evade - stay more aggressive
    if (Math.random() < 0.25) { // Reduced from 0.4
      this.aiState = 'evade';
      this.stateTimer = 0;
      this.evadeTimer = 1.0 + Math.random() * 0.5; // Shorter evade time: 1.0-1.5 seconds (was 1.5-2.5)
      
      // Set random evasive direction
      this.evadeDirection = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      ).normalize();
    }

    return false;
  }

  /**
   * Clean up
   */
  dispose() {
    this.scene.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}

/**
 * Enemy Pool for object pooling
 */
export class EnemyPool {
  constructor(scene, poolSize = 20) {
    this.scene = scene;
    this.pool = [];

    // Pre-create enemies
    for (let i = 0; i < poolSize; i++) {
      // Mix of enemy types
      const type = i < 15 ? 'fighter' : (i < 18 ? 'interceptor' : 'bomber');
      this.pool.push(new Enemy(scene, type));
    }
  }

  /**
   * Get inactive enemy from pool
   */
  get(type = 'fighter') {
    // First try to find matching type
    for (const enemy of this.pool) {
      if (!enemy.isActive && enemy.type === type) {
        return enemy;
      }
    }
    // Fall back to any inactive enemy
    for (const enemy of this.pool) {
      if (!enemy.isActive) {
        return enemy;
      }
    }
    return null;
  }

  /**
   * Get all active enemies
   */
  getActive() {
    return this.pool.filter(e => e.isActive);
  }

  /**
   * Update all enemies
   */
  update(deltaTime, playerPosition, onFire) {
    for (const enemy of this.pool) {
      enemy.update(deltaTime, playerPosition, onFire);
    }
  }

  /**
   * Clean up
   */
  dispose() {
    for (const enemy of this.pool) {
      enemy.dispose();
    }
    this.pool = [];
  }
}
