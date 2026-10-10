/* =========================================================
   BẢN ĐỒ DI SẢN PHƯỜNG SÀI GÒN – "bộ não" của trang web
   Chạy hoàn toàn trên trình duyệt của người xem (frontend).
   Các bước:
     1. Tải dữ liệu (địa điểm, ranh giới, nguồn ảnh)
     2. Vẽ bản đồ nền
     3. Vẽ ranh giới phường
     4. Kiểm tra từng địa điểm có nằm trong phường không (thuật toán tia sáng)
     5. Cắm ghim + làm danh sách
     6. Bấm vào địa điểm thì mở khung chi tiết
   Phần thêm / sửa / xóa nằm riêng trong editor.js.
   ========================================================= */

const isMobile = () => window.matchMedia("(max-width: 820px)").matches;
const $ = (id) => document.getElementById(id);

// Chống lỗi hiển thị khi chữ có ký tự đặc biệt như < > &
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- BƯỚC 4: THUẬT TOÁN TIA SÁNG (ray casting) ----------
   Từ điểm cần kiểm tra, tưởng tượng kẻ một tia nằm ngang sang phải.
   Đếm số lần tia cắt qua đường viền:
     - Số LẺ  → điểm nằm TRONG vùng
     - Số CHẴN → điểm nằm NGOÀI vùng
   `vong` là danh sách các đỉnh của đường viền, mỗi đỉnh là [kinh độ, vĩ độ]. */
function diemNamTrongVong(kinhDo, viDo, vong) {
  let trong = false;
  for (let i = 0, j = vong.length - 1; i < vong.length; j = i++) {
    const [xi, yi] = vong[i];
    const [xj, yj] = vong[j];
    const catNgang = (yi > viDo) !== (yj > viDo);                       // cạnh này có vắt ngang qua độ cao của điểm không?
    if (catNgang && kinhDo < ((xj - xi) * (viDo - yi)) / (yj - yi) + xi) { // chỗ cắt có nằm bên phải điểm không?
      trong = !trong;                                                   // mỗi lần cắt thì đảo trong ↔ ngoài
    }
  }
  return trong;
}

// Một phường có thể gồm nhiều mảnh (MultiPolygon), mỗi mảnh có thể có "lỗ thủng".
function diemNamTrongPhuong([viDo, kinhDo], phuong) {
  return phuong.geometry.coordinates.some(([vienNgoai, ...cacLo]) =>
    diemNamTrongVong(kinhDo, viDo, vienNgoai) &&
    !cacLo.some((lo) => diemNamTrongVong(kinhDo, viDo, lo)));
}

/* ---------- Trạng thái của trang ---------- */
const state = {
  duLieu: null,        // nội dung file dia-diem.json (hoặc bản đã sửa trên máy)
  ranhGioi: null,      // nội dung file ranh-gioi.geojson
  phuong: null,        // ranh giới phường chính (Phường Sài Gòn)
  places: [],          // tất cả địa điểm (đã tính thêm: số thứ tự, có trong phường không)
  visible: [],         // địa điểm đang hiện (theo bộ lọc hoặc tìm kiếm)
  layers: { "di-tich": true, "am-thuc": false },
  hienCum: true,       // có tô vùng các cụm tham quan không
  markers: {},         // id → ghim trên bản đồ
  credits: {},         // tên file ảnh → tác giả, giấy phép
  query: "",           // chữ đang gõ trong ô tìm kiếm
  activeId: null,
};

let map;

/* ---------- BƯỚC 1: TẢI DỮ LIỆU ---------- */
async function taiDuLieu() {
  const [duLieu, ranhGioi, nguonAnh] = await Promise.all([
    fetch("data/dia-diem.json").then((r) => r.json()),
    fetch("data/ranh-gioi.geojson").then((r) => r.json()),
    fetch("data/nguon-anh.json").then((r) => r.json()),
  ]);
  return { duLieu, ranhGioi, nguonAnh };
}

/* ---------- BƯỚC 2: BẢN ĐỒ NỀN ---------- */
// Mã khóa CARTO: đăng ký miễn phí bằng email tại https://carto.com/basemaps/apikey
// rồi dán vào giữa hai dấu nháy. Có mã thì hiện thêm nút "Bản đồ nhạt"; để trống thì bỏ nút này.
const CARTO_KEY = "cb1_4g1n_1_d062cb4a59b8fad6d39dd8c3";

