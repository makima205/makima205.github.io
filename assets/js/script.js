// Slides functionality
const slides = document.querySelectorAll('.slide');
let index = 0;

setInterval(() => {
  slides[index].classList.remove('active');
  index = (index + 1) % slides.length;
  slides[index].classList.add('active');
}, 4000);

// ================= MOBILE MENU TOGGLE =================
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('.site-nav');
  const navLinks = document.querySelectorAll('.site-nav a');

  if (menuToggle && siteNav) {
    // Toggle menu on button click
    menuToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      siteNav.classList.toggle('active');
      
      // Update aria-expanded for accessibility
      const isExpanded = this.classList.contains('active');
      this.setAttribute('aria-expanded', isExpanded);
    });

    // Close menu when clicking on a navigation link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        siteNav.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      const isClickInsideNav = siteNav.contains(event.target);
      const isClickOnToggle = menuToggle.contains(event.target);
      
      if (!isClickInsideNav && !isClickOnToggle && siteNav.classList.contains('active')) {
        menuToggle.classList.remove('active');
        siteNav.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
});

// ================= NEWS CAROUSEL =================
// News carousel controls: next / prev and autoplay
(function(){
  const track = document.querySelector('.news-track');
  const next = document.querySelector('.news-next');
  const prev = document.querySelector('.news-prev');
  if(!track) return;

  const getScrollAmount = () => {
    const card = track.querySelector('.news-card');
    if(!card) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).gap) || 20;
    return Math.round(card.getBoundingClientRect().width + gap);
  };

  next && next.addEventListener('click', () => {
    track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
  });
  prev && prev.addEventListener('click', () => {
    track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
  });

  // Autoplay (pause on hover/focus)
  let autoplay = setInterval(() => { next && next.click(); }, 4000);
  track.addEventListener('mouseenter', () => clearInterval(autoplay));
  track.addEventListener('focusin', () => clearInterval(autoplay));
  track.addEventListener('mouseleave', () => { autoplay = setInterval(() => next && next.click(), 4000); });
})();