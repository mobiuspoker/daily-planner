import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import "./CustomDropdown.css";

interface Option {
  value: number | string;
  label: string;
}

interface CustomDropdownProps {
  value: number | string;
  options: Option[];
  onChange: (value: number | string) => void;
  id?: string;
}

export function CustomDropdown({ value, options, onChange, id }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        id={id}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown size={16} className={`dropdown-arrow ${isOpen ? "open" : ""}`} />
      </button>
      
      {isOpen && (
        <div className="dropdown-options" role="listbox">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              className={`dropdown-option ${option.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}