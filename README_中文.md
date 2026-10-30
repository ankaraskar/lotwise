# Lotwise v0.5 — 官方法规证据检索

GitHub Pages 免费网站，不需要用户安装 Python、注册账号或购买 AI API。

## 本次新增

- 在 **Development standards** 下方增加 **Relevant by-law passages** 面板。物业确认后，自动从已索引的官方文件中寻找 Height、Setbacks、Parking、Permitted Uses、FSI/Coverage、Exceptions 等条文候选。
- GitHub Actions 在服务器上自动下载白名单内的政府 HTML/PDF、解析文本并生成 `site/data/evidence.json`。访问网页的用户无需自行下载 PDF。
- 每条候选证据都有官方文档链接、可能的章节号、PDF 查看器页码或 HTML 文本块号，以及 **UNVERIFIED** 标识。
- 增加 Toronto 官方 R 和 CRE 类法规文档，增加对法规检索和分区匹配的测试。

**注意：v0.5 仍不是自动合规计算引擎。** 它能够从官方文献自动定位有可能相关的段落，但尚不能对所有分区自动算出最终 Height、Setbacks、Parking、Permitted Uses，也不能自动判断所有 exceptions 或 OBC 合规。

## 更新 GitHub 仓库

1. 解压 ZIP。
2. 在现有 `lotwise` 仓库中替换对应文件，保留原目录结构，特别是 `site/`、`scripts/`、`tests/` 和 `.github/workflows/pages.yml`；不要只上传一个 ZIP 文件。
3. 提交到 `main`。GitHub Actions 会安装 PDF 解析库、运行测试、读取政府文献、更新索引并部署网站。
4. 在网页查看 **Source freshness** 和新的 **Official evidence** 面板；若数据源下载失败，必须查看 Actions 日志，不要把“没有检索到”理解为“没有法规要求”。

## 推荐测试

- Toronto：`522 Mount Pleasant Rd`，核对 `CR SS2 (x531)`、Height GIS、Chapter 40 候选条文；`x531` 和原始修正文件仍须人工核查。
- Brantford：`5 Woodyatt Dr`，核对 `MCC` 一般标准、停车条文的候选来源；Parking 最终数值还受实际用途、面积、Schedule D 和特殊条款影响。

## 数据机制

系统使用 `site/data/sources.json` 内**有限、核实过的官方来源清单**。GitHub Actions 访问政府官方网站，生成静态的文献索引，Github Pages 网页直接读取这些文件。不做无限制网上搜索，也不访问第三方解释网站。

若官方文档下载失败，更新索引可能不完整。目前部署产物不自动持久保存为仓库中的历史版本；无法保证下载失败时保留上一轮全部内容。每条法规候选均应点击原始官方资料复核。

**Privacy：**客户项目要求默认留在浏览器；物业地址和坐标会发送到对应城市官方 GIS。OBC 仍仅提供 preliminary screening。
