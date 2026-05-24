import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Link2, List, ListOrdered, Quote, X } from "lucide-react";
import { useState, useCallback } from "react";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write something…",
  minHeight = 200,
}: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "rich-editor-body",
        spellcheck: "true",
      },
    },
  });

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url.startsWith("http") ? url : `https://${url}` })
        .run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const openLinkMenu = useCallback(() => {
    if (!editor) return;
    const existing = editor.getAttributes("link").href ?? "";
    setLinkUrl(existing);
    setLinkOpen(true);
  }, [editor]);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors cursor-pointer ${
      active
        ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
        : "text-[var(--text-color)]/50 hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
    }`;

  return (
    <div className="rich-editor-wrap border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--card-bg)]">
      {/* ── Toolbar ── */}
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-[var(--border-color)] bg-[var(--card-bg)]/60">
        {/* Bold */}
        <button
          type="button"
          title="Bold (Ctrl+B)"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={btn(editor.isActive("bold"))}
        >
          <Bold size={14} />
        </button>

        {/* Italic */}
        <button
          type="button"
          title="Italic (Ctrl+I)"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={btn(editor.isActive("italic"))}
        >
          <Italic size={14} />
        </button>

        <div className="w-px h-4 bg-[var(--border-color)] mx-1 flex-shrink-0" />

        {/* Bullet List */}
        <button
          type="button"
          title="Bullet list"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={btn(editor.isActive("bulletList"))}
        >
          <List size={14} />
        </button>

        {/* Ordered List */}
        <button
          type="button"
          title="Numbered list"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
          className={btn(editor.isActive("orderedList"))}
        >
          <ListOrdered size={14} />
        </button>

        {/* Blockquote */}
        <button
          type="button"
          title="Quote"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}
          className={btn(editor.isActive("blockquote"))}
        >
          <Quote size={14} />
        </button>

        <div className="w-px h-4 bg-[var(--border-color)] mx-1 flex-shrink-0" />

        {/* Link */}
        <button
          type="button"
          title="Insert / edit link"
          onMouseDown={(e) => { e.preventDefault(); openLinkMenu(); }}
          className={btn(editor.isActive("link") || linkOpen)}
        >
          <Link2 size={14} />
        </button>

        {/* Inline link input */}
        {linkOpen && (
          <>
            <input
              autoFocus
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); applyLink(); }
                if (e.key === "Escape") { setLinkOpen(false); setLinkUrl(""); }
              }}
              placeholder="https://..."
              className="flex-1 min-w-[140px] px-2.5 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--card-bg)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-[var(--color-primary)] text-white hover:opacity-90"
            >
              Apply
            </button>
            {editor.isActive("link") && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  setLinkOpen(false);
                }}
                className="px-2 py-1 text-xs rounded text-red-400 hover:bg-red-400/10"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setLinkOpen(false); setLinkUrl(""); }}
              className="p-1 rounded hover:bg-[var(--border-color)]/40 text-[var(--text-color)]/40"
            >
              <X size={13} />
            </button>
          </>
        )}

        {/* Keyboard hints */}
        {!linkOpen && (
          <span className="ml-auto text-[10px] text-[var(--text-color)]/25 select-none pr-1 hidden sm:block">
            Ctrl+B · Ctrl+I
          </span>
        )}
      </div>

      {/* ── Editor body ── */}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="rich-editor-content px-4 py-3 text-sm text-[var(--text-color)] focus-within:outline-none"
      />
    </div>
  );
}
