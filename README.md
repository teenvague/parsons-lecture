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

The page starts paused. Space starts scrolling at 50 pixels per second and pauses/resumes thereafter. There are no on-screen controls, header, or navigation. Set a different default with `speed` in `dist/content.js`. Manual wheel, touch, or page navigation pauses the motion; press Space to resume. Holding Space does not repeatedly toggle playback.

The field repeats seamlessly using identical copies; duplicate content is hidden from assistive technology. Images retain their dimensions while loading. Background tabs suspend progress to avoid catch-up jumps. Enabling reduced motion also pauses playback. On phones B/C pairs stay together and become proportionally smaller.

For lecture use, test with the actual projector and real image files. At 50 px/s, a 30,000 px composition lasts about 10 minutes before repeating; duration depends on viewport and image ratios. For a longer lecture, add more rows or reduce the speed in `content.js`.

## Files

- `dist/index.html`: page shell
- `dist/style.css`: spacing, sizes, alignment, responsive layout
- `dist/content.js`: images, captions, row ordering, default speed
- `dist/app.js`: validation, rendering, continuous scrolling, keyboard interaction
- `dist/assets/`: eight original sample typographic images

All supplied placeholder specimens were created for this package and may be replaced or reused. No content from the Loosies reference was copied.

## Live film subtitles

Press **C** to open the hidden subtitle settings, then **Start microphone** and allow browser microphone access. Close settings while presenting. **Escape** stops recognition when settings are closed; Space continues to control only image scrolling. Captions use yellow text with a dark outline, centered near the bottom, in a maximum of two lines. Words wait approximately 600 ms for recognition to settle, then appear in order. Displayed words remain fixed, even if the service later corrects them. This trades a little latency and occasional uncorrected recognition errors for stable subtitles. Lines fill a two-line cue before starting a new cue.

**Preview style** runs a short simulated word-by-word passage without accessing the microphone. This tests appearance and pacing, not microphone recognition. Chrome is the recommended first browser to try; support and the browser's recognition service vary. The browser may send audio to its speech provider. This site stores neither audio nor transcript, and no API key is required. The transcript exists only in memory during the recognition session. A gap of 1.8 seconds between accepted words starts a fresh cue. A completed cue clears after 2.2 seconds without new displayed words. No second microphone stream or audio-level detector is used. Caption changes never stop recognition. A lifecycle health check reconnects after missing service events: 15 seconds without results during signaled speech, 30 seconds otherwise, or two seconds after audio capture ends. Transient connection failures retry with capped backoff; permission and missing-microphone errors still require user action. A reconnect may lose speech during the service gap.

Before the lecture, test actual speech on the presentation computer, microphone, browser, and internet connection. The style preview and simulated recognition tests do not establish live recognition accuracy or 45-minute reliability. Content is still local placeholder data; the Are.na connection is reserved for the final content step.

Caption implementation: `caption-layout.js` contains the pure reconciliation and two-line presentation engine. `captions.js` owns browser recognition, settings, rendering, and the shared live/preview timer. Final results are consumed once; interim hypotheses are reconciled against the boundary of already accepted words. Service callbacks are guarded by an instance epoch. Automated simulations cover corrections, word-count changes, pauses, late final results, reconnection, stop cleanup, and 5,400 words. These do not establish live microphone reliability.
