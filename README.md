# Parsons — moving wall

A static lecture website with Are.na-managed images. No build tools or API keys required. Serve/upload the contents of `dist` with a static web host. Are.na content and microphone transcription require network access.

## Edit the work in Are.na

The source is https://www.are.na/betty-wang/cd-lecture-images. Keep the channel Closed or Public. The site reads all pages of the v3 API in ascending channel position when it loads; refresh to see edits. It does not rearrange content during a talk.

Title each image `A — Caption`, `B — Caption`, or `C — Caption`. The prefix determines size and is removed from the displayed caption. A images are full width. Each B pairs with the next available C (or a C with the next available B), so either order is accepted. Put intended partners next to each other to control pairing. Non-image blocks and images without a valid prefix are omitted.

`dist/content.js` contains the channel slug, speed, and composition patterns. For this initial sample, `repeatMediumImages: true` reuses B images in order when there are extra C graphics. Set it to false when the channel has enough B images; unmatched B/C images are then omitted. Original C image URLs preserve transparent PNGs. Image captions use the block title; descriptions are not displayed.

Pair layouts alternate top/base alignment, left/right placement, and generous spacing. Base-aligned image bottoms and caption starting lines share grid tracks. Repeated rows use the same composition throughout a talk.

If the API is unavailable, `dist/arena-snapshot.json` supplies the channel metadata saved at setup. It still references Are.na-hosted images and requires network access for those images; this is not an offline image archive. A live empty channel does not silently restore old images.

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

Before the lecture, test actual speech on the presentation computer, microphone, browser, and internet connection. The style preview and simulated recognition tests do not establish live recognition accuracy or 45-minute reliability. Content is managed in the linked Are.na channel.

Caption implementation: `caption-layout.js` contains the pure reconciliation and two-line presentation engine. `captions.js` owns browser recognition, settings, rendering, and the shared live/preview timer. Final results are consumed once; interim hypotheses are reconciled against the boundary of already accepted words. Service callbacks are guarded by an instance epoch. Automated simulations cover corrections, word-count changes, pauses, late final results, reconnection, stop cleanup, and 5,400 words. These do not establish live microphone reliability.
