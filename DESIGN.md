# DESIGN.md

## Color Palette

Our app uses a calm blue–teal palette designed to feel friendly, focused, and consistent across light and dark themes.

The accents are **Catppuccin** and, since the dark pass, so is every dark neutral —
Catppuccin **Mocha**. They used to be Tailwind Slate, which is a different palette
wearing the same clothes: Slate's dark end is a saturated navy (hue ~265°) where
Mocha's is a near-neutral plum-grey (~286°, roughly half the chroma). Light never
showed the seam, because hue barely reads at Slate's near-white values. Dark showed
nothing else — the navy was the largest object on screen and competed with every
accent on it, and Liquid Glass, which lifts toward neutral grey, read *warm* against
it. Adding a dark colour? Take it from Mocha.

The light theme is unchanged and stays Slate-derived at its near-white end, which is
where the two palettes are indistinguishable anyway.

### The app ships light-only

The **app target is pinned to the light appearance**, process-wide, by
`UIUserInterfaceStyle` in `Config/Info.plist`. There is no theme picker: the
Settings → Appearance screen and its System · Light · Dark rows were removed,
because dark had never been measured against a simulator and shipping an
appearance nobody has reviewed is shipping a second app nobody has looked at.

**The dark column below is live, not archived.** Three surfaces resolve it today
and would break if it were deleted:

* `ewennWidgets` is a **separate process with its own Info.plist** and does not
  inherit the lock. The Live Activity's Lock Screen card still adapts, and
  `SessionActivityTuning`'s `restTint` and `cardBackground` are still
  `Color(light:dark:)` pairs.
* The **Dynamic Island** pins itself to Dark on purpose. It is black on every
  phone in both appearances, and a light-resolved `textInk` on it is `#1E293B`
  at **1.44:1** — invisible. See `_specs/live-activities.md`.
* `functions/src/pages.ts`, the invite fallback page, carries
  `@media (prefers-color-scheme: dark)` and mirrors these values in CSS. It is
  in a tree `xcodebuild` never compiles, so nothing here will tell you when it
  breaks.

So every table below stays as it is — hexes, contrast ratios and Mocha slot
names included — and a dark surface is still reviewable from a `#Preview` with
`.environment(\.colorScheme, .dark)`, because `Color(light:dark:)` resolves
against the trait collection SwiftUI builds from the environment rather than
from the window.

**When dark returns, four places reconnect** and the rest is a token review:

1. `Config/Info.plist` — remove the key (and re-add whatever chooses the theme).
2. `OnboardingRiveControllers.replayState()` — `Isdarkmode` is a hardcoded
   `false`.
3. `WinterBackdrop.picture` — the filename is inlined; `Night Backdrop` is still
   on disk as `add-goal-backdrop-dark.png`.
4. `AchievementsBackdrop.body` — unconditional now; note the hero has no dark
   artwork at all, only a placeholder rectangle in the Figma.

### Brand Colors

| Token   | Hex       | Usage                                                  |
| ------- | --------- | ------------------------------------------------------ |
| `blue`  | `#89B4FA` | Badges, accents, selected states                       |
| `cyan`  | `#3AAED8` | Brand accent; the CTA fill in dark theme only          |
| `teal`  | `#94E2D5` | Highlights, decorative accents                         |
| `sky`   | `#89DCEB` | Background accents, illustrations, decorative elements |

`cyan` is a brand accent, not the light-theme action color. It is too light to
carry white text — `#FFFFFF` on `#3AAED8` is only 2.55:1, well under the 4.5:1
AA threshold. Use `actionPrimary` (below) for anything interactive.

### Action Colors

| Token           | Light     | Dark      | Usage                                  |
| --------------- | --------- | --------- | -------------------------------------- |
| `actionPrimary` | `#137594` | `#3AAED8` | Primary buttons, CTAs, links, active   |
| `textOnPrimary` | `#FFFFFF` | `#1E1E2E` | Label on top of an `actionPrimary` fill |

This is the one token that deliberately changes value between themes. Both
variants clear AA against their own label color — `#137594` scores 5.25:1 with
white, `#3AAED8` scores 6.44:1 with `#1E1E2E` — whereas a single shared value
fails in one theme or the other.

