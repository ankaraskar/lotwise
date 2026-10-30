# Lotwise v0.4 — 使用及更新说明

Lotwise 是一个免费的开源 GitHub Pages 建筑场地与法规初步审查项目。访客直接打开网页，不需要安装 Python、付费 API 或任何软件。网页默认英文。

## v0.4 新增

- 专业化界面，最上方直接显示 **Zoning、Height、Setbacks、Parking** 四项结果。
- Toronto **CR SS2**：明确显示一般规则的条件性 front / rear / side setbacks、GIS 高度数值（如查询到）和 x531 exception 提醒。
- Brantford **MCC**：区分非住宅及混合／住宅用途的建筑高度、院距、绿化比例等一般规则；Parking 支持常见用途的初步费率及汽车经销店计算。
- 新增 **Ontario Building Code (OBC) 初步筛查**：填 provisional major occupancy、OBC storeys、building area、项目类型，显示可能的 Part 9 / Part 3 审查路径及后续需要确认的消防、出口、无障碍等项目。
- 官方资料索引新增安省 OBC Compendium 和现行 O. Reg. 163/24 的官网链接、抓取配置。

## 更新 GitHub Pages

1. 解压更新包；把**内部的文件和文件夹**上传到现有 `lotwise` GitHub 仓库根目录，替换同名文件，保持 `.github/workflows/pages.yml`、`site/`、`scripts/` 等路径结构。
2. Commit changes；在 GitHub 的 **Actions** 确认自动发布成功。
3. 刷新 `https://你的用户名.github.io/lotwise/`；如果显示旧版，用 `Ctrl + Shift + R` 强制刷新。
4. 用 **522 Mount Pleasant Rd, Toronto** 与 **5 Woodyatt Dr, Brantford** 进行回归测试。先确认物业，然后查看最上方四项摘要及 **Development standards**。
5. OBC 输入的是 **Building Area（按 OBC 定义）**，不是总 GFA。法规适用最终需由负责的专业人员确认。

## 当前局限

- 这不是全面支持所有城市、所有 zoning 类别的通用法规解析器。已结构化覆盖的是 Toronto CR SS2 的部分条件性规定和 Brantford MCC 的一般规定。
- 具体允许的设计受到 site-specific exceptions、amendments、appeals、survey、用途、消防等影响。缺失信息显示为待核实，不应直接认为符合要求。
- Brantford Parking 只提供初步 base-rate 计算；Toronto Chapter 200 停车计算尚未实现。
- OBC 目前是 **Part 9 / Part 3 初步适用性筛查与待审事项清单**，并非完整 Code Compliance Check。官方 HTML Compendium 可能落后于最新安省法规修正，应核对现行 O. Reg. 163/24。
- 网页的客户 Brief 留在浏览器，GIS 地址查询会将地址／坐标发送到对应官方政府 GIS 服务。不要把客户保密资料上传到公开 GitHub 仓库。

**MIT 开源许可。用于早期研究，不构成审批或专业设计意见。**
