# Small UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the expanded sidebar logo with a PNG, and add two performance toggles (reduce animations, reduce visual effects) with user-facing settings, DevPanel overrides, and full i18n.

**Architecture:** New boolean fields on `VoxConfig` persisted to `config.json`. CSS data-attributes on `<html>` drive global style overrides via `globals.css`. A new `usePerformance` hook syncs config to DOM attributes. Settings live in the existing GeneralPanel; DevPanel gets a new "Performance" card.

**Tech Stack:** React, Zustand, TypeScript, SCSS modules, Vitest

**Closes:** https://github.com/app-vox/vox/issues/205

---

## Task 1: Copy logo asset into resources

**Files:**
- Create: `resources/vox-logo-full.png`

**Step 1: Copy the file**

```bash
cp ~/downloads/vox-logo-full.png ~/.config/superpowers/worktrees/vox/feature-small-ux-improvements/resources/vox-logo-full.png
```

**Step 2: Verify the file exists**

```bash
ls -la ~/.config/superpowers/worktrees/vox/feature-small-ux-improvements/resources/vox-logo-full.png
```
Expected: file present with non-zero size.

**Step 3: Commit**

```bash
git add resources/vox-logo-full.png
git commit -m "chore: add full logo PNG asset"
```

---

## Task 2: Swap expanded sidebar logo from SVG to PNG

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx:174`

**Step 1: Update the logo resource name**

In `Sidebar.tsx`, in the `useEffect` at line 174, change:

```typescript
// Before
window.voxApi.resources.dataUrl("vox-logo.svg").then(setLogoSrc);
```

```typescript
// After
window.voxApi.resources.dataUrl("vox-logo-full.png").then(setLogoSrc);
```

That's it — the `dataUrl` IPC handler already handles PNG files via `nativeImage.createFromPath(filePath).toDataURL()`.

**Step 2: Visually verify**

```bash
cd ~/.config/superpowers/worktrees/vox/feature-small-ux-improvements && npm run dev
```

Open the app, expand the sidebar — confirm the PNG logo shows at correct size (height: 20px, width auto).

**Step 3: Run tests**

```bash
npx vitest run
```

Expected: all 235 tests pass (no behavioral change).

**Step 4: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): use full PNG logo in expanded state"
```

---

## Task 3: Add config fields for performance flags

**Files:**
- Modify: `src/shared/config.ts:107-108` (VoxConfig interface)
- Modify: `src/shared/config.ts:143-144` (createDefaultConfig)

**Step 1: Add fields to VoxConfig interface**

In `src/shared/config.ts`, add two fields before the closing `}` of `VoxConfig` (after `targetDisplayId`):

```typescript
  targetDisplayId: number | null;
  reduceAnimations: boolean;
  reduceVisualEffects: boolean;
}
```

**Step 2: Add defaults in createDefaultConfig**

In `createDefaultConfig()`, add before the closing `};` (after `targetDisplayId: null`):

```typescript
    targetDisplayId: null,
    reduceAnimations: false,
    reduceVisualEffects: false,
  };
```

**Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass (TypeScript compilation succeeds, no runtime changes).

**Step 4: Commit**

```bash
git add src/shared/config.ts
git commit -m "feat(config): add reduceAnimations and reduceVisualEffects flags"
```

---

## Task 4: Add i18n keys to all locale files

**Files:**
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/pt-BR.json`
- Modify: `src/shared/i18n/locales/pt-PT.json`
- Modify: `src/shared/i18n/locales/es.json`
- Modify: `src/shared/i18n/locales/fr.json`
- Modify: `src/shared/i18n/locales/de.json`
- Modify: `src/shared/i18n/locales/it.json`
- Modify: `src/shared/i18n/locales/pl.json`
- Modify: `src/shared/i18n/locales/ru.json`
- Modify: `src/shared/i18n/locales/tr.json`
- Test: `tests/shared/i18n.test.ts` (existing — validates key parity and no empty values)

**Step 1: Add keys to en.json**

Add these 6 keys at the end of the JSON object (before the closing `}`):

```json
  "general.performance.title": "Performance",
  "general.performance.description": "Reduce visual complexity for a lighter experience.",
  "general.performance.reduceAnimations": "Reduce animations",
  "general.performance.reduceAnimationsHint": "Disable all CSS transitions and animations throughout the app.",
  "general.performance.reduceVisualEffects": "Reduce visual effects",
  "general.performance.reduceVisualEffectsHint": "Remove shadows, blur, backdrop effects, and gradients for lighter rendering."
