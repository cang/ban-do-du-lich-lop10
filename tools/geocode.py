import json, sys, time, urllib.request, urllib.parse
for q in sys.argv[1:]:
    url = "https://nominatim.openstreetmap.org/search?format=json&limit=2&countrycodes=vn&q=" + urllib.parse.quote(q)
    req = urllib.request.Request(url, headers={"User-Agent": "school-history-project/1.0 (student demo)"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=20))
        print(q, '=>', [(x['lat'], x['lon'], x['display_name'][:80]) for x in r])
    except Exception as e:
        print(q, 'ERR', e)
    time.sleep(1.2)
