import * as Dialog from "@radix-ui/react-dialog";
import { useState, React } from "react";

import { Button } from "./ui/button";

export type FormModalProps = {
  title: string;
  description?: string;
  triggerLabel: string;
  confirmLabel?: string;
  onSubmit: (formData: FormData, close: () => void) => Promise<void> | void;
  children: React.ReactNode;
};

const FormModal = ({ title, description, triggerLabel, confirmLabel = "Lưu", onSubmit, children }: FormModalProps) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await onSubmit(formData, () => setOpen(false));
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button>{triggerLabel}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-800 bg-slate-900 shadow-xl overflow-y-auto">
          <div className="p-6">
            <Dialog.Title className="text-lg font-semibold text-white">{title}</Dialog.Title>
            {description && <Dialog.Description className="mt-1 text-sm text-slate-400">{description}</Dialog.Description>}
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {children}
              <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-slate-900">
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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default FormModal;
