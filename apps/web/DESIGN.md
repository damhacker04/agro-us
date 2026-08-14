---
name: AgroUs — Label Sertifikasi
description: An Indonesian seed-certification label rendered as an interface — cold security paper, intaglio ink, and four state-issued grade colours that own whole page regions.
colors:
  kertas: "#EDEFE8"
  kertas-terang: "#F6F7F2"
  kertas-garis: "#D3D8CB"
  tinta: "#141A2E"
  tinta-lembut: "#3A4259"
  tinta-samar: "#5C6478"
  ungu: "#5B3E96"
  ungu-tua: "#3B2668"
  ungu-muda: "#9A80CE"
  biru: "#1B63A8"
  biru-tua: "#0E3F70"
  biru-muda: "#5B9AD6"
  jambu: "#A63A55"
  jambu-tua: "#7A2439"
  stempel: "#C8321E"
  kabut-ungu: "#CDBFE8"
  kabut-biru: "#DCE9F7"
  kabut-jambu: "#F7DEE5"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 5.6vw, 4.25rem)"
    fontWeight: 800
    lineHeight: 0.94
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 112"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 4.2vw, 3.1rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.032em"
    fontVariation: "'wdth' 108"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 108"
  lead:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  small:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "0.26em"
    textTransform: "uppercase"
  data:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.375
  data-display:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1
  data-meta:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.26em"
    textTransform: "uppercase"
rounded:
  none: "0px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "56px"
  region: "80px"
  region-lg: "112px"
components:
  tombol-utama:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.kertas-terang}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "14px 28px"
  tombol-utama-hover:
    backgroundColor: "{colors.ungu}"
    textColor: "{colors.kertas-terang}"
  tombol-garis:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "14px 28px"
  tombol-garis-hover:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.kertas-terang}"
  tombol-peran-tenant:
    backgroundColor: "{colors.ungu}"
    textColor: "{colors.kertas-terang}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "14px 28px"
  tombol-peran-pembeli:
    backgroundColor: "{colors.biru}"
    textColor: "{colors.kertas-terang}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "14px 28px"
  baris-data:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    typography: "{typography.data}"
    rounded: "{rounded.none}"
    padding: "10px 0 0"
  baris-aturan:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-lembut}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "24px 0"
  cap-verifikasi:
    backgroundColor: "transparent"
    textColor: "{colors.stempel}"
    typography: "{typography.data-meta}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
    width: "24rem"
  pita-warna:
    backgroundColor: "{colors.ungu}"
    textColor: "{colors.kertas-terang}"
    rounded: "{rounded.none}"
    padding: "80px 24px"
---

# Design System: AgroUs — Label Sertifikasi

> **Migration status (read this before using the system).** This world is implemented on
> exactly **one route: `/`** (`src/app/page.tsx`). The other 57 `page.tsx` files under
> `src/app/` still carry the incumbent styling — Poppins/Fredoka, hardcoded hex such as
> `#0a381f` and `emerald-900`, no tokens. Everything below describes the new world and is
> the target for migration; it is not a description of the app as it currently stands.
> Migrating a page means adopting this file, not blending it with what is already there.

## Overview

**Creative North Star: "The Seed Certification Label"**

Indonesia already has a system for declaring a quality the eye cannot check. Seed
certification labels are colour-coded by class — white for *penjenis*, purple for *dasar*,
blue for *pokok*, pink for *sebar* — and they get stapled to a sack of seed to state,
officially, what is inside it. This product does the same thing for a harvest that does not
exist yet, so it borrows the label's actual visual apparatus rather than inventing a mood:
cold security paper, intaglio blue-black ink, a vermilion hand-pressed stamp, a guilloché
rosette, and one flat grotesk doing all the structural work.

