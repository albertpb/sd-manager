import classNames from 'classnames';

export type ConfirmDialogResponse = {
  type: string;
  value: any;
};

interface ConfirmDialogProps {
  response: ConfirmDialogResponse;
  isOpen: boolean;
  onClose: (response: ConfirmDialogResponse) => void;
  onConfirm: (response: ConfirmDialogResponse) => void;
  msg: string;
}

export default function ConfirmDialog({
  response,
  isOpen,
  onClose,
  onConfirm,
  msg,
}: ConfirmDialogProps) {
  return (
    <dialog
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
              onClick={() => onConfirm(response)}
            >
              Yes
            </button>
            <button
              type="button"
              className="btn mx-1"
              onClick={() => onClose(response)}
            >
              No
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
