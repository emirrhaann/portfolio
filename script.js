// Game data model
const GAMES = [
  {
    name: "Stitch and Match",
    icon: "./assets/game1-icon.png",
    preview: "./assets/game1-preview.png",
    demoUrl: "https://stitch-and-match-demo.vercel.app",
    demoAspect: 9 / 16
  },
  {
    name: "Stretch Block Match",
    icon: "./assets/game2-icon.png",
    preview: "./assets/game2-preview.png",
    demoUrl: "./demos/stretch-block-match/",
    demoAspect: 9 / 16
  },
  {
    name: "Coffee Express!",
    icon: "./assets/game3-icon.png",
    preview: "./assets/game3-preview.png",
    demoUrl: "https://coffee-express-demo.vercel.app",
    demoAspect: 9 / 16
  },
  {
    name: "Pack Rush",
    icon: "./assets/game4-icon.png",
    preview: "./assets/game4-preview.png",
    demoUrl: "https://pack-rush-demo.vercel.app",
    demoAspect: 8 / 5
  }
];

const DEFAULT_HINT = "Playable demo — one level to get the feel.";
const ROTATE_HINT = "Tip: rotate your phone for a bigger view.";

// State management
let isMobile = false;
let showPreview = false;
let previewHideTimer = null;
let activeDemoGame = null;
let lastDemoTrigger = null;
let projectVideo = null;
let projectVideoInView = false;

// DOM elements
let previewCard = null;
let previewImage = null;
let previewTitle = null;
let previewHint = null;
let gameButtons = [];

let demoModal = null;
let demoPanel = null;
let demoHeader = null;
let demoFrameWrap = null;
let demoModalFrame = null;
let demoModalTitle = null;
let demoModalHint = null;
let demoModalClose = null;
let demoModalFullscreen = null;
let demoModalBackdrop = null;