The consequence is that colour is not decoration here. A certification colour takes an
entire full-bleed region of the page and holds it — purple for the verification mechanism,
blue for distribution, ink-black for the hash chain, paper for everything measured. Nothing
is a tinted accent sprinkled onto a neutral ground, because that is not how a grade label
behaves. Depth is likewise material rather than optical: there is not one `box-shadow` in
the build. Surfaces separate by ground colour, by 2px ink rules, and by a barely-visible
paper fibre; the only blend mode in the system belongs to the stamp, because ink pressed by
hand sits unevenly on paper.

The two rejections in the direction contract still hold in the shipped code: no green
gradient hero with a photograph of a farmer and three feature cards, and no reflex-opposite
dark space-mission dashboard. The page is a document. It reads like something that was
issued.

**Key Characteristics:**

- Four state-issued certification colours, each owning a whole page region
- Cold grey-green security paper (`#EDEFE8`), never cream
- Zero border radius, zero shadow — a document has neither
- One grotesk (Archivo) for all structure, its display voice coming from **width**
- Monospace reserved strictly for values a machine measured
- One authored motion moment for the entire page
- The system states its own gaps: cloud-blocked dates leave visible holes

## Colors

A state grading palette on cold paper: three saturated certification colours plus a single
vermilion reserved for the stamp, all sitting on a grey-green sheet that refuses to be cream.

### Primary

- **Certification Purple** (`ungu`): the verification mechanism. Owns the satellite-proof
  region end to end, draws the NDVI curve and its peak marker, colours the "full coverage"
  marks in the scope table, and is the hover state of the primary button. The Tenant
  sign-in door.
- **Deep Intaglio Ink** (`tinta`): the document's own ink. Body-level text on paper, the
  full ground of the hash-chain region, the fill of the primary button, and every 2px
  region boundary. Two lighter grades exist for text hierarchy on paper (`tinta-lembut` for
  running prose, `tinta-samar` for labels and captions).

### Secondary

- **Certification Blue** (`biru`): distribution and custody. Owns the delivery-transparency
  region, and is the Pembeli sign-in door. `biru-muda` appears only as a 40%-opacity hairline
  for rules drawn on the blue ground.
- **Certification Pink** (`jambu`): product quality. It does not own a full region on this
  page; it carries the grade letters in the quality table, the rule-row values in that
  section, and the "partial coverage" mark. `jambu-tua` is available and unused so far.

### Tertiary

- **Stamp Vermilion** (`stempel`): the only red in the system, and it is not a status colour.
  It marks the verification stamp block, the footnote daggers, the claimed-harvest line on
  the NDVI chart, the field marker on the satellite imagery, and the shortfall figure —
  places where something was pressed onto the document or is being flagged as claimed rather
  than proven.

### Neutral

- **Security Paper** (`kertas`): the default page ground, cold grey-green.
- **Bright Paper** (`kertas-terang`): the inset ground — the chart panel, satellite figures,
  and all text set on coloured or ink grounds.
- **Paper Rule** (`kertas-garis`): 1px hairlines between data rows on paper; doubles as the
  secondary text colour on the ink-black region.
- **Ink Mist / `kabut-ungu`, `kabut-biru`, `kabut-jambu`**: secondary text *on coloured
  grounds*, each drawn from its own ground's hue.

### Named Rules

**The Whole-Region Rule.** A certification colour claims an entire full-bleed section — its
ground, its type, its rules — or it does not appear at all. Purple, blue, and ink each own a
band running the full width of the viewport. Never scatter a certification colour as an
accent on a neutral ground; that is the tinted-dashboard habit this world exists to refuse.

**The One Red Rule.** `stempel` (`#C8321E`) is the system's only red and belongs to the act
of stamping and flagging: the verification cartouche, footnote daggers, the claimed-harvest
line, an unmet quota. It is never a button, never a heading, never an error state.

**The Own-Hue Mist Rule.** Secondary text on a coloured ground uses that ground's own
`kabut` tint, never grey. Grey on purple reads as dirt and fails contrast; a tint from the
same hue stays legibly part of the same document.

