import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mỗi buổi học là 2 tiếng → đặt thời lượng (phút) cho TẤT CẢ bài học = 120.
const TARGET_MINUTES = 120;

async function main() {
  const total = await prisma.lesson.count();
  const already = await prisma.lesson.count({
    where: { duration: TARGET_MINUTES },
  });

  console.log(`Tổng số bài học: ${total}`);
  console.log(`Đang là ${TARGET_MINUTES} phút sẵn: ${already}`);
  console.log(`Cần cập nhật: ${total - already}`);

  const result = await prisma.lesson.updateMany({
    data: { duration: TARGET_MINUTES },
  });

  console.log(
    `✓ Đã đặt duration = ${TARGET_MINUTES} phút (2 giờ) cho ${result.count} bài học.`
  );
}

main()
  .catch((error) => {
    console.error("Lỗi khi cập nhật thời lượng:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
