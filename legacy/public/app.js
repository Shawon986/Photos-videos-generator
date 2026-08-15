const qs = (s) => document.querySelector(s);
const spinner = qs('#spinner');
const btnImage = qs('#genImage');
const btnVideo = qs('#genVideo');

async function postJsonRaw(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res;
}

function setLoading(on) {
  if (on) { spinner.classList.remove('hidden'); btnImage.disabled = true; btnVideo.disabled = true; }
  else { spinner.classList.add('hidden'); btnImage.disabled = false; btnVideo.disabled = false; }
}

qs('#preset').addEventListener('change', (e) => {
  if (e.target.value) qs('#prompt').value = e.target.value;
});

btnImage.addEventListener('click', async () => {
  const prompt = qs('#prompt').value.trim();
  const n = Number(qs('#n').value) || 1;
  const size = qs('#size').value || '1024x1024';
  if (!prompt) return alert('Please enter a prompt');
  setLoading(true);
  try {
    const res = await postJsonRaw('/api/generate-image-free', { prompt, n, size });
    const data = await res.json();
    const result = qs('#result');
    result.innerHTML = '';
    if (!res.ok) return result.textContent = data.error || 'Generation failed';
    for (const src of data.images) {
      const wrap = document.createElement('div');
      const img = document.createElement('img');
      img.src = src;
      wrap.appendChild(img);
      const ctrl = document.createElement('div');
      ctrl.className = 'card-ctrl';
      const a = document.createElement('a');
      a.href = src;
      a.download = 'image.png';
      a.className = 'download-link';
      a.textContent = 'Download';
      ctrl.appendChild(a);
      wrap.appendChild(ctrl);
      result.appendChild(wrap);
    }
  } catch (err) {
    qs('#result').textContent = err.message;
  } finally { setLoading(false); }
});

btnVideo.addEventListener('click', async () => {
  const prompt = qs('#prompt').value.trim();
  const frames = 6;
  const fps = 4;
  if (!prompt) return alert('Please enter a prompt');
  setLoading(true);
  qs('#result').textContent = 'Generating video — this can take a minute.';
  try {
    // video generation still uses the server ffmpeg flow; frames are generated via configured provider
    const res = await postJsonRaw('/api/generate-video', { prompt, frames, fps });
    if (!res.ok) {
      const err = await res.json();
      qs('#result').textContent = err.error || 'Video generation failed';
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const result = qs('#result');
    result.innerHTML = '';
    const video = document.createElement('video');
    video.controls = true;
    video.src = url;
    video.style.width = '100%';
    result.appendChild(video);
    const dl = document.createElement('a');
    dl.href = url; dl.download = 'video.mp4'; dl.className = 'download-link'; dl.textContent = 'Download video'; dl.style.display='inline-block'; dl.style.marginTop='8px';
    result.appendChild(dl);
  } catch (err) {
    qs('#result').textContent = err.message;
  } finally { setLoading(false); }
});
