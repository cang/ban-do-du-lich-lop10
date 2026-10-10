/* =========================================================
   CHẾ ĐỘ CHỈNH SỬA (thêm / sửa / xóa địa điểm)

   ⚠ ĐĂNG NHẬP Ở ĐÂY CHỈ LÀ MINH HỌA, KHÔNG PHẢI BẢO MẬT THẬT.
   Mật khẩu ghi ngay trong file này, mà file này ai mở trang cũng tải về
   và đọc được (bấm chuột phải → "Xem nguồn trang"). Đăng nhập thật cần
   backend kiểm tra mật khẩu trên máy chủ.

   Dữ liệu sửa được lưu trong trình duyệt (localStorage) của MÁY NÀY.
   Muốn mọi người cùng thấy: bấm "Tải file JSON", rồi đưa file
   dia-diem.json mới lên GitHub thay cho file cũ trong thư mục data/.
   ========================================================= */

const TAI_KHOAN_MINH_HOA = { ten: "admin", matKhau: "lichsu10" };
const KHOA_LUU_DU_LIEU = "ban-do-di-san:dia-diem";
const KHOA_DANG_NHAP = "ban-do-di-san:dang-nhap";

let daDangNhap = false;

/* ---------- Lưu và đọc trong trình duyệt ---------- */
// try/catch vì một số trình duyệt (chế độ ẩn danh, chặn cookie) không cho dùng bộ nhớ này
function docBanSua() {
  try {
    const chuoi = localStorage.getItem(KHOA_LUU_DU_LIEU);
    return chuoi ? JSON.parse(chuoi) : null;
  } catch { return null; }
}

function luuBanSua() {
  try {
    localStorage.setItem(KHOA_LUU_DU_LIEU, JSON.stringify(state.duLieu));
  } catch (loi) {
    alert("Trình duyệt không cho lưu dữ liệu: " + loi.message);
  }
  capNhatThanhCongCu();
}

/* ---------- Nút Sửa / Xóa trong khung chi tiết ---------- */
function htmlNutChinhSua(p) {
  if (!daDangNhap) return "";
  return `<div class="edit-actions">
      <button class="btn" data-sua="${esc(p.id)}">✎ Sửa</button>
      <button class="btn danger" data-xoa="${esc(p.id)}">Xóa</button>
    </div>`;
}

/* ---------- Thanh công cụ ---------- */
function capNhatThanhCongCu() {
  $("editBar").hidden = !daDangNhap;
  $("btnLogin").hidden = daDangNhap;
  $("localNote").hidden = !docBanSua();
}

function dangNhap(ten, matKhau) {
  if (ten !== TAI_KHOAN_MINH_HOA.ten || matKhau !== TAI_KHOAN_MINH_HOA.matKhau) return false;
  daDangNhap = true;
  try { sessionStorage.setItem(KHOA_DANG_NHAP, "1"); } catch { /* không sao */ }
  return true;
}

function dangXuat() {
  daDangNhap = false;
  try { sessionStorage.removeItem(KHOA_DANG_NHAP); } catch { /* không sao */ }
  capNhatThanhCongCu();
  if (state.activeId) moChiTiet(state.activeId, { bay: false });
}

/* ---------- Form thêm / sửa ----------
   Các mục nhiều dòng viết mỗi dòng một ý, các phần cách nhau bằng dấu |
   Ví dụ dòng thời gian:  30/4/1975 | Xe tăng húc đổ cổng dinh */
const thanhDong = (ds, cacTruong) => (ds || []).map((x) => cacTruong.map((k) => x[k] ?? "").join(" | ")).join("\n");
const tuDong = (chu, cacTruong) => chu.split("\n").map((d) => d.trim()).filter(Boolean).map((dong) => {
  const phan = dong.split("|").map((s) => s.trim());
  return Object.fromEntries(cacTruong.map((k, i) => [k, phan[i] ?? ""]));
});

let idDangSua = null;   // null = đang thêm mới

