import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/session";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    await requireTeacher();

    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in .env" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Bạn là một trợ lý ảo am hiểu giáo dục. Hãy nhận nội dung văn bản thô (có thể kèm HTML/Rich Text) sau đó phân tích và chuyển nó thành cấu trúc bài giảng.

**Nhiệm vụ:** Trích xuất và định dạng dữ liệu trả về 100% bằng chuẩn JSON theo cấu trúc sau. TUYỆT ĐỐI KHÔNG thêm Markdown code block như \`\`\`json, chỉ trả về chuỗi JSON thuần túy để parse trực tiếp.
{
  "title": "[Tên bài giảng ngắn gọn, súc tích rút ra từ nội dung]",
  "duration": [Ước lượng tổng thời gian học tính bằng phút, ví dụ: 60, 90, 120. Trả về số nguyên],
  "difficulty": "[beginner hoặc intermediate hoặc advanced]",
  "objectives": {
    "knowledge": "[1-2 câu tóm tắt nhanh kiến thức sẽ học được]",
    "skills": "[1-2 câu tóm tắt kỹ năng người học sẽ làm được]",
    "attitude": "[1 câu tóm tắt thái độ/mindset đạt được]"
  },
  "sections": [
    {
      "title": "[Tên của Tab nội dung, ví dụ: Khái niệm, Cách dùng, Thực hành...]",
      "content": "[Đoạn mã HTML chứa nội dung chi tiết. Lưu ý: Sử dụng thẻ <h2>, <h3>, <ul>, <li>, <p>. Đối với các đoạn code Python, bắt buộc bọc trong <div class=\\\"code-block\\\"> nội dung code </div>. KHÔNG DÙNG Markdown trong khu vực này, CHỈ DÙNG HTML hợp lệ]"
    }
  ],
  "exercises": [
     {
       "type": "practice",
       "title": "Tên bài tập ngắn",
       "question": "Mô tả yêu cầu bài tập (HTML format, có thể dùng div class=code-block nếu cần hiện code mẫu)",
       "answer": "Code giải mẫu thuần túy của bài tập (không cần html)",
       "points": 10,
       "difficulty": "easy"
     }
  ]
}

**Yêu cầu:** 
- Phân chia nội dung thành ít nhất 2-3 "sections" (Tab) hợp lý, chẳng hạn: Khái niệm, Cú pháp, Ví dụ/Thực hành.
- Nếu nội dung có đề cập bài tập, hãy chuyển vào mảng "exercises". Nếu không có, tạo 1 bài tập đơn giản liên quan.
- Chắc chắn rằng mảng sections chứa các object có "title" và "content" (HTML).
- KHÔNG BỌC KẾT QUẢ BẰNG \`\`\`json ... \`\`\`. CHỈ TRẢ VỀ CHUỖI BẮT ĐẦU BẰNG { VÀ KẾT THÚC BẰNG }.
- Trả về tiếng Việt.

**Nội dung thô cần xử lý:**
---
${content}
---
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Try to handle potential markdown formatting if the model disobeys
    let cleanJson = responseText;
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const parsedJson = JSON.parse(cleanJson);

    return NextResponse.json(parsedJson);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return NextResponse.json(
      { error: "Lỗi kết nối AI hoặc xử lý nội dung", details: error.message },
      { status: 500 }
    );
  }
}
