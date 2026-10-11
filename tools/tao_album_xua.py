"""Chuyển album Facebook "SaiGon xưa" (tải bằng gallery-dl) thành dữ liệu cho trang site/sai-gon-xua.html.

- Chép ảnh gốc vào site/anh-xua/, tạo ảnh nhỏ (rộng 480px) vào site/anh-xua/nho/ để lưới ảnh tải nhanh.
- Gom chú thích vào site/data/anh-sai-gon-xua.json, theo đúng thứ tự trong album.
Chạy lại bao nhiêu lần cũng được (ảnh đã có sẽ bỏ qua):
    python tools/tao_album_xua.py            # mặc định đọc ../fb-album
    python tools/tao_album_xua.py D:/duong-dan/fb-album
"""
import json, sys, shutil, pathlib
from PIL import Image

GOC = pathlib.Path(__file__).resolve().parent.parent
NGUON = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else GOC.parent / "fb-album"
THU_MUC_ANH = GOC / "site" / "anh-xua"
THU_MUC_NHO = THU_MUC_ANH / "nho"
FILE_JSON = GOC / "site" / "data" / "anh-sai-gon-xua.json"
RONG_NHO = 480

THU_MUC_NHO.mkdir(parents=True, exist_ok=True)

danh_sach = []
for f in NGUON.glob("*.json"):
    m = json.loads(f.read_text(encoding="utf-8"))
    anh = f.with_suffix("")  # 123.jpg.json -> 123.jpg
    if not anh.exists():
        continue  # ảnh đang tải dở
    ten = f"{m['id']}.jpg"
    dich, nho = THU_MUC_ANH / ten, THU_MUC_NHO / ten

    if not dich.exists():
        shutil.copyfile(anh, dich)
    with Image.open(dich) as im:
        rong, cao = im.size
        if not nho.exists():
            im = im.convert("RGB")
            im.thumbnail((RONG_NHO, RONG_NHO * 3))
            im.save(nho, "JPEG", quality=78, optimize=True)

    danh_sach.append({
        "id": m["id"],
        "thu_tu": m.get("num", 0),
        "ke_tiep": m.get("next_photo_id"),
        "dau_tien": m.get("first_photo_id"),
        "chu_thich": (m.get("caption") or "").strip(),
        "ngay_dang": (m.get("date") or "")[:10],
        "rong": rong,
        "cao": cao,
    })

# Sắp theo thứ tự album: đi từ ảnh đầu tiên theo "ảnh kế tiếp" (next_photo_id).
# Không dùng "num" vì tải tiếp từ giữa album thì gallery-dl đánh số lại từ 1.
theo_id = {a["id"]: a for a in danh_sach}
dau = next((a["dau_tien"] for a in danh_sach if a["dau_tien"] in theo_id), None)
thu_tu, da_xep = [], set()
while dau in theo_id and dau not in da_xep:
    thu_tu.append(theo_id[dau])
    da_xep.add(dau)
    dau = theo_id[dau]["ke_tiep"]
# Ảnh nằm sau một chỗ đứt chuỗi (chưa tải đủ) thì xếp cuối, theo num
thu_tu += sorted((a for a in danh_sach if a["id"] not in da_xep), key=lambda a: a["thu_tu"])
danh_sach = thu_tu
for a in danh_sach:
    del a["thu_tu"], a["ke_tiep"], a["dau_tien"]

du_lieu = {
    "nguon": {
        "ten": "Retro Studio – album \u201cSaiGon xưa\u201d",
        "link": "https://www.facebook.com/media/set/?set=a.1362559783811378&type=3",
    },
    "anh": danh_sach,
}
FILE_JSON.write_text(json.dumps(du_lieu, ensure_ascii=False, indent=1), encoding="utf-8")
co_chu_thich = sum(1 for a in danh_sach if a["chu_thich"])
print(f"Xong: {len(danh_sach)} ảnh ({co_chu_thich} có chú thích) -> {FILE_JSON.relative_to(GOC)}")