function moForm(p) {
  idDangSua = p?.id ?? null;
  const f = $("editForm");
  f.reset();
  $("editTitle").textContent = p ? `Sửa: ${p.ten}` : "Thêm địa điểm mới";
  f.cum.innerHTML = Object.entries(state.duLieu.cum)
    .map(([ma, ten]) => `<option value="${esc(ma)}">${esc(ten)}</option>`).join("");
  f.bieu_tuong.innerHTML = Object.entries(BIEU_TUONG)
    .map(([ma, bt]) => `<option value="${esc(ma)}">${esc(bt.ten)}</option>`).join("");

  const tam = map.getCenter();
  const giaTri = {
    ten: p?.ten, ten_khac: p?.ten_khac, loai: p?.loai ?? "di-tich", cum: p?.cum ?? Object.keys(state.duLieu.cum)[0],
    bieu_tuong: p ? maBieuTuong(p) : "bao-tang",
    dia_chi: p?.dia_chi, vi_do: p?.toa_do[0] ?? tam.lat.toFixed(6), kinh_do: p?.toa_do[1] ?? tam.lng.toFixed(6),
    nam: p?.nam, xep_hang: p?.xep_hang, tom_tat: p?.tom_tat, y_nghia: p?.y_nghia, ghi_chu: p?.ghi_chu,
    gio_mo: p?.gio_mo, gia: p?.gia,
    lich_su: thanhDong(p?.lich_su, ["moc", "noi_dung"]),
    nhan_vat: thanhDong(p?.nhan_vat, ["ten", "vai_tro"]),
    anh: thanhDong(p?.anh, ["file", "loai", "chu_thich"]),
  };
  Object.entries(giaTri).forEach(([ten, gt]) => { if (f[ten]) f[ten].value = gt ?? ""; });
  $("editDialog").showModal();
}

// Tạo mã id từ tên: "Chợ Bến Thành" → "cho-ben-thanh" (thêm số nếu bị trùng)
function taoId(ten) {
  const goc = boDau(ten).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dia-diem";
  let id = goc, i = 2;
  while (state.duLieu.dia_diem.some((p) => p.id === id)) id = `${goc}-${i++}`;
  return id;
}

function luuForm() {
  const f = $("editForm");
  const viDo = parseFloat(f.vi_do.value.replace(",", "."));
  const kinhDo = parseFloat(f.kinh_do.value.replace(",", "."));
  if (!f.ten.value.trim()) { alert("Vui lòng nhập tên địa điểm."); return false; }
  if (!(viDo > -90 && viDo < 90 && kinhDo > -180 && kinhDo < 180)) { alert("Tọa độ chưa đúng."); return false; }

  // Chỉ ghi những ô có nội dung, cho file JSON gọn gàng
  const moi = { id: idDangSua ?? taoId(f.ten.value), loai: f.loai.value, bieu_tuong: f.bieu_tuong.value, cum: f.cum.value };
  ["ten", "ten_khac", "dia_chi", "nam", "xep_hang", "tom_tat", "ghi_chu", "y_nghia", "gio_mo", "gia"].forEach((k) => {
    const gt = f[k].value.trim();
    if (gt) moi[k] = gt;
  });
  moi.toa_do = [viDo, kinhDo];
  const lichSu = tuDong(f.lich_su.value, ["moc", "noi_dung"]);
  const nhanVat = tuDong(f.nhan_vat.value, ["ten", "vai_tro"]);
  const anh = tuDong(f.anh.value, ["file", "loai", "chu_thich"]).map((a) => ({ ...a, loai: a.loai === "xua" ? "xua" : "nay" }));
  if (lichSu.length) moi.lich_su = lichSu;
  if (nhanVat.length) moi.nhan_vat = nhanVat;
  if (anh.length || moi.loai === "di-tich") moi.anh = anh;

  const ds = state.duLieu.dia_diem;
  const viTriCu = ds.findIndex((p) => p.id === idDangSua);
  if (viTriCu >= 0 && ds[viTriCu].cum === moi.cum) {
    ds[viTriCu] = moi;                                     // sửa tại chỗ
  } else {
    if (viTriCu >= 0) ds.splice(viTriCu, 1);               // đổi cụm thì chuyển chỗ
    // Đặt sau địa điểm cuối cùng cùng cụm, để danh sách vẫn gom theo cụm
    const cuoiCum = ds.map((p) => p.cum).lastIndexOf(moi.cum);
    ds.splice(cuoiCum >= 0 ? cuoiCum + 1 : ds.length, 0, moi);
  }

  luuBanSua();
  xayDungDiaDiem();
  moChiTiet(moi.id);
  return true;
}