Never label an `actionPrimary` fill `#FFFFFF`. It looks right in light because
`actionPrimary` *is* dark there; in dark it is `cyan`, and white on `cyan` is the
2.55:1 pair the section above exists to warn about.

## Light Theme

| Token           | Hex       | Usage                           |
| --------------- | --------- | ------------------------------- |
| `background`    | `#F8FCFD` | Main app background             |
| `surface`       | `#FFFFFF` | Cards, dialogs, sheets          |
| `primaryText`   | `#1E293B` | Headings and important text     |
| `secondaryText` | `#64748B` | Body text, hints, labels, icons |

## Dark Theme

Catppuccin Mocha. The slot each token takes is in the last column.

| Token           | Hex       | Usage                                 | Mocha      |
| --------------- | --------- | ------------------------------------- | ---------- |
| `background`    | `#181825` | Main app background                   | `mantle`   |
| `surface`       | `#1E1E2E` | Cards, dialogs, sheets                | `base`     |
| `primaryText`   | `#CDD6F4` | Headings and important text           | `text`     |
| `secondaryText` | `#A6ADC8` | Body text, hints, labels, icons       | `subtext0` |

`primaryText` scores 11.1:1 on `surface` and `secondaryText` 7.2:1. `actionPrimary`'s
dark value is unchanged at `#3AAED8` — 6.2:1 on `surface` — and its label flips to
`#1E1E2E`, which is `surface` itself.

## Surface & Text Tokens

Beyond `background` / `surface`, two more surface levels and one more text level are
in use across nearly every screen.

| Token         | Light     | Dark      | Mocha      | Usage                                       |
| ------------- | --------- | --------- | ---------- | ------------------------------------------- |
| `hairline`    | `#DDE6F4` | `#45475A` | `surface1` | Dividers, card borders, separators          |
| `sunken`      | `#F2F6FC` | `#313244` | `surface0` | Inset wells: inputs, empty states, tiles    |
| `placeholder` | `#94A3B8` | `#6C7086` | `overlay0` | Input placeholder and empty-state text only |

`hairline` takes `surface1` rather than `surface0`, which is the slot Catppuccin
nominally gives borders, because the Shop's missing-art well is a `sunken` fill with a
dashed `hairline` border and one shared value would erase it. The three keep the order
light already puts them in: `surface`, then `sunken`, then `hairline`.

`hairline` is decorative and intentionally low-contrast (1.26:1 on light `surface`).
Never use it to carry meaning on its own — pair it with spacing or a label.

`placeholder` sits below AA for body text on purpose (2.56:1 light). It only ever marks
unentered or absent text. Never style real content with it.

## Reward Colors

The reward tokens are theme-invariant — coins and streaks read as the same object in
both themes.

| Token    | Hex       | Label on top | Usage                       |
| -------- | --------- | ------------ | --------------------------- |
| `coin`   | `#F2B937` | `#3A2A00`    | Coin balances, coin icons   |
| `streak` | `#FB7A3C` | —            | Streak flame, streak counts |

Both are far too light for text on the light canvas (`coin` 1.73:1, `streak` 2.56:1).
Use them as icon fills, pills and badge backgrounds — never as light-theme text. On a
`coin` fill, label with `#3A2A00` (7.79:1). `teal` fills take `#0B2545` (10.33:1).

### The amber surface

`coin`'s label pairing holds **only at full opacity**. A faded coin wash is a different
colour, and in dark it composites to an olive that leaves `#3A2A00` at roughly 1.5:1.
Anything that wants a soft amber surface — the achievement chip, the streak-restore
card — uses this pair instead, which is opaque and resolves per theme.

| Token          | Light     | Dark      | Usage                                  |
| -------------- | --------- | --------- | -------------------------------------- |
| `badgeSurface` | `#FDF3DC` | `#3E2F10` | Achievement chip, streak-restore card  |
| `badgeLabel`   | `#3A2A00` | `#F2B937` | The only label for a `badgeSurface` fill |

