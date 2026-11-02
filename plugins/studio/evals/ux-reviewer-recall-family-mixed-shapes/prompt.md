---
description: "recall H2 (found by a person): mixed portrait and landscape photos all forced into the first photo's shape"
tags: [ux-reviewer, recall, p0, src-hearth, by-human]
runs: 1
max_turns: 20
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the studio:ux-reviewer agent on the photo slideshow in our family photo app's post view. Relatives (mostly over 65) swipe or tap Next through a post's photos. Review it before they try it.

```html
<style>
  body{margin:0;font:18px/1.5 system-ui;color:#1E1B16;background:#FFFDF8}
  .slides{position:relative;width:100%;background:#9A9A9A;overflow:hidden}
  .slides img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:none}
  .slides img.on{display:block}
  .nav{display:flex;justify-content:space-between;align-items:center;padding:12px 16px}
  .nav button{min-height:56px;min-width:120px;border-radius:12px;font:600 18px system-ui;border:2px solid #1F5C44;background:#fff;color:#1F5C44}
  .count{font-weight:600}
</style>
<div class="slides" id="slides"></div>
<div class="nav"><button id="prev">‹ Back</button><span class="count" id="count" aria-live="polite"></span><button id="next">Next ›</button></div>
<script>
  // Robin's post: 3 photos from the lake (sizes from the phone, in pixels)
  const photos = [
    { src: "lake-1.jpg", w: 3024, h: 4032, alt: "Alex holding a fish" },
    { src: "lake-2.jpg", w: 4032, h: 3024, alt: "The dock at sunset" },
    { src: "lake-3.jpg", w: 4032, h: 3024, alt: "Pat and Alex in the canoe" },
  ];
  const box = document.getElementById("slides");
  box.style.aspectRatio = `${photos[0].w} / ${photos[0].h}`;
  box.innerHTML = photos.map((p) => `<img src="${p.src}" alt="${p.alt}">`).join("");
  let i = 0;
  function show() { [...box.children].forEach((im, k) => im.classList.toggle("on", k === i)); count.textContent = `Photo ${i + 1} of ${photos.length}`; }
  next.onclick = () => { i = Math.min(i + 1, photos.length - 1); show(); };
  prev.onclick = () => { i = Math.max(i - 1, 0); show(); };
  show();
</script>
```
