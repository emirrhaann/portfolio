// Game data model
const GAMES = [
  {
    name: "Stitch and Match",
    icon: "./assets/game1-icon.png",
    preview: "./assets/game1-preview.png",
    link: "https://apps.apple.com/hn/app/stitch-and-match/id6745091169",
    alt: "Mobile Adventure icon"
  },
  {
    name: "Stretch Block Match",
    icon: "./assets/game2-icon.png",
    preview: "./assets/game2-preview.png",
    link: "https://apps.apple.com/hn/app/stretch-block-match/id6746163246",
    alt: "Puzzle Master icon"
  },
  {
    name: "Coffee Express!",
    icon: "./assets/game3-icon.png",
    preview: "./assets/game3-preview.png",
    link: "https://apps.apple.com/hn/app/coffee-express/id6741320194",
    alt: "Arcade Classic icon"
  },
  {
    name: "Pack Rush",
    icon: "./assets/game4-icon.png",
    preview: "./assets/game4-preview.png",
    link: "https://apps.apple.com/hn/app/pack-rush/id6742317654",
    alt: "Game Four icon"
  }
];

// State management
let currentGame = null;
let showPreview = false;
let mousePosition = { x: 0, y: 0 };
let isMobile = false;
let mobileClickTimer = null;
let lastClickedGame = null;

// DOM elements
let previewCard = null;
let previewImage = null;
let previewTitle = null;
let previewCta = null;
let gameButtons = [];

// Utility functions
function detectMobile() {
  // Check for touch capability and screen size
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.innerWidth <= 768
  );
}

function preloadImages() {
  // Preload preview images to avoid flicker on hover
  GAMES.forEach(game => {
    const img = new Image();
    img.src = game.preview;
  });
}

function updatePreviewContent(game) {
  if (!game) return;
  
  previewImage.src = game.preview;
  previewImage.alt = `${game.name} preview`;
  previewTitle.textContent = game.name;
  
  // Update CTA link to match the game's link
  if (previewCta) {
    previewCta.onclick = () => openGameLink(game);
  }
}

function showGamePreview(game, buttonElement) {
  if (!game || !previewCard) return;
  
  currentGame = game;
  showPreview = true;
  
  updatePreviewContent(game);
  
  if (isMobile) {
    // On mobile, center the preview above the buttons
    const gamesSection = document.querySelector('.games-section');
    const rect = gamesSection.getBoundingClientRect();
    
    previewCard.style.left = '50%';
    previewCard.style.top = `${rect.top - 300}px`;
    previewCard.style.transform = 'translateX(-50%) scale(0.96)';
  } else {
    // On desktop, position directly above the hovered game button
    const rect = buttonElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const topY = rect.top - 350; // Increased offset for larger preview
    
    // Keep preview within viewport bounds
    const previewWidth = 280;
    const viewportWidth = window.innerWidth;
    const leftBound = previewWidth / 2;
    const rightBound = viewportWidth - previewWidth / 2;
    
    const clampedX = Math.max(leftBound, Math.min(rightBound, centerX));
    
    previewCard.style.left = `${clampedX}px`;
    previewCard.style.top = `${Math.max(20, topY)}px`;
    previewCard.style.transform = 'translateX(-50%) scale(0.96)';
  }
  
  previewCard.setAttribute('aria-hidden', 'false');
  previewCard.classList.add('is-visible');
  
  // For keyboard users, focus the CTA button after a brief delay
  if (!isMobile && document.activeElement && document.activeElement.classList.contains('game-button')) {
    setTimeout(() => {
      if (previewCta && showPreview) {
        previewCta.focus();
      }
    }, 200);
  }
}

function hideGamePreview() {
  showPreview = false;
  currentGame = null;
  
  if (previewCard) {
    previewCard.setAttribute('aria-hidden', 'true');
    previewCard.classList.remove('is-visible');
  }
}

function openGameLink(game) {
  if (game && game.link) {
    window.open(game.link, '_blank', 'noopener,noreferrer');
  }
}

// Event handlers
function handleMouseMove(event) {
  mousePosition = { x: event.clientX, y: event.clientY };
}

function handleGameHover(event) {
  if (isMobile) return;
  
  const gameIndex = parseInt(event.currentTarget.getAttribute('data-game-index'));
  const game = GAMES[gameIndex];
  
  if (game) {
    showGamePreview(game, event.currentTarget);
  }
}

