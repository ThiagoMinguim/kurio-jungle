import {
  createContext,
  useContext,
  useState,
  type FormHTMLAttributes,
} from "react";
import { validateForm, type FieldErrors } from "../domain/validation";
const Errors = createContext<FieldErrors>({});
export const useFieldError = (name?: string) => useContext(Errors)[name || ""];
export function ValidatedForm({
  mode,
  onSubmit,
  children,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & {
  mode: Parameters<typeof validateForm>[1];
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const validate = (form: HTMLFormElement) =>
    validateForm(
      Object.fromEntries(new FormData(form)) as Record<string, string>,
      mode,
    );
  return (
    <Errors.Provider value={errors}>
      <form
        {...props}
        noValidate
        onSubmit={(event) => {
          const next = validate(event.currentTarget);
          setErrors(next);
          if (Object.keys(next).length) {
            event.preventDefault();
            const field = event.currentTarget.elements.namedItem(
              Object.keys(next)[0],
            );
            if (field instanceof HTMLElement) {
              const disclosure = field.closest("details");
              if (disclosure) disclosure.open = true;
              field.focus();
            }
            return;
          }
          onSubmit?.(event);
        }}
        onChangeCapture={(event) => {
          const name =
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLSelectElement ||
            event.target instanceof HTMLTextAreaElement
              ? event.target.name
              : "";
          if (errors[name] || name === "network") {
            const next = validate(event.currentTarget);
            setErrors((previous) =>
              Object.fromEntries(
                Object.keys(previous)
                  .filter((key) => next[key])
                  .map((key) => [key, next[key]]),
              ),
            );
          }
        }}
      >
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="error-box">
            Revise os campos inválidos antes de continuar.
          </p>
        )}
        {children}
      </form>
    </Errors.Provider>
  );
}