function veBanDoNen() {
  map = L.map("map", { zoomControl: false, minZoom: 13, maxZoom: 19 })
    .setView([10.7815, 106.702], 15);   // tâm Phường Sài Gòn – phải đặt trước khi vẽ gì lên bản đồ
  L.control.zoom({ position: "topleft" }).addTo(map);
  // Thu nhỏ quá mức 16 thì ẩn tên các cụm (xem style.css: .zoom-xa)
  map.on("zoomend", () => map.getContainer().classList.toggle("zoom-xa", map.getZoom() < 16));
  map.fire("zoomend");

  // Bỏ chữ "Leaflet" ở góc (không bắt buộc). Dòng ghi nguồn bản đồ thì PHẢI giữ theo giấy phép.
  map.attributionControl.setPrefix(false);

  const osm = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  // Nền "Bản đồ" (mặc định): OpenStreetMap gốc – không cần mã khóa; CSS phủ tông giấy cũ cho đỡ sặc sỡ
  nen.osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: osm });
  // Nền "Bản đồ nhạt": CARTO Voyager – chỉ có khi đã dán mã khóa CARTO
  if (CARTO_KEY) {
    nen.carto = L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, {
      maxZoom: 19, subdomains: "abcd",
      attribution: `${osm} © <a href="https://carto.com/attributions">CARTO</a>`,
    });
  }
  // Nền "Vệ tinh": ảnh của Esri – miễn phí, không cần mã khóa, phải ghi nguồn
  nen["ve-tinh"] = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Ảnh vệ tinh © Esri, Maxar, Earthstar Geographics",
  });
  if (GOOGLE_MAPS_KEY) taoNenGoogle();   // có mã khóa Google thì thay ảnh Esri bằng ảnh Google
}

const nen = {};        // các nền bản đồ: osm, carto, ve-tinh
let nenDangDung;       // mã nền đang hiện
let manChe;            // tấm màn phủ ngoài phường

/* ---------- ẢNH VỆ TINH GOOGLE (không bắt buộc) ----------
   Dùng Google Map Tiles API – cách hợp lệ duy nhất để lấy ảnh Google ngoài Google Maps.
   Cần mã khóa (API key) trong Google Cloud, tài khoản phải gắn thanh toán nhưng có hạn mức miễn phí.
   Xem cách lấy mã trong tai-lieu/huong-dan.html, mục 9. Để trống thì trang dùng ảnh vệ tinh Esri. */
const GOOGLE_MAPS_KEY = "";

async function taoNenGoogle() {
  try {
    // 1. Xin một "phiên" (session) xem ảnh vệ tinh
    const phanHoi = await fetch(`https://tile.googleapis.com/v1/createSession?key=${GOOGLE_MAPS_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapType: "satellite", language: "vi-VN", region: "VN" }),
    });
    if (!phanHoi.ok) throw new Error(await phanHoi.text());
    const { session } = await phanHoi.json();
    const thamSo = `session=${session}&key=${GOOGLE_MAPS_KEY}`;

    // 2. Lớp ảnh: mỗi ô gạch tải từ máy chủ Google
    const lopGoogle = L.tileLayer(`https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?${thamSo}`, {
      maxZoom: 19, attribution: "Google Maps",
    });

    // 3. Ghi nguồn bắt buộc: Google trả về dòng bản quyền tùy theo vùng đang xem
    async function capNhatBanQuyen() {
      if (!map.hasLayer(lopGoogle)) return;
      const k = map.getBounds();
      try {
        const { copyright } = await fetch(`https://tile.googleapis.com/tile/v1/viewport?${thamSo}&zoom=${map.getZoom()}` +
          `&north=${k.getNorth()}&south=${k.getSouth()}&east=${k.getEast()}&west=${k.getWest()}`).then((r) => r.json());
        map.attributionControl.removeAttribution(lopGoogle.options.attribution);
        lopGoogle.options.attribution = `Google Maps · ${esc(copyright)}`;
        map.attributionControl.addAttribution(lopGoogle.options.attribution);
      } catch { /* giữ dòng "Google Maps" */ }
    }
    map.on("moveend", capNhatBanQuyen);
    lopGoogle.on("add", capNhatBanQuyen);

    // Thay ảnh Esri bằng ảnh Google (kể cả khi người xem đang bật ảnh vệ tinh)
    const dangXemVeTinh = nenDangDung === "ve-tinh";
    nen["ve-tinh"].remove();
    nen["ve-tinh"] = lopGoogle;
    if (dangXemVeTinh) lopGoogle.addTo(map);
  } catch (loi) {
    console.warn("Không dùng được ảnh vệ tinh Google, giữ ảnh Esri:", loi);
  }
}

