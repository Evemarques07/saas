import { supabase } from './supabase';

const PRODUCTS_BUCKET = 'products';
const COMPANIES_BUCKET = 'companies';
const AVATARS_BUCKET = 'avatars';
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
    .from(PRODUCTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new StorageError(`Erro ao fazer upload: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(PRODUCTS_BUCKET)
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
  const urlParts = imageUrl.split(`/storage/v1/object/public/${PRODUCTS_BUCKET}/`);

  if (urlParts.length !== 2) {
    console.warn('URL de imagem invalida, ignorando delete:', imageUrl);
    return;
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from(PRODUCTS_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Delete error:', error);
    throw new StorageError(`Erro ao remover imagem: ${error.message}`);
  }
}

/**
 * Faz upload da logo de uma empresa para o Supabase Storage
 * @param file - Arquivo a ser enviado
 * @param companyId - ID da empresa
 * @returns URL publica da imagem
 */
export async function uploadCompanyLogo(
  file: File,
  companyId: string
): Promise<UploadResult> {
  validateFile(file);

  const fileName = generateFileName(file);
  const filePath = `${companyId}/logo-${fileName}`;

  const { error } = await supabase.storage
    .from(COMPANIES_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Permite sobrescrever logo existente
    });

  if (error) {
    console.error('Upload error:', error);
    throw new StorageError(`Erro ao fazer upload: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(COMPANIES_BUCKET)
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    path: filePath,
  };
}

/**
 * Remove a logo de uma empresa do Supabase Storage
 * @param logoUrl - URL completa da logo
 */
export async function deleteCompanyLogo(logoUrl: string): Promise<void> {
  const urlParts = logoUrl.split(`/storage/v1/object/public/${COMPANIES_BUCKET}/`);

  if (urlParts.length !== 2) {
    console.warn('URL de logo invalida, ignorando delete:', logoUrl);
    return;
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from(COMPANIES_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Delete error:', error);
    throw new StorageError(`Erro ao remover logo: ${error.message}`);
  }
}

/**
 * Faz upload de multiplas imagens de produto em lote
 * @param files - Array de arquivos a serem enviados
 * @param companyId - ID da empresa
 * @returns Array de resultados com URLs publicas
 */
export async function uploadProductImages(
  files: File[],
  companyId: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadProductImage(file, companyId);
    results.push(result);
  }

  return results;
}

/**
 * Remove multiplas imagens de produtos do Supabase Storage
 * @param imageUrls - Array de URLs das imagens a remover
 */
export async function deleteProductImages(imageUrls: string[]): Promise<void> {
  const paths: string[] = [];

  for (const imageUrl of imageUrls) {
    const urlParts = imageUrl.split(`/storage/v1/object/public/${PRODUCTS_BUCKET}/`);

    if (urlParts.length === 2) {
      paths.push(urlParts[1]);
    }
  }

  if (paths.length === 0) return;

  const { error } = await supabase.storage
    .from(PRODUCTS_BUCKET)
    .remove(paths);

  if (error) {
    console.error('Delete error:', error);
    throw new StorageError(`Erro ao remover imagens: ${error.message}`);
  }
}

/**
 * Faz upload do avatar de um usuario para o Supabase Storage
 * @param file - Arquivo a ser enviado
 * @param userId - ID do usuario
 * @returns URL publica da imagem
 */
export async function uploadUserAvatar(
  file: File,
  userId: string
): Promise<UploadResult> {
  validateFile(file);

  const fileName = generateFileName(file);
  const filePath = `${userId}/avatar-${fileName}`;

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Permite sobrescrever avatar existente
    });

  if (error) {
    console.error('Upload error:', error);
    throw new StorageError(`Erro ao fazer upload: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    path: filePath,
  };
}

/**
 * Remove o avatar de um usuario do Supabase Storage
 * @param avatarUrl - URL completa do avatar
 */
export async function deleteUserAvatar(avatarUrl: string): Promise<void> {
  // Nao deletar se for URL externa (ex: Google)
  if (!avatarUrl.includes('supabase.co')) {
    console.log('Avatar externo, ignorando delete:', avatarUrl);
    return;
  }

  const urlParts = avatarUrl.split(`/storage/v1/object/public/${AVATARS_BUCKET}/`);

  if (urlParts.length !== 2) {
    console.warn('URL de avatar invalida, ignorando delete:', avatarUrl);
    return;
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Delete error:', error);
    throw new StorageError(`Erro ao remover avatar: ${error.message}`);
  }
}

/**
 * Constantes exportadas para uso externo
 */
export const STORAGE_CONFIG = {
  maxFileSize: MAX_FILE_SIZE,
  allowedTypes: ALLOWED_TYPES,
  productsBucket: PRODUCTS_BUCKET,
  companiesBucket: COMPANIES_BUCKET,
  avatarsBucket: AVATARS_BUCKET,
};
