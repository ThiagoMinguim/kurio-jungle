import { useState, type ComponentProps } from "react";
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
}: {
  quantity: number;
  stock: number;
  label: string;
  id: string;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(quantity));
  const [touched, setTouched] = useState(false);
  const error = quantityError(draft, stock);
  return (
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
  );
}