**The Contrast-Derived Palette Rule.** Three values in this palette were moved for
measurement, not for taste, and the reasons are recorded in `tailwind.config.ts` beside
them: `tinta-samar` darkened from `#6E7690` (3.84:1 → 4.63:1), `ungu-muda` lightened from
`#8B6FC4` (4.25:1 → 5.1:1 for 12px hashes on ink), `jambu` darkened from `#C24E6C` (4.24:1 →
5.3:1 for 15px white). Any new value in this palette earns its place the same way: it clears
4.5:1 against the ground it will actually sit on, and it says so in a comment.

## Typography

**Display Font:** Archivo (with `ui-sans-serif`, `system-ui`, `sans-serif`), loaded with the
`wdth` variable axis
**Body Font:** Archivo — the same family; there is no second text face
**Label/Mono Font:** Chivo Mono (with `ui-monospace`, `monospace`)

**Character:** One flat, official grotesk carries everything from a 10px form label to a
68px certificate title, and gets its display voice from *width and weight* rather than from
a high-contrast serif. Real security documents use plain official lettering and let the
guilloché do the talking. Chivo Mono is not a technical costume; it is a claim that the
number it sets was measured.

### Hierarchy

- **Display** (800, `clamp(2.4rem, 5.6vw, 4.25rem)`, `0.94`, `-0.035em`, `font-stretch: 112%`):
  the page's single `h1`.
- **Headline** (800, `clamp(1.9rem, 4.2vw, 3.1rem)`, `1`, `-0.032em`, `font-stretch: 108%`):
  section titles via `KepalaBagian`. Standalone section `h2`s that sit outside that component
  run one notch larger (`clamp(2rem, 4.6vw, 3.4rem)`, `0.98`, `-0.03em`).
- **Title** (800, 26px, `1`, `font-stretch: 108%`): role-card names in the four-role band.
- **Lead** (400, 17px, `leading-relaxed`, max 68ch): the paragraph directly under a headline.
- **Body** (400, 15px, `leading-relaxed`, max 58ch): rule-row explanations, table prose,
  closing notes.
- **Small** (400, 13–14px): sub-values inside a data field, journey notes.
- **Label** (600, 10–11px, `tracking-cap` = 0.26em, uppercase, `tinta-samar` or the ground's
  `kabut`): field names, table headers, column keys, footer.
- **Data** (Chivo Mono, 15px): certificate field values, coordinates, dates, currency.
- **Data-display** (Chivo Mono, 20–26px): the value that leads a rule row or a grade cell —
  set large and left, standing on its own.
- **Data-meta** (Chivo Mono, 11–13px, often `tracking-cap`): serials, batch ids, hashes,
  scene ids, cloud percentages.

### Named Rules

**The Measured-Data Rule.** Chivo Mono sets only values a machine measured: serial and batch
numbers, hashes, coordinates, NDVI values, dates, distances, currency, thresholds enforced by
the server. It never sets prose, headings, or a label whose only job is to look technical.

**The Width-Not-Serif Rule.** Display presence comes from `font-stretch` (108% for sections,
112% for the `h1`) plus weight 800 and tight negative tracking. Do not introduce a contrast
serif, a second display family, or a script face to get emphasis; widen the grotesk.

**The `ch`-On-The-Text Rule.** A `max-w` expressed in `ch` must sit on the text element
itself, never on a wrapper. On a wrapper the unit resolves against the inherited 16px, not
against the 68px heading — recorded in the code after it broke the `h1` into nine lines.

**The Tracking-Cap Rule.** Uppercase in this system is always small (10–12px), always
semibold, and always at `tracking-cap` (0.26em). Uppercase at body size or at normal
tracking does not exist here.

## Layout

