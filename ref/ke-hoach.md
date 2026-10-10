# Kế hoạch: Bản đồ di sản cho khách du lịch – Phường Sài Gòn

Đề tài môn Lịch sử lớp 10. Trang web nhỏ giới thiệu các di tích lịch sử trong Phường Sài Gòn (TP.HCM) trên bản đồ số.

## 1. Phạm vi

- Demo cho **1 phường: Phường Sài Gòn** (mã 26740, 3,04 km², 47.022 dân). Phường mới lập từ 1/7/2025 khi bỏ cấp quận, gộp phường Bến Nghé với một phần Đa Kao và Nguyễn Thái Bình.
- Nội dung lấy từ `ref/map.md`: khoảng 19 di tích chia theo cụm, cộng các quán ăn trong khu vực Quận 1 cũ (quán ở ngoài Quận 1 thì bỏ, đúng như ghi chú trong map.md).
- Một số điểm có trong map.md nhưng nằm ngoài ranh Phường Sài Gòn (dự kiến là Chợ Bến Thành, Dinh Độc Lập, thuộc Phường Bến Thành) vẫn giữ lại, đánh dấu là "phường lân cận".

## 2. Kiến trúc: chỉ có Frontend, không Backend, không Database

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Giao diện | HTML + CSS + JavaScript thuần | Dễ hiểu, dễ giải thích, không cần cài đặt hay build |
| Bản đồ | Leaflet (mã nguồn mở) | Nhẹ, miễn phí, không cần API key |
| Nền bản đồ | CARTO Voyager (dữ liệu OpenStreetMap), dự phòng OpenStreetMap gốc | Từ 9/2026 CARTO cần mã khóa miễn phí (đăng ký bằng email, giáo dục tới 5 triệu lượt/tháng). Dán vào `CARTO_KEY` trong `app.js`. Để trống thì trang tự dùng nền OpenStreetMap phủ màu sepia. Tránh Google Maps vì phải gắn thẻ thanh toán |
| Dữ liệu địa điểm | `data/dia-diem.json` | Trang chỉ để đọc, khoảng 30 điểm, nên không cần database |
| Ranh giới phường | `data/ranh-gioi.geojson` | Tách sẵn từ `data/dm_dia_gioi_hanh_chinh.json` (5,9 MB xuống còn vài chục KB) |
| Đếm điểm trong phường | Tự viết thuật toán "tia sáng" (ray casting) trong `app.js` | Code ngắn, minh họa đúng ý tưởng sẽ trình bày |
| Ảnh | Wikimedia Commons (ảnh xưa là ảnh public domain), lưu vào `images/` | Có giấy phép rõ ràng, ghi nguồn đầy đủ |
| Hosting | GitHub Pages (dự phòng: Netlify Drop) | Miễn phí, có HTTPS, mã nguồn công khai |

Bước "sơ chế" dữ liệu (tách ranh giới, tải ảnh) chạy **một lần trên máy** bằng script trong thư mục `tools/`, không phải backend.

## 3. Cấu trúc thư mục

```
site/                     ← toàn bộ trang web, thư mục này được đưa lên mạng
├── index.html
├── style.css
├── app.js
├── data/
│   ├── dia-diem.json
│   └── ranh-gioi.geojson
└── images/
tai-lieu/huong-dan.html   ← hướng dẫn kỹ thuật riêng cho học sinh (KHÔNG đưa lên mạng)
tools/                    ← script sơ chế dữ liệu (chạy 1 lần)
ref/                      ← tài liệu gốc và kế hoạch
data/                     ← dữ liệu gốc (danh mục địa giới)
```

## 4. Giao diện

- Phong cách bảo tàng/di sản: nền màu giấy ngà, chữ serif cho tiêu đề, màu nhấn đỏ son/đồng. Nền bản đồ phủ nhẹ tông sepia.
- Ranh Phường Sài Gòn được tô viền nổi bật, phần bên ngoài làm mờ đi. Phường Bến Thành hiện màu nhạt để làm bối cảnh.
- Thẻ tóm tắt phường: diện tích, dân số, số di tích nằm trong ranh (máy tự đếm).
- Bấm vào điểm sẽ mở panel: ảnh xưa và nay, mô tả, dòng thời gian, nhân vật và sự kiện liên quan, ý nghĩa, nguồn ảnh.
- Có bộ lọc theo lớp: Di tích / Ẩm thực.
- Desktop: panel nằm bên phải. Điện thoại: panel trượt lên từ dưới.

## 5. Mở rộng sau này

- Thêm địa điểm: thêm một mục vào `dia-diem.json`.
- Thêm phường: chạy lại script tách ranh với mã phường mới. Số điểm trong phường sẽ được đếm lại tự động.

## 6. Sản phẩm bàn giao

1. Trang web chạy được trong thư mục `site/`.
2. `tai-lieu/huong-dan.html`: hướng dẫn kỹ thuật cho học sinh, đi từ kiến trúc tới tên miền, hosting và cách triển khai.
3. Hướng dẫn đưa lên GitHub Pages từng bước (nằm trong file hướng dẫn).

## 7. Kết quả (10/10/2026)

- Đã hoàn thành: `site/` (index.html, style.css, app.js, editor.js, data/, images/ gồm 27 ảnh), `tai-lieu/huong-dan.html` và `tools/` (tach_ranh_gioi.py, tai_anh.py).
- Máy tự đếm được **15/18 di tích** nằm trong Phường Sài Gòn. Ba điểm thuộc Phường Bến Thành: Dinh Độc Lập, Chợ Bến Thành, Thư viện Khoa học Tổng hợp (ranh giới chạy dọc đường Lý Tự Trọng).
- Đã kiểm tra hiển thị trên máy tính (1440px) và điện thoại (390px).
- Việc còn lại: đăng ký mã khóa CARTO (không bắt buộc), đưa lên GitHub Pages theo mục 9 của tai-lieu/huong-dan.html, rà soát nội dung lịch sử.

### Bổ sung (10/10/2026)

- **Tìm kiếm**: ô tìm nổi trên bản đồ, gõ có dấu hay không dấu đều được, có gợi ý thả xuống.
- **Cụm tham quan**: một lớp riêng, bật tắt được. Mỗi cụm là vùng màu nhạt (thuật toán bao lồi) có tên. Bấm tên cụm trong danh sách thì phóng tới cụm.
- **Chế độ chỉnh sửa** (`editor.js`): đăng nhập minh họa `admin` / `lichsu10`. Thêm, sửa, xóa lưu trong localStorage của máy đang dùng. Nút "Tải file JSON" xuất dữ liệu để đưa lên GitHub. Đăng nhập không phải bảo mật thật (đã giải thích trong tai-lieu/huong-dan.html, mục 10).

## 8. Lưu ý

- Tọa độ các di tích lấy từ Wikipedia/OpenStreetMap. Tọa độ quán ăn là gần đúng, nên kiểm tra lại.
- Phần "sự kiện, nhân vật" có bổ sung kiến thức phổ thông ngoài map.md. Học sinh nên đối chiếu lại với sách giáo khoa và nguồn chính thống.
