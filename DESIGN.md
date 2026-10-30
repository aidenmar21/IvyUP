# IvyUp design system

## Direction: collegiate editorial
The site should read like an admissions office's letterhead or a university press catalog, not a SaaS landing page. Authority comes from restraint: warm paper, a serif display face, hairline rules, generous whitespace, and a single ivy green reserved for the action that matters on each screen.

## Tokens (`app/globals.css`)
| Token | Value | Use |
|---|---|---|
| `--ivy-700` | `#1F5A3D` | The one primary action per screen; key emphasis |
| `--ivy-800` | `#184A32` | Primary hover |
| `--ivy-900` | `#12321F` | Dark sections, footer |
| `--ivy-100` / `--ivy-200` | `#E3ECE4` / `#C6D9CA` | Selected states, tints |
| `--brass-500` / `--brass-700` | `#B08A3E` / `#7D5F22` | Credibility marks (schools, scores). 700 for text (AA on paper) |
| `--paper` | `#F7F4EC` | Page background (never pure white) |
| `--surface` | `#FBF9F4` | Raised surfaces, inputs |
| `--paper-2` | `#EFEBE0` | Muted fills |
| `--line` | `#DAD4C4` | Hairlines, borders |
| `--ink-900` / `--ink-600` / `--ink-400` | `#1A1C18` / `#4A4A42` / `#6B6A60` | Text (never pure black). 600 is the minimum for body copy |

**Type.** Newsreader (display, optical sizes) and Hanken Grotesk (UI and body). Scale: 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48 / 64 / 80px, mapped to `text-xs` through `text-6xl`. Body measure is capped at 68ch (`measure`). Headlines use `text-wrap: balance`. Scores, times and dates use `tabular`.

**Spacing.** 4 / 8 / 16 / 24 / 32 / 48 / 64 / 96 only (Tailwind 1, 2, 4, 6, 8, 12, 16, 24).

**Radius.** 10px for controls and surfaces, 16px for large panels. **Targets.** Every control is at least 44px tall, or has an invisible hit-slop pseudo-element.

## Motion
- Easing is `cubic-bezier(0.2, 0.7, 0.2, 1)` (`ease-soft`). Micro-interactions take 150–300ms; section reveals take 600ms. Nothing bounces.
- On the public site, Lenis drives smooth scroll from GSAP's ticker, so ScrollTrigger and Lenis share one frame (`components/motion/motion-provider.tsx`).
- Page headlines (`data-split`) rise in with a CSS animation that starts at first paint, so they never wait for JavaScript (this keeps Largest Contentful Paint fast). Sections use `data-reveal`, and lists use `data-reveal="stagger"`; both are driven by GSAP ScrollTrigger.
- Route changes crossfade with the View Transitions API. Form steps slide in the direction of travel. Success states draw their checkmark.
- Dashboard list items animate in. Stage moves are optimistic and come with an Undo toast.
- `prefers-reduced-motion` disables all of it, and content never depends on JS to be visible: there's a 3s fallback in `app/layout.tsx`.

## Choice architecture
Each screen has exactly one filled ivy button. Secondary actions are outline or ghost buttons, or text links. Pipeline cards change their single primary action as the record moves:
- **Families:** Email parent → Schedule consultation → IvyUp student
- **Tutor applicants:** Email to schedule interview → Schedule interview → Make tutor

## References
I didn't do a live reference study. The owner declined opening the first reference, Stripe Press, and asked that the site have no finance features, so I dropped Stripe and Mercury as references. The direction comes from the IvyUp logo (its green, and the leaf and arrow mark) and from familiar university-press and admissions-office print conventions: serif display type, ruled indexes, numbered steps, and restrained color. If you want a reference pass later, good non-finance candidates are Princeton University Press, Aesop, Linear (dashboard density and ⌘K) and Cal.com (scheduling).

## Logo
`components/shared/logo.tsx` redraws the supplied logo as a single-color SVG. The upward "J" arrow and the leaf are kept, and the wordmark is set in Newsreader with "Up" in ivy. The favicon is `app/icon.svg`.