12.3:1 in light, 6.9:1 in dark. The light hex is exactly what an 18% `coin` wash used
to composite to over white, so the light theme is unchanged.

**Prefer an opaque token to an alpha wash.** A wash composites against whatever happens
to be behind it, and on this app that is usually Liquid Glass — so a wash is never the
flat colour the Figma drew, in either theme.

## Status Colors

| Token    | Light     | Dark      | Usage                           |
| -------- | --------- | --------- | ------------------------------- |
| `error`  | `#E5484D` | `#F06A6E` | Destructive actions, validation |
| `online` | `#12A594` | `#2CC3B0` | Friend presence — online        |
| `away`   | `#EA9A1B` | `#F5B547` | Friend presence — away          |

`error` is the app's only red on app-owned screens — one red, one meaning. The iOS
system red (`#FF383C` light / `#FF4245` dark) is correct only inside genuinely
system-owned surfaces: alerts, action sheets and context menus, where the platform
owns the styling. A destructive button the app draws on its own screen uses `error`,
even when it is built from a UI-kit component.

In the light theme all three fall under AA as text (`error` 3.79:1, `online` 2.97:1,
`away` 2.23:1). There they are presence dots and icon tints only, and any word read
alongside them — "Away", "Delete account" — is set in `primaryText` or `secondaryText`
with the status color carrying just the dot. In the dark theme all three clear AA and
may be used as text.

The status colors stay as they are — they are the one family **not** taken from
Catppuccin. Mocha's reds are pastel pinks, and `error` is the app's single destructive
signal; softening it would cost more meaning than the palette consistency is worth.

`online` and `away` are **presence states, not severity levels**. Ewenn has no warning
token; do not reuse `away` as one.

## Typography

### Primary Typeface

`Fredoka` is the app’s single branded typeface. Use its different weights and sizes to create hierarchy while keeping the interface visually consistent.

`SF Pro` is the system fallback for unsupported characters, font-loading failures, accessibility needs, and system-owned iOS interfaces. It is not treated as a second brand font.

### Font Stack

```
Fredoka, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif
```

### Suggested Type Scale

| Style           | Font    | Size     | Weight   |
| --------------- | ------- | -------- | -------- |
| Display         | Fredoka | 32–36 pt | SemiBold |
| Screen title    | Fredoka | 26–30 pt | SemiBold |
| Section heading | Fredoka | 20–22 pt | Medium   |
| Body            | Fredoka | 16–17 pt | Regular  |
| Button          | Fredoka | 16–17 pt | Medium   |
| Caption         | Fredoka | 13–14 pt | Regular  |

### Typography Guidelines

* Use Fredoka consistently across app-owned screens and components.
* Create hierarchy through size, weight, spacing, and color rather than adding another font family.
* Prefer Regular, Medium, and SemiBold; avoid excessive use of Bold.
* Keep body text at approximately 16–17 pt for comfortable reading.
* Support Dynamic Type and test larger accessibility sizes.
* Allow SF Pro to appear naturally in system alerts, keyboards, permission dialogs, and other iOS-owned interfaces.
* Do not add a third font family.

## Usage Guidelines

* Use `actionPrimary` for the main action on a screen. Never use `cyan`
  directly for a light-theme button, link, or other interactive element.
* Use `blue`, `cyan`, `teal`, and `sky` as supporting accents.
* Keep backgrounds and surfaces neutral so actions remain visually clear.
* Maintain strong contrast between text and its background. Target WCAG AA:
  4.5:1 for body text, 3:1 for large text and meaningful UI boundaries.
* Avoid using more than two accent colors in the same component.
* Keep the same semantic *meaning* in both themes. A token's hex may change
  between themes to preserve contrast — `actionPrimary` does — but its role
  must not.
* **Specify a new token in both columns**, even though the app resolves only the
  light one. This is a present-tense constraint, not a courtesy to a future
  pass: the widget resolves both, so a token added light-only is a token the
  Lock Screen card cannot draw.


## Rive Cosmetic Numbering

