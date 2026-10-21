/**
 * React component for the "Command Code" settings page (browser half).
 *
 * Renders as a `settings.section` entry — a page at the same settings-nav
 * level as General / Models / Plugins. All copy comes from the
 * `settings.commandcode` locale namespace; all state comes from the
 * `CommandCodeSettingsController` injected by the slot registration.
 *
 * Layout, top to bottom: Accounts (one card per account, status, quota,
 * actions and dedicated models — every operation commits immediately), Models
 * & context (plan filter + visible-model allowlist, then the context-length
 * rows: the global custom window and the per-model overrides, issue #86),
 * Privacy & security (ZDR), Integrations & display (service status, web search,
 * sidebar quota card), and Advanced (API base + network limits). Everything
 * below Accounts is a flat group of rows (title/description left, control
 * right) inside the staged form the floating save bar writes.
 *
 * All five groups fold from their own heading (`FoldableGroup`, 决策记录第十章
 * 第4条): Accounts opens by default, the rest start folded, the header offers
 * expand-all / collapse-all, and the choice is remembered per browser
 * (./group-fold.ts). A folded heading still summarizes its group, and anything
 * inside it that blocks the save is reported on the heading; the save bar's
 * Locate action opens that group and focuses the invalid field.
 *
 * Styles are injected once by the client entry (see src/client/index.ts) and
 * class-prefixed `cc-` to stay local.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Button, Menu, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry, StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import type { CommandCodeCredits } from '../adapter.ts'
import type { CommandCodeAccountUsage, CommandCodeUsageReport } from '../usage-wire.ts'
import { settingsWriteNotice, type SettingsCommandCodeKey } from './locales.ts'
import type { CatalogModelOption, SettingsPageState, StagedField } from './settings.ts'
import type { AccountEnrollmentController, EnrollmentPageState } from './enrollment.ts'
import type { LoginPageState } from './login.ts'
import { loginHint, loginStateForTarget } from './login.ts'
import { allowlistedModels, buildModelSelectOptions, catalogIsReady, groupModelSelectOptions, staleModelIds, tierHeadingFor, toggleModelSelection } from './model-select.ts'
import type { UsagePageState } from './usage.ts'
import { usageCardState } from './usage.ts'
import { compactCountTitle, formatCompactCount, formatMoney, formatMoneyExact, formatResetAtShort, formatSuccessRate, formatTokensCompact, windowRatio, formatUsageBillingPeriod } from '../display-format.ts'
import { PLUGIN_RELEASES_URL, PLUGIN_VERSION } from './version.ts'
import { checkForUpdate, localStorageUpdateStore } from './update.ts'
import {
  STATUS_PAGE_URL,
  checkServiceStatus,
  localStorageServiceStatusStore,
  readCachedServiceStatus,
  serviceStatusView,
} from './service-status.ts'
import type { ServiceStatusSnapshot, ServiceStatusView } from './service-status.ts'
import { allExpanded, expandGroups, localStorageFoldStore, setAllGroups, type FoldGroup, type FoldState } from './group-fold.ts'

/**
 * The page's line icons, one single-colour 16px stroke set so every glyph in
 * the page reads alike (the UI rules forbid emoji and character icons such as
 * "×" or "↗"). The colour comes from `currentColor`, i.e. from the button,
 * link or notice tone the icon sits in.
 */
type IconName = 'chevron' | 'more' | 'chart' | 'arrowRight' | 'check' | 'reset' | 'close' | 'refresh' | 'plus' | 'external' | 'info' | 'warn' | 'error' | 'lock'
const ICON_PATHS: Record<IconName, ReactNode> = {
  chevron: <path d="M4 6l4 4 4-4" />,
  more: <><circle cx="8" cy="3.5" r=".9" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none" /><circle cx="8" cy="12.5" r=".9" fill="currentColor" stroke="none" /></>,
  chart: <><path d="M2.5 13.5h11" /><path d="M4.5 13.5V8.5M8 13.5V4.5M11.5 13.5V6.5" /></>,
  arrowRight: <path d="M3 8h10M9 4l4 4-4 4" />,
  check: <><circle cx="8" cy="8" r="6" /><path d="M5.5 8.2 7.2 9.8 10.5 6.5" /></>,
  reset: <><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" /><path d="M2.5 2.5v3h3" /></>,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  refresh: <><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" /><path d="M13.5 2.5v3h-3" /></>,
  plus: <path d="M8 3v10M3 8h10" />,
  external: <><path d="M9 2.5h4.5V7" /><path d="M13.5 2.5 7.5 8.5" /><path d="M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" /></>,
  info: <><circle cx="8" cy="8" r="6" /><path d="M8 7.25v3.5M8 5.25v.01" /></>,
  warn: <><path d="M8 2.5 14 13H2z" /><path d="M8 6.5v3M8 11.25v.01" /></>,
  error: <><circle cx="8" cy="8" r="6" /><path d="M6 6l4 4M10 6l-4 4" /></>,
  lock: <><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></>,
}

function Icon({ name, className = 'cc-icon' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  )
}

type NoticeTone = 'neutral' | 'success' | 'warn' | 'error'
const NOTICE_ICON: Record<NoticeTone, IconName> = { neutral: 'info', success: 'check', warn: 'warn', error: 'error' }
const NOTICE_CLASS: Record<NoticeTone, string> = { neutral: 'cc-notice', success: 'cc-notice cc-noticeSuccess', warn: 'cc-notice cc-noticeWarn', error: 'cc-notice cc-noticeError' }

/**
 * The one block every result, warning and failure on this page uses (read-only
 * config, a failed account operation, a cleanup still owed, …), so status no
 * longer arrives as loose red paragraphs in a different shape each time.
 * Actions sit under the text; the caller keeps the live-region role.
 */
function Notice({ tone = 'neutral', icon, title, actions, role = 'status', label, children }: {
  tone?: NoticeTone
  /** Overrides the tone's default icon (the read-only notice shows a lock). */
  icon?: IconName
  title?: string
  actions?: ReactNode
  /** `alertdialog` for an in-place confirmation, which then needs `label`. */
  role?: 'status' | 'alert' | 'alertdialog'
  label?: string
  children?: ReactNode
}) {
  return (
    <div className={NOTICE_CLASS[tone]} role={role} aria-label={label}>
      <Icon name={icon ?? NOTICE_ICON[tone]} className="cc-noticeIcon" />
      <div className="cc-noticeBody">
        {title !== undefined ? <p className="cc-noticeTitle">{title}</p> : null}
        {children}
        {actions !== undefined ? <div className="cc-noticeActions">{actions}</div> : null}
      </div>
    </div>
  )
}

/** Props composed by the slot registration: locale seat + injected face. */
export interface CommandCodeSettingsProps {
  t: Translate<SettingsCommandCodeKey>
  useCommandCodeSettings<T>(selector: (state: SettingsPageState) => T): T
  useCommandCodeUsage<T>(selector: (state: UsagePageState) => T): T
  useCommandCodeLogin<T>(selector: (state: LoginPageState) => T): T
  edit(field: string, text: string): void
  resetField(field: string): void
  save(): void
  discard(): void
  refreshUsage(): void
  openAnalytics?(): void
  refreshCredentials(): void
  beginLogin(targetRef?: string): void
  cancelLogin(): void
  createEnrollment(): AccountEnrollmentController
  renameAccount(ref: string, label: string): Promise<boolean>
  removeAccount(ref: string): Promise<boolean>
  retryCredentialCleanup(ref: string): Promise<boolean>
  setAccountKey(target: string, key: string): Promise<boolean>
  clearAccountKey(target: string): Promise<boolean>
  setActiveAccount(id: string): Promise<boolean>
  setAccountModels(target: string, ids: string[]): Promise<boolean>
  editVisibleModels(ids: string[]): void
  clearVisibleModels(): void
  /** Stage the whole per-model context-length map (one entry per row, issue #86). */
  editContextWindowOverrides(next: Record<string, string>): void
}

/**
 * The Host-side defaults an empty field falls back to, shown as placeholders so
 * an empty box reads "300 s" rather than looking broken. They are literals
 * because the client bundle must not pull in the adapter; `tests/section.test.ts`
 * pins each one to the constant it mirrors (DEFAULT_API_BASE,
 * DEFAULT_REQUEST_TIMEOUT_MS / DEFAULT_STREAM_IDLE_TIMEOUT_MS in seconds,
 * DEFAULT_TRANSPORT_MAX_RETRIES).
 */
export const FIELD_DEFAULTS = {
  apiBase: 'https://api.commandcode.ai',
  requestTimeoutSeconds: '300',
  streamIdleTimeoutSeconds: '300',
  transportMaxRetries: '5',
} as const

/** The section fields folded into the collapsible Advanced card. */
type AdvancedField = 'apiBase' | 'requestTimeoutMs' | 'streamIdleTimeoutMs' | 'transportMaxRetries' | 'offloadSeenImagesForCache'
const ADVANCED_FIELDS: readonly AdvancedField[] = [
  'apiBase',
  'requestTimeoutMs',
  'streamIdleTimeoutMs',
  'transportMaxRetries',
  'offloadSeenImagesForCache',
]

/**
 * The staged drafts the Models & context group owns. `filterModelsByPlan` is a
 * switch and cannot fail through the page's own control, but it sits in the
 * same staged plan the save guard walks and Advanced's equivalent switch is
 * checked the same way — so the heading must not be able to disagree with it.
 */
type ModelsField = 'filterModelsByPlan' | 'contextWindow' | 'maxOutputTokens'
const MODELS_FIELDS: readonly ModelsField[] = ['filterModelsByPlan', 'contextWindow', 'maxOutputTokens']

/**
 * Whether anything the collapsed Advanced card owns is blocking the save. The
 * card is folded on arrival, so this drives the warning badge on its heading.
 */
export function advancedGroupInvalid(state: Pick<SettingsPageState, AdvancedField>): boolean {
  return ADVANCED_FIELDS.some((field) => state[field].invalid)
}

/**
 * Whether anything the collapsed Models & context group owns is blocking the
 * save (issue #94). Besides its staged drafts — the plan switch and the two
 * numbers — that group owns the per-model context rows, whose drafts are
 * validated one by one: a bad row must surface on the heading just like a bad
 * number, or Save would sit disabled with nothing on screen explaining why.
 */
export function modelsGroupInvalid(
  state: Pick<SettingsPageState, ModelsField | 'contextWindowOverrides'>,
): boolean {
  return MODELS_FIELDS.some((field) => state[field].invalid)
    || state.contextWindowOverrides.some((row) => row.invalid)
}

/**
 * The groups holding a draft that blocks the save, in page order — what the
 * save bar's locate action opens before focusing the first invalid field.
 * Privacy and Integrations hold switches only and Accounts is not staged, so
 * only these two can ever appear.
 */
export function invalidGroups(state: Pick<SettingsPageState, AdvancedField | ModelsField | 'contextWindowOverrides'>): FoldGroup[] {
  const groups: FoldGroup[] = []
  if (modelsGroupInvalid(state)) groups.push('models')
  if (advancedGroupInvalid(state)) groups.push('advanced')
  return groups
}

/**
 * "N customized" on the Models & context heading: its staged fields that
 * differ from the default, plus one per per-model context override (each row
 * is a customization the user made).
 */
export function modelsOverriddenCount(state: Pick<SettingsPageState, ModelsField | 'contextWindowOverrides'>): number {
  return MODELS_FIELDS.filter((field) => state[field].overridden).length + state.contextWindowOverrides.length
}

/** "N customized" on the Advanced heading. */
export function advancedOverriddenCount(state: Pick<SettingsPageState, AdvancedField>): number {
  return ADVANCED_FIELDS.filter((field) => state[field].overridden).length
}

