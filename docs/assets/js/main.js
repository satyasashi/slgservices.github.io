/* Shared behaviour for every page: mobile nav, active-link highlighting,
   scroll-reveal animation, footer year. The header/footer markup itself is
   duplicated directly into every page (not loaded via fetch) so the site
   still works when a page is opened straight from disk (file://), not just
   through a server. */

function currentPage() {
  const path = window.location.pathname.split("/").pop();
  return path === "" ? "index.html" : path;
}

function highlightActiveNav() {
  const page = currentPage();
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === page && !link.classList.contains("nav-cta")) {
      link.classList.add("text-[var(--brand-red)]", "font-semibold");
    }
  });
}

function wireMobileNav() {
  const toggle = document.getElementById("nav-toggle");
  const panel = document.getElementById("mobile-nav");
  if (!toggle || !panel) return;
  toggle.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  panel.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      panel.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

function setFooterYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

function wireScrollReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((el) => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
  highlightActiveNav();
  wireMobileNav();
  setFooterYear();
  wireScrollReveal();
  document.dispatchEvent(new CustomEvent("partials:loaded"));
});