A single centred document column, `max-w-[1180px]`, with `px-6` gutters rising to `md:px-10`.
Vertical rhythm is per-region: `py-20` rising to `md:py-28` for a full section, `py-10 /
md:py-14` for the certificate block at the top, which is denser than the sections below it
on purpose. Colour regions are full-bleed; the column lives inside them. The four-role band is
the one exception — it drops the column entirely and runs four equal full-height colour
panels edge to edge (`md:grid-cols-4`).

Section rhythm is owned by `KepalaBagian` rather than re-tuned per section: heading, then
`mt-6` to a 68ch lead paragraph, then `mt-14` to the section's content. That component exists
so the space above a heading always exceeds the space below it without anyone re-deciding at
the seventh section.

Content grids in use, all `md:` and up, all collapsing to a single column below:

- Certificate fields: `sm:grid-cols-2 lg:grid-cols-4`, `gap-x-10 gap-y-6`
- Rule rows: `md:grid-cols-[13rem_minmax(0,1fr)]` — value column, explanation column
- Delivery journey: `md:grid-cols-[7rem_9rem_minmax(0,1fr)_auto]`
- Hash chain: `md:grid-cols-[3rem_11rem_minmax(0,1fr)_auto]`
- Hero: `md:grid-cols-[minmax(0,1fr)_auto] md:items-end` — headline left, standfirst
  right-aligned at 44ch

Measure is capped in `ch` on the text element: 68ch for leads, 58ch for rule prose, 44ch for
the hero standfirst, 34ch inside role panels, 15–24ch for headings.

### Named Rules

**The Scroll-Don't-Shrink Rule.** Wide data does not shrink to fit a phone; it scrolls
horizontally inside its own container. The NDVI chart holds `min-w-[52rem]` inside a
`-mx-6 overflow-x-auto px-6` wrapper, and the grade table holds `min-w-[36rem]` inside
`overflow-x-auto`. An SVG scaled down scales its labels with it — at 375px a 13px label
renders at 4px and the page's central evidence stops being readable.

**The Section Rhythm Rule.** New sections use `KepalaBagian` for their head and lead. Do not
hand-place a heading and a paragraph with local margins; the rhythm is the component's job.

## Elevation & Depth

**There is no `box-shadow` anywhere in this system, and none should be added.** A certificate
is a flat sheet. Depth comes from four material devices instead:

1. **Ground colour.** Regions separate because they are different papers: `kertas`,
   `ungu`, `biru`, `tinta`. Adjacent regions never share a ground.
2. **Ink rules.** `border-b-2 border-tinta` closes a paper region; 1px `kertas-garis`
   hairlines separate data rows within one.
3. **Paper fibre.** The `.kertas-sekuriti` class paints an SVG `feTurbulence` noise on a
   `::before` pseudo-element at `opacity: 0.055` with `mix-blend-mode: multiply` and
   `z-index: -1`, under `isolation: isolate`. It is deliberately near-invisible: valuable
   paper does not shout, it only refuses to look flat up close.
4. **Inset panels.** Content that must be read as *placed on* a coloured region (the chart,
   the satellite figures) gets a `kertas-terang` panel with generous padding and no border.

### Named Rules

**The Flat-Paper Rule.** No shadows, no glows, no elevation levels, no frosted glass. If a
surface needs to separate, change its ground or draw a rule.

**The Pressed-Ink Rule.** `mix-blend-mode: multiply` belongs to the verification stamp and
to the paper fibre, nothing else. The stamp additionally sits at `opacity: 0.92` so its
vermilion picks up the paper underneath — ink pressed by hand, not printed by machine.

## Shapes

**Every corner in this system is square.** There is not a single `rounded-*` utility on the
route; the only curves are the guilloché rosette, the NDVI polyline, and the 3.5px data
points on that curve. Buttons, panels, stamps, figures, and imagery are all hard rectangles.

The border vocabulary is two weights, and the weight carries meaning:

- **2px `tinta`** — a structural boundary: the end of a region, the line above the signature
  block. Also `2.5px stempel` for the stamp cartouche, the one heavier stroke in the system.
