/**
 * Space Wars - Main Entry Point
 * Initializes the game and handles loading
 */
import { Game } from './game/Game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Space Wars: Initializing...');
  
  const loadingScreen = document.getElementById('loading-screen');
  const gameContainer = document.getElementById('game-container');
  
  try {
    // Create and initialize the game
    const game = new Game(gameContainer);
    await game.init();
    
    // Hide loading screen with fade
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      console.log('🎮 Game ready! Starting loop...');
      
      // Start the game loop
      game.start();
    }, 500); // Small delay for smooth transition
    
    // Expose game instance for debugging (development only)
    if (import.meta.env.DEV) {
      window.game = game;
      console.log('💡 Dev mode: game instance available as window.game');
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);
    const loaderText = loadingScreen.querySelector('.loader-text');
    if (loaderText) {
      loaderText.textContent = 'INITIALIZATION FAILED';
      loaderText.style.color = '#ff3366';
    }
  }
});
