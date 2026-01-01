import { supabase } from './supabase';

const BUCKET_NAME = 'products';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadResult {
  url: string;
  path: string;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Valida o arquivo antes do upload
 */
function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new StorageError(
      `Tipo de arquivo nao permitido. Use: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new StorageError(
      `Arquivo muito grande. Tamanho maximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }
}

/**
 * Gera um nome unico para o arquivo
 */
function generateFileName(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const uuid = crypto.randomUUID();
  return `${uuid}.${ext}`;
}

/**
 * Faz upload de uma imagem de produto para o Supabase Storage
 * @param file - Arquivo a ser enviado
 * @param companyId - ID da empresa (para organizar em pastas)
 * @returns URL publica da imagem
 */
export async function uploadProductImage(
  file: File,
  companyId: string
): Promise<UploadResult> {
  validateFile(file);

  const fileName = generateFileName(file);
  const filePath = `${companyId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new StorageError(`Erro ao fazer upload: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    path: filePath,
  };
}

/**
 * Remove uma imagem do Supabase Storage
 * @param imageUrl - URL completa da imagem
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  // Extrair o path da URL
  // URL format: https://{project}.supabase.co/storage/v1/object/public/products/{path}
  const urlParts = imageUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`);

  if (urlParts.length !== 2) {
    console.warn('URL de imagem invalida, ignorando delete:', imageUrl);
    return;
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    console.error('Delete error:', error);
    throw new StorageError(`Erro ao remover imagem: ${error.message}`);
  }
}

/**
 * Constantes exportadas para uso externo
 */
export const STORAGE_CONFIG = {
  maxFileSize: MAX_FILE_SIZE,
  allowedTypes: ALLOWED_TYPES,
  bucketName: BUCKET_NAME,
};
