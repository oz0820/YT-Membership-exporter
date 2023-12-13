javascript:
/*
APP_VERSION: 2023.12.13.0
Github_Rep: https://github.com/oz0820/YT-Membership-exporter
*/
(async function(){
const APP_VERSION = '2023.12.13.0'

// 外部のライブラリ読み込み
const importInNoModule = (url) => new Promise(resolve => {
    const s = document.createElement('script')
    s.onload = () => {resolve()}
    s.src = url
    document.head.append(s)
});

const logger = new class {
    info(msg) {console.error("[YT-Membership-exporter] " + msg)}
    log(msg) {console.log("[YT-Membership-exporter] " + msg)}
    error(msg) {console.error("[YT-Membership-exporter] " + msg)}
}
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// チャンネルページのURLだったら何処を指定してもいい
const channel_data = async (channel_page_url) => {
    try {
        const response = await fetch(channel_page_url)
        const html = await response.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const channel_id = doc.querySelector('meta[property="og:url"]').getAttribute('content').split('/')[4]
        const og_title = doc.querySelector('meta[property="og:title"]').getAttribute('content')
        if (!channel_id || !og_title) {
            throw new Error('URLの解析に失敗しました')
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

// WindowsとLinuxで使うとマズいファイル名をサニタイズする
const safe_file_name = (name) => {
    switch (name) {
        case '.':
            return '_'
        case '..':
            return '__'
        default:
            return name.replace(/[\\\/:\*\?\"<>\|]/g, '_')
    }
}

const get_image_ext = content_type => {
    const type = content_type.split('/')[1]
    const image_types = {
        svg: 'svg',
        jpeg: 'jpg',
        jpg: 'jpg',
        'vnd.microsoft.icon': 'ico',
        'x-icon': 'ico',
        tiff: 'tif',
        apng: 'apng',
        avif: 'avif',
        bmp: 'bmp',
        gif: 'gif',
        png: 'png',
        webp: 'webp'
    }
    return image_types[type] || `${type}`
}

/*
ここまでツール的な関数

ここからメインのコード
 */

if (!window.location.href.startsWith("https://www.youtube.com/")) {
    logger.log('Youtubeに移動してください')
    alert('Youtubeに移動してください')
    throw new Error('Youtube外で実行されました')
}
logger.log("start")

let display_name, channel_id
if (location.pathname.startsWith('/channel/') || location.pathname.startsWith('/@')) {
    const tmp = (await channel_data(location.href))
    display_name = tmp.display_name
    channel_id = tmp.channel_id
} else {
    alert('このページで実行すると，チャンネルのトプ画を取得できません．\nチャンネルページに移動して再実行してください．')
    throw new Error('チャンネルページ以外で実行されました')
}

/*
特典が非表示の状態だと，スタンプが一部読み込まれない．
そのため，特典の情報を表示するボタンを押下してDOM上に表示させる
 */
try {
    const expand_button = document.querySelector('ytd-sponsorships-expandable-perks-renderer.ytd-section-list-renderer')
    const is_close = expand_button.hasAttribute('is-collapsed')
    if (is_close) {
        const contents_detail_button = document.querySelector('ytd-button-renderer.expand-collapse-button.ytd-sponsorships-expandable-perks-renderer')
        if (!!contents_detail_button) {
            contents_detail_button.click()
            await delay(500)
        }
    }
} catch (e) {
    logger.info('メンバー特典表示ボタン不明')
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
    logger.error('要素を取得できませんでした。\n取得したい画像が表示されている事を確認してから再実行してください')
    alert('要素を取得できませんでした。\n取得したい画像が表示されている事を確認してから再実行してください')
    throw new Error('要素を取得できません')
}


const badges_info = {}
const badge_month = (i) => {
    if (i < 5) {
        return ['0', '1', '2', '6', '12'][i]
    } else {
        return `${(i - 3) * 12}`
    }
}
if (!!badge_elm) {
    badge_elm.querySelectorAll('yt-img-shadow > img').forEach((elm, index) => {
        const image_url = elm.src.split('=')[0]
        const month = badge_month(index)
        const id = image_url.split('/')[image_url.split('/').length - 1].split('=')[0]
        logger.log(`id: ${id}\turl: ${image_url}`)

        badges_info[month] = {
            'id': id,
            'url': image_url
        }
    })
}

const stamps_info = {}
if (!!stamp_elm) {
    stamp_elm.querySelectorAll('yt-img-shadow > img').forEach(elm => {
        try {
            const stamp_name = elm.alt
            const image_url = elm.src.split('=')[0]
            if (stamp_name === '' || image_url === '') {
                throw new Error('スタンプ・URLを取得できません')
            }
            const id = image_url.split('/')[image_url.split('/').length - 1].split('=')[0]

            stamps_info[stamp_name] = {
                'id': id,
                'url': image_url
            }
        } catch (e) {
            logger.error(e)
        }

    })
}

/* チャンネルアイコンとトプ画を取得する */
let channel_image_urls;
try {
    const channel_banner_image_elm = document.querySelector('div#contentContainer.tp-yt-app-header div.page-header-banner-image.ytd-c4-tabbed-header-renderer')
    const banner_tmp = window.getComputedStyle(channel_banner_image_elm).getPropertyValue('--yt-channel-banner')
    const banner_url = banner_tmp.slice(banner_tmp.match(/https/).index, banner_tmp.length-1).replace(/=w\d+-fcrop64/, '=w0-fcrop64')
    const banner_og_url = banner_url.slice(0, banner_url.match(/=w\d+-fcrop64/).index) + '=w0'

    const avatar_elm = document.querySelector('div#channel-container.ytd-c4-tabbed-header-renderer yt-img-shadow img')
    const avatar_url = avatar_elm.src

    channel_image_urls = {
        'banner': banner_url,
        'banner_original': banner_og_url,
        'avatar': avatar_url,
    }

    // ユーザーが設定したアバターの場合だけ保存する
    // 自動生成の場合は，pathが /ytc/ から始まる
    if (!(new URL(avatar_url).pathname.startsWith('/ytc/'))) {
        channel_image_urls['avatar_original'] = avatar_url.split('=')[0] + '=w0'
    }

} catch (e) {
    logger.error(e)
    if (!confirm('バナー・アバター画像を検出できません．\n続行しますか？')) {
        alert('エラー内容: \n' + e.message)
        throw new Error('バナー・アバター画像を検出できません')
    }
}

for (let url of Object.values(badges_info)) {
    if (url === '') {
        if (!confirm('メンバーバッジが検出できません．\n続行しますか？')) {
            alert('取得したい画像が表示されている事を確認してから再実行してください')
            throw new Error('メンバーバッジが検出できません')
        }
    }
}
if (Object.keys(stamps_info).length === 0) {
    if (!confirm('メンバースタンプが検出できません．\n続行しますか？')) {
        alert('取得したい画像が表示されている事を確認してから再実行してください')
        throw new Error('メンバースタンプが検出できません')
    }
}

// zipモード
const save_zip = async () => {
    await importInNoModule('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')

    const zip = new JSZip()
    const folder_badge = zip.folder('badge')
    const folder_stamp = zip.folder('stamp')

    await Promise.all(Object.entries(stamps_info).map(async ([key, stamp_dict], i) => {
        const res = await fetch(stamp_dict.url)
        const blob = await res.blob()
        const ext =  get_image_ext(res.headers.get('content-type'))
        const file_name = safe_file_name(stamp_dict.id + '.' + ext)
        folder_stamp.file(file_name, blob)
        logger.log(`stamp ${i + 1} / ${Object.keys(stamps_info).length}  ${stamp_dict.url}`)
    }))

    await Promise.all(Object.entries(badges_info).map(async ([key, stamp_dict], i) => {
        const res = await fetch(stamp_dict.url)
        const blob = await res.blob()
        const ext = get_image_ext(res.headers.get('content-type'))
        const file_name = safe_file_name(stamp_dict.id + '.' + ext)
        folder_badge.file(file_name, blob)
        logger.log(`badge ${i + 1} / ${Object.keys(badges_info).length}  ${stamp_dict.url}`)
    }))


    const channel_image_info = {}
    await Promise.all(Object.entries(channel_image_urls).map(async ([key, url], i) => {
        const res = await fetch(url)
        const blob = await res.blob()
        const ext = get_image_ext(res.headers.get('content-type'))
        const file_name = safe_file_name(key + '.' + ext)
        zip.file(file_name, blob)

        channel_image_info[key] = {
            url: url,
            ext: ext
        }
        logger.log(`channel_image ${i + 1} / ${Object.keys(badges_info).length}  ${url}`)
    }))


    const time_stamp = new Date().toISOString()
    const export_json = {
        '_appVersion': APP_VERSION,
        '_createdAt': time_stamp,
        'displayName': display_name,
        'channelId': channel_id,
        'channelImages': channel_image_info,
        'badges': badges_info,
        'stamps': stamps_info,
    }

    const output_json_str = JSON.stringify(export_json, null, 2)
    const output_blob = new Blob([output_json_str], {type: 'application/json;charset=utf-8'})
    zip.file(safe_file_name(`NA-[${display_name}]-[${channel_id}].${formatted_date()}.membership.json`), output_blob)

    const zip_blob = await zip.generateAsync({ type: 'blob' })

    const a = document.createElement('a');
    a.href = URL.createObjectURL(zip_blob);
    a.download = `NA-[${display_name}]-[${channel_id}].${formatted_date()}.membership.zip`;

    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

await save_zip()

})

();