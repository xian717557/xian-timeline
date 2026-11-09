# 🗺️ 西安城市发展档案 (Xi'an City Development Archive)

一个基于地图与时间轴的交互式城市数据可视化看板。旨在通过多维数据，客观、生动地展现西安（1953-2024）在城市规划、交通、经济与文化等方面的历史变迁。

> ⚠️ **注**：本地开发环境（`localhost:8000`）已完美运行，包含所有高级交互功能。线上演示因 CDN 网络限制加载较慢，建议克隆至本地体验完整版。

## ✨ 核心功能 (Features)

- ⏳ **时间轴动画与电影运镜**：基于 `Leaflet.TimeDimension`，一键“自动演示”，地图随年份自动平移飞行，并配合电影级黑边与字幕。
- 🚇 **动态地铁线网**：独立存储的 `metro_lines.json` 包含 1-16 号线、高新云巴、西户线。线路随开通年份逐条生长，带精细站点渲染。
- 📊 **多维数据双向联动**：
  - 柱状图：展示历年事件频次，点击可跳转年份。
  - 饼图：展示事件类型（交通/经济/政策等）占比，点击可过滤地图。
  - 折线图：同步生长呈现西安历年 GDP 与人口宏观数据。
- 🔥 **空间分析模式**：支持一键切换“热力图”与“古今卫星对比卷帘门”。
- 🤖 **AI 时代切片**：接入国内大模型（SiliconFlow），根据当前年份发生的事件，实时生成具有历史纵深感的总结文案。
- 📸 **海报生成**：将地图画面与事件详情，通过 `html2canvas` 一键导出为精美的专属档案海报。
- 📍 **智能区域高亮**：点击事件时，根据关键词自动匹配并高亮对应的行政边界（GeoJSON 数据）。

## 🛠️ 技术栈 (Tech Stack)

- **地图引擎**: Leaflet.js / Leaflet.TimeDimension / Leaflet.AntPath / Leaflet.heat
- **数据可视化**: Apache ECharts
- **数据源**: OpenStreetMap / 西安市政府官网 / 公开统计数据
- **自动化工具**: Python (Requests/BeautifulSoup) + AI 大模型批量生成与抓取
- **前端技术**: 原生 JavaScript / HTML5 / CSS3

## 🚀 本地运行 (How to Run)

1. 克隆仓库：`git clone https://github.com/xian717557/xian-timeline.git`
2. 启动本地服务器：`python -m http.server 8000`
3. 访问：`http://localhost:8000`

## 📈 项目架构演进

- 初始版本：单体流式代码（`main.js` 1000+ 行）。
- 重构尝试：探索了基于 ES6 Module 的模块化拆分（后因网络 CDN 兼容性问题回退至更稳定的单文件模式，确保极致可用性）。