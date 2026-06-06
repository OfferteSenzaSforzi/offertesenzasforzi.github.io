import { gsap } from 'gsap';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', (): void => {
  // Set current year in footer
  const yearElement = document.getElementById('year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear().toString();
  }

  // Split logo text into individual letters
  const logo = document.querySelector('.logo');
  if (logo) {
    const text = logo.textContent || '';
    logo.innerHTML = text
      .split('')
      .map((char) => `<span class="letter">${char}</span>`)
      .join('');
  }

  // Get all letters
  const letters = document.querySelectorAll('.letter');

  // Create a timeline for coordinated animations
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // Animate each letter with stagger effect
  tl.from(letters, {
    duration: 0.8,
    y: 100,
    opacity: 0,
    rotationX: -90,
    stagger: 0.1,
    ease: 'back.out(1.7)',
  })
  // Add a subtle bounce effect
  .to(letters, {
    duration: 0.4,
    y: -10,
    stagger: 0.05,
    ease: 'power2.out',
  })
  .to(letters, {
    duration: 0.3,
    y: 0,
    stagger: 0.05,
    ease: 'bounce.out',
  })
  // Animate tagline
  .from('.tagline', {
    duration: 1,
    y: 20,
    opacity: 0,
  }, '-=0.6');

  // Add hover effect on individual letters
  letters.forEach((letter) => {
    letter.addEventListener('mouseenter', () => {
      gsap.to(letter, {
        duration: 0.3,
        y: -15,
        scale: 1.2,
        color: '#000',
        ease: 'power2.out',
      });
    });

    letter.addEventListener('mouseleave', () => {
      gsap.to(letter, {
        duration: 0.3,
        y: 0,
        scale: 1,
        color: 'inherit',
        ease: 'power2.out',
      });
    });
  });
});