// Utility functions
function detectMobile() {
  // Hover previews only make sense with a precise pointer
  return (
    window.matchMedia('(hover: none), (pointer: coarse)').matches ||
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

function getGame(button) {
  return GAMES[parseInt(button.getAttribute('data-game-index'), 10)];
}

// Preview card
function showGamePreview(game, buttonElement) {
  if (!game || !previewCard) return;

  showPreview = true;
  previewImage.src = game.preview;
  previewImage.alt = `${game.name} screenshot`;
  previewTitle.textContent = game.name;
  previewHint.textContent = game.demoUrl ? 'Click to play the demo' : 'Demo coming soon';

  const cardWidth = previewCard.offsetWidth;
  const cardHeight = previewCard.offsetHeight;
  const rect = buttonElement.getBoundingClientRect();
  const gap = 16;

  // Keep the card inside the viewport horizontally
  const half = cardWidth / 2 + 8;
  const centerX = Math.max(half, Math.min(window.innerWidth - half, rect.left + rect.width / 2));

  // Prefer above the icon; fall back to below when there isn't room
  let top = rect.top - cardHeight - gap;
  if (top < 8) {
    top = rect.bottom + gap;
  }
  top = Math.max(8, Math.min(top, window.innerHeight - cardHeight - 8));

  previewCard.style.left = `${centerX}px`;
  previewCard.style.top = `${top}px`;
  previewCard.setAttribute('aria-hidden', 'false');
  previewCard.classList.add('is-visible');
}

function hideGamePreview() {
  showPreview = false;
  clearTimeout(previewHideTimer);

  if (previewCard) {
    previewCard.setAttribute('aria-hidden', 'true');
    previewCard.classList.remove('is-visible');
  }
}

// Demo modal
function isFullscreenSupported() {
  return Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function toggleDemoFullscreen() {
  if (getFullscreenElement()) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    return;
  }
  const request = demoFrameWrap.requestFullscreen || demoFrameWrap.webkitRequestFullscreen;
  if (request) {
    request.call(demoFrameWrap);
  }
}

// Size the game frame to the largest box with the game's aspect ratio that fits the screen,
// so portrait and landscape builds never get squashed or cut off.
function layoutDemoFrame() {
  if (!activeDemoGame) return;

  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const compact = viewportWidth <= 600 || viewportHeight <= 560;
  demoModal.classList.toggle('is-compact', compact);

  const ratio = activeDemoGame.demoAspect || 9 / 16;
  const wantsRotate = ratio > 1 && viewportHeight > viewportWidth;
  demoModalHint.textContent = wantsRotate ? ROTATE_HINT : DEFAULT_HINT;

  const panelStyle = getComputedStyle(demoPanel);
  const wrapStyle = getComputedStyle(demoFrameWrap);
  const chromeX =
    parseFloat(panelStyle.paddingLeft) + parseFloat(panelStyle.paddingRight) +
    parseFloat(panelStyle.borderLeftWidth) + parseFloat(panelStyle.borderRightWidth) +
    parseFloat(wrapStyle.borderLeftWidth) + parseFloat(wrapStyle.borderRightWidth);
  const hintStyle = getComputedStyle(demoModalHint);
  const hintHeight = demoModalHint.offsetHeight
    ? demoModalHint.offsetHeight + parseFloat(hintStyle.marginTop) + parseFloat(hintStyle.marginBottom)
    : 0;
  const chromeY =
    parseFloat(panelStyle.paddingTop) + parseFloat(panelStyle.paddingBottom) +
    parseFloat(panelStyle.borderTopWidth) + parseFloat(panelStyle.borderBottomWidth) +
    demoHeader.offsetHeight + parseFloat(getComputedStyle(demoHeader).marginBottom) + hintHeight +
    parseFloat(wrapStyle.borderTopWidth) + parseFloat(wrapStyle.borderBottomWidth);

  const outerMargin = compact ? 0 : 48;
  const maxWidth = Math.min(viewportWidth - outerMargin - chromeX, 1100);
  const maxHeight = viewportHeight - outerMargin - chromeY;

  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  demoFrameWrap.style.width = `${Math.floor(width)}px`;
  demoFrameWrap.style.height = `${Math.floor(height)}px`;
  demoPanel.style.width = compact ? '' : `${Math.floor(width + chromeX)}px`;
}

function openDemoModal(game, trigger) {
  if (!game || !game.demoUrl || !demoModal) return;

  hideGamePreview();
  activeDemoGame = game;
  syncProjectVideo();
  lastDemoTrigger = trigger || null;

  demoModalTitle.textContent = game.name;
  demoModalFrame.title = `${game.name} playable demo`;

  demoModal.setAttribute('aria-hidden', 'false');
  demoModal.classList.add('is-visible');
  document.documentElement.classList.add('demo-modal-open');

  layoutDemoFrame();
  demoModalFrame.src = game.demoUrl;
  demoModalClose.focus();
}

function closeDemoModal() {
  if (!demoModal || !activeDemoGame) return;

  if (getFullscreenElement()) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }

  activeDemoGame = null;
  demoModal.setAttribute('aria-hidden', 'true');
  demoModal.classList.remove('is-visible');
  document.documentElement.classList.remove('demo-modal-open');

  // Unload the WebGL build fully (stops audio/CPU usage)
  demoModalFrame.src = 'about:blank';
  syncProjectVideo();

  if (lastDemoTrigger) {
    lastDemoTrigger.focus({ preventScroll: true });
    lastDemoTrigger = null;
  }
}

// Featured project video: plays muted only while on screen, so it costs nothing until scrolled to
function setupProjectVideo() {
  const video = document.querySelector('.project-card__video');
  const soundButton = document.querySelector('.project-card__sound');
  if (!video || !soundButton) return;

  projectVideo = video;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      projectVideoInView = entries[0].isIntersecting;
      syncProjectVideo();
    }, { threshold: 0.35 }).observe(video);
  }

  soundButton.addEventListener('click', () => {
    video.muted = !video.muted;
    soundButton.setAttribute('aria-pressed', String(!video.muted));
    soundButton.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
    syncProjectVideo();
  });
}

