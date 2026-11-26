---
name: Executive Talent Intelligence
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#004f35'
  on-tertiary: '#ffffff'
  tertiary-container: '#006948'
  on-tertiary-container: '#76eab6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an institutional, high-precision workspace for recruiters, hiring managers, and enterprise HR panels. The visual language balances authoritative corporate discipline with modern, lightweight SaaS efficiency.

### Personality & Emotional Tenor
- **Objective & Trustworthy:** Interfaces reflect unbiased, algorithmic clarity, avoiding frivolous ornamentation.
- **Cognitive Ease:** High data density is managed through meticulous typographic rhythm, quiet neutrals, and deliberate negative space to reduce review fatigue.
- **Decisive & Operative:** Status indicators deliver instant legibility, allowing evaluators to rapidly parse candidates, score match criteria, and audit AI-generated rationales.

### Style Archetype: Precision Minimalism & Tonal Structure
The aesthetic draws from high-utility European typographic design fused with structured desktop productivity tooling:
- Thin, hairline grid division (`#E2E8F0`) establishes clear card boundaries without visual clutter.
- Surfaces leverage an ultra-subtle cool slate foundation (`#F8FAFC`) to elevate white (`#FFFFFF`) working planes.
- Accent colors serve strictly functional roles: driving core actions and communicating definitive candidate statuses.

## Colors

The palette employs a functional, calibrated system engineered specifically for document processing and state-heavy decision flows.

### Core Architecture
- **Primary (`#1D4ED8`):** Deep Corporate Royal Blue. Used for core affirmative actions, selected navigation anchors, active filter indicators, and focal AI-match percentages.
- **Secondary (`#0F172A`):** Deep Slate Ink. Used for primary typography, document section titles, and key metadata headers.
- **Neutral (`#64748B`):** Cool Slate. Used for secondary labels, breadcrumbs, passive icons, and structural divider elements.
- **Canvas Base (`#F8FAFC`):** Soft Cool Canvas. Provides low-glare surface contrast behind stark white cards.
- **Surface Elevation (`#FFFFFF`):** Work surfaces, candidate detail viewports, and interactive form controls.

### Status Tonal Tokens (Evaluation Matrix)
Status indicators utilize dual-layer combinations (subtle tinted backgrounds paired with deep text tokens) to guarantee WCAG AAA contrast:
- **Match / Cumple (Emerald):**
  - Surface: `#ECFDF5`
  - Border: `#A7F3D0`
  - Text / Icon: `#047857`
- **Disqualified / No Cumple (Rose):**
  - Surface: `#FFF1F2`
  - Border: `#FECDD3`
  - Text / Icon: `#BE123C`
- **Ambiguous / Indeterminado (Amber):**
  - Surface: `#FFFBEB`
  - Border: `#FDE68A`
  - Text / Icon: `#B45309`

### Surface Borders
- **Border Default:** `#E2E8F0` (Crisp container separation)
- **Border Focus / Active:** `#93C5FD` (Interactive highlight)

## Typography

The typographic hierarchy pairs the architectural geometric form of **Plus Jakarta Sans** for structural headers with the neutral clarity of **Inter** for data tables, extracted resume text, and AI match summaries.

### Typographic Roles
- **Headlines & Section Titles:** Plus Jakarta Sans delivers sharp visual weight and authoritative structure at display scales. Tighter letter spacing on larger tiers maintains density in multi-column dashboards.
- **Candidate Data & Metadata:** Inter handles high-volume data points, contextual reasoning notes, and criteria tables without visual distortion or fatigue.
- **Badges, Tags & Metrics:** Set in Inter Medium and SemiBold with mild positive tracking (`0.02em` to `0.04em`) to ensure instant legibility at reduced sizes (11px–12px).
- **Tabular Figures:** All numeric displays (match percentages, salary bands, dates, page numbers) must activate `font-variant-numeric: tabular-nums` to maintain vertical alignment down dense candidate tables.

## Layout & Spacing

The layout is built around a dense, high-efficiency split-pane model designed for complex recruitment review sessions.

### Layout Model
- **Three-Tier Workspace:**
  1. **Primary Control & Filter Column (Left):** Width fixed at `280px` to `320px` (or collapsible overlay on tablet/mobile). Contains search, requirement parameters, seniority toggles, and status filters.
  2. **Candidate Feed & Ranking Stream (Center):** Fluid flex column (`min-width: 360px`, `max-width: 520px`) presenting sorted candidate cards with AI fit scores.
  3. **Inspection & Preview Workbench (Right):** Expansive fluid zone (`min-width: 600px`) embedding the raw/parsed CV viewport, extracted skills matrix, and interactive AI evaluation breakdown.

### Breakpoints & Adaptive Strategy
- **Desktop (≥ 1280px):** Full 3-column view active simultaneously. No horizontal scroll; center stream and preview panel scroll independently within the fixed viewport height.
- **Tablet / Laptop (1024px – 1279px):** Filter column collapses into an off-canvas drawer or top horizontal filter rail. Center feed and Document Preview split the workspace 40% / 60%.
- **Compact / Mobile (< 1024px):** Single-pane sequential navigation. The candidate feed functions as the primary screen; tapping a candidate transitions to a full-screen preview view with a sticky bottom action bar.

