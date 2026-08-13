---
title: 绘题机 · 随机绘画抽卡
created: 2026-08-13
version: 1.1
---

# 绘题机 · 随机绘画抽卡

> 随机绘画关键词抽卡工具。一键【召唤今日OC】→ 三排拉杆老虎机（朝向 + 打光）→ 球形摇号机（形象底子）→ 节气转盘（单色主题），摇出一套头像/胸像绘题。对准米画师 / 画加接单，单色 / 灰度练习。

## 现状

- ✅ v1.1 已发布，部署至 GitHub Pages
- ✅ 数据 v3（17 转盘 / 315 词条 + 节气色 384 色值）
- ✅ PRD V2.1
- ✅ 抽选：气质 / 性别 / 风格三轴软约束 + 需盘发 / 情绪约束 + 朝向打光加权

## 目录结构

```
oc-wheel/
├── index.html          入口页面
├── src/                网页源码（app.js / data.js / style.css）
├── data/               标签数据（v3 + v1 备份）
├── docs/               文档（PRD + 数据清单）
├── releases/v1.0/      v1.0 存档快照
├── serve.js            本地预览服务器（node serve.js）
├── CHANGELOG.md        更新日志
└── README.md           本文件
```

## 文档

- PRD：[[3-caprice/my_work/oc-wheel/docs/OC转盘-PRD]]
- 数据清单：[[3-caprice/my_work/oc-wheel/docs/OC转盘-v2-数据清单]]
- 更新日志：[[3-caprice/my_work/oc-wheel/CHANGELOG]]

## 数据

- 标签池：`data/oc-wheel-data.json`（v3）
- 旧版备份：`data/oc-wheel-data-v1-backup.json`

## 本地预览

```bash
cd oc-wheel && node serve.js
# 手机与电脑同一 WiFi，访问控制台打印的 http://<局域网IP>:8000
```

## 下一步

- 导出（截图 / JSON）、收藏池备注、长打光名短名（图标）、多色上色（色彩课后）
