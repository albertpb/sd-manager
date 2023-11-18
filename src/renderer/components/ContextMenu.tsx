import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

type ContextMenuProps = {
  id: string;
  containerId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  children: any;
};

export default function ContextMenu({
  id,
  containerId,
  isOpen,
  onClose,
  onOpen,
  children,
}: ContextMenuProps) {
  const [coords, setCoords] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const menuRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const contextMenuCb = (e: MouseEvent) => {
      if (menuRef.current) {
        e.preventDefault();

        let x = e.clientX;
        let y = e.clientY;
        if (e.clientX + 225 > window.innerWidth) {
          x -= 225;
        }
        if (e.clientY + 200 > window.innerHeight) {
          y -= 200;
        }

        setCoords({
          x,
          y,
        });

        onOpen();
      }
    };

    const container = document.getElementById(containerId);
    container?.addEventListener('contextmenu', contextMenuCb);

    return () => container?.removeEventListener('contextmenu', contextMenuCb);
  }, [containerId, onOpen]);

  useEffect(() => {
    const clickCb = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', clickCb);

    return () => document.removeEventListener('mousedown', clickCb);
  }, [onClose]);

  return (
    <AnimatePresence mode="wait">
      <div ref={menuRef} id={id}>
        {isOpen && (
          <motion.ul
            className={classNames([
              'menu bg-base-200 rounded-box absolute z-[9999]',
            ])}
            style={{
              top: coords.y,
              left: coords.x,
              width: 225,
              maxHeight: 600,
            }}
            initial={{
              opacity: 0,
              scale: 0.2,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { scale: { type: 'spring', duration: 0.1 } },
            }}
          >
            {children}
          </motion.ul>
        )}
      </div>
    </AnimatePresence>
  );
}
