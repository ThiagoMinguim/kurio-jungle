import { useState, type ComponentProps } from "react";
import { Minus, Plus } from "lucide-react";
import { Field } from "./shared";
import { quantityError } from "../domain/validation";
/** Empty is an editable draft; letters, signs, decimals and exponent notation are rejected. */
export function QuantityField({
  onValueChange,
  ...props
}: Omit<ComponentProps<typeof Field>, "type" | "inputMode" | "onChange"> & {
  onValueChange: (value: string) => void;
}) {
  return (
    <Field
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      onChange={(event) => {
        if (/^[0-9]*$/.test(event.currentTarget.value))
          onValueChange(event.currentTarget.value);
      }}
    />
  );
}
export function CartQuantity({
  quantity,
  stock,
  label,
  id,
  disabled,
  onCommit,
  controls = false,
}: {
  quantity: number;
  stock: number;
  label: string;
  id: string;
  disabled: boolean;
  onCommit: (value: number) => void;
  controls?: boolean;
}) {
  const [draft, setDraft] = useState(String(quantity));
  const [touched, setTouched] = useState(false);
  const error = quantityError(draft, stock);
  const step = (change: number) => {
    const next = Math.max(
      1,
      Math.min(stock, (error ? quantity : Number(draft)) + change),
    );
    setDraft(String(next));
    setTouched(true);
    if (next !== quantity) onCommit(next);
  };
  return (
    <div className={controls ? "quantity-stepper" : undefined}>
      {controls && (
        <button
          type="button"
          aria-label={`Diminuir ${label.toLowerCase()}`}
          disabled={disabled || stock === 0 || Number(draft) <= 1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => step(-1)}
        >
          <Minus size={14} />
        </button>
      )}
      <QuantityField
        label="Quantidade"
        aria-label={label}
        id={id}
        value={draft}
        disabled={disabled}
        error={touched ? error : undefined}
        onValueChange={(value) => {
          setDraft(value);
          setTouched(true);
        }}
        onBlur={() => {
          setTouched(true);
          if (!error && Number(draft) !== quantity) onCommit(Number(draft));
        }}
      />
      {controls && (
        <button
          type="button"
          aria-label={`Aumentar ${label.toLowerCase()}`}
          disabled={disabled || stock === 0 || Number(draft) >= stock}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => step(1)}
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}
