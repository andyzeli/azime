# Dark mode: plan (not started)

Decided 2026-10-24. Nothing is built yet; this is the plan for when we pick it up.

## Decisions

- **Light stays the default.** Dark is an optional toggle, not a switch to dark-only. The toggle has three settings: System (default), Light, Dark. Save the choice in `localStorage`.
- **Print is always light.** The exam prep sheet (`ExamPrepModal`, print CSS in `src/index.css`) and anything else printed or exported must render light whatever the setting.
- **Record PDFs stay as they are.** Source documents open in the browser's PDF viewer; they are not themed.
- **Use semantic color tokens, not `dark:` classes.** Define each color once as a CSS variable with a `.dark` override, and point components at the token. Adding `dark:` variants next to every class would double the class lists and drift.

## Where things stand

- Tailwind is already set to `darkMode: ["class"]` (`tailwind.config.ts`).
- First token exists (2026-10-24): `--surface` in `src/index.css` (warm white, `255 253 249`; pure white in print). `bg-white`, `border-white`, `ring-white` and `ring-offset-white` resolve to it, and `text-white` does not. In dark mode, `.dark { --surface: … }` already re-themes every card.
- `slate` and `gray` are remapped to Tailwind's `stone` palette in the config, so the whole app uses warm neutrals. The dark-mode grays should be warm too.
- About 1,700 hard-coded color classes across ~70 files (`bg-white`, `text-slate-800`, `bg-sky-50`, …). Only the shadcn components in `src/components/ui` use `dark:`.
- The app bar (`src/App.tsx`, `bg-zinc-900`) is dark in both modes. In dark mode it should be the darkest surface, with the page and panels one step lighter.

## Approach

1. **Tokens.** In `src/index.css`, define `:root` and `.dark` values. Register them in `tailwind.config.ts` `colors` so they work as classes (`bg-surface`, `text-muted`, …). Minimum set:
   - Surfaces: `canvas` (page background, now `bg-slate-100` / `bg-slate-50`), `surface` (cards and panels, now `bg-white`), `surface-muted` (table heads and bands, now `bg-slate-50`).
   - Text: `fg` (now `text-slate-900` / `-800`), `fg-muted` (now `text-slate-500` / `-600`), `fg-subtle` (now `text-slate-400`).
   - Lines: `border` (now `border-slate-200` / `-300`).
   - Tones: one set of `{bg, fg, ring}` per color in use: sky, violet, amber, emerald, purple, rose, slate, plus blue for primary. Tinted chips (`bg-sky-50 text-sky-800`) need their own dark values; a pale tint does not invert.
2. **Toggle.** A small control in the app bar sets the `dark` class on `<html>`. Apply the saved or system choice in `index.html` before React mounts, to avoid a white flash.
3. **Convert screens one at a time.** Start with the parts that already centralize color:
   - `routes/p_cases/p_case/components/records/parts.tsx`: `toneStyle` and `workStatusStyle` hold every record-view color in one map.
   - `routes/p_cases/p_case/components/shared.tsx`: `EventDot`, `Badge`, `Btn`, `Segmented`.
   - Then the cockpit shell (`p_case.lazy.tsx`, `CaseFacts.tsx`), then the tabs, then Case Intake and Contacts.
4. **Check.** For each converted screen, take a screenshot in both modes and run a print preview of the prep sheet.

## Watch out for

- Colors that carry meaning must keep it in dark mode: work status (green/amber/red), medication action, active vs passive therapy, exertion level, Supported/Not supported, stale/out-of-date amber.
- `react-markdown` output is styled with arbitrary selectors (`[&_strong]:text-slate-900` in `Prose` and the summary tab); those need tokens too.
- Shadows (`shadow-md`) disappear on dark surfaces; use a border or a lighter surface for elevation.
