import base64
import datetime
import json
import re
import magic
import requests
import uvicorn
from pathlib import Path
from bs4 import BeautifulSoup
from fastapi import FastAPI, Request
from concurrent.futures import ThreadPoolExecutor
from starlette.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


def export_json(js, name):
    Path(name).parent.mkdir(parents=True, exist_ok=True)
    with open(name, "w", encoding="utf8") as f:
        json.dump(js, f, ensure_ascii=False, indent=2)


@app.post("/")
async def hello(request: Request):
    data = await request.json()
    message = []
    try:
        display_name = data.get("display_name")
        channel_id = get_channel_id(data.get("href"))
        export_file_path = "./export/" + export_file_name(display_name, channel_id)
        message, export_data = parser(data)
    except ChannelIDNotFoundError:
        message.append("URLが不正です。チャンネルページに移動して再実行してください。")
    else:
        if export_data.get("success"):
            export_json(export_data, export_file_path)
            message.append(f"{export_file_path} に保存しました。")
            print(f"{export_file_path} に保存しました。")
        else:
            message.append("保存に失敗しました。コンテンツをすべて表示してから再実行してください。")
            print("保存に失敗しました。コンテンツをすべて表示してから再実行してください。")

    result = {"message": message}
    return result


def parser(data):
    out = {"success": False}
    message = []

    ytd_sponsorships = data.get("ytd_sponsorships_expandable_perks_renderer")
    tp_yt_paper_dialog = data.get("tp_yt_paper_dialog")
    if ytd_sponsorships == tp_yt_paper_dialog == "":
        message.append("データを取得できませんでした。")
        message.append("リロード後、バッジとスタンプが表示されていることを確認してから再実行してください。")
        return message, out

    badge_urls = {}
    month_index = ["0", "1", "2", "6", "12", "24", "36", "48", "60", "72"]

    if ytd_sponsorships != "":
        soup = BeautifulSoup(ytd_sponsorships.encode("utf8"), "html.parser")
        badges = soup.select("div.badge-line.style-scope.ytd-sponsorships-loyalty-badges-renderer.style-scope.ytd-sponsorships-loyalty-badges-renderer")
        stamps = soup.find_all('yt-img-shadow', attrs={"class": "images style-scope ytd-sponsorships-perk-renderer no-transition"})
        for i, b in enumerate(badges):
            badge_urls[month_index[i]] = b.find('img').get('src').split("=")[0] + "=s0"

    else:
        soup = BeautifulSoup(tp_yt_paper_dialog.encode("utf8"), "html.parser")
        badges = soup.find('div', attrs={"id": "images-line", "class": "style-scope ytd-sponsorships-perk-renderer"}).find_all('img', attrs={"class": "style-scope yt-img-shadow"})
        st1 = soup.find_all('div', attrs={"class": "expanded item style-scope ytd-sponsorships-perk-renderer style-scope ytd-sponsorships-perk-renderer"})
        st2 = soup.find_all('div', attrs={"id": "images-line", "class": "style-scope ytd-sponsorships-perk-renderer"})
        if len(st1) != 0:
            stamps = st1[1].find_all('yt-img-shadow', attrs={"class": "images style-scope ytd-sponsorships-perk-renderer no-transition"})
        else:
            stamps = st2[1].find_all('yt-img-shadow', attrs={"class": "images style-scope ytd-sponsorships-perk-renderer no-transition"})

        for i, b in enumerate(badges):
            badge_urls[month_index[i]] = b.get('src').split("=")[0] + "=s0"

    stamp_urls = {}
    for i, s in enumerate(stamps):
        name = s.find('img').get('alt')
        src = s.find('img').get('src').split("=")[0] + "=s0"
        stamp_urls[name] = src

    out["success"] = True
    out['timestamp'] = datetime.datetime.utcnow().isoformat() + "Z"

    out["badges"] = badge_urls
    out["badge_images"] = get_images(badge_urls)
    out["stamps"] = stamp_urls
    out["stamp_images"] = get_images(stamp_urls)

    return message, out


def get_images(data: dict):
    out = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {key: executor.submit(get_image_b64, url) for key, url in data.items()}

        for key, future in futures.items():
            out[key] = future.result()
    return out


def get_image_b64(url):
    response = requests.get(url)
    mine_type = magic.from_buffer(response.content, mime=True)
    return f"data:{mine_type};base64,{base64.b64encode(response.content).decode()}"


def get_channel_id(page_url):
    res = requests.get(page_url)
    soup = BeautifulSoup(res.content, "html.parser")
    channel_id = soup.select_one('link[rel="canonical"]').get('href').split("/")[-1]
    print(channel_id)
    if not channel_id.startswith("UC"):
        raise ChannelIDNotFoundError
    return soup.select_one('link[rel="canonical"]').get('href').split("/")[-1]


def export_file_name(display_name, channel_id):
    invalid_chars = r'[\\/:*?"<>|]'
    return re.sub(invalid_chars, '_', f"NA-[{display_name}]-[{channel_id}].membership.json")


class ChannelIDNotFoundError(Exception):
    pass


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8081, log_level="info", access_log=True)