- **1px** — a data rule: `kertas-garis` on paper, `tinta-lembut` on ink, `biru-muda/40` on
  blue. Rows of data are separated by these and by nothing else.

### Named Rules

**The Zero-Radius Rule.** Radius is `0` everywhere. A rounded corner in this world reads as
a different product's UI kit pasted onto a document.

**The Two-Weight Rule.** 2px means "region ends here"; 1px means "next row of the same
record". Do not introduce a third weight to signal a third kind of importance — change the
ground instead.

## Components

### Buttons

Rectangular ink blocks with generous horizontal padding and no radius. Weight and ground do
all the differentiating; there are no icons in any button in this system.

- **Shape:** hard rectangle (`0` radius), `padding: 14px 28px` (`px-7 py-3.5`)
- **Primary:** `tinta` ground, `kertas-terang` text, 15px semibold. Hover transitions the
  ground to `ungu` — the certification colour arrives on interaction.
- **Ghost / outline:** 1px `tinta` border on the page ground, `tinta` text. Hover inverts to
  a solid `tinta` fill with `kertas-terang` text.
- **Role doors:** solid `ungu` (Tenant) and solid `biru` (Pembeli), `kertas-terang` text,
  hover `opacity: 0.9`. The Operator door is the ghost variant — internal staff get the
  quieter affordance.
- **Focus:** `focus-visible:outline outline-2 outline-offset-2`, coloured `ungu` on paper
  grounds and `tinta` where `ungu` is already in play. Focus is never removed and never
  relies on the hover treatment.

### Certificate Field (`baris-data`)

The atom of the whole page: a numbered form field, not a card.

- **Structure:** a 1px `kertas-garis` top rule, `padding-top: 0.6rem`, a header line pairing
  a monospace two-digit index (`01`) with a `tracking-cap` uppercase label in `tinta-samar`,
  then the value in 15px Chivo Mono `tinta`, with an optional 13px `tinta-samar` sub-value
  beneath.
- **Behaviour:** fields sit in a 2/4-column grid and read down a column. No background, no
  border box, no icon.

### Rule Row (`BarisAturan`)

The page's answer to the three-feature-card pattern, and a deliberate refusal of it.

- **Structure:** `md:grid-cols-[13rem_minmax(0,1fr)]` with a 1px top rule and `py-6`. Left
  column: the value at 26px Chivo Mono with an optional smaller unit, then a `tracking-cap`
  uppercase label under it. Right column: a 58ch explanation at 15px.
- **Colour:** the value takes the section's certification colour (`ungu` on paper for supply,
  `jambu` for quality, `kertas-terang` on the blue ground); rules and prose take the
  ground-appropriate hairline and `kabut` text.
- **Why:** the values are thresholds the server actually enforces. A number that governs
  money is allowed to stand as a number, not be shrunk into an ornament in the corner of a
  box.

### Verification Stamp (`.cap`)

- **Style:** a 2.5px `stempel` rectangle, `stempel` text, `mix-blend-mode: multiply` at
  `opacity: 0.92`, max 24rem wide.
- **Contents:** a `tracking-cap` uppercase assertion line, then the evidence in monospace —
  scene id, acquisition date, cloud cover. The stamp never asserts more than the monospace
  under it can support.

### Section Head (`KepalaBagian`)

- **Style:** headline plus optional 68ch lead, with a `nada` prop switching the lead's colour
  between `tinta-lembut` (paper ground) and the ground's `kabut` (coloured ground).
- **Rule:** the space above a heading always exceeds the space below it.

### Tables

- **Header:** 10px `tracking-cap` uppercase in `tinta-samar`, `pb-3`, one 1px `tinta` rule
  under the whole header row.
- **Rows:** 1px `kertas-garis` separators, `py-4`. Identifier cells are Chivo Mono at 20px in
  the section's colour; measured cells are Chivo Mono at 15px; prose cells are 15px Archivo
  capped at 36ch.
