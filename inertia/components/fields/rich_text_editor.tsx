import { useState, type ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extensions'
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react'
import type { RichTextDoc } from '#types/content'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Separator } from '~/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { AssetPickerDialog, useHasMediaLibrary } from '~/components/fields/asset_input'
import { cn } from '~/lib/utils'

const contentClass = cn(
  'min-h-48 px-4 py-3 text-sm leading-6 outline-none',
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
  '[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold',
  '[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold',
  '[&_p]:my-3',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4',
  '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1',
  '[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic',
  '[&_hr]:my-6 [&_hr]:border-border',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]',
  '[&_pre]:my-4 [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_img]:my-4 [&_img]:max-h-80 [&_img]:rounded-lg',
  '[&_img.ProseMirror-selectednode]:ring-2 [&_img.ProseMirror-selectednode]:ring-ring',
  '[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]'
)

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          className={cn('size-8', active && 'bg-accent text-accent-foreground')}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function LinkButton({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')

  function apply() {
    const chain = editor.chain().focus().extendMarkRange('link')
    if (href.trim()) chain.setLink({ href: href.trim() }).run()
    else chain.unsetLink().run()
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setHref(editor.getAttributes('link').href ?? '')
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Link"
          aria-pressed={active}
          className={cn('size-8', active && 'bg-accent text-accent-foreground')}
          onMouseDown={(event) => event.preventDefault()}
        >
          <Link2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="grid w-80 gap-2" align="start">
        <Input
          autoFocus
          value={href}
          placeholder="https://… or /page"
          onChange={(event) => setHref(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              apply()
            }
          }}
        />
        <div className="flex justify-end gap-2">
          {active && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                editor.chain().focus().extendMarkRange('link').unsetLink().run()
                setOpen(false)
              }}
            >
              Remove
            </Button>
          )}
          <Button type="button" size="sm" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const [picking, setPicking] = useState(false)
  const hasMedia = useHasMediaLibrary()
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      strike: current.isActive('strike'),
      code: current.isActive('code'),
      paragraph: current.isActive('paragraph'),
      h2: current.isActive('heading', { level: 2 }),
      h3: current.isActive('heading', { level: 3 }),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      blockquote: current.isActive('blockquote'),
      link: current.isActive('link'),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  })
  const chain = () => editor.chain().focus()

  return (
    <div className="bg-muted/40 flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
      <ToolbarButton
        label="Paragraph"
        active={state.paragraph}
        onClick={() => chain().setParagraph().run()}
      >
        <Pilcrow />
      </ToolbarButton>
      <ToolbarButton
        label="Heading"
        active={state.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton
        label="Subheading"
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state.italic}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={state.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <Underline />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={state.code}
        onClick={() => chain().toggleCode().run()}
      >
        <Code />
      </ToolbarButton>
      <LinkButton editor={editor} active={state.link} />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton
        label="Bulleted list"
        active={state.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={state.blockquote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote />
      </ToolbarButton>
      <ToolbarButton label="Divider" onClick={() => chain().setHorizontalRule().run()}>
        <Minus />
      </ToolbarButton>
      {hasMedia && (
        <ToolbarButton label="Image" onClick={() => setPicking(true)}>
          <ImagePlus />
        </ToolbarButton>
      )}
      <div className="ml-auto flex">
        <ToolbarButton label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
          <Redo2 />
        </ToolbarButton>
      </div>
      <AssetPickerDialog
        open={picking}
        onOpenChange={setPicking}
        onPick={(asset) => {
          setPicking(false)
          if (asset.isImage)
            chain()
              .setImage({ src: asset.url, alt: asset.alt ?? '' })
              .run()
          else
            chain()
              .insertContent({
                type: 'text',
                text: asset.filename,
                marks: [{ type: 'link', attrs: { href: asset.url } }],
              })
              .run()
        }}
      />
    </div>
  )
}

export default function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'Start writing…',
}: {
  id?: string
  value: RichTextDoc | null
  onChange: (value: RichTextDoc) => void
  placeholder?: string
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { target: null, rel: null } },
      }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? undefined,
    editorProps: {
      attributes: { 'id': id ?? '', 'class': contentClass, 'aria-multiline': 'true' },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as RichTextDoc),
  })

  return (
    <div className="border-input focus-within:border-ring focus-within:ring-ring/50 overflow-hidden rounded-md border shadow-xs focus-within:ring-[3px]">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}