// Màu tấm màn phủ ngoài phường, tùy theo nền
const KIEU_MAN_CHE = {
  "osm":     { fillColor: "#f4efe6", fillOpacity: 0.55 },
  "carto":   { fillColor: "#f4efe6", fillOpacity: 0.3 },    // CARTO vốn đã nhạt nên phủ mỏng hơn
  "ve-tinh": { fillColor: "#14100c", fillOpacity: 0.45 },   // ảnh vệ tinh: phủ tối cho ảnh không bị bạc màu
};

// Đổi nền bản đồ: gỡ nền cũ, gắn nền mới, đổi bộ lọc màu (CSS) và tấm màn cho hợp
function chonNen(ma) {
  if (!nen[ma]) return;
  Object.values(nen).forEach((lop) => lop.remove());
  nen[ma].addTo(map);
  nenDangDung = ma;
  Object.keys(KIEU_MAN_CHE).forEach((m) => document.body.classList.toggle(`nen-${m}`, m === ma));
  manChe?.setStyle(KIEU_MAN_CHE[ma]);
  document.querySelectorAll("[data-nen]").forEach((nut) => nut.classList.toggle("is-on", nut.dataset.nen === ma));
}

/* ---------- BƯỚC 3: VẼ RANH GIỚI ---------- */
function veRanhGioi(ranhGioi) {
  const phuongChinh = ranhGioi.features.find((f) => f.properties.chinh);
  const lanCan = ranhGioi.features.filter((f) => !f.properties.chinh);

  // Phường lân cận: nét đứt, mờ – chỉ để làm bối cảnh
  L.geoJSON({ type: "FeatureCollection", features: lanCan }, {
    interactive: false,
    style: { color: "#8a8072", weight: 1.5, dashArray: "4 5", fill: false },
  }).addTo(map);

  // "Tấm màn" phủ mờ mọi thứ bên ngoài Phường Sài Gòn:
  // một hình chữ nhật thật lớn, khoét lỗ đúng hình phường.
  const theGioi = [[-85, -180], [-85, 180], [85, 180], [85, -180]];
  const cacLo = phuongChinh.geometry.coordinates.map((daGiac) =>
    daGiac[0].map(([kinhDo, viDo]) => [viDo, kinhDo]));
  manChe = L.polygon([theGioi, ...cacLo], {
    interactive: false, stroke: false, ...KIEU_MAN_CHE[nenDangDung],
  }).addTo(map);

  // Đường viền Phường Sài Gòn
  const vien = L.geoJSON(phuongChinh, {
    interactive: false,
    style: { color: "#8f2d1f", weight: 2.5, fill: false },
  }).addTo(map);

  // Phóng vừa khít phường. Màn hình máy tính: tối thiểu mức 15
  // (ở mức 14 nền CARTO hiện chữ to "THÀNH PHỐ HỒ CHÍ MINH" đè lên các ghim)
  const khung = vien.getBounds();
  const zoomVua = map.getBoundsZoom(khung, false, L.point(60, 60));
  map.setView(khung.getCenter(), isMobile() ? zoomVua : Math.max(zoomVua, 15), { animate: false });
  return phuongChinh;
}

/* ---------- BƯỚC 4 + 5: TÍNH TOÁN VÀ CẮM GHIM ----------
   Chạy lúc mở trang, và chạy lại mỗi khi thêm / sửa / xóa địa điểm. */
