# 📖 Truyện Audio

## ✨ Tính năng

- 📚 Đọc truyện online, giao diện tối giản, dễ dùng
- 🔊 Chuyển văn bản thành audio (Text-to-Speech) ngay trên trình duyệt
- 👤 Đăng nhập / đăng ký tài khoản (Supabase Auth)
- ❤️ Thư viện cá nhân — lưu truyện yêu thích
- 💬 Bình luận & cộng đồng người đọc
- 🛠️ Trang quản trị (Admin) để quản lý nội dung
- 🎨 Hiệu ứng 3D (React Three Fiber) cho các thành phần trang trí
- ⚡ Single Page Application — chuyển trang không load lại

## 🧰 Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Framework | React 19 + Vite |
| Định tuyến | React Router |
| Styling | Tailwind CSS |
| Backend / Database | Supabase |
| Đồ họa 3D | React Three Fiber, Drei, Three.js |
| Icon | Lucide React |
| Lint | Oxlint |

## 🚀 Cài đặt & chạy thử

1. Clone dự án:
   ```bash
   git clone <link-repo-cua-ban>
   cd <ten-thu-muc>
   ```

2. Cài đặt thư viện:
   ```bash
   npm install
   ```

3. Tạo file `.env` ở thư mục gốc, dựa theo mẫu `.env.example`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
   > Lấy 2 giá trị này trong Supabase Dashboard → Project Settings → API.

4. Chạy dự án ở môi trường dev:
   ```bash
   npm run dev
   ```

5. Build bản production:
   ```bash
   npm run build
   ```

## 📁 Cấu trúc thư mục

```
src/
  components/   # Các component giao diện (Reader, AudioPlayer, Dashboard, ...)
  hooks/        # Custom hooks (useAuth, useLibrary, useTheme)
  lib/          # Kết nối Supabase, hàm tiện ích format
  App.jsx       # Component gốc
  main.jsx      # Điểm khởi chạy ứng dụng
```

## 📌 Lưu ý

Dự án đang trong quá trình phát triển. Đóng góp ý kiến hoặc báo lỗi, vui lòng tạo Issue trên GitHub.
