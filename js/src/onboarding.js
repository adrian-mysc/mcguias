// ── Onboarding (first-visit carousel) ────────────────────────

function initOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  // Only show on first ever visit (localStorage, not sessionStorage)
  if (McStorage.get('mc_onboarding_done', null)) return;

  overlay.style.display = 'flex';

  const slides  = overlay.querySelectorAll('.ob-slide');
  const dots    = overlay.querySelectorAll('.ob-dot');
  const nextBtn = document.getElementById('ob-next');
  const skipBtn = document.getElementById('ob-skip');
  const startBtn= document.getElementById('ob-start-btn');
  let current = 0;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = idx;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    // Last slide: hide next button
    if (nextBtn) nextBtn.style.display = current === slides.length - 1 ? 'none' : 'inline-flex';
  }

  function close() {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity .25s';
    setTimeout(() => { overlay.style.display = 'none'; }, 250);
    McStorage.set('mc_onboarding_done', '1');
  }

  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (current < slides.length - 1) goTo(current + 1);
  });
  if (skipBtn) skipBtn.addEventListener('click', close);
  if (startBtn) startBtn.addEventListener('click', close);

  // Tap outside to skip
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  goTo(0);
}
