javascript:(function(){

    const fetch_encode = async (urlList) => {
        const promises = [];
        const base64Dict = {};

        for (let key in urlList) {
            promises.push(
                fetch(urlList[key])
                .then(response => response.blob())
                .then(blob => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                })
                .then(base64Data => {
                    base64Dict[key] = base64Data;
                })
            );
        }

        await Promise.all(promises);
        return base64Dict;
    };

    function download_json_file(jsonData, fileName) {
        const a = document.createElement("a");
        const file = new Blob([JSON.stringify(jsonData, null, 2)], {type: "application/json"});
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }

    function set_notification_container() {
        let elm = document.getElementsByClassName("YT-Membership-exporter");
        while (elm.length > 0) {
            elm[0].parentElement.removeChild(elm[0]);
        }

        let overlay = document.createElement("div");
        overlay.id = "notification-container";
        overlay.className = "YT-Membership-exporter";
        document.body.appendChild(overlay);

        const css = `
            #notification-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
            }
            
            .notification {
                background-color: #fff;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
                padding: 10px;
                margin-bottom: 10px;
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
                transform: scale(1.2);
                transform-origin: bottom right;
            }
            
            .notification.show {
                opacity: 1;
            }`;

        let styleElement = document.createElement("style");
        styleElement.className = "YT-Membership-exporter";
        styleElement.type = "text/css";
        styleElement.appendChild(document.createTextNode(css));
        let head = document.head || document.getElementsByTagName('head')[0];
        head.appendChild(styleElement);
    }

    function create_notification(message) {
      let container = document.getElementById('notification-container');

      let notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;

      container.appendChild(notification);

      setTimeout(function() {
        notification.classList.remove('show');
        setTimeout(function() {
          notification.remove();
        }, 300);
      }, 5000);

      setTimeout(function() {
        notification.classList.add('show');
      }, 100);
    }

    function logger(msg) {
        console.log("[YT-Membership-exporter] " + msg);
    }




    // main
    logger("start");

    set_notification_container();


    if (!window.location.pathname.endsWith("/membership")) {
        create_notification("メンバーシップページに移動してください。");
        logger("Membership page is not open.");
        return;
    }

    let notSelectedElements = document.getElementsByClassName('badge-line badge-not-selected style-scope ytd-sponsorships-loyalty-badges-renderer style-scope ytd-sponsorships-loyalty-badges-renderer');
    let selectedElements = document.getElementsByClassName('badge-line badge-selected style-scope ytd-sponsorships-loyalty-badges-renderer style-scope ytd-sponsorships-loyalty-badges-renderer');
    let badgeElements = [...notSelectedElements, ...selectedElements];
    let stampElements = document.querySelectorAll('yt-img-shadow.images.style-scope.ytd-sponsorships-perk-renderer.no-transition');

    try {
        let channel_id = document.querySelector('link[rel="canonical"]').href.split("/")[4];
    } catch (e) {
        create_notification("チャンネルIDを取得できません。リロードしてください。");
        logger("Unable to get channel id. Please reload.");
        return;
    }

    let channel_name = document.querySelector('yt-formatted-string[class="style-scope ytd-channel-name"]').innerHTML;
    let channel_id = document.querySelector('link[rel="canonical"]').href.split("/")[4];
    let export_file_name = `NA-[${channel_name}]-[${channel_id}].membership.json`;


    let badgeData = {};
    for(let i=0; i<badgeElements.length; i++) {
        let badgeTitle = badgeElements[i].querySelector('.badge-title.style-scope.ytd-sponsorships-loyalty-badges-renderer').innerText;
        let badgeImageSrc = badgeElements[i].querySelector('img').src;
        badgeData[badgeTitle] = badgeImageSrc.split("=")[0];
    }

    let stampData = {};
    for(let i=0; i<stampElements.length; i++) {
        let stampAlt = stampElements[i].querySelector('img').alt;
        let stampImageSrc = stampElements[i].querySelector('img').src;
        if (stampAlt === "") {
            continue;
        }
        stampData[stampAlt] = stampImageSrc.split("=")[0];
    }

    create_notification("badge： " + Object.keys(badgeData).length);
    create_notification("stamp: " + Object.keys(stampData).length);
    logger("badge： " + Object.keys(badgeData).length);
    logger("stamp: " + Object.keys(stampData).length);

    if (Object.keys(badgeData).length === 0 || Object.keys(stampData).length === 0) {
        create_notification("スタンプやバッジが読み込まれていない可能性がああります。");
        create_notification("特典の詳細を表示して、読み込まれていることを確認してから再度実行してください。");
        logger("Execution terminated as the expected content was not found.");
        return;
    }

    const processAndDownload = async () => {
        const [badge_image, stamp_image] = await Promise.all([
            fetch_encode(badgeData),
            fetch_encode(stampData)
        ]);

        let export_data = {
            badge: badgeData,
            badge_image: badge_image,
            stamp: stampData,
            stamp_image: stamp_image
        };

        download_json_file(export_data, export_file_name);
        create_notification("ダウンロードが完了しました。");
    };

    processAndDownload();



})();
