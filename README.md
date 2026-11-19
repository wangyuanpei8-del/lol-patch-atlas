# 峡谷补丁志

**[打开网站 · 查看补丁](https://wangyuanpei8-del.github.io/lol-patch-atlas/)**

从 **26.23** 起归档《英雄联盟》电脑版补丁。默认打开「海克斯大乱斗」，也可切换斗魂竞技场、召唤师峡谷和跨模式更新。手机和桌面均可直接访问。

- 点击**本期重点**跳到详细改动，或在模式内搜索英雄、装备和机制。
- 从**版本历史**打开旧公告。同版修订可切换「只看变化」和「完整公告」。
- 点击条目右侧的 **↗** 复制直达链接。点击封面的「官方公告」核对原文。

## 更新与维护

GitHub Actions 每天在**日本时间 08:00 和 20:00** 检查拳头繁中官网的新公告和最近两个版本的修订。同步脚本保留已收录的历史快照，GitHub Pages 发布静态网页和归档数据。

[官方补丁目录](https://www.leagueoflegends.com/zh-tw/news/tags/patch-notes/) · [同步记录](https://github.com/wangyuanpei8-del/lol-patch-atlas/actions/workflows/sync.yml) · [发布记录](https://github.com/wangyuanpei8-del/lol-patch-atlas/actions/workflows/pages.yml)

| 路径 | 用途 |
| --- | --- |
| `dist/index.html`、`dist/atlas.css`、`dist/atlas.js` | 网页、样式和交互 |
| `dist/patches.json` | 公告档案与修订对照 |
| `scripts/sync.py`、`scripts/sources.json` | 公告同步和去重记录 |
| `.github/workflows/` | GitHub Actions 同步与发布 |

在仓库根目录运行 `python -m http.server 8000 --directory dist`，然后打开 [localhost:8000](http://localhost:8000)。

## 素材

模式栏采用 Riot 客户端素材。海克斯大乱斗使用 ARAM 徽章，跨模式使用客户端的轮换模式徽章。本项目由玩家维护。[客户端素材索引](https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/content/src/leagueclient/gamemodeassets/)