function xayDungDiaDiem() {
  Object.values(state.markers).forEach((ghim) => ghim.remove());   // gỡ ghim cũ
  state.markers = {};

  // Với mỗi địa điểm, máy tự xét xem nó thuộc phường nào
  let so = 0;
  state.places = state.duLieu.dia_diem.map((p) => {
    const trongPhuong = diemNamTrongPhuong(p.toa_do, state.phuong);
    const phuongKhac = trongPhuong ? null
      : state.ranhGioi.features.find((f) => !f.properties.chinh && diemNamTrongPhuong(p.toa_do, f));
    return {
      ...p,
      so: p.loai === "di-tich" ? ++so : null,
      trongPhuong,
      phuong: trongPhuong ? state.phuong.properties.ten : phuongKhac?.properties.ten,
    };
  });

  // Thống kê phường – con số "di tích trong phường" do máy tự đếm
  const diTich = state.places.filter((p) => p.loai === "di-tich");
  const soTrong = diTich.filter((p) => p.trongPhuong).length;
  $("statDienTich").textContent = `${state.phuong.properties.dien_tich_km2.toLocaleString("vi-VN")} km²`;
  $("statDanSo").textContent = state.phuong.properties.dan_so.toLocaleString("vi-VN");
  $("statSoDiTich").textContent = `${soTrong} / ${diTich.length}`;
  $("phuongGioiThieu").textContent = state.duLieu.phuong.gioi_thieu;

  state.places.forEach((p) => { state.markers[p.id] = taoGhim(p); });
  veCum();
  capNhatHienThi();
}

/* ---------- CỤM THAM QUAN ----------
   Mỗi cụm là một nhóm di tích gần nhau, đi bộ được trong một buổi.
   Vùng của cụm = "bao lồi" (convex hull) của các ghim: hình nhỏ nhất ôm trọn các điểm,
   giống như căng một sợi dây thun bao quanh mấy cây đinh. */
const MAU_CUM = ["#a87b3e", "#3f6b5a", "#4d6a8f", "#7d4e6d", "#6f7a3a", "#8a5a44"];
let lopCum;   // nhóm các hình vùng cụm trên bản đồ

