# Tetris Browser Bot

Bot tự động chơi Tetris thông qua browser automation sử dụng Puppeteer.

## 🚀 Cài Đặt

```bash
cd bot
npm install
```

## 📖 Sử Dụng

### Chạy Bot Cơ Bản

```bash
# Tạo room mới và chơi
npm start -- --create-room --name "MyBot"

# Join room có sẵn
npm start -- --room ABCD123 --name "MyBot"

# Chỉ định URL game khác
npm start -- --url http://tetris-server.huytrang.id.vn --create-room
```

### Tùy Chọn Bot

```bash
# Chạy với tốc độ khác nhau
npm start -- --create-room --speed slow     # Chậm (800ms/move)
npm start -- --create-room --speed medium   # Trung bình (400ms/move)
npm start -- --create-room --speed fast     # Nhanh (200ms/move)
npm start -- --create-room --speed instant  # Tức thì (50ms/move)

# Debug mode với screenshots
npm start -- --create-room --debug --screenshots

# Test kết nối
npm run test
```

## 🎮 Tính Năng

### ✅ Đã Implement

- **Browser Automation**: Điều khiển browser qua Puppeteer
- **Game State Detection**: Đọc trạng thái game từ DOM
- **AI Strategy**: Thuật toán đánh giá và chọn vị trí tối ưu
- **Keyboard Input**: Gửi keyboard events như người chơi thật
- **Auto Join/Create Room**: Tự động join room hoặc tạo room mới
- **Multiple Speed Settings**: Điều chỉnh tốc độ bot
- **Debug Mode**: Screenshot và logging chi tiết
- **Error Recovery**: Tự động restart khi game over

### 🔄 AI Strategy

Bot sử dụng heuristic-based AI với các tiêu chí đánh giá:

1. **Lines Cleared** (+1000 điểm): Ưu tiên xóa nhiều dòng
2. **Height Penalty** (-10 điểm/hàng): Tránh chồng quá cao
3. **Holes Penalty** (-200 điểm/lỗ): Tránh tạo lỗ trống
4. **Bumpiness Penalty** (-50 điểm): Giữ bề mặt phẳng

### 📁 Cấu Trúc

```
bot/
├── src/
│   ├── bot/           # Core bot logic
│   │   ├── TetrisBot.ts      # Bot chính
│   │   ├── GameVision.ts     # Đọc game state từ DOM
│   │   └── InputController.ts # Gửi keyboard inputs
│   ├── browser/       # Browser automation
│   │   └── BrowserManager.ts # Quản lý Puppeteer
│   ├── ai/           # AI strategy
│   │   └── Strategy.ts       # Logic AI
│   ├── utils/        # Utilities
│   │   ├── types.ts         # Type definitions
│   │   ├── constants.ts     # Game constants
│   │   └── helpers.ts       # Helper functions
│   └── config/       # Configuration
│       └── config.ts        # Bot config
├── screenshots/      # Debug screenshots
└── package.json
```

## ⚙️ Cấu Hình

### Environment Variables (.env)

```bash
GAME_URL=http://localhost:5173
DEBUG=false
BOT_SPEED=medium
SCREENSHOTS_ENABLED=true
```

### Bot Keys (config/config.ts)

```typescript
keys: {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  softDrop: 'ArrowDown',
  hardDrop: 'Space',
  rotate: 'ArrowUp',
  hold: 'KeyC'
}
```

## 🐛 Debug & Troubleshooting

### Debug Mode

```bash
npm start -- --debug --create-room
```

Khi debug mode bật:

- Screenshots tự động lưu vào `screenshots/`
- Logging chi tiết mọi action
- Game state được in ra console

### Thường Gặp

1. **Bot không detect được game board**

   - Kiểm tra CSS selectors trong `constants.ts`
   - Chạy debug mode để xem screenshots

2. **Keys không hoạt động**

   - Kiểm tra key mappings trong config
   - Đảm bảo browser window đang focus

3. **Game over liên tục**
   - Giảm speed bot (`--speed slow`)
   - Kiểm tra AI strategy weights

## 🚧 Roadmap

- [ ] Cải thiện piece detection từ DOM
- [ ] Thêm hold piece strategy
- [ ] Multi-piece lookahead AI
- [ ] Machine learning based strategy
- [ ] Multi-bot support
- [ ] Performance metrics tracking

## 📝 Lưu Ý

- Bot cần browser window visible để hoạt động
- Đảm bảo game đang chạy trước khi start bot
- Bot sẽ tự động restart game khi game over
- Press Ctrl+C để dừng bot

## 🤝 Đóng Góp

Mọi bug report và feature request đều được welcome!
