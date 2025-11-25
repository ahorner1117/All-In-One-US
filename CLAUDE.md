# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Shopify theme codebase based on the **Horizon** theme (v3.1.0). The theme is built using Shopify's Liquid templating language, modern web components, and a component-based JavaScript architecture.

## Development Commands

This is a Shopify theme that should be developed using the Shopify CLI:

```bash
# Serve theme locally and sync changes
shopify theme dev

# Push theme to a development store
shopify theme push --development

# Pull theme from store
shopify theme pull

# Check theme for errors
shopify theme check
```

## Architecture

### Directory Structure

- **`assets/`** - JavaScript modules, CSS files, and SVG icons
  - JS files use ES6 modules with `@theme/` path aliasing (configured in `jsconfig.json`)
  - Base CSS is in `base.css`, critical styles loaded via `critical.js`
  - Component-specific JavaScript using Web Components pattern

- **`blocks/`** - Reusable theme blocks (prefixed with `_`)
  - Small, composable UI components like `_blog-post-card.liquid`, `_product-card.liquid`
  - Used within sections via `{% content_for 'block' %}`

- **`sections/`** - Page sections that can be added/arranged in theme editor
  - Main page templates: `main-collection.liquid`, `main-product.liquid`, etc.
  - Reusable sections: `hero.liquid`, `featured-product.liquid`, etc.
  - Special section groups: `header-group.json`, `footer-group.json`

- **`snippets/`** - Reusable Liquid partials
  - Rendering utilities: `section.liquid`, `product-card.liquid`, `video.liquid`
  - Style utilities: `theme-styles-variables.liquid`, `typography-style.liquid`

- **`templates/`** - Page templates (JSON format)
  - Define which sections appear on different page types

- **`layout/`** - Theme layouts
  - `theme.liquid` - Main layout file with document structure
  - `password.liquid` - Password-protected store layout

- **`config/`** - Theme configuration
  - `settings_schema.json` - Theme customization options
  - `settings_data.json` - Current theme settings data

- **`locales/`** - Translation files for internationalization
  - `en.default.json` - Default English translations
  - Multiple language files with `.schema.json` for theme editor translations

### JavaScript Architecture

The theme uses a modern **Web Components** architecture:

1. **Base Component Class** (`component.js`)
   - Extends `DeclarativeShadowElement` for shadow DOM support
   - Automatic ref management via `[ref]` attributes
   - Mutation observer for dynamic DOM updates
   - Declarative event listener setup

2. **Critical JS** (`critical.js`)
   - Loaded with `blocking="render"` for essential functionality
   - Provides `DeclarativeShadowElement`, `OverflowList`, `ResizeNotifier`
   - Handles declarative shadow DOM polyfill

3. **Component Pattern**
   - All custom elements extend `Component` class
   - Use `this.refs` to access elements with `ref` attributes
   - Lifecycle hooks: `connectedCallback()`, `disconnectedCallback()`, `updatedCallback()`
   - Example components: `product-form.js`, `quick-add.js`, `cart-drawer.js`

4. **Module Imports**
   - Uses `@theme/` path alias to import from assets directory
   - Example: `import { Component } from '@theme/component'`

### Liquid Templating Patterns

1. **Content Blocks System**
   ```liquid
   {% content_for 'block', type: 'product-card', id: 'card-id' %}
   ```
   Used to render blocks within sections dynamically

2. **Section Rendering**
   ```liquid
   {% render 'section', section: section, children: children %}
   ```
   Consistent section wrapper with settings and styling

3. **Schema Definitions**
   Each section/block ends with a `{% schema %}` JSON block defining settings and options

4. **Ref Attributes**
   Elements that need JS access use `ref="elementName"` or `ref="array[]"` for collections

### Styling

- **CSS Custom Properties** - Extensive use of CSS variables for theming
- **Color Schemes** - Defined in settings, applied via classes like `color-{{ section.settings.color_scheme }}`
- **Responsive Design** - Mobile-first with `@media screen and (min-width: 750px)` for desktop
- **Grid System** - Uses CSS Grid with custom properties for layout: `--page-width`, `--page-margin`, `--centered-column-number`

### Key Global Objects

Defined in `global.d.ts`:

- **`Shopify`** - Global Shopify object with country, currency, locale, shop info
- **`Theme`** - Theme utilities including translations, routes, and scheduler
- Both available on `window` object

## Working with This Codebase

### Adding New Features

1. **New Section**: Create in `sections/` with schema, reference existing sections for patterns
2. **New Block**: Create in `blocks/` with `_` prefix, use `{% content_for 'blocks' %}` pattern
3. **New Component**: Create JS in `assets/`, extend `Component` class, register as custom element
4. **Styling**: Add to `base.css` or use section-specific `{% stylesheet %}` blocks

### Modifying Components

- JavaScript components use refs heavily - check `this.refs` usage before modifying DOM structure
- The Section Rendering API calls `updatedCallback()` when sections re-render
- Mutation observers watch for ref attribute changes automatically

### Liquid Best Practices

- Use `{% render %}` for snippets, not `{% include %}`
- Access section settings via `section.settings.setting_id`
- Use translation keys: `t:names.section` format
- Block iteration: `{% content_for 'blocks' %}` captures all blocks in a section

### Theme Customization

- Theme settings are in `config/settings_schema.json`
- Color schemes, typography, and global options configured there
- Changes sync through theme editor in admin

## Custom Features

### Pet Profile Form

This theme includes a custom **Pet Profile Form** section (`sections/pet-profile-form.liquid`) designed for subscription-based pet box stores.

**Features:**
- Conversational, friendly copy for better UX
- Dynamic pet name that updates questions in real-time
- Visual selectors for weight categories (Tiny but mighty, Perfect medium, Large and in charge)
- Protein allergy selector with icons (beef, chicken, lamb, turkey)
- Health boost options (Joint support, Gut health, Pre + pro biotic)
- Automatic dog/cat toggle that shows appropriate weight options

**Files:**
- `sections/pet-profile-form.liquid` - Form section with schema and styles
- `assets/pet-profile-form.js` - Web component handling form logic and submission
- `PET_FORM_SETUP.md` - Complete setup and integration guide

**Usage:**
1. Add the "Pet Profile Form" section to any page via theme editor
2. Customize questions and copy in section settings
3. Set up backend API endpoint for metaobject creation (see PET_FORM_SETUP.md)
4. Form data should be saved to customer metaobjects for subscription personalization

**Integration Notes:**
- Requires customer to be logged in
- Submits to `/apps/pet-profile/submit` endpoint (requires custom app or Shopify Functions)
- Falls back to localStorage during development if API endpoint not available
- Form data structure: `{ name, type, birthday, breed, weight, allergies[], healthBoost }`
- mcp add https://shopify.dev/docs/apps/build/devmcp to use shopify mcp for app development