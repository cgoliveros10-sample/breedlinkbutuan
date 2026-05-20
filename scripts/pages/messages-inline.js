// Extracted inline script from messages.html
function toggleMobileMenu() {
  var btn = document.getElementById('hamburgerBtn');
  var menu = document.getElementById('navMenu');
  var center = menu ? menu.parentElement : null;
  if (!btn || !center) return;
  var isOpen = btn.classList.toggle('open');
  if (isOpen) {
    center.classList.add('mobile-open');
    document.body.style.overflow = 'hidden';
  } else {
    center.classList.remove('mobile-open');
    document.body.style.overflow = '';
  }
  var mobileAuth = document.getElementById('mobileNavAuth');
  var guestOptions = document.getElementById('guestOptions');
  if (mobileAuth && guestOptions) {
    var isGuest = guestOptions.style.display !== 'none';
    mobileAuth.style.display = isOpen && isGuest ? 'flex' : 'none';
  }
}
document.addEventListener('DOMContentLoaded', function() {
  var links = document.querySelectorAll('#navMenu a, .mobile-nav-auth a');
  links.forEach(function(link) {
    link.addEventListener('click', function() {
      var btn = document.getElementById('hamburgerBtn');
      if (btn && btn.classList.contains('open')) toggleMobileMenu();
    });
  });
  document.addEventListener('click', function(e) {
    var btn = document.getElementById('hamburgerBtn');
    var nav = document.getElementById('navMenu');
    if (!btn || !nav) return;
    if (btn.classList.contains('open') && !btn.contains(e.target) && !nav.parentElement.contains(e.target)) {
      toggleMobileMenu();
    }
  });
});
