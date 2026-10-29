import { cloneElement, useId, useState, type ReactElement } from "react";
export function Tooltip({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
  className?: string;
}) {
  const [open, setOpen] = useState(false),
    id = useId();
  return (
    <span
      className={`icon-tooltip ${className}`}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      {cloneElement(children, { "aria-describedby": open ? id : undefined })}
      {open && (
        <span className="icon-tooltip-content" role="tooltip" id={id}>
          {label}
        </span>
      )}
    </span>
  );
}
