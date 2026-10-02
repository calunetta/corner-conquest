# UI design: <title>

## Spec (ui-designer-a)

### Purpose and user story
As a <player role>, I want <goal> so that <benefit>.

### Placement and layout
- Desktop (1280×720): <where it lives, size, layering>
- Mobile (390×844): <how it adapts; the whole map grid (`MAP_COLS` × `MAP_ROWS`, default 5 × 6) must stay visible>

### States
| State | What the player sees | Trigger |
|---|---|---|
| Default | | |
| Empty / Loading / Error / Disabled | | |
| Hover / Focus / Selected | | |

### Components and tokens
- Reuse: <shadcn primitives and existing components, each path verified>
- Tokens: <bg-*, text-*, border-* theme classes; no raw hex values>

### Copy
- <exact strings, including button labels and empty/error messages>

### Interactions and motion
- <clicks, keyboard, transitions; motion respects prefers-reduced-motion>

### Accessibility
- <roles and labels, keyboard path, visible focus, contrast ≥ 4.5:1 for text>

### Acceptance criteria
<!-- Checked in the browser by the ui-verify skill. Make each one observable. -->
- [ ] <criterion>

## Review (ui-designer-b)
VERDICT: <APPROVED | CHANGES REQUESTED>
- <findings, each with evidence>

## Final spec
<the agreed spec; later stages rely only on this section>
