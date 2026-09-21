# Parsons — moving wall

A self-contained lecture website: no installation, accounts, remote images, fonts, or build tools required. Open `dist/index.html` in a browser, or serve/upload the contents of `dist` with any static web host. The packaged copy works offline.

## Replace the work

Put your image files in `dist/assets/`, then edit `dist/content.js`. Every image has a `type`, `src`, `width`, `height`, `alt`, and `caption`. Dimensions are the file's natural pixel dimensions; they reserve its correct aspect ratio. Images are never cropped. The supplied typographic specimens are placeholders, not claims about your work.

An A row contains exactly one A image and spans the entire viewport width. A pair contains exactly one B and one C; neither can appear alone. C uses a transparent PNG, WebP, or SVG—transparency must be in the actual file. The supplied C PNGs have alpha transparency.

Pair options:
- `alignment`: `top` or `base` (base aligns the image bottoms and starts both captions on the same line, even when one wraps)
- `side`: `left` or `right` (the position of B)
- `edge`: `left`, `right`, `both`, or `inset` (images can meet the viewport edges; captions retain a small readable inset)
- `size`: `wide` or `narrow`
- `space`: `normal` or `long`

Reorder or duplicate row objects to compose the lecture. Captions always remain visible. Use short captions for projection. The page validates pairing, captions, alternative text, and dimensions and displays a clear message if content is incomplete.

## Present

Scrolling starts automatically at 50 pixels per second. Space pauses/resumes. There are no on-screen controls, header, or navigation. Set a different default with `speed` in `dist/content.js`. Manual wheel, touch, or page navigation pauses the motion; press Space to resume. Holding Space does not repeatedly toggle playback.

The field repeats seamlessly using identical copies; duplicate content is hidden from assistive technology. Images retain their dimensions while loading. Background tabs suspend progress to avoid catch-up jumps. Visitors who prefer reduced motion start paused and can explicitly choose Play. On phones B/C pairs stay together and become proportionally smaller.

For lecture use, test with the actual projector and real image files. At 50 px/s, a 30,000 px composition lasts about 10 minutes before repeating; duration depends on viewport and image ratios. For a longer lecture, add more rows or reduce the speed in `content.js`.

## Files

- `dist/index.html`: page shell
- `dist/style.css`: spacing, sizes, alignment, responsive layout
- `dist/content.js`: images, captions, row ordering, default speed
- `dist/app.js`: validation, rendering, continuous scrolling, keyboard interaction
- `dist/assets/`: eight original sample typographic images

All supplied placeholder specimens were created for this package and may be replaced or reused. No content from the Loosies reference was copied.

## Live film subtitles

Press **C** to open the hidden subtitle settings, then **Start microphone** and allow browser microphone access. Close settings while presenting. **Escape** stops recognition when settings are closed; Space continues to control only image scrolling. Captions use yellow text with a dark outline, centered near the bottom, in a maximum of two lines. Partial recognition results appear immediately, including the browser's corrections. There is no artificial word animation or guaranteed zero-latency alignment: recognition may deliver several words at once.

**Preview style** runs a short simulated word-by-word passage without accessing the microphone. This tests appearance and pacing, not microphone recognition. Chrome is the recommended first browser to try; support and the browser's recognition service vary. The browser may send audio to its speech provider. This site stores neither audio nor transcript, and no API key is required. The transcript exists only in memory during the recognition session. After about 1.8 seconds without a changed result (or after the browser signals the end of speech), the cue clears and its words are retired. The next speech starts a fresh cue rather than replaying the session transcript. Recognition restarts after a normal service stop, and stops with an actionable message after repeated failures.

Before the lecture, test actual speech on the presentation computer, microphone, browser, and internet connection. The style preview and simulated recognition tests do not establish live recognition accuracy or 45-minute reliability. Content is still local placeholder data; the Are.na connection is reserved for the final content step.

Caption stability: finalized recognition results are consumed once; only the latest 32 finalized words plus current interim speech (64 words maximum) are laid out. Each service instance has an isolated lifetime, late callbacks are ignored, normal silent endings restart quietly, and pauses retire the recognition session as well as the displayed cue. Automated tests include 5,400 words (45 minutes at 120 words/minute), stale callbacks, repeated silence, and restarts; this is a simulation, not a 45-minute live microphone test.
