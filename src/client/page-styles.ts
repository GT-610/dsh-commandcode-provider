/**
 * Stylesheet for the Command Code settings page — and the Models-page provider
 * card, which shares its `cc-` classes.
 *
 * Returned as a string, not injected here, so importing this module has no DOM
 * side effect: `./index.ts` installs it once under {@link PAGE_CSS_ID}. It is a
 * module of its own rather than a literal in the entry so `tests/styles.test.ts`
 * can audit every rule without importing the React tree (which pulls
 * `*.module.css` through the primitives package and needs a loader registered
 * first). The rules are GLOBAL CSS, so containment is a contract (issue #48):
 * every selector is qualified by one of our own `cc-` classes. Colours are
 * harness theme aliases with neutral fallbacks, and the `cc-` prefix keeps
 * these clear of the panel's `ccp-` set.
 *
 * @module dsh-commandcode-provider/client/page-styles
 */

/**
 * Stylesheet id — the `data-plugin-css` value that makes injection idempotent.
 *
 * The prefix must match this package's real name and the panel stylesheet's
 * (`PANEL_CSS_ID`); the two ids must also stay DISTINCT, since they key two
 * separate style tags and a shared id would make the second injection a no-op.
 */
export const PAGE_CSS_ID = '@mars-sea/dsh-commandcode-provider/CommandCodeSettingsPage.module.css'

/**
 * The settings-page stylesheet.
 *
 * Every size is the design canvas's (the cc-kit.css of the "CommandCode 设置页
 * 重设计" artboards, 2026-10-21), with its colour tokens mapped onto the
 * harness theme aliases so dark mode keeps working: a row is 12px of vertical
 * padding with no line between rows, title 14/22, description 12/18, a 24px
 * gap to the control; a group is 16px of padding under a 1px border-l2 rule,
 * its heading 36px high; the page title is 18/26 and group titles 14/22, both
 * 600. The page renders with grayscale antialiasing and descriptive text in
 * label-secondary.
 *
 * Shapes follow one rule — clickable things are pills, fillable things are
 * 8px. Buttons are drawn here (PageButton → cc-btn: md 32px, sm 28px, lg 36px
 * for the save bar), not taken from the harness primitive. Inputs and the
 * model selector are 32px with a 1px border-l3 stroke on the raised surface; a
 * number field draws its unit inside the box (cc-unitBox). Account cards and
 * the per-model override table are 1px border-l2 cards with 12px corners;
 * panels and notices are 12px-radius fills; badges are 20px pills. Errors use
 * state-error-primary; tinted surfaces fall back to a color-mix of the state
 * colour where the theme has no tertiary token. The Models-page provider card
 * shares cc-hint / cc-badgeMuted / cc-input and keeps their colours.
 */
