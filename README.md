# SLG Services website

A static site (no build step) hosted on GitHub Pages, publishing from the
`docs/` folder on the `main` branch. **This requires a one-time GitHub Pages
setting change — see "First-time setup" below — the site will 404 until
that's done.**

## Structure

```
docs/                                                               Published — this is the live website
  index.html, about.html, services.html, gallery.html,                Pages — each has the header/footer HTML directly in it
    videos.html, contact.html
  data/videos.json                                                    The YouTube video list shown on the site
  data/gallery.json                                                   The photo list shown on the Gallery page (category + image path + caption)
  assets/img/gallery/                                                 Uploaded gallery photos live here
  assets/css/style.css                                                Custom styles (fonts, motifs, animation)
  assets/js/main.js                                                   Mobile nav, active-link highlight, scroll reveal, footer year
  assets/js/videos.js                                                 Reads data/videos.json and renders video cards
  assets/js/gallery.js                                                Reads data/gallery.json and renders the category albums, per-category grid + lightbox
  assets/img/                                                         Logo + favicons (generated from the logo)

admin.html                                                          Private content manager — NOT inside docs/, so it's
admin-assets/js/admin.js                                            never published or reachable from the live site at all
admin-assets/js/admin-gallery.js                                    (see "Admin access" below)
```

Styling uses Tailwind CSS via CDN (`cdn.tailwindcss.com`) plus the small custom
stylesheet — no npm install, no build step. Just edit HTML and refresh.

## First-time setup: point GitHub Pages at docs/

GitHub Pages needs to be told to publish from `docs/` instead of the repo
root (this is what keeps `admin.html` off the live site — see below). On
GitHub.com:

1. Push this repo to `main` (`admin.html` and `admin-assets/` can be pushed
   too — being *in the repo* is fine, what matters is they're outside `docs/`).
2. Go to the repo → **Settings → Pages**.
3. Under "Build and deployment" → "Source", choose **Deploy from a branch**.
4. Branch: `main`, folder: **`/docs`** (not `/ (root)`). Save.

GitHub Pages will redeploy within a minute or two. After that, the site is
live at the usual URL, and there is no public URL for `admin.html` at all —
visiting `.../admin.html` on the live domain 404s, because that file was
never published.

## Admin access — how "only Dad can upload content" actually works

`admin.html` can't push changes to the live site by itself — it only writes
to files on whoever's local computer opens it (via the browser's file/folder
picker), and someone still has to `git commit` + `git push` for anything to
go live. So the real access boundary is **who has push access to this GitHub
repo** (repo → Settings → Collaborators) — that's enforced by GitHub itself,
independent of `admin.html`.

On top of that, moving `admin.html` outside `docs/` means it isn't served on
the live site at all — not hidden, not password-protected, genuinely not
there. To use it, open the file locally from the project folder (double-click
it, or open it from a code editor's file browser). There's nothing to type
in, no login — it's a local tool.

## Editing content

Every page has HTML comments marking placeholder copy, e.g.:

```html
<!-- EDIT: replace with the real address, phone and email -->
```

Search for `EDIT:` across the project to find everything that still needs real
business details (phone, email, address, hours, service descriptions, about text).

### Editing the header or footer (nav links, phone number, social links, etc.)

The header and footer are duplicated directly into all 6 pages in `docs/`
rather than loaded from a shared file — this is deliberate, so the site still
works correctly when a page is opened straight from disk (see "Local preview"
below) instead of through a server. It means a change like a new phone number
has to be made in all 6 files. The simplest way is a find-and-replace across
the project for the old value (e.g. your editor's "Replace in Files"), since
the header/footer markup is identical, word-for-word, in every page.

## Adding YouTube videos (no code required)

Open **`admin.html`** directly in a browser (double-click the file at the top
of the project folder — not inside `docs/`). It has three steps:

1. Click **Open videos.json** and select `docs/data/videos.json` from this project.
2. Paste a YouTube link, click **Add Video** — the title fills in automatically.
3. Click **Save**, then publish the change the usual way (e.g. GitHub Desktop →
   Commit → Push). The video shows up on the live site a minute or two later.

In Chrome or Edge, Save writes directly back to `videos.json` on disk. In
Safari or Firefox (which don't support that), Save instead downloads an
updated `videos.json` — drag it into `docs/data/`, overwriting the old one,
then publish as usual.

## Adding gallery photos (no code required)

Also in **`admin.html`**, under "Photo Gallery":

1. Click **Open Website Folder** and select the **`docs`** folder inside this
   project (the one with `index.html` directly inside it — not the top-level
   project folder, and not the `data` folder).
2. Type or pick a category (e.g. "Farm Lands", "Plots & Lands", "Houses & Flats"
   — or type a brand new category name), choose one or more photos, click
   **Add Photos**. This saves immediately — no separate Save step.
3. Publish the change the usual way (e.g. GitHub Desktop → Commit → Push).

The Gallery page automatically shows one "album" cover per category that's in
use (the most recent photo, with a stacked-photo effect if there's more than
one) — visitors click an album to see every photo in that category. A new
category typed here just appears as a new album automatically — nothing else
to configure. This section requires Chrome or Edge, since writing image files
to disk isn't possible from Safari or Firefox.

Removing a photo (via the Remove button under it) only removes its entry from
`gallery.json` — the image file itself stays in `docs/assets/img/gallery/`,
unused but harmless.

## Setting up the Contact form (required — do this before launch)

The Contact page's form submits via [Web3Forms](https://web3forms.com/), a free
service that emails you form submissions with no backend of your own to run.
It won't deliver messages until you set it up — about a minute of work:

1. Go to **https://web3forms.com/** and enter the email address that should
   receive enquiries (once `info@slgservices.example` is replaced with a real
   inbox, use that one).
2. Web3Forms instantly emails you an **Access Key** — no account or password
   to create.
3. Open `docs/contact.html`, find the line (search for `WEB3FORMS`):
   ```html
   <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY">
   ```
   and replace `YOUR_WEB3FORMS_ACCESS_KEY` with the key you received.
4. Commit and push. Done — no further code changes needed.

Until that key is set, the form shows a friendly message telling visitors to
call or email directly instead of silently failing. The free tier covers 250
submissions/month, which is far more than a small local business site needs.
A hidden checkbox (`botcheck`) is included as basic spam-bot protection.

## Local preview

Double-clicking any page inside `docs/` (e.g. `docs/index.html`) and opening
it straight from disk works — the header, footer and navigation all render
correctly that way. `admin.html` at the project root also works fine opened
directly.

The Videos and Gallery sections are the one exception: they load
`data/videos.json` and `data/gallery.json` via `fetch()`, which browsers
block for pages opened from disk (`file://`). Opened directly, those sections
will just show their "no videos/photos yet" empty state even if the JSON
files have entries. To see them populated locally, run a tiny local server
instead:

```
cd docs && python3 -m http.server 8000
```

then visit `http://localhost:8000`. On the live GitHub Pages site (served over
`https://`) this isn't an issue either way.

## Publishing

Commit and push to `main`; GitHub Pages redeploys automatically within a
minute or two (once the "First-time setup" step above is done).
