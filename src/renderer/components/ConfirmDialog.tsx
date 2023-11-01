import classNames from 'classnames';

interface ConfirmDialogProps {
  id: string;
  isOpen: boolean;
  onClose: (id: string) => void;
  onConfirm: (id: string) => void;
  msg: string;
}

export default function ConfirmDialog({
  id,
  isOpen,
  onClose,
  onConfirm,
  msg,
}: ConfirmDialogProps) {
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
              onClick={() => onConfirm(id)}
            >
              Yes
            </button>
            <button
              type="button"
              className="btn mx-1"
              onClick={() => onClose(id)}
            >
              No
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
