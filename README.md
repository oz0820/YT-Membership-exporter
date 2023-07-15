# YT-Membership-exporter
メンバーシップページから、バッジとスタンプのデータを抜き取ってJSONに書き出す。

## 概要
Webブラウザでメンバーシップ特典を表示した状態でBookmarkletを実行すると、必要なhtml要素をローカルにPOSTします。  
それをFastAPIで受け取って処理・保存します。  
`code_exporter.py`はBookmarkletを生成するためのコードです。

## 使い方
- [最新のArtifacts]( https://github.com/oz0820/YT-Membership-exporter/actions/workflows/bookmarklet.yml )をダウンロード  
- 解凍し、JSをブックマークに登録
- `YT-Membership-exporter.server.exe`実行  
- ブラウザで特典を表示してBookmarkletを実行
- exeを実行しているディレクトリに`export`フォルダが生成されて、その中に保存される

Linuxで使う場合は`libmagic1`をインストールしてください。


## 自分でビルドする
`code_exporter.py`を使うと、改行のないJSを取得できます。  
`pyinstaller`を実行してください。  
あとはよしなに……
