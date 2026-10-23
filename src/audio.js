/** Audio recording and speech synthesis utilities */
import { toast } from './utils.js';

let _recorder = null;

export const isRecording = () => _recorder?.state === 'recording';

/** Start microphone recording; calls onStop(blob) when stopped */
export async function startRecording(onStop) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    toast('Gravação não disponível neste dispositivo. Use texto ou ditado.');
    return null;
  }
  try {
    const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks   = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      _recorder = null;
      onStop(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    };
    _recorder = recorder;
    recorder.start();
    return recorder;
  } catch {
    toast('Permissão de microfone não concedida.');
    return null;
  }
}

/** Stop current recording (if active) */
export function stopRecording() {
  if (_recorder?.state === 'recording') _recorder.stop();
}

/** Text-to-speech confirmation */
export function speak(text, lang = 'pt-BR') {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
