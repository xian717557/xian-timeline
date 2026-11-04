# 🗺️ 西安城市发展时空图鉴 (Xi'an City Development Timeline)

这是一个基于 **Leaflet** 与 **ECharts** 构建的城市数据可视化看板，旨在通过交互式地图与时间轴，记录并展现西安市（1991-2024）在城市规划、交通基建、经济产业与生态文化等方面的历史变迁。

🌐 **在线演示:** [点击访问 (https://xian717557.github.io/xian-timeline/)](https://xian717557.github.io/xian-timeline/)

## ✨ 核心功能

- ⏳ **时间轴回放**：基于 `Leaflet.TimeDimension` 实现，可自由拖动或自动播放，见证城市版图逐年扩张。
- 🚇 **动态线网生长**：引入 `AntPath` 插件，地铁线路呈现“光缆流动”特效，并随时间推移逐条点亮。
- 📊 **双向数据联动**：
  - 点击柱状图某一年份，地图自动穿越到该年。
  - 点击饼图某一分类，地图自动过滤只显示该类别事件。
- 🔥 **热力图模式**：直观展示历史事件在城市空间上的聚集度（如高新区、主城区的密度）。
- 📖 **沉浸式档案面板**：点击地图坐标点，右侧滑出详情面板，展示高清历史图片与政策背景。
- 🗺️ **多底图切换**：支持高德矢量图与卫星实景图无缝切换。
- 📱 **响应式设计**：完美适配 PC 大屏与手机端（手机端侧边栏自动变为底部抽屉）。

## 🛠️ 技术栈

- **前端基础**: HTML5 / CSS3 / Vanilla JavaScript
- **地图引擎**: [Leaflet.js](https://leafletjs.com/)
- **图表引擎**: [Apache ECharts](https://echarts.apache.org/)
- **插件生态**: Leaflet.TimeDimension / Leaflet.AntPath / Leaflet.heat
- **数据源**: 西安市统计局、西安地铁官网、公开政策文件（持续手动整理更新中）

## 🚀 本地运行

由于项目使用 `fetch` 加载本地 JSON 数据，需通过本地服务器运行：

1. 克隆仓库：
   ```bash
   git clone https://github.com/你的用户名/xian-timeline.git