function syncProjectVideo() {
  if (!projectVideo) return;

  // With reduced motion the video only plays once the visitor turns the sound on
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldPlay = projectVideoInView && !activeDemoGame && (!reduceMotion || !projectVideo.muted);

  if (shouldPlay) {
    const playing = projectVideo.play();
    if (playing) {
      playing.catch(() => {});
    }
  } else {
    projectVideo.pause();
  }
}

// Event handlers
function handleGameHover(event) {
  if (isMobile) return;
  // Only keyboard focus should open the preview, not focus restored after a mouse click
  if (event.type === 'focus' && !event.currentTarget.matches(':focus-visible')) return;
  showGamePreview(getGame(event.currentTarget), event.currentTarget);
}

function handleGameClick(event) {
  const button = event.currentTarget;
  const game = getGame(button);
  if (!game) return;

  if (game.demoUrl) {
    openDemoModal(game, button);
    return;
  }

  // No demo yet: on touch devices show the preview briefly instead
  showGamePreview(game, button);
  clearTimeout(previewHideTimer);
  previewHideTimer = setTimeout(hideGamePreview, 3000);
}

function handleKeyDown(event) {
  if (event.key !== 'Escape') return;

  if (activeDemoGame) {
    closeDemoModal();
  } else if (showPreview) {
    hideGamePreview();
  }
}

function handleClickOutside(event) {
  if (!showPreview) return;
  if (!event.target.closest('.game-button')) {
    hideGamePreview();
  }
}

function handleResize() {
  isMobile = detectMobile();
  if (showPreview) {
    hideGamePreview();
  }
  layoutDemoFrame();
}

// Initialize the application
function initializeApp() {
  isMobile = detectMobile();

  previewCard = document.getElementById('preview');
  previewImage = previewCard.querySelector('.preview-image');
  previewTitle = previewCard.querySelector('.preview-title');
  previewHint = previewCard.querySelector('.preview-hint');
  gameButtons = Array.from(document.querySelectorAll('.game-button'));

  demoModal = document.getElementById('demo-modal');
  demoPanel = demoModal.querySelector('.demo-modal__panel');
  demoHeader = demoModal.querySelector('.demo-modal__header');
  demoFrameWrap = demoModal.querySelector('.demo-modal__frame-wrap');
  demoModalFrame = demoModal.querySelector('.demo-modal__frame');
  demoModalTitle = demoModal.querySelector('.demo-modal__title');
  demoModalHint = demoModal.querySelector('.demo-modal__hint');
  demoModalClose = demoModal.querySelector('.demo-modal__close');
  demoModalFullscreen = demoModal.querySelector('.demo-modal__fullscreen');
  demoModalBackdrop = demoModal.querySelector('.demo-modal__backdrop');

  preloadImages();
  setupProjectVideo();

  gameButtons.forEach(button => {
    const game = getGame(button);
    if (!game) return;

    button.setAttribute('aria-label', game.demoUrl ? `Play ${game.name} demo` : `${game.name} (demo coming soon)`);

    const img = button.querySelector('img');
    if (img) {
      img.src = game.icon;
    }

    const item = button.closest('.game-item');
    const label = item && item.querySelector('.game-name');
    if (label) {
      label.textContent = game.name;
    }
    if (item && !game.demoUrl) {
      item.classList.add('game-item--soon');
    }

    button.addEventListener('mouseenter', handleGameHover);
    button.addEventListener('mouseleave', hideGamePreview);
    button.addEventListener('focus', handleGameHover);
    button.addEventListener('blur', hideGamePreview);
    button.addEventListener('click', handleGameClick);
  });

  demoModalClose.addEventListener('click', closeDemoModal);
  demoModalBackdrop.addEventListener('click', closeDemoModal);

  if (isFullscreenSupported()) {
    demoModalFullscreen.addEventListener('click', toggleDemoFullscreen);
  } else {
    // iPhone Safari can't fullscreen arbitrary elements
    demoModalFullscreen.hidden = true;
  }

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('resize', handleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', layoutDemoFrame);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && showPreview) {
      hideGamePreview();
    }
  });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