export const PAGE_CSS = `
.cc-section{max-width:720px;color:var(--dsw-alias-label-primary);flex-direction:column;display:flex;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
.cc-title{margin:0;color:var(--dsw-alias-label-primary);font-size:18px;font-weight:600;line-height:26px}
.cc-intro{margin:4px 0 0;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}
.cc-spacer{flex:1}
.cc-group{flex-direction:column;display:flex;padding:16px 0}
.cc-group:not(.cc-groupDivided){padding-top:24px}
.cc-groupDivided{border-top:1px solid var(--dsw-alias-border-l2)}
.cc-groupHead{align-items:center;gap:8px;display:flex;min-height:36px}
.cc-groupTitle{margin:0;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600;line-height:22px}
.cc-groupDesc{margin:2px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.cc-rows>.cc-groupDesc{margin:0}
.cc-groupHeading{flex:1;min-width:0;margin:0;font:inherit;display:flex}
/* The whole heading row is the fold toggle: chevron, title, summary badges. */
.cc-disclosure{box-sizing:border-box;flex-wrap:wrap;flex:1;align-items:center;gap:6px 8px;min-width:0;min-height:36px;padding:0;border:0;background:0 0;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:8px;display:flex}
.cc-foldChevron{color:var(--dsw-alias-label-tertiary);transition:transform .15s ease}
.cc-foldChevronClosed{transform:rotate(-90deg)}
.cc-groupBody{flex-direction:column;display:flex;padding-top:4px}
.cc-groupBody[hidden]{display:none}
.cc-disclosure:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.cc-rows{flex-direction:column;display:flex}
.cc-row{flex-wrap:wrap;align-items:center;gap:8px 24px;display:flex;padding:12px 0}
.cc-rowFlush{padding:0}
/* The text column starts at 200px (not 300px) so the widest controls — the
 * 280px API base input, the allowlist's button + 200px selector — still sit
 * beside their label in a ~560px settings panel; the description wraps more
 * lines instead of the control dropping to a second line. */
.cc-rowText{flex-direction:column;flex:1 1 200px;gap:2px;min-width:0;display:flex}
.cc-rowTitleLine{align-items:center;gap:8px;display:flex;min-width:0}
.cc-rowTitle{min-width:0;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}
.cc-rowDesc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.cc-rowDesc p{margin:0}
.cc-rowDesc p+p{margin-top:4px}
.cc-rowError{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.cc-rowControl{flex:none;align-items:center;gap:8px;display:inline-flex;margin-left:auto}
.cc-rowInput{width:200px}
.cc-rowInputWide{width:280px}
/* The row-level field, drawn to the design canvas: 32px, 8px corners, a 1px
 * border-l3 stroke on the raised surface. A number field draws its unit inside
 * the same box (cc-unitBox), right of the value. */
.cc-fieldInput{box-sizing:border-box;flex:none;height:32px;min-width:0;padding:0 10px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font:inherit;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.cc-fieldInput::placeholder{color:var(--dsw-alias-label-dimmed)}
.cc-fieldInput:hover:not(:disabled){border-color:var(--dsw-alias-label-tertiary)}
.cc-fieldInput:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.cc-fieldInput:disabled{opacity:.5;cursor:default}
.cc-fieldInputInvalid,.cc-fieldInputInvalid:hover{border-color:var(--dsw-alias-state-error-primary)}
.cc-unitBox{box-sizing:border-box;flex:none;align-items:center;display:inline-flex;width:160px;height:32px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.cc-unitBox:hover{border-color:var(--dsw-alias-label-tertiary)}
.cc-unitBox:focus-within{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.cc-unitBoxInvalid,.cc-unitBoxInvalid:hover{border-color:var(--dsw-alias-state-error-primary)}
.cc-unitBox:has(>.cc-fieldInput:disabled){opacity:.5}
.cc-unitBox>.cc-fieldInput{flex:1;width:auto;height:30px;border:0;border-radius:0;background:0 0;outline:none;text-align:right;font-variant-numeric:tabular-nums}
.cc-unit{flex:none;padding:0 10px 0 2px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;white-space:nowrap}
/* A customized field's marker on its title line: the badge, then a 20px
 * round reset button. Reset lives here rather than after the control, so no
 * row reserves a reset column and the page keeps one right edge. */
.cc-overrideTag{align-items:center;gap:4px;display:inline-flex}
.cc-resetInline{flex:none;align-items:center;justify-content:center;display:inline-flex;width:20px;height:20px;padding:0;border:0;border-radius:999px;corner-shape:round;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.cc-resetInline:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.cc-resetInline:disabled{cursor:default;opacity:.4}
.cc-resetInline:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.cc-icon{flex:none;width:16px;height:16px}
/* The page's buttons (PageButton), drawn to the design canvas: one capsule
 * shape, md 32px / 14px text / 14px icon, sm 28px / 12px text, lg 36px for
 * the save bar; primary is the brand fill, secondary the quiet grey fill,
 * ghost label-secondary text, danger the error fill. */
.cc-btn{box-sizing:border-box;flex:none;align-items:center;justify-content:center;gap:6px;display:inline-flex;height:32px;padding:0 14px;border:0;border-radius:999px;corner-shape:round;font:inherit;font-size:14px;line-height:22px;white-space:nowrap;cursor:pointer;text-decoration:none}
.cc-btnSm{height:28px;padding:0 10px;gap:4px;font-size:12px;line-height:18px}
.cc-btnLg{height:36px;padding:0 16px}
.cc-btn .cc-btnIcon{width:14px;height:14px}
.cc-btnPrimary{background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary));color:var(--dsw-alias-label-primary-foreground,#fff)}
.cc-btnPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary)))}
.cc-btnSecondary{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary)}
.cc-btnSecondary:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.cc-btnGhost{background:0 0;color:var(--dsw-alias-label-secondary)}
.cc-btnGhost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.cc-btnDanger{background:var(--dsw-alias-state-error-primary);color:#fff}
.cc-btnDanger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 88%,#000)}
.cc-btn:disabled{cursor:default;opacity:.4}
.cc-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.cc-groupSummary{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:400;line-height:18px;white-space:nowrap}
.cc-badges{align-items:center;gap:8px;display:inline-flex}
.cc-badge,.cc-badgeMuted{box-sizing:border-box;flex:none;align-items:center;gap:4px;display:inline-flex;height:20px;white-space:nowrap;border-radius:999px;corner-shape:round;padding:0 8px;font-size:12px;font-weight:500;line-height:18px}
.cc-badge{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}
.cc-badgeMuted{border:.5px solid var(--dsw-alias-border-l4);color:var(--dsw-alias-label-tertiary)}
.cc-badgeOutline{background:0 0;box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l3);color:var(--dsw-alias-label-tertiary)}
.cc-badgeOk{background:var(--dsw-alias-state-success-tertiary,color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 10%,transparent));color:var(--dsw-alias-state-success-primary,#15803d)}
.cc-badgeError{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}
.cc-badgeWarn{background:var(--dsw-alias-state-warn-tertiary,var(--dsw-alias-bg-module-platform));color:var(--dsw-alias-state-warn-label,var(--dsw-alias-label-secondary))}
.cc-field{flex-direction:column;gap:6px;padding:12px 0;display:flex}
.cc-field+.cc-field{border-top:.5px solid var(--dsw-alias-border-l2)}
.cc-fieldHead{align-items:center;gap:8px;display:flex}
.cc-label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}
.cc-reset{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px;line-height:18px}
.cc-reset:hover:not(:disabled){color:var(--dsw-alias-label-primary)}
.cc-reset:disabled{cursor:default;opacity:.4}
.cc-input{box-sizing:border-box;height:32px;min-width:0;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font:inherit;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.cc-input::placeholder{color:var(--dsw-alias-label-dimmed)}
.cc-input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}
.cc-input:disabled{opacity:.6;cursor:default}
.cc-inputInvalid{border-color:var(--dsw-alias-state-error-primary)}
.cc-hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}
.cc-modelSelectAnchor{flex-direction:column;align-items:stretch;gap:6px;display:inline-flex;width:200px}
.cc-selector{box-sizing:border-box;justify-content:space-between;align-items:center;gap:8px;display:inline-flex;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;text-align:left;cursor:pointer}
.cc-selector:hover:not(:disabled){border-color:var(--dsw-alias-label-tertiary)}
.cc-selector:disabled{cursor:default;opacity:.4}
.cc-selector:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.cc-selectorText{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc-selectorChevron{color:var(--dsw-alias-label-tertiary)}
/* The search box sits inside the Menu anchor, so typing in it never trips
 * the Menu's outside-click close. */
.cc-modelSearch{width:100%}
.cc-modelSearch::-webkit-search-cancel-button{cursor:pointer}
.cc-checkRow{align-items:center;gap:8px;display:inline-flex;min-width:0}
.cc-checkRow:hover{cursor:pointer}
/* A hand-drawn box, not the platform's accent-color checkbox: the native
 * control's colours come from color-scheme, which the theme sets once at BOOT
 * and never re-applies in-session, so a native box can paint light-chrome white
 * on a dark page. The mark rides a brand-primary fill, so it takes the brand
 * foreground (the only pairing that survives dark mode's near-white brand), and
 * the outline is a border-l3 hairline because border-l2 leaves an unchecked box
 * invisible against the menu surface. */
.cc-check{box-sizing:border-box;appearance:none;flex-shrink:0;width:16px;height:16px;margin:0;border:1px solid var(--dsw-alias-border-l3);border-radius:4px;background:0 0;position:relative}
.cc-check:checked{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.cc-check:checked::after{content:'';position:absolute;top:3px;left:5px;width:3px;height:7px;border:solid var(--dsw-alias-label-primary-foreground,#fff);border-width:0 1.5px 1.5px 0;transform:rotate(45deg)}
.cc-checkName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Modelled on the platform's own Switch primitive (ui-primitives
 * Switch.module.css): a 36x20 capsule padding its track by 2px and sliding a
 * 16px thumb across the 32px content box. Three things are load-bearing.
 * (1) corner-shape:round on BOTH track and thumb — the theme sets a global
 * superellipse corner shape, which squares a capsule's ends off around a round
 * thumb. (2) No literal colours: brand-primary INVERTS between the modes, so a
 * hardcoded white thumb vanishes on the checked track in dark mode; the brand
 * foreground is what the platform paints on that fill. (3) border-l3 as the
 * off track — border-l2 leaves it indistinguishable from the page. */
.cc-toggle{box-sizing:border-box;appearance:none;flex-shrink:0;width:36px;height:20px;margin:0;padding:2px;border:0;border-radius:10px;corner-shape:round;background:var(--dsw-alias-border-l3);cursor:pointer;position:relative}
.cc-toggle:checked{background:var(--dsw-alias-brand-primary)}
.cc-toggle::after{content:'';display:block;width:16px;height:16px;border-radius:50%;corner-shape:round;background:var(--dsw-alias-label-primary-foreground);transition:transform .12s ease}
.cc-toggle:checked::after{transform:translateX(16px)}
.cc-toggle:not(:checked)::after{background:var(--dsw-alias-switch-thumb,var(--dsw-alias-label-primary-foreground))}
.cc-toggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.cc-toggle:disabled{cursor:default;opacity:.5}
.cc-accountMode{align-items:center;gap:8px;display:flex;margin:12px 0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.cc-accountList{flex-direction:column;gap:8px;display:flex}
.cc-accountList+.cc-panel{margin-top:8px}
/* One row under the list: Add account (outline) leads, the analytics exit
 * (ghost) trails; the exit's long label clamps instead of wrapping the row. */
.cc-accountActions{flex-wrap:wrap;align-items:center;gap:8px;display:flex;margin-top:12px}
.cc-analyticsEntry{max-width:100%;min-width:0}
.cc-analyticsEntryText{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc-chevronOpen{transform:rotate(180deg)}
.cc-accountItem{flex-direction:column;display:flex;border:1px solid var(--dsw-alias-border-l2);border-radius:12px}
.cc-accountItem>.cc-notice,.cc-accountItem>.cc-panel{margin:0 16px 14px}
.cc-accountItemActive{border-color:var(--dsw-alias-border-l3)}
.cc-accountHead{align-items:center;gap:4px;display:flex;padding:8px 8px 8px 0}
.cc-accountToggle{flex-wrap:wrap;align-items:center;gap:6px 8px;display:flex;flex:1;min-width:0;min-height:44px;padding:0 0 0 16px;background:0 0;border:0;border-radius:12px;color:inherit;cursor:pointer;font:inherit;text-align:left}
.cc-accountToggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:4px}
.cc-accountName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px}
.cc-iconButton{flex-shrink:0;align-items:center;justify-content:center;display:inline-flex;width:28px;height:28px;padding:0;background:0 0;border:0;border-radius:8px;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.cc-iconButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.cc-iconButton:disabled{cursor:default;opacity:.4}
.cc-iconButton:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
/* Per-model context-length overrides (issue #86) as the design's small table:
 * a card holding a head row over a model / value / remove grid, a line
 * between rows; a row's error wraps onto its own line across the grid. */
.cc-contextTable{flex-direction:column;display:flex;margin:0 0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px}
.cc-contextItem{grid-template-columns:minmax(0,1fr) 144px 28px;align-items:center;gap:8px;display:grid;padding:8px 8px 8px 12px}
.cc-contextItem+.cc-contextItem{border-top:1px solid var(--dsw-alias-border-l2)}
.cc-contextHead{grid-template-columns:minmax(0,1fr) 144px 28px;align-items:center;gap:8px;display:grid;height:32px;padding:0 8px 0 12px;border-bottom:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.cc-contextSelect{position:relative;display:block;min-width:0}
/* appearance:none swaps the platform arrow for the page's own chevron icon. */
.cc-contextModel{box-sizing:border-box;appearance:none;-webkit-appearance:none;width:100%;padding-inline-end:30px;text-overflow:ellipsis;cursor:pointer}
.cc-contextCaret{position:absolute;inset-inline-end:10px;top:50%;color:var(--dsw-alias-label-tertiary);transform:translateY(-50%);pointer-events:none}
.cc-contextSelect:has(.cc-contextModel:disabled) .cc-contextCaret{opacity:.6}
.cc-contextItem>.cc-unitBox{width:100%}
.cc-contextError{grid-column:1/-1}
.cc-tabDot{flex-shrink:0;width:8px;height:8px;border-radius:50%;corner-shape:round}
.cc-tabDotOk{background:var(--dsw-alias-state-success-primary)}
.cc-tabDotBlank{background:0 0;border:0}
.cc-tabDotWarn{background:var(--dsw-alias-state-warn-primary,#d97706)}
.cc-tabDotError{background:var(--dsw-alias-state-error-primary)}
.cc-accountMeters{flex-wrap:wrap;gap:6px 24px;display:flex;padding:0 16px 14px 32px}
.cc-miniMeter{align-items:center;gap:8px;display:inline-flex;font-size:12px;line-height:18px}
.cc-miniMeterLabel{color:var(--dsw-alias-label-secondary)}
.cc-miniMeterTrack{overflow:hidden;background:var(--dsw-alias-bg-module-platform);border-radius:999px;width:64px;height:4px}
.cc-miniMeterFill{display:block;background:var(--dsw-alias-brand-primary);border-radius:999px;height:100%}
.cc-miniMeterValue{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.cc-accountDetails{container-type:inline-size;border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:16px;display:flex;padding:16px}
.cc-inlineForm{flex-direction:column;gap:8px;display:flex}
.cc-inlineActions{align-items:center;gap:8px;display:flex}
.cc-panel{flex-direction:column;gap:12px;display:flex;padding:16px;border-radius:12px;background:var(--dsw-alias-bg-module-platform)}
.cc-panelInput{width:100%}
.cc-keyField{align-items:center;gap:8px;display:flex}
.cc-panelActions{flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px;display:flex}
/* The add-account method switch, drawn as the design's segmented control: a
 * pill track on the raised surface, the chosen segment in the brand fill. */
.cc-seg{align-self:flex-start;display:inline-flex;padding:2px;border-radius:999px;corner-shape:round;background:var(--dsw-alias-bg-layer-1);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2)}
.cc-segItem{height:28px;padding:0 12px;border:0;border-radius:999px;corner-shape:round;background:0 0;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer}
.cc-segItem:hover:not(:disabled):not(.cc-segOn){color:var(--dsw-alias-label-primary)}
.cc-segItem:disabled{cursor:default;opacity:.4}
.cc-segItem:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.cc-segOn{background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary));color:var(--dsw-alias-label-primary-foreground,#fff)}
.cc-panelTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600;line-height:22px}
.cc-accountReport{flex-direction:column;gap:16px;display:flex}
.cc-usageHead{align-items:center;gap:8px;display:flex}
.cc-usageTitle{color:var(--dsw-alias-label-primary);flex:1;margin:0;font-size:14px;font-weight:500;line-height:22px}
.cc-usageAccount{max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.cc-usagePlanStatus{flex:none;margin:0;white-space:nowrap;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.cc-usageHint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}
/* Two fixed grids, not one auto-fit track: auto-fit wrapped the four activity
 * tiles 3 + 1 at the details' width. The activity row folds to 2 × 2 in a
 * narrow details panel. */
.cc-usageStats{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;display:grid}
.cc-usageStatsActivity{grid-template-columns:repeat(4,minmax(0,1fr))}
@container (max-width:460px){.cc-usageStatsActivity{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cc-balance{flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:4px 16px;display:flex}
.cc-balanceMain{flex-direction:column;gap:2px;display:flex}
.cc-balanceLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.cc-balanceValue{color:var(--dsw-alias-label-primary);font-size:20px;font-weight:600;line-height:28px;font-variant-numeric:tabular-nums}
.cc-balanceSub{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.cc-balanceEmpty .cc-balanceValue{color:var(--dsw-alias-state-error-primary)}
.cc-balanceNote{flex-basis:100%;margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.cc-usageStat{min-width:0;flex-direction:column;gap:2px;display:flex;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-bg-module-platform)}
.cc-usageStatLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.cc-usageStatValue{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:500;line-height:24px;font-variant-numeric:tabular-nums}
.cc-usageStatSub{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc-usageWindows{flex-direction:column;gap:14px;display:flex}
.cc-usageWindow{flex-direction:column;gap:6px;display:flex}
.cc-usageWindowHead{align-items:baseline;gap:8px;display:flex}
.cc-usageWindowLabel{color:var(--dsw-alias-label-secondary);flex:1;font-size:12px;line-height:18px}
.cc-usageWindowValue{color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.cc-usageExceeded{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.cc-usageBar{overflow:hidden;background:var(--dsw-alias-bg-module-platform);border-radius:999px;height:4px}
.cc-usageBarFill{background:var(--dsw-alias-brand-primary);border-radius:999px;height:100%;transition:width .3s ease}
.cc-usageBarFillWarn{background:var(--dsw-alias-state-error-primary)}
.cc-usageWindowReset{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}
.cc-usageMeta{align-items:center;gap:8px;display:flex}
.cc-usageMetaSpacer{flex:1}
.cc-usageUpdated{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}
.cc-usagePartial{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:18px}
.cc-notices{flex-direction:column;gap:8px;display:flex;margin-bottom:12px}
.cc-section>.cc-notice{margin-top:12px}
/* One block for every result, warning and blocked state: neutral (read-only,
 * in progress), warn (partly done, needs a retry) and error (failed). The
 * icon and title take the tone; the body stays label-secondary for contrast. */
.cc-notice{box-sizing:border-box;align-items:flex-start;gap:10px;display:flex;padding:10px 12px;border-radius:12px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.cc-noticeIcon{flex:none;width:16px;height:16px;margin-top:1px;color:var(--dsw-alias-label-tertiary)}
.cc-noticeBody{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex;word-break:break-word}
.cc-noticeBody>p{margin:0}
.cc-noticeTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px}
.cc-noticeActions{flex-wrap:wrap;align-items:center;gap:8px;display:flex;margin-top:8px}
.cc-noticeDetail{color:var(--dsw-alias-label-tertiary)}
.cc-noticeSuccess{background:var(--dsw-alias-state-success-tertiary,color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 10%,transparent))}
.cc-noticeSuccess>.cc-noticeIcon{color:var(--dsw-alias-state-success-primary,#16a34a)}
.cc-noticeWarn{background:var(--dsw-alias-state-warn-tertiary,color-mix(in srgb,var(--dsw-alias-state-warn-primary,#d97706) 12%,transparent))}
.cc-noticeWarn>.cc-noticeIcon,.cc-noticeWarn .cc-noticeTitle{color:var(--dsw-alias-state-warn-label,var(--dsw-alias-state-warn-primary,#b45309))}
.cc-noticeError{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
.cc-noticeError>.cc-noticeIcon,.cc-noticeError .cc-noticeTitle{color:var(--dsw-alias-state-error-primary)}
.cc-version{margin:32px 0 0;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.cc-versionLink{color:var(--dsw-alias-state-warn-label,var(--dsw-alias-label-secondary));text-decoration:none}
.cc-versionLink:hover{color:var(--dsw-alias-label-primary);text-decoration:underline;text-underline-position:under}
.cc-providerCard{flex-direction:column;display:flex}
.cc-footer{justify-content:flex-end;align-items:center;gap:8px;display:flex}
.cc-failed{display:inline-block;max-width:260px;min-width:0;color:var(--dsw-alias-state-error-primary);margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px}
.cc-loginLink{align-items:center;gap:4px;display:inline-flex;color:var(--dsw-alias-link,var(--dsw-alias-brand-primary));text-decoration:none;font-size:12px;line-height:18px}
.cc-loginLink>.cc-iconInline{width:12px;height:12px}
.cc-loginLink:hover{text-decoration:underline;text-underline-position:under}
/* The status row's dot + verdict sit beside the row title; the primitive's own
 * state tokens colour the dot, so only the neutral label and the failure note
 * need styling here. */
.cc-statusBadge{align-items:center;gap:6px;display:inline-flex;white-space:nowrap}
.cc-statusLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.cc-statusNotice{color:var(--dsw-alias-state-warn-label,var(--dsw-alias-label-tertiary));margin:0;font-size:12px;line-height:18px}
/* One muted line in the status description: the local-connectivity probe and
 * the publication-lag note both use it, so the dot and the text stay aligned. */
/* The service-status row's two sources: a key column (Official / This device)
 * beside a value line that wraps under itself, never under the key. */
.cc-statusLines{grid-template-columns:auto minmax(0,1fr);align-items:baseline;gap:4px 12px;display:grid;margin:2px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.cc-statusKey{color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.cc-statusValue{flex-wrap:wrap;align-items:center;gap:2px 8px;min-width:0;display:flex}
.cc-statusVerdict{color:var(--dsw-alias-label-primary)}
.cc-statusMeta{flex:1 1 200px;min-width:0}
/* One aggregate (uptime, response, age) never breaks inside itself; a line
 * that runs out of room moves the whole next segment down. */
.cc-statusPart{white-space:nowrap}
/* On the title line, flush with the page's single right edge. */
.cc-statusTitleLink{align-items:center;gap:4px;display:inline-flex;margin-left:auto}
.cc-statusBad{color:var(--dsw-alias-state-warn-label,var(--dsw-alias-state-warn-primary,#b45309))}
.cc-statusLink{color:var(--dsw-alias-link,var(--dsw-alias-brand-primary));text-decoration:none;font-size:12px;line-height:18px;white-space:nowrap}
.cc-statusLink:hover{text-decoration:underline;text-underline-position:under}
.cc-loginDone{color:var(--dsw-alias-state-success-primary,var(--dsw-alias-label-secondary))}
.cc-loginError{color:var(--dsw-alias-state-error-primary)}
/* The floating save bar: a centered bar pinned to the bottom of the
 * settings scrollport. The dock is a zero-height sticky strip at the end of the
 * page, so the bar overlays the scrolling content instead of taking a row of
 * its own; while shown, the section reserves room at its end so the last line
 * can scroll clear. Hidden, it sinks and fades, and visibility (switched after
 * the transition) takes its buttons out of the tab order. Its surface is an
 * elevated layer (bg-layer-1 over the settings panel's layer-2) with the
 * platform's prominent elevation and no stroke, and its corners are concentric
 * with the capsule buttons inside it (36px pills inset by 4px in a 44px pill)
 * so the gap around each button is even. */
.cc-sectionWithBar{padding-bottom:80px}
.cc-saveBarDock{position:sticky;bottom:0;z-index:2;height:0;pointer-events:none}
.cc-saveBar{--cc-saveBar-tone:var(--dsw-alias-state-warn-primary,#d97706);position:absolute;left:50%;bottom:20px;box-sizing:border-box;width:max-content;max-width:calc(100% - 24px);align-items:center;gap:10px;display:flex;height:44px;padding:4px 4px 4px 16px;border:0;border-radius:22px;corner-shape:round;background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-elevation-prominent,0 12px 32px -8px rgba(0,0,0,.24),0 2px 8px rgba(0,0,0,.08));opacity:0;visibility:hidden;transform:translate(-50%,12px);transition:opacity .16s ease,transform .16s ease,visibility 0s linear .16s}
.cc-saveBarShown{opacity:1;visibility:visible;transform:translate(-50%,0);pointer-events:auto;transition:opacity .2s ease,transform .24s cubic-bezier(.2,.9,.3,1.1),visibility 0s}
.cc-saveBar-error{--cc-saveBar-tone:var(--dsw-alias-state-error-primary)}
.cc-saveBar-success{--cc-saveBar-tone:var(--dsw-alias-state-success-primary,#16a34a);padding-right:18px}
.cc-saveBarIcon{flex-shrink:0;align-items:center;justify-content:center;display:inline-flex;width:16px;height:16px;color:var(--cc-saveBar-tone)}
.cc-saveBarPulse{width:8px;height:8px;border-radius:50%;corner-shape:round;background:var(--cc-saveBar-tone)}
.cc-saveBarText{min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.cc-saveBar-error .cc-saveBarText{color:var(--dsw-alias-state-error-primary)}
.cc-saveBarActions{flex-shrink:0;align-items:center;gap:4px;display:flex;margin-left:8px}
@media (prefers-reduced-motion:reduce){.cc-foldChevron,.cc-toggle::after,.cc-usageBarFill,.cc-saveBar,.cc-saveBarShown{transition:none}}
`
