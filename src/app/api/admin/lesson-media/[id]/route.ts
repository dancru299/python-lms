import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTeacherSessionJson } from "@/lib/api-auth";
import {
  extractReferencedMediaIds,
  normalizeAnnotations,
  serializeLessonMedia,
} from "@/lib/lessons/lesson-media";
import { deleteLessonMediaObject } from "@/lib/lessons/lesson-media-storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) {
      return response;
    }

    const { id } = await params;
    const body = await request.json();

    const media = await prisma.lessonMedia.update({
      where: { id },
      data: {
        caption: readString(body.caption) || null,
        altText: readString(body.altText) || null,
        annotations: normalizeAnnotations(body.annotations),
      },
    });

    return NextResponse.json(serializeLessonMedia(media));
  } catch (error) {
    console.error("Update lesson media error:", error);
    return NextResponse.json(
      { error: "Cannot update lesson media" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { response } = await requireTeacherSessionJson();
    if (response) {
      return response;
    }

    const { id } = await params;
    const media = await prisma.lessonMedia.findUnique({ where: { id } });

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    if (media.lessonId) {
      const sections = await prisma.section.findMany({
        where: { lessonId: media.lessonId },
        select: { content: true, contentBlocks: true },
      });
      const htmlIds = extractReferencedMediaIds(
        sections.map((section) => section.content || "")
      );
      const canvasIds = sections.flatMap((section) =>
        extractCanvasBlockMediaIds(section.contentBlocks)
      );
      const referencedIds = new Set([...htmlIds, ...canvasIds]);

      if (referencedIds.has(id)) {
        return NextResponse.json(
          { error: "Image is still used in lesson content" },
          { status: 409 }
        );
      }
    }

    await deleteLessonMediaObject(media.storageKey);
    await prisma.lessonMedia.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete lesson media error:", error);
    return NextResponse.json(
      { error: "Cannot delete lesson media" },
      { status: 500 }
    );
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractCanvasBlockMediaIds(contentBlocks: unknown): string[] {
  if (!Array.isArray(contentBlocks)) return [];
  return contentBlocks
    .filter((b): b is Record<string, unknown> => b !== null && typeof b === "object")
    .map((b) => (typeof b.mediaId === "string" ? b.mediaId.trim() : ""))
    .filter(Boolean);
}
