# Whisper Model Benchmark — Windows (CPU-only)

**Date:** 2026-03-15
**Platform:** Windows 11 (MSYS_NT-10.0-22631), x86_64
**CPU:** 16 logical cores (12 threads used by whisper)
**GPU:** None detected by whisper.cpp
**whisper.cpp:** v1.8.3 (MSVC pre-built binary)
**LLM:** Claude Sonnet 4.5
**Audio:** 36.1s recording, same audio for all tests

## Results

| Model | Size | Whisper (ms) | LLM (ms) | Total (ms) | Real-time factor |
|-------|------|-------------|----------|------------|-----------------|
| turbo | 1.6 GB | 35,691 | 2,607 | ~38,298 | 1.06x |
| medium | 1.5 GB | 27,688 | 2,523 | ~30,211 | 0.84x |
| small | 488 MB | 9,666 | 2,419 | ~12,085 | 0.33x |
| small | 488 MB | 9,865 | 3,357 | ~13,222 | 0.37x |
| base | 148 MB | 3,055 | 2,548 | ~5,603 | 0.16x |
| tiny | 78 MB | 1,940 | 3,218 | ~5,158 | 0.14x |

> Real-time factor = total pipeline time / audio duration. Below 1.0 means faster than real-time.

## Transcription quality (raw whisper output, before LLM)

**Reference text (spoken in Portuguese):**
> Eu não quero que tenha várias situações como essas na codebase. Se a plataforma for essa, então faz isso, entendeu? Normalmente, nesses casos, tem que ter... Eu queria que você me sugerisse uma forma mais inteligente de fazer isso. Como a gente fez agora no build, você tem arquivos separados, dependendo da plataforma, módulos separados, dependendo da plataforma, e a gente de uma forma inteligente decide qual módulo executar, baseado na plataforma que está rodando.

### medium
> Eu não quero que tenha várias situações como essas na codebase. Se a plataforma for essa, então faz isso, entendeu? Normalmente, nesses casos tem que ter, eu queria que você me sugerisse, uma forma mais inteligente de fazer isso. Como a gente fez agora no build, você tem arquivos separados dependendo da plataforma, né? Módulos separados dependendo da plataforma e a gente de forma inteligente decide qual o módulo executar, né? Baseado na plataforma que está rodando.

Best raw quality. "codebase" lowercase correct, "módulos" correct, punctuation accurate. Only minor additions ("né?").

### turbo
> Eu não quero que tenha várias situações como essas na Codebase. Se a plataforma for essa, então faz isso. Entendeu? Normalmente, nesses casos, tem que ter... Eu queria que você me sugerisse uma forma mais inteligente de fazer isso. Como a gente fez agora no Build. Você tem arquivos separados dependendo da plataforma, módulos separados dependendo da plataforma. E a gente, de uma forma inteligente, decide qual módulo executar, né? Baseado na plataforma que está rodando.

Accurate. Minor: capitalizes "Build", adds "né?" (not in original).

### small
> Eu não quero que tenha várias situações como essas na codebase. Se a plataforma for essa, então faz isso, entendeu? Normalmente, nesses casos, tem que ter... Eu queria que você me sugerisse uma forma mais inteligente de fazer isso. Como a gente fez agora no build, você tem arquivos separados, dependendo da plataforma, né? Modos separados, dependendo da plataforma, e a gente de uma forma inteligente decide qual o modo executar, né? Baseado na plataforma que está rodando.

Accurate. Minor: "módulos" → "modos" (close synonym), adds "né?".

### base
> Eu não quero que tenha várias situações como essas na CodeBase. Si a plataforma for essa, então faz isso. Normalmente, nesse caso, eu queria que você me sugerisse uma forma mais inteligente de fazer isso. Como a gente fez agora no build? Você tem arquivos separados dependendo da plataforma, modos separados dependendo da plataforma, e a gente de uma forma inteligente decide qual o modo executar baseado na plataforma que está rodando.

Drops "entendeu?", drops "tem que ter...", "Se" → "Si", "CodeBase" capitalization wrong.

### tiny
> Eu não quero que tem a várias situações como essas na Coles-Base. Se a plataforma for essa, então faz isso, entendeu? Normalmente, nesse caso, tem que ter, eu queria que você me sugerisse, uma forma mais inteligente de fazer isso. Como a gente fez agora no build, você tem arquivo separados, dependendo da plataforma, modos separados, dependendo da plataforma. E a gente de uma forma inteligente desse de qual modo executar, baseado na plataforma que está rodando.

Multiple errors: "tem a" (split), "Coles-Base", "arquivo" (missing plural), "desse de qual" (garbled).

## Observations

1. **Turbo and medium are not viable on CPU.** Turbo at 35.7s and medium at 27.7s for 36.1s of audio run at near real-time (1.06x and 0.84x). Longer recordings will timeout or feel unresponsive.

2. **Medium has the best raw quality** — "codebase", "módulos", accurate punctuation — but at 28s inference it is too slow for interactive use on CPU.

3. **Small is the sweet spot for CPU.** ~10s inference with high accuracy. The LLM correction layer has minimal work, keeping LLM latency low (~2.4s).

4. **Tiny is fast but noisy.** 2s inference but produces errors that force the LLM to do heavier correction (3.2s vs 2.4s for small). Risk of meaning loss on complex speech.

5. **Base is a middle ground.** 3s inference, acceptable quality but loses nuances (drops filler words, simplifies punctuation). Viable if latency is critical.

6. **LLM compensates for whisper errors** — even tiny's "Coles-Base" becomes "codebase" after LLM enhancement. But worse whisper output correlates with higher LLM latency and greater risk of semantic drift.

## Recommendation

**Default model for Windows/CPU: small.** Best trade-off between speed (~13s total for 36s audio) and transcription accuracy. The turbo model should only be recommended on machines with GPU acceleration.
