# 更新履歴

 - master/HEAD
 - 1.4.5 (2022.3.16)
   * コンテキストメニュー項目上でのミドルクリックが機能していなかったのを修正 (Fixed by [FSpark](https://github.com/FSpark), thanks!)
   * 関数型プレースホルダーでマルチバイト文字を正しく扱えていなかったのを修正 (Fixed by [FSpark](https://github.com/FSpark), thanks!)
 - 1.4.4 (2021.12.7)
   * 設定で通知を無効化している場合に、クリップボード操作後の通知をより確実に無効化するようにした（[いくつかの環境でハングアップが発生する問題](https://github.com/piroor/copy-selected-tabs-to-clipboard/pull/28)の暫定的な回避策）
 - 1.4.3 (2021.10.1)
   * 新しいプレースホルダーの `%CONTAINER_NAME%`、`%CONTAINER_NAME_HTMLIFIED%`（およびエイリアスの`%CONTAINER_TITLE%`、`%CONTAINER_TITLE_HTMLIFIED`) に対応：コンテナータブにおいて `<コンテナー名>: ` に置き換えられます（[natask](https://github.com/natask)により提案され初期実装が行われました。ありがとう！）
   * 新しい関数型プレースホルダーの `%CONTAINER_NAME(prefix, suffix)%`、`%CONTAINER_NAME_HTMLIFIED(prefix, suffix)%` に対応：コンテナータブにおいて `<接頭辞><コンテナー名><接尾辞>` に置き換えられます。例えば `%CONTAINER_NAME("[", "]")%` であれば、「個人用」のタブでは `[個人用]` になります。
   * 新しいプレースホルダーの `%CONTAINER_URL%`、`%CONTAINER_URL_HTMLIFIED%` （[Open external links in a container](https://addons.mozilla.org/firefox/addon/open-url-in-container/)用のURL）に対応（[natask](https://github.com/natask)により提案され初期実装が行われました。ありがとう！）
 - 1.4.2 (2021.5.5)
   * タブが複数選択されていないときの挙動として、すべてのタブをコピーする選択肢を追加
 - 1.4.1 (2020.12.2)
   * デスクトップ通知を無効化する設定を追加
 - 1.4.0 (2020.11.10)
   * 単独のタブではなくツリー（または子孫のタブ）をコピーできるようにした（[Tree Style Tab](https://addons.mozilla.org/firefox/addon/tree-style-tab/)が必要）
   * コピーに成功した場合に通知メッセージを表示するようにした
   * 「すべての設定」のUIの不備を改善：インポートした設定をUIに即座に反映し、また、数値型の一部の設定項目で小数が不正な値として警告されてしまわないようにした
 - 1.3.3 (2020.8.8)
   * 情報が提供されている場合、`%DESCRIPTION%`をOGPの説明文で埋めるようにした
   * 情報が提供されている場合、`%AUTHOR%`をTwitter Cardのアカウント名で埋めるようにした
   * 作成者、説明文、キーワードをタブの内容から取得できなかった時のエラー情報を出力するオプションを追加
 - 1.3.2 (2020.8.3)
   * スクリプトの実行を許可されているタブが無い場合でも、より確実にリッチテキスト形式でタブをコピーできるようにした
   * `%DESCRIPTION%`などのコンテンツの内容を参照するプレースホルダについて、スクリプトの実行を許可されていないタブがあると暗黙的にコピーに失敗する問題を修正
 - 1.3.1 (2020.7.29)
   * `%DESCRIPTION%`などのコンテンツの内容を参照するプレースホルダがある時にタブのコピーに失敗する問題を修正
 - 1.3.0 (2020.6.8)
   * 特殊なプレースホルダーとして `%REPLACE(...)%` に対応した（詳細な仕様は[自動テスト](https://github.com/piroor/copy-selected-tabs-to-clipboard/blob/master/test/test-replacer.js)を参照してください）
   * エラーをコピー文字列として出力するようにした
   * リッチテキストのコピーに失敗した時はプレーンテキストのコピーにフォールバックするようにした
   * `dom.events.asyncClipboard.dataTransfer`=`true`のときのリッチテキストのコピーに失敗していたのを修正
 - 1.2.3 (2020.4.28)
   * モーダル風ダイアログがクローズボックスで閉じられた時の挙動を改善
   * モーダル風ダイアログを開くのに要する時間を若干短縮した
 - 1.2.2 (2020.4.25)
   * モーダル風ダイアログの実装を改善した（安定性の向上、ネイティブのダイアログを模したボタンの配置、Darkモードへの対応、閉じられたダイアログが「最近閉じたウィンドウ」の一覧になるべく現れないようにした）
 - 1.2.1 (2020.4.24)
   * Firefox ESR68でポップアップウィンドウが表示されない問題を修正（1.2.0での後退バグ）
 - 1.2.0 (2020.4.22)
   * 各コピー形式のラベル内で`&`を使ってアクセスキーを指定できるようにした
   * 各コピー形式にキーボードショートカットを設定できるようにした
   * コピー形式の選択画面をモーダル風ポップアップウィンドウで表示するようにした
 - 1.1.1 (2020.3.19)
   * 追加のコンテキストメニュー項目を表示しないように設定されているときは、トップレベルのメニュー項目も非表示にするようにした
   * 設定が内部的に移行されていない環境でもコピー形式の項目が正しく表示されるように修正
   * 規定のコピー形式を正しく復元できるようにした
   * Firefox 63以前のサポートを終了
 - 1.1.0 (2020.3.18)
   * 項目を削除せず非表示にする「有効にする」チェックボックスを設けた
   * 表示するメニュー項目が1つだけの時はコンテキストメニュー直下に表示するようにした
 - 1.0.9 (2020.3.6)
   * 最近のバージョンのFirefoxにおいて、コンテンツ領域内に確認ダイアログが表示されなくなっていたのを修正
   * Firefox ESR68時点ですでに本体にUIがあるため、キーボードショートカット設定用のUIを削除した
   * 初期化前の設定画面を隠すようにした
 - 1.0.8 (2019.9.18)
   * 設定画面での操作によるコンテキストメニュー項目の動的な更新が期待通りに行われていなかったのを修正
 - 1.0.7 (2019.8.8)
   * Firefox 70で廃止される古いコードを削除
 - 1.0.6 (2019.5.24)
   * ツリー型タブ 3.0.12 および マルチプルタブハンドラ 3.0.7 の仕様変更に追従
   * キーボードショートカットを除く全設定のインポートとエクスポートに対応（設定→開発用→デバッグモード→すべての設定→Import/Export）
 - 1.0.5 (2019.1.3)
   * タブのコンテキストメニューとWebページ上のコンテキストメニューのそれぞれについてメニュー項目の表示・非表示を制御できるようにした
 - 1.0.4 (2018.12.15)
   * マルチプルタブハンドラのAPI経由でのコマンド実行に失敗していたのを修正
 - 1.0.3 (2018.11.30)
   * タブが複数選択されていない場合でも初期状態でメニュー項目を表示するようにした
   * 「クリップボードにコピー」の設定項目の削除結果が正しく保存されていなかったのを修正
   * 設定画面で無用な横スクロールが発生しないようにした
 - 1.0.2 (2018.11.3)
   * マルチプルタブハンドラと併用時の互換性を向上
 - 1.0.1 (2018.10.31)
   * ツリー型タブと併用時の互換性を向上
 - 1.0 (2018.10.30)
   * [マルチプルタブハンドラ](https://addons.mozilla.org/firefox/addon/multiple-tab-handler/)から機能を分割した
   * zh-CNロケール追加（by yfdyh000, thanks!）