/**
 * The effective value of a staged switch: an unset draft (`''`) means the
 * field's default. Used by the summary badges, which must say what the switch
 * on screen says.
 */
export function stagedSwitch(field: StagedField, defaultValue: boolean): boolean {
  return field.text === '' ? defaultValue : field.text === 'true'
}

/**
 * Accounts that need attention, for the Accounts heading. Uses the same
 * verdicts as each row's status dot (`statusDotClass`): a rejected key is a
 * hard failure, a cooldown or any other mark a warning.
 */
export function accountIssues(entries: readonly (Pick<CommandCodeAccountUsage, 'mark' | 'cooldownUntil'> | undefined)[]): { count: number; severe: boolean } {
  let count = 0
  let severe = false
  for (const entry of entries) {
    if (entry === undefined) continue
    if (entry.mark === 'invalid-credential') {
      count += 1
      severe = true
    } else if (entry.mark !== '' || entry.cooldownUntil > 0) {
      count += 1
    }
  }
  return { count, severe }
}

/**
 * The reset button a staged field shows once it differs from the default. It
 * trails the control, and a row with nothing to reset keeps an empty slot of
 * the same width, so every staged control in a group ends on one right edge.
 */
function FieldOverride({ label, state, disabled, t, onReset }: {
  label: string
  state: StagedField
  disabled: boolean
  t: Translate<SettingsCommandCodeKey>
  onReset(): void
}) {
  if (!state.overridden && !state.clear) return <span className="cc-resetSlot" aria-hidden="true" />
  return (
    <button
      type="button"
      className="cc-iconButton"
      disabled={disabled}
      onClick={onReset}
      aria-label={`${label} — ${t('reset')}`}
      title={t('reset')}
    >
      <Icon name="reset" />
    </button>
  )
}

/**
 * One settings row, laid out like the harness's own General page: the title
 * and description on the left, the control on the right, a hairline between
 * rows.
 */
function SettingRow({ title, titleFor, titleId, tag, description, error, control, className }: {
  title: string
  /** Makes the title a `<label>` for this control id. */
  titleFor?: string
  titleId?: string
  tag?: ReactNode
  description?: ReactNode
  /** Replaces the description while set. */
  error?: string | undefined
  control?: ReactNode
  className?: string
}) {
  return (
    <div className={className === undefined ? 'cc-row' : `cc-row ${className}`}>
      <div className="cc-rowText">
        <div className="cc-rowTitleLine">
          {titleFor !== undefined
            ? <label className="cc-rowTitle" id={titleId} htmlFor={titleFor}>{title}</label>
            : <span className="cc-rowTitle" id={titleId}>{title}</span>}
          {tag}
        </div>
        {error !== undefined ? <p className="cc-rowError">{error}</p> : null}
        {error === undefined && description !== undefined ? <div className="cc-rowDesc">{description}</div> : null}
      </div>
      {control !== undefined ? <div className="cc-rowControl">{control}</div> : null}
    </div>
  )
}

/** The tag a row title carries while its field overrides the default. */
function OverrideTag({ state, t }: { state: StagedField; t: Translate<SettingsCommandCodeKey> }) {
  return state.overridden ? <span className="cc-badge">{t('overridden')}</span> : null
}

/** One text/number field row. */
function Field({
  id,
  label,
  hint,
  state,
  disabled,
  numeric,
  decimal,
  context,
  output,
  wide,
  unit,
  placeholder,
  onEdit,
  onReset,
  t,
}: {
  id: string
  label: string
  /** Absent when the group's own description already says it (API base). */
  hint?: string
  state: StagedField
  disabled: boolean
  numeric?: boolean
  decimal?: boolean
  /** Renders the context-length bounds copy instead of the generic number one. */
  context?: boolean
  /** Renders the output-budget bounds copy (0 = omit, capped by the gateway). */
  output?: boolean
  wide?: boolean
  /**
   * Unit shown beside a number box (seconds, tokens, …), as the General page's
   * font-size field does; the label no longer repeats it.
   */
  unit?: string
  /** What an empty field means — the default it falls back to. */
  placeholder?: string | undefined
  onEdit(text: string): void
  onReset(): void
  t: Translate<SettingsCommandCodeKey>
}) {
  const shape = unit === undefined ? (wide ? 'cc-rowInputWide' : 'cc-rowInput') : 'cc-fieldNumber'
  const input = (
    <input
      id={id}
      className={`cc-fieldInput ${shape}${state.invalid ? ' cc-fieldInputInvalid' : ''}`}
      type="text"
      inputMode={decimal ? 'decimal' : numeric ? 'numeric' : undefined}
      aria-invalid={state.invalid || undefined}
      value={state.text}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onEdit(event.target.value)}
    />
  )
  return (
    <SettingRow
      title={label}
      titleFor={id}
      tag={<OverrideTag state={state} t={t} />}
      description={hint}
      error={state.invalid
        ? invalidCopy(state.invalidReason, t, output === true ? 'output' : context === true ? 'context' : decimal === true ? 'duration' : 'number')
        : undefined}
      control={
        <>
          {unit === undefined ? input : (
            <span className="cc-unitField">
              {input}
              <span className="cc-unit">{unit}</span>
            </span>
          )}
          <FieldOverride label={label} state={state} disabled={disabled} t={t} onReset={onReset} />
        </>
      }
    />
  )
}

/** The per-field error copy for a staged draft's failure reason. */
function invalidCopy(reason: StagedField['invalidReason'], t: Translate<SettingsCommandCodeKey>, mode: 'number' | 'duration' | 'context' | 'output' = 'number'): string {
  if (mode === 'duration') {
    if (reason === 'tooSmall') return t('durationTooSmall')
    if (reason === 'tooLarge') return t('durationTooLarge')
    return t('durationInvalid')
  }
  if (mode === 'context') {
    // The shared generic copy names the retry bounds ("Retries must be at
    // least 0"), which would be wrong here — context lengths have their own
    // 1 – 10,000,000 token bounds (CONTEXT_WINDOW_MIN/MAX).
    if (reason === 'tooSmall') return t('contextWindowTooSmall')
    if (reason === 'tooLarge') return t('contextWindowTooLarge')
    return t('contextWindowInvalid')
  }
  if (mode === 'output') {
    // Same reason: this field's range includes 0 (the omit sentinel) and stops
    // at the gateway's own cap, so neither the retry copy nor the context copy
    // describes it.
    if (reason === 'tooSmall') return t('maxOutputTokensTooSmall')
    if (reason === 'tooLarge') return t('maxOutputTokensTooLarge')
    return t('maxOutputTokensInvalid')
  }
  if (reason === 'tooSmall') return t('numberTooSmall')
  if (reason === 'tooLarge') return t('numberTooLarge')
  return t('invalidNumber')
}

/**
 * One boolean field row rendered as a switch. The staged text is `'true'` /
 * `'false'` / `''` (unset → `defaultChecked`); toggling stages the string the
 * boolean field spec parses back into a real boolean on save.
 */
function ToggleField({
  id,
  label,
  hint,
  state,
  disabled,
  defaultChecked,
  onEdit,
  onReset,
  t,
}: {
  id: string
  label: string
  hint: string
  state: StagedField
  disabled: boolean
  defaultChecked: boolean
  onEdit(text: string): void
  onReset(): void
  t: Translate<SettingsCommandCodeKey>
}) {
  const checked = state.text === '' ? defaultChecked : state.text === 'true'
  return (
    <SettingRow
      title={label}
      titleFor={id}
      tag={<OverrideTag state={state} t={t} />}
      description={hint}
      control={
        <>
          <input
            id={id}
            className="cc-toggle"
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onEdit(event.target.checked ? 'true' : 'false')}
          />
          <FieldOverride label={label} state={state} disabled={disabled} t={t} onReset={onReset} />
        </>
      }
    />
  )
}

/** One stat tile in the account card's summary grid. */
function UsageStat({ label, value, sub, title }: { label: string; value: string; sub?: string | undefined; title?: string | undefined }) {
  return (
    <div className="cc-usageStat" title={title}>
      <span className="cc-usageStatLabel">{label}</span>
      <span className="cc-usageStatValue">{value}</span>
      {sub !== undefined && sub !== '' ? <span className="cc-usageStatSub">{sub}</span> : null}
    </div>
  )
}

/** One window-limit row: label, used/cap, a fill bar, and the reset time. */
function UsageWindow({
  label,
  limit,
  t,
}: {
  label: string
  limit: NonNullable<CommandCodeCredits['fiveHour']>
  t: Translate<SettingsCommandCodeKey>
}) {
  const { used, cap, exceeded, resetAt } = limit
  const ratio = windowRatio(used, cap)
  const reset = formatResetAtShort(resetAt)
  return (
    <div className="cc-usageWindow">
      <div className="cc-usageWindowHead">
        <span className="cc-usageWindowLabel">{label}</span>
        {exceeded ? <span className="cc-usageExceeded">{t('usageExceeded')}</span> : null}
        <span className="cc-usageWindowValue">{cap > 0 ? `${formatMoney(used)} / ${formatMoney(cap)}` : formatMoney(used)}</span>
      </div>
      <div className="cc-usageBar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
        <div className={exceeded ? 'cc-usageBarFill cc-usageBarFillWarn' : 'cc-usageBarFill'} style={{ width: `${ratio * 100}%` }} />
      </div>
      {reset !== '' ? <p className="cc-usageWindowReset">{t('usageReset')} {reset}</p> : null}
    </div>
  )
}

