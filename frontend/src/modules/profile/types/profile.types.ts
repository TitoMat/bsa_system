export type SignatureMetadata = {
  id: string;
  userId: string;
  mimeType: string;
  sha256Hash: string;
  isActive: boolean;
  createdAt: string;
  revokedAt: string | null;
};
