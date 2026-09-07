/**
 * ============================================================================
 * MAYA OFFICIAL WEBSITE SCRIPT
 * Unified App Showcase Switcher, 3D Mockup Depth, Direct APK Downloads,
 * Dynamic QR Code, SHA-256 Checksum, Android Modal & Lightbox.
 * ============================================================================
 */

import { CONFIG } from './config.js';
import QRCode from 'qrcode';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Unified App Showcase Interactive Switcher
  initShowcaseSwitcher();

  // 2. Center Phone 3D Tilt Micro-Interaction
  initPhoneTilt();

  // 3. Download Buttons & Feedback
  initDownloadButtons();

  // 4. APK SHA-256 Verification & Copying
  initSha256Verification();

  // 5. Desktop to Mobile QR Code Generation
  initDesktopQrCode();

  // 6. Android Installation Guide Modal
  initInstallModal();

  // 7. Full-Screen Lightbox Image Inspection
  initLightbox();

  // 8. Header Scroll Glass Effect
  initHeaderScrollEffect();

  // 9. Mobile Navigation Drawer
  initMobileMenu();

  // 10. Mobile Showcase Swipe Carousel Controller
  initMobileShowcaseCarousel();

  // 11. Scroll Reveal Observer
  initScrollReveals();

  // 12. Dynamic Year
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = CONFIG.COPYRIGHT_YEAR.toString();
  }
});

/**
 * Unified Showcase Screen Switcher: Controls tabs & flanking docks
 */
function initShowcaseSwitcher() {
  const tabs = document.querySelectorAll('.screen-nav-tab');
  const stageImg = document.getElementById('main-stage-img');
  const stageCaption = document.getElementById('main-stage-caption');
  const heroScreen = document.getElementById('hero-phone-screen');
  const dockTriggers = document.querySelectorAll('.js-dock-switch');

  if (!tabs.length || !stageImg) return;

  const switchScreen = (tab) => {
    tabs.forEach(t => {
      t.classList.remove('is-active');
      t.setAttribute('aria-selected', 'false');
    });

    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');

    const newSrc = tab.getAttribute('data-img');
    const newCaption = tab.getAttribute('data-caption');
    const newAlt = tab.getAttribute('data-alt');

    // Subtle crossfade animation
    stageImg.classList.add('is-switching');

    setTimeout(() => {
      stageImg.src = newSrc;
      stageImg.alt = newAlt;

      if (stageCaption) {
        const textSpan = stageCaption.querySelector('.badge-text');
        if (textSpan) textSpan.textContent = newCaption;
      }

      if (heroScreen) {
        heroScreen.setAttribute('data-img', newSrc);
        heroScreen.setAttribute('data-caption', newAlt);
      }

      stageImg.classList.remove('is-switching');
    }, 120);
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchScreen(tab));
  });

  // Clicking flanking secondary docks activates that screen in the center
  dockTriggers.forEach(dock => {
    const handleDock = () => {
      const targetIndex = dock.getAttribute('data-screen-index');
      const matchingTab = document.querySelector(`.screen-nav-tab[data-index="${targetIndex}"]`);
      if (matchingTab) {
        switchScreen(matchingTab);
      }
    };

    dock.addEventListener('click', handleDock);
    dock.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDock();
      }
    });
  });
}

/**
 * Subtle 3D perspective tilt on the centerpiece device mockup
 */
function initPhoneTilt() {
  const centerDock = document.getElementById('main-device-center');
  if (!centerDock || window.matchMedia('(pointer: coarse)').matches) return;

  const phone = centerDock.querySelector('.phone-hero');
  if (!phone) return;

  const handleMouseMove = (e) => {
    const rect = phone.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Very subtle tilt (max ±3 degrees)
    const rotateX = ((y - centerY) / centerY) * -2.5;
    const rotateY = ((x - centerX) / centerX) * 2.5;

    phone.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  };

  const handleMouseLeave = () => {
    phone.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)';
  };

  phone.addEventListener('mousemove', handleMouseMove);
  phone.addEventListener('mouseleave', handleMouseLeave);
}

/**
 * Direct APK Download with visual loading feedback and double-click debounce
 */
