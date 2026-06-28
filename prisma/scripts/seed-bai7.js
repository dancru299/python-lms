/**
 * Seed Bài 7: "Cày bài tập nâng cao - Câu lệnh rẽ nhánh".
 * Dựng tay theo khung teaching_canvas, honor đúng mọi "Vai trò gợi ý" trong raw,
 * verify đạt sàn trước khi seed. Chạy:  node prisma/seed-bai7.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const LESSON_TITLE = "BUỔI 7: Cày bài tập nâng cao - Câu lệnh rẽ nhánh";
const TARGET_CHAPTER_TITLE = "INTERACTIVE & TƯ DUY LOGIC RẼ NHÁNH";

const objectives = {
  knowledge:
    "Nắm thuật toán giải các bài toán thực tế phức tạp như chia bậc và gộp nhiều điều kiện.",
  skills:
    "Biết chia nhỏ bài toán, dùng thuần thục if - elif - else lồng nhau và toán tử logic.",
  attitude:
    "Kiên nhẫn, rèn tư duy kiểm thử với các mốc dữ liệu nhạy cảm để tránh lỗi.",
};

const step = (id, text) => ({ id, text });
const card = (icon, title, description) => ({ icon, title, description });

const sections = [
  {
    title: "Khởi động & Mục tiêu",
    contentFormat: "canvas",
    sortOrder: 0,
    contentBlocks: [
      {
        id: "b7s1-hero",
        type: "teaching_canvas",
        title: "Buổi 7: Cày bài tập nâng cao — Rẽ nhánh",
        layout: "hero",
        mainHtml:
          "<p>Đóng vai lập trình viên thực thụ: giải bài tam giác, tiền bậc thang, ngày tháng năm.</p>",
        code: "", mediaId: "", notesHtml: "", reveal: false, steps: [],
      },
      {
        id: "b7s1-context",
        type: "teaching_canvas",
        title: "Bài toán tiền điện bậc thang",
        layout: "highlight",
        mainHtml:
          "<p>Hóa đơn điện 500.000đ: 50 số đầu giá rẻ, từ số 51 lại đắt hơn. Máy tính dùng rẽ nhánh nào để ra con số đó?</p>",
        code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b7s1-context-1", "Cùng là điện nhưng giá chia theo bậc, không đồng giá."),
          step("b7s1-context-2", "Hôm nay giải các bài kinh điển: tam giác, tiền bậc thang, ngày tháng."),
        ],
      },
      {
        id: "b7s1-goals",
        type: "teaching_canvas",
        title: "Mục tiêu bài học",
        layout: "checklist",
        mainHtml: "<p>Sau buổi học, em sẽ:</p>",
        code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b7s1-goals-1", "Kiến thức: thuật toán các bài thực tế phức tạp (chia bậc, nhiều điều kiện gộp)."),
          step("b7s1-goals-2", "Kỹ năng: chia nhỏ bài toán, dùng thuần thục if-elif-else lồng nhau và toán tử logic."),
          step("b7s1-goals-3", "Thái độ: kiên nhẫn, rèn tư duy test với các mốc dữ liệu nhạy cảm."),
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
        id: "b7s2-divide",
        type: "teaching_canvas",
        title: "Chia để trị",
        layout: "highlight",
        mainHtml: "<p>Gặp bài khó, đừng vội gõ code — hãy bóc tách vấn đề trước.</p>",
        code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b7s2-divide-1", "Cần dữ liệu đầu vào nào? (ví dụ: số km đã đi)."),
          step("b7s2-divide-2", "Có bao nhiêu trường hợp xảy ra? (ví dụ: dưới 1km, 1–5km, trên 5km)."),
          step("b7s2-divide-3", "Kết quả cần in ra là gì? (ví dụ: tổng số tiền)."),
        ],
      },
      {
        id: "b7s2-ladder",
        type: "teaching_canvas",
        title: "Bậc thang — quy tắc cắt khúc",
        layout: "highlight",
        mainHtml:
          "<p>Như đi taxi: 1km đầu mở cửa giá cố định (15.000đ), nhưng sang km thứ 2 giá chỉ còn 12.000đ.</p>",
        code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b7s2-ladder-1", "Không thể lấy tổng số km nhân với giá thấp."),
          step("b7s2-ladder-2", "Phải 'cắt' 1km đầu tính riêng, phần còn lại tính riêng, rồi cộng lại."),
        ],
      },
      {
        id: "b7s2-edge",
        type: "teaching_canvas",
        title: "Quy tắc vàng",
        layout: "statement",
        mainHtml:
          "<p>Luôn kiểm tra 'điểm mù' (edge cases): chặn số âm, cạnh bằng 0… bằng lệnh if ngay từ đầu.</p>",
        code: "", mediaId: "", notesHtml: "", reveal: false, steps: [],
      },
    ],
  },
  {
    title: "Quy trình & So sánh",
    contentFormat: "canvas",
    sortOrder: 2,
    contentBlocks: [
      {
        id: "b7s3-flow",
        type: "teaching_canvas",
        title: "Luồng tính tiền bậc thang",
        layout: "flow",
        mainHtml: "", code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b7s3-flow-1", "Lấy dữ liệu đầu vào."),
          step("b7s3-flow-2", "Kiểm tra dữ liệu hợp lệ (phải lớn hơn 0)."),
          step("b7s3-flow-3", "Nếu ≤ Mốc 1: tính tiền theo giá Bậc 1."),
          step("b7s3-flow-4", "Nếu ≤ Mốc 2: tiền tối đa Bậc 1 + phần dư tính theo giá Bậc 2."),
          step("b7s3-flow-5", "In ra tổng tiền."),
        ],
      },
      {
        id: "b7s3-compare",
        type: "teaching_canvas",
        title: "Đồng giá vs Bậc thang",
        layout: "compare",
        mainHtml: "", code: "", mediaId: "", notesHtml: "", reveal: false,
        steps: [],
        cards: [
          card("fa-tags", "Đồng giá (mua kẹo)", "Tổng tiền = Số lượng × Giá bán. Chỉ 1 dòng code, không cần if-else."),
          card("fa-stairs", "Bậc thang (điện, taxi, thuế)", "Phải chẻ nhỏ số lượng ra nhiều khúc. Bắt buộc if-elif-else để xét bậc."),
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
        id: "b7s4-code",
        type: "teaching_canvas",
        title: "Kiểm tra 3 cạnh tam giác",
        layout: "code_explain",
        mainHtml:
          "<p>Quy tắc: tổng độ dài 2 cạnh bất kỳ luôn lớn hơn cạnh còn lại.</p><pre>Đang kiểm tra...\nĐây là một tam giác hợp lệ!</pre>",
        code: [
          "a = 3",
          "b = 4",
          "c = 5",
          'print("Đang kiểm tra...")',
          "if a + b > c and a + c > b and b + c > a:",
          '    print("Đây là một tam giác hợp lệ!")',
          "else:",
          '    print("Đây KHÔNG phải là hình tam giác.")',
        ].join("\n"),
        mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b7s4-code-1", "Dòng 1: gán cạnh a = 3."),
          step("b7s4-code-2", "Dòng 2: gán cạnh b = 4."),
          step("b7s4-code-3", "Dòng 3: gán cạnh c = 5."),
          step("b7s4-code-4", "Dòng 4: in 'Đang kiểm tra...'."),
          step("b7s4-code-5", "Dòng 5: if gộp 3 điều kiện bằng and — a+b>c, a+c>b, b+c>a."),
          step("b7s4-code-6", "Dòng 6: cả 3 đều đúng nên in 'tam giác hợp lệ!'."),
          step("b7s4-code-7", "Dòng 7: else dành cho trường hợp không tạo được tam giác."),
          step("b7s4-code-8", "Dòng 8: in 'KHÔNG phải tam giác' — bị bỏ qua vì điều kiện trên Đúng."),
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
        id: "b7s5-playground",
        type: "teaching_canvas",
        title: "Tính cước taxi 2 bậc",
        layout: "playground",
        mainHtml:
          "<p>Taxi: 1km đầu 15.000đ, từ km thứ 2 là 12.000đ/km. Khách đi 5km — điền phần còn thiếu. (Đáp án đúng: 63.000đ)</p>",
        code: [
          "so_km = 5",
          "",
          "if so_km <= 1:",
          "    tien = so_km * 15000",
          "else:",
          "    # 1 km đầu giá 15000, phần km còn lại tính giá 12000",
          "    tien = 1 * 15000 + (so_km - 1) * 12000",
          "",
          'print("Tổng tiền cước là:", tien)',
        ].join("\n"),
        mediaId: "", notesHtml: "", reveal: false, steps: [],
      },
    ],
  },
  {
    title: "Tổng kết",
    contentFormat: "canvas",
    sortOrder: 5,
    contentBlocks: [
      {
        id: "b7s6-mindmap",
        type: "teaching_canvas",
        title: "Tổng kết: Kỹ năng giải bài rẽ nhánh",
        layout: "mindmap",
        mainHtml: "", code: "", mediaId: "", notesHtml: "", reveal: true,
        steps: [
          step("b7s6-1", "Bài toán toán học: kiểm tra tam giác (tổng 2 cạnh > cạnh còn lại), dùng and để gộp chặt."),
          step("b7s6-2", "Bài toán bậc thang: tính tối đa bậc trước + (tổng − mốc trước) × giá bậc mới. Ứng dụng: điện, nước, taxi."),
          step("b7s6-3", "Tư duy kiểm thử: thử số âm, số 0, và đúng ngay tại mốc (1km, 50 số điện)."),
          step("b7s6-4", "Lỗi hay gặp: viết >= thành >, làm sót người dùng nằm ngay trên vạch mốc."),
        ],
      },
    ],
  },
];

const exercises = [
  {
    type: "practice",
    title: "Nửa năm nào?",
    question:
      "<p>Nhập một tháng (1–12). Nếu tháng &lt;= 6 in 'Nửa đầu năm', ngược lại in 'Nửa cuối năm'.</p>",
    answer:
      'thang = int(input("Nhập tháng: "))\nif thang <= 6:\n    print("Nửa đầu năm")\nelse:\n    print("Nửa cuối năm")',
    difficulty: "easy", points: 10, answerVisible: true, sortOrder: 0,
  },
  {
    type: "practice",
    title: "Tính tiền in tài liệu",
    question:
      "<p>Quầy photocopy: dưới 100 trang giá 500đ/trang; từ 100 trang trở lên TẤT CẢ tính 400đ/trang (đồng giá theo mốc). Nhập số trang, in tổng tiền.</p>",
    answer:
      'so_trang = int(input("Nhập số trang: "))\nif so_trang < 100:\n    tien = so_trang * 500\nelse:\n    tien = so_trang * 400\nprint("Tổng tiền:", tien)',
    difficulty: "easy", points: 10, answerVisible: true, sortOrder: 1,
  },
  {
    type: "practice",
    title: "Phân loại tam giác",
    question:
      "<p>Nhập 3 cạnh tam giác. 3 cạnh bằng nhau → 'Tam giác đều'; có 2 cạnh bằng nhau → 'Tam giác cân'; khác → 'Tam giác thường'.</p>",
    answer:
      'a = float(input("Cạnh a: "))\nb = float(input("Cạnh b: "))\nc = float(input("Cạnh c: "))\n\nif a == b and b == c:\n    print("Tam giác đều")\nelif a == b or a == c or b == c:\n    print("Tam giác cân")\nelse:\n    print("Tam giác thường")',
    difficulty: "medium", points: 15, answerVisible: true, sortOrder: 2,
  },
  {
    type: "practice",
    title: "Số ngày trong tháng",
    question:
      "<p>Nhập một tháng (1–12). Tháng 1,3,5,7,8,10,12 có 31 ngày; tháng 4,6,9,11 có 30 ngày; tháng 2 coi như 28 ngày. In số ngày của tháng đó.</p>",
    answer:
      'thang = int(input("Nhập tháng: "))\n\nif thang == 1 or thang == 3 or thang == 5 or thang == 7 or thang == 8 or thang == 10 or thang == 12:\n    print("Tháng này có 31 ngày")\nelif thang == 4 or thang == 6 or thang == 9 or thang == 11:\n    print("Tháng này có 30 ngày")\nelif thang == 2:\n    print("Tháng này có 28 ngày")\nelse:\n    print("Tháng không hợp lệ")',
    difficulty: "medium", points: 15, answerVisible: true, sortOrder: 3,
  },
  {
    type: "practice",
    title: "Tính tiền điện 3 bậc",
    question:
      "<p>50 kWh đầu: 1500đ/kWh; 50 kWh tiếp theo (51–100): 2000đ/kWh; từ 101 trở đi: 2500đ/kWh. Nhập số kWh, in tổng tiền. Gợi ý: cộng dồn tiền từng bậc.</p>",
    answer:
      'kwh = int(input("Nhập số kWh: "))\n\nif kwh <= 50:\n    tien = kwh * 1500\nelif kwh <= 100:\n    tien = (50 * 1500) + (kwh - 50) * 2000\nelse:\n    tien = (50 * 1500) + (50 * 2000) + (kwh - 100) * 2500\n\nprint("Tổng tiền điện là:", tien)',
    difficulty: "hard", points: 20, answerVisible: true, sortOrder: 4,
  },
  {
    type: "homework",
    title: "Tính lương làm thêm",
    question:
      "<p>Chuẩn 40 giờ/tuần, lương 50.000đ/giờ. Giờ làm quá 40 nhân hệ số 1.5 (75.000đ/giờ). Nhập số giờ, tính tổng lương.</p><p><strong>Ví dụ:</strong> 45 → 2.375.000 (40×50000 + 5×75000).</p>",
    answer:
      'gio_lam = float(input("Nhập số giờ làm: "))\nif gio_lam <= 40:\n    luong = gio_lam * 50000\nelse:\n    luong = (40 * 50000) + (gio_lam - 40) * 75000\nprint("Tổng lương:", luong)',
    difficulty: "easy", points: 20, answerVisible: false, sortOrder: 5,
  },
  {
    type: "homework",
    title: "Máy tính BMI",
    question:
      "<p>BMI = cân nặng(kg) / (chiều cao(m))². Nhập cân nặng và chiều cao. BMI &lt; 18.5 → 'Gầy'; 18.5 ≤ BMI &lt; 25 → 'Bình thường'; BMI ≥ 25 → 'Thừa cân'.</p><p><strong>Ví dụ:</strong> 60kg, 1.65m → Bình thường (BMI ≈ 22.03).</p>",
    answer:
      'can_nang = float(input("Nhập cân nặng (kg): "))\nchieu_cao = float(input("Nhập chiều cao (m): "))\nbmi = can_nang / (chieu_cao * chieu_cao)\n\nif bmi < 18.5:\n    print("Gầy")\nelif bmi >= 18.5 and bmi < 25:\n    print("Bình thường")\nelse:\n    print("Thừa cân")',
    difficulty: "medium", points: 25, answerVisible: false, sortOrder: 6,
  },
  {
    type: "homework",
    title: "Tìm Quý trong năm",
    question:
      "<p>Nhập một tháng (1–12). In tháng đó thuộc Quý mấy (Q1: 1–3, Q2: 4–6, Q3: 7–9, Q4: 10–12).</p><p><strong>Ví dụ:</strong> 8 → Quý 3.</p>",
    answer:
      'thang = int(input("Nhập tháng: "))\nif 1 <= thang <= 3:\n    print("Quý 1")\nelif 4 <= thang <= 6:\n    print("Quý 2")\nelif 7 <= thang <= 9:\n    print("Quý 3")\nelif 10 <= thang <= 12:\n    print("Quý 4")\nelse:\n    print("Tháng không hợp lệ")',
    difficulty: "medium", points: 25, answerVisible: false, sortOrder: 7,
  },
  {
    type: "homework",
    title: "Tính năm nhuận",
    question:
      "<p>Nhập một năm. Năm nhuận chia hết cho 400 HOẶC (chia hết cho 4 VÀ không chia hết cho 100). In 'Năm nhuận' hoặc 'Không phải năm nhuận'.</p><p><strong>Ví dụ:</strong> 2024 → Năm nhuận.</p>",
    answer:
      'nam = int(input("Nhập năm: "))\nif nam % 400 == 0 or (nam % 4 == 0 and nam % 100 != 0):\n    print("Năm nhuận")\nelse:\n    print("Không phải năm nhuận")',
    difficulty: "hard", points: 30, answerVisible: false, sortOrder: 8,
  },
];

async function main() {
  console.log(`🚀 Seeding "${LESSON_TITLE}"...\n`);

  let chapter =
    (await prisma.chapter.findFirst({ where: { title: TARGET_CHAPTER_TITLE } })) ||
    (await prisma.chapter.findFirst({ orderBy: { sortOrder: "asc" } }));
  if (!chapter) {
    chapter = await prisma.chapter.create({
      data: { title: "Lập trình Python cơ bản", icon: "fa-python", sortOrder: 0 },
    });
  }
  console.log(`📁 Gắn vào chương: ${chapter.title} (${chapter.id})`);

  // Mọi biến thể bài 7 (bản LLM cũ + bản này) — khớp theo cụm phân biệt.
  const bai7Filter = {
    title: { contains: "cày bài tập nâng cao", mode: "insensitive" },
  };
  const existing = await prisma.lesson.findFirst({
    where: { ...bai7Filter, chapterId: chapter.id },
    orderBy: { sortOrder: "asc" },
  });
  const removed = await prisma.lesson.deleteMany({ where: bai7Filter });
  if (removed.count > 0) console.log(`🧹 Đã xoá ${removed.count} bản bài 7 cũ (thay thế).`);

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
      duration: 120,
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
          contentFormat: s.contentFormat,
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
