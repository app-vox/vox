# Design Tokens

This document provides a reference for all CSS design tokens available in the Vox application. All tokens are defined in `src/renderer/globals.css` and can be used with `var(--token-name)`.

## Quick Reference

For pull requests and future development, reference this document to use existing tokens instead of hard-coded values.

## Color Tokens

### Backgrounds
- `--color-bg-root` - Root/body background
- `--color-bg-card` - Card/panel background
- `--color-bg-input` - Input field background
- `--color-bg-hover` - Hover state background

### Borders
- `--color-border` - Default border color
- `--color-border-hover` - Hover state border
- `--color-border-focus` - Focus state border (accent)

### Text
- `--color-text-primary` - Primary text
- `--color-text-secondary` - Secondary text
- `--color-text-tertiary` - Tertiary/muted text
- `--color-text-muted` - Most muted text

### Semantic Colors
- `--color-accent` - Primary accent (indigo)
- `--color-accent-hover` - Accent hover state
- `--color-btn-primary-text` - Primary button text
- `--color-success` - Success state (green)
- `--color-error` - Error state (red)
- `--color-warning` - Warning state (amber)

### Opacity Variants
- `--color-success-bg-light` - Success background (10% opacity)
- `--color-success-border` - Success border (15% opacity)
- `--color-error-bg-light` - Error background (10% opacity)
- `--color-error-border` - Error border (15% opacity)
- `--color-error-border-hover` - Error border hover (20% opacity)
- `--color-warning-bg-light` - Warning background (10% opacity)
- `--color-warning-border` - Warning border (15% opacity)
- `--color-shadow` - Shadow color (30% black, 15% in light theme)

## Spacing Tokens

Base spacing scale (8px increments):
- `--spacing-0` - 0
- `--spacing-1` - 4px
- `--spacing-2` - 8px
- `--spacing-3` - 12px
- `--spacing-4` - 16px
- `--spacing-5` - 20px
- `--spacing-6` - 24px
- `--spacing-8` - 32px

Micro spacing:
- `--spacing-half` - 2px
- `--spacing-0-75` - 3px
- `--spacing-1-5` - 6px

## Typography Tokens

### Font Sizes
- `--font-size-xs` - 11px
- `--font-size-sm` - 12px
- `--font-size-base` - 13px
- `--font-size-md` - 14px
- `--font-size-lg` - 15px

### Font Weights
- `--font-weight-normal` - 400
- `--font-weight-medium` - 500
- `--font-weight-semibold` - 600

### Line Heights
- `--line-height-none` - 1
- `--line-height-normal` - 1.5
- `--line-height-relaxed` - 1.6

### Letter Spacing
- `--letter-spacing-tight` - -0.01em

## Sizing Tokens

### Border Radius
- `--radius-sm` - 3px
- `--radius-base` - 4px
- `--radius-md` - 6px
- `--radius-lg` - 8px
- `--radius-full` - 100px (pill shape)

### Icon Sizes
- `--size-icon-sm` - 16px
- `--size-icon-base` - 20px
- `--size-icon-md` - 24px
- `--size-icon-lg` - 28px
- `--size-icon-xl` - 32px

### Min Heights
- `--min-h-input` - 38px
- `--min-h-card` - 56px

### Min Widths
- `--min-w-button` - 24px
- `--min-w-select` - 180px

## Shadow Tokens

- `--shadow-toast` - `0 4px 12px rgba(0, 0, 0, 0.3)`

## Animation Tokens

### Durations
- `--duration-fast` - 150ms (quick transitions)
- `--duration-base` - 200ms (default transitions)
- `--duration-slow` - 300ms (slower transitions)
- `--duration-pulse` - 1.5s (pulse animation)
- `--duration-shake` - 0.4s (shake animation)

### Easings
- `--ease-default` - ease

## Usage Examples

### Using color tokens
```scss
.myComponent {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
```

### Using spacing tokens
```scss
.myComponent {
  padding: var(--spacing-3) var(--spacing-4);
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-6);
}
```

### Using typography tokens
```scss
.myComponent {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
}
```

### Using sizing tokens
```scss
.myComponent {
  border-radius: var(--radius-md);
  min-height: var(--min-h-input);
  width: var(--size-icon-base);
}
```

### Using animation tokens
```scss
.myComponent {
  transition: all var(--duration-fast) var(--ease-default);
}
```

### Using semantic color states
```scss
.successBadge {
  background: var(--color-success-bg-light);
  border: 1px solid var(--color-success-border);
  color: var(--color-success);
}

.errorState {
  background: var(--color-error-bg-light);
  border: 1px solid var(--color-error-border);

  &:hover {
    border-color: var(--color-error-border-hover);
  }
}
```

## Theme Support

All color tokens automatically adapt to light/dark themes via the `data-theme` attribute. No manual theme switching required in component styles.

Dark theme is the default. Light theme uses `[data-theme="light"]` or `[data-theme="system"].system-light` selectors.

## Best Practices

1. **Never hard-code values** - Always use design tokens
2. **Prefer semantic tokens** - Use `--color-success` not `--color-green-500`
3. **Use spacing scale** - Stick to the 8px spacing scale when possible
4. **Consistent animations** - Use duration tokens for all transitions
5. **Reference this doc** - Link to this file in PRs for token usage

## Maintenance

When adding new tokens:
1. Add to `@theme` directive in `globals.css`
2. Duplicate in `:root` block (Tailwind v4 workaround)
3. Add theme-specific overrides if needed (light theme selector)
4. Update this documentation
5. Test in both light and dark themes