```

**Step 2: Add keys to pt-BR.json**

```json
  "general.performance.title": "Desempenho",
  "general.performance.description": "Reduza a complexidade visual para uma experiencia mais leve.",
  "general.performance.reduceAnimations": "Reduzir animacoes",
  "general.performance.reduceAnimationsHint": "Desativa todas as transicoes e animacoes CSS no app.",
  "general.performance.reduceVisualEffects": "Reduzir efeitos visuais",
  "general.performance.reduceVisualEffectsHint": "Remove sombras, desfoque, efeitos de backdrop e gradientes para renderizacao mais leve."
```

**Step 3: Add keys to pt-PT.json**

```json
  "general.performance.title": "Desempenho",
  "general.performance.description": "Reduza a complexidade visual para uma experiencia mais leve.",
  "general.performance.reduceAnimations": "Reduzir animacoes",
  "general.performance.reduceAnimationsHint": "Desativa todas as transicoes e animacoes CSS na aplicacao.",
  "general.performance.reduceVisualEffects": "Reduzir efeitos visuais",
  "general.performance.reduceVisualEffectsHint": "Remove sombras, desfoque, efeitos de backdrop e gradientes para renderizacao mais leve."
```

**Step 4: Add keys to es.json**

```json
  "general.performance.title": "Rendimiento",
  "general.performance.description": "Reduce la complejidad visual para una experiencia mas ligera.",
  "general.performance.reduceAnimations": "Reducir animaciones",
  "general.performance.reduceAnimationsHint": "Desactiva todas las transiciones y animaciones CSS en la aplicacion.",
  "general.performance.reduceVisualEffects": "Reducir efectos visuales",
  "general.performance.reduceVisualEffectsHint": "Elimina sombras, desenfoque, efectos de backdrop y gradientes para una renderizacion mas ligera."
```

**Step 5: Add keys to fr.json**

```json
  "general.performance.title": "Performance",
  "general.performance.description": "Reduisez la complexite visuelle pour une experience plus legere.",
  "general.performance.reduceAnimations": "Reduire les animations",
  "general.performance.reduceAnimationsHint": "Desactive toutes les transitions et animations CSS dans l'application.",
  "general.performance.reduceVisualEffects": "Reduire les effets visuels",
  "general.performance.reduceVisualEffectsHint": "Supprime les ombres, le flou, les effets de backdrop et les degradeés pour un rendu plus leger."
```

**Step 6: Add keys to de.json**

```json
  "general.performance.title": "Leistung",
  "general.performance.description": "Reduzieren Sie die visuelle Komplexitaet fuer ein leichteres Erlebnis.",
  "general.performance.reduceAnimations": "Animationen reduzieren",
  "general.performance.reduceAnimationsHint": "Deaktiviert alle CSS-Uebergaenge und Animationen in der App.",
  "general.performance.reduceVisualEffects": "Visuelle Effekte reduzieren",
  "general.performance.reduceVisualEffectsHint": "Entfernt Schatten, Unschaerfe, Backdrop-Effekte und Verlauefe fuer leichteres Rendering."
```

**Step 7: Add keys to it.json**

```json
  "general.performance.title": "Prestazioni",
  "general.performance.description": "Riduci la complessita visiva per un'esperienza piu leggera.",
  "general.performance.reduceAnimations": "Riduci animazioni",
  "general.performance.reduceAnimationsHint": "Disattiva tutte le transizioni e animazioni CSS nell'app.",
  "general.performance.reduceVisualEffects": "Riduci effetti visivi",
  "general.performance.reduceVisualEffectsHint": "Rimuove ombre, sfocatura, effetti backdrop e gradienti per un rendering piu leggero."