/** One pool account's facts (identity, totals, credits, window limits). */
function AccountReport({ entry, fetchedAt, t, headless = false }: {
  entry: CommandCodeAccountUsage
  /**
   * When the shared usage snapshot was fetched — shares the account's bottom
   * meta row with the billing period end so the two timestamps occupy one
   * line (period/partial facts left, fetch freshness right).
   */
  fetchedAt?: number | undefined
  t: Translate<SettingsCommandCodeKey>
  /** Omit the identity header (the account row already shows it). */
  headless?: boolean
}) {
  const report = entry.report
  const account = report.account
  const accountName = account === undefined ? '' : account.userName || account.name
  const credits = report.credits
  const plan = report.plan
  const planName = plan?.name ?? ''
  const planStatus = plan !== undefined && plan.status !== '' && plan.status !== 'active' ? plan.status : ''
  const showPeriod = plan !== undefined && plan.currentPeriodEnd > 0
  const showPartial = report.failures.length > 0 && report.blocked === undefined
  const usagePeriod = formatUsageBillingPeriod(report.usage?.periodStart, plan?.currentPeriodStart, plan?.currentPeriodEnd)

  return (
    <div className="cc-accountReport">
      {!headless ? (
        <div className="cc-usageHead">
          <h4 className="cc-usageTitle">{entry.label}</h4>
          {accountName !== '' ? <span className="cc-usageAccount">{accountName}</span> : null}
          {planName !== '' ? <span className="cc-badgeMuted">{planName}</span> : null}
        </div>
      ) : null}
      {planStatus !== '' ? <p className="cc-usagePlanStatus">{planStatus}</p> : null}

      {!entry.configured ? <p className="cc-usageHint">{t('usageUnconfigured')}</p> : null}

      {report.blocked !== undefined ? (
        <Notice tone="error" role="alert" title={blockedTitle(report.blocked, t)}>
          <p>{blockedHint(report.blocked, t)}</p>
          {/* Keep the per-endpoint failures visible alongside the summary:
              they carry the actual status or transport error for diagnosis. */}
          {report.failures.length > 0 ? (
            <p className="cc-noticeDetail" title={report.failures.join('; ')}>
              {report.failures.join(' · ')}
            </p>
          ) : null}
        </Notice>
      ) : null}

      {report.usage !== undefined ? (
        <p className="cc-usageUpdated">{usagePeriod ? `${t('usageBillingPeriod')} ${usagePeriod}` : t('usagePeriodUnknown')}</p>
      ) : null}
      {report.usage !== undefined ? (
        <div className="cc-usageStats cc-usageStatsActivity">
          {/* 计数按 K/M/B 紧凑显示：四列等宽窄卡里，原始位数会先把右侧的「失败 …」
              挤出省略号。精确值改由 title 悬停查看，且只在确实换算过时才挂。 */}
          <UsageStat
            label={t('usageRequests')}
            value={formatCompactCount(report.usage.totalCount)}
            // Success count is already the rate beside it; the sub line keeps
            // the one number the rate hides, so it fits a quarter-width tile.
            sub={`${t('usageFailed')} ${formatCompactCount(report.usage.failedCount)}`}
            title={compactCountTitle([
              [t('usageRequests'), report.usage.totalCount],
              [t('usageCompleted'), report.usage.completedCount],
              [t('usageFailed'), report.usage.failedCount],
            ] as const)}
          />
          <UsageStat label={t('usageSuccessRate')} value={`${formatSuccessRate(report.usage.successRate)}%`} />
          <UsageStat
            label={t('usageCost')}
            value={formatMoneyExact(report.usage.totalCost)}
            sub={`${formatMoney(report.usage.totalCredits)} credits`}
          />
          <UsageStat
            label={t('usageTokens')}
            value={formatTokensCompact(report.usage.totalTokensIn + report.usage.totalTokensOut)}
            sub={`${formatTokensCompact(report.usage.totalTokensIn)} ${t('usageTokensIn')} / ${formatTokensCompact(report.usage.totalTokensOut)} ${t('usageTokensOut')}`}
          />
        </div>
      ) : null}

      {/* Balances are secondary to the activity tiles: one quiet line instead
          of a second, three-column tile row that never lined up with the four
          above it. An omitted balance reads "—", as before. */}
      {credits !== undefined ? (
        <p className="cc-usageBalances">
          {[
            `${t('usageMonthly')} ${credits.monthlyReported === false ? '—' : formatMoney(credits.monthlyCredits)}`,
            `${t('usagePurchased')} ${credits.purchasedReported === false ? '—' : formatMoney(credits.purchasedCredits)}`,
            `${t('usageFree')} ${credits.freeReported === false ? '—' : formatMoney(credits.freeCredits)}`,
          ].join(' · ')}
        </p>
      ) : null}

      {credits?.fiveHour !== undefined || credits?.weekly !== undefined ? (
        <div className="cc-usageWindows">
          {credits.fiveHour !== undefined ? (
            <UsageWindow label={t('usageFiveHour')} limit={credits.fiveHour} t={t} />
          ) : null}
          {credits.weekly !== undefined ? (
            <UsageWindow label={t('usageWeekly')} limit={credits.weekly} t={t} />
          ) : null}
        </div>
      ) : null}

      {showPeriod || showPartial || fetchedAt !== undefined ? (
        <div className="cc-usageMeta">
          {showPeriod ? (
            <p className="cc-usageUpdated">{t('usagePeriodEnd')} {new Date(plan.currentPeriodEnd).toLocaleDateString()}</p>
          ) : null}
          {showPartial ? (
            <p className="cc-usagePartial" title={report.failures.join('; ')}>{t('usagePartial')}</p>
          ) : null}
          <span className="cc-usageMetaSpacer" />
          {fetchedAt !== undefined ? (
            <p className="cc-usageUpdated">{t('usageUpdated')} {new Date(fetchedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** The headline copy for a report whose every endpoint failed the same way. */
function blockedTitle(reason: CommandCodeUsageReport['blocked'], t: Translate<SettingsCommandCodeKey>): string {
  if (reason === 'invalid-key') return t('usageKeyInvalid')
  if (reason === 'service-unavailable') return t('usageServiceUnavailable')
  if (reason === 'invalid-response') return t('usageInvalidResponse')
  return t('usageNetworkError')
}

/** The actionable hint under a blocked report's headline. */
function blockedHint(reason: CommandCodeUsageReport['blocked'], t: Translate<SettingsCommandCodeKey>): string {
  if (reason === 'invalid-key') return t('usageKeyInvalidHint')
  if (reason === 'service-unavailable') return t('usageServiceUnavailableHint')
  if (reason === 'invalid-response') return t('usageInvalidResponseHint')
  return t('usageNetworkHint')
}

/**
 * A checkbox multi-select dropdown for picking catalog models (the routing-rule
 * rows and the visible-models filter share it). The trigger shows the selection
 * count; the Menu lists every catalog model, grouping under plan-tier headings
 * and flagging selected ids the catalog no longer carries as stale, so a saved
 * selection never silently loses an entry (the VisibleModelsCard offers a
 * one-click cleanup).
 *
 * With `deferCommit` the toggles collect in a local draft that is handed to
 * `onSelect` once, when the menu closes: the per-account picker writes
 * immediately, and one write per click would be a burst of document writes.
 */
function ModelMultiSelect({ id, selected: committed, catalog, disabled, deferCommit = false, ownerOf, t, onSelect }: {
  id: string
  selected: string[]
  catalog: CatalogModelOption[]
  disabled: boolean
  deferCommit?: boolean
  /** Names the other account a model currently belongs to, if any. */
  ownerOf?: (modelId: string) => string | undefined
  t: Translate<SettingsCommandCodeKey>
  onSelect(ids: string[]): void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<string[] | undefined>(undefined)
  const selected = draft ?? committed
  // The search box must not inherit a stale query from a previous open.
  useEffect(() => {
    if (open) setQuery('')
  }, [open])
  const close = () => {
    setOpen(false)
    if (draft !== undefined) {
      setDraft(undefined)
      const changed = draft.length !== committed.length || draft.some((modelId) => !committed.includes(modelId))
      if (changed) onSelect(draft)
    }
  }
  // Tier headings come from the catalog entries themselves (the Host stamps
  // each entry's plan-tier key on the Remote); rebuild only when the catalog
  // changes.
  const tiers = useMemo(
    () => Object.fromEntries(
      catalog.flatMap((model) => model.tier === undefined ? [] : [[model.id, model.tier] as const]),
    ),
    [catalog],
  )
  const options = buildModelSelectOptions(catalog, selected, query)
  const groups = groupModelSelectOptions(options, (modelId) => tierHeadingFor(modelId, tiers))
  const items: MenuEntry[] = groups.flatMap((group) => [
    ...(group.heading === undefined
      ? []
      : [{ type: 'label' as const, id: `cc-tier-${group.heading}`, text: group.heading }]),
    ...group.options.map((option) => ({
      id: option.value,
      label: (
        <span className="cc-checkRow">
          <input
            type="checkbox"
            className="cc-check"
            checked={selected.includes(option.value)}
            readOnly
            tabIndex={-1}
          />
          <span className="cc-checkName">{option.label}</span>
          {option.stale ? <span className="cc-badge">{t('modelStale')}</span> : null}
          {option.allowance !== undefined ? (
            <span className="cc-badgeMuted" title={t('modelAllowanceTitle')}>
              {t('modelAllowance', { amount: option.allowance })}
            </span>
          ) : null}
          {!selected.includes(option.value) && ownerOf?.(option.value) !== undefined ? (
            <span className="cc-badgeMuted">{t('accountModelOwner', { name: ownerOf(option.value)! })}</span>
          ) : null}
        </span>
      ),
    })),
  ])
  // The search box lives INSIDE the Menu anchor (which renders in place
  // inside the Menu's root span): a pointerdown there counts as "inside",
  // so focusing/typing never trips the Menu's outside-click close. A box
  // rendered as a sibling would close the Menu on the first click.
  return (
    <Menu
      open={open}
      onClose={close}
      onSelect={(modelId) => {
        const next = toggleModelSelection(selected, modelId)
        if (deferCommit) setDraft(next)
        else onSelect(next)
      }}
      selectedIds={selected}
      items={items}
      footer={options.length === 0 ? [{
        type: 'label' as const,
        id: 'cc-model-search-empty',
        text: t('modelSearchEmpty'),
      }] : []}
      portal
      anchor={
        <span className="cc-modelSelectAnchor">
          <button
            id={id}
            type="button"
            className="cc-selector"
            disabled={disabled || catalog.length === 0}
            onClick={() => (open ? close() : setOpen(true))}
          >
            <span className="cc-selectorText">
              {selected.length === 0 ? t('modelPick') : t('modelCount', { count: selected.length })}
            </span>
            <span className="cc-selectorCaret" aria-hidden="true" />
          </button>
          {open ? (
            <input
              type="search"
              className="cc-input cc-modelSearch"
              placeholder={t('modelSearchPlaceholder')}
              aria-label={t('modelSearchPlaceholder')}
              value={query}
              disabled={disabled}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
            />
          ) : null}
        </span>
      }
    />
  )
}

/** The visible-model filter row: an allowlist over the catalog. Empty = show all. */
function VisibleModelsRow({ t, state, disabled, onSelect, onClear }: {
  t: Translate<SettingsCommandCodeKey>
  state: SettingsPageState
  disabled: boolean
  onSelect(ids: string[]): void
  onClear(): void
}) {
  const count = state.visibleModels.length
  const pickT: Translate<SettingsCommandCodeKey> = (key, params) => {
    if (key === 'modelPick' || key === 'modelCount') {
      return state.visibleModelsAll ? t('visibleModelsShowAll') : t('visibleModelsCount', { count })
    }
    return t(key, params)
  }
  // Selected ids the live catalog no longer carries (retired upstream): kept,
  // flagged stale in the dropdown, removable in one click — never auto-dropped,
  // since an empty catalog (fetch failure) must not wipe the list. Both the
  // cleanup button and its hint are gated on catalogIsReady, whose doc states
  // why an empty catalog makes every selection look retired.
  const readiness = { catalogIds: state.catalogModels.map((model) => model.id), catalogFailed: state.catalogFailed }
  const staleIds = staleModelIds(state.visibleModels, readiness)
  const catalogReady = catalogIsReady(readiness)
  return (
    <SettingRow
      title={t('visibleModelsTitle')}
      titleFor="cc-visible-models"
      description={
        <>
          <p>{t('visibleModelsHint')}</p>
          {staleIds.length > 0 && catalogReady ? <p>{t('visibleModelsStaleHint', { count: staleIds.length })}</p> : null}
        </>
      }
      error={state.catalogFailed ? t('modelCatalogFailed') : undefined}
      control={
        <>
          {catalogReady && staleIds.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onSelect(state.visibleModels.filter((id) => !staleIds.includes(id)))}
            >
              {t('visibleModelsCleanStale', { count: staleIds.length })}
            </Button>
          ) : null}
          {!state.visibleModelsAll ? (
            <Button variant="ghost" size="sm" disabled={disabled} onClick={onClear}>
              {t('visibleModelsShowAll')}
            </Button>
          ) : null}
          <ModelMultiSelect
            id="cc-visible-models"
            selected={state.visibleModels}
            catalog={state.catalogModels}
            disabled={disabled}
            t={pickT}
            onSelect={onSelect}
          />
        </>
      }
    />
  )
}

/**
 * One top-level group of the page (决策记录第十章第4条). All five groups share
 * this one shape so they cannot drift apart: the heading is an `h3` wrapping a
 * single full-width button — chevron first, then the title and the summary
 * badges — and a group action such as Refresh sits OUTSIDE that button, so
 * using it never folds the group. Which groups are open is page state (see
 * ./group-fold.ts), passed in here.
 *
 * The body stays mounted and is hidden with the `hidden` attribute rather than
 * unrendered: `aria-controls` then always points at a real element, and the
 * save bar's locate action can focus an invalid field right after opening its
 * group. Folding is presentation only — staged drafts, validation and the save
 * path are untouched (第六章第1、2条).
 */
function FoldableGroup({ id, title, divided = true, expanded, onToggle, badges, action, children }: {
  /** Stable group id; it derives the title and body element ids. */
  id: FoldGroup
  title: string
  /** The hairline above the group; only the first group on the page omits it. */
  divided?: boolean
  expanded: boolean
  onToggle(): void
  /** Summary badges beside the title, shown folded or not. */
  badges?: ReactNode
  /** Heading action outside the toggle (Accounts' Refresh). */
  action?: ReactNode
  children: ReactNode
}) {
  const titleId = `cc-group-${id}-title`
  const bodyId = `cc-group-${id}-body`
  return (
    <section className={divided ? 'cc-group cc-groupDivided' : 'cc-group'} aria-labelledby={titleId}>
      <div className="cc-groupHead">
        <h3 className="cc-groupHeading">
          <button type="button" className="cc-disclosure" aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle}>
            <Icon name="chevron" className={expanded ? 'cc-icon cc-foldChevron' : 'cc-icon cc-foldChevron cc-foldChevronClosed'} />
            <span id={titleId} className="cc-groupTitle">{title}</span>
            {badges}
          </button>
        </h3>
        {action}
      </div>
      <div id={bodyId} className="cc-groupBody" hidden={!expanded}>
        <div className="cc-rows">{children}</div>
      </div>
    </section>
  )
}

/**
 * A heading's neutral summary as quiet text ("3 allowlisted · 1 customized"),
 * like the harness's own section captions; only warnings and errors get a
 * tinted pill, so a pill always means "look here". Empty parts are skipped.
 */
function GroupSummary({ parts }: { parts: readonly (string | undefined)[] }) {
  const text = parts.filter((part): part is string => part !== undefined && part !== '').join(' · ')
  return text === '' ? null : <span className="cc-groupSummary">{text}</span>
}

/** "N customized" for a heading summary; undefined at zero. */
function overriddenText(count: number, t: Translate<SettingsCommandCodeKey>): string | undefined {
  if (count === 0) return undefined
  return count === 1 ? t('groupOverriddenOne') : t('groupOverriddenMany', { count })
}

/**
 * The badge a FOLDED group shows while something inside it blocks the save:
 * its rows are off screen, so without it Save would sit disabled with nothing
 * visible explaining why (issue #94). Expanded, the row errors speak for it.
 */
function InvalidBadge({ show, t }: { show: boolean; t: Translate<SettingsCommandCodeKey> }) {
  return show ? <span className="cc-badge cc-badgeError">{t('groupInvalid')}</span> : null
}

/** The staged-field callbacks every form card shares. */
interface FormCardProps {
  state: SettingsPageState
  disabled: boolean
  t: Translate<SettingsCommandCodeKey>
  onEdit(field: string, text: string): void
  onReset(field: string): void
}

/** Whether a group is open, and how to flip it; owned by the page (./group-fold.ts). */
interface FoldProps {
  expanded: boolean
  onToggle(): void
}

/**
 * Models & context: the plan filter and the allowlist sit together because both
 * decide what the model picker lists (the allowlist applies after the plan
 * filter), and the context-length fields follow them because they are the same
 * subject seen from the other side — the window each listed model advertises.
 * Those fields carry no heading or divider of their own: they are rows of this
 * group, not a section inside it. Folded by default like every group but
 * Accounts; the heading then summarizes the allowlist size and how much of the
 * group is customized.
 */
function ModelsCard({ state, disabled, t, onEdit, onReset, onSelect, onClear, onOverrides, expanded, onToggle }: FormCardProps & FoldProps & {
  onSelect(ids: string[]): void
  onClear(): void
  onOverrides(next: Record<string, string>): void
}) {
  return (
    <FoldableGroup
      id="models"
      title={t('modelsTitle')}
      expanded={expanded}
      onToggle={onToggle}
      badges={
        <>
          <GroupSummary
            parts={[
              state.visibleModelsAll ? t('visibleModelsSummaryAll') : t('visibleModelsSummary', { count: state.visibleModels.length }),
              overriddenText(modelsOverriddenCount(state), t),
            ]}
          />
          <InvalidBadge show={!expanded && modelsGroupInvalid(state)} t={t} />
        </>
      }
    >
      <ToggleField
        id="cc-filter-models-by-plan"
        label={t('filterModelsByPlan')}
        hint={t('filterModelsByPlanHint')}
        state={state.filterModelsByPlan}
        disabled={disabled}
        defaultChecked
        onEdit={(text) => onEdit('filterModelsByPlan', text)}
        onReset={() => onReset('filterModelsByPlan')}
        t={t}
      />
      <VisibleModelsRow t={t} state={state} disabled={disabled} onSelect={onSelect} onClear={onClear} />
      <ContextCard
        state={state}
        disabled={disabled}
        t={t}
        onEdit={onEdit}
        onReset={onReset}
        onOverrides={onOverrides}
      />
    </FoldableGroup>
  )
}

/**
 * Context length (issue #86): the global custom window plus one row per model
 * override, both staged into the same save as the other form fields. Rendered
 * as plain rows of the Models & context group — no heading, no divider of its
 * own: the setting belongs to the models that group already governs, and on the
 * real page a section inside the group read as visual noise. The advertised
 * window is what the harness meters context against and when it compacts, so a
 * lowered value compacts earlier and a raised one follows the model's real
 * capacity when the catalog under-reports it. Precedence: a per-model row, then
 * the global value, then the catalog.
 *
 * The rows live as raw text drafts: blank drops the override on save, an
 * unparseable one blocks the save with its own bounds copy, and the value
 * accepts the compact shorthand the picker prints (`256K`, `1M`). The model
 * select offers only allowlisted models the list does not already carry —
 * one override per model, matching what the Models card lets through — and
 * keeps a stored id the catalog no longer carries (or the whitelist just
 * dropped) as itself so an existing override never silently disappears.
 */
function ContextCard({ state, disabled, t, onEdit, onReset, onOverrides }: FormCardProps & {
  onOverrides(next: Record<string, string>): void
}) {
  const rows = state.contextWindowOverrides
  const used = new Set(rows.map((row) => row.model))
  const available = allowlistedModels(state.catalogModels, state.visibleModels, state.visibleModelsAll)
    .filter((model) => !used.has(model.id))
  const asMap = (): Record<string, string> => Object.fromEntries(rows.map((row) => [row.model, row.text]))
  const setText = (model: string, text: string) => onOverrides({ ...asMap(), [model]: text })
  const setModel = (from: string, to: string) => {
    if (to === '' || to === from || used.has(to)) return
    const next: Record<string, string> = {}
    for (const row of rows) next[row.model === from ? to : row.model] = row.text
    onOverrides(next)
  }
  const removeRow = (model: string) => {
    const next = asMap()
    delete next[model]
    onOverrides(next)
  }
  const addRow = () => {
    const model = available[0]
    if (model === undefined) return
    onOverrides({ ...asMap(), [model.id]: '' })
  }
  const labelOf = (model: string): string => {
    const entry = state.catalogModels.find((candidate) => candidate.id === model)
    // An override the catalog no longer carries stays in the list (a retired
    // id must not silently lose its setting) and is named as such.
    return entry === undefined ? `${model} · ${t('modelStale')}` : `${entry.name} (${model})`
  }
  return (
    <>
      <Field
        id="cc-context-window"
        label={t('contextWindow')}
        hint={t('contextWindowHint')}
        state={state.contextWindow}
        disabled={disabled}
        context
        unit={t('unitTokens')}
        placeholder={t('placeholderCatalog')}
        onEdit={(text) => onEdit('contextWindow', text)}
        onReset={() => onReset('contextWindow')}
        t={t}
      />
      {/* Output budget (issue #74): sits with the context field because both
          bound one request's size, and both are per-plugin rather than
          per-model. Placed after the window so the more common setting leads. */}
      <Field
        id="cc-max-output-tokens"
        label={t('maxOutputTokens')}
        hint={t('maxOutputTokensHint')}
        state={state.maxOutputTokens}
        disabled={disabled}
        numeric
        output
        unit={t('unitTokens')}
        placeholder={t('placeholderAuto')}
        onEdit={(text) => onEdit('maxOutputTokens', text)}
        onReset={() => onReset('maxOutputTokens')}
        t={t}
      />
      <SettingRow
        title={t('contextOverridesTitle')}
        description={<p>{t('contextOverridesHint')}</p>}
        control={
          <Button
            variant="outline"
            size="sm"
            icon={<Icon name="plus" />}
            disabled={disabled || available.length === 0}
            onClick={addRow}
          >
            {t('contextOverrideAdd')}
          </Button>
        }
      />
      {/* Only a real fetch failure explains the disabled add button; the
          catalog still loading does not (it may yet land). */}
      {state.catalogFailed ? <p className="cc-groupDesc">{t('contextOverrideNoCatalog')}</p> : null}
      {rows.length > 0 ? (
        // Column heads for the row trio below; the third cell is the remove
        // button's width, so the value label stays optically over its input.
        <div className="cc-contextHead">
          <span className="cc-contextHeadModel">{t('contextOverrideModel')}</span>
          <span className="cc-contextHeadValue">{t('contextOverrideValue')}</span>
          <span className="cc-contextHeadGap" aria-hidden="true" />
        </div>
      ) : null}
      {rows.map((row) => (
        <div className="cc-contextItem" key={row.model}>
          <span className="cc-contextSelect">
            <select
              className="cc-fieldInput cc-contextModel"
              value={row.model}
              aria-label={t('contextOverrideModel')}
              disabled={disabled}
              onChange={(event) => setModel(row.model, event.target.value)}
            >
              <option value={row.model}>{labelOf(row.model)}</option>
              {available.map((model) => (
                <option key={model.id} value={model.id}>{labelOf(model.id)}</option>
              ))}
            </select>
            {/* The plugin's own caret instead of the platform arrow: the
                native one renders in whatever style the OS chooses, which is
                exactly the inconsistency this card should not carry. */}
            <span className="cc-contextCaret" aria-hidden="true" />
          </span>
          <input
            className={`cc-fieldInput cc-fieldNumber cc-contextValue${row.invalid ? ' cc-fieldInputInvalid' : ''}`}
            type="text"
            aria-label={t('contextOverrideValue')}
            aria-invalid={row.invalid || undefined}
            value={row.text}
            disabled={disabled}
            onChange={(event) => setText(row.model, event.target.value)}
          />
          <button
            type="button"
            className="cc-iconButton"
            aria-label={t('contextOverrideRemove')}
            disabled={disabled}
            onClick={() => removeRow(row.model)}
          >
            <Icon name="close" />
          </button>
          {row.invalid ? <p className="cc-rowError cc-contextError">{invalidCopy(row.invalidReason, t, 'context')}</p> : null}
        </div>
      ))}
    </>
  )
}

/**
 * Privacy & security: the opt-in that changes where data goes. ZDR restricts
 * which upstream serves a request, so it starts off.
 */
function PrivacyCard({ state, disabled, t, onEdit, onReset, expanded, onToggle }: FormCardProps & FoldProps) {
  return (
    <FoldableGroup
      id="privacy"
      title={t('privacyTitle')}
      expanded={expanded}
      onToggle={onToggle}
      badges={<GroupSummary parts={[stagedSwitch(state.zdr, false) ? t('zdrSummaryOn') : t('zdrSummaryOff')]} />}
    >
      <ToggleField
        id="cc-zdr"
        label={t('zdr')}
        hint={t('zdrHint')}
        state={state.zdr}
        disabled={disabled}
        defaultChecked={false}
        onEdit={(text) => onEdit('zdr', text)}
        onReset={() => onReset('zdr')}
        t={t}
      />
    </FoldableGroup>
  )
}

/**
 * The service-status row: the official status page's public probe data, read
 * through ./service-status.ts (source order, cache TTL and every degradation
 * rule live there). It is display-only — it writes no setting and never blocks
 * Save; the link opens the page for the full history and incidents.
 */
function ServiceStatusRow({ view, t }: { view: ServiceStatusView; t: Translate<SettingsCommandCodeKey> }) {
  return (
    <SettingRow
      title={t('serviceStatusTitle')}
      tag={<ServiceStatusBadge view={view} />}
      description={
        <>
          {view.detail !== undefined ? <p>{view.detail}</p> : null}
          {view.meta !== undefined ? <p>{view.meta}</p> : null}
          {view.notice !== undefined ? <p className="cc-statusNotice">{view.notice}</p> : null}
        </>
      }
      control={
        <a className="cc-statusLink" href={STATUS_PAGE_URL} target="_blank" rel="noreferrer">
          {view.linkLabel}
        </a>
      }
    />
  )
}

/**
 * The status dot and verdict, shared by the status row and the Integrations
 * heading. The primitive's five states already carry the theme's
 * success/warn/error tokens, so the colours are the design system's own.
 */
function ServiceStatusBadge({ view }: { view: ServiceStatusView }) {
  const dot: StateDotState = view.checking ? 'ongoing'
    : view.level === 'up' ? 'done'
      : view.level === 'degraded' ? 'warning'
        : view.level === 'down' ? 'error'
          : 'idle'
  return (
    <span className="cc-statusBadge" title={view.hint}>
      <StateDot state={dot} />
      <span className="cc-statusLabel">{view.label}</span>
    </span>
  )
}

/**
 * Integrations & display: surfaces outside chat that reuse this provider. The
 * status snapshot comes from the page, which probes once per open even while
 * this group is folded — its heading shows the verdict either way.
 */
function IntegrationsCard({ state, disabled, t, onEdit, onReset, expanded, onToggle, status }: FormCardProps & FoldProps & {
  status: ServiceStatusSnapshot | undefined
}) {
  const view = serviceStatusView(status, t, Date.now())
  return (
    <FoldableGroup
      id="integrations"
      title={t('integrationsTitle')}
      expanded={expanded}
      onToggle={onToggle}
      badges={
        <>
          <ServiceStatusBadge view={view} />
          <GroupSummary parts={[stagedSwitch(state.webSearch, true) ? t('webSearchSummaryOn') : t('webSearchSummaryOff')]} />
        </>
      }
    >
      {/* Status first: it is the row a user opens this page to check when
          requests start failing, before the two opt-in display switches. */}
      <ServiceStatusRow view={view} t={t} />
      <ToggleField
        id="cc-web-search"
        label={t('webSearch')}
        hint={t('webSearchHint')}
        state={state.webSearch}
        disabled={disabled}
        defaultChecked
        onEdit={(text) => onEdit('webSearch', text)}
        onReset={() => onReset('webSearch')}
        t={t}
      />
      {/* Opt-in, and off by default: the sidebar quota card is a display
          surface, so an unset document shows nothing on the left. */}
      <ToggleField
        id="cc-show-sidebar-quota"
        label={t('showSidebarQuota')}
        hint={t('showSidebarQuotaHint')}
        state={state.showSidebarQuota}
        disabled={disabled}
        defaultChecked={false}
        onEdit={(text) => onEdit('showSidebarQuota', text)}
        onReset={() => onReset('showSidebarQuota')}
        t={t}
      />
    </FoldableGroup>
  )
}

/**
 * The "Advanced" group: the API base and the network limits. Its heading
 * names the customized count, and while folded, an invalid number (which
 * blocks save); expanded, the row's own error says it.
 */
function AdvancedSection({ state, disabled, t, onEdit, onReset, expanded, onToggle }: FormCardProps & FoldProps) {
  return (
    <FoldableGroup
      id="advanced"
      title={t('advancedSettings')}
      expanded={expanded}
      onToggle={onToggle}
      badges={
        <>
          <GroupSummary parts={[overriddenText(advancedOverriddenCount(state), t)]} />
          <InvalidBadge show={!expanded && advancedGroupInvalid(state)} t={t} />
        </>
      }
    >
      <p className="cc-groupDesc">{t('advancedSettingsHint')}</p>
      <Field
        id="cc-api-base"
        label={t('apiBase')}
        state={state.apiBase}
        disabled={disabled}
        wide
        placeholder={FIELD_DEFAULTS.apiBase}
        onEdit={(text) => onEdit('apiBase', text)}
        onReset={() => onReset('apiBase')}
        t={t}
      />
      <Field
        id="cc-request-timeout"
        label={t('requestTimeoutMs')}
        hint={t('requestTimeoutMsHint')}
        state={state.requestTimeoutMs}
        disabled={disabled}
        numeric
        decimal
        unit={t('unitSeconds')}
        placeholder={FIELD_DEFAULTS.requestTimeoutSeconds}
        onEdit={(text) => onEdit('requestTimeoutMs', text)}
        onReset={() => onReset('requestTimeoutMs')}
        t={t}
      />
      <Field
        id="cc-stream-idle-timeout"
        label={t('streamIdleTimeoutMs')}
        hint={t('streamIdleTimeoutMsHint')}
        state={state.streamIdleTimeoutMs}
        disabled={disabled}
        numeric
        decimal
        unit={t('unitSeconds')}
        placeholder={FIELD_DEFAULTS.streamIdleTimeoutSeconds}
        onEdit={(text) => onEdit('streamIdleTimeoutMs', text)}
        onReset={() => onReset('streamIdleTimeoutMs')}
        t={t}
      />
      <Field
        id="cc-transport-max-retries"
        label={t('transportMaxRetries')}
        hint={t('transportMaxRetriesHint')}
        state={state.transportMaxRetries}
        disabled={disabled}
        numeric
        unit={t('unitRetries')}
        placeholder={FIELD_DEFAULTS.transportMaxRetries}
        onEdit={(text) => onEdit('transportMaxRetries', text)}
        onReset={() => onReset('transportMaxRetries')}
        t={t}
      />
      <ToggleField
        id="cc-offload-seen-images-for-cache"
        label={t('offloadSeenImagesForCache')}
        hint={t('offloadSeenImagesForCacheHint')}
        state={state.offloadSeenImagesForCache}
        disabled={disabled}
        defaultChecked={false}
        onEdit={(text) => onEdit('offloadSeenImagesForCache', text)}
        onReset={() => onReset('offloadSeenImagesForCache')}
        t={t}
      />
    </FoldableGroup>
  )
}

/** One row of the unified account list: a stored account merged with its usage entry. */
interface AccountRowModel {
  /** Slot id: `default` or the extra account's credential reference. */
  id: string
  label: string
  /** Credential reference for extra accounts; undefined for the default slot. */
  ref: string | undefined
  isDefault: boolean
  /** Whether this page can manage the row (false for literal-only composition entries). */
  managed: boolean
  /** Whether a key resolves for this account (stored credential or a Host-side source). */
  configured: boolean
  /** Whether a stored credential exists this page could delete. */
  storedKey: boolean
  credentialKnown: boolean
  keyWritable: boolean
  usage: CommandCodeAccountUsage | undefined
}

/**
 * Merge the controller's accounts with the usage report. The default slot is
 * always first; report entries this page cannot manage (literal keys from the
 * composition config) still render, read-only, so the list names every
 * account the pool rotates through.
 */
function accountRows(state: SettingsPageState, usage: UsagePageState, t: Translate<SettingsCommandCodeKey>): AccountRowModel[] {
  const report = new Map((usage.report?.accounts ?? []).map((entry) => [entry.id, entry]))
  const defaultUsage = report.get('default')
  const rows: AccountRowModel[] = [{
    id: 'default',
    label: t('accountDefault'),
    ref: undefined,
    isDefault: true,
    managed: true,
    configured: state.apiKeyConfigured || defaultUsage?.configured === true,
    storedKey: state.apiKeyConfigured,
    credentialKnown: state.apiKeyKnown || typeof defaultUsage?.configured === 'boolean',
    keyWritable: state.apiKeyWritable,
    usage: defaultUsage,
  }]
  for (const account of state.accounts) {
    const entry = report.get(account.id)
    rows.push({
      id: account.id,
      label: account.label,
      ref: account.ref,
      isDefault: false,
      managed: true,
      configured: account.configured || entry?.configured === true,
      storedKey: account.configured,
      credentialKnown: account.credentialKnown || typeof entry?.configured === 'boolean',
      keyWritable: account.writable,
      usage: entry,
    })
  }
  const known = new Set(rows.map((row) => row.id))
  for (const entry of usage.report?.accounts ?? []) {
    if (known.has(entry.id)) continue
    known.add(entry.id)
    rows.push({
      id: entry.id,
      label: entry.label,
      ref: undefined,
      isDefault: false,
      managed: false,
      configured: entry.configured,
      storedKey: false,
      credentialKnown: true,
      keyWritable: false,
      usage: entry,
    })
  }
  return rows
}

/**
 * The row's status dot. Read top-down, so a problem always outranks "serving":
 * red for a key the Host rejected, amber while a rate limit is cooling down,
 * green for the account that is actually serving requests. A standby (or not
 * yet configured) account draws NOTHING — `cc-tabDotBlank` is an unfilled,
 * borderless dot that only holds the column so the account names stay aligned
 * with the rows that do have a verdict. Green therefore means "in use", not
 * "healthy": a wall of green dots would say nothing.
 */
function statusDotClass(row: AccountRowModel): string {
  const entry = row.usage
  if (entry?.mark === 'invalid-credential') return 'cc-tabDot cc-tabDotError'
  if (entry !== undefined && (entry.mark !== '' || entry.cooldownUntil > 0)) return 'cc-tabDot cc-tabDotWarn'
  if (row.configured && entry?.active === true) return 'cc-tabDot cc-tabDotOk'
  return 'cc-tabDot cc-tabDotBlank'
}

/**
 * The same verdict as a sentence, for the dot's tooltip. Undefined on a blank
 * dot: there is no verdict to read out, and a hover hotspot on an invisible
 * 8px mark would only invite the question it cannot usefully answer.
 */
function statusDotTitle(row: AccountRowModel, t: Translate<SettingsCommandCodeKey>): string | undefined {
  const entry = row.usage
  if (entry?.mark === 'invalid-credential') return t('usageInvalidKey')
  if (entry !== undefined && (entry.mark !== '' || entry.cooldownUntil > 0)) return t('usageCooldown')
  if (!row.credentialKnown) return t('writeStateUnknown')
  if (!row.configured) return t('apiKeyUnset')
  return entry?.active === true ? t('usageActive') : undefined
}

/** One compact quota meter for a row's summary line. */
function MiniMeter({ label, limit }: { label: string; limit: NonNullable<CommandCodeCredits['fiveHour']> }) {
  const ratio = windowRatio(limit.used, limit.cap)
  const percent = limit.cap > 0 ? `${Math.round(ratio * 100)}%` : formatMoney(limit.used)
  return (
    <span className="cc-miniMeter" title={limit.cap > 0 ? `${formatMoney(limit.used)} / ${formatMoney(limit.cap)}` : undefined}>
      <span className="cc-miniMeterLabel">{label}</span>
      <span className="cc-miniMeterTrack" aria-hidden="true">
        <span className={limit.exceeded ? 'cc-miniMeterFill cc-usageBarFillWarn' : 'cc-miniMeterFill'} style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="cc-miniMeterValue">{percent}</span>
    </span>
  )
}

/**
 * The monthly credit balance for a row's summary line: the billing endpoint's
 * `monthlyCredits` is what is LEFT, shown as the amount alone.
 */
function MonthlyBalance({ label, remaining }: { label: string; remaining: number }) {
  return (
    <span className="cc-miniMeter">
      <span className="cc-miniMeterLabel">{label}</span>
      <span className="cc-miniMeterValue">{formatMoney(Math.max(0, remaining))}</span>
    </span>
  )
}

/** A single-input inline form (paste key, rename) with confirm/cancel. */
function InlineInput({ id, label, secret, initial, placeholder, confirmLabel, disabled, t, onSubmit, onCancel }: {
  id: string
  label: string
  secret?: boolean
  initial?: string
  placeholder?: string
  confirmLabel: string
  disabled: boolean
  t: Translate<SettingsCommandCodeKey>
  onSubmit(value: string): void
  onCancel(): void
}) {
  const [value, setValue] = useState(initial ?? '')
  const [visible, setVisible] = useState(false)
  const ready = value.trim() !== ''
  return (
    <form
      className="cc-inlineForm"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready && !disabled) onSubmit(value)
      }}
    >
      <input
        id={id}
        className="cc-input"
        type={secret && !visible ? 'password' : 'text'}
        aria-label={label}
        autoComplete="new-password"
        spellCheck={false}
        autoFocus
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
        }}
      />
      <div className="cc-inlineActions">
        {secret && value !== '' ? (
          <Button variant="ghost" size="sm" type="button" onClick={() => setVisible((shown) => !shown)}>
            {visible ? t('hide') : t('show')}
          </Button>
        ) : null}
        <span className="cc-spacer" />
        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>{t('cancel')}</Button>
        <Button variant="primary" size="sm" type="submit" disabled={!ready || disabled}>{confirmLabel}</Button>
      </div>
    </form>
  )
}

/** A destructive confirmation, shown in place in the card as an error notice (no modal). */
function ConfirmBar({ text, confirmLabel, disabled, t, onConfirm, onCancel }: {
  text: string
  confirmLabel: string
  disabled: boolean
  t: Translate<SettingsCommandCodeKey>
  onConfirm(): void
  onCancel(): void
}) {
  return (
    <Notice
      tone="error"
      icon="warn"
      role="alertdialog"
      label={text}
      title={text}
      actions={
        <>
          <Button variant="outline" size="sm" className="cc-dangerButton" disabled={disabled} onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>{t('cancel')}</Button>
        </>
      }
    />
  )
}

type RowMode = 'key' | 'rename' | 'remove' | 'clearKey' | undefined

/** One account row: identity, status, quota summary, actions and expandable details. */
function AccountItem({ row, rows, state, usage, login, disabled, pinned, t, actions }: {
  row: AccountRowModel
  rows: readonly AccountRowModel[]
  state: SettingsPageState
  usage: UsagePageState
  login: LoginPageState
  disabled: boolean
  pinned: boolean
  t: Translate<SettingsCommandCodeKey>
  actions: AccountActions
}) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mode, setMode] = useState<RowMode>(undefined)
  const entry = row.usage
  const report = entry?.report
  const accountName = report?.account === undefined ? '' : report.account.userName || report.account.name
  const planName = report?.plan?.name ?? ''
  const credits = report?.credits
  // Only an explicit `false` means the balance was omitted (an older Host
  // never sends the flag and always sent a real number).
  const monthlyReported = credits !== undefined && credits.monthlyReported !== false
  const multi = rows.length > 1
  const loginTarget = row.ref
  const { visible: loginState, busyElsewhere } = loginStateForTarget(login, loginTarget)
  const loginBusy = loginState.phase === 'starting' || loginState.phase === 'waiting'
  const showLogin = loginState.phase !== 'idle'
  const locked = disabled || !row.managed
  const keyActions = !locked && row.keyWritable

  const items: MenuEntry[] = []
  if (row.managed && multi) {
    items.push(pinned
      ? { id: 'unpin', label: t('accountActionUnpin'), disabled: locked }
      : { id: 'pin', label: t('accountActionPin'), disabled: locked || !row.configured })
  }
  if (row.managed) {
    if (items.length > 0) items.push({ type: 'separator', id: 'sep-key' })
    items.push(
      { id: 'login', label: t('accountActionLogin'), disabled: !keyActions || loginBusy || busyElsewhere },
      { id: 'key', label: t('accountActionKey'), disabled: !keyActions },
    )
    if (!row.isDefault) items.push({ id: 'rename', label: t('accountActionRename'), disabled: locked })
    if (row.isDefault && row.storedKey) {
      items.push(
        { type: 'separator', id: 'sep-danger' },
        { id: 'clearKey', label: t('accountActionClearKey'), disabled: !keyActions, danger: true },
      )
    }
    if (!row.isDefault) {
      items.push(
        { type: 'separator', id: 'sep-danger' },
        { id: 'remove', label: t('accountActionRemove'), disabled: locked, danger: true },
      )
    }
  }

  const onAction = (id: string) => {
    setMenuOpen(false)
    if (id === 'pin') void actions.setActive(row.id)
    else if (id === 'unpin') void actions.setActive('')
    else if (id === 'login') actions.beginLogin(loginTarget)
    else if (id === 'key' || id === 'rename' || id === 'remove' || id === 'clearKey') setMode(id)
  }

  const models = state.accountModels[row.id] ?? []
  const ownerOf = (modelId: string): string | undefined => {
    for (const [account, list] of Object.entries(state.accountModels)) {
      if (account === row.id || !list.includes(modelId)) continue
      return rows.find((candidate) => candidate.id === account)?.label ?? account
    }
    return undefined
  }

  return (
    <div className={row.usage?.active ? 'cc-accountItem cc-accountItemActive' : 'cc-accountItem'}>
      <div className="cc-accountHead">
        <button
          type="button"
          className="cc-accountToggle"
          aria-expanded={expanded}
          aria-controls={`cc-account-${row.id}-details`}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className={statusDotClass(row)} title={statusDotTitle(row, t)} aria-hidden="true" />
          <span className="cc-accountName">{row.label}</span>
          {accountName !== '' && accountName !== row.label ? <span className="cc-usageAccount">{accountName}</span> : null}
          {planName !== '' ? <span className="cc-badgeMuted">{planName}</span> : null}
          {entry?.active && multi ? <span className="cc-badge cc-badgeOk">{t('usageActive')}</span> : null}
          {pinned ? <span className="cc-badge">{t('accountStatusPinned')}</span> : null}
          {!row.credentialKnown || !row.configured ? <span className="cc-badgeMuted">{t(row.credentialKnown ? 'apiKeyUnset' : 'writeStateUnknown')}</span> : null}
          {entry?.mark === 'invalid-credential' ? <span className="cc-badge cc-badgeError">{t('usageInvalidKey')}</span> : null}
          {entry !== undefined && entry.mark !== 'invalid-credential' && (entry.cooldownUntil > 0 || entry.mark === 'rate-limit') ? (
            <span className="cc-badge cc-badgeWarn">
              {t('usageCooldown')}{entry.cooldownUntil > 0 ? ` ${formatResetAtShort(entry.cooldownUntil)}` : ''}
            </span>
          ) : null}
          <span className="cc-spacer" />
          <Icon name="chevron" className={expanded ? 'cc-icon cc-foldChevron cc-chevronOpen' : 'cc-icon cc-foldChevron'} />
        </button>
        {items.length > 0 ? (
          <Menu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onSelect={onAction}
            items={items}
            align="end"
            portal
            anchor={
              <button
                type="button"
                className="cc-iconButton"
                aria-label={`${row.label} — ${t('accountActions')}`}
                title={t('accountActions')}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <Icon name="more" />
              </button>
            }
          />
        ) : null}
      </div>

      {/* Folded, the meters are the card's summary; expanded, the details show
          the same windows as full bars, so the summary steps aside. */}
      {!expanded && credits !== undefined && (credits.fiveHour !== undefined || credits.weekly !== undefined || monthlyReported) ? (
        <div className="cc-accountMeters">
          {credits.fiveHour !== undefined ? <MiniMeter label={t('usageFiveHour')} limit={credits.fiveHour} /> : null}
          {credits.weekly !== undefined ? <MiniMeter label={t('usageWeekly')} limit={credits.weekly} /> : null}
          {monthlyReported ? (
            <MonthlyBalance label={t('usageMonthlyLeft')} remaining={credits.monthlyCredits} />
          ) : null}
        </div>
      ) : null}

      {row.credentialKnown && !row.configured && row.managed && mode === undefined && !showLogin ? (
        <Notice
          icon={row.keyWritable ? 'info' : 'lock'}
          actions={keyActions ? (
            <>
              <Button variant="primary" size="sm" disabled={loginBusy || busyElsewhere} onClick={() => actions.beginLogin(loginTarget)}>
                {t('accountAddLogin')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMode('key')}>{t('accountAddPaste')}</Button>
            </>
          ) : undefined}
        >
          <p>{row.keyWritable ? t('accountNoKeyHint') : t('apiKeyLocked')}</p>
        </Notice>
      ) : null}

      {showLogin ? <LoginStatus state={loginState} t={t} onCancel={actions.cancelLogin} /> : null}

      {mode === 'key' ? (
        <div className="cc-panel">
          <InlineInput
            id={`cc-account-${row.id}-key`}
            label={t('accountKeyPlaceholder')}
            secret
            placeholder={t('accountKeyPlaceholder')}
            confirmLabel={t('accountApply')}
            disabled={disabled || state.accountBusy}
            t={t}
            onCancel={() => setMode(undefined)}
            onSubmit={(value) => {
              void actions.setKey(row.id, value).then((ok) => {
                if (ok) setMode(undefined)
              })
            }}
          />
        </div>
      ) : null}
      {mode === 'rename' && row.ref !== undefined ? (
        <div className="cc-panel">
          <InlineInput
            id={`cc-account-${row.id}-rename`}
            label={t('accountActionRename')}
            initial={row.label}
            confirmLabel={t('accountApply')}
            disabled={disabled || state.accountBusy}
            t={t}
            onCancel={() => setMode(undefined)}
            onSubmit={(value) => {
              void actions.rename(row.ref!, value).then((ok) => {
                if (ok) setMode(undefined)
              })
            }}
          />
        </div>
      ) : null}
      {mode === 'remove' && row.ref !== undefined ? (
        <ConfirmBar
          text={t('accountRemoveConfirm', { name: row.label })}
          confirmLabel={t('accountConfirmRemove')}
          disabled={disabled || state.accountBusy}
          t={t}
          onCancel={() => setMode(undefined)}
          onConfirm={() => {
            void actions.remove(row.ref!).then((ok) => {
              if (ok) setMode(undefined)
            })
          }}
        />
      ) : null}
      {mode === 'clearKey' ? (
        <ConfirmBar
          text={t('accountClearKeyConfirm')}
          confirmLabel={t('accountConfirmClear')}
          disabled={disabled || state.accountBusy}
          t={t}
          onCancel={() => setMode(undefined)}
          onConfirm={() => {
            void actions.clearKey(row.id).then((ok) => {
              if (ok) setMode(undefined)
            })
          }}
        />
      ) : null}

      {expanded ? (
        <div id={`cc-account-${row.id}-details`} className="cc-accountDetails">
          {entry !== undefined ? (
            <AccountReport entry={entry} fetchedAt={usage.fetchedAt} t={t} headless />
          ) : (
            <p className="cc-usageHint">{usage.status === 'loading' ? t('usageLoading') : t('usageUnconfigured')}</p>
          )}
          {multi && row.managed ? (
            <SettingRow
              className="cc-rowFlush"
              title={t('accountModels')}
              titleFor={`cc-account-${row.id}-models`}
              description={t('accountModelsHint')}
              error={state.catalogFailed ? t('modelCatalogFailed') : undefined}
              control={
                <ModelMultiSelect
                  id={`cc-account-${row.id}-models`}
                  selected={models}
                  catalog={state.catalogModels}
                  disabled={disabled || state.accountBusy}
                  deferCommit
                  ownerOf={ownerOf}
                  t={t}
                  onSelect={(ids) => void actions.setModels(row.id, ids)}
                />
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** The live status of one browser sign-in: link while waiting, outcome after. */
function LoginStatus({ state, t, onCancel }: {
  state: LoginPageState
  t: Translate<SettingsCommandCodeKey>
  onCancel(): void
}) {
  const hint = loginHint(state, t)
  const busy = state.phase === 'starting' || state.phase === 'waiting'
  // loginHint's class is the verdict the Models-page card also paints; here it
  // picks the notice tone instead.
  const tone: NoticeTone = hint.className === 'cc-loginError' ? 'error' : hint.className === 'cc-loginDone' ? 'success' : 'neutral'
  const link = state.authUrl !== undefined ? (
    <a className="cc-loginLink" href={state.authUrl} target="_blank" rel="noreferrer">
      {t('loginOpenLink')}
      <Icon name="external" className="cc-icon cc-iconInline" />
    </a>
  ) : null
  return (
    <Notice
      tone={tone}
      actions={link !== null || busy ? <>{link}{busy ? <Button variant="ghost" size="sm" onClick={onCancel}>{t('loginCancel')}</Button> : null}</> : undefined}
    >
      <p title={hint.title}>{hint.text}</p>
    </Notice>
  )
}

/** The immediate account operations the list and its rows call. */
interface AccountActions {
  refreshCredentials(): void
  cleanup(ref: string): Promise<boolean>
  rename(ref: string, label: string): Promise<boolean>
  remove(ref: string): Promise<boolean>
  setKey(target: string, key: string): Promise<boolean>
  clearKey(target: string): Promise<boolean>
  setActive(id: string): Promise<boolean>
  setModels(target: string, ids: string[]): Promise<boolean>
  beginLogin(targetRef?: string): void
  cancelLogin(): void
}

/** 新增面板只负责输入和操作意图；账号、登录、命名与补偿由宿主过程负责。 */
function AddAccountPanel({ state, disabled, t, enrollment, snapshot, onClose }: {
  state: SettingsPageState
  disabled: boolean
  t: Translate<SettingsCommandCodeKey>
  enrollment: AccountEnrollmentController
  snapshot: EnrollmentPageState
  onClose(): void
}) {
  const [label, setLabel] = useState('')
  const [pasting, setPasting] = useState(false)
  const active = snapshot.active
  const busy = active !== undefined && ['creating', 'waiting', 'writing', 'cancelling', 'naming'].includes(active.phase)
  const fallbackName = t('accountNameN', { n: state.accounts.length + 2 })
  useEffect(() => { if (active?.phase === 'finished') onClose() }, [active?.phase, onClose])
  const start = (key?: string) => enrollment.begin({ mode: key === undefined ? 'browser' : 'manual',
    label: label.trim() || fallbackName, automaticName: label.trim() === '', ...(key === undefined ? {} : { key }) })
  const close = () => { enrollment.cancel(); onClose() }
  const waitingLink = active?.authUrl && active.phase === 'waiting' ? active.authUrl : undefined
  return (
    <div className="cc-panel" role="group" aria-label={t('accountAdd')}>
      <span className="cc-panelTitle">{t('accountAdd')}</span>
      <p className="cc-rowDesc">{t('accountAddHint')}</p>
      <input className="cc-input" type="text" aria-label={t('accountNamePlaceholder')} placeholder={t('accountNamePlaceholder')}
        value={label} disabled={disabled || busy} onChange={(event) => setLabel(event.target.value)} />
      {active ? (
        <Notice
          actions={waitingLink !== undefined ? (
            <a className="cc-loginLink" href={waitingLink} target="_blank" rel="noreferrer">
              {t('accountAddOpenLink')}
              <Icon name="external" className="cc-icon cc-iconInline" />
            </a>
          ) : undefined}
        >
          <p>{t(active.messageKey)}</p>
          {waitingLink !== undefined ? <p>{t('accountAddLinkHint')}</p> : null}
        </Notice>
      ) : null}
      {snapshot.error ? <Notice tone="error"><p>{t(snapshot.error)}</p></Notice> : null}
      {active?.phase === 'naming' ? (
        <div className="cc-inlineActions">
          <Button variant="primary" size="sm" disabled={disabled} onClick={() => void enrollment.name(active.suggestedName || label || fallbackName)}>{t('accountNameSaveRetry')}</Button>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => void enrollment.name()}>{t('accountNameAcceptExisting')}</Button>
          <Button variant="ghost" size="sm" onClick={close}>{t('cancel')}</Button>
        </div>
      ) : pasting ? (
        <InlineInput id="cc-add-account-key" label={t('accountKeyPlaceholder')} secret placeholder={t('accountKeyPlaceholder')}
          confirmLabel={t('accountAddConfirm')} disabled={disabled || busy} t={t}
          onCancel={close} onSubmit={(key) => { void start(key) }} />
      ) : (
        <div className="cc-inlineActions">
          <Button variant="primary" size="sm" disabled={disabled || busy} onClick={() => void start()}>{t('accountAddLogin')}</Button>
          <Button variant="ghost" size="sm" disabled={disabled || busy} onClick={() => setPasting(true)}>{t('accountAddPaste')}</Button>
          <span className="cc-spacer" />
          <Button variant="ghost" size="sm" onClick={close}>{t('cancel')}</Button>
        </div>
      )}
      {busy && active?.phase !== 'naming' && pasting ? <Button variant="ghost" size="sm" onClick={close}>{t('accountAddCancel')}</Button> : null}
    </div>
  )
}

/**
 * The unified account card: every account the pool rotates through, one row
 * each, with its status and quota inline — so one account's facts no longer
 * have to be cross-read across separate surfaces.
 */
function AccountsCard({ t, state, usage, login, disabled, actions, onRefresh, openAnalytics, createEnrollment, expanded, onToggle }: FoldProps & {
  t: Translate<SettingsCommandCodeKey>
  state: SettingsPageState
  usage: UsagePageState
  login: LoginPageState
  disabled: boolean
  actions: AccountActions
  onRefresh(): void
  /** Opens the model-usage dashboard. Absent when the Host exposes no panel seam. */
  openAnalytics?: (() => void) | undefined
  createEnrollment(): AccountEnrollmentController
}) {
  const [adding, setAdding] = useState(false)
  const [enrollment] = useState(createEnrollment)
  const snapshot = useSyncExternalStore(enrollment.store.subscribe, enrollment.store.getSnapshot)
  useEffect(() => { enrollment.activate(); return () => enrollment.dispose() }, [enrollment])
  const closeAdd = useCallback(() => setAdding(false), [])
  const { loading, shouldRefresh } = usageCardState(usage)
  // Ask the Host on first paint: CLI auth and composition keys are not
  // represented by browser credential references.
  useEffect(() => {
    if (shouldRefresh) onRefresh()
  }, [shouldRefresh, onRefresh])
  const rows = accountRows(state, usage, t).filter((row) => row.ref === undefined || !state.accountEnrollmentRefs.includes(row.ref))
  const multi = rows.length > 1
  const pinnedRow = rows.find((row) => row.id === state.activeAccount)
  const issues = accountIssues(rows.map((row) => row.usage))
  return (
    <FoldableGroup
      id="accounts"
      title={t('accountsTitle')}
      divided={false}
      expanded={expanded}
      onToggle={onToggle}
      badges={
        <>
          <GroupSummary parts={[rows.length === 1 ? t('accountsSummaryOne') : t('accountsSummaryMany', { count: rows.length })]} />
          {issues.count > 0 ? (
            <span className={issues.severe ? 'cc-badge cc-badgeError' : 'cc-badge cc-badgeWarn'}>
              {t('accountsSummaryIssues', { count: issues.count })}
            </span>
          ) : null}
        </>
      }
      action={
        <Button variant="ghost" size="sm" icon={<Icon name="refresh" />} disabled={loading} onClick={() => { onRefresh(); void enrollment.refresh() }}>
          {loading ? t('usageRefreshing') : t('usageRefresh')}
        </Button>
      }
    >
      <p className="cc-groupDesc">{multi ? t('accountsRotationHint') : t('accountsHint')}</p>
      {multi ? (
        <div className="cc-accountMode">
          <span>{pinnedRow !== undefined ? t('accountModePinned', { name: pinnedRow.label }) : t('accountModeAuto')}</span>
          {pinnedRow !== undefined ? (
            <Button variant="ghost" size="sm" disabled={disabled || state.accountBusy} onClick={() => void actions.setActive('')}>
              {t('accountActionUnpin')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {/* Every account-level result is the same Notice block: a hard failure
          is an error, an operation that is half done and offers a retry is a
          warning. The retry buttons stay outline so they read as actions. */}
      {(() => {
        const writeNotice = settingsWriteNotice(state.accountResult, t)
        const notices: ReactNode[] = []
        if (usage.status === 'error') {
          notices.push(
            <Notice key="usage" tone="error">
              <p>{t('usageError')}{usage.error !== undefined && usage.error !== '' ? ` — ${usage.error}` : ''}</p>
            </Notice>,
          )
        }
        if (writeNotice || state.accountFailed !== undefined) {
          notices.push(<Notice key="op" tone="error"><p>{writeNotice || t('accountOpFailed')}</p></Notice>)
        }
        if (state.credentialRefreshFailed || state.accountResult?.refreshFailed || state.saveResult?.refreshFailed) {
          notices.push(
            <Notice key="refresh" tone="warn" actions={<Button variant="outline" size="sm" onClick={actions.refreshCredentials}>{t('writeRefreshRetry')}</Button>}>
              <p>{t('writeRefreshFailed')}</p>
            </Notice>,
          )
        }
        if (!adding && snapshot.error) {
          notices.push(<Notice key="enroll" tone="error"><p>{t(snapshot.error)}</p></Notice>)
        }
        if (state.pendingCredentialCleanup.length > 0) {
          notices.push(
            <Notice
              key="cleanup"
              tone="warn"
              actions={
                <Button variant="outline" size="sm" disabled={disabled || state.accountBusy}
                  onClick={() => { for (const ref of state.pendingCredentialCleanup) void actions.cleanup(ref) }}>
                  {t('accountCleanupRetry')}
                </Button>
              }
            >
              <p>{t('accountCleanupPending')}</p>
            </Notice>,
          )
        }
        for (const record of snapshot.pending.filter((candidate) => candidate.id !== snapshot.active?.id)) {
          notices.push(
            <Notice
              key={record.id}
              tone="warn"
              actions={
                <>
                  {record.phase === 'naming' && record.suggestedName ? (
                    <Button variant="outline" size="sm" disabled={disabled} onClick={() => void enrollment.recover(record, record.suggestedName)}>{t('accountNameSaveRetry')}</Button>
                  ) : null}
                  <Button variant="outline" size="sm" disabled={disabled} onClick={() => void enrollment.recover(record)}>
                    {record.phase === 'naming' ? t('accountNameAcceptExisting') : t('accountEnrollmentCleanupRetry')}
                  </Button>
                </>
              }
            >
              <p>{record.ref}{t('accountRefSeparator')}{t(record.messageKey)}</p>
            </Notice>,
          )
        }
        if (snapshot.active?.phase === 'cleanup-needed') {
          notices.push(
            <Notice
              key="active-cleanup"
              tone="warn"
              actions={<Button variant="outline" size="sm" disabled={disabled} onClick={() => void enrollment.recover(snapshot.active!)}>{t('accountEnrollmentCleanupRetry')}</Button>}
            >
              <p>{t(snapshot.active.messageKey)}</p>
            </Notice>,
          )
        }
        return notices.length > 0 ? <div className="cc-notices">{notices}</div> : null
      })()}
      <div className="cc-accountList">
        {rows.map((row) => (
          <AccountItem
            key={row.id}
            row={row}
            rows={rows}
            state={state}
            usage={usage}
            login={login}
            disabled={disabled}
            pinned={state.activeAccount === row.id}
            t={t}
            actions={actions}
          />
        ))}
      </div>
      {adding ? (
        <AddAccountPanel
          state={state}
          disabled={disabled}
          t={t}
          enrollment={enrollment}
          snapshot={snapshot}
          onClose={closeAdd}
        />
      ) : null}
      {/* One action row under the list: Add account leads, the analytics exit
          trails it as a quieter ghost button (the 14-character label would
          crowd the group heading). The Host may expose no panel seam at all,
          hence the optional render; while the add panel is open it replaces
          the add button. */}
      {!adding || openAnalytics ? (
        <div className="cc-accountActions">
          {!adding ? (
            <Button variant="outline" size="md" icon={<Icon name="plus" />} disabled={disabled} onClick={() => { enrollment.reset(); setAdding(true) }}>
              {t('accountAdd')}
            </Button>
          ) : null}
          <span className="cc-spacer" />
          {openAnalytics ? (
            <Button variant="ghost" size="md" icon={<Icon name="chart" />} className="cc-analyticsEntry" onClick={openAnalytics}>
              <span className="cc-analyticsEntryText">{t('openAnalytics')}</span>
              <Icon name="arrowRight" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </FoldableGroup>
  )
}

/**
 * Show the save bar's "saved" confirmation for a short window after each accepted save.
 * The controller only counts saves (`savedCount`); the flash timing lives
 * here so the state machine stays timer-free.
 */
function useSavedFlash(tick: number): boolean {
  const [visible, setVisible] = useState(false)
  // The count lives in the shared controller and outlives this component, so
  // a remount (switching settings pages, reopening settings) sees a non-zero
  // count it did not witness. Only a save landing while mounted may flash.
  const seen = useRef(tick)
  useEffect(() => {
    if (tick === seen.current) return
    seen.current = tick
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(timer)
  }, [tick])
  return visible
}

/**
 * The update hint: one throttled npm-registry check per page open (the
 * throttle and all failure handling live in ./update.ts). Resolves to the
 * newest published version when it is newer than this build, else undefined —
 * every failure mode degrades to no hint at all.
 */
function usePluginUpdate(): string | undefined {
  const [available, setAvailable] = useState<string | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    void checkForUpdate({
      currentVersion: PLUGIN_VERSION,
      now: Date.now(),
      store: localStorageUpdateStore(),
    }).then((version) => {
      if (!cancelled) setAvailable(version)
      // A rejected checkForUpdate would be a bug (it catches internally);
      // swallow it regardless — the footer must never break the page.
    }, () => {})
    return () => {
      cancelled = true
    }
  }, [])
  return available
}

/**
 * The service status: paint the cached snapshot immediately, then run one
 * throttled check per page open (the TTL and every failure path live in
 * ./service-status.ts, which never rejects). The probe is public data, so it
 * needs neither the Host nor a key.
 */
function useServiceStatus(): ServiceStatusSnapshot | undefined {
  const [snapshot, setSnapshot] = useState<ServiceStatusSnapshot | undefined>(
    () => readCachedServiceStatus(localStorageServiceStatusStore()),
  )
  useEffect(() => {
    let cancelled = false
    void checkServiceStatus({ store: localStorageServiceStatusStore() }).then((next) => {
      if (!cancelled) setSnapshot(next)
      // A rejection here would be a bug — checkServiceStatus catches every
      // source failure — but the settings page must never break on a probe.
    }, () => {})
    return () => {
      cancelled = true
    }
  }, [])
  return snapshot
}

/**
 * The page's fold state, read once from this browser's storage and written
 * back on every change (./group-fold.ts holds the defaults and fallbacks).
 */
function useGroupFold(): [FoldState, (next: FoldState) => void] {
  const [store] = useState(localStorageFoldStore)
  const [fold, setFoldState] = useState<FoldState>(() => store.read())
  const setFold = useCallback((next: FoldState) => {
    setFoldState(next)
    store.write(next)
  }, [store])
  return [fold, setFold]
}

type SaveBarTone = 'pending' | 'error' | 'success'

interface SaveBarView {
  visible: boolean
  tone: SaveBarTone
  message: string
  /** Whether Discard/Save apply (hidden while only the saved confirmation shows). */
  actions: boolean
}

/**
 * What the save bar says. It exists only while there is something to act on
 * or to confirm: pending edits, a save in flight, a failure, or the brief
 * confirmation after a save landed. Account operations never reach it, they
 * commit on their own.
 */
function saveBarView(state: SettingsPageState, savedVisible: boolean, t: Translate<SettingsCommandCodeKey>): SaveBarView {
  const notice = settingsWriteNotice(state.saveResult, t)
  if (notice) return { visible: true, tone: state.failed ? 'error' : 'pending', message: notice, actions: state.dirty || state.failed }
  if (state.failed) return { visible: true, tone: 'error', message: t('saveFailed'), actions: state.dirty || state.failed }
  if (state.dirty || state.saving) {
    return state.invalid
      ? { visible: true, tone: 'error', message: t('saveInvalid'), actions: true }
      : { visible: true, tone: 'pending', message: t('unsavedChanges'), actions: true }
  }
  if (savedVisible) return { visible: true, tone: 'success', message: t('saved'), actions: false }
  return { visible: false, tone: 'success', message: '', actions: false }
}

/** The save bar's leading status mark: a soft dot while pending, a glyph once there is an outcome. */
function SaveBarIcon({ tone }: { tone: SaveBarTone }) {
  if (tone === 'pending') return <span className="cc-saveBarIcon" aria-hidden="true"><span className="cc-saveBarPulse" /></span>
  return (
    <span className="cc-saveBarIcon" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6.5" />
        {tone === 'success' ? <path d="M5.2 8.2l1.9 1.9 3.7-3.9" /> : <path d="M8 4.8v3.6M8 11.1v.1" />}
      </svg>
    </span>
  )
}

/**
 * The floating save bar: pinned to the bottom of the settings scrollport and
 * slid out of view when there is nothing to save. It stays mounted so it can
 * animate out, and keeps showing its last message while it does (the state
 * that hid it has no message of its own).
 */
function SaveBar({ view, state, t, onDiscard, onSave, onLocate }: {
  view: SaveBarView
  state: SettingsPageState
  t: Translate<SettingsCommandCodeKey>
  onDiscard(): void
  onSave(): void
  /** Opens the groups holding an invalid draft and focuses the first one. */
  onLocate(): void
}) {
  const last = useRef(view)
  if (view.visible) last.current = view
  const shown = view.visible ? view : last.current
  return (
    <div className="cc-saveBarDock">
      <div
        className={`cc-saveBar cc-saveBar-${shown.tone}${view.visible ? ' cc-saveBarShown' : ''}`}
        role="region"
        aria-label={t('save')}
        aria-hidden={!view.visible}
      >
        <SaveBarIcon tone={shown.tone} />
        <p className="cc-saveBarText" role="status" aria-live="polite" title={shown.message}>{shown.message}</p>
        {shown.actions ? (
          <div className="cc-saveBarActions">
            {/* The harness Button at its 36px size; the bar's 16px corners are
                its 12px corners plus the 4px inset, so the two stay concentric.
                Save stays disabled while a draft is invalid; Locate is how the
                bar points at it, since that draft may sit in a folded group. */}
            {state.invalid ? (
              <Button variant="ghost" size="md" disabled={!view.visible} onClick={onLocate}>
                {t('saveLocate')}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="md"
              disabled={!view.visible || (!state.dirty && !state.failed) || state.saving}
              onClick={onDiscard}
            >
              {t('discard')}
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!view.visible || !state.dirty || state.invalid || state.saving}
              onClick={onSave}
            >
              {t(state.saving ? 'saving' : 'save')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** The settings page body: accounts, then the staged provider settings. */
export function CommandCodeSettingsPage(props: CommandCodeSettingsProps) {
  const { t } = props
  const state = props.useCommandCodeSettings((snapshot) => snapshot)
  const usage = props.useCommandCodeUsage((snapshot) => snapshot)
  const login = props.useCommandCodeLogin((snapshot) => snapshot)
  const disabled = !state.writable
  const savedVisible = useSavedFlash(state.savedCount)
  const updateVersion = usePluginUpdate()
  // 账号行共享稳定的操作对象；新增账号的过程则由页面自己的控制器持有。
  const {
    renameAccount, removeAccount, retryCredentialCleanup, setAccountKey, clearAccountKey,
    setActiveAccount, setAccountModels, beginLogin, cancelLogin, refreshCredentials,
  } = props
  const actions = useMemo<AccountActions>(() => ({
    rename: renameAccount,
    remove: removeAccount,
    cleanup: retryCredentialCleanup,
    refreshCredentials,
    setKey: setAccountKey,
    clearKey: clearAccountKey,
    setActive: setActiveAccount,
    setModels: setAccountModels,
    beginLogin,
    cancelLogin,
  }), [renameAccount, removeAccount, retryCredentialCleanup, setAccountKey, clearAccountKey, setActiveAccount, setAccountModels, beginLogin, cancelLogin, refreshCredentials])
  const bar = saveBarView(state, savedVisible, t)
  const form = { state, disabled, t, onEdit: props.edit, onReset: props.resetField }
  const status = useServiceStatus()
  const [fold, setFold] = useGroupFold()
  const foldProps = (group: FoldGroup) => ({ expanded: fold[group], onToggle: () => setFold({ ...fold, [group]: !fold[group] }) })
  const everyOpen = allExpanded(fold)
  // Locate: open every group holding an invalid draft, then — once the
  // re-render has unhidden it — focus the first invalid control in page order.
  const sectionRef = useRef<HTMLElement>(null)
  const [locateTick, setLocateTick] = useState(0)
  useEffect(() => {
    if (locateTick === 0) return
    const target = sectionRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (target === null || target === undefined) return
    target.scrollIntoView({ block: 'center' })
    target.focus({ preventScroll: true })
  }, [locateTick])
  const locate = () => {
    setFold(expandGroups(fold, invalidGroups(state)))
    setLocateTick((tick) => tick + 1)
  }
  return (
    <section ref={sectionRef} className={bar.visible ? 'cc-section cc-sectionWithBar' : 'cc-section'} aria-label={t('title')}>
      <div className="cc-pageHead">
        <h2 className="cc-title">{t('title')}</h2>
        <span className="cc-spacer" />
        <Button variant="ghost" size="sm" onClick={() => setFold(setAllGroups(!everyOpen))}>
          {everyOpen ? t('collapseAll') : t('expandAll')}
        </Button>
      </div>
      <p className="cc-intro">{t('intro')}</p>
      {!state.writable ? <Notice icon="lock"><p>{t('readOnly')}</p></Notice> : null}
      <AccountsCard
        t={t}
        state={state}
        usage={usage}
        login={login}
        disabled={disabled}
        actions={actions}
        onRefresh={props.refreshUsage}
        openAnalytics={props.openAnalytics}
        createEnrollment={props.createEnrollment}
        {...foldProps('accounts')}
      />
      <ModelsCard
        {...form}
        {...foldProps('models')}
        onSelect={props.editVisibleModels}
        onClear={props.clearVisibleModels}
        onOverrides={props.editContextWindowOverrides}
      />
      <PrivacyCard {...form} {...foldProps('privacy')} />
      <IntegrationsCard {...form} {...foldProps('integrations')} status={status} />
      <AdvancedSection {...form} {...foldProps('advanced')} />
      <p className="cc-version">
        Command Code Provider v{PLUGIN_VERSION}
        {updateVersion !== undefined ? (
          <>
            {' · '}
            <a
              className="cc-versionLink"
              href={PLUGIN_RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              title={t('updateHint')}
            >
              v{updateVersion} {t('updateAvailable')}
            </a>
          </>
        ) : null}
      </p>
      <SaveBar view={bar} state={state} t={t} onDiscard={props.discard} onSave={props.save} onLocate={locate} />
    </section>
  )
}
