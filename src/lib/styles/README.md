# Styling System for JuryApp

This document outlines the standardized styling system implemented for the JuryApp project.

## Overview

The styling system consists of:
- A centralized color system using CSS variables
- Reusable UI components
- Standardized styling patterns

## Color System

All colors are defined as CSS variables in `src/lib/styles/theme.css`. This ensures consistency across the application.

### Primary Colors
- `--primary`: #7f7bff (Main primary color)
- `--primary-focus`: #4df2ff (Primary focus/hover state)
- `--primary-content`: #ffffff (Content on primary background)

### Brand Colors
- `--brand-purple`: #7f7bff (Main brand purple)
- `--brand-blue`: #4df2ff (Main brand blue/cyan)
- `--brand-dark`: #0f1322 (Main brand dark)
- `--brand-light`: #f0f0f0 (Main brand light text)

### Challenge Category Colors
- `--wellness-color`: #36c399 (Wellness category)
- `--commerce-color`: #f7a654 (Commerce category)

### User Role Colors
- `--admin-color`: #ff6b6b (Admin role)
- `--jury-color`: #4df2ff (Jury role)

## UI Components

Reusable UI components are located in `src/lib/components/ui/` and can be imported from `src/lib/index.ts`.

### Button Component
```svelte
<script>
  import { Button } from '$lib';
</script>

<Button variant="primary">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="wellness">Wellness Button</Button>
<Button variant="commerce">Commerce Button</Button>
<Button variant="admin">Admin Button</Button>
<Button variant="jury">Jury Button</Button>
```

Available variants: `primary`, `secondary`, `success`, `warning`, `error`, `wellness`, `commerce`, `admin`, `jury`

### Card Component
```svelte
<script>
  import { Card } from '$lib';
</script>

<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>
```

### Input Component
```svelte
<script>
  import { Input } from '$lib';
</script>

<Input label="Email" placeholder="Enter your email" />
<Input variant="error" label="Error Input" error="This field is required" />
```

### Badge Component
```svelte
<script>
  import { Badge } from '$lib';
</script>

<Badge variant="wellness">Wellness</Badge>
<Badge variant="commerce">Commerce</Badge>
<Badge variant="admin">Admin</Badge>
<Badge variant="jury">Jury</Badge>
```

## CSS Utility Classes

The system includes utility classes that map to CSS variables:

- Text colors: `.text-brand-purple`, `.text-brand-blue`, `.text-wellness`, etc.
- Background colors: `.bg-brand-purple`, `.bg-wellness`, `.bg-commerce`, etc.
- Border colors: `.border-brand-purple`, `.border-wellness`, etc.
- Gradient backgrounds: `.bg-gradient-primary`, `.bg-gradient-wellness`, etc.

## Creating New Pages

When creating new pages, follow these guidelines:

1. Import the UI components you need:
```svelte
<script>
  import { Button, Card, Input } from '$lib';
</script>
```

2. Use standardized components instead of raw HTML elements when possible

3. Use CSS variables for colors instead of hardcoded values:
```svelte
<div style="color: var(--brand-purple); background-color: var(--bg-card);">
  Content
</div>
```

4. Use Tailwind classes combined with DaisyUI for consistent styling

## Migration Guide

To migrate existing components to the new system:

1. Replace hardcoded colors with CSS variables
2. Replace custom button/input implementations with standardized components
3. Use the new utility classes where appropriate
4. Update any custom styling to use the new theme variables

This system ensures consistency across the application and makes it easier to maintain and update the styling in the future.