```

**Step 8: Add keys to pl.json**

```json
  "general.performance.title": "Wydajnosc",
  "general.performance.description": "Zmniejsz zlozonosc wizualna dla lzejszego doswiadczenia.",
  "general.performance.reduceAnimations": "Ogranicz animacje",
  "general.performance.reduceAnimationsHint": "Wylacza wszystkie przejscia i animacje CSS w aplikacji.",
  "general.performance.reduceVisualEffects": "Ogranicz efekty wizualne",
  "general.performance.reduceVisualEffectsHint": "Usuwa cienie, rozmycie, efekty backdrop i gradienty dla lzejszego renderowania."
```

**Step 9: Add keys to ru.json**

```json
  "general.performance.title": "Производительность",
  "general.performance.description": "Уменьшите визуальную сложность для более легкого интерфейса.",
  "general.performance.reduceAnimations": "Уменьшить анимации",
  "general.performance.reduceAnimationsHint": "Отключает все CSS-переходы и анимации в приложении.",
  "general.performance.reduceVisualEffects": "Уменьшить визуальные эффекты",
  "general.performance.reduceVisualEffectsHint": "Удаляет тени, размытие, эффекты backdrop и градиенты для более легкой отрисовки."
```

**Step 10: Add keys to tr.json**

```json
  "general.performance.title": "Performans",
  "general.performance.description": "Daha hafif bir deneyim icin goersel karmasikligi azaltin.",
  "general.performance.reduceAnimations": "Animasyonlari azalt",
  "general.performance.reduceAnimationsHint": "Uygulamadaki tum CSS gecislerini ve animasyonlarini devre disi birakir.",
  "general.performance.reduceVisualEffects": "Goersel efektleri azalt",
  "general.performance.reduceVisualEffectsHint": "Daha hafif islem icin goelgeleri, bulaniikligi, arka plan efektlerini ve degradeleri kaldirir."
