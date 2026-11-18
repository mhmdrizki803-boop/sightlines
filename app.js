/**
 * Sightlines — point the camera, ask, learn. The frame goes to a Pollinations vision model; the
 * answer can be read aloud by a Pollinations audio model. Sign-in is Pollinations Connect, so the
 * visitor spends their own pollen.
 */
(function () {
  const el = (id) => document.getElementById(id);
  const widget = document.querySelector('polli-connect');
  const VISION_MODEL = 'openai/gpt-5.4-nano';
  const VOICE_MODEL = 'openai/tts-1';
  const VOICE = 'alloy';

  const key = () => (widget && widget.apiKey ? widget.apiKey : null);
  const state = (t) => { el('state').textContent = t; };

  let stream = null;
  let question = 'What is this? Answer in two short sentences.';
  let lastFrame = null;

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      el('cam').srcObject = stream;
      await el('cam').play();
      el('start').disabled = true;
      el('stop').disabled = false;
      el('look').disabled = false;
      state('camera on');
    } catch (err) {
      state(`no camera: ${err.name || err.message}`);
    }
  }

  function stopCamera() {
    if (stream) for (const track of stream.getTracks()) track.stop();
    stream = null;
    el('start').disabled = false;
    el('stop').disabled = true;
    el('look').disabled = true;
    state('camera off');
  }

  /** The current frame as a JPEG data URL, at most 1024 wide. */
  function grab() {
    const video = el('cam');
    if (!video.videoWidth) return null;
    const scale = Math.min(1, 1024 / video.videoWidth);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = el('still');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  function paragraphs(text) {
    const box = el('text');
    box.textContent = '';
    for (const block of text.split(/\n{2,}/)) {
      const p = document.createElement('p');
      p.textContent = block.trim();
      if (p.textContent) box.appendChild(p);
    }
  }

  async function look() {
    if (!key()) { state('connect first (top right)'); return; }
    const frame = grab();
    if (!frame) { state('the camera has no frame yet'); return; }
    lastFrame = frame;
    el('look').disabled = true;
    state('asking the model…');
    try {
      const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key()}` },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `${question} You are looking at one photograph a person just took. Be concrete, name what you actually see, and keep it under 80 words.` },
              { type: 'image_url', image_url: { url: frame } },
            ],
          }],
          temperature: 0.4,
          max_tokens: 300,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      if (!text.trim()) throw new Error('empty answer');
      paragraphs(text);
      el('answer').hidden = false;
      el('voice').hidden = true;
      el('download').hidden = false;
      el('download').href = frame;
      state('answered');
      addHistory(frame, text.trim());
    } catch (err) {
      state(`failed: ${err.message}`);
    } finally {
      el('look').disabled = false;
    }
  }

  async function speak() {
    const text = el('text').innerText.trim();
    if (!text) return;
    if (!key()) { state('connect first (top right)'); return; }
    state('asking for the voice…');
    try {
      const res = await fetch(`https://gen.pollinations.ai/audio/${encodeURIComponent(text.slice(0, 600))}?model=${VOICE_MODEL}&voice=${VOICE}`, {
        headers: { authorization: `Bearer ${key()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (blob.size < 1024) throw new Error('empty audio');
      const audio = el('voice');
      audio.src = URL.createObjectURL(blob);
      audio.hidden = false;
      await audio.play().catch(() => {});
      state('spoken');
    } catch (err) {
      state(`voice failed: ${err.message}`);
    }
  }

  function addHistory(frame, text) {
    el('history').hidden = false;
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = frame;
    img.alt = 'a frame you looked at';
    const span = document.createElement('span');
    span.textContent = text.replace(/\s+/g, ' ').slice(0, 180);
    li.appendChild(img);
    li.appendChild(span);
    el('list').prepend(li);
  }

  el('start').addEventListener('click', startCamera);
  el('stop').addEventListener('click', stopCamera);
  el('look').addEventListener('click', look);
  el('speak').addEventListener('click', speak);
  for (const chip of document.querySelectorAll('.chip')) {
    chip.addEventListener('click', () => {
      question = chip.getAttribute('data-q');
      for (const other of document.querySelectorAll('.chip')) other.classList.remove('on');
      chip.classList.add('on');
      el('own').value = '';
      state('question picked — look');
    });
  }
  el('own').addEventListener('input', (e) => {
    const v = e.target.value.trim();
    if (v) {
      question = `${v} Answer in two short sentences.`;
      for (const other of document.querySelectorAll('.chip')) other.classList.remove('on');
    }
  });
  document.querySelector('.chip').classList.add('on');
  state('camera off');
})();