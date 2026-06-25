/**
 * Seed Bài 8: "Ôn tập Chương 1 & 2" — nhắc lại Biến, Toán tử, Rẽ nhánh trước kỳ
 * kiểm tra. Đề thi + chữa bài đã tách sang bai8-de-kiem-tra.md. Phần luyện tập và
 * bài tập về nhà giữ nguyên. Chạy:  node prisma/seed-bai8.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const LESSON_TITLE = "BUỔI 8: Ôn tập Chương 1 & 2 (Biến, Toán tử & Rẽ nhánh)";
const TARGET_CHAPTER_TITLE = "INTERACTIVE & TƯ DUY LOGIC RẼ NHÁNH";

const objectives = {
  knowledge:
    "Hệ thống lại kiến thức Chương 1 & 2: biến, ép kiểu, ba nhóm toán tử và câu lệnh rẽ nhánh if - elif - else.",
  skills:
    "Vận dụng thành thạo ép kiểu dữ liệu, toán tử logic và rẽ nhánh nhiều điều kiện.",
  attitude: "Chủ động ôn tập, nhận diện và tránh các lỗi thường gặp trước khi kiểm tra.",
};

const step = (id, text) => ({ id, text });
const card = (icon, title, description) => ({ icon, title, description });

const sections = [
  {
    title: "Khởi động & Mục tiêu",
    sortOrder: 0,
    contentBlocks: [
      {
        id: "b8s1-hero", type: "teaching_canvas",
        title: "Buổi 8: Ôn tập Chương 1 & 2",
        layout: "hero",
        mainHtml: "<p>Hệ thống lại Biến, Toán tử và câu lệnh rẽ nhánh trước kỳ kiểm tra định kỳ.</p>",
        code: "", mediaId: "", notesHtml: "", reveal: false, steps: [],
      },
      {
        id: "b8s1-why", type: "teaching_canvas",
        title: "Ôn tập để làm gì?", layout: "highlight",
        mainHtml: "<p>Một buổi nhìn lại toàn cảnh để chắc nền kiến thức:</p>",
        code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b8s1-why-1", "Củng cố lại các khái niệm nền của Chương 1 & 2."),
          step("b8s1-why-2", "Nhận diện những lỗi hay gặp để tránh mất điểm oan."),
        ],
      },
      {
        id: "b8s1-map", type: "teaching_canvas",
        title: "Hôm nay nhắc lại những gì", layout: "checklist",
        mainHtml: "<p>Bốn mảng kiến thức chính:</p>",
        code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b8s1-map-1", "Biến và nhập liệu (input, ép kiểu int/float/str)."),
          step("b8s1-map-2", "Ba nhóm toán tử: số học, so sánh, logic."),
          step("b8s1-map-3", "Cấu trúc rẽ nhánh if - elif - else."),
          step("b8s1-map-4", "Bài toán nhiều điều kiện và bậc thang."),
        ],
      },
    ],
  },
  {
    title: "Biến & Nhập liệu",
    sortOrder: 1,
    contentBlocks: [
      {
        id: "b8s2-types", type: "teaching_canvas",
        title: "Ba kiểu dữ liệu cơ bản", layout: "cards",
        mainHtml: "", code: "", mediaId: "", notesHtml: "", reveal: false, steps: [],
        cards: [
          card("fa-hashtag", "int — Số nguyên", "Số đếm được, không có phần thập phân. VD: 5, -3, 100."),
          card("fa-percent", "float — Số thực", "Số có phần thập phân. VD: 3.14, 1.65, 50000.0."),
          card("fa-quote-right", "str — Chuỗi", "Văn bản đặt trong dấu nháy. VD: 'An', 'Kéo'."),
        ],
      },
      {
        id: "b8s2-input", type: "teaching_canvas",
        title: "Nhập liệu & ép kiểu", layout: "code",
        mainHtml: "<p><code>input()</code> luôn trả về CHUỖI — phải ép kiểu khi cần tính toán.</p>",
        code: [
          'tuoi = int(input("Nhập tuổi: "))',
          'diem = float(input("Nhập điểm: "))',
          'ten = input("Nhập tên: ")',
        ].join("\n"),
        mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b8s2-input-1", "int(...) đổi chuỗi sang số nguyên."),
          step("b8s2-input-2", "float(...) đổi chuỗi sang số thực."),
          step("b8s2-input-3", "Quên ép kiểu khi tính toán là lỗi TypeError hay gặp nhất."),
        ],
      },
    ],
  },
  {
    title: "Toán tử",
    sortOrder: 2,
    contentBlocks: [
      {
        id: "b8s3-groups", type: "teaching_canvas",
        title: "Ba nhóm toán tử", layout: "cards",
        mainHtml: "", code: "", mediaId: "", notesHtml: "", reveal: false, steps: [],
        cards: [
          card("fa-calculator", "Số học", "+ - * / và đặc biệt // (chia lấy nguyên), % (chia lấy dư)."),
          card("fa-equals", "So sánh", "== != < > <= >= — luôn trả về True hoặc False."),
          card("fa-link", "Logic", "and (và), or (hoặc), not (phủ định) để gộp điều kiện."),
        ],
      },
      {
        id: "b8s3-divmod", type: "teaching_canvas",
        title: "// và % — dễ nhầm nhất", layout: "code",
        mainHtml: "<p>Phân biệt ba phép chia thường gặp trong đề:</p>",
        code: [
          "print(15 // 4)   # 3  (phần nguyên)",
          "print(15 % 4)    # 3  (phần dư)",
          "print(15 / 4)    # 3.75 (chia thường, ra float)",
        ].join("\n"),
        mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b8s3-divmod-1", "// lấy phần nguyên của phép chia."),
          step("b8s3-divmod-2", "% lấy phần dư của phép chia."),
          step("b8s3-divmod-3", "/ luôn cho kết quả số thực (float)."),
        ],
      },
    ],
  },
  {
    title: "Rẽ nhánh if - elif - else",
    sortOrder: 3,
    contentBlocks: [
      {
        id: "b8s4-flow", type: "teaching_canvas",
        title: "Luồng if - elif - else", layout: "flow",
        mainHtml: "", code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b8s4-flow-1", "if: kiểm tra điều kiện đầu — đúng thì chạy rồi DỪNG."),
          step("b8s4-flow-2", "Sai → elif: kiểm tra điều kiện tiếp theo."),
          step("b8s4-flow-3", "Sai hết → else: chạy nhánh mặc định."),
          step("b8s4-flow-4", "Chỉ TỐI ĐA một nhánh được chạy."),
        ],
      },
      {
        id: "b8s4-code", type: "teaching_canvas",
        title: "Ví dụ: xếp loại điểm", layout: "code_explain",
        mainHtml: "<p>Theo dõi máy xếp loại điểm 7.5 đi qua từng nhánh.</p>",
        code: [
          "diem = 7.5",
          "if diem >= 8:",
          '    print("Giỏi")',
          "elif diem >= 6.5:",
          '    print("Khá")',
          "else:",
          '    print("Trung bình")',
        ].join("\n"),
        mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b8s4-code-1", "Dòng 1: gán diem = 7.5."),
          step("b8s4-code-2", "Dòng 2: if diem >= 8 → xét Giỏi; 7.5 < 8 nên Sai."),
          step("b8s4-code-3", "Dòng 3: câu in 'Giỏi' bị bỏ qua."),
          step("b8s4-code-4", "Dòng 4: elif diem >= 6.5 → Đúng (7.5 ≥ 6.5)."),
          step("b8s4-code-5", "Dòng 5: in 'Khá', rồi bỏ qua else."),
          step("b8s4-code-6", "Dòng 6: else dành cho trường hợp mọi điều kiện trên đều sai."),
          step("b8s4-code-7", "Dòng 7: in 'Trung bình' khi điểm dưới 6.5."),
        ],
      },
    ],
  },
  {
    title: "Nhiều điều kiện & bậc thang",
    sortOrder: 4,
    contentBlocks: [
      {
        id: "b8s5-logic", type: "teaching_canvas",
        title: "Gộp điều kiện: and / or / not", layout: "cards",
        mainHtml: "", code: "", mediaId: "", notesHtml: "", reveal: false, steps: [],
        cards: [
          card("fa-link", "and (VÀ)", "Đúng khi TẤT CẢ điều kiện đúng. VD: 5 <= diem and diem <= 10."),
          card("fa-code-branch", "or (HOẶC)", "Đúng khi CHỈ CẦN 1 điều kiện đúng. VD: tuoi < 6 or tuoi >= 60."),
          card("fa-toggle-on", "not (PHỦ ĐỊNH)", "Đảo ngược kết quả True ↔ False."),
        ],
      },
      {
        id: "b8s5-tips", type: "teaching_canvas",
        title: "Mẹo làm bài nâng cao", layout: "checklist",
        mainHtml: "<p>Ba điều giúp tránh sai ở bài khó:</p>",
        code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b8s5-tips-1", "Điều kiện 'ghi đè' (miễn phí, ưu tiên) đặt ở dòng if ĐẦU TIÊN."),
          step("b8s5-tips-2", "Bài bậc thang: tính tối đa bậc trước + phần dư × giá bậc mới."),
          step("b8s5-tips-3", "Luôn kiểm tra điểm mù: số âm, số 0, và đúng ngay tại mốc."),
        ],
      },
    ],
  },
  {
    title: "Tổng kết",
    sortOrder: 5,
    contentBlocks: [
      {
        id: "b8s6-sum", type: "teaching_canvas",
        title: "Ghi nhớ trước khi kiểm tra", layout: "checklist",
        mainHtml: "<p>Bốn điều chốt lại:</p>",
        code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b8s6-1", "Luôn ép kiểu khi dùng input() để tính toán (tránh TypeError)."),
          step("b8s6-2", "Nhớ // (nguyên) ≠ % (dư) ≠ / (thực)."),
          step("b8s6-3", "if-elif-else chỉ chạy 1 nhánh; đặt điều kiện ưu tiên lên đầu."),
          step("b8s6-4", "Dùng and/or để gộp điều kiện; cẩn thận >= và > ngay tại mốc."),
        ],
      },
    ],
  },
];

const exercises = [
  {
    type: "practice", title: "Mua vé tàu",
    question: "<p>Trẻ em dưới 6 tuổi được miễn vé. Nhập tuổi hành khách. Nếu tuổi &lt; 6 in 'Miễn phí vé', ngược lại in 'Giá vé: 100.000đ'.</p>",
    answer: 'tuoi = int(input("Nhập tuổi: "))\nif tuoi < 6:\n    print("Miễn phí vé")\nelse:\n    print("Giá vé: 100.000đ")',
    difficulty: "easy", points: 10, answerVisible: true, sortOrder: 0,
  },
  {
    type: "practice", title: "Tính chu vi hoặc diện tích",
    question: "<p>Nhập cạnh hình vuông, rồi nhập phép tính ('Chu vi' hoặc 'Diện tích'). Tính và in kết quả tương ứng (chu vi = cạnh×4, diện tích = cạnh×cạnh).</p>",
    answer: 'canh = float(input("Nhập cạnh hình vuông: "))\nlua_chon = input("Bạn muốn tính Chu vi hay Diện tích?: ")\n\nif lua_chon == "Chu vi":\n    print("Kết quả:", canh * 4)\nelif lua_chon == "Diện tích":\n    print("Kết quả:", canh * canh)\nelse:\n    print("Lựa chọn không hợp lệ")',
    difficulty: "medium", points: 15, answerVisible: true, sortOrder: 1,
  },
  {
    type: "practice", title: "Hệ thống đăng nhập",
    question: "<p>Tài khoản 'admin', mật khẩu '12345'. Nhập tài khoản và mật khẩu. Khớp cả 2 → 'Đăng nhập thành công', ngược lại → 'Sai thông tin'.</p>",
    answer: 'tk = input("Nhập tài khoản: ")\nmk = input("Nhập mật khẩu: ")\n\nif tk == "admin" and mk == "12345":\n    print("Đăng nhập thành công")\nelse:\n    print("Sai thông tin")',
    difficulty: "medium", points: 15, answerVisible: true, sortOrder: 2,
  },
  {
    type: "practice", title: "Chữa lại code rạp phim",
    question: "<p>Viết lại lời giải Bài 1 đề thi: giá 50k/vé, mua &gt;= 5 vé giảm 10%, tính tổng tiền.</p>",
    answer: 'so_ve = int(input("Nhập số vé: "))\ntien = so_ve * 50000\n\nif so_ve >= 5:\n    tien = tien - (tien * 10 / 100)\n\nprint("Số tiền phải trả:", tien)',
    difficulty: "hard", points: 20, answerVisible: true, sortOrder: 3,
  },
  {
    type: "practice", title: "Chữa lại code Oẳn Tù Tì",
    question: "<p>Viết lại lời giải Bài 2 đề thi: nhập lựa chọn Người 1, Người 2; in ra ai thắng.</p>",
    answer: 'p1 = input("Người 1 ra gì (Kéo/Búa/Bao): ")\np2 = input("Người 2 ra gì (Kéo/Búa/Bao): ")\n\nif p1 == p2:\n    print("Hòa")\nelif (p1 == "Kéo" and p2 == "Bao") or (p1 == "Búa" and p2 == "Kéo") or (p1 == "Bao" and p2 == "Búa"):\n    print("Người 1 thắng")\nelse:\n    print("Người 2 thắng")',
    difficulty: "hard", points: 20, answerVisible: true, sortOrder: 4,
  },
  {
    type: "homework", title: "Phân loại nước",
    question: "<p>Nhập nhiệt độ nước. &lt;= 0 → 'Thể rắn'; &gt;= 100 → 'Thể khí'; còn lại → 'Thể lỏng'.</p><p><strong>Ví dụ:</strong> 105 → Thể khí.</p>",
    answer: 'nhiet_do = float(input("Nhập nhiệt độ nước: "))\nif nhiet_do <= 0:\n    print("Thể rắn")\nelif nhiet_do >= 100:\n    print("Thể khí")\nelse:\n    print("Thể lỏng")',
    difficulty: "easy", points: 20, answerVisible: false, sortOrder: 5,
  },
  {
    type: "homework", title: "Tính tiền giữ xe",
    question: "<p>Phí giữ xe máy: dưới 3 giờ tính 10.000đ; từ 3 giờ trở lên tính 3.000đ/giờ. Nhập số giờ, tính tiền.</p><p><strong>Ví dụ:</strong> 5 → 15000.</p>",
    answer: 'so_gio = int(input("Nhập số giờ gửi: "))\nif so_gio < 3:\n    tien = 10000\nelse:\n    tien = so_gio * 3000\nprint("Tiền giữ xe:", tien)',
    difficulty: "medium", points: 25, answerVisible: false, sortOrder: 6,
  },
  {
    type: "homework", title: "Đoán màu sắc",
    question: "<p>Nhập màu ('Đỏ', 'Vàng', 'Xanh'): Đỏ → 'Dừng lại'; Vàng → 'Đi chậm'; Xanh → 'Đi'; khác → 'Không rõ'.</p><p><strong>Ví dụ:</strong> Đỏ → Dừng lại.</p>",
    answer: 'mau = input("Nhập màu: ")\nif mau == "Đỏ":\n    print("Dừng lại")\nelif mau == "Vàng":\n    print("Đi chậm")\nelif mau == "Xanh":\n    print("Đi")\nelse:\n    print("Không rõ")',
    difficulty: "medium", points: 25, answerVisible: false, sortOrder: 7,
  },
  {
    type: "homework", title: "Tính thuế thu nhập",
    question: "<p>Lương &lt; 11 triệu: thuế = 0. Lương &gt;= 11 triệu: phần vượt trên 11 triệu bị đánh thuế 10%. Nhập lương, tính thuế phải nộp.</p><p><strong>Ví dụ:</strong> 15000000 → 400000.0.</p>",
    answer: 'luong = float(input("Nhập lương (VNĐ): "))\nif luong <= 11000000:\n    thue = 0\nelse:\n    thue = (luong - 11000000) * 10 / 100\nprint("Thuế phải nộp là:", thue)',
    difficulty: "hard", points: 30, answerVisible: false, sortOrder: 8,
  },
];

async function main() {
  console.log(`🚀 Seeding "${LESSON_TITLE}" (ôn tập)...\n`);

  let chapter =
    (await prisma.chapter.findFirst({ where: { title: TARGET_CHAPTER_TITLE } })) ||
    (await prisma.chapter.findFirst({ orderBy: { sortOrder: "asc" } }));
  if (!chapter) {
    chapter = await prisma.chapter.create({
      data: { title: "Lập trình Python cơ bản", icon: "fa-python", sortOrder: 0 },
    });
  }
  console.log(`📁 Gắn vào chương: ${chapter.title} (${chapter.id})`);

  // Khớp cả tên cũ ("kiểm tra định kỳ") lẫn tên mới ("ôn tập chương") để thay sạch.
  const bai8Filter = {
    OR: [
      { title: { contains: "kiểm tra định kỳ", mode: "insensitive" } },
      { title: { contains: "ôn tập chương 1", mode: "insensitive" } },
    ],
  };
  const existing = await prisma.lesson.findFirst({
    where: { ...bai8Filter, chapterId: chapter.id },
    orderBy: { sortOrder: "asc" },
  });
  const removed = await prisma.lesson.deleteMany({ where: bai8Filter });
  if (removed.count > 0) console.log(`🧹 Đã xoá ${removed.count} bản bài 8 cũ (thay thế).`);

  let sortOrder;
  if (existing) {
    sortOrder = existing.sortOrder;
  } else {
    const last = await prisma.lesson.findFirst({
      where: { chapterId: chapter.id },
      orderBy: { sortOrder: "desc" },
    });
    sortOrder = (last?.sortOrder ?? -1) + 1;
  }

  const lesson = await prisma.lesson.create({
    data: {
      chapterId: chapter.id,
      title: LESSON_TITLE,
      content: "",
      duration: 90,
      difficulty: "beginner",
      sortOrder,
      isPublished: true,
      objectiveKnowledge: objectives.knowledge,
      objectiveSkills: objectives.skills,
      objectiveAttitude: objectives.attitude,
      sections: {
        create: sections.map((s) => ({
          title: s.title,
          content: "",
          contentFormat: "canvas",
          contentBlocks: s.contentBlocks,
          sortOrder: s.sortOrder,
        })),
      },
      exercises: { create: exercises },
    },
    include: { sections: true, exercises: true },
  });

  console.log(
    `\n✅ Đã tạo bài: ${lesson.title}\n   - ID: ${lesson.id}\n   - ${lesson.sections.length} tab, ${lesson.exercises.length} bài tập`
  );
}

module.exports = { LESSON_TITLE, objectives, sections, exercises };

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("❌ Seed lỗi:", error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
