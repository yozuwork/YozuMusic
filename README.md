# YozuMusic

柚子音樂庫第一版。使用 Vite、React 與 React Icons 製作，視覺延續 YozuManga 的紙張、手繪線條與卡片語言。

## 啟動

```bash
npm install
npm run dev
```

## 部署至 GitHub Pages

```bash
npm run deploy
```

此指令會先建置專案，再將 `dist` 發布至 repository 的 `gh-pages` branch。

## 第一版功能

- 以連結新增 YouTube、Spotify、SoundCloud、Apple Music 或其他音樂來源
- YouTube 連結自動產生封面
- 單一歌曲資料可同時加入 BGM、MUSIC、作業用等多個主分類
- 動漫與遊戲合併為獨立的「作品」區，歌曲可關聯到對應作品
- CHILL、戰鬥、青春、熱血、懷舊、療癒、夜晚、專注等感覺標籤
- 搜尋、分類／標籤篩選、排序、最愛、編輯與刪除
- 桌機及手機響應式版面
- 瀏覽器 localStorage 本機保存

## 資料說明

歌曲的 `categories` 與 `tags` 都是陣列，因此同一首歌能同時出現在多個分區。作品獨立儲存，歌曲透過 `workId` 與 `workTitle` 關聯作品。
