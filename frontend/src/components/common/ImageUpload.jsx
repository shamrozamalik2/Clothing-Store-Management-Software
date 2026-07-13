import { useRef, useState } from 'react';
import { PhotoIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { cn } from '@utils/cn';

export default function ImageUpload({
  value,          // current image URL (existing)
  onChange,       // called with File object or null
  label,
  accept = 'image/jpeg,image/png,image/webp',
  className,
}) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);
    onChange(file);
  }

  function handleChange(e) { handleFile(e.target.files[0]); }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }

  function clear(e) {
    e.stopPropagation();
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const displayed = preview || value;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <label className="text-sm font-medium text-surface-300">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className={cn(
          'relative group flex flex-col items-center justify-center',
          'border-2 border-dashed rounded-xl cursor-pointer transition-colors',
          'border-surface-600 hover:border-primary-500 bg-surface-800/50',
          displayed ? 'h-36' : 'h-28'
        )}
      >
        {displayed ? (
          <>
            <img src={displayed} alt="preview" className="h-full w-full object-cover rounded-xl" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <ArrowUpTrayIcon className="h-6 w-6 text-white" />
            </div>
            <button
              type="button"
              onClick={clear}
              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-surface-900/80 flex items-center justify-center text-surface-300 hover:text-white z-10"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-surface-500">
            <PhotoIcon className="h-8 w-8" />
            <span className="text-xs">Click or drop image here</span>
            <span className="text-2xs text-surface-600">JPEG, PNG, WebP · max 5 MB</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
