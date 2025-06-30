import { getMixtureListMetadata, zFileDataV1, type FileDataV1 } from "$lib/data-format.js";
import type { R2Bucket, R2Object } from "$lib/r2.js";

export async function writeMixtureObject( bucket: R2Bucket, key: string, mxData: FileDataV1): Promise<R2Object | null> {
  return bucket.put(key, JSON.stringify(mxData), {
    customMetadata: getMixtureListMetadata(mxData),
  });

}

export async function readMixtureObject(bucket: R2Bucket, key: string): Promise<FileDataV1 | null> {
  const file = await bucket.get(key);
  if (!file) {
    console.log(`[Mixtures] No file found for id: ${key}`);
    return null;
  }
  const { ingredientJSON, ...rawData } = (await file.json()) as Record<string, unknown>;
  const parsedData = zFileDataV1.safeParse(rawData);
  if (!parsedData.success) {
    parsedData.error.issues.forEach((issue) => {
      console.log(`  - ${issue.path.join(".")} : ${issue.message}`);
    });
    return null;
  }
  return parsedData.data;
}
