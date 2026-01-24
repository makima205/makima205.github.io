/* =======================================================
   SCRIPT.JS
   Handles UI interactions like the Mobile Menu toggle.
   (News data loading is handled in the HTML script tag)
   ======================================================= */

document.addEventListener('DOMContentLoaded', function() {
  
  // ================= MOBILE MENU TOGGLE =================
  const menuToggle = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('.site-nav');
  const navLinks = document.querySelectorAll('.site-nav a');

  // Only execute if the menu elements exist on the page
  if (menuToggle && siteNav) {

    // 1. Toggle menu on hamburger button click
    menuToggle.addEventListener('click', function(e) {
      // Prevent this click from bubbling up to the document listener
      e.stopPropagation(); 
      
      this.classList.toggle('active');
      siteNav.classList.toggle('active');
      
      // Update accessibility attribute for screen readers
      const isExpanded = this.classList.contains('active');
      this.setAttribute('aria-expanded', isExpanded);
    });

    // 2. Close menu when clicking on any navigation link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    // 3. Close menu when clicking anywhere OUTSIDE the menu
    document.addEventListener('click', function(event) {
      const isClickInsideNav = siteNav.contains(event.target);
      const isClickOnToggle = menuToggle.contains(event.target);
      
      // If menu is open AND click is NOT on nav AND click is NOT on button -> Close it
      if (siteNav.classList.contains('active') && !isClickInsideNav && !isClickOnToggle) {
        closeMenu();
      }
    });

    // Helper function to keep code clean and dry
    function closeMenu() {
      menuToggle.classList.remove('active');
      siteNav.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  }
});