What the penguin is wearing is chosen by numbers on the root view model of every
`.riv` that draws a cosmetic: `hat`, `scarf` and `goggle`. **The tables below
are the contract**, and they are the same in every file — `shop-screen.riv`,
`profile-penguin.riv`, `home-screen.riv`, `session-screen.riv`,
`textbar-penguin.riv`, `hi-penguin.riv`, `rewenn-subscription.riv`,
`session-summary.riv`, `streaks-screen.riv` and anything drawn after them.
Verified layer by layer in the live editor for each, not inferred from the Swift
that reads them.

**Not every bundled file carries the whole range, and since the crown became a
style that matters.** `crown-hat` (15) was a paywall motif for as long as Rewenn
granted one hat, so it was authored into `rewenn-subscription.riv` and nowhere
else; it is a Shop style now, which means a file without it draws a bare head on
a penguin the user chose a crown for — silently, which is the failure mode the
guidelines below warn about. The state of the bundled exports:

| File | `crown-hat` (15) | |
| --- | --- | --- |
| `rewenn-subscription.riv` | ✅ | the paywall's own motif, where it started |
| `session-screen.riv` | ✅ | |
| `shop-screen.riv` | ✅ | both penguins — the stall and the try-on |
| `home-screen.riv` | ✅ | |
| `hi-penguin.riv` | ✅ | the Achievements hero and the friend card |
| `session-summary.riv` | ✅ | dressed by the re-export that gave it a view model |
| `streaks-screen.riv` | ✅ | same re-export |
| `profile-penguin.riv` | ❌ | **outstanding** — see below |
| `textbar-penguin.riv` | ❌ | **deliberate** — see below |

**`profile-penguin.riv` is the one gap that matters**, and it is two screens
rather than one: the Profile hero, and `PremiumHatChoiceView`'s live preview,
which is the screen the crown is *chosen on*. Until it is re-exported a
subscriber picks a crown, watches nothing happen to the penguin in front of
them, and then finds their Profile bare-headed.

**`textbar-penguin.riv` is excluded on purpose.** The guided tour's coach is the
one penguin the user does not dress — it appears for a few seconds carrying a
line of copy — so the range it carries is `hat` 1–14 and stops there. Nothing
breaks: an unmapped number selects the layer's entry state, which is `hat-none`.

`hi-penguin.riv` — the Achievements hero and the penguin that waves off the back
of a friend's summary card — carries all three layers on this numbering, so
nothing resolved by `PenguinOutfit` is discarded there the way `scarf` is on the
profile penguin. It was one export behind on hats for a while — `crown-hat`
existed in the editor and not in the bundled file — and is current again.

`session-summary.riv` and `streaks-screen.riv` — the two celebration penguins —
carry all three layers on this numbering, including both §9 hats. **Neither of
them was bound to anything before that re-export**, and the two failed
differently for it: Streak Up's `ViewModel1` had no properties at all, so its
penguin was simply bare; the Summary's had three, saved with a bucket hat *and*
the shades selected, so every Summary in the app drew a hat the user had not
equipped and might not own. A view model nobody binds is not inert — its default
instance is exactly what the artboard draws — which is why
`SummaryRiveController` and `StreakRiveController` both write all three numbers
on appear rather than only when a style is equipped.

**Both came out of the editor misspelling the contract**, and one of them twice:
`streaks-screen.riv` called the eyewear `goggles`, and `session-summary.riv`
called it `goggles` *and* called the hat `hats`. Both were renamed in the editor
and re-exported, which is now the fifth and sixth time this has happened — see
the Eyewear section below, which is where the warning lives.

**The Summary's artboard is the one place a hat does not fit.**
`sessionsum-penguin` is 686×686 and was drawn around a bare penguin, so the
tallest hats are drawn *above* the artboard's own top edge at the apex of the
idle loop's jump: 97 units for the Bobble Beanie set and the crown, 51 for the
Magic Top Hat, 43 for the halo, 13 for the Bucket Hat. The artboard has clipping
off so the runtime draws them, but the *view* cuts whatever lands outside it —
`SessionTuning.summarySceneHeight` is the taller-than-wide box that gives them
somewhere to land. `streaks-screen.riv`'s `penguin` needs none of this: at 721×707
it has room, and its tallest hat stops at y 45.5.

