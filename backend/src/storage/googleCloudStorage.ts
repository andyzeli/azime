import { Storage } from "@google-cloud/storage";

export const getBucketName = () =>
  process.env.GCP_BUCKET_NAME ?? process.env.GCS_BUCKET_NAME;

const getStorage = () =>
  new Storage({
    projectId: process.env.GCP_PROJECT_ID ?? process.env.GCS_PROJECT_ID,
  });

export const getBucket = () => {
  const bucketName = getBucketName();

  if (!bucketName) {
    throw new Error("GCP_BUCKET_NAME is required");
  }

  return getStorage().bucket(bucketName);
};

export const getGcsFileUri = (objectKey: string) => {
  const bucketName = getBucketName();

  if (!bucketName) {
    throw new Error("GCP_BUCKET_NAME is required");
  }

  return `gs://${bucketName}/${objectKey}`;
};

export const createObjectKey = (caseId: number, fileName: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

  return `cases/${caseId}/${timestamp}-${randomSuffix}-${sanitizedFileName}`;
};

export const createSignedUploadUrl = async (
  objectKey: string,
  contentType: string
) => {
  const [uploadUrl] = await getBucket().file(objectKey).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });

  return uploadUrl;
};

export const createSignedDownloadUrl = async (objectKey: string) => {
  const [downloadUrl] = await getBucket().file(objectKey).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
  });

  return downloadUrl;
};

export const objectExists = async (objectKey: string) => {
  const [exists] = await getBucket().file(objectKey).exists();
  return exists;
};

export const deleteObject = async (objectKey: string) => {
  await getBucket().file(objectKey).delete();
};
