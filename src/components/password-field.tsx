import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./password-field.css";
import { Field } from "./shared";
export function PasswordField(props: ComponentProps<typeof Field>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-control">
      <Field {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${props.label.toLowerCase()}`}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  );
}