function xoaDiaDiem(id) {
  const p = state.duLieu.dia_diem.find((x) => x.id === id);
  if (!p || !confirm(`Xóa “${p.ten}” khỏi bản đồ?`)) return;
  state.duLieu.dia_diem = state.duLieu.dia_diem.filter((x) => x.id !== id);
  dongChiTiet();
  luuBanSua();
  xayDungDiaDiem();
}

/* ---------- Chọn tọa độ bằng cách bấm lên bản đồ ---------- */
function chonViTriTrenBanDo() {
  $("editDialog").close();               // tạm ẩn form (nội dung đã gõ vẫn giữ nguyên)
  $("pickHint").hidden = false;
  document.body.classList.add("is-picking");
  map.once("click", (e) => {
    $("editForm").vi_do.value = e.latlng.lat.toFixed(6);
    $("editForm").kinh_do.value = e.latlng.lng.toFixed(6);
    ketThucChonViTri();
  });
}

function ketThucChonViTri() {
  map.off("click");
  $("pickHint").hidden = true;
  document.body.classList.remove("is-picking");
  $("editDialog").showModal();
}

/* ---------- Tải dữ liệu về thành file ---------- */
function taiFileJson() {
  const noiDung = JSON.stringify(state.duLieu, null, 2);
  const file = new Blob([noiDung], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = "dia-diem.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function khoiPhucBanGoc() {
  if (!confirm("Xóa mọi chỉnh sửa trên máy này và quay về dữ liệu gốc?")) return;
  try { localStorage.removeItem(KHOA_LUU_DU_LIEU); } catch { /* không sao */ }
  location.reload();
}

/* ---------- Gắn sự kiện ---------- */
function khoiDongChinhSua() {
  try { daDangNhap = sessionStorage.getItem(KHOA_DANG_NHAP) === "1"; } catch { daDangNhap = false; }
  capNhatThanhCongCu();

  // Đăng nhập
  $("btnLogin").addEventListener("click", () => { $("loginError").hidden = true; $("loginForm").reset(); $("loginDialog").showModal(); });
  $("loginForm").addEventListener("submit", (e) => {
    const f = e.target;
    if (e.submitter?.value === "huy") return;
    if (!dangNhap(f.ten.value.trim(), f.matKhau.value)) {
      e.preventDefault();
      $("loginError").hidden = false;
      return;
    }
    capNhatThanhCongCu();
    if (state.activeId) moChiTiet(state.activeId, { bay: false });
  });

  // Thanh công cụ
  $("btnAdd").addEventListener("click", () => moForm(null));
  $("btnDownload").addEventListener("click", taiFileJson);
  $("btnLogout").addEventListener("click", dangXuat);
  $("btnRestore").addEventListener("click", khoiPhucBanGoc);

  // Nút Sửa / Xóa trong khung chi tiết
  $("detailBody").addEventListener("click", (e) => {
    const sua = e.target.closest("[data-sua]");
    const xoa = e.target.closest("[data-xoa]");
    if (sua) moForm(state.duLieu.dia_diem.find((p) => p.id === sua.dataset.sua));
    if (xoa) xoaDiaDiem(xoa.dataset.xoa);
  });

  // Form
  $("editForm").addEventListener("submit", (e) => {
    if (e.submitter?.value === "huy") return;
    if (!luuForm()) e.preventDefault();
  });
  $("btnPick").addEventListener("click", chonViTriTrenBanDo);
  $("btnPickCancel").addEventListener("click", ketThucChonViTri);
}
