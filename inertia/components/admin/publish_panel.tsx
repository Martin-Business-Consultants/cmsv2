import { useState, type ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { CalendarClock, Eye, History, Pin } from 'lucide-react'
import type { Status } from '#types/content'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import Postbox from '~/components/admin/postbox'
import ConfirmAction from '~/components/admin/confirm_action'
import { formatDateTime, fromZonedInput, getTimeZone, toZonedInput } from '~/lib/format'
import { cn } from '~/lib/utils'

const STATUS_LABELS: Record<Status, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

export function timeZoneName() {
  return getTimeZone()
}

export function toLocalInput(iso: string | null | undefined) {
  return toZonedInput(iso)
}

export function fromLocalInput(value: string) {
  if (!value) return null
  return fromZonedInput(value)
}

function isFuture(iso: string | null | undefined) {
  return !!iso && new Date(iso).getTime() > Date.now()
}

export type ScheduleState = {
  status: Status
  publishAt: string | null
  unpublishAt: string | null
}

export type PublishTarget = {
  noun: string
  savedStatus: Status | null
  publishedAt: string | null
  versionsCount: number
  versionsHref?: string
  previewHref?: string
  trashHref?: string
  canDelete: boolean
}

function Line({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function InlineEdit({
  label,
  open,
  onToggle,
}: {
  label: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className="text-primary ml-1 text-sm underline underline-offset-4"
      aria-expanded={open}
      aria-label={label}
      onClick={onToggle}
    >
      {open ? 'Close' : 'Edit'}
    </button>
  )
}

export default function PublishPanel({
  target,
  state,
  errors,
  canPublish,
  statusful = true,
  dirty,
  processing,
  onChange,
  onSubmit,
}: {
  target: PublishTarget
  state?: ScheduleState
  errors?: Record<string, string | undefined>
  canPublish: boolean
  statusful?: boolean
  dirty: boolean
  processing: boolean
  onChange?: (changes: Partial<ScheduleState>) => void
  onSubmit: (status?: Status) => void
}) {
  const [editingStatus, setEditingStatus] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(
    Boolean(errors?.publishAt || errors?.unpublishAt)
  )
  const status = state?.status ?? 'draft'
  const persisted = target.savedStatus !== null
  const scheduled = statusful && status !== 'published' && isFuture(state?.publishAt)
  const willUnpublish = statusful && status === 'published' && isFuture(state?.unpublishAt)
  const zone = timeZoneName()

  let primary: { label: string; status?: Status } | null = null
  if (canPublish) {
    if (!statusful) primary = { label: 'Update' }
    else if (status === 'draft') {
      primary = scheduled ? { label: 'Schedule' } : { label: 'Publish', status: 'published' }
    } else primary = { label: persisted ? 'Update' : 'Save' }
  }

  const notice = canPublish
    ? null
    : statusful && target.savedStatus !== 'published'
      ? "Your role can't publish. Save it as a draft, and someone who can publishes it."
      : persisted
        ? `This ${target.noun} is live, and your role can't publish, so it can't be changed here.`
        : null

  const lines =
    (statusful && !!state && !!onChange) || target.versionsCount > 0 || !!notice || dirty

  const footer =
    target.trashHref || primary ? (
      <div
        className={cn(
          'bg-muted/40 flex items-center justify-between gap-2 rounded-b-xl px-4 py-3',
          (lines || statusful) && 'border-t'
        )}
      >
        {target.trashHref && target.canDelete ? (
          <ConfirmAction
            href={target.trashHref}
            title={`Move this ${target.noun} to the trash?`}
            description="It goes to the trash, where it can be restored."
            confirmLabel="Move to Trash"
            trigger={
              <button
                type="button"
                className="text-destructive text-sm underline-offset-4 hover:underline"
              >
                Move to Trash
              </button>
            }
          />
        ) : (
          <span />
        )}
        {primary && (
          <Button
            type="button"
            disabled={processing}
            onClick={() => onSubmit(primary.status)}
            data-publish-action={primary.label}
          >
            {processing ? 'Saving…' : primary.label}
          </Button>
        )}
      </div>
    ) : null

  return (
    <Postbox id="publish" title="Publish" flush footer={footer}>
      {statusful && (status === 'draft' || target.previewHref) && (
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          {status === 'draft' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => onSubmit('draft')}
            >
              Save Draft
            </Button>
          ) : (
            <span />
          )}
          {target.previewHref && (
            <Button asChild variant="outline" size="sm">
              <a href={target.previewHref} target="_blank" rel="noreferrer">
                <Eye />
                Preview
              </a>
            </Button>
          )}
        </div>
      )}
      {lines && (
        <div className="grid gap-3 px-4 py-4 text-sm">
          {statusful && state && onChange && (
            <>
              <Line icon={<Pin />}>
                <span>
                  Status: <strong className="font-semibold">{STATUS_LABELS[status]}</strong>
                </span>
                <InlineEdit
                  label="Edit status"
                  open={editingStatus}
                  onToggle={() => setEditingStatus((value) => !value)}
                />
                {editingStatus && (
                  <div className="mt-2">
                    <Select
                      value={status}
                      onValueChange={(value) => onChange({ status: value as Status })}
                    >
                      <SelectTrigger className="w-full" aria-label="Status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as Status[]).map((option) => (
                          <SelectItem key={option} value={option}>
                            {STATUS_LABELS[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {errors?.status && <p className="text-destructive mt-1 text-xs">{errors.status}</p>}
              </Line>
              <Line icon={<CalendarClock />}>
                <span>
                  {scheduled ? (
                    <>
                      Scheduled for{' '}
                      <strong className="font-semibold">{formatDateTime(state.publishAt)}</strong>
                    </>
                  ) : status === 'published' && target.publishedAt ? (
                    <>
                      Published on{' '}
                      <strong className="font-semibold">
                        {formatDateTime(target.publishedAt)}
                      </strong>
                    </>
                  ) : (
                    <>
                      Publish <strong className="font-semibold">immediately</strong>
                    </>
                  )}
                </span>
                <InlineEdit
                  label="Edit schedule"
                  open={editingSchedule}
                  onToggle={() => setEditingSchedule((value) => !value)}
                />
                {editingSchedule && (
                  <div className="mt-2 grid gap-3">
                    <ScheduleInput
                      id="publishAt"
                      label="Publish at"
                      help="The status flips to published when this time arrives. Leave blank to publish by hand."
                      zone={zone}
                      value={state.publishAt}
                      error={errors?.publishAt}
                      onChange={(publishAt) => onChange({ publishAt })}
                    />
                    <ScheduleInput
                      id="unpublishAt"
                      label="Unpublish at"
                      help="The status flips to archived when this time arrives, for time-limited content."
                      zone={zone}
                      value={state.unpublishAt}
                      error={errors?.unpublishAt}
                      onChange={(unpublishAt) => onChange({ unpublishAt })}
                    />
                  </div>
                )}
              </Line>
              {willUnpublish && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  Will unpublish {formatDateTime(state.unpublishAt)}.
                </p>
              )}
            </>
          )}
          {target.versionsCount > 0 && (
            <Line icon={<History />}>
              <span>
                Revisions: <strong className="font-semibold">{target.versionsCount}</strong>
              </span>
              {target.versionsHref && (
                <Link
                  href={target.versionsHref}
                  className="text-primary ml-1 underline-offset-4 hover:underline"
                >
                  Browse
                </Link>
              )}
            </Line>
          )}
          {notice && (
            <p
              data-publish-notice
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >
              {notice}
            </p>
          )}
          {dirty && <p className="text-muted-foreground text-xs">You have unsaved changes.</p>}
        </div>
      )}
    </Postbox>
  )
}

function ScheduleInput({
  id,
  label,
  help,
  zone,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  help: string
  zone: string
  value: string | null
  error?: string
  onChange: (value: string | null) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="datetime-local"
        step={1}
        autoComplete="off"
        value={toLocalInput(value)}
        onChange={(event) => onChange(fromLocalInput(event.target.value))}
      />
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : (
        <p className="text-muted-foreground text-xs">
          {help} Times are {zone}.
        </p>
      )}
    </div>
  )
}
