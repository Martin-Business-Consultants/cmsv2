import type { AssetOption } from '#types/content'
import { urlFor } from '~/client'

export type UploadOutcome = {
  assets: AssetOption[]
  failures: string[]
  folder?: string
  skipped?: number
}

type UploadEvent =
  { type: 'progress'; processed: number; total: number } | ({ type: 'done' } & UploadOutcome)

export type UploadProgress = { stage: 'uploading' | 'processing'; percent: number | null }

type Listener = (progress: UploadProgress) => void

function xsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function percent(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : null
}

function sendFile(
  method: 'POST' | 'PUT',
  url: string,
  file: File,
  onProgress: Listener | undefined,
  onText?: (text: string) => void
) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    xhr.setRequestHeader('Accept', 'application/json, application/x-ndjson')
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.setRequestHeader('X-XSRF-TOKEN', xsrfToken())
    xhr.upload.onprogress = (event) =>
      onProgress?.({
        stage: 'uploading',
        percent: event.lengthComputable ? percent(event.loaded, event.total) : null,
      })
    xhr.upload.onload = () => onProgress?.({ stage: 'processing', percent: null })
    xhr.onprogress = () => onText?.(xhr.responseText)
    xhr.onload = () => {
      onText?.(xhr.responseText)
      resolve({ status: xhr.status, text: xhr.responseText })
    }
    xhr.onerror = () => reject(new Error('the connection was lost'))
    xhr.send(file)
  })
}

export async function uploadFile(
  file: File,
  options: { folder: string; unzip?: boolean; onProgress?: Listener }
): Promise<UploadOutcome> {
  const params = new URLSearchParams({ filename: file.name, folder: options.folder })
  if (options.unzip === false) params.set('unzip', '0')
  let outcome: UploadOutcome | null = null
  let read = 0

  const { status } = await sendFile(
    'POST',
    `${urlFor('admin.media.store')}?${params}`,
    file,
    options.onProgress,
    (text) => {
      const end = text.lastIndexOf('\n')
      if (end < read) return
      for (const line of text.slice(read, end).split('\n').filter(Boolean)) {
        const event = JSON.parse(line) as UploadEvent
        if (event.type === 'done') outcome = event
        else
          options.onProgress?.({
            stage: 'processing',
            percent: percent(event.processed, event.total),
          })
      }
      read = end + 1
    }
  ).catch(() => ({ status: 0, text: '' }))

  return outcome ?? { assets: [], failures: [`${file.name} could not be uploaded (${status})`] }
}

export async function replaceFile(id: number, file: File, onProgress?: Listener) {
  const params = new URLSearchParams({ filename: file.name })
  const { status, text } = await sendFile(
    'PUT',
    `${urlFor('admin.media.replace', { id })}?${params}`,
    file,
    onProgress
  )
  let body: { data?: AssetOption; errors?: string[] } = {}
  try {
    body = JSON.parse(text)
  } catch {}
  if (!body.data) throw new Error(body.errors?.join(', ') ?? `Replacing failed (${status})`)
  return body.data
}