- **Never** zebra striping, cell borders, or a filled header band.

### Footnote Dagger

- **Style:** a `stempel` monospace `†` / `††` superscript at 11px, attached inline to the
  fact it qualifies, resolved in a monospace note at the bottom of the same region.
- **Rule:** a limitation is stated where the claim is made, not collected into a separate
  list of shortcomings placed just before the call to action.

### Guilloché Rosette (signature)

The system's one ornament, and it is not an ornament.

- **What it is:** concentric rosette rings, each ring generated from one Sentinel-2 NDVI
  observation of the specific plot on the certificate. Wave depth grows as the canopy closes
  and shrinks as the crop ages. Cloud-blocked dates draw **no ring at all** — the gap is
  visible in the pattern, and it is the same statement the chart makes with its missing
  points.
- **Current data:** 19 observations, 17 rings, 2 deliberate gaps; 24 petals derived from the
  peak NDVI (0.81); ring opacity scales 0.28→0.90 with the observation's own value.
- **Rendering:** 400×400 viewBox, `stroke-width: 0.64` with `vectorEffect="non-scaling-stroke"`,
  `currentColor` by default so a parent's text colour drives it.
- **Placement:** oversized and clipped at the region edge behind the certificate
  (`opacity: 0.42`, `md:` and up only), and small and still (`diam`) beside the sign-in
  headline (`opacity: 0.5`).
- **Precomputation:** every path is generated at asset-prep time by
  `scripts/buat-guilloche.mjs` into `src/lib/guilloche-paths.ts`. `Math.cos`/`Math.sin` are
  transcendental and may differ in the last bit between Node's V8 and the browser's; one bit
  is enough to flip a `toFixed(2)` and make React discard the tree with a hydration error.
  Regenerate with `node scripts/buat-guilloche.mjs` — never hand-edit the output.

### NDVI Curve (signature)

- **Style:** an 880×300 SVG on a `kertas-terang` panel. Gridlines in `kertas-garis` with
  monospace `tinta-samar` labels; a dashed `tinta-lembut` canopy-closure threshold; the
  series as a 2.5px `ungu` polyline with `fill="none"` and 3.5px `kertas-terang` points
  ringed in `ungu`; the peak as a filled `ungu` dot with a leader line and its value; the
  Tenant's *claimed* harvest date as a dashed `stempel` vertical, standing apart so it can be
  compared against where the curve actually turned.
- **Gaps:** the polyline is split into segments at every cloud-blocked date, so the line
  genuinely breaks. Each gap gets a 7%-opacity `tinta` vertical band labelled with its cloud
  percentage. Not zero, not interpolated — the graphical form of "cannot be assessed".

### Motion

One authored moment for the entire page: the guilloché strokes itself on, ring by ring from
the inside out, via `pathLength={1}` + `strokeDasharray/offset` and the `gores` keyframe
(`2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards`) with a 0.075s per-ring stagger. Everything
else that moves is a `transition-colors` or `transition-opacity` on a hover state.
`prefers-reduced-motion: reduce` collapses all animation, transition, and scroll behaviour to
0.01ms globally in `global.css`.

**The One-Authored-Moment Rule.** The page gets one piece of narrative motion. Additional
entrance animations, scroll-triggered reveals, parallax, or counters are not additions to
this system — they are dilutions of its single moment.

## Do's and Don'ts

### Do:

- **Do** give a certification colour a whole region — its ground, type, and rules — or leave
  it out (The Whole-Region Rule).
- **Do** tint secondary text on coloured grounds from that ground's hue using `kabut-ungu`,
  `kabut-biru`, or `kabut-jambu`. Never grey.
- **Do** verify any new colour clears 4.5:1 against the ground it will actually sit on, and
  record the measurement in a comment beside the token, as `tinta-samar`, `ungu-muda`, and
  `jambu` already do.