`textbar-penguin.riv` — the guided tour's coach
(`_specs/penguin-guided-tour.md`) — carries almost the whole range: `hat` 1–14,
`scarf` 1–2 and `goggle` 1, each as its own state on `hat-layer`, `scarf-layer`
and `googles-layer`. 15 is the one it stops short of, deliberately. The eyewear property is spelled
**`goggle`**, singular, matching this contract rather than the layer name that
drives it.

This document is the authority; the code mirrors it, exactly as
`DesignSystem/Colors.swift` mirrors the palette above. In Swift the tables live
in one place each — `HatNumber`, `ScarfNumber`, `GoggleNumber` — and
`PenguinOutfit.wearing(_:)` is the only thing that asks all three.
`ewennTests/HatNumberTests` asserts the hat join is dense and unique — 1…15, which
14 reached when the Halo collection landed and 15 reached when Rewenn started
selling a *choice* of two hats rather than granting one;
`ewennTests/PenguinOutfitTests` asserts that no catalog style fills two slots.

### Hats

| `hat` | Rive state | Shop variant id | Collection · style |
| --- | --- | --- | --- |
| 0 | `none` | — | bare head |
| 1 | `winter-hat-blue` | `bobble-beanie-frost-blue` | Bobble Beanie · Frost Blue |
| 2 | `winter-hat-pink` | `bobble-beanie-blossom` | Bobble Beanie · Blossom |
| 3 | `winter-hat-green` | `bobble-beanie-pine` | Bobble Beanie · Pine |
| 4 | `winter-hat-grey` | `bobble-beanie-silver` | Bobble Beanie · Silver |
| 5 | `magic-hat-yellow` | `magic-top-hat-gold` | Magic Top Hat · Gold |
| 6 | `magic-hat-orange` | `magic-top-hat-ember` | Magic Top Hat · Ember |
| 7 | `magic-hat-blue` | `magic-top-hat-sapphire` | Magic Top Hat · Sapphire |
| 8 | `cute-hat-green` | `bucket-hat-sage` | Bucket Hat · Sage |
| 9 | `cute-hat-pink` | `bucket-hat-blush` | Bucket Hat · Blush |
| 10 | `cute-hat-yellow` | `bucket-hat-butter` | Bucket Hat · Butter |
| 11 | `pilot-hat-1` | `aviator-cap-bomber` | Aviator Cap · Bomber |
| 12 | `pilot-hat-2` | `aviator-cap-goggles` | Aviator Cap · Goggles |
| 13 | `pilot-hat-3` | `aviator-cap-ace` | Aviator Cap · Ace |
| 14 | `angel-hat` | `angel-hat` | Halo & Crown · Halo — Rewenn-exclusive (FEATURES.md §9) |
| 15 | `crown-hat` | `crown-hat` | Halo & Crown · Crown — Rewenn-exclusive (FEATURES.md §9) |

### Scarves

`scarf` on `scarf-layer`. The join is read off the artwork, not the names —
Fern is `#8fbda0` and Lagoon is `#55b1c9`, so the green state is Fern's.

| `scarf` | Rive state | Shop variant id | Collection · style |
| --- | --- | --- | --- |
| 0 | `scarf-none` | — | bare neck |
| 1 | `scarf-green` | `knit-scarf-fern` | Knit Scarf · Fern |
| 2 | `scarf-blue` | `knit-scarf-lagoon` | Knit Scarf · Lagoon |

### Eyewear

`goggle` — singular, as the view model property is named — on `googles-layer`.

**The property name is the part that keeps going wrong.** Five freshly authored
files now (`profile-penguin.riv`, `home-screen.riv`, `session-screen.riv`,
`streaks-screen.riv`, `session-summary.riv`) came out of the editor with this
property called `goggles`, plural, matching the *layer* name rather than the
contract — and `session-summary.riv` did the same to the hat column, calling it
`hats`. Each was renamed in the editor and re-exported. Pull `listViewModels` on
a new file and check these strings before wiring it:
`numberProperty(fromPath: "goggle")` against a property named `goggles` fails
silently, and the layer sits on its entry state wearing nothing while the rest of
the scene animates perfectly.

