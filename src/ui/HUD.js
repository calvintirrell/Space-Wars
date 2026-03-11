/**
 * HUD.js - Heads-Up Display
 * In-game UI showing ship status, targeting, and info
 */

export class HUD {
  constructor(container) {
    this.container = container;
    this.elements = {};

    // Check for debug mode
    const urlParams = new URLSearchParams(window.location.search);
    this.debugMode = urlParams.get('debug') === 'true';

    this.create();
  }

  /**
   * Create HUD elements
   */
  create() {
    // Main HUD container
    this.hudElement = document.createElement('div');
    this.hudElement.id = 'hud';
    this.hudElement.innerHTML = `
      <div class="hud-top-bar">
        <div class="hud-fps">
          <span class="hud-label">FPS</span>
          <span class="hud-value" id="hud-fps">60</span>
        </div>
        <div class="hud-wave">
          <span class="hud-label">WAVE</span>
          <span class="hud-value" id="hud-wave">-</span>
        </div>
        <div class="hud-score">
          <span class="hud-label">SCORE</span>
          <span class="hud-value" id="hud-score">0</span>
        </div>
        <div class="hud-enemies">
          <span class="hud-label">ENEMIES</span>
          <span class="hud-value" id="hud-enemies">0</span>
        </div>
      </div>
      
      <div class="hud-crosshair">
        <div class="crosshair-ring"></div>
        <div class="crosshair-dot"></div>
      </div>
      
      <div class="hud-bottom-left">
        <div class="hud-shields">
          <span class="hud-label">SHIELDS</span>
          <div class="hud-bar">
            <div class="hud-bar-fill shields-fill" id="hud-shields"></div>
          </div>
          <span class="hud-value" id="hud-shields-text">100%</span>
        </div>
        <div class="hud-hull">
          <span class="hud-label">HULL</span>
          <div class="hud-bar">
            <div class="hud-bar-fill hull-fill" id="hud-hull"></div>
          </div>
          <span class="hud-value" id="hud-hull-text">100%</span>
        </div>
      </div>
      
      <div class="hud-bottom-right">
        <div class="hud-speed">
          <span class="hud-label">SPEED</span>
          <div class="hud-speed-display">
            <span class="hud-value large" id="hud-speed">0</span>
            <span class="hud-unit">M/S</span>
          </div>
          <div class="hud-bar vertical">
            <div class="hud-bar-fill speed-fill" id="hud-speed-bar"></div>
          </div>
        </div>
        <div class="hud-missiles">
          <span class="hud-label">MISSILES</span>
          <div class="hud-missile-icons" id="hud-missiles"></div>
        </div>
        <div class="hud-boost" id="hud-boost">
          BOOST
        </div>
      </div>
      
      <div class="hud-control-hint ${this.debugMode ? 'debug-mode' : ''}" id="hud-hint">
        ${this.debugMode ? '<div class="hint-debug">🔧 DEBUG MODE - Auto-started</div>' : `
          <div class="hint-title">SPACE WARS</div>
          <div class="hint-subtitle">Click to Start</div>
          <div class="controls-grid">
            <div class="control-item"><span class="key">W</span> Thrust Forward</div>
            <div class="control-item"><span class="key">S</span> Slow Down</div>
            <div class="control-item"><span class="key">MOUSE</span> Aim Ship</div>
            <div class="control-item"><span class="key">SHIFT</span> Boost</div>
            <div class="control-item"><span class="key">CTRL</span> Brake</div>
            <div class="control-item"><span class="key">CLICK</span> Fire Lasers</div>
            <div class="control-item"><span class="key">F</span> Fire Missile</div>
          </div>
        `}
      </div>
      
      <div class="hud-wave-message hidden" id="hud-wave-message"></div>
      
      <div class="hud-game-over hidden" id="hud-game-over">
        <div class="game-over-title">GAME OVER</div>
        <div class="game-over-score">FINAL SCORE: <span id="final-score">0</span></div>
        <div class="game-over-hint">Refresh to play again</div>
      </div>
    `;

    this.container.appendChild(this.hudElement);

    // Cache element references
    this.elements = {
      fps: document.getElementById('hud-fps'),
      score: document.getElementById('hud-score'),
      wave: document.getElementById('hud-wave'),
      enemies: document.getElementById('hud-enemies'),
      shields: document.getElementById('hud-shields'),
      shieldsText: document.getElementById('hud-shields-text'),
      hull: document.getElementById('hud-hull'),
      hullText: document.getElementById('hud-hull-text'),
      speed: document.getElementById('hud-speed'),
      speedBar: document.getElementById('hud-speed-bar'),
      missiles: document.getElementById('hud-missiles'),
      boost: document.getElementById('hud-boost'),
      hint: document.getElementById('hud-hint'),
      waveMessage: document.getElementById('hud-wave-message'),
      gameOver: document.getElementById('hud-game-over'),
      finalScore: document.getElementById('final-score')
    };

    // FPS tracking
    this.fpsFrames = 0;
    this.fpsLastTime = performance.now();
    this.fpsValue = 60;

    // Add HUD styles
    this.addStyles();

    console.log('📊 HUD created');
  }