- **Do** set every measured value in Chivo Mono, and let large values (20–26px) stand on
  their own at the left of a rule row.
- **Do** format Indonesian numbers and dates through `src/lib/format-id.ts`
  (`tanggalPanjang`, `tanggalPendek`, `angka`, `rupiah`, `desimal`). `toLocaleDateString("id-ID")`
  depends on runtime ICU data and produces a hydration mismatch between server and browser.
- **Do** put `max-w` in `ch` on the text element itself, never on a wrapper.
- **Do** let wide data scroll horizontally inside its own container rather than shrink
  (The Scroll-Don't-Shrink Rule).
- **Do** show the system's own gaps — missing points, empty rings, `±` and `—` coverage
  marks, footnote daggers. "Cannot be assessed" is a first-class visual state here, and it
  must read differently from "problem".
- **Do** use `aria-label` (with `role="img"`) to name a meaningful SVG, and `aria-hidden` +
  `focusable="false"` for decorative ones.
- **Do** build new sections with `KepalaBagian` and `BarisAturan` so rhythm and the rule-row
  pattern stay consistent.

### Don't:

- **Don't** add a `<title>` element inside an SVG. React 19 treats it as document metadata
  and hoists it to `<head>`, so the server and client markup diverge and the whole tree is
  discarded with a hydration error. Use `aria-label`.
- **Don't** compute trigonometry at render time for generated geometry. Precompute it into a
  constants module the way `scripts/buat-guilloche.mjs` does.
- **Don't** add `box-shadow`, glows, gradients, or frosted glass. Depth is ground colour,
  ink rules, and paper fibre (The Flat-Paper Rule).
- **Don't** round a corner. Radius is `0` everywhere.
- **Don't** use `stempel` as an accent, a button, or a generic error colour. It stamps and it
  flags, nothing else.
- **Don't** use monospace as a "technical" costume on prose, headings, or decorative labels.
- **Don't** introduce a second display face, a contrast serif, or a script face. Widen
  Archivo instead (The Width-Not-Serif Rule).
- **Don't** introduce an icon set. This system has zero glyph icons — its marks are the
  numbered field index, the dagger, the coverage `✓ ± —`, and the guilloché.
- **Don't** rebuild the rule rows as icon-title-text feature cards. The numbers are enforced
  server-side and are the content, not the decoration.
- **Don't** reuse the guilloché from one plot on another plot's certificate. The pattern *is*
  that plot's data; reusing it makes it a decoration and voids the reason it is there.
- **Don't** add customer logos, testimonials, partner badges, press mentions, or usage
  metrics. PRODUCT.md binds this: none of those exist, and none may be fabricated. The
  evidence on this page is the certificate, the curve, the imagery, and the chain.
- **Don't** repoint Tailwind's `sans` family at Archivo yet, and don't apply `font-sertifikat`
  to a page you are not migrating in full. `sans` stays mapped to Poppins on purpose so the
  57 unmigrated pages do not silently change typeface (see the comment in
  `tailwind.config.ts`); the new world is registered separately as `sertifikat`. Migrate a
  page completely or leave it alone.

## Known divergences from the direction contract

Recorded rather than hidden, because the build is the ground truth and the contract is the
intent:

- **First viewport.** The contract calls for the batch certificate itself to lead at document
  scale. After the audience narrowed to institutional buyers, the built page leads with an
  offer headline — "Harga terkunci sebelum benihnya ditanam." — and places the certificate
  data block immediately beneath it as the proof of that offer. The certificate did not lose
  the first screen; it stopped being the opening sentence.
- **Observation count.** The contract says the guilloché is drawn from 17 NDVI observations.
  The series holds 19 observations, of which 17 draw a ring and 2 are cloud gaps.
- **Scope.** The contract's world is fully implemented on `/` only. It is a design system by
  intent and a single-route implementation by fact until the remaining pages migrate.
