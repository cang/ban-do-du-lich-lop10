/* =========================================================
   TRANG ẢNH SÀI GÒN XƯA
   Dữ liệu: data/anh-sai-gon-xua.json (tạo bằng tools/tao_album_xua.py)
   ========================================================= */

let tatCaAnh = [];   // toàn bộ ảnh
let dangHien = [];   // ảnh khớp bộ lọc hiện tại
let viTri = -1;      // ảnh đang xem lớn (vị trí trong dangHien)

const $ = (id) => document.getElementById(id);
const anhNho = (a) => `anh-xua/nho/${a.id}.jpg`;
const anhLon = (a) => `anh-xua/${a.id}.jpg`;

/* Bỏ dấu tiếng Việt để gõ "ben thanh" vẫn tìm ra "Bến Thành" (giống app.js) */
function boDau(chu) {
  return String(chu ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

/* Tô vàng các từ khóa trong chú thích. Vì bỏ dấu không đổi số ký tự
   (với chuỗi đã chuẩn hóa NFC), vị trí tìm được trên bản không dấu
   dùng được luôn cho bản gốc. */
function toSang(chu, tuKhoa) {
  const frag = document.createDocumentFragment();
  if (!tuKhoa.length) { frag.append(chu); return frag; }
  const khong = boDau(chu);
  if (khong.length !== chu.length) { frag.append(chu); return frag; }
  const danhDau = new Array(chu.length).fill(false);
  for (const t of tuKhoa) {
    let i = khong.indexOf(t);
    while (i !== -1) {
      for (let k = i; k < i + t.length; k++) danhDau[k] = true;
      i = khong.indexOf(t, i + t.length);
    }
  }
  let i = 0;
  while (i < chu.length) {
    let j = i;
    while (j < chu.length && danhDau[j] === danhDau[i]) j++;
    const doan = chu.slice(i, j);
    if (danhDau[i]) {
      const m = document.createElement("mark");
      m.textContent = doan;
      frag.append(m);
    } else frag.append(doan);
    i = j;
  }
  return frag;
}

/* ---------- LƯỚI ẢNH ---------- */
function tuKhoaHienTai() {
  return boDau($("search").value).split(/\s+/).filter(Boolean);
}

function locVaVe() {
  const tuKhoa = tuKhoaHienTai();
  const chiCoChuThich = $("onlyCap").checked;
  dangHien = tatCaAnh.filter((a) =>
    (!chiCoChuThich || a.chu_thich) &&
    tuKhoa.every((t) => a._timKiem.includes(t)));
  // Ảnh khớp nguyên cụm từ (vd. "ben thanh" liền nhau) xếp lên trước
  if (tuKhoa.length > 1) {
    const cum = tuKhoa.join(" ");
    const khopCum = (a) => (a._timKiem.replace(/\s+/g, " ").includes(cum) ? 0 : 1);
    dangHien.sort((a, b) => khopCum(a) - khopCum(b));
  }

  const grid = $("grid");
  grid.replaceChildren(...dangHien.map((a, i) => {
    const the = document.createElement("button");
    the.className = "card";
    the.dataset.i = i;
    const img = document.createElement("img");
    img.src = anhNho(a);
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = a.chu_thich || "Ảnh Sài Gòn xưa";
    const cap = document.createElement("span");
    if (a.chu_thich) cap.append(toSang(a.chu_thich, tuKhoa));
    else { cap.textContent = "Chưa có chú thích"; cap.className = "none"; }
    the.append(img, cap);
    return the;
  }));

  $("empty").hidden = dangHien.length > 0;
  $("count").textContent = dangHien.length === tatCaAnh.length
    ? `${tatCaAnh.length} ảnh`
    : `${dangHien.length} / ${tatCaAnh.length} ảnh`;
}

$("grid").addEventListener("click", (e) => {
  const the = e.target.closest(".card");
  if (the) moAnh(Number(the.dataset.i));
});

let henGio;
$("search").addEventListener("input", () => {
  clearTimeout(henGio);
  henGio = setTimeout(locVaVe, 150);
});
$("onlyCap").addEventListener("change", locVaVe);

/* ---------- XEM ẢNH LỚN ---------- */
const viewer = $("viewer");

function moAnh(i) {
  if (i < 0 || i >= dangHien.length) return;
  viTri = i;
  const a = dangHien[i];

  $("vImg").src = anhLon(a);
  $("vImg").alt = a.chu_thich || "Ảnh Sài Gòn xưa";
  const text = $("vText");
  text.replaceChildren();
  if (a.chu_thich) { text.append(toSang(a.chu_thich, tuKhoaHienTai())); text.className = ""; }
  else { text.textContent = "Chưa có chú thích"; text.className = "none"; }
  $("vMeta").textContent = a.ngay_dang
    ? `Đăng trên Facebook ngày ${a.ngay_dang.split("-").reverse().join("/")}`
    : "";
  $("vCount").textContent = `${i + 1} / ${dangHien.length}`;
  $("vPrev").disabled = i === 0;
  $("vNext").disabled = i === dangHien.length - 1;

  // Tải trước ảnh kế bên để chuyển ảnh không bị chờ
  for (const k of [i - 1, i + 1]) if (dangHien[k]) new Image().src = anhLon(dangHien[k]);

  if (!viewer.open) viewer.showModal();
  history.replaceState(null, "", `#anh=${a.id}`);
}

function chuyen(buoc) { moAnh(viTri + buoc); }

function dongAnh() { if (viewer.open) viewer.close(); }

viewer.addEventListener("close", () => {
  history.replaceState(null, "", location.pathname + location.search);
  // Cuộn lưới tới ảnh vừa xem và đặt focus vào đó để dùng bàn phím tiếp
  const the = $("grid").querySelector(`.card[data-i="${viTri}"]`);
  if (the) { the.scrollIntoView({ block: "nearest" }); the.focus({ preventScroll: true }); }
});

$("vPrev").addEventListener("click", () => chuyen(-1));
$("vNext").addEventListener("click", () => chuyen(1));
$("vClose").addEventListener("click", dongAnh);

viewer.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") { e.preventDefault(); chuyen(-1); }
  else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); chuyen(1); }
  else if (e.key === "Home") { e.preventDefault(); moAnh(0); }
  else if (e.key === "End") { e.preventDefault(); moAnh(dangHien.length - 1); }
});

