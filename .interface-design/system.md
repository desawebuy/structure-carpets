# Interface Design System

## Direction & Feel

Técnico, profesional, minimalista. Superficies oscuras con jerarquía sutil por borders.

## Tokens

### Color
```
--bg: #0a0a0b           (canvas)
--surface: #141417      (cards, modals)
--border: #27272a        (separación sutil)
--border-active: #3f3f46 (hover state)
--text: #f4f4f5         (principal)
--text-secondary: #a1a1aa (secundario)
--text-muted: #71717a   (metadata, placeholder)
--accent: #22d3ee      (cyan-400, acciones)
```

### Spacing
Base unit: 1 (4px)
- p-1: 4px (micro)
- p-2: 8px (elementos inline)
- p-3: 12px (celdas tabla)
- p-4: 16px (cards, secciones)
- p-5/p-6: 20-24px (modals grandes)

### Depth
Borders only, sin sombras. Elevación por color de surface:
- Canvas: bg mas oscuro
- Surface: cards, dropdowns
- Inset: inputs (mas oscuro que surface)

### Border Radius
- rounded-sm: 4px (badges, tags)
- rounded: 6px (inputs)
- rounded-md: 8px (botones, acciones)
- rounded-lg: 10px (cards, modals)

## Typography
- Titulo: text-2xl font-semibold
- Subtítulo: text-lg font-medium
- Body: text-sm
- Labels: text-xs font-medium
- Data: text-sm font-mono

## Patterns

### Theme object
```ts
const theme = {
  bg: darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50',
  surface: darkMode ? 'bg-[#141417]' : 'bg-white',
  surfaceHover: darkMode ? 'hover:bg-[#1c1c21]' : 'hover:bg-gray-50',
  border: darkMode ? 'border-[#27272a]' : 'border-gray-200',
  borderActive: darkMode ? 'border-[#3f3f46]' : 'border-gray-300',
  text: darkMode ? 'text-gray-100' : 'text-gray-900',
  textSecondary: darkMode ? 'text-gray-400' : 'text-gray-600',
  textMuted: darkMode ? 'text-gray-500' : 'text-gray-400',
  accent: darkMode ? 'text-cyan-400' : 'text-cyan-600',
  accentBg: darkMode ? 'bg-cyan-400' : 'bg-cyan-600',
  input: darkMode ? 'bg-[#0a0a0b] border-[#27272a] text-gray-100' : 'bg-white border-gray-200 text-gray-900',
};
```

### Modal overlay
bg-black/60 en lugar de backdrop-blur (mas limpio)

### Status badges
```tsx
// Activo
className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"

// Inactivo
className="bg-gray-500/15 text-gray-400 border border-gray-500/30"
```

### Type badges
```tsx
className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} ${theme.textSecondary}`}
```

### Action buttons
- Ver: `p-1.5 rounded hover:${theme.surfaceHover} cursor-pointer`
- Editar: `p-1.5 text-cyan-500 hover:bg-cyan-500/10 rounded cursor-pointer`
- Eliminar: `p-1.5 text-red-400 hover:bg-red-500/10 rounded cursor-pointer`

## Components

### Stat card (summary grid)
```tsx
<div className={`p-3 rounded border ${theme.border} text-center`}>
  <div className={`text-xs ${theme.textMuted}`}>Label</div>
  <div className={`text-xl font-medium ${theme.text}`}>Value</div>
</div>
```

### Progress bar
```tsx
<div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${percentage}%` }} />
</div>
```

### Filter button (active)
```tsx
className={`${theme.surface} border-cyan-500/60`}
```