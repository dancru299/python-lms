/**
 * Seed Bài 6: "Rẽ nhiều nhánh if - elif - else & Toán tử logic".
 *
 * Dựng thủ công theo khung teaching_canvas để bài ĐẠT SÀN chất lượng ngay:
 *  - canvas đầu là hero (opener)
 *  - >=3 loại layout (ở đây 9 loại: hero/highlight/checklist/cards/flow/compare/
 *    code_explain/playground/mindmap) → đa dạng
 *  - mỗi layout đủ field bắt buộc (compare 2 cards, flow/checklist/mindmap có steps,
 *    code_explain/playground có code) → không vỡ layout
 *  - mỗi canvas đủ nội dung, không gần rỗng, không tràn
 *  - có mindmap tổng kết (đóng vòng)
 *
 * Chạy:  node prisma/seed-bai6.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const LESSON_TITLE = "BUỔI 6: Rẽ nhiều nhánh if - elif - else & Toán tử logic";

const objectives = {
  knowledge:
    "Nắm được cách dùng elif để rẽ nhiều nhánh và hiểu rõ ba toán tử logic and, or, not.",
  skills:
    "Viết được chương trình phân loại học lực và tìm số lớn nhất trong ba số.",
  attitude:
    "Rèn sự tỉ mỉ, cẩn thận khi lập luận các điều kiện, tránh bỏ sót trường hợp.",
};

const step = (id, text) => ({ id, text });

const sections = [
  {
    title: "Khởi động & Mục tiêu",
    contentFormat: "canvas",
    sortOrder: 0,
    contentBlocks: [
      {
        id: "s1-hero",
        type: "teaching_canvas",
        title: "Buổi 6: Rẽ nhiều nhánh & Toán tử logic",
        layout: "hero",
        mainHtml:
          "<p>Dạy máy tính chia nhiều hạng và kết hợp nhiều điều kiện để ra quyết định chính xác.</p>",
        code: "",
        mediaId: "",
        notesHtml: "",
        reveal: false,
        steps: [],
      },
      {
        id: "s1-context",
        type: "teaching_canvas",
        title: "Bài toán xếp loại học lực",
        layout: "highlight",
        mainHtml:
          "<p>Thầy cô xếp loại học sinh theo điểm. Dùng <code>if - else</code> chỉ chia được 2 loại — làm sao chia <strong>4 hạng</strong>?</p>",
        code: "",
        mediaId: "",
        notesHtml: "",
        reveal: true,
        steps: [
          step("s1-context-1", "Dưới 5: Yếu · 5–6.5: Trung bình · 6.5–8: Khá · từ 8: Giỏi."),
          step("s1-context-2", "Học bổng cần: học lực Giỏi VÀ hạnh kiểm Tốt — phải gộp điều kiện."),
          step("s1-context-3", "Cần xử lý hơn 2 ngã rẽ và kết hợp nhiều điều kiện cùng lúc."),
        ],
      },
      {
        id: "s1-goals",
        type: "teaching_canvas",
        title: "Mục tiêu bài học",
        layout: "checklist",
        mainHtml: "<p>Sau buổi học, em sẽ:</p>",
        code: "",
        mediaId: "",
        notesHtml: "",
        reveal: true,
        steps: [
          step("s1-goals-1", "Kiến thức: dùng elif để rẽ nhiều nhánh; hiểu and, or, not."),
          step("s1-goals-2", "Kỹ năng: viết chương trình phân loại học lực, tìm số lớn nhất trong 3 số."),
          step("s1-goals-3", "Thái độ: tỉ mỉ, cẩn thận khi lập luận điều kiện, tránh sót trường hợp."),
        ],
      },
    ],
  },
  {
    title: "Khái niệm cốt lõi",
    contentFormat: "canvas",
    sortOrder: 1,
    contentBlocks: [
      {
        id: "s2-elif",
        type: "teaching_canvas",
        title: "elif — nhiều ngã rẽ",
        layout: "highlight",
        mainHtml:
          "<p><strong>elif</strong> (else if) được kẹp giữa <code>if</code> và <code>else</code> khi có hơn 2 trường hợp.</p>",
        code: "",
        mediaId: "",
        notesHtml: "",
        reveal: true,
        steps: [
          step("s2-elif-1", "Máy kiểm tra các điều kiện lần lượt từ trên xuống dưới."),
          step("s2-elif-2", "Gặp điều kiện ĐÚNG đầu tiên thì chạy khối đó rồi BỎ QUA phần bên dưới."),
        ],
      },
      {
        id: "s2-logic",
        type: "teaching_canvas",
        title: "Ba phép thuật logic",
        layout: "cards",
        mainHtml: "",
        code: "",
        mediaId: "",
        notesHtml: "",
        reveal: false,
        steps: [],
        cards: [
          {
            icon: "fa-link",
            title: "and (VÀ)",
            description: "Đúng khi TẤT CẢ điều kiện đúng. Ẩn dụ: mở két cần chìa khóa AND mật mã.",
          },
          {
            icon: "fa-code-branch",
            title: "or (HOẶC)",
            description: "Đúng khi CHỈ CẦN 1 điều kiện đúng. Ẩn dụ: vào thư viện bằng thẻ HS OR căn cước.",
          },
          {
            icon: "fa-toggle-on",
            title: "not (PHỦ ĐỊNH)",
            description: "Đảo Đúng↔Sai. Ẩn dụ: đang bật công tắc thì thành tắt, đang tắt thành bật.",
          },
        ],
      },
    ],
  },
  {
    title: "Quy trình & So sánh",
    contentFormat: "canvas",
    sortOrder: 2,
    contentBlocks: [
      {
        id: "s3-flow",
        type: "teaching_canvas",
        title: "Luồng kiểm tra nhiều nhánh",
        layout: "flow",
        mainHtml: "",
        code: "",
        mediaId: "",
        notesHtml: "",
        reveal: true,
        steps: [
          step("s3-flow-1", "if: điều kiện 1 đúng? → Đúng: chạy khối 1, DỪNG LUÔN."),
          step("s3-flow-2", "Sai → elif đầu tiên: điều kiện 2 đúng? → Đúng: chạy khối 2, DỪNG."),
          step("s3-flow-3", "Sai → chuyển xuống elif tiếp theo (nếu có)."),
          step("s3-flow-4", "Tất cả sai → else: chạy khối else, kết thúc rẽ nhánh."),
        ],
      },
      {
        id: "s3-compare",
        type: "teaching_canvas",
        title: "Nhiều if rời vs if-elif",
        layout: "compare",
        mainHtml: "",
        code: "",
        mediaId: "",
        notesHtml: "",
        reveal: false,
        steps: [],
        cards: [
          {
            icon: "fa-list",
            title: "Nhiều if rời rạc",
            description: "Máy kiểm tra MỌI if độc lập từ trên xuống; có thể in nhiều kết quả nếu nhiều điều kiện đúng.",
          },
          {
            icon: "fa-code-branch",
            title: "if - elif - else",
            description: "Chạy nhánh đúng ĐẦU TIÊN rồi thoát ra; TỐI ĐA 1 khối lệnh được chạy.",
          },
        ],
      },
    ],
  },
  {
    title: "Code mẫu & Giải thích",
    contentFormat: "canvas",
    sortOrder: 3,
    contentBlocks: [
      {
        id: "s4-code",
        type: "teaching_canvas",
        title: "Chương trình phân loại học lực",
        layout: "code_explain",
        mainHtml:
          "<p>Theo dõi máy xếp loại điểm <strong>7.5</strong>:</p><pre>Hệ thống đang xếp loại...\nHọc lực Khá! Cố gắng thêm nhé!\nKết thúc kỳ học.</pre>",
        code: [
          "diem = 7.5",
          'print("Hệ thống đang xếp loại...")',
          "if diem >= 8.0:",
          '    print("Học lực Giỏi! Tuyệt vời!")',
          "elif diem >= 6.5 and diem < 8.0:",
          '    print("Học lực Khá! Cố gắng thêm nhé!")',
          "elif diem >= 5.0 and diem < 6.5:",
          '    print("Học lực Trung bình.")',
          "else:",
          '    print("Học lực Yếu. Cần nỗ lực nhiều hơn.")',
          'print("Kết thúc kỳ học.")',
        ].join("\n"),
        mediaId: "",
        notesHtml: "",
        reveal: true,
        steps: [
          step("s4-code-1", "Dòng 1: gán biến diem = 7.5 — điểm cần xếp loại."),
          step("s4-code-2", "Dòng 2: in dòng mở đầu 'Hệ thống đang xếp loại...'."),
          step("s4-code-3", "Dòng 3: if diem >= 8.0 → xét hạng Giỏi; 7.5 không đạt nên Sai."),
          step("s4-code-4", "Dòng 4: câu in 'Học lực Giỏi' bị bỏ qua vì điều kiện trên Sai."),
          step("s4-code-5", "Dòng 5: elif 6.5 ≤ diem < 8.0; 7.5 thoả CẢ HAI vế nhờ and → ĐÚNG."),
          step("s4-code-6", "Dòng 6: in 'Học lực Khá', sau đó BỎ QUA toàn bộ nhánh bên dưới."),
          step("s4-code-7", "Dòng 7: elif 5.0 ≤ diem < 6.5 (hạng Trung bình) — không xét vì đã chọn Khá."),
          step("s4-code-8", "Dòng 8: câu in 'Học lực Trung bình' chỉ chạy nếu rơi vào nhánh trên."),
          step("s4-code-9", "Dòng 9: else dành cho mọi trường hợp còn lại khi các điều kiện trên đều Sai."),
          step("s4-code-10", "Dòng 10: in 'Học lực Yếu' khi điểm dưới 5.0."),
          step("s4-code-11", "Dòng 11: câu in 'Kết thúc kỳ học' nằm NGOÀI rẽ nhánh nên luôn chạy."),
        ],
      },
    ],
  },
  {
    title: "Thực hành nhanh",
    contentFormat: "canvas",
    sortOrder: 4,
    contentBlocks: [
      {
        id: "s5-playground",
        type: "teaching_canvas",
        title: "Truy tìm số lớn nhất",
        layout: "playground",
        mainHtml:
          "<p>Có 3 số a, b, c. Dùng toán tử <code>and</code> để tìm số lớn nhất — hoàn thành đoạn code còn dở.</p>",
        code: [
          "a = 15",
          "b = 20",
          "c = 18",
          "",
          "# Điền điều kiện vào chỗ trống (dùng and)",
          "if a > b and a > c:",
          '    print("a là số lớn nhất!")',
          "elif b > a and b > c:",
          '    print("b là số lớn nhất!")',
          "else:",
          '    print("c là số lớn nhất!")',
        ].join("\n"),
        mediaId: "",
        notesHtml: "",
        reveal: false,
        steps: [],
      },
    ],
  },
  {
    title: "Tổng kết",
    contentFormat: "canvas",
    sortOrder: 5,
    contentBlocks: [
      {
        id: "s6-mindmap",
        type: "teaching_canvas",
        title: "Tổng kết: Rẽ nhánh & Logic",
        layout: "mindmap",
        mainHtml: "",
        code: "",
        mediaId: "",
        notesHtml: "",
        reveal: true,
        steps: [
          step("s6-1", "Cấu trúc if-elif-else: dùng khi có từ 3 trường hợp; if đầu tiên, elif ở giữa, else cuối."),
          step("s6-2", "Toán tử logic: and (tất cả đúng) · or (ít nhất 1 đúng) · not (lật kết quả)."),
          step("s6-3", "Lỗi hay gặp: quên dấu ':', viết 'else if' thay vì elif, nhầm and với or."),
          step("s6-4", "Ứng dụng: xếp loại học lực, phân loại tuổi, tìm max/min, cấp quyền nhận thưởng."),
        ],
      },
    ],
  },
];

const exercises = [
  {
    type: "practice",
    title: "Phân loại lứa tuổi",
    question:
      "<p>Nhập vào tuổi của một người. Nếu tuổi &lt; 12 in \"Trẻ em\". Nếu từ 12 đến dưới 18 in \"Thiếu niên\". Nếu từ 18 trở lên in \"Người lớn\". Gợi ý: dùng <code>and</code> để kẹp khoảng tuổi thiếu niên.</p>",
    answer:
      'tuoi = int(input("Nhập tuổi: "))\nif tuoi < 12:\n    print("Trẻ em")\nelif tuoi >= 12 and tuoi < 18:\n    print("Thiếu niên")\nelse:\n    print("Người lớn")',
    difficulty: "easy",
    points: 10,
    answerVisible: true,
    sortOrder: 0,
  },
  {
    type: "practice",
    title: "Máy bán nước tự động",
    question:
      "<p>Nhập mã sản phẩm (A, B, C). \"A\" in \"Nước ngọt\", \"B\" in \"Sữa\", \"C\" in \"Trà đá\", mã khác in \"Không có sản phẩm này\".</p>",
    answer:
      'ma = input("Nhập mã sản phẩm: ")\nif ma == "A":\n    print("Nước ngọt")\nelif ma == "B":\n    print("Sữa")\nelif ma == "C":\n    print("Trà đá")\nelse:\n    print("Không có sản phẩm này")',
    difficulty: "easy",
    points: 10,
    answerVisible: true,
    sortOrder: 1,
  },
  {
    type: "practice",
    title: "Tìm số lớn nhất trong 3 số",
    question:
      "<p>Nhập 3 số nguyên x, y, z. In ra số lớn nhất. Kết hợp toán tử <code>and</code> để so sánh chéo.</p>",
    answer:
      'x = int(input("Nhập x: "))\ny = int(input("Nhập y: "))\nz = int(input("Nhập z: "))\n\nif x >= y and x >= z:\n    print("Số lớn nhất là", x)\nelif y >= x and y >= z:\n    print("Số lớn nhất là", y)\nelse:\n    print("Số lớn nhất là", z)',
    difficulty: "medium",
    points: 15,
    answerVisible: true,
    sortOrder: 2,
  },
  {
    type: "practice",
    title: "Điều kiện nhận học bổng",
    question:
      "<p>Học bổng đặc biệt cần điểm trung bình &gt;= 9.0 HOẶC đạt giải kỳ thi thành phố (nhập \"Có\"/\"Không\"). Nhập điểm và giải thưởng, in \"Nhận học bổng\" hoặc \"Chưa đủ điều kiện\".</p>",
    answer:
      'diem = float(input("Nhập điểm trung bình: "))\ngiai = input("Có đạt giải thành phố không? (Có/Không): ")\n\nif diem >= 9.0 or giai == "Có":\n    print("Nhận học bổng")\nelse:\n    print("Chưa đủ điều kiện")',
    difficulty: "medium",
    points: 15,
    answerVisible: true,
    sortOrder: 3,
  },
  {
    type: "practice",
    title: "Kiểm tra số chẵn và dương",
    question:
      "<p>Nhập một số nguyên. Nếu số đó lớn hơn 0 VÀ chia hết cho 2 thì in \"Đúng chuẩn\", ngược lại in \"Sai chuẩn\".</p>",
    answer:
      'so = int(input("Nhập một số: "))\nif so > 0 and so % 2 == 0:\n    print("Đúng chuẩn")\nelse:\n    print("Sai chuẩn")',
    difficulty: "hard",
    points: 15,
    answerVisible: true,
    sortOrder: 4,
  },
  {
    type: "homework",
    title: "Giao thông ở ngã tư",
    question:
      "<p>Nhập màu đèn giao thông (\"Xanh\", \"Vàng\", \"Đỏ\"). Xanh → \"Được đi\", Vàng → \"Đi chậm lại\", Đỏ → \"Dừng lại\", màu khác → \"Đèn hỏng\".</p><p><strong>Ví dụ:</strong> Input <code>Vàng</code> → Output <code>Đi chậm lại</code>.</p>",
    answer:
      'mau = input("Nhập màu đèn giao thông: ")\nif mau == "Xanh":\n    print("Được đi")\nelif mau == "Vàng":\n    print("Đi chậm lại")\nelif mau == "Đỏ":\n    print("Dừng lại")\nelse:\n    print("Đèn hỏng")',
    difficulty: "easy",
    points: 20,
    answerVisible: false,
    sortOrder: 5,
  },
  {
    type: "homework",
    title: "Tính tiền vé xe buýt",
    question:
      "<p>Vé xe buýt giá 7000đ. Nếu là học sinh (chức danh \"HS\") HOẶC người cao tuổi (tuổi &gt;= 60) thì miễn phí. Nhập chức danh và tuổi, in số tiền phải trả (7000 hoặc 0).</p><p><strong>Ví dụ:</strong> HS, 14 tuổi → <code>0</code>.</p>",
    answer:
      'chuc_danh = input("Nhập chức danh: ")\ntuoi = int(input("Nhập tuổi: "))\n\nif chuc_danh == "HS" or tuoi >= 60:\n    print(0)\nelse:\n    print(7000)',
    difficulty: "medium",
    points: 25,
    answerVisible: false,
    sortOrder: 6,
  },
  {
    type: "homework",
    title: "Kiểm tra tam giác đều",
    question:
      "<p>Nhập 3 cạnh của tam giác. Dùng toán tử <code>and</code> kiểm tra 3 cạnh bằng nhau để xác định tam giác đều.</p><p><strong>Ví dụ:</strong> 5, 5, 5 → <code>Là tam giác đều</code>.</p>",
    answer:
      'a = float(input("Nhập cạnh a: "))\nb = float(input("Nhập cạnh b: "))\nc = float(input("Nhập cạnh c: "))\n\nif a == b and b == c:\n    print("Là tam giác đều")\nelse:\n    print("Không phải tam giác đều")',
    difficulty: "medium",
    points: 25,
    answerVisible: false,
    sortOrder: 7,
  },
  {
    type: "homework",
    title: "Tính năm nhuận",
    question:
      "<p>Năm nhuận: chia hết cho 400 HOẶC (chia hết cho 4 VÀ không chia hết cho 100). Nhập một năm, kiểm tra có phải năm nhuận không.</p><p><strong>Ví dụ:</strong> 2024 → <code>Năm nhuận</code>.</p>",
    answer:
      'nam = int(input("Nhập năm: "))\nif nam % 400 == 0 or (nam % 4 == 0 and nam % 100 != 0):\n    print("Năm nhuận")\nelse:\n    print("Không phải năm nhuận")',
    difficulty: "hard",
    points: 30,
    answerVisible: false,
    sortOrder: 8,
  },
];

// Mọi biến thể tên của "bài 6" cần được thay thế (bản LLM cũ viết HOA + bản này).
const BAI6_TITLES = [
  "BUỔI 6: RẼ NHIỀU NHÁNH IF - ELIF - ELSE & TOÁN TỬ LOGIC",
  LESSON_TITLE,
];
const TARGET_CHAPTER_TITLE = "INTERACTIVE & TƯ DUY LOGIC RẼ NHÁNH";

async function main() {
  console.log(`🚀 Seeding "${LESSON_TITLE}"...\n`);

  // 1) Chương đích = chương của bài 6 (rẽ nhánh); fallback chương đầu, hoặc tạo mới.
  let chapter =
    (await prisma.chapter.findFirst({ where: { title: TARGET_CHAPTER_TITLE } })) ||
    (await prisma.chapter.findFirst({ orderBy: { sortOrder: "asc" } }));
  if (!chapter) {
    chapter = await prisma.chapter.create({
      data: { title: "Lập trình Python cơ bản", icon: "fa-python", sortOrder: 0 },
    });
    console.log(`📁 Đã tạo chương mới: ${chapter.title}`);
  }
  console.log(`📁 Gắn vào chương: ${chapter.title} (${chapter.id})`);

  // 2) Giữ đúng vị trí: lấy sortOrder của bài 6 cũ trong chương đích (nếu có).
  const existing = await prisma.lesson.findFirst({
    where: { title: { in: BAI6_TITLES }, chapterId: chapter.id },
    orderBy: { sortOrder: "asc" },
  });

  // 3) Thay thế: xoá MỌI biến thể bài 6 ở mọi chương (cascade xoá tab/bài tập + tiến độ).
  const removed = await prisma.lesson.deleteMany({
    where: { title: { in: BAI6_TITLES } },
  });
  if (removed.count > 0) {
    console.log(`🧹 Đã xoá ${removed.count} bản bài 6 cũ (thay thế).`);
  }

  // 4) sortOrder: giữ chỗ cũ nếu có, không thì nối cuối chương.
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

  // 4) Tạo bài giảng đầy đủ.
  const lesson = await prisma.lesson.create({
    data: {
      chapterId: chapter.id,
      title: LESSON_TITLE,
      content: "",
      duration: 120,
      difficulty: "beginner",
      sortOrder,
      isPublished: true,
      objectiveKnowledge: objectives.knowledge,
      objectiveSkills: objectives.skills,
      objectiveAttitude: objectives.attitude,
      sections: {
        create: sections.map((section) => ({
          title: section.title,
          content: section.content ?? "",
          contentFormat: section.contentFormat,
          contentBlocks: section.contentBlocks,
          sortOrder: section.sortOrder,
        })),
      },
      exercises: { create: exercises },
    },
    include: { sections: true, exercises: true },
  });

  console.log(
    `\n✅ Đã tạo bài: ${lesson.title}\n   - ID: ${lesson.id}\n   - ${lesson.sections.length} tab, ${lesson.exercises.length} bài tập`
  );
  console.log("\n🎉 Xong! Mở bài trong app để Duyệt — bài phải đạt sàn (hero + đa dạng + tổng kết).");
}

module.exports = { LESSON_TITLE, objectives, sections, exercises };

// Chỉ chạy ghi DB khi gọi trực tiếp (node prisma/seed-bai6.js); khi được require
// để verify thì chỉ export dữ liệu.
if (require.main === module) {
  main()
    .catch((error) => {
      console.error("❌ Seed lỗi:", error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
