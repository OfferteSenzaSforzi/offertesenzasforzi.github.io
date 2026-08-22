import { gsap } from 'gsap';

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll<HTMLElement>('[data-current-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const motion = gsap.context(() => {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.policy-header-inner', { opacity: 0, y: -12, duration: 0.45 })
      .from('.policy-eyebrow', { opacity: 0, y: 12, duration: 0.42 }, 0.08)
      .from('.policy-hero h1', { opacity: 0, y: 26, duration: 0.68 }, 0.14)
      .from('.policy-lead, .effective-date', { opacity: 0, y: 16, stagger: 0.08, duration: 0.48 }, 0.34)
      .from('.policy-summary', { opacity: 0, y: 22, scale: 0.97, duration: 0.62 }, 0.3)
      .from('.policy-summary li', { opacity: 0, y: 10, stagger: 0.07, duration: 0.34 }, 0.56);
  });

  const sections = document.querySelectorAll<HTMLElement>('[data-reveal-section]');
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      gsap.from(entry.target, {
        opacity: 0,
        y: 22,
        duration: 0.55,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      });
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  sections.forEach((section) => observer.observe(section));
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    motion.revert();
  }, { once: true });
});
