export type StorageId = string;

export interface StoredFileDataV1 {
  id: StorageId;
  name: string;
  rootMixtureId: string;
  ingredientDb: Record<string, any> | string; // Client might use object, server stores string
  accessTime: number;
  version: number; // Or string, ensure consistency with PartyKit server (server uses TEXT for version)
}