function initDownloadButtons() {
  const downloadButtons = document.querySelectorAll('.js-download-btn');
  let isDownloading = false;

  downloadButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      if (isDownloading) return;
      isDownloading = true;

      const textSpan = btn.querySelector('.cta-text');
      const originalText = textSpan ? textSpan.textContent : 'DOWNLOAD';

      btn.classList.add('is-loading');
      btn.setAttribute('disabled', 'true');
      btn.setAttribute('aria-busy', 'true');
      if (textSpan) {
        textSpan.textContent = 'STARTING DOWNLOAD...';
      }

      // Direct APK download execution
      const downloadLink = document.createElement('a');
      downloadLink.href = CONFIG.APP_DOWNLOAD_URL;
      downloadLink.download = CONFIG.DOWNLOAD_FILENAME;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-busy');
        if (textSpan) {
          textSpan.textContent = originalText;
        }
        isDownloading = false;
      }, 3000);
    });
  });
}

/**
 * Display actual SHA-256 checksum and handle 1-click clipboard copy
 */
function initSha256Verification() {
  const codeEl = document.getElementById('sha256-code');
  const copyBtn = document.getElementById('copy-hash-btn');
  if (!codeEl || !copyBtn) return;

  const actualHash = CONFIG.APK_SHA256;

  if (actualHash && actualHash.trim() !== '') {
    codeEl.textContent = actualHash;
    codeEl.title = actualHash;
  } else {
    codeEl.textContent = 'Hash available upon official release';
    copyBtn.style.display = 'none';
    return;
  }

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(actualHash);
      const textSpan = copyBtn.querySelector('.copy-status-text');
      
      copyBtn.classList.add('is-copied');
      if (textSpan) textSpan.textContent = 'COPIED ✓';

      setTimeout(() => {
        copyBtn.classList.remove('is-copied');
        if (textSpan) textSpan.textContent = 'COPY HASH';
      }, 2400);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = actualHash;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      const textSpan = copyBtn.querySelector('.copy-status-text');
      copyBtn.classList.add('is-copied');
      if (textSpan) textSpan.textContent = 'COPIED ✓';
      setTimeout(() => {
        copyBtn.classList.remove('is-copied');
        if (textSpan) textSpan.textContent = 'COPY HASH';
      }, 2400);
    }
  });

  // Also wire up final CTA hash badge if present
  const finalCodeEl = document.getElementById('final-sha256-code');
  const finalCopyBtn = document.getElementById('copy-final-hash-btn');

  if (finalCodeEl && actualHash) {
    finalCodeEl.textContent = actualHash;
    finalCodeEl.title = actualHash;
  }

  if (finalCopyBtn) {
    finalCopyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(actualHash);
        finalCopyBtn.textContent = 'COPIED ✓';
        finalCopyBtn.classList.add('is-copied');
        setTimeout(() => {
          finalCopyBtn.textContent = 'COPY';
          finalCopyBtn.classList.remove('is-copied');
        }, 2200);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = actualHash;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        finalCopyBtn.textContent = 'COPIED ✓';
        setTimeout(() => {
          finalCopyBtn.textContent = 'COPY';
        }, 2200);
      }
    });
  }
}

/**
 * Generate dynamic SVG QR code for desktop visitors
 */
function initDesktopQrCode() {
  const qrContainer = document.getElementById('desktop-qr-container');
  const toggleBtn = document.getElementById('qr-toggle-btn');
  const popover = document.getElementById('qr-popover');
  const closeBtn = document.getElementById('close-qr-btn');
  const target = document.getElementById('qr-target');

  if (!qrContainer || !toggleBtn || !popover || !target) return;

  const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  if (isMobile) {
    qrContainer.style.display = 'none';
    return;
  }

  const absoluteUrl = CONFIG.APP_DOWNLOAD_URL.startsWith('http')
    ? CONFIG.APP_DOWNLOAD_URL
    : `${window.location.origin}${CONFIG.APP_DOWNLOAD_URL}`;

  QRCode.toString(absoluteUrl, {
    type: 'svg',
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    width: 150,
  }, (err, svgString) => {
    if (!err && svgString) {
      target.innerHTML = svgString;
    }
  });

  const togglePopover = (open) => {
    const isHidden = typeof open === 'boolean' ? !open : !popover.hidden;
    popover.hidden = isHidden;
    toggleBtn.setAttribute('aria-expanded', (!isHidden).toString());
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopover();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopover(false);
    });
  }

  document.addEventListener('click', (e) => {
    if (!popover.hidden && !qrContainer.contains(e.target)) {
      togglePopover(false);
    }
  });
}

/**
 * Android Installation Help Modal
 */
function initInstallModal() {
  const modal = document.getElementById('install-modal');
  const openButtons = document.querySelectorAll('.js-open-install-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  const dismissBtn = document.getElementById('dismiss-modal-btn');

  if (!modal) return;

  const openModal = () => {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
  };

  openButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (dismissBtn) dismissBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });
}

