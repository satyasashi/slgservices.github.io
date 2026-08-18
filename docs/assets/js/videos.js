/* Renders YouTube videos from data/videos.json.
   videos.json entries look like:
   { "id": "dQw4w9WgXcQ", "title": "...", "addedAt": "2026-08-03" }
   Add/remove entries with admin.html — this file only reads. */

async function fetchVideos() {
  try {
    const res = await fetch("data/videos.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Could not load videos.json", err);
    return [];
  }
}

function videoCard(video) {
  const title = video.title || "Untitled video";
  return `
    <div class="rounded-2xl bg-white shadow-sm shadow-black/5 ring-1 ring-black/5 overflow-hidden" data-reveal>
      <div class="video-frame">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}"
          title="${escapeHtml(title)}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
      <div class="p-5">
        <h3 class="font-display text-lg font-semibold text-[var(--ink)]">${escapeHtml(title)}</h3>
      </div>
    </div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function emptyState(message) {
  return `
    <div class="col-span-full text-center py-16 px-6 rounded-2xl bg-white/60 ring-1 ring-black/5">
      <p class="font-display text-2xl text-[var(--ink)]/70 mb-2">No videos yet</p>
      <p class="text-sm text-[var(--ink)]/50">${message}</p>
    </div>`;
}

async function renderVideos(selector, options = {}) {
  const container = document.querySelector(selector);
  if (!container) return;
  const videos = await fetchVideos();
  const sorted = [...videos].sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));
  const limited = options.limit ? sorted.slice(0, options.limit) : sorted;

  if (!limited.length) {
    container.innerHTML = emptyState(
      options.emptyMessage || "Check back soon — new videos are added regularly."
    );
    return;
  }

  container.innerHTML = limited.map(videoCard).join("");
  wireScrollReveal();
}
