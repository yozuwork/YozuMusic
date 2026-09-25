# 柚子音樂庫 手機版 v1.1

v1.0 的內容全部保留，這版加上：

## 清單／卡片快速切換
- 手機上「N 首」那一列多一組 [≡ | ▦] 切換鈕（作品分類的篩選列也有）。
- ≡ = 清單（cardSize `small`），▦ = 卡片（切到 `medium` 雙欄；如果原本就是 `large` 大圖，就保持大圖）。
- 設定抽屜裡的「清單／雙欄／大圖」照舊可用。
- 桌機用 CSS 隱藏（`.mobile-view-toggle`）。

```jsx
<div className="mobile-view-toggle" role="group" aria-label="切換顯示方式">
  <button type="button" className={cardSize === 'small' ? 'selected' : ''} aria-pressed={cardSize === 'small'}
    aria-label="清單模式" onClick={() => onCardSizeChange('small')}><ListIcon /></button>
  <button type="button" className={cardSize !== 'small' ? 'selected' : ''} aria-pressed={cardSize !== 'small'}
    aria-label="卡片模式" onClick={() => cardSize === 'small' && onCardSizeChange('medium')}><GridIcon /></button>
</div>
```
放在篩選列的 `.mobile-result-count` 後面，以及作品篩選列的 `.sort-control` 前面。

## 記住顯示方式
cardSize 改存到 localStorage（key：`yozu-music-card-size`），重新整理後會維持上次的選擇。桌機的卡片大小也會一起被記住。

```js
const [cardSize, setCardSize] = useState(() => localStorage.getItem('yozu-music-card-size') || 'small');
useEffect(() => { localStorage.setItem('yozu-music-card-size', cardSize); }, [cardSize]);
```

## 卡片模式的歌名
手機卡片模式的歌名改成最多顯示兩行，不再只顯示一行就截斷。
