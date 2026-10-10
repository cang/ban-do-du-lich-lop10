"""Tải ảnh từ Wikimedia Commons về site/images, ghi nguồn (tác giả, giấy phép) vào site/data/nguon-anh.json.
Chạy 1 lần: python tools/tai_anh.py"""
import json, re, time, html, urllib.request, urllib.parse, pathlib
UA = {"User-Agent": "school-history-project/1.0 (student demo)"}
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "images"
ANH = {  # tên file lưu : tên file trên Commons
 "bao-tang-tphcm-nay.jpg": "Bảo tàng Thành phố Hồ Chí Minh 7.jpg",
 "bao-tang-tphcm-xua.jpg": "Hôtel du gouverneur de la Cochinchine.jpg",
 "kham-lon-xua.jpg": "Saigon. Maison Centrale.jpg",
 "thu-vien-nay.jpg": "Thư viện Khoa học Tổng hợp TP Hồ Chí Minh.jpg",
 "taberd-xua.jpg": "Saïgon - Institution Taberd.jpg",
 "tran-dai-nghia-nay.png": "Lasan Taberd.png",
 "ubnd-xua.jpg": "Saigon Hotel de Ville in May 1962.jpg",
 "ubnd-nay.jpg": "Ayuntamiento, Ciudad Ho Chi Minh, Vietnam, 2013-08-14, DD 01.JPG",
 "chi-lang-nay.jpg": "Chi Lang Park.jpg",
 "nha-hat-xua.jpg": "Saigon - Le Théâtre Municipal (2).jpg",
 "nha-hat-nay.jpg": "Ópera, Ciudad Ho Chi Minh, Vietnam, 2013-08-14, DD 02.JPG",
 "continental-nay.jpg": "Hotel Continental Saigon 20190921.jpg",
 "catinat-xua.jpg": "La rue Catinat, Saïgon (PV0019661).jpg",
 "nha-tho-xua.jpg": "Saigon - Place de la Cathédrale (Cathédrale, Hôtel des Postes).jpg",
 "nha-tho-nay.jpg": "Basílica de Nuestra Señora, Ciudad Ho Chi Minh, Vietnam, 2013-08-14, DD 05.JPG",
 "buu-dien-xua.jpg": "Saigon - Hôtel des Postes.jpg",
 "buu-dien-nay.jpg": "Saigon Central Post Office 2022.jpg",
 "dinh-norodom-xua.jpg": "1896 - Cochinchine - Saïgon - Palais du Gouvernement Général.jpg",
 "dinh-doc-lap-nay.jpg": "Dinh Độc Lập vào nàm 2024.jpg",
 "cho-ben-thanh-nay.jpg": "Ben Thanh market 2.jpg",
 "ba-son-xua.jpg": "Arsenal, Saïgon (PV0017103).jpg",
 "ba-son-nay.jpg": "Ba Son Shipyard, 2013.jpg",
 "bt-ton-duc-thang-nay.jpg": "Bến Nghé, Quận 1, TPHCM, Việt Nam Bảo tàng Tôn Đức Thắng - panoramio.jpg",
 "thao-cam-vien-xua.jpg": "Saigon - Jardin Botanique - Les Eléphants.jpg",
 "thao-cam-vien-nay.jpg": "Thảo Cầm viên, quan 1, saigon, vietnam - panoramio.jpg",
 "ben-bach-dang-xua.jpg": "Quai, Saïgon (PV0015207).jpg",
 "ben-bach-dang-nay.jpg": "Bach Dang Quay (52681363335).jpg",
 "cong-vien-30-4-nay.jpg": "Ho Chi Minh City, April 30th Park, 2020-01 CN-01.jpg",
 "bt-lich-su-xua.jpg": "Saigon -- Musée.jpg",
 "bt-lich-su-nay.jpg": "Ho Chi Minh City Museum of History (15924970936).jpg",
}
def text(v): return html.unescape(re.sub(r"<[^>]+>", "", v or "")).strip()
FILE_NGUON = ROOT / "site" / "data" / "nguon-anh.json"
nguon = json.loads(FILE_NGUON.read_text(encoding="utf-8")) if FILE_NGUON.exists() else {}
for luu, ten in ANH.items():
    p = {"action": "query", "format": "json", "titles": "File:" + ten, "prop": "imageinfo",
         "iiprop": "url|extmetadata", "iiurlwidth": 1000}
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p)
    for thu in range(4):
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30)); break
        except Exception as e:
            print("  thử lại", e); time.sleep(10)
    else:
        print("BỎ QUA (lỗi mạng)", ten); continue
    page = next(iter(d["query"]["pages"].values()))
    if "imageinfo" not in page:
        print("KHÔNG THẤY", ten); continue
    ii = page["imageinfo"][0]; m = ii["extmetadata"]
    dich = OUT / luu
    if not dich.exists():
        for thu in range(4):
            try:
                dich.write_bytes(urllib.request.urlopen(urllib.request.Request(ii["thumburl"], headers=UA), timeout=60).read()); break
            except Exception as e:
                print("  thử lại", e); time.sleep(10)
    nguon[luu] = {
        "tac_gia": re.sub(r"(Unknown author)+", "Không rõ tác giả", text(m.get("Artist", {}).get("value")))[:80] or "Không rõ tác giả",
        "giay_phep": text(m.get("LicenseShortName", {}).get("value")),
        "trang": ii["descriptionurl"],
    }
    print("OK", luu, nguon[luu]["giay_phep"])
    time.sleep(1.5)
FILE_NGUON.write_text(json.dumps(nguon, ensure_ascii=False, indent=1), encoding="utf-8")
