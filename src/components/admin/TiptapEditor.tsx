'use client'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { useEffect, useCallback, useRef } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading2, Heading3, Heading4, List, ListOrdered, Quote, Code,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon,
  Image as ImageIcon, Minus, Undo, Redo,
} from 'lucide-react'

const lowlight = createLowlight(common)

type TiptapEditorProps = {
  content?: string | Record<string, unknown> | null  // Tiptap JSON or HTML
  onChange: (json: Record<string, unknown>, html: string) => void
  placeholder?: string
  minHeight?: number
  onEditorReady?: (editor: Editor | null) => void
}

export default function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start writing your article…',
  minHeight = 500,
  onEditorReady,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,   // use standalone CodeBlockLowlight extension
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-[#0066FF] underline',
        },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full my-4' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-[#1F2937] text-green-400 rounded-lg p-4 font-mono text-sm my-4 overflow-x-auto',
        },
      }),
    ],
    content: content ?? '',
    editorProps: {
      attributes: {
        class: [
          'prose prose-invert max-w-none focus:outline-none',
          'prose-headings:font-bold prose-headings:text-white',
          'prose-p:text-gray-300 prose-p:leading-relaxed',
          'prose-a:text-[#0066FF] prose-a:no-underline hover:prose-a:underline',
          'prose-blockquote:border-l-4 prose-blockquote:border-[#0066FF]',
          'prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400',
          'prose-code:bg-[#1F2937] prose-code:text-green-400 prose-code:rounded prose-code:px-1',
          'px-4 py-3',
        ].join(' '),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(
        editor.getJSON() as Record<string, unknown>,
        editor.getHTML()
      )
    },
    immediatelyRender: false,   // prevents SSR hydration mismatch
  })

  // Expose the editor instance to the parent (e.g. for inserting images from a sidebar panel)
  useEffect(() => {
    onEditorReady?.(editor)
    return () => onEditorReady?.(null)
  }, [editor, onEditorReady])

  // Sync external content changes (e.g. loading existing article)
  useEffect(() => {
    if (editor && content && editor.isEmpty) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  const setLink = useCallback(() => {
    const url = window.prompt('URL')
    if (!url) return
    if (url === '') {
      editor?.chain().focus().unsetLink().run()
      return
    }
    editor?.chain().focus().setLink({ href: url }).run()
  }, [editor])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL (paste any public image URL)')
    if (url) editor?.chain().focus().setImage({ src: url }).run()
  }, [editor])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.url) {
        editor?.chain().focus().setImage({ src: data.url }).run()
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'))
      }
    } catch {
      alert('Upload failed — check your connection')
    } finally {
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [editor])

  if (!editor) return (
    <div
      style={{ minHeight }}
      className="bg-[#1F2937] rounded-lg animate-pulse"
    />
  )

  const ToolbarButton = ({
    onClick, active, disabled, title, children,
  }: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    title: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-[#0066FF] text-white'
          : 'text-gray-400 hover:text-white hover:bg-[#374151]',
        disabled ? 'opacity-30 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )

  const Divider = () => (
    <div className="w-px h-6 bg-[#374151] mx-1" />
  )

  return (
    <div className="border border-[#374151] rounded-lg overflow-hidden bg-[#1F2937]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-[#374151] bg-[#111827] sticky top-0 z-10">

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Cmd+Z)"
        ><Undo size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        ><Redo size={16} /></ToolbarButton>

        <Divider />

        {/* Text style */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Cmd+B)"
        ><Bold size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Cmd+I)"
        ><Italic size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (Cmd+U)"
        ><UnderlineIcon size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        ><Strikethrough size={16} /></ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        ><Heading2 size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        ><Heading3 size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          active={editor.isActive('heading', { level: 4 })}
          title="Heading 4"
        ><Heading4 size={16} /></ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        ><List size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        ><ListOrdered size={16} /></ToolbarButton>

        <Divider />

        {/* Blocks */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        ><Quote size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code block"
        ><Code size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        ><Minus size={16} /></ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align left"
        ><AlignLeft size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align centre"
        ><AlignCenter size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align right"
        ><AlignRight size={16} /></ToolbarButton>

        <Divider />

        {/* Insert */}
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive('link')}
          title="Insert link"
        ><LinkIcon size={16} /></ToolbarButton>
        <ToolbarButton
          onClick={addImage}
          title="Insert image URL"
        ><ImageIcon size={16} /></ToolbarButton>
        <label className="cursor-pointer p-1.5 rounded transition-colors text-gray-400 hover:text-white hover:bg-[#374151]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={handleImageUpload}
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span className="sr-only">Upload image</span>
        </label>

        {/* Word count */}
        <div className="ml-auto text-xs text-gray-500 pr-2">
          {editor.storage.characterCount?.words?.() ?? 0} words
        </div>
      </div>

      {/* Editor area */}
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}