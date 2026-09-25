# Blogger Code Block + Callout (Chrome)

Hai nút góc phải khi soạn bài trên Blogger:

- `</>` — chèn code block Probha
- `!` — chèn callout kiểu Obsidian

## Cài đặt

1. Mở Chrome → `chrome://extensions`
2. Bật **Developer mode**
3. **Load unpacked** → chọn thư mục `blogger-codeblock-ext`
4. Mở trang soạn bài Blogger  
   (Nếu đã cài trước đó: bấm **Reload** trên extension)

## Code block

1. Bấm nút xanh `</>`
2. Chọn ngôn ngữ → dán code → **Chèn**
3. Nếu không chèn được: **Copy HTML**, chuyển editor sang **HTML**, Ctrl+V

## Callout

1. Bấm nút cam `!`
2. Chọn loại (Note, Tip, Warning, Bug…) → sửa tiêu đề nếu cần → nhập nội dung → **Chèn**

HTML mẫu:

```html
<div class="callout callout-tip">
  <p class="callout-title">Tip</p>
  <div class="callout-body">
    <p>Nội dung gợi ý...</p>
  </div>
</div>
```

Các class: `note`, `abstract`/`summary`/`tldr`, `info`/`todo`, `tip`/`hint`/`important`, `success`/`check`/`done`, `question`/`help`/`faq`, `warning`/`caution`/`attention`, `failure`/`fail`/`missing`, `danger`/`error`, `bug`, `example`, `quote`/`cite`.

Cần theme Probha đã có CSS callout (re-upload XML theme nếu chưa).
