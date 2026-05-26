import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
  LESSON_MEDIA_MAX_BYTES,
  isLessonMediaMimeType,
  serializeLessonMedia,
} from "@/lib/lessons/lesson-media";
import {
  buildLessonMediaStorageKey,
  ensureLessonMediaBucket,
  getLessonMediaPublicUrl,
  readImageDimensions,
  uploadLessonMediaObject,
} from "@/lib/lessons/lesson-media-storage";

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId")?.trim() || null;
    const draftId = searchParams.get("draftId")?.trim() || null;

    if (!lessonId && !draftId) {
      return NextResponse.json(
        { error: "lessonId or draftId is required" },
        { status: 400 }
      );
    }

    const media = await prisma.lessonMedia.findMany({
      where: lessonId ? { lessonId } : { draftId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(media.map(serializeLessonMedia));
  } catch (error) {
    console.error("Get lesson media error:", error);
    return NextResponse.json(
      { error: "Cannot load lesson media" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await requireTeacherSessionJson();
    if (response) {
      return response;
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const lessonId = readString(formData.get("lessonId"));
    const draftId = readString(formData.get("draftId"));
    const caption = readString(formData.get("caption"));
    const altText = readString(formData.get("altText")) || caption;

    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!lessonId && !draftId) {
      return NextResponse.json(
        { error: "lessonId or draftId is required" },
        { status: 400 }
      );
    }

    if (lessonId) {
      const lessonExists = await prisma.lesson.count({ where: { id: lessonId } });
      if (!lessonExists) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
      }
    }

    const mimeType = file.type;
    if (!isLessonMediaMimeType(mimeType)) {
      return NextResponse.json(
        { error: "Only PNG, JPG, and WebP images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > LESSON_MEDIA_MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 10MB or smaller" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dimensions = readImageDimensions(buffer, mimeType);
    const storageKey = buildLessonMediaStorageKey({
      lessonId,
      draftId,
      fileName: file.name,
    });

    await ensureLessonMediaBucket();
    await uploadLessonMediaObject({
      storageKey,
      mimeType,
      buffer,
    });

    const media = await prisma.lessonMedia.create({
      data: {
        lessonId: lessonId || null,
        draftId: lessonId ? null : draftId,
        storageKey,
        publicUrl: getLessonMediaPublicUrl(storageKey),
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        caption: caption || null,
        altText: altText || null,
        annotations: [],
        createdById: session.userId,
      },
    });

    return NextResponse.json(serializeLessonMedia(media), { status: 201 });
  } catch (error) {
    console.error("Upload lesson media error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cannot upload image" },
      { status: 500 }
    );
  }
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}
