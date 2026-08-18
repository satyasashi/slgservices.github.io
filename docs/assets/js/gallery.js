/* Renders photos from data/gallery.json as category "albums" — one cover
   card per category, opening to show every photo in that category.
   gallery.json entries look like:
   { "id": "...", "category": "Farm Lands", "caption": "...", "image": "assets/img/gallery/xyz.jpg", "addedAt": "2026-08-03" }
   Add/remove entries with admin.html — this file only reads. */

async function fetchGallery() {
  try {
    const res = await fetch("data/gallery.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Could not load gallery.json", err);
    return [];
  }
}

async function fetchGallerySorted() {
  const photos = await fetchGallery();
  return [...photos].sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
}

function escapeHtmlGallery(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function galleryEmptyState(message) {
  return `
    <div class="col-span-full text-center py-16 px-6 rounded-2xl bg-white/60 ring-1 ring-black/5">
      <p class="font-display text-2xl text-[var(--ink)]/70 mb-2">No photos yet</p>
      <p class="text-sm text-[var(--ink)]/50">${message}</p>
    </div>`;
}

/* Groups photos (already sorted newest-first) into one album per category. */
function groupIntoAlbums(photos) {
  const map = new Map();
  for (const p of photos) {
    if (!map.has(p.category)) map.set(p.category, []);
    map.get(p.category).push(p);
  }
  return [...map.entries()].map(([category, items]) => ({
    category,
    count: items.length,
    cover: items[0],
    peeks: items.slice(1, 3),
  }));
}

/* The stacked-photo visual shared by the homepage link version and the
   in-page button version on the gallery page. */
function albumStackVisual(album) {
  const peekLayers = [...album.peeks].reverse(); // furthest-back peek first
  const layersHtml = peekLayers
    .map(
      (photo, i) =>
        `<div class="stack-layer stack-back-${peekLayers.length - i}"><img src="${photo.image}" alt="" loading="lazy"></div>`
    )
    .join("");

  return `
    <div class="photo-stack aspect-[4/3]">
      ${layersHtml}
      <div class="stack-layer stack-front">
        <img src="${album.cover.image}" alt="${escapeHtmlGallery(album.cover.caption || album.category)}" loading="lazy">
      </div>
    </div>
    <div class="mt-4 flex items-center justify-between gap-3">
      <h3 class="font-display text-lg font-semibold text-[var(--ink)]">${escapeHtmlGallery(album.category)}</h3>
      <span class="shrink-0 text-xs font-medium text-[var(--ink)]/50 bg-black/5 rounded-full px-2.5 py-1">${album.count} photo${album.count === 1 ? "" : "s"}</span>
    </div>`;
}

function albumButtonCard(album) {
  return `
    <button type="button" class="album-card group text-left" data-album="${escapeHtmlGallery(album.category)}" data-reveal>
      ${albumStackVisual(album)}
    </button>`;
}

function albumLinkCard(album) {
  return `
    <a href="gallery.html?category=${encodeURIComponent(album.category)}" class="album-card group block" data-reveal>
      ${albumStackVisual(album)}
    </a>`;
}

function galleryCard(photo, i) {
  return `
    <button type="button" class="gallery-item group relative rounded-2xl overflow-hidden ring-1 ring-black/5 bg-white aspect-square" data-index="${i}" data-reveal>
      <img src="${photo.image}" alt="${escapeHtmlGallery(photo.caption || photo.category)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
      ${
        photo.caption
          ? `<span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left">
        <span class="block text-white text-sm font-medium">${escapeHtmlGallery(photo.caption)}</span>
      </span>`
          : ""
      }
    </button>`;
}

/* Album grid — used for the homepage preview. Each album links straight to
   its category on the full Gallery page. */
async function renderGalleryAlbumsPreview(selector, options = {}) {
  const container = document.querySelector(selector);
  if (!container) return;
  const photos = await fetchGallerySorted();

  if (!photos.length) {
    container.innerHTML = galleryEmptyState(options.emptyMessage || "Check back soon.");
    return;
  }

  const albums = groupIntoAlbums(photos);
  const limited = options.limit ? albums.slice(0, options.limit) : albums;
  container.innerHTML = limited.map(albumLinkCard).join("");
  if (typeof wireScrollReveal === "function") wireScrollReveal();
}

/* Full gallery page: album grid → click an album to see every photo in that
   category (with a lightbox), and a link back to all albums. Supports
   landing directly on a category via ?category=Name in the URL. */
async function renderGalleryPage(gridSelector, filterSelector) {
  const grid = document.querySelector(gridSelector);
  const filterBar = document.querySelector(filterSelector);
  if (!grid) return;

  const photos = await fetchGallerySorted();

  if (!photos.length) {
    grid.innerHTML = galleryEmptyState("Photos will appear here once they're added — check back soon.");
    if (filterBar) filterBar.innerHTML = "";
    return;
  }

  const albums = groupIntoAlbums(photos);

  function setGridSpacing(isAlbumView) {
    grid.classList.toggle("gap-5", !isAlbumView);
    grid.classList.toggle("gap-x-8", isAlbumView);
    grid.classList.toggle("gap-y-10", isAlbumView);
  }

  function showAlbums() {
    history.replaceState(null, "", location.pathname);
    if (filterBar) filterBar.innerHTML = "";
    setGridSpacing(true);
    grid.innerHTML = albums.map(albumButtonCard).join("");
    grid.querySelectorAll("[data-album]").forEach((el) => {
      el.addEventListener("click", () => showCategory(el.dataset.album));
    });
    if (typeof wireScrollReveal === "function") wireScrollReveal();
  }

  function showCategory(category) {
    const items = photos.filter((p) => p.category === category);
    if (!items.length) {
      showAlbums();
      return;
    }

    history.replaceState(null, "", `?category=${encodeURIComponent(category)}`);
    setGridSpacing(false);

    if (filterBar) {
      filterBar.innerHTML = `
        <button type="button" data-back
          class="inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]/60 hover:text-[var(--brand-red)] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          All Categories
        </button>`;
      filterBar.querySelector("[data-back]").addEventListener("click", showAlbums);
    }

    grid.innerHTML = `
      <div class="col-span-full mb-2">
        <h2 class="font-display text-2xl font-semibold">${escapeHtmlGallery(category)}</h2>
        <p class="text-sm text-[var(--ink)]/50">${items.length} photo${items.length === 1 ? "" : "s"}</p>
      </div>
      ${items.map(galleryCard).join("")}`;
    wireGalleryLightbox(grid, items);
    if (typeof wireScrollReveal === "function") wireScrollReveal();
  }

  const requestedCategory = new URLSearchParams(location.search).get("category");
  if (requestedCategory && albums.some((a) => a.category === requestedCategory)) {
    showCategory(requestedCategory);
  } else {
    showAlbums();
  }
}

/* Lightbox: click a photo to view it larger with its caption. */
function wireGalleryLightbox(container, photos) {
  let overlay = document.getElementById("gallery-lightbox");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "gallery-lightbox";
    overlay.className = "fixed inset-0 z-50 hidden items-center justify-center bg-black/85 p-5";
    overlay.innerHTML = `
      <button type="button" id="gallery-lightbox-close" aria-label="Close" class="absolute top-5 right-5 text-white/70 hover:text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <figure class="max-w-4xl w-full">
        <img id="gallery-lightbox-img" src="" alt="" class="w-full max-h-[80vh] object-contain rounded-xl">
        <figcaption id="gallery-lightbox-caption" class="text-white/80 text-center mt-4 text-sm"></figcaption>
      </figure>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest("#gallery-lightbox-close")) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }

  function openLightbox(photo) {
    overlay.querySelector("#gallery-lightbox-img").src = photo.image;
    overlay.querySelector("#gallery-lightbox-img").alt = photo.caption || photo.category;
    overlay.querySelector("#gallery-lightbox-caption").textContent = [photo.category, photo.caption].filter(Boolean).join(" — ");
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
  }

  function closeLightbox() {
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
  }

  container.querySelectorAll(".gallery-item").forEach((el) => {
    el.addEventListener("click", () => openLightbox(photos[Number(el.dataset.index)]));
  });
}
