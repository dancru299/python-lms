const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password + "python-lms-2024-secret")
    .digest("hex");
}

async function main() {
  console.log("🌱 Seeding database...");

  // Create teacher
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

  // Create student
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

  // Create admin
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

  // Create chapters
  await prisma.chapter.upsert({
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

  await prisma.chapter.upsert({
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

  // Delete existing lesson and recreate
  await prisma.lesson.deleteMany({ where: { id: "lesson-1" } });

  // Create lesson with RICH academic content
  await prisma.lesson.create({
    data: {
      id: "lesson-1",
      chapterId: "chapter-1",
      title: "List - Khái Niệm, Tạo và Truy Xuất",
      content:
        "<p>Trong bài giảng này, chúng ta sẽ tìm hiểu về cấu trúc dữ liệu List - một trong những kiểu dữ liệu quan trọng nhất trong Python.</p>",
      duration: 120,
      difficulty: "beginner",
      sortOrder: 0,
      sections: {
        create: [
          {
            title: "Khái niệm",
            content: `
<h2>1. Đặt Vấn đề & Khơi gợi</h2>
<p><strong>Tình huống:</strong> Tưởng tượng các bạn phải lưu trữ điểm số của cả lớp (ví dụ 50 bạn học sinh). Chúng ta phải khai báo 50 biến riêng biệt (<code>diem1</code>, <code>diem2</code>, ...). Cách này thật sự có các điểm yếu sau:</p>
<ul>
  <li><strong>Khó quản lý:</strong> Dễ nhầm lẫn, mất thời gian đặt tên.</li>
  <li><strong>Khó xử lý:</strong> Không thể lặp qua chúng một cách dễ dàng. (ví dụ: <code>tong = diem1 + diem2 + ... + diem50</code>).</li>
</ul>
<p>➡️ <strong>Giải pháp:</strong> Chúng ta cần một "hộp đựng đa năng", có thể gom nhiều giá trị lại thành một chỗ. Chào mừng <strong>List</strong> ra đời!</p>

<h2>2. Khái niệm List trong Python</h2>
<table>
  <thead>
    <tr>
      <th>Thuộc tính</th>
      <th>List (Danh sách)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Định nghĩa</strong></td>
      <td>Một <strong>tập hợp các giá trị</strong> (phần tử) được <strong>sắp xếp</strong> và <strong>có thứ tự</strong>.</td>
    </tr>
    <tr>
      <td><strong>Cú pháp</strong></td>
      <td>Đặt các phần tử bên trong <strong>dấu ngoặc vuông <code>[]</code></strong>, cách nhau bằng dấu phẩy.</td>
    </tr>
    <tr>
      <td><strong>Tính chất</strong></td>
      <td>Là kiểu dữ liệu <strong>có thể thay đổi (Mutable)</strong>.</td>
    </tr>
    <tr>
      <td><strong>Kiểu dữ liệu</strong></td>
      <td>Có thể chứa <strong>các kiểu dữ liệu khác nhau</strong> (số, chuỗi, boolean, List khác...).</td>
    </tr>
  </tbody>
</table>

<h3>So sánh List với String (Chuỗi)</h3>
<ul>
  <li><strong>Giống nhau:</strong> Cả hai đều là tập hợp các phần tử được sắp xếp, có thứ tự và có thể truy xuất bằng Index.</li>
  <li><strong>Khác nhau:</strong>
    <ul>
      <li><strong>String</strong> chỉ chứa các ký tự.</li>
      <li><strong>List</strong> có thể chứa các phần tử thuộc <strong>nhiều kiểu dữ liệu khác nhau</strong>.</li>
    </ul>
  </li>
</ul>
            `,
            sortOrder: 0,
          },
          {
            title: "Tạo List",
            content: `
<h2>1. Các cách tạo List</h2>

<h3>1.1. List rỗng</h3>
<p>Tạo một List hoàn toàn trống, chưa có phần tử nào bên trong.</p>
<div class="code-block">
# Khai báo một List rỗng
my_list = []
print(type(my_list))
# Kết quả: &lt;class 'list'&gt;
</div>

<h3>1.2. List có giá trị ban đầu</h3>
<div class="code-block">
# List chứa các số nguyên
numbers = [1, 2, 3, 4, 5]

# List chứa các chuỗi
fruits = ["apple", "banana", "cherry"]
</div>

<h3>1.3. List chứa các kiểu dữ liệu khác nhau</h3>
<div class="code-block">
# List chứa chuỗi, số nguyên và boolean
info = ["An", 15, True, 7.5]

# List lồng nhau (List of Lists)
matrix = [[1, 2, 3], [4, 5, 6]]
</div>

<h3>1.4. Tạo List bằng hàm list()</h3>
<div class="code-block">
# Chuyển một chuỗi thành List
chars = list("Python")
print(chars)  # ['P', 'y', 't', 'h', 'o', 'n']

# Tạo List từ range
nums = list(range(1, 6))
print(nums)  # [1, 2, 3, 4, 5]
</div>

<h2>2. Thực hành tạo List</h2>
<p>Hãy chuyển qua tab <strong>Luyện Tập</strong> để làm các bài tập liên quan đến phần này!</p>
            `,
            sortOrder: 1,
          },
          {
            title: "Truy xuất phần tử",
            content: `
<h2>1. Truy xuất bằng Index</h2>
<p>Mỗi phần tử trong List được gán một "địa chỉ" riêng, gọi là Index (Chỉ mục).</p>

<h3>1.1. Index dương (Bắt đầu từ 0)</h3>
<p>Index luôn bắt đầu từ số <strong>0</strong> cho phần tử đầu tiên.</p>
<div class="code-block">
my_list = ['A', 'B', 'C', 'D', 'E']
# Vị trí:    0    1    2    3    4

print(my_list[0])  # Lấy phần tử đầu tiên -> 'A'
print(my_list[3])  # Lấy phần tử ở vị trí thứ 4 -> 'D'
</div>

<h3>1.2. Index âm (Bắt đầu từ -1)</h3>
<p>Index âm được dùng để đếm ngược từ cuối List. Index <strong>-1</strong> luôn là phần tử cuối cùng.</p>
<div class="code-block">
my_list = ['A', 'B', 'C', 'D', 'E']
# Vị trí:   -5   -4   -3   -2   -1

print(my_list[-1])  # Lấy phần tử cuối cùng -> 'E'
print(my_list[-3])  # Lấy phần tử thứ ba từ cuối -> 'C'
</div>

<h2>2. Cắt Lát (Slicing) List</h2>
<p>Slicing là kỹ thuật lấy ra một <strong>List con</strong> (sublist) từ List gốc.</p>
<p>Cú pháp: <code>my_list[start : stop : step]</code></p>
<ul>
  <li><strong>start:</strong> Vị trí Index bắt đầu (bao gồm). Mặc định là 0.</li>
  <li><strong>stop:</strong> Vị trí Index kết thúc (<strong>KHÔNG bao gồm</strong>). Mặc định là hết List.</li>
  <li><strong>step:</strong> Bước nhảy. Mặc định là 1.</li>
</ul>

<h3>2.1. Lấy một phạm vi (start:stop)</h3>
<div class="code-block">
nums = [10, 20, 30, 40, 50, 60]

# Lấy từ index 1 đến index 3 (index 4 bị loại trừ)
print(nums[1:4])  # Kết quả: [20, 30, 40]

# Bỏ trống start: Lấy từ đầu
print(nums[:3])   # Kết quả: [10, 20, 30]

# Bỏ trống stop: Lấy đến cuối
print(nums[3:])   # Kết quả: [40, 50, 60]
</div>

<h3>2.2. Sử dụng Bước nhảy (step)</h3>
<div class="code-block">
# Lấy các phần tử cách nhau 2 vị trí
print(nums[::2])   # Kết quả: [10, 30, 50]

# Sử dụng step âm: Đảo ngược List
print(nums[::-1])  # Kết quả: [60, 50, 40, 30, 20, 10]
</div>

<h2>3. Truy xuất bằng Vòng lặp (Loop)</h2>
<p>Khi cần xử lý tất cả hoặc nhiều phần tử trong List, cách nhanh và hiệu quả nhất là sử dụng vòng lặp <code>for</code>.</p>

<h3>3.1. Lặp qua giá trị (Cách phổ biến nhất)</h3>
<div class="code-block">
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print("Tôi thích ăn " + fruit)

# Kết quả:
# Tôi thích ăn apple
# Tôi thích ăn banana
# Tôi thích ăn cherry
</div>

<h3>3.2. Lặp qua Index (Khi cần vị trí)</h3>
<div class="code-block">
data = [10, 20, 30]
for i in range(len(data)):
    print(f"Giá trị tại index {i} là {data[i]}")

# Kết quả:
# Giá trị tại index 0 là 10
# Giá trị tại index 1 là 20
# Giá trị tại index 2 là 30
</div>
            `,
            sortOrder: 2,
          },
        ],
      },
      exercises: {
        create: [
          {
            id: "ex-1-1",
            type: "practice",
            title: "Tạo List cơ bản",
            question: `<p>1. Tạo một List tên <code>favorite_colors</code> chứa 5 màu sắc yêu thích của bạn (chuỗi).</p>
<p>2. In ra List đó.</p>`,
            answer: `favorite_colors = ["red", "blue", "green", "purple", "orange"]
print(favorite_colors)`,
            difficulty: "easy",
            points: 10,
            answerVisible: true,
            sortOrder: 0,
          },
          {
            id: "ex-1-2",
            type: "practice",
            title: "Truy xuất phần tử",
            question: `<p>Cho List <code>numbers = [100, 200, 300, 400, 500]</code>.</p>
<p>Viết code để:</p>
<ol>
  <li>In ra phần tử đầu tiên</li>
  <li>In ra phần tử cuối cùng (dùng index âm)</li>
  <li>In ra 3 phần tử đầu tiên (dùng slicing)</li>
</ol>`,
            answer: `numbers = [100, 200, 300, 400, 500]

# 1. Phần tử đầu tiên
print(numbers[0])      # 100

# 2. Phần tử cuối cùng
print(numbers[-1])     # 500

# 3. Ba phần tử đầu tiên
print(numbers[:3])     # [100, 200, 300]`,
            difficulty: "easy",
            points: 15,
            answerVisible: true,
            sortOrder: 1,
          },
          {
            id: "ex-1-3",
            type: "practice",
            title: "Đảo ngược List",
            question: `<p>Cho List <code>letters = ['A', 'B', 'C', 'D', 'E']</code>.</p>
<p>Sử dụng slicing để in ra List đảo ngược.</p>`,
            answer: `letters = ['A', 'B', 'C', 'D', 'E']
reversed_list = letters[::-1]
print(reversed_list)  # ['E', 'D', 'C', 'B', 'A']`,
            difficulty: "medium",
            points: 10,
            answerVisible: true,
            sortOrder: 2,
          },
          {
            id: "hw-1-1",
            type: "homework",
            title: "Quản lý danh sách học sinh",
            question: `<h3>Yêu cầu:</h3>
<p>Viết chương trình Python để:</p>
<ol>
  <li>Tạo một List <code>students</code> chứa tên của 5 học sinh</li>
  <li>In ra học sinh đầu tiên và cuối cùng</li>
  <li>In ra tổng số học sinh trong danh sách</li>
  <li>In ra danh sách theo thứ tự ngược lại</li>
</ol>
<h3>Gợi ý:</h3>
<ul>
  <li>Dùng <code>len()</code> để đếm số phần tử</li>
  <li>Dùng slicing <code>[::-1]</code> để đảo ngược</li>
</ul>`,
            answer: `students = ["An", "Bình", "Cường", "Dũng", "Em"]

# 1. Học sinh đầu tiên và cuối cùng
print("Học sinh đầu tiên:", students[0])
print("Học sinh cuối cùng:", students[-1])

# 2. Tổng số học sinh
print("Tổng số học sinh:", len(students))

# 3. Danh sách ngược
print("Danh sách ngược:", students[::-1])`,
            difficulty: "medium",
            points: 20,
            answerVisible: false,
            sortOrder: 0,
          },
          {
            id: "hw-1-2",
            type: "homework",
            title: "Tính điểm trung bình",
            question: `<h3>Yêu cầu:</h3>
<p>Cho List điểm số của một học sinh: <code>scores = [8, 7, 9, 6, 8, 7]</code></p>
<p>Viết code để:</p>
<ol>
  <li>Tính tổng điểm</li>
  <li>Tính điểm trung bình</li>
  <li>Tìm điểm cao nhất và thấp nhất</li>
</ol>
<h3>Gợi ý:</h3>
<p>Sử dụng <code>sum()</code>, <code>len()</code>, <code>max()</code>, <code>min()</code></p>`,
            answer: `scores = [8, 7, 9, 6, 8, 7]

# 1. Tổng điểm
total = sum(scores)
print("Tổng điểm:", total)

# 2. Điểm trung bình
average = total / len(scores)
print("Điểm trung bình:", average)

# 3. Điểm cao nhất và thấp nhất
print("Điểm cao nhất:", max(scores))
print("Điểm thấp nhất:", min(scores))`,
            difficulty: "medium",
            points: 25,
            answerVisible: false,
            sortOrder: 1,
          },
        ],
      },
    },
  });
  console.log("✅ Created lesson with rich academic content");

  console.log("🎉 Seeding completed!");
  console.log("");
  console.log("📋 Demo accounts:");
  console.log("   Admin:   admin@example.com / admin123");
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
