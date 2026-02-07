import { useState, useRef, useCallback } from 'react';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ProductImage } from '../../types';
import { STORAGE_CONFIG } from '../../services/storage';
import { Loader } from './Loader';

interface ImageItem {
  id: string;
  url: string;
  file?: File; // New images that haven't been uploaded yet
  isPrimary: boolean;
  order: number;
}

interface MultiImageUploadProps {
  label?: string;
  value: ProductImage[];
  onChange: (images: ProductImage[], newFiles: File[], deletedUrls: string[]) => void;
  loading?: boolean;
  helperText?: string;
  maxImages?: number;
}

export function MultiImageUpload({
  label,
  value,
  onChange,
  loading = false,
  helperText,
  maxImages = 4,
}: MultiImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localImages, setLocalImages] = useState<ImageItem[]>(() =>
    value.map((img, index) => ({
      id: crypto.randomUUID(),
      url: img.url,
      isPrimary: img.isPrimary,
      order: img.order,
    }))
  );
  const [newFiles, setNewFiles] = useState<Map<string, File>>(new Map());
  const [deletedUrls, setDeletedUrls] = useState<string[]>([]);

  // Sync local state when value changes externally
  const syncFromValue = useCallback((newValue: ProductImage[]) => {
    setLocalImages(
      newValue.map((img, index) => ({
        id: crypto.randomUUID(),
        url: img.url,
        isPrimary: img.isPrimary,
        order: img.order,
      }))
    );
    setNewFiles(new Map());
    setDeletedUrls([]);
  }, []);

  // Emit changes to parent
  const emitChanges = useCallback(
    (
      images: ImageItem[],
      files: Map<string, File>,
      deleted: string[]
    ) => {
      const productImages: ProductImage[] = images.map((img, index) => ({
        url: img.url,
        order: index,
        isPrimary: img.isPrimary,
      }));

      const fileList = Array.from(files.values());
      onChange(productImages, fileList, deleted);
    },
    [onChange]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - localImages.length;
    if (remainingSlots <= 0) return;

    const newImages: ImageItem[] = [];
    const newFilesMap = new Map(newFiles);

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];

      // Validate file type
      if (!STORAGE_CONFIG.allowedTypes.includes(file.type)) {
        continue;
      }

      // Validate file size
      if (file.size > STORAGE_CONFIG.maxFileSize) {
        continue;
      }

      const id = crypto.randomUUID();
      const url = URL.createObjectURL(file);

      newImages.push({
        id,
        url,
        file,
        isPrimary: localImages.length === 0 && newImages.length === 0,
        order: localImages.length + newImages.length,
      });

      newFilesMap.set(id, file);
    }

    if (newImages.length > 0) {
      const updatedImages = [...localImages, ...newImages];
      setLocalImages(updatedImages);
      setNewFiles(newFilesMap);
      emitChanges(updatedImages, newFilesMap, deletedUrls);
    }

    // Reset input
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    const imageToRemove = localImages[index];
    const updatedImages = localImages.filter((_, i) => i !== index);

    // Track deleted URLs for existing images
    let updatedDeletedUrls = deletedUrls;
    if (!newFiles.has(imageToRemove.id)) {
      updatedDeletedUrls = [...deletedUrls, imageToRemove.url];
      setDeletedUrls(updatedDeletedUrls);
    }

    // Remove from new files if it was a new file
    const updatedNewFiles = new Map(newFiles);
    if (updatedNewFiles.has(imageToRemove.id)) {
      updatedNewFiles.delete(imageToRemove.id);
      URL.revokeObjectURL(imageToRemove.url);
    }

    // Ensure there's always a primary image
    if (imageToRemove.isPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    }

    setLocalImages(updatedImages);
    setNewFiles(updatedNewFiles);
    emitChanges(updatedImages, updatedNewFiles, updatedDeletedUrls);
  };

  const handleSetPrimary = (index: number) => {
    const updatedImages = localImages.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));

    setLocalImages(updatedImages);
    emitChanges(updatedImages, newFiles, deletedUrls);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updatedImages = [...localImages];
    const [removed] = updatedImages.splice(draggedIndex, 1);
    updatedImages.splice(dropIndex, 0, removed);

    // Update order values
    updatedImages.forEach((img, i) => {
      img.order = i;
    });

    setLocalImages(updatedImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
    emitChanges(updatedImages, newFiles, deletedUrls);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const canAddMore = localImages.length < maxImages;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Existing and new images */}
        {localImages.map((image, index) => (
          <div
            key={image.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 group cursor-move transition-all ${
              dragOverIndex === index
                ? 'border-primary-500 scale-105'
                : draggedIndex === index
                  ? 'border-primary-300 opacity-50'
                  : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            <img
              src={image.url}
              alt={`Imagem ${index + 1}`}
              className="w-full h-full object-cover"
              draggable={false}
            />

            {/* Drag indicator */}
            <div className="absolute top-1 left-1 p-1 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <DragIndicatorIcon className="w-4 h-4" />
            </div>

            {/* Primary indicator */}
            <button
              type="button"
              onClick={() => handleSetPrimary(index)}
              className={`absolute top-1 right-1 p-1 rounded transition-colors ${
                image.isPrimary
                  ? 'bg-yellow-500 text-white'
                  : 'bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-yellow-500'
              }`}
              title={image.isPrimary ? 'Imagem principal' : 'Definir como principal'}
            >
              {image.isPrimary ? (
                <StarIcon className="w-4 h-4" />
              ) : (
                <StarBorderIcon className="w-4 h-4" />
              )}
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute bottom-1 right-1 p-1 rounded bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              title="Remover imagem"
            >
              <DeleteIcon className="w-4 h-4" />
            </button>

            {/* Order number */}
            <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-xs font-medium bg-black/40 text-white">
              {index + 1}
            </div>
          </div>
        ))}

        {/* Add more button */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-500 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            {loading ? (
              <Loader size="sm" />
            ) : (
              <>
                <AddPhotoAlternateIcon className="w-8 h-8" />
                <span className="text-xs font-medium">Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={STORAGE_CONFIG.allowedTypes.join(',')}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Helper text */}
      {helperText && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}

      {/* Info text */}
      <p className="mt-1 text-xs text-gray-400">
        {localImages.length}/{maxImages} imagens. Arraste para reordenar. Clique na estrela para definir a imagem principal.
      </p>
    </div>
  );
}
