const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Find all lessons about "Hàm" (functions)
  const lessons = await prisma.lesson.findMany({
    where: {
      title: { contains: "Hàm" },
    },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
      },
      exercises: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  for (const lesson of lessons) {
    console.log("=".repeat(60));
    console.log(`📚 ${lesson.title}`);
    console.log(`   ID: ${lesson.id}`);
    console.log(`   Difficulty: ${lesson.difficulty}`);
    console.log("=".repeat(60));

    console.log("\n📑 SECTIONS:");
    for (const section of lesson.sections) {
      console.log(`   ${section.sortOrder}. ${section.title}`);
    }

    const practiceExercises = lesson.exercises.filter(
      (e) => e.type === "practice"
    );
    const homeworkExercises = lesson.exercises.filter(
      (e) => e.type === "homework"
    );

    console.log(`\n📝 PRACTICE EXERCISES (${practiceExercises.length}):`);
    for (const ex of practiceExercises) {
      console.log(`   - ${ex.title} [${ex.difficulty}, ${ex.points} pts]`);
    }

    console.log(`\n📚 HOMEWORK EXERCISES (${homeworkExercises.length}):`);
    for (const ex of homeworkExercises) {
      console.log(`   - ${ex.title} [${ex.difficulty}, ${ex.points} pts]`);
    }

    console.log("\n");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
