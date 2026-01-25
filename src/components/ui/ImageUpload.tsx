import { forwardRef, useRef, useState, useCallback } from 'react';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import ImageOutlined from '@mui/icons-material/ImageOutlined';

interface ImageUploadProps {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string | null;
  onChange?: (file: File | null) => void;
  onRemove?: () => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  loading?: boolean;
  showRemoveButton?: boolean;
  compact?: boolean;
  rounded?: boolean;
}

export const ImageUpload = forwardRef<HTMLInputElement, ImageUploadProps>(
  (
    {
      label,
      error,
      helperText,
      value,
      onChange,
      onRemove,
      accept = 'image/jpeg,image/png,image/webp',
      maxSize = 5 * 1024 * 1024,
      disabled = false,
      loading = false,
      showRemoveButton = true,
      compact = false,
      rounded = false,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const displayImage = preview || value;

    const handleFileChange = useCallback(
      (file: File | null) => {
        if (!file) {
          setPreview(null);
          onChange?.(null);
          return;
        }

        // Validar tipo
        const allowedTypes = accept.split(',').map((t) => t.trim());
        if (!allowedTypes.includes(file.type)) {
          return;
        }

        // Validar tamanho
        if (file.size > maxSize) {
          return;
        }

        // Criar preview local
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        onChange?.(file);
      },
      [accept, maxSize, onChange]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      handleFileChange(file);
    };

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (disabled || loading) return;

        const file = e.dataTransfer.files?.[0] || null;
        handleFileChange(file);
      },
      [disabled, loading, handleFileChange]
    );

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !loading) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleClick = () => {
      if (!disabled && !loading) {
        inputRef.current?.click();
      }
    };

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      setPreview(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      onRemove?.();
      onChange?.(null);
    };

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
    };

    return (
      <div className={compact ? 'w-48' : 'w-full'}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}

        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed transition-colors cursor-pointer
            ${rounded ? 'rounded-full' : 'rounded-lg'}
            ${isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}
            ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
            ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-400'}
            ${displayImage ? 'p-2' : compact ? 'p-4' : 'p-6'}
            ${rounded && compact ? 'aspect-square' : ''}
          `}
        >
          <input
            ref={(node) => {
              (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            disabled={disabled || loading}
            className="hidden"
          />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Enviando...
              </p>
            </div>
          ) : displayImage ? (
            <div className={`relative ${compact ? 'aspect-square w-full' : 'aspect-video w-full max-w-xs mx-auto'}`}>
              <img
                src={displayImage}
                alt="Preview"
                className={`w-full h-full ${rounded ? 'object-cover rounded-full' : 'object-contain rounded-lg'}`}
              />
              {showRemoveButton && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                >
                  <DeleteOutline className="w-4 h-4" style={{ fontSize: 16 }} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`${compact ? 'p-2 mb-2' : 'p-3 mb-3'} bg-gray-100 dark:bg-gray-700 rounded-full`}>
                {isDragging ? (
                  <ImageOutlined className={compact ? 'w-5 h-5' : 'w-6 h-6'} style={{ fontSize: compact ? 20 : 24 }} />
                ) : (
                  <CloudUploadOutlined className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} text-gray-400`} style={{ fontSize: compact ? 20 : 24 }} />
                )}
              </div>
              <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-300`}>
                <span className="font-medium text-primary-600 dark:text-primary-400">
                  {compact ? 'Enviar' : 'Clique para enviar'}
                </span>
                {!compact && ' ou arraste uma imagem'}
              </p>
              {!compact && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG ou WebP (max. {formatSize(maxSize)})
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

ImageUpload.displayName = 'ImageUpload';
