// ─────────────────────────────────────────────────────────────────────────────
// Preschool Tour — Unified Hub
// Map → select tour → intro video → photo sequence → [outro] → complete → map
// ─────────────────────────────────────────────────────────────────────────────

class PreschoolHub {
  constructor(config) {
    this.tours      = config.tours;
    this.activeTour = null;
    this.photoIndex = 0;
    this.state      = null;

    // DOM refs
    this.splash          = document.getElementById('splash-screen');
    this.loaderBar       = document.querySelector('.loader-bar');
    this.mapScreen       = document.getElementById('map-screen');
    this.mapHotspots     = document.getElementById('map-hotspots');
    this.videoScreen     = document.getElementById('video-screen');
    this.photoScreen     = document.getElementById('photo-screen');
    this.completeScreen  = document.getElementById('complete-screen');
    this.video           = document.getElementById('tour-video');
    this.videoSrc        = document.getElementById('video-src');
    this.videoLabel      = document.getElementById('video-label');
    this.tapHint         = document.getElementById('video-tap-hint');
    this.videoBackBtn    = document.getElementById('video-back-btn');
    this.outroVideo      = document.getElementById('outro-video');
    this.outroSrc        = document.getElementById('outro-src');
    this.photo           = document.getElementById('tour-photo');
    this.hotspot         = document.getElementById('hotspot');
    this.dots            = document.getElementById('progress-dots');
    this.progressLbl     = document.getElementById('progress-label');
    this.progressFill    = document.getElementById('progress-fill');
    this.photoBackBtn    = document.getElementById('photo-back-btn');
    this.completeOverlay = document.getElementById('complete-overlay');
    this.homeBtn         = document.getElementById('home-btn');
    this.overlay         = document.getElementById('transition-overlay');

    this._buildMapHotspots();
    this._bindEvents();
    this._showSplash();
  }

  // ── Splash ───────────────────────────────────────────────────────────────

  _showSplash() {
    const duration = 2200;
    const start = performance.now();
    const tick = (now) => {
      const pct = Math.min((now - start) / duration * 100, 100);
      this.loaderBar.style.width = pct + '%';
      if (pct < 100) { requestAnimationFrame(tick); }
      else { setTimeout(() => this._hideSplash(), 300); }
    };
    requestAnimationFrame(tick);
  }

  _hideSplash() {
    this.splash.classList.add('hidden');
    setTimeout(() => {
      this.splash.style.display = 'none';
      this._goToMap();
    }, 800);
  }

  // ── Map ──────────────────────────────────────────────────────────────────

  _buildMapHotspots() {
    this.tours.forEach(tour => {
      const btn = document.createElement('button');
      btn.className = 'map-hotspot';
      btn.style.left = tour.hotspot.x + '%';
      btn.style.top  = tour.hotspot.y + '%';
      btn.dataset.tourId = tour.id;

      btn.innerHTML = `
        <div class="map-hotspot-ring">
          <div class="map-hotspot-dot">👆</div>
        </div>
        <span class="map-hotspot-label">${tour.label}</span>
      `;

      btn.addEventListener('click', () => this._startTour(tour.id));
      this.mapHotspots.appendChild(btn);
    });
  }

  _goToMap() {
    this.activeTour = null;
    this.completeOverlay.classList.remove('visible');
    this._setState('map');
  }

  // ── Tour ─────────────────────────────────────────────────────────────────

  _startTour(tourId) {
    this.activeTour = this.tours.find(t => t.id === tourId);
    if (!this.activeTour) return;

    this._fadeOut(() => {
      this._buildDots();
      this._playVideo(
        this.activeTour.introVideo,
        this.activeTour.label,
        () => {
          this._fadeOut(() => {
            this._setState('photo');
            this._showPhoto(0);
            this._fadeIn();
          });
        }
      );
      this._fadeIn();
    });
  }

  // ── State ─────────────────────────────────────────────────────────────────

  _setState(state) {
    this.state = state;
    this.mapScreen.classList.toggle('active',      state === 'map');
    this.videoScreen.classList.toggle('active',    state === 'video');
    this.photoScreen.classList.toggle('active',    state === 'photo');
    this.completeScreen.classList.toggle('active', state === 'complete');
  }

  // ── Video ─────────────────────────────────────────────────────────────────