**They can be read without opening the editor, which is the cheap check.** A
`.riv`'s view model names sit in cleartext in the first few hundred bytes, so
`xxd -l 256 file.riv` shows the whole property list next to `ViewModel1` — one
command, and it is what caught both of these.

| `goggle` | Rive state | Shop variant id | Collection · style |
| --- | --- | --- | --- |
| 0 | `none-googles` | — | bare face |
| 1 | `goggles-black` | `og-shades-blackout` | OG Shades · Blackout |

### Guidelines

* **The numbers are the contract, not the state names.** A file may name its
  states whatever it likes; what must not move is which number puts which hat
  on the penguin. Keeping the names above makes a mismatch greppable from
  either side, so prefer them.
* **A file need not carry every hat, but it must not renumber the ones it
  carries.** `profile-penguin.riv` has ten of the fifteen; the four it lacks
  simply have no state, and `HatNumber` still hands it the same numbers.
* **Numbers are only ever appended.** A new cosmetic takes 16, then 17.
  Re-using or re-ordering a number silently changes what every already-built
  file draws, and nothing in the app would report it.
* **A style with no state anywhere resolves to 0, wearing nothing.** Never to a
  neighbouring cosmetic: that would put something on the penguin the user
  neither owns nor chose. Every style in the catalog is drawn today, and
  `PenguinOutfitTests.nothingIsUndrawn` is what will say so when the next one
  is not.
* **0, 14 and 15 are reserved in the hat column.** 0 is "nothing"; 14 and 15 are
  §9's two Rewenn hats, the halo and the crown, which are real Shop styles
  acquired with an entitlement and coins rather than with coins alone.

  **15 was a motif until the choice landed, and the distinction is worth
  remembering rather than keeping sharp.** It existed in one file,
  `rewenn-subscription.riv`, where the paywall drops it onto the penguin's head
  as the last beat of its entrance; it had no shop variant, no
  `HatNumber.number(for:)` case, and no artwork in any other artboard, and
  `HatNumberTests` asserted its *absence* from the catalog so that nothing the
  user could equip resolved to a crown no other penguin knew how to draw. 14 was
  in exactly that position until the Halo collection gave it a variant. 15 took
  the same route: a variant, a case, a line in FEATURES.md §9 — and artwork in
  every file that draws hats, which is the half tracked in the table above.

* **0 must be an *empty* state, and the layer must have somewhere empty to go.**
  Both `shop-screen.riv` penguins keep a bare `none` node inside their hat
  `Solo`, and the `hat == 0` transition selects it. The seated `penguin` had no
  such node: its 0 pointed at `shop-hat`, the shopkeeper's own beanie, so
  equipping a scarf or the shades — which zero `hat` by construction, see the
  one-cosmetic rule below — put a hat the user does not own back on its head.
  The art is still in the file, unreferenced; if the shopkeeper is ever meant to
  wear it again it takes its own number rather than borrowing 0.
* **Only one cosmetic at a time, and Swift is what enforces it.** FEATURES.md
  §5.3 gives the penguin one equipped style app-wide, but the three layers are
  independent and a penguin told `hat = 3, scarf = 1` wears both. The rule lives
  in `PenguinOutfit.wearing(_:)`, which resolves one variant id and zeroes the
  other two slots. Stating it again as cross-layer conditions in the `.riv`
  would repeat the same rule in a file that cannot be tested, to guard against a
  combination Swift never sends. **The corollary matters:** whatever writes
  these numbers must write all three every time — a scarf left at 1 by the
  previous style stays at 1 until something says otherwise.
* **State properties and event properties are different things.** `hat`,
  `scarf`, `goggle` and `penguin-switch` say where the scene *is*, and may be
  written as often as anything asks. `excited`, `buy`, `jump`, `light_on` and
  `light_off` are triggers: each is a thing that happens once. `penguin-switch`
  was authored as a trigger and had to be re-exported as a boolean, because a
  toggle describes a change rather than a pose — three call sites speaking for
  one logical transition cancelled each other out. **Anything the app might say
  twice belongs in the first group.**
