# Trailer and screenshots

Captured on 26 September 2026, after the jam closed, from the game folder of the entered release `13a7767`: `git diff 13a7767 -- game` is empty and the live site serves the same files. The game did not change.

```bash
npm start                                                  # the game on http://localhost:3002
for s in court checkpoint isles frost; do node scripts/record-trailer.mjs $s; done
for s in court checkpoint isles frost; do node scripts/trailer-soundtrack.mjs $s; done
node scripts/trailer-soundtrack.mjs --cues=court,court-open,world2,fight,isles,frost,finale,sea
node scripts/edit-trailer.mjs                              # outputs/trailer/
```

- **Footage:** `record-trailer.mjs` plays the play-through's route with real keys and a real mouse, in virtual time: the page's clock, timers, animation frames and CSS animations advance only when a frame is taken, so every frame of 1920x1080 at 60 a second is kept. Camera turns are eased drags, each level opens with a slow orbit, and control cards and markers are off, as Settings allow. The stills are 3840x2160 renders with the HUD hidden, taken between two frames.
- **Sound:** every call to the game's `Sound` class is logged against the same clock and played back offline through that class (`trailer-soundtrack.mjs`), so effects, wind and footfalls fall on their frames. Under each part, the music is that place's own tune from its first bar.
- **Edit:** `edit-trailer.mjs` holds the cut list and the captions, set in the game's typefaces. `edit.json` is its record.

## Results

| Session    | Game seconds | Frames | Capture | Stills | Errors |
| ---------- | ------------ | ------ | ------- | ------ | ------ |
| court      | 92.9         | 5574   | 333 s   | 18     | none   |
| checkpoint | 82.7         | 4964   | 251 s   | 10     | none   |
| isles      | 96.7         | 5803   | 302 s   | 19     | none   |
| frost      | 159.0        | 9541   | 505 s   | 55     | none   |

- **Trailer:** 95.0 s, H.264 High 1920x1080 at 60 fps with AAC 48 kHz stereo, 97.7 MB; a 1280x720 copy at 30 fps, 25.2 MB. Integrated loudness -16.0 LUFS, peak -1.4 dBFS.
- **Sync:** the first door's ignition, logged at 77.30 s in the court session, falls at 16.983 s in the trailer, the frame where the picture's brightness jumps.
- **Published:** both files are on the release [`jam-entry`](https://github.com/Rapiiidooo/farseek/releases/tag/jam-entry), a tag on `13a7767`, and download without an account, identical to the local exports (`publication.json`).
- **README media:** `media/farseek-loop.webp` (the first door opening, 5.4 s at 15 fps, 800 px, 2.4 MB) and eight 1920x1080 screenshots in `media/screenshots/`, reduced from the 4K stills.
