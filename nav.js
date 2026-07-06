// DigiFriend — shared mobile nav toggle
// Controls display directly so it's independent of CSS caching

document.addEventListener('DOMContentLoaded', () => {
  // Ensure overlay starts hidden regardless of CSS cache
  const nav = document.getElementById('mobile-nav')
  if (nav) nav.style.display = 'none'

  // Close menu when any link inside it is clicked
  document.querySelectorAll('#mobile-nav a').forEach(a => {
    a.addEventListener('click', closeMobileNav)
  })
})

function toggleMobileNav() {
  const btn = document.getElementById('hamburger')
  const nav = document.getElementById('mobile-nav')
  if (!nav) return

  const isOpen = nav.classList.contains('open')
  if (isOpen) {
    closeMobileNav()
  } else {
    nav.classList.add('open')
    nav.style.display = 'flex'
    btn.classList.add('open')
    document.body.style.overflow = 'hidden'
  }
}

function closeMobileNav() {
  const btn = document.getElementById('hamburger')
  const nav = document.getElementById('mobile-nav')
  if (!nav) return
  nav.classList.remove('open')
  nav.style.display = 'none'
  if (btn) btn.classList.remove('open')
  document.body.style.overflow = ''
}
