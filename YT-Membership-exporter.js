(async function(){
const APP_VERSION = '2023.11.22'
const Github_Rep = 'https://github.com/oz0820/YT-Membership-exporter'

const logger = new class {
    log(msg) {
        console.log("[YT-Membership-exporter] " + msg)
    }
    error(msg) {
        console.error("[YT-Membership-exporter] " + msg)
    }
}
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// チャンネルページのURLだったら何処でもいい
const channel_data = async (channel_page_url) => {
    try {
        const response = await fetch(channel_page_url)
        const html = await response.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const channel_id = doc.querySelector('meta[property="og:url"]').getAttribute('content').split('/')[4]
        const og_title = doc.querySelector('meta[property="og:title"]').getAttribute('content')
        if (!channel_id || !og_title) {
            throw new Error('URLの解析に失敗しました。')
        }
        return {
            channel_id: channel_id,
            display_name: og_title
        }
    } catch (error) {
        logger.error('データの取得に失敗しました:', error)
        return {
            channel_id: null,
            display_name: null
        }
    }
}

const formatted_date = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = ('0' + (now.getMonth() + 1)).slice(-2)
    const day = ('0' + now.getDate()).slice(-2)
    return `${year}-${month}-${day}`
}


// main
if (!window.location.href.startsWith("https://www.youtube.com/")) {
    logger.log('Youtubeに移動してください')
    alert('Youtubeに移動してください')
    return
}
logger.log("start")

let display_name, channel_url, channel_id
if (location.pathname.startsWith('/watch')) {
    display_name = document.querySelector('ytd-watch-flexy div.ytd-channel-name yt-formatted-string a').innerHTML.trim()
    channel_url = document.querySelector('ytd-watch-flexy div.ytd-channel-name yt-formatted-string a').href
    channel_id = (await channel_data(channel_url)).channel_id
} else if (location.pathname.startsWith('/channel/') || location.pathname.startsWith('/@')) {
    const tmp = (await channel_data(location.href))
    display_name = tmp.display_name
    channel_id = tmp.channel_id
}

// logger.log('display_name', display_name)
// logger.log('channel_id', channel_id)

const contents_detail_button = document.querySelector('ytd-button-renderer.expand-collapse-button.ytd-sponsorships-expandable-perks-renderer')
if (!!contents_detail_button) {
    contents_detail_button.click()
    await delay(500)
}

let badge_elm, stamp_elm
// 加入済みの場合はこっち
let ytd_sponsorships = document.querySelector('div.expandable-content.ytd-sponsorships-expandable-perks-renderer')
if (ytd_sponsorships !== null) {
    if (ytd_sponsorships.getBoundingClientRect().width === 0 && ytd_sponsorships.getBoundingClientRect().height === 0) {
        ytd_sponsorships = null
    } else {
        badge_elm = ytd_sponsorships.querySelector('ytd-sponsorships-perk-renderer div.badge-container.ytd-sponsorships-loyalty-badges-renderer')
        stamp_elm = ytd_sponsorships.querySelector('ytd-sponsorships-perk-renderer div#images-line')
    }
}

// 未加入の場合はこっち
let tp_yt_paper_dialog = document.querySelector('tp-yt-paper-dialog.ytd-popup-container')
if (!!tp_yt_paper_dialog) {
    if (tp_yt_paper_dialog.getBoundingClientRect().width !== 0 && tp_yt_paper_dialog.getBoundingClientRect().height !== 0) {
        const tmp = tp_yt_paper_dialog.querySelectorAll('ytd-sponsorships-tier-renderer ytd-sponsorships-perks-renderer div#images-line')
        badge_elm = tmp[0]
        stamp_elm = !!tmp[1].querySelector('yt-img-shadow') ?
            tmp[1] :
            null
    } else {
        tp_yt_paper_dialog = null
    }
}

if (ytd_sponsorships === null && tp_yt_paper_dialog === null) {
    alert('要素を取得できませんでした。\n取得したい画像が表示されている事を確認してから再実行してください')
    return
}

const badge_urls = {}
const badge_month = (i) => {
    if (i < 5) {
        return ['0', '1', '2', '6', '12'][i]
    } else {
        return `${(i - 3) * 12}`
    }
}
if (!!badge_elm) {
    badge_elm.querySelectorAll('yt-img-shadow > img').forEach((elm, index) => {
        const image_url = elm.src
        // const image_url_large = elm.src.split('=')[0] + '=s0'
        const month = badge_month(index)

        badge_urls[month] = image_url
    })
}

const stamp_urls = {}
if (!!stamp_elm) {
    stamp_elm.querySelectorAll('yt-img-shadow > img').forEach(elm => {
        try {
            const stamp_name = elm.alt
            const image_url = elm.src
            if (stamp_name === '' || image_url === '') {
                return
            }
            // const image_url_large = elm.src.split('=')[0] + '=s0'
            stamp_urls[stamp_name] = image_url
        } catch (e) {
            logger.error(e)
        }

    })
}

for (let url of Object.values(badge_urls)) {
    if (url === '') {
        if (!confirm('メンバーバッジが検出できません\n続行しますか？')) {
            alert('取得したい画像が表示されている事を確認してから再実行してください')
            return
        }
    }
}
if (Object.keys(stamp_urls).length === 0) {
    if (!confirm('メンバースタンプが検出できません．\n続行しますか？')) {
        alert('取得したい画像が表示されている事を確認してから再実行してください')
        return
    }
}


function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            //logger.log(reader.result)
            const base64String = reader.result
            resolve(base64String)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

const badge_base64 = {}
await Promise.all(Object.entries(badge_urls).map(async ([key, url], i) => {
    url = url.split('=')[0] + '=s0'
    const res = await fetch(url)
    const blob = await res.blob()
    badge_base64[key] = await blobToBase64(blob)
    logger.log(`badge ${i + 1} / ${Object.keys(stamp_urls).length}  ${url}`)
}))

const stamp_base64 = {}
await Promise.all(Object.entries(stamp_urls).map(async ([key, url], i) => {
    url = url.split('=')[0] + '=s0'
    const res = await fetch(url)
    const blob = await res.blob()
    stamp_base64[key] = await blobToBase64(blob)
    logger.log(`stamp ${i + 1} / ${Object.keys(stamp_urls).length}  ${url}`)
}))

const time_stamp = new Date().toISOString()
const export_json = {
    '_appVersion': APP_VERSION,
    '_createdAt': time_stamp,
    'displayName': display_name,
    'channelId': channel_id,
    'badgeUrls': badge_urls,
    'stampUrls': stamp_urls,
    'badgeImages': badge_base64,
    'stampImages': stamp_base64
}

const filename = `NA-[${display_name}]-[${channel_id}].${formatted_date()}.membership.json`

// ダウンロード処理
const export_json_str = JSON.stringify(export_json, null, 2)
const ex_blob = new Blob([export_json_str], {type: 'application/json;charset=utf-8'})
const url = URL.createObjectURL(ex_blob)
const a = document.createElement('a')
a.href = url
a.download = filename
document.body.appendChild(a)
a.click()

})
