// Navbar scroll effect
window.addEventListener('scroll', function () {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Mobile menu toggle - simplified approach
document.addEventListener('DOMContentLoaded', function () {
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.onclick = function () {
      // Toggle using inline styles for maximum compatibility
      if (navLinks.style.display === 'flex') {
        navLinks.style.display = 'none';
        menuToggle.classList.remove('active');
      } else {
        navLinks.style.display = 'flex';
        menuToggle.classList.add('active');
      }
    };

    // Close mobile menu on link click
    document.querySelectorAll('.nav-links a').forEach((link) => {
      link.onclick = function () {
        if (window.innerWidth <= 768) {
          navLinks.style.display = 'none';
          menuToggle.classList.remove('active');
        }
      };
    });

    // Reset on window resize
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        navLinks.style.display = '';
        menuToggle.classList.remove('active');
      } else {
        navLinks.style.display = 'none';
        menuToggle.classList.remove('active');
      }
    });

    // Initialize correct state
    if (window.innerWidth <= 768) {
      navLinks.style.display = 'none';
    }
  }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });
});

// Intersection Observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px',
};

const observer = new IntersectionObserver(function (entries) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe tool cards
document.querySelectorAll('.tool-card').forEach((card) => {
  observer.observe(card);
});
