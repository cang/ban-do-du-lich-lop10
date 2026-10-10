import json, sys, time, urllib.request, urllib.parse
UA = {"User-Agent": "school-history-project/1.0 (student demo)"}
def get(params):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30))
for q in sys.argv[1:]:
    try:
        d = get({"action":"query","format":"json","generator":"search","gsrsearch":q,"gsrnamespace":6,"gsrlimit":6,
                 "prop":"imageinfo","iiprop":"url|extmetadata","iiurlwidth":900})
        pages = sorted(d.get("query",{}).get("pages",{}).values(), key=lambda p: p.get("index",0))
        print("##", q)
        for p in pages:
            ii = p["imageinfo"][0]; m = ii.get("extmetadata",{})
            g = lambda k: (m.get(k,{}).get("value","") or "")[:60].replace("\n"," ")
            print("  ", p["title"], "|", g("LicenseShortName"), "|", g("DateTimeOriginal"), "|", ii.get("thumburl"))
    except Exception as e:
        print("##", q, "ERR", e)
    time.sleep(1.5)
