import React, { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown as TTMD } from "tiptap-markdown";

import "./editor.css";

export default function ModalEditor({
  onSave,
  caseId,
}: {
  onSave: (caseSummary: {
    section: string;
    summary: string;
    caseId: number;
  }) => void;
  caseId: number;
}) {
  const [content, setContent] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit, // Basic formatting options
      TTMD, // Markdown support
    ],
    content, // Load initial markdown
    editorProps: {
      attributes: {
        class: "prose max-w-none p-4 min-h-[600px]",
      },
    },
    onUpdate: ({ editor }) => {
      // Update the markdown when the content changes
      setContent(editor.storage.markdown.getMarkdown());
    },
    //editable: isEditMode,
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const section = form.section.value;
    if (!section) return;
    console.log(
      section,
      content,
      caseId,
      "is the section, content, and caseId"
    );
    onSave({ section, summary: content, caseId });
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg shadow-sm overflow-y-scroll h-[600px]">
      {/* Toolbar */}
      <div className="transition-all duration-400 ease-in-out">
        <div className="transition-opacity duration-400 ease-in-out overflow-y-auto flex-none">
          <div className="toolbar flex gap-2 p-2 border-b bg-gray-50">
            <button
              className="px-2 py-1 rounded bg-white hover:bg-gray-200 disabled:opacity-50"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              disabled={
                !editor.can().chain().focus().toggleHeading({ level: 1 }).run()
              }
            >
              H1
            </button>
            <button
              className="px-2 py-1 rounded bg-white hover:bg-gray-200 disabled:opacity-50"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              disabled={
                !editor.can().chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              H2
            </button>
            <button
              className="px-2 py-1 rounded bg-white hover:bg-gray-200 disabled:opacity-50"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              disabled={
                !editor.can().chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              H3
            </button>
            <button
              className="px-2 py-1 rounded bg-white hover:bg-gray-200 disabled:opacity-50"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
            >
              Bold
            </button>
            {/* ... other buttons with same styling ... */}
          </div>

          {/* Editor */}

          <div className="flex-1 overflow-y-auto">
            {" "}
            {/* Make editor area scrollable */}
            <EditorContent className="prose max-w-none p-4" editor={editor} />
          </div>
        </div>
      </div>
      {/* Save Button */}
      <div className="border-t p-2 bg-gray-50 flex flex-row justify-end">
        <div className="transition-all duration-200 ease-in-out">
          <form onSubmit={handleSave}>
            <div className="flex flex-row gap-2">
              <input
                type="text"
                name="section"
                required
                placeholder="Section Title"
                className="rounded-md border border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 p-2"
              />
              <button
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                type="submit"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
