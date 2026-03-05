const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const MODEL_ID = "eleven_multilingual_v2";

interface SynthesizeOptions {
  text: string;
  apiKey: string;
  voiceId: string;
}

export async function synthesize(opts: SynthesizeOptions): Promise<ArrayBuffer> {
  if (!opts.text) {
    throw new Error("Text must not be empty");
  }

  const url = `${ELEVENLABS_API_URL}/${opts.voiceId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": opts.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: opts.text,
      model_id: MODEL_ID,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `ElevenLabs TTS request failed: ${response.status} ${response.statusText} — ${body}`,
    );
  }

  return response.arrayBuffer();
}

export async function testConnection(apiKey: string, voiceId: string): Promise<boolean> {
  try {
    await synthesize({ text: "test", apiKey, voiceId });
    return true;
  } catch {
    return false;
  }
}
