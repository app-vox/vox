const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const MODEL_ID = "eleven_multilingual_v2";

interface SynthesizeOptions {
  text: string;
  apiKey: string;
  voiceId: string;
  signal?: AbortSignal;
}

export async function synthesize(opts: SynthesizeOptions): Promise<ArrayBuffer> {
  if (!opts.text) {
    throw new Error("Text must not be empty");
  }

  const MAX_TEXT_LENGTH = 5000;
  if (opts.text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
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
    signal: opts.signal,
  });

  if (!response.ok) {
    const body = await response.text();

    // Parse error details if JSON
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const errorData = JSON.parse(body);
      if (errorData.detail?.message) {
        errorMessage = errorData.detail.message;
      } else if (errorData.detail?.type === "payment_required") {
        errorMessage = "Free accounts cannot use library voices via API. Upgrade your ElevenLabs subscription or create a custom voice.";
      }
    } catch {
      // Not JSON, use raw body
      if (body) errorMessage += ` — ${body}`;
    }

    throw new Error(`ElevenLabs: ${errorMessage}`);
  }

  return response.arrayBuffer();
}

export async function testConnection(apiKey: string, voiceId: string): Promise<{ success: boolean; audio?: ArrayBuffer; error?: string }> {
  try {
    const audio = await synthesize({ text: "Hello! Text to speech is working.", apiKey, voiceId });
    return { success: true, audio };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
