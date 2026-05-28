Tạo bài học mới cho dự án Python LMS.

## Tham số
`$ARGUMENTS` — tiêu đề hoặc chủ đề của bài học cần tạo.

## Bước thực hiện

1. Hỏi user (nếu `$ARGUMENTS` chưa đủ thông tin) về:
   - **Tiêu đề bài học** — ví dụ: "Vòng lặp for trong Python"
   - **Chapter** — bài học thuộc chương nào (xem `prisma/schema.prisma` hoặc hỏi user)
   - **Loại nội dung** — có tab code thực hành không? Có bài tập không?
   - **Thứ tự** — bài học thứ mấy trong chương

2. Tạo nội dung bài học với cấu trúc hợp lý:
   - Tab "Lý thuyết" — giải thích khái niệm, ví dụ minh họa (dùng HTML/TinyMCE format)
   - Tab "Bài tập" (nếu cần) — code starter + expected output
   - Tab "Giải" (nếu cần) — lời giải mẫu (mặc định ẩn, giáo viên mở)

3. Tạo API call hoặc hướng dẫn user tạo qua giao diện admin tại `/admin/lessons`.

4. Nếu tạo qua code, tham khảo API endpoint: `POST /api/lessons` với body:
   ```json
   {
     "title": "Tên bài học",
     "chapterId": "id-cua-chapter",
     "order": 1,
     "tabs": [
       {
         "title": "Lý thuyết",
         "type": "CONTENT",
         "content": "<p>Nội dung HTML...</p>",
         "order": 0
       }
     ]
   }
   ```

5. Sau khi tạo, kiểm tra bài học hiển thị đúng tại `/lessons/[id]`.

## Gợi ý nội dung cho bài học Python
- Luôn có ví dụ code thực tế, ngắn gọn
- Giải thích từng dòng code bằng comment
- Bài tập nên tăng dần độ khó: dễ → trung bình
- Dùng Monaco Editor để hiển thị code (đã được tích hợp sẵn)

## Files liên quan
- [src/components/lessons/LessonContentRenderer.tsx](../src/components/lessons/LessonContentRenderer.tsx) — render bài học
- [src/app/api/lessons/](../src/app/api/lessons/) — API endpoints
- [src/app/admin/](../src/app/admin/) — giao diện tạo/quản lý bài học
