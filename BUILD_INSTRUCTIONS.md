# Tailwind CSS Build Instructions

This project uses Tailwind CSS v3 as a PostCSS plugin for production use.

## Prerequisites

- Node.js (v14 or higher)
- npm

## Setup

Install dependencies:

```bash
npm install
```

## Building CSS

To build the Tailwind CSS for production:

```bash
npm run build:css
```

This will generate a minified `output.css` file that is referenced in `index.html`.

## Development

To watch for changes and rebuild automatically:

```bash
npm run watch:css
```

## Configuration

- `tailwind.config.js` - Tailwind CSS configuration including custom colors, animations, and theme extensions
- `postcss.config.js` - PostCSS configuration
- `src/input.css` - Source CSS file with Tailwind directives
- `output.css` - Generated CSS file (included in git for deployment convenience)

## Note

The `output.css` file is committed to the repository to allow the site to work without a build step during deployment. If you make changes to the HTML or JavaScript that use new Tailwind classes, remember to rebuild the CSS.
