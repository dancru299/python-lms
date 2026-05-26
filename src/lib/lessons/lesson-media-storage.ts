import "server-only";

import { randomUUID } from "crypto";
import {
  LESSON_MEDIA_BUCKET,
  type LessonMediaMimeType,
} from "@/lib/lessons/lesson-media";

interface StorageConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export function getLessonMediaStorageConfig(): StorageConfig {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    serviceRoleKey,
    bucket: LESSON_MEDIA_BUCKET,
  };
}

export function getLessonMediaPublicUrl(storageKey: string): string {
  const { supabaseUrl, bucket } = getLessonMediaStorageConfig();
  const encodedKey = storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedKey}`;
}

export function buildLessonMediaStorageKey(options: {
  lessonId?: string | null;
  draftId?: string | null;
  fileName: string;
}): string {
  const ownerSegment = options.lessonId
    ? `lessons/${safePathSegment(options.lessonId)}`
    : `drafts/${safePathSegment(options.draftId || "unassigned")}`;
  const extension = getFileExtension(options.fileName);

  return `${ownerSegment}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
}

export async function ensureLessonMediaBucket() {
  const config = getLessonMediaStorageConfig();
  const headers = getStorageHeaders(config);

  const readResponse = await fetch(
    `${config.supabaseUrl}/storage/v1/bucket/${config.bucket}`,
    { headers }
  );

  if (readResponse.ok) {
    return;
  }

  if (readResponse.status !== 404) {
    throw new Error(`Cannot read Supabase bucket: ${readResponse.status}`);
  }

  const createResponse = await fetch(`${config.supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: config.bucket,
      name: config.bucket,
      public: true,
      file_size_limit: 10 * 1024 * 1024,
      allowed_mime_types: ["image/png", "image/jpeg", "image/webp"],
    }),
  });

  if (!createResponse.ok && createResponse.status !== 409) {
    const body = await createResponse.text().catch(() => "");
    throw new Error(
      `Cannot create Supabase bucket: ${createResponse.status} ${body}`.trim()
    );
  }
}

export async function uploadLessonMediaObject(options: {
  storageKey: string;
  mimeType: LessonMediaMimeType;
  buffer: Buffer;
}) {
  const config = getLessonMediaStorageConfig();
  const response = await fetch(
    `${config.supabaseUrl}/storage/v1/object/${config.bucket}/${options.storageKey}`,
    {
      method: "POST",
      headers: {
        ...getStorageHeaders(config),
        "Content-Type": options.mimeType,
        "Cache-Control": "31536000",
        "x-upsert": "false",
      },
      body: bufferToArrayBuffer(options.buffer),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Cannot upload lesson media: ${response.status} ${body}`.trim());
  }
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

export async function deleteLessonMediaObject(storageKey: string) {
  const config = getLessonMediaStorageConfig();
  const response = await fetch(
    `${config.supabaseUrl}/storage/v1/object/${config.bucket}/${storageKey}`,
    {
      method: "DELETE",
      headers: getStorageHeaders(config),
    }
  );

  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => "");
    throw new Error(`Cannot delete lesson media: ${response.status} ${body}`.trim());
  }
}

export function readImageDimensions(
  buffer: Buffer,
  mimeType: LessonMediaMimeType
): ImageDimensions | null {
  if (mimeType === "image/png") {
    return readPngDimensions(buffer);
  }

  if (mimeType === "image/jpeg") {
    return readJpegDimensions(buffer);
  }

  if (mimeType === "image/webp") {
    return readWebpDimensions(buffer);
  }

  return null;
}

function getStorageHeaders(config: StorageConfig) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120) || "unknown";
}

function getFileExtension(fileName: string) {
  const extension = fileName.trim().toLowerCase().match(/\.[a-z0-9]+$/)?.[0];

  if (extension === ".jpeg" || extension === ".jpg") {
    return ".jpg";
  }

  if (extension === ".png" || extension === ".webp") {
    return extension;
  }

  return "";
}

function readPngDimensions(buffer: Buffer): ImageDimensions | null {
  if (
    buffer.length < 24 ||
    buffer.toString("ascii", 1, 4) !== "PNG" ||
    buffer.readUInt32BE(12) !== 0x49484452
  ) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker);

    if (isStartOfFrame && offset + 8 < buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function readWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = buffer.toString("ascii", 12, 16);

  if (chunkType === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunkType === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunkType === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return null;
}