function baoLoi(cacDiem) {
  // Thuật toán "chuỗi đơn điệu": xếp điểm từ trái sang phải, dựng nửa dưới rồi nửa trên
  const d = [...cacDiem].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  if (d.length < 3) return d;
  const re = (o, a, b) => (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
  const duoi = [], tren = [];
  for (const p of d) {
    while (duoi.length >= 2 && re(duoi.at(-2), duoi.at(-1), p) <= 0) duoi.pop();
    duoi.push(p);
  }
  for (const p of [...d].reverse()) {
    while (tren.length >= 2 && re(tren.at(-2), tren.at(-1), p) <= 0) tren.pop();
    tren.push(p);
  }
  return [...duoi.slice(0, -1), ...tren.slice(0, -1)];
}

function veCum() {
  lopCum?.remove();
  lopCum = L.layerGroup();
  const nhom = {};
  state.places.filter((p) => p.loai === "di-tich").forEach((p) => (nhom[p.cum] ??= []).push(p.toa_do));

  Object.entries(nhom).forEach(([ma, diem], i) => {
    const mau = MAU_CUM[i % MAU_CUM.length];
    // Mẹo: viền thật dày (44px) và bo tròn → vùng tự "phình" ra ôm lấy các ghim
    const kieu = { color: mau, weight: 44, opacity: 0.16, fillColor: mau, fillOpacity: 0.16, lineJoin: "round", lineCap: "round" };
    const vo = baoLoi(diem);
    const hinh = vo.length >= 3 ? L.polygon(vo, kieu)
      : vo.length === 2 ? L.polyline(vo, kieu)
      : L.circleMarker(vo[0], { ...kieu, radius: 2 });
    hinh.on("click", () => phongToCum(ma));
    lopCum.addLayer(hinh);

    // Nhãn tên cụm đặt phía trên vùng
    const khung = L.latLngBounds(diem);
    lopCum.addLayer(L.marker([khung.getNorth(), khung.getCenter().lng], {
      interactive: false,
      icon: L.divIcon({ className: "", html: `<div class="cum-label" style="--mau:${mau}">${esc(state.duLieu.cum[ma].replace(/^Cụm\s+/, ""))}</div>`, iconSize: [0, 0] }),
    }));
  });
}

// Phóng bản đồ vừa khít các địa điểm của một cụm
function phongToCum(ma) {
  const diem = state.visible.filter((p) => p.cum === ma).map((p) => p.toa_do);
  if (!diem.length) return;
  dongChiTiet();
  $("sidebar").classList.remove("is-expanded");
  map.flyToBounds(L.latLngBounds(diem), {
    paddingTopLeft: [60, 90],
    paddingBottomRight: [60, isMobile() ? 230 : 60],
    maxZoom: 17, duration: 0.8,
  });
}

// Ghim tròn có số thứ tự (quán ăn: ô vuông nhỏ màu xanh)
function taoGhim(p) {
  const lop = ["pin", p.loai, p.trongPhuong ? "" : "is-out"].join(" ");
  const kichThuoc = p.loai === "am-thuc" ? 22 : 30;
  const icon = L.divIcon({
    className: "",
    html: `<div class="${lop}" data-id="${p.id}">${p.so ?? ""}</div>`,
    iconSize: [kichThuoc, kichThuoc],
    iconAnchor: [kichThuoc / 2, kichThuoc / 2],
  });
  const ghim = L.marker(p.toa_do, { icon, title: p.ten, keyboard: true, riseOnHover: true });
  ghim.bindTooltip(p.ten, { className: "tip", direction: "top", offset: [0, -kichThuoc / 2] });
  ghim.on("click", () => moChiTiet(p.id));
  return ghim;
}

/* ---------- TÌM KIẾM ----------
   Bỏ dấu tiếng Việt để gõ "dinh doc lap" vẫn tìm ra "Dinh Độc Lập".
   normalize("NFD") tách chữ "ộ" thành "o" + dấu mũ + dấu nặng, rồi xóa các dấu đi. */
function boDau(chu) {
  return String(chu ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

// Chấm điểm mức độ khớp: 2 = khớp tên, 1 = chỉ khớp địa chỉ, 0 = không khớp
function diemTimKiem(p) {
  const tuKhoa = boDau(state.query).trim();
  if (boDau(`${p.ten} ${p.ten_khac ?? ""}`).includes(tuKhoa)) return 2;
  if (boDau(p.dia_chi).includes(tuKhoa)) return 1;
  return 0;
}

function htmlSoThuTu(p) {
  return `<span class="num">${p.so ?? ""}</span>`;
}

function capNhatHienThi() {
  const cum = state.duLieu.cum;
  const dangTim = state.query.trim() !== "";
  // Đang tìm kiếm: tìm trong mọi địa điểm. Không tìm: hiện theo nút lọc Di tích / Ẩm thực.
  state.visible = dangTim
    ? state.places.filter((p) => diemTimKiem(p) > 0).sort((a, b) => diemTimKiem(b) - diemTimKiem(a))
    : state.places.filter((p) => state.layers[p.loai]);

  // Ghim: chỉ hiện ghim của những địa điểm đang có trong danh sách
  state.places.forEach((p) => {
    const ghim = state.markers[p.id];
    if (state.visible.includes(p)) ghim.addTo(map); else ghim.remove();
  });
  if (state.hienCum && state.layers["di-tich"]) lopCum.addTo(map); else lopCum.remove();

  // Gợi ý thả xuống dưới ô tìm kiếm trên bản đồ
  const goiY = $("searchResults");
  goiY.innerHTML = state.visible.length
    ? state.visible.slice(0, 8).map((p) => `
        <button class="item ${p.loai} ${p.trongPhuong ? "" : "is-out"}" data-id="${p.id}">
          ${htmlSoThuTu(p)}
          <span><span class="t">${esc(p.ten)}</span><span class="s">${esc(p.dia_chi)}</span></span>
        </button>`).join("")
    : `<p class="empty">Không tìm thấy địa điểm nào khớp với “${esc(state.query)}”.</p>`;
  goiY.hidden = !dangTim || document.activeElement !== $("search");

  if (!state.visible.length) {
    $("list").innerHTML = `<p class="empty">Không tìm thấy địa điểm nào khớp với “${esc(state.query)}”.</p>`;
    return;
  }

  // Danh sách ở cột trái, chia theo cụm
  const html = [];
  let cumTruoc = null;
  state.visible.forEach((p) => {
    if (p.cum !== cumTruoc) {
      html.push(`<h2><button class="cum-link" data-cum="${esc(p.cum)}" title="Xem cả cụm trên bản đồ">${esc(cum[p.cum])}</button></h2>`);
      cumTruoc = p.cum;
    }
    const ngoai = p.trongPhuong ? "" : `<span class="tag">${esc(p.phuong || "ngoài ranh")}</span>`;
    html.push(`
      <button class="item ${p.loai} ${p.trongPhuong ? "" : "is-out"} ${p.id === state.activeId ? "is-active" : ""}" data-id="${p.id}">
        ${htmlSoThuTu(p)}
        <span><span class="t">${esc(p.ten)}${ngoai}</span><span class="s">${esc(p.nam || p.dia_chi)}</span></span>
      </button>`);
  });
  $("list").innerHTML = html.join("");
}

/* ---------- BƯỚC 6: KHUNG CHI TIẾT ---------- */
// Ảnh có sẵn nằm trong thư mục images/; ảnh thêm sau có thể là một đường link đầy đủ
const duongDanAnh = (file) => (/^(https?:|data:)/.test(file) ? file : `images/${file}`);

function htmlAnh(p) {
  const anh = p.anh || [];
  if (!anh.length) return "";   // chưa có ảnh thì không hiện khung ảnh
  const coXuaNay = anh.some((a) => a.loai === "xua") && anh.some((a) => a.loai === "nay");
  const dau = anh.find((a) => a.loai === "nay") || anh[0];
  const nut = coXuaNay
    ? `<div class="photo-toggle">${["xua", "nay"].map((l) =>
        `<button data-anh="${l}" class="${l === dau.loai ? "is-on" : ""}">${l === "xua" ? "Xưa" : "Nay"}</button>`).join("")}</div>`
    : "";
  return `<figure class="photo is-${dau.loai}" id="photo">${nut}
      <img src="${esc(duongDanAnh(dau.file))}" alt="${esc(dau.chu_thich)}" loading="lazy">
      <figcaption id="photoCap">${chuThichAnh(dau)}</figcaption>
    </figure>`;
}

function chuThichAnh(a) {
  const n = state.credits[a.file];
  const nguon = n ? ` · <a href="${esc(n.trang)}" target="_blank" rel="noopener">${esc(n.tac_gia)}, ${esc(n.giay_phep)}</a>` : "";
  return `${esc(a.chu_thich)}${nguon}`;
}

function moChiTiet(id, { bay = true } = {}) {
  const p = state.places.find((x) => x.id === id);
  if (!p) return;
  if (!state.visible.includes(p)) {          // địa điểm đang bị ẩn (do bộ lọc hoặc tìm kiếm) thì hiện lại
    state.query = ""; $("search").value = "";
    state.layers[p.loai] = true; dongBoNutLoc(); capNhatHienThi();
  }
  state.activeId = id;

  const badges = [
    p.nam && `<span class="badge">${esc(p.nam)}</span>`,
    p.xep_hang && `<span class="badge son">${esc(p.xep_hang)}</span>`,
    p.loai === "di-tich" && (p.trongPhuong
      ? `<span class="badge">Trong Phường Sài Gòn</span>`
      : `<span class="badge out">Ngoài ranh · ${esc(p.phuong || "phường khác")}</span>`),
  ].filter(Boolean).join("");

  const lichSu = p.lich_su?.length ? `<h3>Dòng thời gian</h3><ol class="timeline">${
    p.lich_su.map((m) => `<li><b>${esc(m.moc)}</b>${esc(m.noi_dung)}</li>`).join("")}</ol>` : "";
  const nhanVat = p.nhan_vat?.length ? `<h3>Nhân vật liên quan</h3><ul class="people">${
    p.nhan_vat.map((n) => `<li><b>${esc(n.ten)}</b><span>${esc(n.vai_tro)}</span></li>`).join("")}</ul>` : "";
  const yNghia = p.y_nghia ? `<h3>Ý nghĩa</h3><p class="quote">${esc(p.y_nghia)}</p>` : "";
  const ghiChu = p.ghi_chu ? `<p class="note">${esc(p.ghi_chu)}</p>` : "";
  const thongTin = (p.gio_mo || p.gia) ? `<dl class="facts">${
    p.gio_mo ? `<dt>Giờ mở cửa</dt><dd>${esc(p.gio_mo)}</dd>` : ""}${
    p.gia ? `<dt>Giá tham khảo</dt><dd>${esc(p.gia)}</dd>` : ""}</dl>` : "";

  $("detailBody").innerHTML = `
    ${p.loai === "di-tich" ? htmlAnh(p) : ""}
    <div class="d-content ${p.loai === "am-thuc" ? "am-thuc-detail" : ""}">
      ${htmlNutChinhSua(p)}
      <p class="d-meta">${esc(p.loai === "di-tich" ? `Di tích số ${p.so}` : "Ẩm thực")} · ${esc(BIEU_TUONG[maBieuTuong(p)]?.ten)}</p>
      <h2><span class="d-icon">${svgBieuTuong(maBieuTuong(p), 22)}</span>${esc(p.ten)}</h2>
      ${p.ten_khac ? `<p class="d-alt">${esc(p.ten_khac)}</p>` : ""}
      <p class="d-addr">${esc(p.dia_chi)}</p>
      <div class="badges">${badges}</div>
      <p class="d-sum">${esc(p.tom_tat)}</p>
      ${thongTin}${ghiChu}${lichSu}${nhanVat}${yNghia}
    </div>`;
  $("detailBody").scrollTop = 0;

  // Nút chuyển ảnh Xưa / Nay
  $("detailBody").querySelectorAll("[data-anh]").forEach((nut) => nut.addEventListener("click", () => {
    const a = p.anh.find((x) => x.loai === nut.dataset.anh);
    const khung = $("photo");
    khung.className = `photo is-${a.loai}`;
    khung.querySelector("img").src = duongDanAnh(a.file);
    khung.querySelector("img").alt = a.chu_thich;
    $("photoCap").innerHTML = chuThichAnh(a);
    khung.querySelectorAll("[data-anh]").forEach((b) => b.classList.toggle("is-on", b === nut));
  }));

  const viTri = state.visible.indexOf(p);
  $("detailCount").textContent = `${viTri + 1} / ${state.visible.length}`;

  const detail = $("detail");
  detail.classList.add("is-open");
  detail.setAttribute("aria-hidden", "false");
  $("sidebar").classList.remove("is-expanded");

  // Đánh dấu ghim và dòng đang chọn
  document.querySelectorAll(".pin.is-active, .item.is-active").forEach((el) => el.classList.remove("is-active"));
  document.querySelectorAll(`.pin[data-id="${id}"], #list [data-id="${id}"]`).forEach((el) => el.classList.add("is-active"));
  state.markers[id].setZIndexOffset(1000);

  if (bay) bayToi(p.toa_do);
  history.replaceState(null, "", `#${id}`);
}

function dongChiTiet() {
  const detail = $("detail");
  detail.classList.remove("is-open");
  detail.setAttribute("aria-hidden", "true");
  document.querySelectorAll(".pin.is-active, .item.is-active").forEach((el) => el.classList.remove("is-active"));
  if (state.activeId) state.markers[state.activeId]?.setZIndexOffset(0);
  state.activeId = null;
  history.replaceState(null, "", location.pathname);
}

function chuyen(buoc) {
  const i = state.visible.findIndex((p) => p.id === state.activeId);
  const n = state.visible.length;
  if (i < 0 || !n) return;
  moChiTiet(state.visible[(i + buoc + n) % n].id);
}

// Bay tới địa điểm, chừa chỗ cho khung chi tiết để ghim không bị che
function bayToi(latlng) {
  const zoom = Math.max(map.getZoom(), 16);
  const lech = isMobile()
    ? L.point(0, map.getSize().y * 0.4)
    : L.point(($("detail").offsetWidth + 16) / 2, 0);
  const tam = map.unproject(map.project(latlng, zoom).add(lech), zoom);
  map.flyTo(tam, zoom, { duration: 0.8 });
}

function dongBoNutLoc() {
  document.querySelectorAll(".chip[data-loai]").forEach((c) => c.classList.toggle("is-on", state.layers[c.dataset.loai]));
}

/* ---------- KHỞI ĐỘNG ---------- */
async function khoiDong() {
  veBanDoNen();
  chonNen("osm");   // nền mặc định
  const { duLieu, ranhGioi, nguonAnh } = await taiDuLieu();
  state.duLieu = docBanSua() ?? duLieu;   // nếu máy này có bản đã chỉnh sửa thì dùng bản đó (xem editor.js)
  state.ranhGioi = ranhGioi;
  state.credits = nguonAnh;
  state.phuong = veRanhGioi(ranhGioi);

  xayDungDiaDiem();

  /* --- Sự kiện người dùng --- */
  const chonTuDanhSach = (e) => {
    const tenCum = e.target.closest(".cum-link");
    if (tenCum) { phongToCum(tenCum.dataset.cum); return; }
    const nut = e.target.closest(".item");
    if (!nut) return;
    $("searchResults").hidden = true;
    moChiTiet(nut.dataset.id);
  };
  $("list").addEventListener("click", chonTuDanhSach);
  $("searchResults").addEventListener("click", chonTuDanhSach);

  document.querySelector('.chip[data-lop="cum"]').addEventListener("click", (e) => {
    state.hienCum = !state.hienCum;
    e.currentTarget.classList.toggle("is-on", state.hienCum);
    capNhatHienThi();
  });
  document.querySelectorAll(".chip[data-loai]").forEach((chip) => chip.addEventListener("click", () => {
    state.layers[chip.dataset.loai] = !state.layers[chip.dataset.loai];
    dongBoNutLoc();
    const dangMo = state.places.find((p) => p.id === state.activeId);
    if (dangMo && !state.layers[dangMo.loai]) dongChiTiet();
    capNhatHienThi();
  }));
  $("btnClose").addEventListener("click", dongChiTiet);
  $("btnPrev").addEventListener("click", () => chuyen(-1));
  $("btnNext").addEventListener("click", () => chuyen(1));
  $("sheetHandle").addEventListener("click", () => $("sidebar").classList.toggle("is-expanded"));
  $("baseSwitch").addEventListener("click", (e) => {
    const nut = e.target.closest("[data-nen]");
    if (nut) chonNen(nut.dataset.nen);
  });
  if (!nen.carto) document.querySelector('[data-nen="carto"]').remove();   // chưa có mã khóa CARTO thì bỏ nút

  // Ô tìm kiếm trên bản đồ: lọc ngay khi gõ, Enter để mở kết quả đầu tiên, Esc để xóa
  const oTim = $("search");
  oTim.addEventListener("input", () => { state.query = oTim.value; capNhatHienThi(); });
  oTim.addEventListener("focus", () => { $("searchResults").hidden = !state.query.trim(); });
  oTim.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && state.visible.length) {
      $("searchResults").hidden = true;
      moChiTiet(state.visible[0].id);
      oTim.blur();
    }
    if (e.key === "Escape") { oTim.value = ""; state.query = ""; capNhatHienThi(); }
  });
  // Bấm ra ngoài thì thu gọn gợi ý
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".map-search")) $("searchResults").hidden = true;
  });

  document.addEventListener("keydown", (e) => {
    if (!state.activeId || e.target.closest("input, textarea, select, dialog")) return;   // đang gõ chữ thì bỏ qua
    if (e.key === "Escape") dongChiTiet();
    if (e.key === "ArrowRight") chuyen(1);
    if (e.key === "ArrowLeft") chuyen(-1);
  });

  khoiDongChinhSua();   // xem editor.js

  // Mở thẳng địa điểm nếu đường link có dạng ...#dinh-doc-lap
  const tuLink = location.hash.slice(1);
  if (tuLink) moChiTiet(tuLink);
}

khoiDong().catch((loi) => {
  console.error(loi.stack || loi);
  $("list").innerHTML = `<p style="padding:16px">Không tải được dữ liệu. Nếu bạn đang mở file trực tiếp
    (đường dẫn bắt đầu bằng <code>file://</code>), hãy chạy bằng một máy chủ nhỏ – xem phần hướng dẫn.</p>`;
});