### Spacing Principles
- Consistent base-4 scale (`4px`, `8px`, `16px`, `24px`, `32px`).
- Internal container padding remains tightly controlled (`space-md` or 16px) to maximize available reading area for resumes and extracted text.

## Elevation & Depth

This design system avoids heavy shadows, using a combination of surface layering and crisp structural outlines to convey visual hierarchy.

### Depth Hierarchy
- **Level 0 (Canvas Base):** Surface color `#F8FAFC`. Base canvas behind cards and utility panels.
- **Level 1 (Card & Content Containers):** Surface color `#FFFFFF` with a 1px solid border (`#E2E8F0`). Flat surface without shadow during resting state.
- **Level 2 (Interactive Floating / Active Card Selection):** Surface `#FFFFFF`, border `#93C5FD`, paired with an ultra-soft shadow: `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Popovers, Modals & Dropdown Overlays):** Surface `#FFFFFF`, border `#CBD5E1`, with structured elevation shadow: `0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03)`.

### Document Viewport Treatment
The CV rendering canvas sits nested inside an inset container framed with an inner border `#E2E8F0` over an off-white backdrop (`#F1F5F9`), clearly delineating third-party uploaded document pages from native system tools and controls.

## Shapes

The design uses balanced, controlled radii that communicate operational precision without feeling harsh or industrial.

### Radius Assignments
- **Micro Radius (4px / Soft):** Status dots, technical tags, and small table cells.
- **Standard Radius (8px / Rounded `0.5rem`):** Standard interactive elements including buttons, form inputs, candidate row cards, and filter chips.
- **Structural Radius (12px to 16px / `rounded-lg` & `rounded-xl`):** Major panels, the document preview workspace, and central diagnostic modal sheets.
- **Full Pill Radius (`9999px`):** Reserved exclusively for candidate match badges ('Cumple', 'No cumple', 'Indeterminado') and AI confidence score indicators.

## Components

### Buttons
- **Primary:** Solid `#1D4ED8` background, `#FFFFFF` text. Hover: `#1E40AF`. Active: `#1E3A8A`. Standard border-radius: 8px. Height: 38px (Standard), 32px (Compact).
- **Secondary / Outline:** `#FFFFFF` background, `#0F172A` text, 1px solid border `#CBD5E1`. Hover: `#F8FAFC` background with border `#94A3B8`.
- **Ghost:** Transparent background, `#475569` text. Hover: `#F1F5F9` background, `#0F172A` text.
- **Destructive:** `#FFF1F2` background, `#BE123C` text, 1px solid `#FECDD3`. Hover: `#FFE4E6`.

### Evaluation Badges & Status Chips
- Pill-shaped (`rounded-full`), padding `2px 10px`, typography `label-sm`.
- **Cumple:** Background `#ECFDF5`, border 1px solid `#A7F3D0`, text `#047857`. Leading icon: 12px checkmark.
- **No Cumple:** Background `#FFF1F2`, border 1px solid `#FECDD3`, text `#BE123C`. Leading icon: 12px cross.
- **Indeterminado:** Background `#FFFBEB`, border 1px solid `#FDE68A`, text `#B45309`. Leading icon: 12px alert circle.

### Candidate Feed Cards
- Background `#FFFFFF`, border 1px solid `#E2E8F0`, padding 16px, radius 8px.
- **Selected State:** Border 1.5px solid `#1D4ED8`, subtle left accent strip (`3px solid #1D4ED8`), background `#F8FAFC`.
- **Content Hierarchy:** Candidate name (`title-sm`), target role (`body-sm`), match percentage pill, dynamic requirement breakdown summary (mini colored pips indicating criteria fulfillment), and timestamp.

### Inputs & Filters
- **Text Inputs & Selects:** Height 38px, radius 8px, border 1px solid `#CBD5E1`, background `#FFFFFF`. Focus ring: 2px offset-free `#1D4ED8` outline with `#DBEAFE` halo. Placeholder color: `#94A3B8`.
- **Checkboxes & Radios:** 16px square/circle with 1.5px `#CBD5E1` border. Checked: `#1D4ED8` fill with crisp white glyph.
- **Filter Tags:** Removable pills with subtle `#F1F5F9` background, `#334155` text, and embedded dismiss button.

### Document Workspace & AI Breakdown
- **Viewer Frame:** Zoom controls, page navigation bar, and text-layer toggle anchored to top toolbar.
- **AI Rationale Accordion:** Clean section breaks detailing:
  - *Criterios Obligatorios* (Hard Requirements)
  - *Criterios Deseables* (Soft Skills/Bonus)
  - *Resumen del Modelo* (AI Contextual Justification)
- Visual quote snippets: Quoted CV sentences are rendered in an inset card (`#F8FAFC`) with a subtle `#3B82F6` left indicator line.