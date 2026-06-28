const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Adding homework exercises and creating Part 2...\n");

  // Find the existing lesson "Hàm (Phần 1)"
  const lessonPart1 = await prisma.lesson.findFirst({
    where: { title: { contains: "Hàm (Phần 1)" } },
    include: { chapter: true },
  });

  if (!lessonPart1) {
    console.log("❌ Could not find lesson 'Hàm (Phần 1)'");
    return;
  }

  console.log(`✅ Found lesson: ${lessonPart1.title} (ID: ${lessonPart1.id})`);

  // ========================================
  // PART 1: Add 10 Homework Exercises
  // ========================================
  console.log("\n📝 Adding 10 homework exercises to Part 1...");

  const homeworkExercises = [
    {
      id: `hw-func-1-${Date.now()}`,
      lessonId: lessonPart1.id,
      type: "homework",
      title: "Hàm tính trung bình cộng",
      question: `<h3>Yêu cầu:</h3>
<p>Viết hàm <code>tinh_trung_binh(diem_list)</code> nhận vào một <strong>list các điểm số</strong> và trả về <strong>điểm trung bình</strong>.</p>
<h3>Ví dụ:</h3>
<div class="code-block">
diem = [8, 7, 9, 6, 10]
print(tinh_trung_binh(diem))  # Kết quả: 8.0
</div>
<h3>Gợi ý:</h3>
<ul>
<li>Sử dụng vòng lặp <code>for</code> hoặc hàm <code>sum()</code></li>
<li>Dùng <code>len()</code> để đếm số phần tử</li>
</ul>`,
      answer: `def tinh_trung_binh(diem_list):
    if len(diem_list) == 0:
        return 0
    tong = sum(diem_list)
    return tong / len(diem_list)

# Test
diem = [8, 7, 9, 6, 10]
print(tinh_trung_binh(diem))  # 8.0`,
      difficulty: "easy",
      points: 15,
      answerVisible: false,
      sortOrder: 0,
    },
    {
      id: `hw-func-2-${Date.now()}`,
      lessonId: lessonPart1.id,
      type: "homework",
      title: "Hàm đếm số chẵn lẻ",
      question: `<h3>Yêu cầu:</h3>
<p>Viết hàm <code>dem_chan_le(numbers)</code> nhận vào một <strong>list các số nguyên</strong> và trả về một <strong>dictionary</strong> chứa số lượng số chẵn và số lẻ.</p>
<h3>Ví dụ:</h3>
<div class="code-block">
nums = [1, 2, 3, 4, 5, 6, 7, 8]
print(dem_chan_le(nums))
# Kết quả: {"chan": 4, "le": 4}
</div>
<h3>Gợi ý:</h3>
<ul>
<li>Dùng vòng lặp <code>for</code> để duyệt qua list</li>
<li>Số chẵn: <code>n % 2 == 0</code></li>
</ul>`,
      answer: `def dem_chan_le(numbers):
    result = {"chan": 0, "le": 0}
    for num in numbers:
        if num % 2 == 0:
            result["chan"] += 1
        else:
            result["le"] += 1
    return result

# Test
nums = [1, 2, 3, 4, 5, 6, 7, 8]
print(dem_chan_le(nums))  # {"chan": 4, "le": 4}`,
      difficulty: "medium",
      points: 20,
      answerVisible: false,
      sortOrder: 1,
    },
    {
      id: `hw-func-3-${Date.now()}`,
      lessonId: lessonPart1.id,
      type: "homework",
      title: "Hàm tìm max/min trong list",
      question: `<h3>Yêu cầu:</h3>
<p>Viết hàm <code>tim_max_min(numbers)</code> <strong>KHÔNG sử dụng</strong> hàm <code>max()</code> và <code>min()</code> có sẵn.</p>
<p>Hàm trả về một dictionary chứa giá trị lớn nhất và nhỏ nhất.</p>
<h3>Ví dụ:</h3>
<div class="code-block">
nums = [3, 1, 4, 1, 5, 9, 2, 6]
print(tim_max_min(nums))
# Kết quả: {"max": 9, "min": 1}
</div>
<h3>Gợi ý:</h3>
<ul>
<li>Khởi tạo max và min bằng phần tử đầu tiên</li>
<li>Dùng vòng lặp <code>for</code> để so sánh từng phần tử</li>
</ul>`,
      answer: `def tim_max_min(numbers):
    if len(numbers) == 0:
        return {"max": None, "min": None}
    
    max_val = numbers[0]
    min_val = numbers[0]
    
    for num in numbers:
        if num > max_val:
            max_val = num
        if num < min_val:
            min_val = num
    
    return {"max": max_val, "min": min_val}

# Test
nums = [3, 1, 4, 1, 5, 9, 2, 6]
print(tim_max_min(nums))  # {"max": 9, "min": 1}`,
      difficulty: "medium",
      points: 20,
      answerVisible: false,
      sortOrder: 2,
    },
    {
      id: `hw-func-4-${Date.now()}`,
      lessonId: lessonPart1.id,
      type: "homework",
      title: "Hàm lọc danh sách theo điều kiện",
      question: `<h3>Yêu cầu:</h3>
<p>Viết hàm <code>loc_diem(diem_list, nguong)</code> nhận vào:</p>
<ul>
<li><code>diem_list</code>: List các điểm số</li>
<li><code>nguong</code>: Điểm ngưỡng (mặc định là 5)</li>
</ul>
<p>Trả về một <strong>dictionary</strong> chứa 2 list: học sinh đạt và không đạt.</p>
<h3>Ví dụ:</h3>
<div class="code-block">
diem = [8, 4, 6, 3, 9, 5, 2]
print(loc_diem(diem, 5))
# Kết quả: {"dat": [8, 6, 9, 5], "khong_dat": [4, 3, 2]}
</div>`,
      answer: `def loc_diem(diem_list, nguong=5):
    result = {"dat": [], "khong_dat": []}
    
    for diem in diem_list:
        if diem >= nguong:
            result["dat"].append(diem)
        else:
            result["khong_dat"].append(diem)
    
    return result

# Test
diem = [8, 4, 6, 3, 9, 5, 2]
print(loc_diem(diem, 5))
# {"dat": [8, 6, 9, 5], "khong_dat": [4, 3, 2]}`,
      difficulty: "medium",
      points: 20,
      answerVisible: false,
      sortOrder: 3,
    },
    {
      id: `hw-func-5-${Date.now()}`,
      lessonId: lessonPart1.id,
      type: "homework",
      title: "Hàm xử lý danh sách học sinh",
      question: `<h3>Yêu cầu:</h3>
<p>Cho một list các dictionary chứa thông tin học sinh:</p>
<div class="code-block">
hoc_sinh = [
    {"ten": "An", "diem": 8},
    {"ten": "Binh", "diem": 6},
    {"ten": "Cuong", "diem": 9},
    {"ten": "Dung", "diem": 4}
]
</div>
<p>Viết hàm <code>xep_loai_hoc_sinh(ds_hs)</code> trả về dictionary mới với thêm key <code>"xep_loai"</code>:</p>
<ul>
<li>Điểm >= 8: "Giỏi"</li>
<li>Điểm >= 6.5: "Khá"</li>
<li>Điểm >= 5: "Trung bình"</li>
<li>Điểm < 5: "Yếu"</li>
</ul>`,
      answer: `def xep_loai_hoc_sinh(ds_hs):
    result = []
    for hs in ds_hs:
        diem = hs["diem"]
        if diem >= 8:
            xep_loai = "Giỏi"
        elif diem >= 6.5:
            xep_loai = "Khá"
        elif diem >= 5:
            xep_loai = "Trung bình"
        else:
            xep_loai = "Yếu"
        
        # Tạo dictionary mới với thêm xep_loai
        hs_moi = hs.copy()
        hs_moi["xep_loai"] = xep_loai
        result.append(hs_moi)
    
    return result

# Test
hoc_sinh = [
    {"ten": "An", "diem": 8},
    {"ten": "Binh", "diem": 6},
    {"ten": "Cuong", "diem": 9},
    {"ten": "Dung", "diem": 4}
]
for hs in xep_loai_hoc_sinh(hoc_sinh):
    print(hs)`,
      difficulty: "hard",
      points: 25,
      answerVisible: false,
      sortOrder: 4,
    },
    {
      id: `hw-func-6-${Date.now()}`,
      lessonId: lessonPart1.id,
      type: "homework",
      title: "Hàm đếm tần suất xuất hiện",
      question: `<h3>Yêu cầu:</h3>
<p>Viết hàm <code>dem_tan_suat(items)</code> nhận vào một list và trả về một <strong>dictionary</strong> chứa số lần xuất hiện của mỗi phần tử.</p>
<h3>Ví dụ:</h3>
<div class="code-block">
fruits = ["apple", "banana", "apple", "orange", "banana", "apple"]
print(dem_tan_suat(fruits))
# Kết quả: {"apple": 3, "banana": 2, "orange": 1}
</div>
<h3>Gợi ý:</h3>
<ul>
<li>Sử dụng vòng lặp <code>for</code></li>
<li>Kiểm tra xem key đã tồn tại trong dict chưa</li>
</ul>`,
      answer: `def dem_tan_suat(items):
    result = {}
    for item in items:
        if item in result:
            result[item] += 1
        else:
            result[item] = 1
    return result

# Test
fruits = ["apple", "banana", "apple", "orange", "banana", "apple"]
print(dem_tan_suat(fruits))
# {"apple": 3, "banana": 2, "orange": 1}`,
      difficulty: "medium",
      points: 20,
      answerVisible: false,
      sortOrder: 5,
    },
    {
      id: `hw-func-7-${Date.now()}`,
      lessonId: lessonPart1.id,
      type: "homework",
      title: "Hàm tính giai thừa với while",
      question: `<h3>Yêu cầu:</h3>
<p>Viết hàm <code>giai_thua(n)</code> tính giai thừa của số nguyên n sử dụng vòng lặp <code>while</code>.</p>
<p>Giai thừa: n! = n × (n-1) × (n-2) × ... × 2 × 1</p>
<h3>Ví dụ:</h3>
<div class="code-block">
print(giai_thua(5))  # 120 (vì 5! = 5×4×3×2×1 = 120)
print(giai_thua(0))  # 1 (theo quy ước 0! = 1)
</div>
<h3>Lưu ý:</h3>
<ul>
<li>Xử lý trường hợp n = 0 (trả về 1)</li>
<li>Xử lý trường hợp n < 0 (trả về -1 hoặc thông báo lỗi)</li>
</ul>`,
      answer: `def giai_thua(n):
    if n < 0:
        return -1  # Không có giai thừa cho số âm
    if n == 0 or n == 1:
        return 1
    
    result = 1
    i = n
    while i > 1:
        result = result * i
        i -= 1
    
    return result

# Test
print(giai_thua(5))   # 120
print(giai_thua(0))   # 1
print(giai_thua(10))  # 3628800`,
      difficulty: "medium",
      points: 20,
      answerVisible: false,
      sortOrder: 6,
    },
    {
      id: `hw-func-8-${Date.now()}`,
      lessonId: lessonPart1.id,
      type: "homework",
      title: "Hàm kiểm tra số nguyên tố",
      question: `<h3>Yêu cầu:</h3>
<p>Viết hàm <code>la_so_nguyen_to(n)</code> trả về <code>True</code> nếu n là số nguyên tố, ngược lại trả về <code>False</code>.</p>
<p>Sau đó viết hàm <code>tim_so_nguyen_to(numbers)</code> nhận vào một list số và trả về list các số nguyên tố.</p>
<h3>Ví dụ:</h3>
<div class="code-block">
print(la_so_nguyen_to(7))   # True
print(la_so_nguyen_to(10))  # False

nums = [2, 4, 5, 6, 7, 8, 11, 13, 15]
print(tim_so_nguyen_to(nums))  # [2, 5, 7, 11, 13]
</div>`,
      answer: `def la_so_nguyen_to(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

def tim_so_nguyen_to(numbers):
    result = []
    for num in numbers:
        if la_so_nguyen_to(num):
            result.append(num)
    return result

# Test
print(la_so_nguyen_to(7))   # True
print(la_so_nguyen_to(10))  # False

nums = [2, 4, 5, 6, 7, 8, 11, 13, 15]
print(tim_so_nguyen_to(nums))  # [2, 5, 7, 11, 13]`,
      difficulty: "hard",
      points: 25,
      answerVisible: false,
      sortOrder: 7,
    },
    {
      id: `hw-func-9-${Date.now()}`,
      lessonId: lessonPart1.id,
      type: "homework",
      title: "Hàm sắp xếp dictionary",
      question: `<h3>Yêu cầu:</h3>
<p>Cho một list các dictionary chứa thông tin sản phẩm:</p>
<div class="code-block">
san_pham = [
    {"ten": "Laptop", "gia": 15000000},
    {"ten": "Phone", "gia": 8000000},
    {"ten": "Tablet", "gia": 12000000},
    {"ten": "Watch", "gia": 5000000}
]
</div>
<p>Viết hàm <code>sap_xep_theo_gia(ds_sp, tang_dan=True)</code>:</p>
<ul>
<li>Sắp xếp danh sách theo giá</li>
<li><code>tang_dan=True</code>: Sắp xếp tăng dần</li>
<li><code>tang_dan=False</code>: Sắp xếp giảm dần</li>
</ul>
<h3>Gợi ý:</h3>
<p>Sử dụng thuật toán Bubble Sort hoặc Selection Sort với vòng lặp <code>for</code> lồng nhau.</p>`,
      answer: `def sap_xep_theo_gia(ds_sp, tang_dan=True):
    # Tạo bản sao để không làm thay đổi list gốc
    result = ds_sp.copy()
    n = len(result)
    
    # Bubble Sort
    for i in range(n):
        for j in range(0, n-i-1):
            if tang_dan:
                # Sắp xếp tăng dần
                if result[j]["gia"] > result[j+1]["gia"]:
                    result[j], result[j+1] = result[j+1], result[j]
            else:
                # Sắp xếp giảm dần
                if result[j]["gia"] < result[j+1]["gia"]:
                    result[j], result[j+1] = result[j+1], result[j]
    
    return result

# Test
san_pham = [
    {"ten": "Laptop", "gia": 15000000},
    {"ten": "Phone", "gia": 8000000},
    {"ten": "Tablet", "gia": 12000000},
    {"ten": "Watch", "gia": 5000000}
]

print("Tăng dần:")
for sp in sap_xep_theo_gia(san_pham, True):
    print(f"  {sp['ten']}: {sp['gia']:,} VND")

print("\\nGiảm dần:")
for sp in sap_xep_theo_gia(san_pham, False):
    print(f"  {sp['ten']}: {sp['gia']:,} VND")`,
      difficulty: "hard",
      points: 30,
      answerVisible: false,
      sortOrder: 8,
    },
    {
      id: `hw-func-10-${Date.now()}`,
      lessonId: lessonPart1.id,
      type: "homework",
      title: "Hàm quản lý giỏ hàng",
      question: `<h3>Yêu cầu:</h3>
<p>Viết các hàm để quản lý giỏ hàng đơn giản:</p>
<ol>
<li><code>them_san_pham(gio_hang, ten, gia, so_luong=1)</code>: Thêm sản phẩm vào giỏ</li>
<li><code>tinh_tong_tien(gio_hang)</code>: Tính tổng tiền giỏ hàng</li>
<li><code>tinh_giam_gia(tong_tien, ma_giam)</code>: Áp dụng mã giảm giá</li>
</ol>
<p>Giỏ hàng là một list các dictionary. Mã giảm giá:</p>
<ul>
<li>"SALE10": Giảm 10%</li>
<li>"SALE20": Giảm 20%</li>
<li>"VIP": Giảm 30%</li>
</ul>
<h3>Ví dụ:</h3>
<div class="code-block">
gio = []
them_san_pham(gio, "Áo", 200000, 2)
them_san_pham(gio, "Quần", 350000)
tong = tinh_tong_tien(gio)  # 750000
tong_sau_giam = tinh_giam_gia(tong, "SALE10")  # 675000
</div>`,
      answer: `def them_san_pham(gio_hang, ten, gia, so_luong=1):
    san_pham = {
        "ten": ten,
        "gia": gia,
        "so_luong": so_luong,
        "thanh_tien": gia * so_luong
    }
    gio_hang.append(san_pham)
    print(f"Đã thêm: {ten} x{so_luong} - {gia * so_luong:,} VND")

def tinh_tong_tien(gio_hang):
    tong = 0
    for sp in gio_hang:
        tong += sp["thanh_tien"]
    return tong

def tinh_giam_gia(tong_tien, ma_giam):
    ma_giam_gia = {
        "SALE10": 0.10,
        "SALE20": 0.20,
        "VIP": 0.30
    }
    
    if ma_giam in ma_giam_gia:
        phan_tram = ma_giam_gia[ma_giam]
        giam = tong_tien * phan_tram
        return tong_tien - giam
    else:
        print("Mã giảm giá không hợp lệ!")
        return tong_tien

# Test
gio = []
them_san_pham(gio, "Áo", 200000, 2)
them_san_pham(gio, "Quần", 350000)
them_san_pham(gio, "Giày", 500000)

print(f"\\nGiỏ hàng:")
for sp in gio:
    print(f"  - {sp['ten']}: {sp['thanh_tien']:,} VND")

tong = tinh_tong_tien(gio)
print(f"\\nTổng tiền: {tong:,} VND")

tong_sau_giam = tinh_giam_gia(tong, "SALE10")
print(f"Sau giảm 10%: {tong_sau_giam:,} VND")`,
      difficulty: "hard",
      points: 30,
      answerVisible: false,
      sortOrder: 9,
    },
  ];

  // Create homework exercises
  for (const hw of homeworkExercises) {
    await prisma.exercise.create({ data: hw });
    console.log(`  ✅ Created: ${hw.title}`);
  }

  // ========================================
  // PART 2: Create new lesson "Hàm (Phần 2)"
  // ========================================
  console.log("\n📚 Creating 'Hàm (Phần 2)' lesson...");

  const lessonPart2Id = `lesson-func-2-${Date.now()}`;

  await prisma.lesson.create({
    data: {
      id: lessonPart2Id,
      chapterId: lessonPart1.chapterId,
      title: "Hàm (Phần 2) - Nâng Cao",
      content:
        "<p>Phần 2 của bài giảng về Hàm trong Python, tập trung vào các khái niệm nâng cao.</p>",
      duration: 120,
      difficulty: "intermediate",
      sortOrder: lessonPart1.sortOrder + 1,
      objectiveKnowledge:
        "Hiểu về scope, lambda, đệ quy và higher-order functions",
      objectiveSkills: "Viết được các hàm phức tạp, sử dụng lambda và đệ quy",
      objectiveAttitude:
        "Tư duy giải quyết vấn đề theo hướng modular và recursive",
      sections: {
        create: [
          {
            title: "Phạm vi biến (Scope)",
            content: `<h2>1. Phạm vi biến (Variable Scope)</h2>
<p>Trong Python, <strong>phạm vi biến (scope)</strong> quyết định nơi một biến có thể được truy cập. Có 2 loại scope chính:</p>

<h3>1.1. Local Scope (Phạm vi cục bộ)</h3>
<p>Biến được khai báo <strong>bên trong hàm</strong> chỉ có thể truy cập từ trong hàm đó.</p>
<div class="code-block">
def my_function():
    x = 10  # x là biến local
    print(x)

my_function()  # In ra: 10
print(x)       # Lỗi! x không tồn tại ở ngoài hàm
</div>

<h3>1.2. Global Scope (Phạm vi toàn cục)</h3>
<p>Biến được khai báo <strong>bên ngoài tất cả các hàm</strong>, có thể truy cập từ mọi nơi.</p>
<div class="code-block">
y = 20  # y là biến global

def my_function():
    print(y)  # Có thể truy cập y

my_function()  # In ra: 20
print(y)       # In ra: 20
</div>

<h3>1.3. Từ khóa global</h3>
<p>Để <strong>thay đổi</strong> biến global từ trong hàm, phải dùng từ khóa <code>global</code>.</p>
<div class="code-block">
count = 0

def tang_count():
    global count
    count += 1

tang_count()
tang_count()
print(count)  # In ra: 2
</div>

<h3>1.4. Bảng so sánh Local vs Global</h3>
<table>
<thead>
<tr><th>Đặc điểm</th><th>Local</th><th>Global</th></tr>
</thead>
<tbody>
<tr><td>Khai báo</td><td>Trong hàm</td><td>Ngoài hàm</td></tr>
<tr><td>Truy cập</td><td>Chỉ trong hàm</td><td>Mọi nơi</td></tr>
<tr><td>Thời gian tồn tại</td><td>Khi hàm chạy</td><td>Suốt chương trình</td></tr>
<tr><td>Ưu tiên</td><td>Cao hơn</td><td>Thấp hơn</td></tr>
</tbody>
</table>`,
            sortOrder: 0,
          },
          {
            title: "Hàm Lambda",
            content: `<h2>2. Hàm Lambda (Anonymous Functions)</h2>
<p><strong>Lambda</strong> là cách viết hàm ngắn gọn trên một dòng, thường dùng cho các hàm đơn giản.</p>

<h3>2.1. Cú pháp</h3>
<div class="code-block">
lambda tham_so: bieu_thuc
</div>

<h3>2.2. So sánh hàm thường và Lambda</h3>
<div class="code-block">
# Hàm thường
def binh_phuong(x):
    return x ** 2

# Lambda tương đương
binh_phuong = lambda x: x ** 2

print(binh_phuong(5))  # 25
</div>

<h3>2.3. Lambda với nhiều tham số</h3>
<div class="code-block">
# Tính tổng 2 số
tong = lambda a, b: a + b
print(tong(3, 5))  # 8

# Tính diện tích hình chữ nhật
dien_tich = lambda dai, rong: dai * rong
print(dien_tich(4, 6))  # 24
</div>

<h3>2.4. Lambda với điều kiện</h3>
<div class="code-block">
# Kiểm tra số chẵn
la_chan = lambda x: "Chẵn" if x % 2 == 0 else "Lẻ"
print(la_chan(7))  # Lẻ
print(la_chan(8))  # Chẵn
</div>

<h3>2.5. Khi nào nên dùng Lambda?</h3>
<ul>
<li>Hàm chỉ có <strong>một biểu thức đơn giản</strong></li>
<li>Dùng <strong>một lần</strong> (không cần đặt tên)</li>
<li>Kết hợp với <code>map()</code>, <code>filter()</code>, <code>sorted()</code></li>
</ul>`,
            sortOrder: 1,
          },
          {
            title: "Higher-Order Functions",
            content: `<h2>3. Higher-Order Functions</h2>
<p><strong>Higher-Order Function</strong> là hàm có thể:</p>
<ul>
<li>Nhận <strong>hàm khác làm tham số</strong></li>
<li>Trả về <strong>một hàm</strong></li>
</ul>

<h3>3.1. Hàm map()</h3>
<p>Áp dụng một hàm lên <strong>tất cả phần tử</strong> của một list.</p>
<div class="code-block">
numbers = [1, 2, 3, 4, 5]

# Nhân đôi mỗi số
ket_qua = list(map(lambda x: x * 2, numbers))
print(ket_qua)  # [2, 4, 6, 8, 10]

# Chuyển sang chuỗi
chuoi = list(map(str, numbers))
print(chuoi)  # ['1', '2', '3', '4', '5']
</div>

<h3>3.2. Hàm filter()</h3>
<p>Lọc các phần tử <strong>thỏa mãn điều kiện</strong>.</p>
<div class="code-block">
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# Lọc số chẵn
so_chan = list(filter(lambda x: x % 2 == 0, numbers))
print(so_chan)  # [2, 4, 6, 8, 10]

# Lọc số lớn hơn 5
lon_hon_5 = list(filter(lambda x: x > 5, numbers))
print(lon_hon_5)  # [6, 7, 8, 9, 10]
</div>

<h3>3.3. Hàm sorted() với key</h3>
<p>Sắp xếp với <strong>tiêu chí tùy chỉnh</strong>.</p>
<div class="code-block">
hoc_sinh = [
    {"ten": "An", "diem": 8},
    {"ten": "Binh", "diem": 6},
    {"ten": "Cuong", "diem": 9}
]

# Sắp xếp theo điểm
theo_diem = sorted(hoc_sinh, key=lambda hs: hs["diem"])
print([hs["ten"] for hs in theo_diem])  # ['Binh', 'An', 'Cuong']

# Sắp xếp giảm dần
giam_dan = sorted(hoc_sinh, key=lambda hs: hs["diem"], reverse=True)
print([hs["ten"] for hs in giam_dan])  # ['Cuong', 'An', 'Binh']
</div>

<h3>3.4. Kết hợp map và filter</h3>
<div class="code-block">
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# Lấy bình phương của các số chẵn
ket_qua = list(map(lambda x: x**2, filter(lambda x: x % 2 == 0, numbers)))
print(ket_qua)  # [4, 16, 36, 64, 100]
</div>`,
            sortOrder: 2,
          },
          {
            title: "Đệ quy (Recursion)",
            content: `<h2>4. Đệ quy (Recursion)</h2>
<p><strong>Đệ quy</strong> là kỹ thuật một hàm <strong>gọi lại chính nó</strong> để giải quyết bài toán.</p>

<h3>4.1. Cấu trúc hàm đệ quy</h3>
<div class="code-block">
def ham_de_quy(tham_so):
    # 1. Điều kiện dừng (Base case)
    if dieu_kien_dung:
        return gia_tri_co_ban
    
    # 2. Lời gọi đệ quy (Recursive case)
    return ham_de_quy(tham_so_nho_hon)
</div>

<h3>4.2. Ví dụ: Tính giai thừa</h3>
<div class="code-block">
def giai_thua(n):
    # Base case
    if n == 0 or n == 1:
        return 1
    
    # Recursive case
    return n * giai_thua(n - 1)

print(giai_thua(5))  # 120
# Quá trình: 5 * 4 * 3 * 2 * 1 = 120
</div>

<h3>4.3. Ví dụ: Dãy Fibonacci</h3>
<div class="code-block">
def fibonacci(n):
    # Base case
    if n <= 1:
        return n
    
    # Recursive case
    return fibonacci(n - 1) + fibonacci(n - 2)

# In 10 số Fibonacci đầu tiên
for i in range(10):
    print(fibonacci(i), end=" ")
# 0 1 1 2 3 5 8 13 21 34
</div>

<h3>4.4. Ví dụ: Tính tổng các phần tử trong list</h3>
<div class="code-block">
def tong_list(lst):
    # Base case: list rỗng
    if len(lst) == 0:
        return 0
    
    # Recursive case
    return lst[0] + tong_list(lst[1:])

numbers = [1, 2, 3, 4, 5]
print(tong_list(numbers))  # 15
</div>

<h3>4.5. Lưu ý khi dùng đệ quy</h3>
<ul>
<li>Luôn có <strong>điều kiện dừng</strong> (base case)</li>
<li>Mỗi lần gọi phải <strong>tiến gần hơn</strong> đến điều kiện dừng</li>
<li>Đệ quy sâu có thể gây <strong>tràn stack</strong> (RecursionError)</li>
<li>Python giới hạn mặc định là <strong>1000 lần gọi đệ quy</strong></li>
</ul>`,
            sortOrder: 3,
          },
          {
            title: "Docstrings và Decorators",
            content: `<h2>5. Docstrings và Decorators</h2>

<h3>5.1. Docstrings - Tài liệu hàm</h3>
<p><strong>Docstring</strong> là chuỗi mô tả được đặt ngay đầu hàm, giúp giải thích chức năng của hàm.</p>
<div class="code-block">
def tinh_dien_tich(dai, rong):
    """
    Tính diện tích hình chữ nhật.
    
    Tham số:
        dai (float): Chiều dài của hình
        rong (float): Chiều rộng của hình
    
    Trả về:
        float: Diện tích của hình chữ nhật
    
    Ví dụ:
        >>> tinh_dien_tich(5, 3)
        15
    """
    return dai * rong

# Xem docstring
print(tinh_dien_tich.__doc__)
</div>

<h3>5.2. Decorators - Bọc hàm</h3>
<p><strong>Decorator</strong> là một hàm "bọc" quanh hàm khác để thêm chức năng mà không sửa code gốc.</p>
<div class="code-block">
# Tạo decorator đo thời gian chạy
import time

def do_thoi_gian(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} chạy trong {end - start:.4f} giây")
        return result
    return wrapper

# Sử dụng decorator
@do_thoi_gian
def tinh_toan_nang():
    tong = sum(range(1000000))
    return tong

tinh_toan_nang()
# Output: tinh_toan_nang chạy trong 0.0312 giây
</div>

<h3>5.3. Decorator kiểm tra input</h3>
<div class="code-block">
def kiem_tra_so_duong(func):
    def wrapper(n):
        if n < 0:
            print("Lỗi: Số phải dương!")
            return None
        return func(n)
    return wrapper

@kiem_tra_so_duong
def giai_thua(n):
    if n == 0:
        return 1
    return n * giai_thua(n - 1)

print(giai_thua(5))   # 120
print(giai_thua(-3))  # Lỗi: Số phải dương!
</div>

<h3>5.4. Các decorator có sẵn</h3>
<ul>
<li><code>@staticmethod</code>: Phương thức tĩnh (không cần self)</li>
<li><code>@classmethod</code>: Phương thức lớp</li>
<li><code>@property</code>: Biến thành thuộc tính</li>
</ul>`,
            sortOrder: 4,
          },
        ],
      },
      exercises: {
        create: [
          {
            type: "practice",
            title: "Thực hành Lambda",
            question: `<p>Viết các hàm lambda sau:</p>
<ol>
<li>Tính bình phương của một số</li>
<li>Kiểm tra số có chia hết cho 3 không</li>
<li>Đổi chuỗi thành chữ hoa</li>
</ol>`,
            answer: `# 1. Bình phương
binh_phuong = lambda x: x ** 2
print(binh_phuong(5))  # 25

# 2. Chia hết cho 3
chia_het_3 = lambda x: x % 3 == 0
print(chia_het_3(9))   # True
print(chia_het_3(10))  # False

# 3. Chữ hoa
chu_hoa = lambda s: s.upper()
print(chu_hoa("hello"))  # HELLO`,
            difficulty: "easy",
            points: 10,
            answerVisible: true,
            sortOrder: 0,
          },
          {
            type: "practice",
            title: "Thực hành map và filter",
            question: `<p>Cho list: <code>numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]</code></p>
<p>Sử dụng <code>map()</code> và <code>filter()</code> để:</p>
<ol>
<li>Lấy các số lẻ</li>
<li>Tính lập phương của các số chẵn</li>
</ol>`,
            answer: `numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# 1. Lấy các số lẻ
so_le = list(filter(lambda x: x % 2 != 0, numbers))
print(so_le)  # [1, 3, 5, 7, 9]

# 2. Lập phương của số chẵn
lap_phuong_chan = list(map(lambda x: x**3, filter(lambda x: x % 2 == 0, numbers)))
print(lap_phuong_chan)  # [8, 64, 216, 512, 1000]`,
            difficulty: "medium",
            points: 15,
            answerVisible: true,
            sortOrder: 1,
          },
          {
            type: "practice",
            title: "Thực hành đệ quy",
            question: `<p>Viết hàm đệ quy để:</p>
<ol>
<li>Đếm ngược từ n về 0</li>
<li>Tính tổng các chữ số của một số (ví dụ: 123 → 1+2+3 = 6)</li>
</ol>`,
            answer: `# 1. Đếm ngược
def dem_nguoc(n):
    if n < 0:
        return
    print(n)
    dem_nguoc(n - 1)

dem_nguoc(5)  # 5 4 3 2 1 0

# 2. Tổng các chữ số
def tong_chu_so(n):
    if n < 10:
        return n
    return n % 10 + tong_chu_so(n // 10)

print(tong_chu_so(123))   # 6
print(tong_chu_so(9999))  # 36`,
            difficulty: "hard",
            points: 20,
            answerVisible: true,
            sortOrder: 2,
          },
          // Homework for Part 2
          {
            type: "homework",
            title: "Xử lý dữ liệu với Lambda",
            question: `<h3>Yêu cầu:</h3>
<p>Cho danh sách học sinh:</p>
<div class="code-block">
students = [
    {"name": "An", "score": 85, "age": 16},
    {"name": "Binh", "score": 72, "age": 17},
    {"name": "Cuong", "score": 90, "age": 16},
    {"name": "Dung", "score": 68, "age": 18}
]
</div>
<p>Sử dụng <code>map()</code>, <code>filter()</code>, <code>sorted()</code> với lambda để:</p>
<ol>
<li>Lọc học sinh có điểm >= 80</li>
<li>Sắp xếp theo tuổi giảm dần</li>
<li>Lấy danh sách tên học sinh (chỉ tên)</li>
</ol>`,
            answer: `students = [
    {"name": "An", "score": 85, "age": 16},
    {"name": "Binh", "score": 72, "age": 17},
    {"name": "Cuong", "score": 90, "age": 16},
    {"name": "Dung", "score": 68, "age": 18}
]

# 1. Lọc điểm >= 80
gioi = list(filter(lambda s: s["score"] >= 80, students))
print("Giỏi:", [s["name"] for s in gioi])  # ['An', 'Cuong']

# 2. Sắp xếp theo tuổi giảm dần
theo_tuoi = sorted(students, key=lambda s: s["age"], reverse=True)
print("Theo tuổi:", [s["name"] for s in theo_tuoi])  # ['Dung', 'Binh', 'An', 'Cuong']

# 3. Danh sách tên
ten = list(map(lambda s: s["name"], students))
print("Tên:", ten)  # ['An', 'Binh', 'Cuong', 'Dung']`,
            difficulty: "medium",
            points: 25,
            answerVisible: false,
            sortOrder: 3,
          },
          {
            type: "homework",
            title: "Hàm đệ quy nâng cao",
            question: `<h3>Yêu cầu:</h3>
<p>Viết các hàm đệ quy sau:</p>
<ol>
<li><code>dem_so_am(lst)</code>: Đếm số phần tử âm trong list</li>
<li><code>luy_thua(x, n)</code>: Tính x^n (không dùng **)</li>
<li><code>dao_nguoc_chuoi(s)</code>: Đảo ngược chuỗi</li>
</ol>
<h3>Ví dụ:</h3>
<div class="code-block">
print(dem_so_am([1, -2, 3, -4, -5]))  # 3
print(luy_thua(2, 5))                 # 32
print(dao_nguoc_chuoi("hello"))       # "olleh"
</div>`,
            answer: `# 1. Đếm số âm trong list
def dem_so_am(lst):
    if len(lst) == 0:
        return 0
    count = 1 if lst[0] < 0 else 0
    return count + dem_so_am(lst[1:])

# 2. Lũy thừa
def luy_thua(x, n):
    if n == 0:
        return 1
    if n < 0:
        return 1 / luy_thua(x, -n)
    return x * luy_thua(x, n - 1)

# 3. Đảo ngược chuỗi
def dao_nguoc_chuoi(s):
    if len(s) <= 1:
        return s
    return dao_nguoc_chuoi(s[1:]) + s[0]

# Test
print(dem_so_am([1, -2, 3, -4, -5]))  # 3
print(luy_thua(2, 5))                 # 32
print(dao_nguoc_chuoi("hello"))       # "olleh"`,
            difficulty: "hard",
            points: 30,
            answerVisible: false,
            sortOrder: 4,
          },
        ],
      },
    },
  });

  console.log(
    `✅ Created lesson: Hàm (Phần 2) - Nâng Cao (ID: ${lessonPart2Id})`
  );

  console.log("\n🎉 All done!");
  console.log("   - Added 10 homework exercises to Part 1");
  console.log("   - Created Part 2 with 5 sections and 5 exercises");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
