import json, sys, urllib.request, urllib.parse
titles = sys.argv[1:]
for t in titles:
    url = "https://vi.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(t.replace(' ', '_'))
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "school-project/1.0"})
        d = json.load(urllib.request.urlopen(req, timeout=20))
        c = d.get('coordinates')
        th = (d.get('originalimage') or {}).get('source', '')
        print(f"{t} | {d.get('title')} | {c} | {th}")
    except Exception as e:
        print(f"{t} | ERR {e}")