  /**
   * Add HUD CSS styles
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #hud {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
        font-family: 'Orbitron', 'Inter', sans-serif;
        color: #00d4ff;
      }
      
      .hud-label {
        font-size: 0.65rem;
        letter-spacing: 0.15em;
        opacity: 0.7;
        display: block;
        margin-bottom: 2px;
      }
      
      .hud-value {
        font-size: 0.9rem;
        font-weight: 600;
        text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
      }
      
      .hud-value.large {
        font-size: 1.8rem;
      }
      
      .hud-unit {
        font-size: 0.6rem;
        opacity: 0.6;
        margin-left: 4px;
      }
      
      /* Top bar */
      .hud-top-bar {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 40px;
        padding: 10px 30px;
        background: rgba(0, 20, 40, 0.5);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 4px;
      }
      
      .hud-score {
        text-align: center;
      }
      
      .hud-score .hud-value {
        font-size: 1.4rem;
      }
      
      /* Crosshair */
      .hud-crosshair {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
      
      .crosshair-ring {
        width: 40px;
        height: 40px;
        border: 2px solid rgba(0, 212, 255, 0.6);
        border-radius: 50%;
        position: relative;
      }
      
      .crosshair-ring::before,
      .crosshair-ring::after {
        content: '';
        position: absolute;
        background: rgba(0, 212, 255, 0.8);
      }
      
      .crosshair-ring::before {
        width: 10px;
        height: 2px;
        top: 50%;
        left: -14px;
        transform: translateY(-50%);
      }
      
      .crosshair-ring::after {
        width: 10px;
        height: 2px;
        top: 50%;
        right: -14px;
        transform: translateY(-50%);
      }
      
      .crosshair-dot {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 4px;
        height: 4px;
        background: #00d4ff;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 8px #00d4ff;
      }
      
      /* Bottom left - shields/hull */
      .hud-bottom-left {
        position: absolute;
        bottom: 30px;
        left: 30px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .hud-shields, .hud-hull {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .hud-bar {
        width: 150px;
        height: 8px;
        background: rgba(0, 20, 40, 0.7);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 2px;
        overflow: hidden;
      }
      
      .hud-bar-fill {
        height: 100%;
        transition: width 0.2s ease, background-color 0.3s ease;
      }
      
      .shields-fill {
        background: linear-gradient(90deg, #00aaff, #00d4ff);
        box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
      }
      
      .hull-fill {
        background: linear-gradient(90deg, #ff6b35, #ffaa00);
        box-shadow: 0 0 10px rgba(255, 107, 53, 0.5);
      }
      
      .hud-hull .hud-label,
      .hud-hull .hud-value {
        color: #ffaa00;
      }
      
      /* Bottom right - speed */
      .hud-bottom-right {
        position: absolute;
        bottom: 30px;
        right: 30px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
      }
      
      .hud-speed {
        display: flex;
        align-items: flex-end;
        gap: 15px;
      }
      
      .hud-speed-display {
        text-align: right;
      }
      
      .hud-bar.vertical {
        width: 8px;
        height: 80px;
        display: flex;
        flex-direction: column-reverse;
      }
      
      .speed-fill {
        background: linear-gradient(0deg, #00aaff, #00ffaa);
        transition: height 0.1s ease;
      }
      
      .hud-missiles {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }
      
      .hud-missile-icons {
        display: flex;
        gap: 4px;
      }
      
      .missile-icon {
        width: 6px;
        height: 20px;
        background: linear-gradient(180deg, #ff6b35, #ffaa00);
        border-radius: 3px 3px 1px 1px;
        box-shadow: 0 0 6px rgba(255, 107, 53, 0.5);
        transition: opacity 0.2s ease;
      }
      
      .missile-icon.empty {
        background: rgba(100, 100, 100, 0.3);
        box-shadow: none;
      }
      
      .hud-boost {
        background: rgba(255, 100, 0, 0.2);
        border: 1px solid rgba(255, 100, 0, 0.5);
        color: #ff6b35;
        padding: 5px 15px;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        border-radius: 3px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .hud-boost.active {
        opacity: 1;
        animation: boost-pulse 0.5s ease infinite;
      }
      
      @keyframes boost-pulse {
        0%, 100% { box-shadow: 0 0 10px rgba(255, 100, 0, 0.3); }
        50% { box-shadow: 0 0 20px rgba(255, 100, 0, 0.6); }
      }
      
      /* Control hint - Start Screen */
      .hud-control-hint {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 15, 35, 0.95);
        border: 2px solid rgba(0, 212, 255, 0.6);
        padding: 30px 40px;
        border-radius: 8px;
        text-align: center;
        animation: hint-glow 3s ease infinite;
        transition: opacity 0.3s ease;
      }
      
      .hint-title {
        font-size: 2.5rem;
        font-weight: 700;
        letter-spacing: 0.3em;
        background: linear-gradient(135deg, #00d4ff, #00ff88);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 10px;
      }
      
      .hint-subtitle {
        font-size: 1rem;
        color: #88ccff;
        letter-spacing: 0.2em;
        margin-bottom: 25px;
        animation: blink 1.5s ease infinite;
      }
      
      .hint-debug {
        font-size: 1.2rem;
        color: #00ff88;
      }
      
      .controls-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 30px;
        text-align: left;
      }
      
      .control-item {
        font-size: 0.85rem;
        color: #aaccee;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .control-item .key {
        background: rgba(0, 212, 255, 0.2);
        border: 1px solid rgba(0, 212, 255, 0.5);
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: bold;
        color: #00d4ff;
        min-width: 50px;
        text-align: center;
        font-size: 0.75rem;
      }
      
      .hud-control-hint.hidden {
        opacity: 0;
        pointer-events: none;
      }
      
      @keyframes hint-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.3); }
        50% { box-shadow: 0 0 40px rgba(0, 212, 255, 0.5); }
      }
      
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      /* Wave message overlay */
      .hud-wave-message {
        position: absolute;
        top: 25%;
        left: 50%;
        transform: translateX(-50%);
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        color: #ff6b35;
        text-shadow: 0 0 20px rgba(255, 107, 53, 0.8), 0 0 40px rgba(255, 107, 53, 0.4);
        animation: wave-appear 0.5s ease-out;
      }
      
      .hud-wave-message.hidden {
        display: none;
      }
      
      @keyframes wave-appear {
        0% { transform: translateX(-50%) scale(1.5); opacity: 0; }
        100% { transform: translateX(-50%) scale(1); opacity: 1; }
      }
      
      /* Game over overlay */
      .hud-game-over {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(10, 0, 0, 0.85);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 20px;
      }
      
      .hud-game-over.hidden {
        display: none;
      }
      
      .game-over-title {
        font-size: 4rem;
        font-weight: 700;
        color: #ff3366;
        letter-spacing: 0.3em;
        text-shadow: 0 0 30px rgba(255, 51, 102, 0.8);
        animation: game-over-pulse 1.5s ease-in-out infinite;
      }
      
      .game-over-score {
        font-size: 1.5rem;
        color: #ffaa00;
        letter-spacing: 0.1em;
      }
      
      .game-over-hint {
        font-size: 0.9rem;
        color: #6b7280;
        margin-top: 20px;
      }
      
      @keyframes game-over-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Update HUD with player state
   */
  update(playerState, score = 0, weaponState = null, waveInfo = null) {
    if (!playerState) return;

    // Update FPS counter
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 1000) {
      this.fpsValue = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsLastTime = now;
      if (this.elements.fps) {
        this.elements.fps.textContent = this.fpsValue;
        // Color code: green > 50, yellow > 30, red <= 30
        if (this.fpsValue >= 50) {
          this.elements.fps.style.color = '#00ff00';
        } else if (this.fpsValue >= 30) {
          this.elements.fps.style.color = '#ffff00';
        } else {
          this.elements.fps.style.color = '#ff3333';
        }
      }
    }

    // Update shields
    const shieldPercent = (playerState.shields / playerState.maxShields) * 100;
    this.elements.shields.style.width = `${shieldPercent}%`;
    this.elements.shieldsText.textContent = `${Math.round(shieldPercent)}%`;

    // Update hull
    const hullPercent = (playerState.hull / playerState.maxHull) * 100;
    this.elements.hull.style.width = `${hullPercent}%`;
    this.elements.hullText.textContent = `${Math.round(hullPercent)}%`;

    // Hull color warning
    if (hullPercent < 30) {
      this.elements.hull.style.background = 'linear-gradient(90deg, #ff3366, #ff6b35)';
    }

    // Update speed
    this.elements.speed.textContent = playerState.speed;
    const speedPercent = (playerState.speed / playerState.maxSpeed) * 100;
    this.elements.speedBar.style.height = `${Math.min(speedPercent, 100)}%`;

    // Update missile count
    if (weaponState && this.elements.missiles) {
      this.updateMissileDisplay(weaponState.missileCount, weaponState.maxMissiles);
    }

    // Update wave info
    if (waveInfo) {
      this.elements.wave.textContent = waveInfo.wave || '-';
      this.elements.enemies.textContent = waveInfo.enemiesRemaining || 0;
    }

    // Boost indicator
    if (playerState.isBoosting) {
      this.elements.boost.classList.add('active');
    } else {
      this.elements.boost.classList.remove('active');
    }

    // Update score
    this.elements.score.textContent = score.toLocaleString();
  }

  /**
   * Update missile display icons
   */
  updateMissileDisplay(current, max) {
    let html = '';
    for (let i = 0; i < max; i++) {
      const isEmpty = i >= current;
      html += `<div class="missile-icon${isEmpty ? ' empty' : ''}"></div>`;
    }
    this.elements.missiles.innerHTML = html;
  }

  /**
   * Hide the control hint (after pointer lock)
   */
  hideHint() {
    this.elements.hint.classList.add('hidden');
  }

  /**
   * Show the control hint
   */
  showHint() {
    this.elements.hint.classList.remove('hidden');
  }

  /**
   * Show wave message
   */
  showWaveMessage(message) {
    this.elements.waveMessage.textContent = message;
    this.elements.waveMessage.classList.remove('hidden');
  }

  /**
   * Hide wave message
   */
  hideWaveMessage() {
    this.elements.waveMessage.classList.add('hidden');
  }

  /**
   * Show game over screen
   */
  showGameOver(finalScore) {
    this.elements.finalScore.textContent = finalScore.toLocaleString();
    this.elements.gameOver.classList.remove('hidden');
  }

  /**
   * Clean up
   */
  dispose() {
    if (this.hudElement && this.hudElement.parentNode) {
      this.hudElement.parentNode.removeChild(this.hudElement);
    }
  }
}
