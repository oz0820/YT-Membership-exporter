javascript:(function(){
    const app_version = "2023.07.15.0";
    const server_url = "http://localhost:8081/";


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
            
            .notification-error {
                background-color: #f88;
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
            }
            
            .notification-error.show {
                opacity: 1;
            }`;

        let styleElement = document.createElement("style");
        styleElement.className = "YT-Membership-exporter";
        styleElement.type = "text/css";
        styleElement.appendChild(document.createTextNode(css));
        let head = document.head || document.getElementsByTagName('head')[0];
        head.appendChild(styleElement);
    }

    function create_notification(message, is_error=false) {
        let container = document.getElementById('notification-container');

        let notification = document.createElement('div');
        notification.className = is_error ? 'notification-error' : 'notification';
        notification.textContent = message;

        container.appendChild(notification);

        const timeout = is_error ? 10000 : 5000;
        setTimeout(function() {
            notification.classList.remove('show');
            setTimeout(function() {
            notification.remove();
            }, 300);
        }, timeout);

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

    if (!window.location.href.startsWith("https://www.youtube.com/")) {
        create_notification("Youtubeに移動してください。");
        logger("Please move to Youtube.");
        return;
    }

    let ytd_sponsorships = document.querySelector('div[class="expandable-content style-scope ytd-sponsorships-expandable-perks-renderer"]');
    if (ytd_sponsorships !== null) {
        if (ytd_sponsorships.getBoundingClientRect().width === 0 && ytd_sponsorships.getBoundingClientRect().height === 0) {
            ytd_sponsorships = null;
        }
    }

    let tp_yt_paper_dialog = document.querySelector('tp-yt-paper-dialog[class="style-scope ytd-popup-container"]');
    if (tp_yt_paper_dialog !== null) {
        if (tp_yt_paper_dialog.getBoundingClientRect().width === 0 && tp_yt_paper_dialog.getBoundingClientRect().height === 0) {
            tp_yt_paper_dialog = null;
        }
    }

    let display_name = document.querySelector('div[id="channel-container"]').querySelector('yt-formatted-string[class="style-scope ytd-channel-name"]').innerHTML;

    if (ytd_sponsorships ===  null && tp_yt_paper_dialog === null) {
        create_notification("要素を取得できませんでした。ページをリロードして、全ての要素を表示して再実行してください。");
        return;
    }


    let send_data = {
        "href": window.location.href,
        "display_name": display_name,
        "ytd_sponsorships_expandable_perks_renderer": ytd_sponsorships ? ytd_sponsorships.outerHTML : "",
        "tp_yt_paper_dialog": tp_yt_paper_dialog ? tp_yt_paper_dialog.outerHTML : ""
    };

    create_notification("サーバーにデータを送信します。");
    fetch(server_url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(send_data),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {

                    logger("saved.");
                    for (let msg = 0; msg < data.message.length; msg++) {
                        create_notification(data.message[msg]);
                    }
                } else {
                    for (let msg = 0; msg < data.message.length; msg++) {
                        create_notification(data.message[msg]);
                    }
                }

            })
            .catch(error => {
                console.error('エラーが発生しました:', error);
                create_notification('エラーが発生しました:' + error);
            });

})();
