# ĐỀ KIỂM TRA ĐỊNH KỲ CHƯƠNG 1 & 2 — 45 PHÚT

Tách riêng từ Buổi 8 để dùng cho phần Bài kiểm tra. Gồm: đề thi (Phần 1 trắc nghiệm
+ Phần 2 thực hành) và phần chữa bài / đáp án.

---

## PHẦN 1 — TRẮC NGHIỆM (khuyến nghị 10 phút)

Học sinh đọc kỹ đề và ghi đáp án (A, B, C hoặc D) ra giấy.

**Câu 1.** Phép toán `15 // 4 + 15 % 4` cho kết quả là bao nhiêu?
- A. 3
- B. 6
- C. 7
- D. 3.75

**Câu 2.** Biểu thức nào trả về `True` nếu `tuoi = 15`?
- A. `tuoi > 18 and tuoi < 20`
- B. `tuoi == 15 or tuoi > 20`
- C. `not (tuoi == 15)`
- D. `tuoi != 15 and tuoi < 18`

**Câu 3.** Lỗi `IndentationError` thường xảy ra khi nào?
- A. Viết sai tên lệnh (ví dụ: `pritn`).
- B. Quên thụt lề (Tab) các dòng code bên trong lệnh `if` hoặc `else`.
- C. Quên dấu ngoặc kép khi in chuỗi.
- D. Chia một số cho 0.

**Câu 4.** Để kiểm tra `diem` có nằm trong khoảng từ 5 đến 10 (gồm cả 5 và 10), viết thế nào?
- A. `if diem >= 5 or diem <= 10:`
- B. `if 5 < diem < 10:`
- C. `if diem >= 5 and diem <= 10:`
- D. `if diem => 5 and diem <= 10:`

---

## PHẦN 2 — THỰC HÀNH LẬP TRÌNH (khuyến nghị 35 phút)

Tạo một file Python mới cho mỗi bài và gõ code giải quyết.

**Bài 1 — Rạp chiếu phim (3 điểm).** Giá vé 50.000đ/vé. Nhập số lượng vé. Mua từ 5 vé
trở lên được giảm 10% TỔNG hóa đơn. Tính và in số tiền khách phải trả.

**Bài 2 — Oẳn Tù Tì (3 điểm).** Người 1 và Người 2 lần lượt nhập "Kéo", "Búa" hoặc
"Bao". In ra "Người 1 thắng", "Người 2 thắng" hoặc "Hòa". (Gợi ý: if-elif-else và
toán tử `and` để liệt kê các trường hợp Người 1 thắng.)

**Bài 3 — Phí giao hàng (4 điểm).** Nhập khoảng cách giao hàng (km) và giá trị đơn
hàng (VNĐ). Tính phí theo quy tắc:
- Khoảng cách ≤ 2 km: phí 15.000đ.
- Từ 2 km đến dưới 5 km: phí 25.000đ.
- ≥ 5 km: phí cơ bản 25.000đ + 5.000đ cho mỗi km vượt mốc 5km.
- ĐẶC BIỆT: nếu đơn hàng ≥ 300.000đ → miễn phí (phí = 0) bất kể khoảng cách.

---

## ĐÁP ÁN & CHỮA BÀI

### Phần 1 — Trắc nghiệm
- **Câu 1: B** — `15 // 4 = 3`, `15 % 4 = 3`, tổng là 6.
- **Câu 2: B** — `tuoi == 15` là Đúng; với `or` chỉ cần một vế Đúng là cả biểu thức Đúng.
- **Câu 3: B** — `IndentationError` là lỗi thụt lề, hay gặp khi quên Tab trong khối if/else.
- **Câu 4: C** — dùng `and` để kẹp chặt hai đầu `>= 5` và `<= 10` (lưu ý `=>` là sai cú pháp).

### Chữa Bài 3 — Phí giao hàng (bài bậc thang + điều kiện ưu tiên)

Mẹo: xét điều kiện ưu tiên (đơn ≥ 300k) TRƯỚC để loại trừ sớm.

```python
khoang_cach = float(input("Nhập khoảng cách (km): "))
gia_tri_don = int(input("Nhập giá trị đơn hàng (VNĐ): "))

# Xét điều kiện ưu tiên trước tiên
if gia_tri_don >= 300000:
    phi = 0
# Chia bậc khoảng cách nếu không được miễn phí
elif khoang_cach <= 2:
    phi = 15000
elif khoang_cach < 5:
    phi = 25000
else:
    # 25000 cộng với phần km vượt quá 5km
    phi = 25000 + (khoang_cach - 5) * 5000

print("Phí giao hàng của bạn là:", phi)
```

Ví dụ chạy: khoảng cách `7.5`, đơn `150000` → `Phí giao hàng của bạn là: 37500.0`.

### Hướng dẫn logic Bài 2 — Oẳn Tù Tì

Không cần viết đủ 9 trường hợp, hãy tư duy gộp:
- TH1: hai bên nhập giống nhau → Hòa.
- TH2 (Người 1 thắng): Kéo thắng Bao, hoặc Búa thắng Kéo, hoặc Bao thắng Búa.
- TH3 (else): còn lại là Người 2 thắng.

```python
p1 = input("Người 1 ra gì (Kéo/Búa/Bao): ")
p2 = input("Người 2 ra gì (Kéo/Búa/Bao): ")

if p1 == p2:
    print("Hòa")
elif (p1 == "Kéo" and p2 == "Bao") or (p1 == "Búa" and p2 == "Kéo") or (p1 == "Bao" and p2 == "Búa"):
    print("Người 1 thắng")
else:
    print("Người 2 thắng")
```

### Gợi ý lời giải Bài 1 — Rạp chiếu phim

```python
so_ve = int(input("Nhập số vé: "))
tien = so_ve * 50000

if so_ve >= 5:
    tien = tien - (tien * 10 / 100)

print("Số tiền phải trả:", tien)
```

---

## LỖI PHỔ BIẾN (rút kinh nghiệm)
1. Quên ép kiểu khi dùng `input()` → `TypeError` khi tính toán.
2. Ở Bài 3, áp thẳng `khoang_cach * 5000` ở bậc cuối mà quên trừ phần km đã tính giá
   cố định ở bậc trước.
3. Kinh nghiệm: điều kiện "ghi đè" (như miễn phí giao hàng) nên đặt ở dòng `if` đầu
   tiên để hệ thống kiểm tra và loại trừ sớm nhất.
