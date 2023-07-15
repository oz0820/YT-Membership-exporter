# YT-Membership-exporter
メンバーシップページから、バッジとスタンプのデータを抜き取ってJSONに書き出す。


## 概要
Webブラウザでメンバーシップ特典を表示した状態でBookmarkletを実行すると、必要なhtml要素をローカルにPOSTします。  
それをFastAPIで受け取って処理・保存します。  
`code_exporter.py`はBookmarkletを生成するためのコードです。

## 使い方
- `code_exporter.py`を実行して、改行のないJSを取得できます。ブックマークに登録してください。  
[最新のArtifacts]( https://github.com/oz0820/YT-Membership-exporter/actions/workflows/bookmarklet.yml )からダウンロードすることも出来ます。
 
- `YT-Membership-exporter.server.exe`を実行  
- ブラウザで特典を表示してBookmarkletを実行
- exeを実行しているディレクトリに`export`フォルダが生成されて、その中に保存される

Linuxで使う場合は`libmagic1`をインストールしてください。

### 自分でexeを作る
- `requirements.txt`を食わせて環境を整える
- `pyinstaller`をインストールする
- `pyinstaller --onefile YT-Membership-exporter.server.py`
あとはよしなに……
