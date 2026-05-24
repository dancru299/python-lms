import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function firstLine(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

async function findOrCreateProgram() {
  const existing = await prisma.program.findFirst({
    where: { title: "Chương trình Python hiện tại" },
  });

  if (existing) {
    await prisma.program.updateMany({
      where: { id: { not: existing.id } },
      data: { isActive: false },
    });

    return prisma.program.update({
      where: { id: existing.id },
      data: { isActive: true, sortOrder: 0 },
    });
  }

  await prisma.program.updateMany({ data: { isActive: false } });

  return prisma.program.create({
    data: {
      title: "Chương trình Python hiện tại",
      description: "Roadmap tự động được tạo từ các chương và bài học đang có trong hệ thống.",
      isActive: true,
      sortOrder: 0,
    },
  });
}

async function main() {
  console.log("Seeding program meta layer...");

  const program = await findOrCreateProgram();
  const chapters = await prisma.chapter.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      lessons: {
        where: { isPublished: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  for (const [chapterIndex, chapter] of chapters.entries()) {
    let milestone = await prisma.milestone.findFirst({
      where: { programId: program.id, title: chapter.title },
    });

    if (!milestone) {
      milestone = await prisma.milestone.create({
        data: {
          programId: program.id,
          title: chapter.title,
          description: chapter.description,
          icon: chapter.icon || "fa-flag-checkered",
          color: chapter.color || "#3B82F6",
          sortOrder: chapter.sortOrder ?? chapterIndex,
        },
      });
    } else {
      milestone = await prisma.milestone.update({
        where: { id: milestone.id },
        data: {
          description: chapter.description,
          icon: chapter.icon || milestone.icon,
          color: chapter.color || milestone.color,
          sortOrder: chapter.sortOrder ?? chapterIndex,
        },
      });
    }

    let parentSkill = await prisma.skill.findFirst({
      where: { programId: program.id, parentSkillId: null, title: chapter.title },
    });

    if (!parentSkill) {
      parentSkill = await prisma.skill.create({
        data: {
          programId: program.id,
          title: chapter.title,
          description: chapter.description,
          sortOrder: chapter.sortOrder ?? chapterIndex,
        },
      });
    }

    for (const [lessonIndex, lesson] of chapter.lessons.entries()) {
      await prisma.milestoneLesson.upsert({
        where: {
          milestoneId_lessonId: {
            milestoneId: milestone.id,
            lessonId: lesson.id,
          },
        },
        update: { sortOrder: lesson.sortOrder ?? lessonIndex },
        create: {
          milestoneId: milestone.id,
          lessonId: lesson.id,
          sortOrder: lesson.sortOrder ?? lessonIndex,
        },
      });

      const explicitOutcomeInputs = [
        {
          kind: "Kiến thức",
          description: lesson.objectiveKnowledge,
          tracksSkill: false,
        },
        {
          kind: "Kỹ năng",
          description: lesson.objectiveSkills,
          tracksSkill: true,
        },
        {
          kind: "Thái độ",
          description: lesson.objectiveAttitude,
          tracksSkill: false,
        },
      ].filter((item) => item.description?.trim());

      const outcomeInputs =
        explicitOutcomeInputs.length > 0
          ? explicitOutcomeInputs
          : [
              {
                kind: "Hoàn thành",
                description: `Hoàn thành bài học "${lesson.title}" trong roadmap.`,
                tracksSkill: true,
              },
            ];

      let skillOutcomeId: string | null = null;

      for (const [outcomeIndex, outcomeInput] of outcomeInputs.entries()) {
        const title = `${outcomeInput.kind}: ${firstLine(outcomeInput.description || "") || lesson.title}`;
        let outcome = await prisma.learningOutcome.findFirst({
          where: { milestoneId: milestone.id, title },
        });

        if (!outcome) {
          outcome = await prisma.learningOutcome.create({
            data: {
              milestoneId: milestone.id,
              title,
              description: outcomeInput.description,
              sortOrder: lessonIndex * 10 + outcomeIndex,
            },
          });
        } else {
          outcome = await prisma.learningOutcome.update({
            where: { id: outcome.id },
            data: {
              description: outcomeInput.description,
              sortOrder: lessonIndex * 10 + outcomeIndex,
            },
          });
        }

        await prisma.outcomeLesson.upsert({
          where: {
            outcomeId_lessonId: {
              outcomeId: outcome.id,
              lessonId: lesson.id,
            },
          },
          update: {},
          create: {
            outcomeId: outcome.id,
            lessonId: lesson.id,
          },
        });

        if (outcomeInput.tracksSkill) {
          skillOutcomeId = outcome.id;
        }
      }

      if (skillOutcomeId) {
        let childSkill = await prisma.skill.findFirst({
          where: {
            programId: program.id,
            parentSkillId: parentSkill.id,
            title: lesson.title,
          },
        });

        if (!childSkill) {
          childSkill = await prisma.skill.create({
            data: {
              programId: program.id,
              parentSkillId: parentSkill.id,
              title: lesson.title,
              description: lesson.objectiveSkills || `Nắm nội dung và bài tập của bài "${lesson.title}".`,
              sortOrder: lesson.sortOrder ?? lessonIndex,
            },
          });
        } else {
          childSkill = await prisma.skill.update({
            where: { id: childSkill.id },
            data: {
              description: lesson.objectiveSkills || childSkill.description,
              sortOrder: lesson.sortOrder ?? lessonIndex,
            },
          });
        }

        await prisma.outcomeSkill.upsert({
          where: {
            outcomeId_skillId: {
              outcomeId: skillOutcomeId,
              skillId: childSkill.id,
            },
          },
          update: {},
          create: {
            outcomeId: skillOutcomeId,
            skillId: childSkill.id,
          },
        });
      }
    }
  }

  console.log(`Seeded program meta layer for ${chapters.length} chapters.`);
}

main()
  .catch((error) => {
    console.error("Seed program meta layer error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
