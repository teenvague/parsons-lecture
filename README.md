# Parsons — moving wall

A static lecture website with Are.na-managed images. No build tools or API keys required. Serve/upload the contents of `dist` with a static web host. Are.na content and microphone transcription require network access.

## Edit the work in Are.na

The source is https://www.are.na/betty-wang/cd-lecture-images. Keep the channel Closed or Public. The site reads all pages of the v3 API in ascending channel position when it loads; refresh to see edits. It does not rearrange content during a talk.

Title each image using `A | family | character | tone | Caption`. Any family, character, or tone word is accepted; capitalization and surrounding/repeated spaces are normalized. Only the caption is displayed. Example: `A | sketchbook | drawing | pale | Sketchbook, page 03`.

Portrait A images are centered at a maximum image height of 90vh, with captions aligned to their left edge. Landscape and square A images are full width; B medium images always pair with C graphics. Portrait B images have a 110vh height limit, keeping their natural proportions and the pair’s alignment. The planner balances B reuse, prefers contrasting family/character/tone and aspect ratios in pairs, then distributes B/C rows evenly between A rows before optimizing project separation within that fixed rhythm. When there are at least as many A rows as B/C rows, every B/C row is separated by an A. When pairs outnumber A rows, unavoidable pair runs are spread evenly and kept as short as possible. Consecutive pairs must put B on opposite sides. Alignment, proportions, size, edge placement, and spacing are selected against the preceding pair instead of cycling through a fixed list. Family separation is optimized within the fixed row-type slots; visual contrast breaks ties. This is a bounded heuristic, not a guarantee of the globally optimal arrangement; separation is limited by the content mix. Upload and manual channel order do not determine presentation order.

To choose the landing image, change exactly one A title to `A opening | family | character | tone | Caption` in Are.na, keeping its existing tags and caption. Refresh the lecture page to see it. The shorter title format also supports the marker: `A opening — Caption` (for example, `A opening — Placeholder`). The opening marker is not displayed. This A stays first and appears only once; all remaining rows are optimized with the opener included in the contrast/separation scoring. With no marker, the oldest valid A block opens the page; with multiple markers, the marked A with the lowest block ID wins. Only A images can be marked as opening. If there are no A images, the B/C sequence still works.

`dist/content.js` contains the channel, speed, `seed`, and eight candidate composition patterns. The same blocks, tags, and seed produce the same sequence. Change the seed for a different arrangement. Adding images or changing tags can change the sequence. Pair proportions, alignment, edge placement, and spacing vary while preserving B/C roles.

For the initial sample, `repeatMediumImages: true` reuses B images when there are extra C graphics. Set it to false to omit unmatched images. Original C URLs preserve transparent PNGs. Descriptions are not displayed.

Legacy `A — Caption` titles still work. Their caption, stripped of a trailing number and common image extension, acts as a temporary family: Sketchbook1 and Sketchbook2 group together. Explicit pipe-separated tags override this fallback. Non-image blocks and malformed titles are omitted.

If the API is unavailable, `dist/arena-snapshot.json` supplies the channel metadata saved at setup. It still references Are.na-hosted images and requires network access for those images; this is not an offline image archive. A live empty channel does not silently restore old images.

## Present

The page starts paused. Space starts scrolling at 70 pixels per second and pauses/resumes thereafter. There are no on-screen controls, header, or navigation. Set a different default with `speed` in `dist/content.js`. Manual wheel, touch, or page navigation pauses the motion; press Space to resume. Holding Space does not repeatedly toggle playback.

The field plays once and pauses at the bottom. Space at the end does not restart it; scroll back up and press Space to play from that position. Reloading starts paused at the opening image. Images retain their dimensions while loading. Background tabs suspend progress to avoid catch-up jumps. Enabling reduced motion also pauses playback. On phones B/C pairs stay together and become proportionally smaller.

For lecture use, test with the actual projector and real image files. At 70 px/s, a 30,000 px composition lasts about 7 minutes before reaching the end; duration depends on viewport and image ratios. For a longer lecture, add more rows or reduce the speed in `content.js`.

## Files

- `dist/index.html`: page shell
- `dist/style.css`: spacing, sizes, alignment, responsive layout
- `dist/content.js`: images, captions, row ordering, default speed
- `dist/app.js`: validation, rendering, finite scrolling, keyboard interaction
- `dist/assets/`: eight original sample typographic images

All supplied placeholder specimens were created for this package and may be replaced or reused. No content from the Loosies reference was copied.

## Live film subtitles

Press **C** to open the hidden subtitle settings, then **Start microphone** and allow browser microphone access. Close settings while presenting. **Escape** stops recognition when settings are closed; Space continues to control only image scrolling. Captions use yellow text with a dark outline, centered near the bottom, in a maximum of two lines. Words wait approximately 600 ms for recognition to settle, then appear in order. Displayed words remain fixed, even if the service later corrects them. This trades a little latency and occasional uncorrected recognition errors for stable subtitles. Lines fill a two-line cue before starting a new cue.

**Preview style** runs a short simulated word-by-word passage without accessing the microphone. This tests appearance and pacing, not microphone recognition. Chrome is the recommended first browser to try; support and the browser's recognition service vary. The browser may send audio to its speech provider. This site stores neither audio nor transcript, and no API key is required. The transcript exists only in memory during the recognition session. A gap of 1.8 seconds between accepted words starts a fresh cue. A completed cue clears after 2.2 seconds without new displayed words. No second microphone stream or audio-level detector is used. Caption changes never stop recognition. A lifecycle health check reconnects after missing service events: 15 seconds without results during signaled speech, 30 seconds otherwise, or two seconds after audio capture ends. Transient connection failures retry with capped backoff; permission and missing-microphone errors still require user action. A reconnect may lose speech during the service gap.

Before the lecture, test actual speech on the presentation computer, microphone, browser, and internet connection. The style preview and simulated recognition tests do not establish live recognition accuracy or 45-minute reliability. Content is managed in the linked Are.na channel.

Caption implementation: `caption-layout.js` contains the pure reconciliation and two-line presentation engine. `captions.js` owns browser recognition, settings, rendering, and the shared live/preview timer. Final results are consumed once; interim hypotheses are reconciled against the boundary of already accepted words. Service callbacks are guarded by an instance epoch. Automated simulations cover corrections, word-count changes, pauses, late final results, reconnection, stop cleanup, and 5,400 words. These do not establish live microphone reliability.
