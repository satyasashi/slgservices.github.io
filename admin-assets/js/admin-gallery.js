/* Photo gallery manager for admin.html.
   Requires the File System Access API's directory picker (Chrome / Edge) —
   writing new image files to disk isn't possible any other way from a
   static page. Opening the docs/ folder (the published site root, where
   index.html lives) once grants access to both data/gallery.json and
   assets/img/gallery/, so every add/remove saves immediately — there's no
   separate "Save" step to remember. */

const DEFAULT_CATEGORIES = [
  "Farm Lands",
  "Plots & Lands",
  "Houses & Flats",
  "To-Let",
  "Civil & Construction",
  "Purohit & Poojas",
  "Events",
];

const gState = {
  gallery: [],
  rootHandle: null,
  galleryFileHandle: null,
  galleryDirHandle: null,
  mode: "unloaded", // 'unloaded' | 'fsa' | 'unsupported'
};

const gEls = {};

function gQs(id) {
  return document.getElementById(id);
}

function slugify(str) {
  return (
    (str || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "photo"
  );
}

function gEscapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function setGalleryStatus(message, tone = "neutral") {
  gEls.status.textContent = message;
  gEls.status.className =
    "text-sm rounded-xl px-4 py-3 " +
    (tone === "error"
      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
      : tone === "success"
      ? "bg-green-50 text-green-700 ring-1 ring-green-200"
      : "bg-black/5 text-ink/70");
}

function currentCategoryOptions() {
  const used = gState.gallery.map((p) => p.category).filter(Boolean);
  return [...new Set([...DEFAULT_CATEGORIES, ...used])];
}

function renderCategoryOptions() {
  gEls.categoryList.innerHTML = currentCategoryOptions()
    .map((c) => `<option value="${gEscapeHtml(c)}"></option>`)
    .join("");
}

function renderGalleryAdmin() {
  gEls.count.textContent = gState.gallery.length;
  gEls.addBtn.disabled = gState.mode !== "fsa";
  renderCategoryOptions();

  if (!gState.gallery.length) {
    gEls.list.innerHTML = `<div class="col-span-full text-center py-14 text-ink/40 rounded-2xl bg-black/[0.03]">
      ${gState.mode === "unloaded" ? "Open your website folder to get started." : "No photos yet — add some below."}
    </div>`;
    return;
  }

  gEls.list.innerHTML = gState.gallery
    .map(
      (p, i) => `
      <div class="rounded-2xl bg-white ring-1 ring-black/10 overflow-hidden flex flex-col">
        <img src="${p.image}" alt="" class="w-full aspect-square object-cover bg-black/5">
        <div class="p-4 flex-1 flex flex-col gap-1.5">
          <p class="text-xs font-semibold uppercase tracking-wide text-brand">${gEscapeHtml(p.category)}</p>
          <p class="text-sm text-ink/70 leading-snug line-clamp-2">${gEscapeHtml(p.caption || "")}</p>
          <button data-remove="${i}" class="mt-auto inline-flex items-center justify-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium rounded-lg px-3 py-2 hover:bg-red-50 transition-colors">
            Remove
          </button>
        </div>
      </div>`
    )
    .join("");

  gEls.list.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.remove);
      gState.gallery.splice(idx, 1);
      await persistGallery();
      renderGalleryAdmin();
      setGalleryStatus("Removed and saved. (The photo file itself stays on disk, just unused.)", "success");
    });
  });
}

async function getOrCreateDir(parent, name) {
  return parent.getDirectoryHandle(name, { create: true });
}

async function persistGallery() {
  const json = JSON.stringify(gState.gallery, null, 2) + "\n";
  const writable = await gState.galleryFileHandle.createWritable();
  await writable.write(json);
  await writable.close();
}

async function openGalleryFolder() {
  if (!("showDirectoryPicker" in window)) {
    gState.mode = "unsupported";
    setGalleryStatus(
      "Your browser can't save photo files directly. Please open this page in Chrome or Edge to manage the gallery.",
      "error"
    );
    return;
  }

  try {
    const root = await window.showDirectoryPicker();
    const dataDir = await getOrCreateDir(root, "data");
    const galleryFileHandle = await dataDir.getFileHandle("gallery.json", { create: true });
    const assetsDir = await getOrCreateDir(root, "assets");
    const imgDir = await getOrCreateDir(assetsDir, "img");
    const galleryDir = await getOrCreateDir(imgDir, "gallery");

    const file = await galleryFileHandle.getFile();
    const text = await file.text();
    gState.gallery = text.trim() ? JSON.parse(text) : [];
    gState.rootHandle = root;
    gState.galleryFileHandle = galleryFileHandle;
    gState.galleryDirHandle = galleryDir;
    gState.mode = "fsa";

    let hint = "";
    try {
      await root.getFileHandle("index.html");
    } catch {
      hint = " (This doesn't look like the website's main folder — make sure you picked the folder that contains index.html.)";
    }

    setGalleryStatus(`Loaded ${gState.gallery.length} photo(s).${hint}`, hint ? "error" : "success");
    renderGalleryAdmin();
  } catch (err) {
    if (err.name !== "AbortError") setGalleryStatus("Couldn't open that folder: " + err.message, "error");
  }
}

async function addPhotos() {
  const category = gEls.categoryInput.value.trim();
  const caption = gEls.captionInput.value.trim();
  const files = [...gEls.fileInput.files];

  if (!category) {
    setGalleryStatus("Pick or type a category first.", "error");
    return;
  }
  if (!files.length) {
    setGalleryStatus("Choose at least one photo to add.", "error");
    return;
  }

  gEls.addBtn.disabled = true;
  gEls.addBtn.textContent = "Adding…";

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const filename = `${slugify(category)}-${Date.now()}-${i}.${ext}`;
      const fileHandle = await gState.galleryDirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();

      gState.gallery.unshift({
        id: filename,
        category,
        caption,
        image: `assets/img/gallery/${filename}`,
        addedAt: new Date().toISOString().slice(0, 10),
      });
    }

    await persistGallery();
    gEls.captionInput.value = "";
    gEls.fileInput.value = "";
    renderGalleryAdmin();
    setGalleryStatus(`Added ${files.length} photo(s) and saved.`, "success");
  } catch (err) {
    setGalleryStatus("Couldn't add those photos: " + err.message, "error");
  } finally {
    gEls.addBtn.disabled = false;
    gEls.addBtn.textContent = "Add Photos";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  gEls.list = gQs("gallery-list");
  gEls.count = gQs("gallery-count");
  gEls.status = gQs("gallery-status");
  gEls.openBtn = gQs("gallery-open-btn");
  gEls.addBtn = gQs("gallery-add-btn");
  gEls.categoryInput = gQs("gallery-category-input");
  gEls.categoryList = gQs("gallery-category-list");
  gEls.captionInput = gQs("gallery-caption-input");
  gEls.fileInput = gQs("gallery-file-input");

  gEls.openBtn.addEventListener("click", openGalleryFolder);
  gEls.addBtn.addEventListener("click", addPhotos);

  setGalleryStatus("Click “Open Website Folder” to begin.");
  renderGalleryAdmin();
});