/**
 * Lightbox Modal for high-res screenshot inspection
 */
function initLightbox() {
  const lightbox = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption-text');
  const closeBtn = document.getElementById('close-lightbox-btn');
  const triggers = document.querySelectorAll('.js-lightbox-trigger');

  if (!lightbox || !lightboxImg) return;

  const openLightbox = (src, caption) => {
    lightboxImg.src = src;
    lightboxImg.alt = caption;
    if (lightboxCaption) lightboxCaption.textContent = caption;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    lightboxImg.src = '';
    document.body.style.overflow = '';
  };

  triggers.forEach((trigger) => {
    const handleTrigger = () => {
      const src = trigger.getAttribute('data-img');
      const caption = trigger.getAttribute('data-caption') || '';
      if (src) openLightbox(src, caption);
    };

    trigger.addEventListener('click', handleTrigger);
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTrigger();
      }
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-container')) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) {
      closeLightbox();
    }
  });
}

/**
 * Header background opacity adjustment
 */
function initHeaderScrollEffect() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      header.style.backgroundColor = 'rgba(2, 2, 2, 0.95)';
      header.style.borderBottomColor = '#242424';
    } else {
      header.style.backgroundColor = 'rgba(5, 5, 5, 0.9)';
      header.style.borderBottomColor = 'var(--border-subtle)';
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/**
 * Mobile Navigation Drawer with lock scrolling and close trigger
 */
function initMobileMenu() {
  const toggleBtn = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const closeBtn = document.getElementById('menu-close-btn');
  if (!toggleBtn || !mobileMenu) return;

  const toggle = (forceClose = false) => {
    const isOpen = forceClose ? false : !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen.toString());
    mobileMenu.setAttribute('aria-hidden', (!isOpen).toString());
    
    // Lock background scroll when drawer is open
    document.body.style.overflow = isOpen ? 'hidden' : '';

    const bars = toggleBtn.querySelectorAll('.menu-bar');
    if (bars && bars.length >= 2) {
      if (isOpen) {
        bars[0].style.transform = 'translateY(5px) rotate(45deg)';
        bars[1].style.opacity = '0';
        if (bars[2]) bars[2].style.transform = 'translateY(-5px) rotate(-45deg)';
      } else {
        bars[0].style.transform = 'none';
        bars[1].style.opacity = '1';
        if (bars[2]) bars[2].style.transform = 'none';
      }
    }
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => toggle(true));
  }

  // Close drawer upon clicking any navigation link or download button
  const mobileActionItems = mobileMenu.querySelectorAll('a, button:not(#menu-close-btn)');
  mobileActionItems.forEach(item => {
    item.addEventListener('click', () => {
      setTimeout(() => toggle(true), 120);
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
      toggle(true);
    }
  });

  // Close when clicking outside drawer
  document.addEventListener('click', (e) => {
    if (mobileMenu.classList.contains('open') && !mobileMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
      toggle(true);
    }
  });
}

/**
 * Mobile Showcase Carousel: syncs swipe position with dot indicators and slide counter
 */
function initMobileShowcaseCarousel() {
  const track = document.getElementById('mobile-showcase-track');
  const dots = document.querySelectorAll('#mobile-dots .carousel-dot');
  const counter = document.getElementById('mobile-counter');
  const slides = document.querySelectorAll('.mobile-showcase-slide');

  if (!track || !dots.length || !slides.length) return;

  let isTicking = false;

  const updateActiveDot = () => {
    const scrollLeft = track.scrollLeft;
    const slideWidth = slides[0].offsetWidth || track.clientWidth;
    const activeIndex = Math.min(
      Math.max(0, Math.round(scrollLeft / slideWidth)),
      slides.length - 1
    );

    dots.forEach((dot, idx) => {
      const isActive = idx === activeIndex;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-selected', isActive.toString());
    });

    if (counter) {
      const current = (activeIndex + 1).toString().padStart(2, '0');
      const total = slides.length.toString().padStart(2, '0');
      counter.textContent = `${current} / ${total} • SWIPE`;
    }

    isTicking = false;
  };

  track.addEventListener('scroll', () => {
    if (!isTicking) {
      window.requestAnimationFrame(updateActiveDot);
      isTicking = true;
    }
  }, { passive: true });

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      const targetSlide = slides[idx];
      if (targetSlide) {
        track.scrollTo({
          left: targetSlide.offsetLeft,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Scroll reveal observer
 */
function initScrollReveals() {
  const revealElements = document.querySelectorAll('.reveal-item');
  
  if (!('IntersectionObserver' in window)) {
    revealElements.forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -30px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}
