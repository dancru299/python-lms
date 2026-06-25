import { PrismaClient } from "@prisma/client";
import { buildTeachingCanvases } from "./src/lib/lessons/teaching-canvas";

const p = new PrismaClient();
async function main() {
  const lessonId = "cmpmc2ff8000z6ihlm1zpymmb";
  const secs = await p.section.findMany({ where: { lessonId }, orderBy: { sortOrder: "asc" },
    select: { id: true, title: true, content: true, contentBlocks: true } });
  for (const s of secs) {
    const canvases = buildTeachingCanvases({
      id: s.id, title: s.title, content: s.content || "", renderedContent: s.content || "",
      contentBlocks: s.contentBlocks as any,
    });
    console.log(`\n=== "${s.title}" -> ${canvases.length} canvases`);
    canvases.forEach((c, i) => {
      const blank = !c.html.trim() && c.steps.length === 0 && (c.cards?.length ?? 0) === 0 && !c.code;
      console.log(`  #${i+1} kind=${c.kind} title=${JSON.stringify(c.title)} steps=${c.steps.length} cards=${c.cards?.length ?? 0} htmlLen=${c.html.length}${blank ? "  <-- BLANK" : ""}`);
    });
  }
  await p.$disconnect();
}
main();
