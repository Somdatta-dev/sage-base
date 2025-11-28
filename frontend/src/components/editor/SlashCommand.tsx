"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import tippy, { Instance as TippyInstance } from "tippy.js";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";

interface CommandItem {
  title: string;
  description: string;
  icon: LucideIcon;
  command: (props: { editor: SuggestionProps["editor"]; range: Range }) => void;
}

interface Range {
  from: number;
  to: number;
}

const commands: CommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: Heading1,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: List,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: ListOrdered,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Task List",
    description: "Track tasks with checkboxes",
    icon: CheckSquare,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleTaskList()
        .command(({ tr, dispatch }) => {
          // Insert empty paragraph after the task list
          if (dispatch) {
            const { $to } = tr.selection;
            const endPos = $to.end($to.depth);
            tr.insert(endPos, editor.schema.nodes.paragraph.create());
          }
          return true;
        })
        .run();
    },
  },
  {
    title: "Code Block",
    description: "Display code with syntax highlighting",
    icon: Code,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock()
        .command(({ tr, dispatch }) => {
          // Insert empty paragraph after the code block
          if (dispatch) {
            const { $to } = tr.selection;
            const endPos = $to.end($to.depth);
            tr.insert(endPos, editor.schema.nodes.paragraph.create());
          }
          return true;
        })
        .run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quote",
    icon: Quote,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBlockquote()
        .command(({ tr, dispatch }) => {
          // Insert empty paragraph after the blockquote
          if (dispatch) {
            const { $to } = tr.selection;
            const endPos = $to.end($to.depth);
            tr.insert(endPos, editor.schema.nodes.paragraph.create());
          }
          return true;
        })
        .run();
    },
  },
  {
    title: "Divider",
    description: "Insert a horizontal divider",
    icon: Minus,
    command: ({ editor, range }) => {
      // Divider already creates an empty paragraph after it
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Image",
    description: "Upload or embed an image",
    icon: ImageIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
          const token = localStorage.getItem("auth_token");
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"}/api/files/upload`,
            {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              body: formData,
            }
          );
          const data = await res.json();
          if (data.url) {
            // Insert image followed by empty paragraph
            editor
              .chain()
              .focus()
              .insertContent([
                { type: "image", attrs: { src: data.url } },
                { type: "paragraph" },
              ])
              .run();
          }
        } catch (err) {
          console.error("Failed to upload image:", err);
        }
      };
      input.click();
    },
  },
];

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

function CommandList({ items, command }: CommandListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const container = containerRef.current;
    const selected = container?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [items, command]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        return true;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectItem(selectedIndex);
        return true;
      }
      return false;
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, selectItem]);

  if (items.length === 0) {
    return (
      <div className="bg-[#252525] border border-[#373737] rounded-md shadow-lg p-3 text-[#9b9b9b] text-sm">
        No results
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-[#252525] border border-[#373737] rounded-md shadow-lg overflow-hidden max-h-80 overflow-y-auto min-w-[280px]"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            data-index={index}
            onClick={() => selectItem(index)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              index === selectedIndex
                ? "bg-[#373737] text-[#e3e3e3]"
                : "text-[#9b9b9b] hover:bg-[#2d2d2d]"
            }`}
          >
            <div className="w-8 h-8 rounded bg-[#2d2d2d] flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm">{item.title}</div>
              <div className="text-xs text-[#6b6b6b]">{item.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: SuggestionProps["editor"];
          range: Range;
          props: CommandItem;
        }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return commands.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(CommandList, {
                props: {
                  items: props.items,
                  command: (item: CommandItem) => {
                    props.command(item);
                  },
                },
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate: (props: SuggestionProps) => {
              component?.updateProps({
                items: props.items,
                command: (item: CommandItem) => {
                  props.command(item);
                },
              });

              if (!props.clientRect) return;

              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                popup?.[0]?.hide();
                return true;
              }
              return false;
            },

            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});

