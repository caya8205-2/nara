# Nara Visual System Baseline

Status: baseline for implementation, replaceable after visual review

This document defines the default visual direction for early Nara UI implementation. It is intentionally restrained so both the app frontend and web admin dashboard can ship without requiring a full brand exercise first.

## Direction

Use a light premium operational SaaS style:

- Warm off-white base.
- Dense but readable layout.
- Small-radius controls.
- Clear status language.
- Subtle emerald/teal accents for agent, WhatsApp, OpenClaw, and healthy states.
- Minimal decoration.

The interface should feel calm, polished, and trustworthy, not playful or marketing-led.

## Palette

Use these roles rather than hardcoding meaning into one color:

- Background: warm off-white.
- Surface: white.
- Surface raised: soft neutral.
- Border: light stone/slate.
- Text primary: deep slate.
- Text secondary: muted slate.
- Accent primary: teal for primary actions and focus.
- Accent agent: green for healthy agent/WhatsApp/OpenClaw states.
- Warning: amber.
- Danger: rose/red.

Tailwind-friendly starting values:

- Background: `stone-50`
- Surface: `white`
- Surface raised: `slate-50`
- Border: `slate-200`
- Border strong: `slate-300`
- Text primary: `slate-950`
- Text secondary: `slate-600`
- Text muted: `slate-500`
- Primary: `teal-600`
- Primary hover: `teal-700`
- Agent/healthy: `emerald-600`
- Warning: `amber-500`
- Danger: `rose-600`

## Typography

- Use compact headings.
- Avoid oversized hero type inside the app or admin dashboard.
- Use normal letter spacing.
- Keep body copy short and operational.

Suggested hierarchy:

- Page title: 24px desktop, 20px mobile.
- Section title: 16px.
- Row title: 14px.
- Supporting text: 13px.
- Metadata: 12px.

## Radius And Spacing

- Default radius: 6px.
- Maximum card/panel radius: 8px.
- Button height: 40px desktop, 44px mobile when touch target matters.
- Icon button: stable square size, 36px or 40px.
- Panel padding: 16px desktop, 14px mobile.
- List row vertical padding: 12px.

## Component Treatment

### Panels

Use panels for bounded tools and repeated content groups. Do not put panels inside panels unless it is a modal, drawer, or code/result viewer.

### Lists

Use rows for tasks, reminders, approvals, logs, tools, and config fields. Rows should remain scannable and stable.

### Buttons

Use icon + text for primary commands when space allows. Use icon-only buttons for repeated tools such as refresh, copy, edit, save, approve, reject, settings, and close.

### Status

Every status should have:

- Label.
- Color.
- Optional icon.
- Human-readable message when unhealthy.

Do not rely only on color.

### Forms

Use grouped sections with clear labels. Avoid long forms on mobile; use sheets or step sections for assistant setup.

## App-Specific Feel

The app frontend should feel calmer and more personal than the admin dashboard:

- More whitespace than admin.
- Home screen focuses on today and pending decisions.
- Assistant setup can use clearer explanatory labels, but avoid tutorial-like paragraphs.
- WhatsApp/agent status should feel central but not noisy.

## Admin-Specific Feel

The web admin dashboard should feel denser and more technical:

- Tables and diagnostic rows are preferred.
- Status, logs, and config should be easy to scan.
- Copy/debug/export actions should be visible near the data they affect.
- Do not add consumer-app flourishes.

## Avoid

- Large marketing hero sections.
- Decorative gradients as primary backgrounds.
- Floating decoration or glow-heavy layouts.
- Purple/blue-only palettes.
- Beige/brown/orange product themes that overpower the operational UI.
- Heavy dark-mode-first surfaces.
- Text-heavy onboarding panels on operational screens.
- Hiding important server errors behind vague "something went wrong" messages.
