# Demo Data Generator for School Dashboard

## Tổng Quan

Script này tạo dữ liệu demo thực tế cho hệ thống quản lý trường học, bao gồm:

### Dữ Liệu Được Tạo

| Loại | Số Lượng | Mô Tả |
|------|----------|-------|
| **Admin** | 1 | Quản trị viên hệ thống |
| **Giáo Viên** | 10 | 10 môn học khác nhau |
| **Học Sinh** | 50+ | Phân bổ đều 3 lớp |
| **Lớp Học** | 3 | 10A1, 10A2, 10A3 |
| **Môn Học** | 30 | 10 môn × 3 lớp |
| **Điểm Số** | 3,000+ | Nhiều loại điểm (miệng, 15', 1 tiết, giữa kỳ, cuối kỳ) |
| **Điểm Danh** | 3,000+ | 30 ngày gần nhất |
| **Bài Tập** | 100+ | Homework, Projects, Quizzes |
| **Bài Nộp** | 3,500+ | 70-90% tỷ lệ nộp bài |
| **Thông Báo** | 200+ | Điểm, bài tập, điểm danh |

---

## Cách Sử Dụng

### 1. Chạy Script Seed

```bash
cd backend
node scripts/seed-demo-data.js
```

### 2. Đợi Hoàn Thành

Script sẽ:
1. ✅ Xóa dữ liệu cũ (nếu có)
2. ✅ Tạo admin, giáo viên, học sinh
3. ✅ Tạo lớp học và môn học
4. ✅ Tạo điểm số với patterns thực tế
5. ✅ Tạo điểm danh 30 ngày
6. ✅ Tạo bài tập và bài nộp
7. ✅ Tạo thông báo

**Thời gian:** ~30-60 giây

---

## Thông Tin Đăng Nhập

### Admin
```
Email: admin@school.edu.vn
Password: Admin@123
```

### Giáo Viên
```
Email: [tên][họ].teacher@school.edu.vn
Password: Teacher@123

Ví dụ:
- minhnguyễn.teacher@school.edu.vn
- hungtran.teacher@school.edu.vn
```

### Học Sinh
```
Email: [tên][họ].student@school.edu.vn
Password: Student@123

Ví dụ:
- anhle.student@school.edu.vn
- huongpham.student@school.edu.vn
```

---

## Đặc Điểm Dữ Liệu

### 1. Tên Việt Nam Thực Tế
- Họ: Nguyễn, Trần, Lê, Phạm, Hoàng, Phan, Vũ, Võ...
- Tên: Minh, Anh, Hương, Linh, Tuấn, Dũng...

### 2. Patterns Học Tập

**Học Sinh Giỏi (Top 3 mỗi lớp):**
- Điểm: 8.5 - 10.0
- Điểm danh: 99% Present
- Nộp bài: 100%

**Học Sinh Khá (5 học sinh):**
- Điểm: 7.0 - 8.5
- Điểm danh: 95% Present
- Nộp bài: 90%

**Học Sinh Trung Bình (6 học sinh):**
- Điểm: 5.5 - 7.0
- Điểm danh: 85% Present
- Nộp bài: 75%

**Học Sinh Yếu (3 học sinh):**
- Điểm: 4.0 - 6.0
- Điểm danh: 70% Present
- Nộp bài: 60%

### 3. Môn Học

1. **Toán** - Bộ môn Toán - Tin
2. **Văn** - Bộ môn Ngữ Văn
3. **Tiếng Anh** - Bộ môn Ngoại Ngữ
4. **Vật Lý** - Bộ môn Khoa Học Tự Nhiên
5. **Hóa Học** - Bộ môn Khoa Học Tự Nhiên
6. **Sinh Học** - Bộ môn Khoa Học Tự Nhiên
7. **Lịch Sử** - Bộ môn Khoa Học Xã Hội
8. **Địa Lý** - Bộ môn Khoa Học Xã Hội
9. **Tin Học** - Bộ môn Toán - Tin
10. **Thể Dục** - Bộ môn Thể Chất

### 4. Cấu Trúc Lớp

```
10A1 (17 học sinh)
├── GVCN: (Giáo viên được chọn tự động)
├── Phòng: 101
└── 10 môn học

10A2 (17 học sinh)
├── GVCN: (Giáo viên được chọn tự động)
├── Phòng: 102
└── 10 môn học

10A3 (16 học sinh)
├── GVCN: (Giáo viên được chọn tự động)
├── Phòng: 103
└── 10 môn học
```

### 5. Điểm Số Chi Tiết

Mỗi học sinh có **5-8 điểm** cho mỗi môn:

- **Điểm miệng** (hệ số 1) - 2-3 điểm
- **Kiểm tra 15 phút** (hệ số 1) - 1-2 điểm
- **Kiểm tra 1 tiết** (hệ số 1) - 1-2 điểm
- **Giữa kỳ** (hệ số 2) - 1 điểm
- **Cuối kỳ** (hệ số 3) - 1 điểm

**Tổng:** ~3,000+ điểm số

### 6. Điểm Danh

- **30 ngày** gần nhất (trừ cuối tuần)
- **2 môn/ngày** cho mỗi học sinh
- **Trạng thái:** Present, Absent, Late, Excused
- **Patterns:** Học sinh giỏi ít vắng, học sinh yếu vắng nhiều

### 7. Bài Tập & Nộp Bài

**Mỗi môn học có 3-5 bài tập:**
- Homework (Bài tập về nhà)
- Project (Dự án)
- Quiz (Kiểm tra)

**Tỷ lệ nộp bài:** 70-90%

**Điểm bài nộp:** Theo patterns học tập của từng học sinh

---

## Sử Dụng Cho Demo

### 1. Dashboard Admin

Login với `admin@school.edu.vn` để xem:
- Thống kê toàn trường
- 10 giáo viên, 50 học sinh, 3 lớp
- Biểu đồ điểm số theo môn
- Tỷ lệ điểm danh
- Top học sinh

### 2. Dashboard Giáo Viên

Login với email giáo viên để xem:
- Danh sách học sinh của lớp
- Nhập điểm cho môn dạy
- Xem điểm danh
- Quản lý bài tập
- Chấm bài nộp

### 3. Dashboard Học Sinh

Login với email học sinh để xem:
- Điểm số các môn
- Lịch sử điểm danh
- Bài tập được giao
- Nộp bài trực tuyến
- Thông báo

### 4. AI Features

Với dữ liệu đầy đủ, các tính năng AI sẽ hoạt động:

**Phân Tích Xu Hướng:**
- Dự đoán học sinh có nguy cơ học yếu
- Phát hiện patterns điểm danh
- Recommendations cải thiện

**Early Warning:**
- Cảnh báo học sinh vắng nhiều
- Cảnh báo điểm số giảm
- Khuyến nghị can thiệp

---

## Lưu Ý

### ⚠️ Cảnh Báo

**Script này sẽ XÓA TẤT CẢ dữ liệu hiện tại!**

Nếu bạn có dữ liệu quan trọng, hãy backup trước:

```bash
# Backup database
pg_dump -U postgres school_dashboard > backup.sql

# Restore (nếu cần)
psql -U postgres school_dashboard < backup.sql
```

### ✅ Best Practices

1. **Chạy trong môi trường dev/test** trước
2. **Backup database** trước khi chạy
3. **Kiểm tra kết nối database** trước
4. **Đảm bảo bcrypt đã cài đặt** (`npm install`)

### 🔧 Troubleshooting

**Lỗi: "Cannot find module"**
```bash
cd backend
npm install
```

**Lỗi: "Database connection failed"**
- Kiểm tra PostgreSQL đã chạy
- Kiểm tra `.env` file
- Kiểm tra credentials

**Lỗi: "Duplicate key"**
- Chạy lại script (nó sẽ xóa dữ liệu cũ tự động)

---

## Tùy Chỉnh Dữ Liệu

### Thay Đổi Số Lượng

Mở `seed-demo-data.js` và sửa các biến:

```javascript
// Line ~30
const subjects = [...]; // Thay đổi số môn học

// Line ~265
const studentsPerClass = 17; // Thay đổi số học sinh/lớp

// Line ~280
const classNames = ['10A1', '10A2', '10A3']; // Thay đổi tên lớp
```

### Thay Đổi Patterns

```javascript
// Line ~85 - Hàm generateGrade
function generateGrade(studentType, subject) {
  // Sửa base và variance để thay đổi patterns điểm
}
```

---

## Output Mẫu

```
🌱 Starting demo data seeding...

✅ Database connected

🗑️  Clearing existing data...
✅ Existing data cleared

👤 Creating admin user...
✅ Admin created: admin@school.edu.vn / Admin@123

👨‍🏫 Creating teachers...
✅ Created 10 teachers
   - Nguyễn Minh (Toán): minhnguyễn.teacher@school.edu.vn
   - Trần Hương (Văn): huongtran.teacher@school.edu.vn
   ...

🏫 Creating classes...
✅ Created 3 classes: 10A1, 10A2, 10A3

👨‍🎓 Creating students...
✅ Created 50 students across 3 classes

📚 Creating courses...
✅ Created 30 courses

📊 Creating grades...
✅ Created 3240 grade records

📅 Creating attendance records...
✅ Created 3000 attendance records

📝 Creating assignments...
✅ Created 120 assignments

📤 Creating submissions...
✅ Created 3780 submissions

🔔 Creating notifications...
✅ Created 250 notifications

╔════════════════════════════════════════╗
║       DEMO DATA SEEDING COMPLETE       ║
╚════════════════════════════════════════╝

📊 Summary:
   - Admin Users: 1
   - Teachers: 10
   - Students: 50
   - Classes: 3
   - Courses: 30
   - Grades: 3240
   - Attendance: 3000
   - Assignments: 120
   - Submissions: 3780
   - Notifications: 250

✅ All demo data created successfully!
```

---

## Câu Hỏi Thường Gặp

**Q: Mất bao lâu để chạy script?**
A: ~30-60 giây tùy máy

**Q: Có thể chạy nhiều lần không?**
A: Có, script sẽ xóa dữ liệu cũ và tạo mới

**Q: Dữ liệu có realistic không?**
A: Có, tên Việt Nam, patterns học tập thực tế, điểm số hợp lý

**Q: AI có hoạt động với data này không?**
A: Có, đầy đủ dữ liệu cho predictions và analytics

**Q: Có thể customize không?**
A: Có, sửa script theo hướng dẫn ở trên

---

**Tạo bởi:** Claude Code
**Ngày:** 2025-11-13
**Version:** 1.0.0
