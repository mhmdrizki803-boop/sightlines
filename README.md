# Sightlines

[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)

Point your camera at something and ask. A Pollinations **vision** model reads the frame and answers,
and the same answer can be read aloud by a Pollinations **audio** model.

Live: **https://sightlines.pollinations.app**

Built for the [#20023 quest](https://github.com/pollinations/pollinations/issues/20023).

## How it works

- `getUserMedia` opens the rear camera; one press of *Look and explain* grabs a single JPEG frame
  (≤1024 px) and sends it as an `image_url` part to `gen.pollinations.ai/v1/chat/completions`
  (default `openai/gpt-5.4-nano`, `paid_only: false`).
- Three preset questions (what is this / why does it matter / what to notice) or a typed one.
- *Read it aloud* calls `gen.pollinations.ai/audio/…` (`openai/tts-1`) with the answer.
- Sign-in is the **Pollinations Connect** widget: the visitor spends from their own pollen balance.
- The frame is kept in the page only, and a session list shows what was asked.

## Files

```
index.html   the page, the camera view, the answers, the Connect widget
app.js       camera, frame capture, the vision and audio calls, history
style.css    layout
screenshot.png  the app explaining what its camera saw
```

## License

MIT.