// Con lăn chuột: lăn xuống = ảnh sau, lăn lên = ảnh trước (giới hạn tốc độ)
let lanCuoi = 0;
$("vStage").addEventListener("wheel", (e) => {
  e.preventDefault();
  const bayGio = Date.now();
  if (bayGio - lanCuoi < 250 || Math.abs(e.deltaY) < 4) return;
  lanCuoi = bayGio;
  chuyen(e.deltaY > 0 ? 1 : -1);
}, { passive: false });

// Bấm vào vùng tối ngoài ảnh thì đóng
$("vStage").addEventListener("click", (e) => { if (e.target === e.currentTarget) dongAnh(); });

// Vuốt trái / phải trên điện thoại
let chamX = null, chamY = null;
$("vStage").addEventListener("touchstart", (e) => {
  chamX = e.touches[0].clientX; chamY = e.touches[0].clientY;
}, { passive: true });
$("vStage").addEventListener("touchend", (e) => {
  if (chamX === null) return;
  const dx = e.changedTouches[0].clientX - chamX;
  const dy = e.changedTouches[0].clientY - chamY;
  chamX = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) chuyen(dx < 0 ? 1 : -1);
});

/* ---------- KHỞI ĐỘNG ---------- */
fetch("data/anh-sai-gon-xua.json")
  .then((r) => r.json())
  .then((duLieu) => {
    tatCaAnh = duLieu.anh.map((a) => ({
      ...a,
      chu_thich: a.chu_thich.normalize("NFC"),
      _timKiem: boDau(a.chu_thich),
    }));

    const n = duLieu.nguon;
    $("credits").innerHTML = "";
    $("credits").append(
      "Nguồn ảnh: ",
      Object.assign(document.createElement("a"), { href: n.link, textContent: n.ten, target: "_blank", rel: "noopener" }),
      " (Facebook). Bản quyền ảnh thuộc tác giả gốc; trang này chỉ dùng cho mục đích học tập · Đề tài môn Lịch sử lớp 10."
    );

    locVaVe();

    // Mở sẵn ảnh nếu link có dạng sai-gon-xua.html#anh=<id>
    const m = location.hash.match(/^#anh=(\d+)$/);
    if (m) moAnh(dangHien.findIndex((a) => a.id === m[1]));
  })
  .catch(() => {
    $("empty").hidden = false;
    $("empty").textContent = "Không tải được dữ liệu ảnh. Nếu mở file trực tiếp, hãy chạy qua máy chủ (ví dụ: python -m http.server).";
  });
