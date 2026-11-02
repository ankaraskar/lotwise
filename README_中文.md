# Lotwise v0.7 — 简洁 Zoning 界面 + 官方法规候选提取

这次删除了重复的 **At a Glance**。用户输入地址、点击 **Analyze** 后，直接阅读 **Development Standards**；OBC、原始 GIS、官方参考及自动发现的候选条款均按需展开。

## 配色和文字

- 主色：**#0B396D**（从用户提供的参考图提取）
- 白色：**#FFFFFF**；浅蓝灰背景：**#F4F7FB**；正文：**#0B2745**
- 正文和法规数据 16px；表单标签 15px；说明及来源链接 14px；次要元数据 12–13px
- 无任何 VGA 字样、标志或品牌图片，只有色彩参考。

## 后台新功能

GitHub Actions 仍会在 GitHub 的环境里联网尝试下载政府官方网页及 PDF，新增 `rule_candidates.json`：从原文中提取 Height、Setbacks、Coverage、Parking 中含有数值/单位的候选片段，同时保留原始网页或 PDF 页码。

**注意：候选片段永远标记为待核实。** 它不是最终建筑标准，也不能自动适用到每一个地块；只有确认官方条款全部适用条件、特殊例外和修正案以后，才能作为设计依据。当前完整结构化数值仍主要覆盖部分已知分区，而非所有 Zoning。

## 更新 GitHub 网站

1. 解压 ZIP。
2. 把根目录下 `.github/`、`scripts/`、`site/`、`tests/` 等文件夹中的**内容按原路径**替换到现有 `lotwise` 仓库，不要上传 ZIP 本身。
3. Commit 到 `main`，检查 **Actions** 部署为绿色。
4. 打开 Lotwise 网页并按 `Ctrl + Shift + R` 刷新。

普通用户无需安装 Python、无需自己下载法规 PDF，也无需付费 AI API。后台法规提取在 GitHub Actions 执行，下载失败时旧索引会被标为 stale，不代表没有法规。

## 测试

已测试 Python 单元测试、官方来源白名单以及 JS 语法。本环境的 Chromium 浏览器拒绝加载本地测试地址，因此尚未完成真实联网端到端浏览器测试；应在 GitHub Pages 部署后继续实际验证。
