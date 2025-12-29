import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";

import { Button, type ButtonProps } from "./ui/button";

type FormModalChildren = React.ReactNode | ((helpers: { close: () => void }) => React.ReactNode);

export type FormModalProps = {
  title: string;
  description?: string;
  triggerLabel: string;
  confirmLabel?: string;
  onSubmit: (formData: FormData, close: () => void) => Promise<void> | void;
  children: FormModalChildren;
  triggerButtonProps?: ButtonProps;
  onOpenChange?: (open: boolean) => void;
};

const FormModal = ({
  title,
  description,
  triggerLabel,
  confirmLabel = "Lưu",
  onSubmit,
  children,
  triggerButtonProps,
  onOpenChange
}: FormModalProps) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    onOpenChange?.(value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await onSubmit(formData, () => setOpen(false));
      setOpen(false);
      onOpenChange?.(false);
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => setOpen(false);
  const renderedChildren = useMemo(
    () => (typeof children === "function" ? children({ close: closeModal }) : children),
    [children]
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button {...triggerButtonProps}>{triggerLabel}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-white">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-1 text-sm text-slate-400">{description}</Dialog.Description>}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {renderedChildren}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Hủy
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : confirmLabel}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default FormModal;
