import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + "python-lms-2024-secret")
    .digest("hex");
}

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin account
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: hashPassword("admin123"),
      name: "Quản trị viên",
      role: "admin",
    },
  });
  console.log("✅ Created admin:", admin.email);

  // Create admin/teacher account
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@example.com" },
    update: {},
    create: {
      email: "teacher@example.com",
      password: hashPassword("teacher123"),
      name: "Giảng viên Demo",
      role: "teacher",
    },
  });
  console.log("✅ Created teacher:", teacher.email);

  // Create sample student
  const student = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      email: "student@example.com",
      password: hashPassword("student123"),
      name: "Học sinh Demo",
      role: "student",
    },
  });
  console.log("✅ Created student:", student.email);

  // Create chapters
  const chapter1 = await prisma.chapter.upsert({
    where: { id: "chapter-1" },
    update: {},
    create: {
      id: "chapter-1",
      title: "Cấu Trúc Dữ Liệu Cơ Bản",
      description: "Tìm hiểu về List, Tuple, Dictionary và Set trong Python",
      icon: "fa-layer-group",
      color: "#3B82F6",
      sortOrder: 0,
    },
  });

  const chapter2 = await prisma.chapter.upsert({
    where: { id: "chapter-2" },
    update: {},
    create: {
      id: "chapter-2",
      title: "Hàm và Module",
      description: "Học cách viết hàm và tổ chức code",
      icon: "fa-code",
      color: "#8B5CF6",
      sortOrder: 1,
    },
  });

  console.log("✅ Created chapters");

  // Create lessons
  const lesson1 = await prisma.lesson.upsert({
    where: { id: "lesson-1" },
    update: {},
    create: {
      id: "lesson-1",
      chapterId: "chapter-1",
      title: "List - Khái Niệm, Tạo và Truy Xuất",
      content: `
        <h2>List là gì?</h2>
        <p>List trong Python là một cấu trúc dữ liệu cho phép lưu trữ nhiều phần tử trong một biến duy nhất.</p>
        <h3>Đặc điểm của List:</h3>
        <ul>
          <li>Có thể thay đổi (mutable)</li>
          <li>Có thứ tự (ordered)</li>
          <li>Cho phép phần tử trùng lặp</li>
          <li>Có thể chứa nhiều kiểu dữ liệu khác nhau</li>
        </ul>
      `,
      duration: 120,
      difficulty: "beginner",
      sortOrder: 0,
    },
  });

  const lesson2 = await prisma.lesson.upsert({
    where: { id: "lesson-2" },
    update: {},
    create: {
      id: "lesson-2",
      chapterId: "chapter-1",
      title: "List - Thêm, Xóa và Sửa Phần Tử",
      content: `
        <h2>Thao tác với List</h2>
        <p>Python cung cấp nhiều phương thức để thao tác với List.</p>
        <h3>Các phương thức thường dùng:</h3>
        <ul>
          <li><code>append()</code> - Thêm phần tử vào cuối</li>
          <li><code>insert()</code> - Chèn phần tử vào vị trí</li>
          <li><code>remove()</code> - Xóa phần tử theo giá trị</li>
          <li><code>pop()</code> - Xóa và trả về phần tử</li>
        </ul>
      `,
      duration: 90,
      difficulty: "beginner",
      sortOrder: 1,
    },
  });

  console.log("✅ Created lessons");

  // Create sections for lesson 1
  await prisma.section.createMany({
    data: [
      {
        lessonId: "lesson-1",
        title: "Tạo List",
        content: `
          <p>Có nhiều cách để tạo một List trong Python:</p>
          <pre class="code-block">
# Tạo list trống
my_list = []

# Tạo list với giá trị
fruits = ["apple", "banana", "cherry"]

# Tạo list từ range
numbers = list(range(1, 6))  # [1, 2, 3, 4, 5]
          </pre>
        `,
        sortOrder: 0,
      },
      {
        lessonId: "lesson-1",
        title: "Truy xuất phần tử",
        content: `
          <p>Sử dụng index để truy xuất phần tử trong List:</p>
          <pre class="code-block">
fruits = ["apple", "banana", "cherry"]

# Index dương (từ đầu)
print(fruits[0])  # apple
print(fruits[1])  # banana

# Index âm (từ cuối)
print(fruits[-1])  # cherry
print(fruits[-2])  # banana
          </pre>
        `,
        sortOrder: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Created sections");

  // Create exercises
  await prisma.exercise.createMany({
    data: [
      {
        id: "ex-1-1",
        lessonId: "lesson-1",
        type: "practice",
        title: "Tạo List cơ bản",
        question: "Tạo một List chứa 5 số nguyên từ 1 đến 5 và in ra màn hình.",
        answer: `numbers = [1, 2, 3, 4, 5]
print(numbers)`,
        difficulty: "easy",
        points: 10,
        answerVisible: true,
        sortOrder: 0,
      },
      {
        id: "ex-1-2",
        lessonId: "lesson-1",
        type: "practice",
        title: "Truy xuất phần tử",
        question: "Cho List <code>colors = ['red', 'green', 'blue', 'yellow']</code>. Viết code để in ra phần tử đầu tiên và phần tử cuối cùng.",
        answer: `colors = ['red', 'green', 'blue', 'yellow']
print(colors[0])   # red
print(colors[-1])  # yellow`,
        difficulty: "easy",
        points: 10,
        answerVisible: true,
        sortOrder: 1,
      },
      {
        id: "hw-1-1",
        lessonId: "lesson-1",
        type: "homework",
        title: "Quản lý danh sách học sinh",
        question: `
          <p>Viết chương trình Python để:</p>
          <ol>
            <li>Tạo một List chứa tên của 5 học sinh</li>
            <li>In ra học sinh đầu tiên và cuối cùng</li>
            <li>In ra tổng số học sinh trong danh sách</li>
          </ol>
        `,
        answer: `students = ["An", "Bình", "Cường", "Dũng", "Em"]

print("Học sinh đầu tiên:", students[0])
print("Học sinh cuối cùng:", students[-1])
print("Tổng số học sinh:", len(students))`,
        difficulty: "medium",
        points: 20,
        answerVisible: false,
        sortOrder: 0,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Created exercises");

  console.log("🎉 Seeding completed!");
  console.log("");
  console.log("📋 Demo accounts:");
  console.log("   Teacher: teacher@example.com / teacher123");
  console.log("   Student: student@example.com / student123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
