import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@utils/cn';

const sizes = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  hideClose = false,
  className,
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-2"
            >
              <Dialog.Panel
                className={cn(
                  'w-full rounded-2xl bg-surface-800 border border-surface-700',
                  'shadow-2xl',
                  sizes[size],
                  className,
                )}
              >
                {/* Header */}
                {(title || !hideClose) && (
                  <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-surface-700">
                    <div>
                      {title && (
                        <Dialog.Title className="text-base font-semibold text-surface-100">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="mt-0.5 text-sm text-surface-500">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    {!hideClose && (
                      <button
                        onClick={onClose}
                        className="ml-4 -mt-0.5 shrink-0 h-7 w-7 rounded-lg flex items-center justify-center
                                   text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Body */}
                <div>{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

Modal.Body = function ModalBody({ children, className }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>;
};

Modal.Footer = function ModalFooter({ children, className }) {
  return (
    <div className={cn(
      'px-6 py-4 border-t border-surface-700 flex items-center justify-end gap-3',
      className
    )}>
      {children}
    </div>
  );
};