function handleGameLeave(event) {
  if (isMobile) return;
  
  hideGamePreview();
}

function handleGameFocus(event) {
  if (isMobile) return;
  
  const gameIndex = parseInt(event.currentTarget.getAttribute('data-game-index'));
  const game = GAMES[gameIndex];
  
  if (game) {
    showGamePreview(game, event.currentTarget);
  }
}

function handleGameBlur(event) {
  if (isMobile) return;
  
  // Small delay to allow for focus to move to preview button
  setTimeout(() => {
    if (!previewCard.contains(document.activeElement)) {
      hideGamePreview();
    }
  }, 100);
}

function handleGameClick(event) {
  event.preventDefault();
  
  const gameIndex = parseInt(event.currentTarget.getAttribute('data-game-index'));
  const game = GAMES[gameIndex];
  
  if (!game) return;
  
  if (isMobile) {
    // Mobile behavior: first tap shows preview, second tap opens link
    if (currentGame === game && showPreview) {
      // Second tap - open the link
      openGameLink(game);
      hideGamePreview();
      lastClickedGame = null;
    } else {
      // First tap - show preview
      showGamePreview(game, event.currentTarget);
      lastClickedGame = game;
      
      // Clear any existing timer
      if (mobileClickTimer) {
        clearTimeout(mobileClickTimer);
      }
      
      // Auto-hide preview after 5 seconds if no second tap
      mobileClickTimer = setTimeout(() => {
        if (currentGame === game) {
          hideGamePreview();
          lastClickedGame = null;
        }
      }, 5000);
    }
  } else {
    // Desktop behavior: direct navigation
    openGameLink(game);
  }
}

function handleKeyDown(event) {
  // Handle keyboard navigation
  if (event.target.classList.contains('game-button')) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleGameClick(event);
    }
    if (event.key === 'Escape' && showPreview) {
      hideGamePreview();
    }
  }
  
  // Allow escape to close preview from anywhere
  if (event.key === 'Escape' && showPreview) {
    hideGamePreview();
  }
}

function handlePreviewCtaClick(event) {
  event.preventDefault();
  if (currentGame) {
    openGameLink(currentGame);
    hideGamePreview();
  }
}

function handleClickOutside(event) {
  if (!isMobile || !showPreview) return;
  
  const target = event.target;
  const isGameButton = target.closest('.game-button');
  const isPreview = target.closest('.preview-card');
  
  if (!isGameButton && !isPreview) {
    hideGamePreview();
    lastClickedGame = null;
    
    if (mobileClickTimer) {
      clearTimeout(mobileClickTimer);
      mobileClickTimer = null;
    }
  }
}

function handleResize() {
  const wasMobile = isMobile;
  isMobile = detectMobile();
  
  // If switching between mobile and desktop, hide preview
  if (wasMobile !== isMobile && showPreview) {
    hideGamePreview();
  }
}

// Initialize the application
function initializeApp() {
  // Detect mobile
  isMobile = detectMobile();
  
  // Get DOM elements
  previewCard = document.getElementById('preview');
  previewImage = previewCard.querySelector('.preview-image');
  previewTitle = previewCard.querySelector('.preview-title');
  previewCta = previewCard.querySelector('.preview-cta');
  gameButtons = Array.from(document.querySelectorAll('.game-button'));
  
  // Preload images
  preloadImages();
  
  // Set up game buttons
  gameButtons.forEach((button, index) => {
    const game = GAMES[index];
    if (game) {
      // Update button attributes
      button.setAttribute('aria-label', `${game.name} game`);
      
      // Update image src and alt
      const img = button.querySelector('img');
      if (img) {
        img.src = game.icon;
        img.alt = game.alt;
      }
      
      // Add event listeners
      button.addEventListener('mouseenter', handleGameHover);
      button.addEventListener('mouseleave', handleGameLeave);
      button.addEventListener('focus', handleGameFocus);
      button.addEventListener('blur', handleGameBlur);
      button.addEventListener('click', handleGameClick);
    }
  });
  
  // Set up preview CTA
  if (previewCta) {
    previewCta.addEventListener('click', handlePreviewCtaClick);
  }
  
  // Global event listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('resize', handleResize);
  
  // Handle visibility change (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && showPreview) {
      hideGamePreview();
    }
  });
  
  console.log('Portfolio initialized successfully');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}