  _playVideo(src, label, onEnd) {
    this._setState('video');
    this.tapHint.classList.remove('visible');
    this.videoLabel.textContent = label || '';
    this.videoSrc.src = src;
    this.video.load();
    this.video.play().catch(() => {
      this.tapHint.classList.add('visible');
      const resume = () => {
        this.video.play();
        this.video.removeEventListener('click', resume);
        this.tapHint.classList.remove('visible');
      };
      this.video.addEventListener('click', resume);
    });
    this._onVideoEnd = onEnd;
  }

  // ── Photo sequence ────────────────────────────────────────────────────────

  _showPhoto(index) {
    const step = this.activeTour.photos[index];
    this.photoIndex = index;
    this.photo.src = step.src;
    const hx = step.hotspot?.x ?? 50;
    const hy = step.hotspot?.y ?? 75;
    this.hotspot.style.setProperty('--hx', hx);
    this.hotspot.style.setProperty('--hy', hy);
    this._updateProgress(index);
  }

  _advance() {
    const next = this.photoIndex + 1;
    if (next < this.activeTour.photos.length) {
      this._fadeOut(() => { this._showPhoto(next); this._fadeIn(); });
    } else {
      this._fadeOut(() => { this._playOutro(); this._fadeIn(); });
    }
  }

  // ── Outro / Complete ──────────────────────────────────────────────────────

  _playOutro() {
    this._setState('complete');
    const showComplete = () => this.completeOverlay.classList.add('visible');

    if (this.activeTour.outroVideo) {
      this.outroSrc.src = this.activeTour.outroVideo;
      this.outroVideo.load();
      this.outroVideo.play().catch(() => {
        const resume = () => { this.outroVideo.play(); this.outroVideo.removeEventListener('click', resume); };
        this.outroVideo.addEventListener('click', resume);
      });
      this.outroVideo.addEventListener('ended', showComplete, { once: true });
    } else {
      setTimeout(showComplete, 400);
    }
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  _buildDots() {
    this.dots.innerHTML = '';
    this.activeTour.photos.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'dot';
      this.dots.appendChild(dot);
    });
  }

  _updateProgress(index) {
    const total = this.activeTour.photos.length;
    document.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
      dot.classList.toggle('done',   i < index);
    });
    this.progressLbl.textContent = `Крок ${index + 1} з ${total}`;
    this.progressFill.style.width = (total <= 1 ? 100 : (index / (total - 1)) * 100) + '%';
  }

  // ── Transitions ───────────────────────────────────────────────────────────

  _fadeOut(cb) {
    this.overlay.classList.add('visible');
    this.overlay.addEventListener('transitionend', cb, { once: true });
  }
  _fadeIn() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.overlay.classList.remove('visible');
    }));
  }

  // ── Events ────────────────────────────────────────────────────────────────

  _bindEvents() {
    // Video ended
    this.video.addEventListener('ended', () => {
      if (this._onVideoEnd) this._onVideoEnd();
    });

    // Advance through photos
    this.hotspot.addEventListener('click', () => this._advance());

    // Back buttons → return to map
    this.videoBackBtn.addEventListener('click', () => {
      this.video.pause();
      this._fadeOut(() => { this._goToMap(); this._fadeIn(); });
    });
    this.photoBackBtn.addEventListener('click', () => {
      this._fadeOut(() => { this._goToMap(); this._fadeIn(); });
    });

    // Home button on complete screen
    this.homeBtn.addEventListener('click', () => {
      this.outroVideo.pause();
      this._fadeOut(() => { this._goToMap(); this._fadeIn(); });
    });

    // Keyboard
    document.addEventListener('keydown', e => {
      if (['ArrowRight', 'Space', 'Enter'].includes(e.code) && this.state === 'photo') {
        e.preventDefault(); this._advance();
      }
      if (e.code === 'Escape' && (this.state === 'video' || this.state === 'photo')) {
        this.video.pause();
        this._fadeOut(() => { this._goToMap(); this._fadeIn(); });
      }
    });
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  fetch('config.json')
    .then(r => r.json())
    .then(config => new PreschoolHub(config))
    .catch(err => {
      document.body.innerHTML = `<div style="color:#fff;padding:40px;font-family:sans-serif;background:#1a1a2e;height:100vh;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;text-align:center">
        <div style="font-size:48px">⚠️</div>
        <h2 style="font-size:22px">Помилка завантаження</h2>
        <p style="opacity:0.6">${err.message}</p>
      </div>`;
    });
});
