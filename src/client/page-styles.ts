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
 * Row metrics are the harness General page's own, read from its rendered
 * styles (2026-10-21) so the page sits beside it without looking foreign: a
 * row is 16px of vertical padding with a 0.5px border-l2 line under it, its
 * text column keeps 48px clear of the control, the title is 14/22
 * label-primary and the description 12/18 label-tertiary. A 0.5px border-l2
 * rule also separates the groups (`cc-groupDivided`). The page title is 18/26
 * and group titles 14/22, both 600.
 *
 * One control family: buttons are the harness `Button` primitive (28px / 8px
 * corners, 36px / 12px corners); the row-level selector and inputs take the
 * harness selector's shape — 36px, 12px corners, a bg-module-platform fill, no
 * stroke — with a number's unit beside the box; inputs inside a filled panel
 * keep the outlined `cc-input` so they stay visible on the fill; icon buttons
 * are 28px with an 8px radius. Results and warnings are `cc-notice` blocks (a
 * 12px-radius tinted surface with a line icon) rather than loose red
 * paragraphs. Errors use state-error-primary; tinted surfaces fall back to a
 * color-mix of the state colour where the theme has no tertiary token.
 */
export const PAGE_CSS = `
.cc-section{max-width:720px;color:var(--dsw-alias-label-primary);flex-direction:column;display:flex}
.cc-title{margin:0;color:var(--dsw-alias-label-primary);font-size:18px;font-weight:600;line-height:26px}
.cc-intro{margin:4px 0 0;color:var(--dsw-alias-label-tertiary);font-size:14px;line-height:22px}
.cc-spacer{flex:1}
.cc-group{flex-direction:column;display:flex;margin-top:28px}
.cc-pageHead{align-items:center;gap:8px;display:flex}
.cc-groupDivided{margin-top:16px;padding-top:16px;border-top:.5px solid var(--dsw-alias-border-l2)}
.cc-groupHead{align-items:center;gap:8px;display:flex;min-height:28px;padding-bottom:4px}
.cc-groupTitle{margin:0;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600;line-height:22px}
.cc-groupDesc{margin:0 0 12px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.cc-rows>.cc-groupDesc{margin:0 0 8px;padding:0}
.cc-groupHeading{flex:1;min-width:0;margin:0;font:inherit;display:flex}
/* The whole heading row is the fold toggle: chevron, title, summary badges. */
.cc-disclosure{box-sizing:border-box;flex-wrap:wrap;flex:1;align-items:center;gap:4px 8px;min-width:0;min-height:28px;padding:0;border:0;background:0 0;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:6px;display:flex}
.cc-foldChevron{color:var(--dsw-alias-label-tertiary);transition:transform .15s ease}
.cc-foldChevronClosed{transform:rotate(-90deg)}
.cc-groupBody{flex-direction:column;display:flex;padding-top:4px}
.cc-groupBody[hidden]{display:none}
.cc-disclosure:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.cc-rows{flex-direction:column;display:flex}
.cc-row{align-items:center;gap:8px;display:flex;padding:16px 0}
/* The harness's own row rule: a 0.5px border-l2 line under every row of a
 * list (read from the General page's row style), except the last one, whose
 * edge is the next group's divider. */
.cc-rows>.cc-row:not(:last-child){border-bottom:.5px solid var(--dsw-alias-border-l2)}
.cc-rowFlush{padding:0}
.cc-rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}
.cc-rowTitleLine{align-items:center;gap:8px;display:flex;min-width:0}
.cc-rowTitle{min-width:0;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}
.cc-rowDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.cc-rowDesc p{margin:0}
.cc-rowDesc p+p{margin-top:4px}
.cc-rowError{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.cc-rowControl{flex:none;align-items:center;justify-content:flex-end;gap:8px;display:inline-flex;max-width:60%}
.cc-rowInput{width:200px}
.cc-rowInputWide{width:240px}
/* The row-level field: the harness selector's own shape (36px, 12px corners,
 * a bg-module-platform fill, no stroke). Text and number inputs on the rows
 * use it so a row's controls share one surface; inputs nested in a filled
 * panel keep cc-input, which stays visible on that fill. A number field
 * carries its unit beside the box, as the General page's font-size field does. */
.cc-fieldInput{box-sizing:border-box;flex:none;height:36px;min-width:0;padding:0 12px;border:0;border-radius:12px;background:var(--dsw-alias-bg-module-platform);font:inherit;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.cc-fieldInput::placeholder{color:var(--dsw-alias-label-tertiary)}
.cc-fieldInput:hover:not(:disabled):not(:focus-visible){background:var(--dsw-alias-interactive-bg-hover)}
.cc-fieldInput:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
.cc-fieldInput:disabled{opacity:.5;cursor:default}
.cc-fieldInputInvalid,.cc-fieldInputInvalid:focus-visible{box-shadow:inset 0 0 0 1px var(--dsw-alias-state-error-primary)}
.cc-fieldNumber{width:120px;text-align:center;font-variant-numeric:tabular-nums}
.cc-unitField{flex:none;align-items:center;gap:8px;display:inline-flex}
/* A fixed unit column (wide enough for "tokens") keeps the number boxes of
 * one group on a single left edge whatever their unit. */
.cc-unit{min-width:48px;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px;white-space:nowrap}
/* Holds the reset button's column on rows that have nothing to reset, so the
 * staged controls of one group line up on a single right edge. */
.cc-resetSlot{flex:none;width:28px;height:28px}
.cc-icon{flex:none;width:16px;height:16px}
.cc-groupSummary{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px;white-space:nowrap}
.cc-badges{align-items:center;gap:8px;display:inline-flex}
.cc-badge,.cc-badgeMuted{flex:none;align-items:center;display:inline-flex;white-space:nowrap;border-radius:999px;corner-shape:round;padding:1px 8px;font-size:12px;font-weight:500;line-height:17px}
.cc-badge{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}
.cc-badgeMuted{border:.5px solid var(--dsw-alias-border-l4);color:var(--dsw-alias-label-tertiary)}
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
.cc-modelSelectAnchor{flex-direction:column;align-items:stretch;gap:6px;display:inline-flex;min-width:160px}
.cc-selector{box-sizing:border-box;align-items:center;gap:12px;display:inline-flex;height:36px;padding:0 14px;border:0;border-radius:12px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;text-align:left;cursor:pointer}
.cc-selector:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.cc-selector:disabled{cursor:default;opacity:.4}
.cc-selector:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
.cc-selectorText{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc-selectorCaret{flex-shrink:0;border-right:1.5px solid var(--dsw-alias-label-tertiary);border-bottom:1.5px solid var(--dsw-alias-label-tertiary);width:6px;height:6px;margin-bottom:3px;transform:rotate(45deg)}
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
.cc-accountMode{align-items:center;gap:4px;display:flex;margin:-4px 0 12px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.cc-accountList{flex-direction:column;gap:8px;display:flex}
.cc-accountList+.cc-panel{margin-top:8px}
/* One row under the list: Add account (outline) leads, the analytics exit
 * (ghost) trails; the exit's long label clamps instead of wrapping the row. */
.cc-accountActions{flex-wrap:wrap;align-items:center;gap:8px;display:flex;margin-top:12px}
.cc-analyticsEntry{max-width:100%;min-width:0}
.cc-analyticsEntryText{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc-chevronOpen{transform:rotate(180deg)}
.cc-accountItem{flex-direction:column;gap:10px;display:flex;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l4);border-radius:12px}
.cc-accountItemActive{border-color:var(--dsw-static-neutral-bluish-400,var(--dsw-alias-border-l3))}
.cc-accountHead{align-items:center;gap:4px;display:flex;min-height:28px}
.cc-accountToggle{align-items:center;gap:8px;display:flex;flex:1;min-width:0;padding:0;background:0 0;border:0;color:inherit;cursor:pointer;font:inherit;text-align:left}
.cc-accountToggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:4px}
.cc-accountName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px}
.cc-iconButton{flex-shrink:0;align-items:center;justify-content:center;display:inline-flex;width:28px;height:28px;padding:0;background:0 0;border:0;border-radius:8px;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.cc-iconButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.cc-iconButton:disabled{cursor:default;opacity:.4}
.cc-iconButton:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
/* Per-model context-length override rows (issue #86): the error wraps onto
   its own line beneath the select/input/remove trio. The three cells form a
   fixed column contract — flexible model, 112px value, 28px remove — and the
   cc-contextHead labels repeat the first two (plus the remove cell's width
   as a spacer) so they sit exactly over their columns. */
.cc-contextItem{align-items:center;gap:8px;display:flex;flex-wrap:wrap;padding:8px 0}
.cc-contextHead{align-items:center;gap:8px;display:flex;flex-wrap:wrap;padding:4px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.cc-contextHeadModel{flex:1;min-width:200px}
.cc-contextHeadValue{flex:none;width:120px}
.cc-contextHeadGap{flex:none;width:28px}
.cc-contextSelect{position:relative;display:block;flex:1;min-width:200px}
/* appearance:none swaps the platform arrow for the cc-contextCaret, shaped
   like cc-selectorCaret so every dropdown in the plugin opens with the same
   hand-drawn chevron. */
.cc-contextModel{box-sizing:border-box;appearance:none;-webkit-appearance:none;width:100%;padding-inline-end:26px;text-overflow:ellipsis;cursor:pointer}
.cc-contextCaret{position:absolute;inset-inline-end:12px;top:50%;width:6px;height:6px;border-right:1.5px solid var(--dsw-alias-label-tertiary);border-bottom:1.5px solid var(--dsw-alias-label-tertiary);transform:translateY(-50%) rotate(45deg);pointer-events:none}
.cc-contextSelect:has(.cc-contextModel:disabled) .cc-contextCaret{opacity:.6}
.cc-contextValue{flex:none;width:120px}
.cc-contextError{flex-basis:100%}
.cc-tabDot{flex-shrink:0;width:8px;height:8px;border-radius:50%;corner-shape:round}
.cc-tabDotOk{background:var(--dsw-alias-state-success-primary)}
.cc-tabDotBlank{background:0 0;border:0}
.cc-tabDotWarn{background:var(--dsw-alias-state-warn-primary,#d97706)}
.cc-tabDotError{background:var(--dsw-alias-state-error-primary)}
.cc-accountMeters{flex-wrap:wrap;gap:6px 20px;display:flex;padding-left:16px}
.cc-miniMeter{align-items:center;gap:8px;display:inline-flex;font-size:12px;line-height:18px}
.cc-miniMeterLabel{color:var(--dsw-alias-label-tertiary)}
.cc-miniMeterTrack{overflow:hidden;background:var(--dsw-alias-bg-module-platform);border-radius:999px;width:64px;height:4px}
.cc-miniMeterFill{display:block;background:var(--dsw-alias-brand-primary);border-radius:999px;height:100%}
.cc-miniMeterValue{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.cc-accountDetails{container-type:inline-size;border-top:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:14px;display:flex;padding-top:12px}
.cc-inlineForm{flex-direction:column;gap:8px;display:flex}
.cc-inlineActions{align-items:center;gap:8px;display:flex}
.cc-dangerButton{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.cc-dangerButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}
.cc-panel{flex-direction:column;gap:12px;display:flex;padding:14px 16px;border-radius:12px;background:var(--dsw-alias-bg-module-platform)}
.cc-panelTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600;line-height:22px}
.cc-accountReport{flex-direction:column;gap:14px;display:flex}
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
.cc-usageBalances{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.cc-usageStat{min-width:0;flex-direction:column;gap:2px;display:flex;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-bg-module-platform)}
.cc-usageStatLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.cc-usageStatValue{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:500;line-height:24px;font-variant-numeric:tabular-nums}
.cc-usageStatSub{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cc-usageWindows{flex-direction:column;gap:14px;display:flex}
.cc-usageWindow{flex-direction:column;gap:6px;display:flex}
.cc-usageWindowHead{align-items:baseline;gap:8px;display:flex}
.cc-usageWindowLabel{color:var(--dsw-alias-label-secondary);flex:1;font-size:12px;line-height:18px}
.cc-usageWindowValue{color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.cc-usageExceeded{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.cc-usageBar{overflow:hidden;background:var(--dsw-alias-bg-module-platform);border-radius:999px;height:4px}
.cc-usageBarFill{background:var(--dsw-alias-brand-primary);border-radius:999px;height:100%;transition:width .3s ease}
.cc-usageBarFillWarn{background:var(--dsw-alias-state-error-primary)}
.cc-usageWindowReset{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}
.cc-usageMeta{align-items:center;gap:8px;display:flex}
.cc-usageMetaSpacer{flex:1}
.cc-usageUpdated{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}
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
.cc-noticeActions{flex-wrap:wrap;align-items:center;gap:8px;display:flex;margin-top:6px}
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
 * with the harness Button inside it (36px buttons with 12px corners, inset by
 * 4px, in a 44px bar with 16px corners) so the gap around each button is even. */
.cc-sectionWithBar{padding-bottom:80px}
.cc-saveBarDock{position:sticky;bottom:0;z-index:2;height:0;pointer-events:none}
.cc-saveBar{--cc-saveBar-tone:var(--dsw-alias-state-warn-primary,#d97706);position:absolute;left:50%;bottom:20px;box-sizing:border-box;width:max-content;max-width:calc(100% - 24px);align-items:center;gap:10px;display:flex;height:44px;padding:4px 4px 4px 16px;border:0;border-radius:16px;background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-elevation-prominent,0 12px 32px -8px rgba(0,0,0,.24),0 2px 8px rgba(0,0,0,.08));opacity:0;visibility:hidden;transform:translate(-50%,12px);transition:opacity .16s ease,transform .16s ease,visibility 0s linear .16s}
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
