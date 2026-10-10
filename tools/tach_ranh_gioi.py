"""Tách ranh giới các phường cần dùng từ file danh mục lớn (5,9 MB) ra file GeoJSON nhỏ cho trang web.
Cách chạy:  python tools/tach_ranh_gioi.py 26740 26743
  (26740 = Phường Sài Gòn – phường chính, các mã sau là phường lân cận làm nền)"""
import json, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
NGUON = ROOT / "data" / "dm_dia_gioi_hanh_chinh.json"
DICH = ROOT / "site" / "data" / "ranh-gioi.geojson"

def wkt_sang_geojson(wkt):
    """Đổi chuỗi 'MULTIPOLYGON(((x y, x y, ...)))' sang dạng tọa độ GeoJSON."""
    da_giac = []
    for khoi in re.findall(r"\(\(([^()]+(?:\),\s*\([^()]+)*)\)\)", wkt):
        vong = []
        for chuoi in re.split(r"\),\s*\(", khoi):
            diem = [[round(float(x), 6), round(float(y), 6)] for x, y in (p.split() for p in chuoi.split(","))]
            vong.append(diem)
        da_giac.append(vong)
    return {"type": "MultiPolygon", "coordinates": da_giac}

ma_can_lay = sys.argv[1:] or ["26740"]
ds = json.loads(NGUON.read_text(encoding="utf-8"))
features = []
for dv in ds:
    if dv["ma"] in ma_can_lay:
        features.append({
            "type": "Feature",
            "properties": {"ma": dv["ma"], "ten": dv["ten"], "dien_tich_km2": dv["dien_tich_km2"],
                           "dan_so": dv["dan_so"], "chinh": dv["ma"] == ma_can_lay[0]},
            "geometry": wkt_sang_geojson(dv["ranh_gioi"]),
        })
features.sort(key=lambda f: not f["properties"]["chinh"])
DICH.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8")
for f in features:
    n = sum(len(v) for dg in f["geometry"]["coordinates"] for v in dg)
    print(f'{f["properties"]["ten"]}: {len(f["geometry"]["coordinates"])} đa giác, {n} điểm')
print("Đã ghi", DICH, DICH.stat().st_size // 1024, "KB")
