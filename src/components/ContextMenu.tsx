import { useEffect, useRef } from "react";
import { LucideIcon } from "lucide-react";
import "./ContextMenu.css";

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  className?: string;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let { x, y } = position;

      // Adjust horizontal position if menu would overflow viewport
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }

      // Adjust vertical position if menu would overflow viewport
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }

      menuRef.current.style.left = `${x}px`;
      menuRef.current.style.top = `${y}px`;
    }
  }, [position]);

  return (
    <div className="context-menu" ref={menuRef}>
      {items.map((item, index) => (
        <button
          key={index}
          className={`context-menu-item ${item.className || ""}`}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.icon && (
            <span className="context-menu-icon">
              <item.icon size={14} />
            </span>
          )}
          <span className="context-menu-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}