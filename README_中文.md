# Lotwise · 中文使用说明

**Lotwise** 是免费、开源的建筑用地初步 Zoning 研究网页。目前支持 Toronto、Brantford 的官方 GIS 查询，并尝试自动从官方网页/PDF 生成法规文献索引。**使用网页的人不需要安装 Python、下载法规 PDF，也不需要付费 AI API。**

## 发布到 GitHub Pages

1. 登录 GitHub，创建一个 **Public** 仓库，例如 `lotwise`。
2. 将 ZIP **解压后其中所有文件与文件夹** 上传到仓库，保持路径不变，特别是 `.github/workflows/pages.yml`。不能只上传 ZIP 本身。
3. 到仓库 **Settings → Pages → Source**，选 **GitHub Actions**。
4. 到 **Actions**，选择 **Publish Lotwise and refresh official sources → Run workflow**（第一次 push 通常也会自动运行）。
5. 部署成功后，打开 `https://你的用户名.github.io/lotwise/`。

GitHub Actions 会在云端安装 PDF 解析程序并访问官方文件，之后每周自动检查更新。普通用户打开浏览器就可以使用。

## 当前能力

- 默认英文、适配桌面和手机。
- 通过官方地址点 + Zoning 图层查询 Toronto / Brantford，**必须手动确认匹配物业**。
- 查询相应 GIS 覆盖图层并展示原始来源。
- Brantford MCC 的基础建筑标准，以及部分 Table 5.3.a Parking 标准的**参考**计算。
- GitHub Actions 定期下载政府官方 PDF/网页并建立可搜索的**文字片段索引**，附文献链接和页面。
- 清楚标记需要核查的 exceptions、amendments、parking、OBC 等事项。

## 暂未实现

**当前并不能自动把所有城市、所有分区、所有用途的法规 PDF 转换成准确的 Height/Setbacks/Parking 结构化数据。** 自动下载、全文检索和自动正确理解法规是三个不同阶段。对于未知分区，Lotwise 不会编造数值，而会显示需要进一步核查。GIS 可能受到浏览器跨域 CORS 限制；如果查询失败，会提示错误。

客户 Brief/面积默认不发送到服务器，但**地址和坐标查询需要传递给市政府的 GIS 服务**。不要把保密的客户图纸上传到公开 GitHub 仓库。未来要用于公司正式商业业务，需要先确认 GitHub Pages 的适用条款和客户资料安全要求。

源代码 MIT 开源；政府文件版权仍归其发布机构。完整英文技术说明见 `README.md`。
