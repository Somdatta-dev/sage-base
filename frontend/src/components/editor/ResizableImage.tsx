"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

function ResizableImageComponent({ node, updateAttributes, selected }: NodeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const src = node.attrs.src as string;
  const alt = node.attrs.alt as string | undefined;
  const title = node.attrs.title as string | undefined;
  const width = node.attrs.width as number | undefined;
  const height = node.attrs.height as number | undefined;

  useEffect(() => {
    if (width && height) {
      setAspectRatio(width / height);
    }
  }, [width, height]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!width && !height) {
      const naturalWidth = Math.min(img.naturalWidth, 800);
      const naturalHeight = (naturalWidth / img.naturalWidth) * img.naturalHeight;
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      updateAttributes({ width: naturalWidth, height: naturalHeight });
    } else {
      setAspectRatio((width || img.naturalWidth) / (height || img.naturalHeight));
    }
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, corner: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startPos.current.x;
        const deltaY = moveEvent.clientY - startPos.current.y;

        let newWidth = startPos.current.width;
        let newHeight = startPos.current.height;

        if (corner.includes("right")) {
          newWidth = Math.max(100, startPos.current.width + deltaX);
        } else if (corner.includes("left")) {
          newWidth = Math.max(100, startPos.current.width - deltaX);
        }

        // Maintain aspect ratio
        newHeight = newWidth / aspectRatio;

        updateAttributes({
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [aspectRatio, updateAttributes]
  );

  return (
    <NodeViewWrapper className="resizable-image-wrapper">
      <div
        ref={containerRef}
        className={`relative inline-block ${selected ? "ring-2 ring-sage-500 ring-offset-2 ring-offset-slate-900" : ""}`}
        style={{ width: width || "auto" }}
      >
        <img
          src={src}
          alt={alt || ""}
          title={title}
          onLoad={handleImageLoad}
          className={`rounded-lg block w-full h-auto ${isResizing ? "opacity-75" : ""}`}
          draggable={false}
        />
        
        {selected && (
          <>
            {/* Corner handles */}
            <div
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-sage-500 border-2 border-white rounded-sm cursor-nwse-resize hover:bg-sage-400"
              onMouseDown={(e) => handleMouseDown(e, "top-left")}
            />
            <div
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-sage-500 border-2 border-white rounded-sm cursor-nesw-resize hover:bg-sage-400"
              onMouseDown={(e) => handleMouseDown(e, "top-right")}
            />
            <div
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-sage-500 border-2 border-white rounded-sm cursor-nesw-resize hover:bg-sage-400"
              onMouseDown={(e) => handleMouseDown(e, "bottom-left")}
            />
            <div
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-sage-500 border-2 border-white rounded-sm cursor-nwse-resize hover:bg-sage-400"
              onMouseDown={(e) => handleMouseDown(e, "bottom-right")}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Node.create({
  name: "image",
  
  group: "block",
  
  draggable: true,
  
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});