```

**Step 11: Run the i18n test**

```bash
npx vitest run tests/shared/i18n.test.ts
```

Expected: all tests pass — especially "should have the same keys across all translations" and "should have no empty values in any translation".

**Step 12: Commit**

```bash
git add src/shared/i18n/locales/
git commit -m "feat(i18n): add performance section translations for all locales"
```

---

## Task 5: Create usePerformance hook to sync config to DOM

**Files:**
- Create: `src/renderer/hooks/use-performance.ts`

**Step 1: Write the failing test**

Create `tests/renderer/hooks/use-performance.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("usePerformance DOM attributes", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-reduce-animations");
    document.documentElement.removeAttribute("data-reduce-effects");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-reduce-animations");
    document.documentElement.removeAttribute("data-reduce-effects");
  });

  it("should export applyPerformanceFlags function", async () => {
    const { applyPerformanceFlags } = await import(
      "../../../src/renderer/hooks/use-performance"
    );
    expect(typeof applyPerformanceFlags).toBe("function");
  });

  it("should set data-reduce-animations when reduceAnimations is true", async () => {
    const { applyPerformanceFlags } = await import(
      "../../../src/renderer/hooks/use-performance"
    );
    applyPerformanceFlags(true, false);
    expect(document.documentElement.getAttribute("data-reduce-animations")).toBe("true");
    expect(document.documentElement.hasAttribute("data-reduce-effects")).toBe(false);
  });

  it("should set data-reduce-effects when reduceVisualEffects is true", async () => {
    const { applyPerformanceFlags } = await import(
      "../../../src/renderer/hooks/use-performance"
    );
    applyPerformanceFlags(false, true);
    expect(document.documentElement.hasAttribute("data-reduce-animations")).toBe(false);
    expect(document.documentElement.getAttribute("data-reduce-effects")).toBe("true");
  });

  it("should remove attributes when flags are false", async () => {
    const { applyPerformanceFlags } = await import(
      "../../../src/renderer/hooks/use-performance"
    );
    applyPerformanceFlags(true, true);
    expect(document.documentElement.getAttribute("data-reduce-animations")).toBe("true");
    expect(document.documentElement.getAttribute("data-reduce-effects")).toBe("true");
    applyPerformanceFlags(false, false);
    expect(document.documentElement.hasAttribute("data-reduce-animations")).toBe(false);
    expect(document.documentElement.hasAttribute("data-reduce-effects")).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/renderer/hooks/use-performance.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

Create `src/renderer/hooks/use-performance.ts`:

```typescript
import { useEffect } from "react";

export function applyPerformanceFlags(
  reduceAnimations: boolean,
  reduceVisualEffects: boolean,
) {
  const root = document.documentElement;
  if (reduceAnimations) {
    root.setAttribute("data-reduce-animations", "true");
  } else {
    root.removeAttribute("data-reduce-animations");
  }
  if (reduceVisualEffects) {
    root.setAttribute("data-reduce-effects", "true");
  } else {
    root.removeAttribute("data-reduce-effects");
  }
}

export function usePerformance(
  reduceAnimations: boolean | undefined,
  reduceVisualEffects: boolean | undefined,
) {
  useEffect(() => {
    applyPerformanceFlags(
      reduceAnimations ?? false,
      reduceVisualEffects ?? false,
    );
  }, [reduceAnimations, reduceVisualEffects]);
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/renderer/hooks/use-performance.test.ts
```

Expected: 4 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/hooks/use-performance.ts tests/renderer/hooks/use-performance.test.ts
git commit -m "feat(perf): add usePerformance hook to sync config to DOM"
```

---

## Task 6: Add global CSS rules for performance data attributes

**Files:**
- Modify: `src/renderer/globals.css` (after the existing `@keyframes spin` block, around line 323)

**Step 1: Add CSS rules**

Append the following after the `@keyframes spin` block:

```css
/* ── Performance: Reduce Animations ─────────────────────────── */
[data-reduce-animations="true"] *,
[data-reduce-animations="true"] *::before,
[data-reduce-animations="true"] *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}

/* ── Performance: Reduce Visual Effects ─────────────────────── */
[data-reduce-effects="true"] *,
[data-reduce-effects="true"] *::before,
[data-reduce-effects="true"] *::after {
  box-shadow: none !important;
  text-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  filter: none !important;
  background-image: none !important;
}
```

**Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

**Step 3: Commit**

```bash
git add src/renderer/globals.css
git commit -m "feat(perf): add CSS rules for reduce-animations and reduce-effects"
```

---

## Task 7: Wire usePerformance into App.tsx

**Files:**
- Modify: `src/renderer/App.tsx`

**Step 1: Import and call the hook**

Add the import at the top of the file:

```typescript
import { usePerformance } from "./hooks/use-performance";
```

Inside the `App` component, after the existing `useTheme(theme)` call at line 57, add:

```typescript
  const reduceAnimations = useConfigStore((s) => s.config?.reduceAnimations);
  const reduceVisualEffects = useConfigStore((s) => s.config?.reduceVisualEffects);
  usePerformance(reduceAnimations, reduceVisualEffects);
```

**Step 2: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

**Step 3: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat(perf): wire usePerformance hook into App root"
```

---

## Task 8: Add Performance section to GeneralPanel

**Files:**
- Modify: `src/renderer/components/general/GeneralPanel.tsx`

**Step 1: Add the Performance card after Analytics**

In `GeneralPanel.tsx`, after the Analytics card closing `</div>` at line 678, add a new card before the closing `</>`:

```tsx
      <div className={card.card}>
        <div className={card.header}>
          <h2>{t("general.performance.title")}</h2>
          <p className={card.description}>{t("general.performance.description")}</p>
        </div>
        <div className={card.body}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={config.reduceAnimations}
              onChange={async () => {
                updateConfig({ reduceAnimations: !config.reduceAnimations });
                await saveConfig(false);
                triggerToast();
              }}
            />
            <div>
              <div className={styles.checkboxLabel}>{t("general.performance.reduceAnimations")}</div>
              <div className={styles.checkboxDesc}>{t("general.performance.reduceAnimationsHint")}</div>
            </div>
          </label>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={config.reduceVisualEffects}
              onChange={async () => {
                updateConfig({ reduceVisualEffects: !config.reduceVisualEffects });
                await saveConfig(false);
                triggerToast();
              }}
            />
            <div>
              <div className={styles.checkboxLabel}>{t("general.performance.reduceVisualEffects")}</div>
              <div className={styles.checkboxDesc}>{t("general.performance.reduceVisualEffectsHint")}</div>
            </div>
          </label>
        </div>
      </div>
```

**Step 2: Visually verify**

Run the app (`npm run dev`), go to General tab, scroll to bottom — confirm "Performance" section appears below "Analytics" with two unchecked checkboxes.

Toggle each checkbox and verify:
- "Reduce animations" → all transitions/animations stop immediately
- "Reduce visual effects" → shadows, blur, backdrop, gradients disappear

**Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add src/renderer/components/general/GeneralPanel.tsx
git commit -m "feat(settings): add Performance section with animation and effect toggles"
```

---

## Task 9: Add dev override fields for performance flags

**Files:**
- Modify: `src/renderer/stores/dev-overrides-store.ts:3-19`

**Step 1: Add override fields to DevOverrides interface**

Add two new optional fields to the `DevOverrides` interface, after `visitedShortcuts`:

```typescript
  visitedShortcuts?: boolean;
  reduceAnimations?: boolean;
  reduceVisualEffects?: boolean;
}
```

**Step 2: Run the existing dev overrides test**

```bash
npx vitest run tests/renderer/stores/dev-overrides-store.test.ts
```

Expected: all 7 tests pass.

**Step 3: Commit**

```bash
git add src/renderer/stores/dev-overrides-store.ts
git commit -m "feat(dev): add performance flags to dev overrides"
```

---

## Task 10: Add Performance card to DevPanel

**Files:**
- Modify: `src/renderer/components/dev/DevPanel.tsx`

**Step 1: Add the Performance card after Analytics**

In `DevPanel.tsx`, after the Analytics card object (closing `},` around line 561), insert:

```typescript
    {
      title: "Performance",
      overrideFields: ["reduceAnimations", "reduceVisualEffects"],
      rows: [
        {
          label: "Reduce Animations",
          overrideField: "reduceAnimations",
          render: () => (
            <>
              <span className={styles.realValue}>{boolDot(config?.reduceAnimations)}</span>
              {ov && <OverrideBool field="reduceAnimations" {...ovProps} />}
            </>
          ),
        },
        {
          label: "Reduce Effects",
          overrideField: "reduceVisualEffects",
          render: () => (
            <>
              <span className={styles.realValue}>{boolDot(config?.reduceVisualEffects)}</span>
              {ov && <OverrideBool field="reduceVisualEffects" {...ovProps} />}
            </>
          ),
        },
      ],
    },
```

**Step 2: Visually verify**

Run app in dev mode, open DevPanel — confirm "Performance" card appears after "Analytics" with override dropdowns for both flags.

**Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

**Step 4: Commit**

```bash
git add src/renderer/components/dev/DevPanel.tsx
git commit -m "feat(devpanel): add Performance card with animation and effect overrides"
```

---

## Task 11: Final verification

**Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (235 existing + 4 new = 239+).

**Step 2: Run i18n test specifically**

```bash
npx vitest run tests/shared/i18n.test.ts
```

Expected: all 8 tests pass, including key parity across locales.

**Step 3: Visual smoke test**

```bash
npm run dev
```

Verify:
1. Expanded sidebar shows PNG logo (not SVG)
2. Collapsed sidebar still shows tray icon
3. General → Performance section has two toggles
4. Toggling "Reduce animations" kills all transitions
5. Toggling "Reduce visual effects" removes shadows/blur/gradients
6. Settings persist after app restart
7. DevPanel → Performance card shows real values and override dropdowns
8. Dev overrides can force true/false regardless of user setting
