/* =========================================================
   BIỂU TƯỢNG LOẠI CÔNG TRÌNH (hiện ở đầu tên, trong khung chi tiết)
   Mỗi biểu tượng là một hình vẽ nhỏ dạng SVG (vẽ bằng các đường thẳng, cong)
   trên khung 24 × 24. Trong dia-diem.json, mục "bieu_tuong" chọn hình nào.
   ========================================================= */
const BIEU_TUONG = {
  "bao-tang":   { ten: "Bảo tàng",            ve: '<path d="M2 9.5 12 3l10 6.5Z"/><path d="M3 21h18M5 21V12M9.5 21V12M14.5 21V12M19 21V12"/>' },
  "dinh-thu":   { ten: "Dinh thự, trụ sở",    ve: '<path d="M12 10V2.5l5 2-5 2"/><path d="M4 21V10h16v11M2 21h20M9.5 21v-5h5v5"/>' },
  "nha-tho":    { ten: "Nhà thờ",             ve: '<path d="M12 2v5M9.5 4h5"/><path d="M5 21V12l7-5 7 5v9M3 21h18"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>' },
  "nha-hat":    { ten: "Nhà hát",             ve: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },
  "truong-hoc": { ten: "Trường học",          ve: '<path d="M22 9 12 4 2 9l10 5 10-5Z"/><path d="M6 11v5c3.5 2.5 8.5 2.5 12 0v-5M22 9v6"/>' },
  "sach":       { ten: "Thư viện, sách",      ve: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z"/>' },
  "buu-dien":   { ten: "Bưu điện",            ve: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m2 7 10 6.5L22 7"/>' },
  "khach-san":  { ten: "Khách sạn",           ve: '<path d="M2 20V5M2 16h20v4M22 16v-3a3 3 0 0 0-3-3h-8v6"/><circle cx="6.5" cy="12" r="2"/>' },
  "cho":        { ten: "Chợ",                 ve: '<path d="M3 9 5 4h14l2 5Z"/><path d="M5 9v12h14V9M10 21v-6h4v6"/>' },
  "xuong-tau":  { ten: "Xưởng tàu, bến cảng", ve: '<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V22M8 11h8"/><path d="M4 13a8 8 0 0 0 16 0"/>' },
  "cong-vien":  { ten: "Công viên",           ve: '<path d="M8 19a4 4 0 0 1-2.2-7.3A3.5 3.5 0 0 1 9 6v0a3 3 0 1 1 6 0v0a3.5 3.5 0 0 1 3.2 5.7A4 4 0 0 1 16 19Z"/><path d="M12 19v3"/>' },
  "vuon-thu":   { ten: "Vườn thú, bách thảo", ve: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.2-6.5"/>' },
  "ben-song":   { ten: "Bến sông",            ve: '<path d="M2 10c2.5-2 4.5-2 7 0s4.5 2 7 0 4-2 6-.5M2 16c2.5-2 4.5-2 7 0s4.5 2 7 0 4-2 6-.5"/>' },
  "an-uong":    { ten: "Ăn uống",             ve: '<path d="M7 2v20M4 2v6a3 3 0 0 0 6 0V2"/><path d="M18 22V2c-2.5 1.5-4 4.5-4 8 0 1.5 1 2.5 4 2.5"/>' },
  "mac-dinh":   { ten: "Địa điểm khác",       ve: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>' },
};

// Mã biểu tượng của một địa điểm (chưa chọn thì lấy mặc định theo loại)
const maBieuTuong = (p) => p.bieu_tuong || (p.loai === "am-thuc" ? "an-uong" : "mac-dinh");

// Trả về hình SVG của một biểu tượng
function svgBieuTuong(ma, kichThuoc = 20) {
  const bt = BIEU_TUONG[ma] || BIEU_TUONG["mac-dinh"];
  return `<svg width="${kichThuoc}" height="${kichThuoc}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${bt.ve}</svg>`;
}
