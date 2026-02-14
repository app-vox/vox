/** X icon for error/canceled indicator (14x14 viewBox) */
export function xIndicatorSvg(color: string): string {
  return `<svg class="icon" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/** Cancel button X icon (10x10 viewBox) */
export const cancelXSvg = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 2L2 8M2 2L8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
