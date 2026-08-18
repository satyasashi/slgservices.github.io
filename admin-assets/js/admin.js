/* Video manager for admin.html.
   Two modes, chosen automatically based on browser support:
   - File System Access API (Chrome/Edge): reads and writes videos.json
     directly on disk once the file is picked.
   - Fallback (Safari/Firefox): loads videos.json via a classic file input
     and "saving" downloads a replacement file to drag back into the project. */

const state = {
  videos: [],
  fileHandle: null, // set only when the File System Access API is available
  mode: "unloaded", // 'unloaded' | 'fsa' | 'fallback'
};

const els = {};

function qs(id) {
  return document.getElementById(id);
}

function extractYouTubeId(input) {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

async function fetchYouTubeTitle(id) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        "https://www.youtube.com/watch?v=" + id
      )}&format=json`
    );
    if (!res.ok) return "";
    const data = await res.json();
    return data.title || "";
  } catch {
    return "";
  }
}

function setStatus(message, tone = "neutral") {
  els.status.textContent = message;
  els.status.className =
    "text-sm rounded-xl px-4 py-3 " +
    (tone === "error"
      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
      : tone === "success"
      ? "bg-green-50 text-green-700 ring-1 ring-green-200"
      : "bg-black/5 text-ink/70");
}

function render() {
  els.count.textContent = state.videos.length;
  els.saveBtn.disabled = state.mode === "unloaded";
  els.addBtn.disabled = state.mode === "unloaded";

  if (!state.videos.length) {
    els.list.innerHTML = `<div class="col-span-full text-center py-14 text-ink/40 rounded-2xl bg-black/[0.03]">
      ${state.mode === "unloaded" ? "Open videos.json to get started." : "No videos yet — add one below."}
    </div>`;
    return;
  }

  els.list.innerHTML = state.videos
    .map(
      (v, i) => `
      <div class="rounded-2xl bg-white ring-1 ring-black/10 overflow-hidden flex flex-col">
        <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" class="w-full aspect-video object-cover bg-black/5">
        <div class="p-4 flex-1 flex flex-col gap-2">
          <p class="font-medium text-sm leading-snug line-clamp-2">${escapeHtml(v.title || "(untitled)")}</p>
          <p class="text-xs text-ink/40">${v.id}</p>
          <button data-remove="${i}" class="mt-auto inline-flex items-center justify-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium rounded-lg px-3 py-2 hover:bg-red-50 transition-colors">
            Remove
          </button>
        </div>
      </div>`
    )
    .join("");

  els.list.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.remove);
      state.videos.splice(idx, 1);
      render();
      setStatus("Removed — click Save to make it permanent.");
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function openFile() {
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "videos.json", accept: { "application/json": [".json"] } }],
      });
      const file = await handle.getFile();
      const text = await file.text();
      state.videos = JSON.parse(text || "[]");
      state.fileHandle = handle;
      state.mode = "fsa";
      setStatus(`Loaded ${file.name}. Changes save directly back to this file.`, "success");
      render();
    } catch (err) {
      if (err.name !== "AbortError") setStatus("Couldn't open that file: " + err.message, "error");
    }
    return;
  }
  els.classicInput.click();
}

function wireClassicInput() {
  els.classicInput.addEventListener("change", async () => {
    const file = els.classicInput.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      state.videos = JSON.parse(text || "[]");
    } catch {
      state.videos = [];
    }
    state.mode = "fallback";
    setStatus(
      "Loaded. Your browser can't save directly to the file, so Save will download an updated videos.json — replace the old one in your project folder with it.",
      "success"
    );
    render();
  });
}

async function saveFile() {
  const json = JSON.stringify(state.videos, null, 2) + "\n";
  if (state.mode === "fsa" && state.fileHandle) {
    try {
      const writable = await state.fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      setStatus("Saved! Now use GitHub Desktop (or your usual method) to commit and push so it goes live.", "success");
    } catch (err) {
      setStatus("Couldn't save: " + err.message, "error");
    }
    return;
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "videos.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus(
    "Downloaded videos.json — move it into the data/ folder of your project (replacing the old one), then commit and push.",
    "success"
  );
}

async function addVideo() {
  const url = els.urlInput.value.trim();
  if (!url) return;
  const id = extractYouTubeId(url);
  if (!id) {
    setStatus("That doesn't look like a YouTube link. Paste the full video URL.", "error");
    return;
  }
  if (state.videos.some((v) => v.id === id)) {
    setStatus("That video is already in the list.", "error");
    return;
  }

  els.addBtn.disabled = true;
  els.addBtn.textContent = "Adding…";

  let title = els.titleInput.value.trim();
  if (!title) title = await fetchYouTubeTitle(id);

  state.videos.unshift({ id, title, addedAt: new Date().toISOString().slice(0, 10) });
  els.urlInput.value = "";
  els.titleInput.value = "";
  els.addBtn.disabled = false;
  els.addBtn.textContent = "Add Video";
  render();
  setStatus("Added — click Save to make it permanent.");
}

document.addEventListener("DOMContentLoaded", () => {
  els.list = qs("video-list");
  els.count = qs("video-count");
  els.status = qs("status");
  els.openBtn = qs("open-btn");
  els.saveBtn = qs("save-btn");
  els.addBtn = qs("add-btn");
  els.urlInput = qs("url-input");
  els.titleInput = qs("title-input");
  els.classicInput = qs("classic-input");

  els.openBtn.addEventListener("click", openFile);
  els.saveBtn.addEventListener("click", saveFile);
  els.addBtn.addEventListener("click", addVideo);
  els.urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addVideo();
    }
  });
  wireClassicInput();
  setStatus("Click “Open videos.json” to begin.");
  render();
});
