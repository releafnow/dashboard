# Tailwind CSS Setup

Tailwind CSS has been successfully integrated into the Releafnow client application.

## Installation

The following packages have been added to `package.json`:
- `tailwindcss` - Core Tailwind CSS framework
- `postcss` - CSS post-processor
- `autoprefixer` - Automatic vendor prefixing

## Configuration Files

1. **tailwind.config.js** - Tailwind configuration with custom colors matching the Releafnow brand
   - Primary green color: `#2d5016`
   - Custom color palette extending from the primary color
   
2. **postcss.config.js** - PostCSS configuration for processing Tailwind CSS

3. **src/index.css** - Updated with Tailwind directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)

## Custom Theme

The Tailwind config includes a custom color scheme:
- `primary` - Main brand color (#2d5016) with shades
- `primary-600` - Darker variant (#1a3009)
- `green-light`, `green`, `green-dark` - Additional green variants

## Components Updated

The following components have been converted to use Tailwind utility classes:
- ✅ Layout (Sidebar navigation)
- ✅ Login page
- ✅ Register page
- ✅ Dashboard page

## Next Steps

To use Tailwind in other components:
1. Replace custom CSS classes with Tailwind utility classes
2. Remove unused CSS files (optional - can keep for reference)
3. Use the custom color palette: `text-primary`, `bg-primary`, `from-primary`, etc.

## Usage Examples

```jsx
// Using custom primary color
<button className="bg-primary text-white hover:bg-primary-600">
  Click me
</button>

// Using green variants
<div className="bg-green-light text-green-dark">
  Success message
</div>

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Content */}
</div>
```

## Running the Project

After setup, install dependencies:
```bash
cd client
npm install
npm start
```

Tailwind will automatically process and generate CSS during development and build processes.



