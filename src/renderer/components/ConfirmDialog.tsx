import { createId } from '@paralleldrive/cuid2';
import classNames from 'classnames';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  msg: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  msg,
}: ConfirmDialogProps) {
  const id = createId();

  return (
    <dialog
      id={id}
      className={classNames([
        'modal',
        {
          'modal-open': isOpen,
        },
      ])}
    >
      <div className="modal-box">
        <h3 className="font-bold text-lg">Confirm</h3>
        <p className="py-4">{msg}</p>
        <div className="modal-action flex justify-center items-center">
          <form method="dialog">
            <button
              type="button"
              className="btn btn-primary mx-1"
              onClick={() => onConfirm()}
            >
              Confirm
            </button>
            <button
              type="button"
              className="btn mx-1"
              onClick={() => onClose()}
            >
              Close
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
