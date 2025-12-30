const slides = document.querySelectorAll('.slide');
let index = 0;

setInterval(() => {
  slides[index].classList.remove('active');
  index = (index + 1) % slides.length;
  slides[index].classList.add('active');
}, 4000);

// navbar: toggle mobile menu and add sticky background on scroll

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
