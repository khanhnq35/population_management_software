import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

import { Button } from "./ui/button";

type DialogConfirmProps = {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  onConfirm: () => Promise<void> | void;
  confirmLabel?: string;
};

const DialogConfirm = ({ title, description, trigger, onConfirm, confirmLabel = "Xác nhận" }: DialogConfirmProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-white">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-1 text-sm text-slate-400">{description}</Dialog.Description>}
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost">Hủy</Button>
            </Dialog.Close>
            <Button type="button" onClick={handleConfirm} disabled={loading}>
              {loading ? "Đang xử lý..." : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default DialogConfirm;
