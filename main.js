// ==========================================
// 1. 初始化地图与图层控制
// ==========================================
// ✨ 核心：西安各区县/开发区中心点坐标库（用于智能吸附）
const regionCenters = {
    "高新": [34.2060, 108.8560],
    "雁塔": [34.2130, 108.9480],
    "碑林": [34.2300, 108.9340],
    "新城": [34.2660, 108.9600],
    "莲湖": [34.2660, 108.9330],
    "未央": [34.2920, 108.9460],
    "灞桥": [34.2730, 109.0640],
    "长安": [34.1500, 108.9400],
    "高陵": [34.5340, 109.0890],
    "鄠邑": [34.1000, 108.6000],
    "临潼": [34.3600, 109.2100],
    "阎良": [34.6620, 109.2260],
    "蓝田": [34.1500, 109.3200],
    "周至": [34.1600, 108.2200],
    "西咸": [34.3270, 108.7320],
    "浐灞": [34.3870, 109.0430],
    "经开": [34.3500, 108.9000],
    "曲江": [34.2180, 108.9600],
    "秦岭": [34.0500, 108.8500]
};
// ✨ 宏观经济数据
const macroData = {
    years: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023],
    gdp: [3241.49, 3864.21, 4369.37, 4884.13, 5474.77, 5801.20, 6282.65, 7469.85, 8349.86, 9321.59, 10020.39, 10688.28, 11486.51, 12010.76],
    population: [846.78, 851.34, 855.29, 858.81, 862.75, 870.56, 883.21, 905.68, 1000.37, 1020.35, 1295.29, 1287.30, 1299.59, 1307.82]
};
const map = L.map('map', {
    center: [34.3416, 108.9398], zoom: 11,
    timeDimension: true, timeDimensionControl: true,
    timeDimensionControlOptions: {
        position: 'bottomleft', autoPlay: false, minSpeed: 1, maxSpeed: 10,
        timeSliderDragUpdate: true, loop: true
    }
});
// 创建专属的区划面图层容器，层级设为 350（低于默认的点图层 400）
map.createPane('areasPane');
map.getPane('areasPane').style.zIndex = 350;
// 创建底图图层
        // 初始化时，矢量图在左边，卫星图在右边
        const vecLayer = L.tileLayer('https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', { maxZoom: 19, crossOrigin: true }).addTo(map);
        const satLayer = L.tileLayer('https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', { maxZoom: 19, crossOrigin: true }).addTo(map);
        
        // 默认隐藏卫星图
        satLayer.setOpacity(0);

        L.control.layers({ "现代矢量图": vecLayer, "卫星实景图": satLayer }, null, { position: 'topright' }).addTo(map);

        // ✨ 卷帘门实例
        let sideBySideControl = null;

// ==========================================
// 13. 极致手写：古今对比卷帘门
// ==========================================
let isSwipeMode = false;
let swipeSlider = null;
let swipeLine = null;
const mapContainer = map.getContainer();

// 设置初始状态：矢量图全亮，卫星图透明
vecLayer.setOpacity(1);
satLayer.setOpacity(0);

document.getElementById('swipe-btn').addEventListener('click', function() {
    const btn = this;
    isSwipeMode = !isSwipeMode;

    if (isSwipeMode) {
        // 开启对比模式
        btn.style.background = '#28a745';
        btn.style.color = '#fff';
        
        vecLayer.setOpacity(1);
        satLayer.setOpacity(1); // 让卫星图也完全显示
        
        // 给 map 容器加个 class，用来显示滑块
        mapContainer.classList.add('swipe-active');

        if (!swipeSlider) {
            // 创建中间的拖动条
            swipeSlider = document.createElement('div');
            swipeSlider.className = 'swipe-slider';
            swipeSlider.style.left = '50%'; // 初始在正中间
            
            // 创建分割线
            swipeLine = document.createElement('div');
            swipeLine.style.position = 'absolute';
            swipeLine.style.top = '0';
            swipeLine.style.bottom = '0';
            swipeLine.style.width = '2px';
            swipeLine.style.backgroundColor = '#fff';
            swipeLine.style.left = '50%';
            swipeLine.style.zIndex = '9998';
            swipeLine.style.pointerEvents = 'none'; // 避免干扰滑块

            mapContainer.appendChild(swipeLine);
            mapContainer.appendChild(swipeSlider);

            // 核心裁剪逻辑：左边显示 vecLayer，右边显示 satLayer
            // 注意：Leaflet 默认所有的瓦片都在 .leaflet-tile-pane 里
            // 我们把 vecLayer 的容器裁剪左半边，satLayer 裁剪右半边
            // 这里用一个聪明的 CSS 滤镜技巧：用 clip-path 裁剪整个图层
            // 但 Leaflet 图层不是独立 DOM 节点，所以我们裁剪整个 pane，然后反向遮挡
            // 其实最简单的做法是：用 clip-path 裁剪底图 pane
            // 因为底图是由无数个 img 组成的，只能改整个 pane 的 clip-path
            
            // 这里为了完美，我们不用 clip-path，因为会裁剪整个 map 的 pane，
            // 而是利用 translate 移动卫星图，然后用遮罩挡住。
            // 最稳的办法：给 Leaflet 的 pane 绑定 CSS 变量。
            
            // 为了让代码最简，我们利用 `clip-path: inset` 覆盖整个瓦片容器，
            // 但因为我们有两个 tileLayer，最简单的是修改它们内部的 DOM。
        }
        
        updateSwipePosition(50); // 初始化位置
        
    } else {
        // 关闭对比模式
        btn.style.background = '#f0f0f0';
        btn.style.color = '#333';
        mapContainer.classList.remove('swipe-active');
        satLayer.setOpacity(0); // 恢复只显示矢量
        
        // 清理 DOM
        if (swipeSlider) swipeSlider.remove();
        if (swipeLine) swipeLine.remove();
        // 重置裁剪
        resetSwipe();
    }
});

// 绑定拖动事件
document.addEventListener('mousemove', function(e) {
    if (!isSwipeMode) return;
    
    // 获取鼠标相对地图容器的 X 坐标
    const rect = mapContainer.getBoundingClientRect();
    let x = e.clientX - rect.left;
    
    // 限制范围
    if (x < 0) x = 0;
    if (x > rect.width) x = rect.width;
    
    // 计算百分比
    const percent = (x / rect.width) * 100;
    updateSwipePosition(percent);
});

function updateSwipePosition(percent) {
    if (swipeSlider) swipeSlider.style.left = percent + '%';
    if (swipeLine) swipeLine.style.left = percent + '%';
    
    // ✨ 核心魔法：用 CSS clip-path 裁剪顶层（卫星图 satLayer）
    // 找到卫星图的容器 pane
    const satPanes = document.querySelectorAll('.leaflet-layer');
    // 因为矢量图和卫星图都是 layer，它们会按添加顺序堆叠
    // 卫星图在最上面，我们裁剪卫星图，露出下面的矢量图
    if (satPanes.length >= 2) {
        // 假设第二个是卫星图
        const satTileContainer = satPanes[1];
        // 裁剪左边一半（保留右边）：inset(上 右 下 左)
        satTileContainer.style.clipPath = `inset(0 0 0 ${percent}%)`;
    }
}

function resetSwipe() {
    const satPanes = document.querySelectorAll('.leaflet-layer');
    if (satPanes.length >= 2) {
        satPanes[1].style.clipPath = 'none';
    }
}

// ==========================================
// 2. 全局变量
// ==========================================
const barChart = echarts.init(document.getElementById('bar-chart'));
const pieChart = echarts.init(document.getElementById('pie-chart'));
const lineChart = echarts.init(document.getElementById('line-chart'));

let allEvents = [];
let currentGeoJsonLayer = null;
let currentMarkers = [];
let heatLayer = null; 
let isHeatMode = false; 
let areaLayers = {}; // ✨ 新增：用来存放所有区划图层，方便联动
let metroLines = []; // ✨ 新增：存储地铁线路数据
let currentMetroLayerGroup = null; // ✨ 新增：存储当前显示的地铁图层组

let chartUpdateTimeout = null;
let flyTimeout = null;
function debouncedUpdateChart() {
    clearTimeout(chartUpdateTimeout);
    chartUpdateTimeout = setTimeout(() => {
        updateChartData(getFilteredEvents());
        const currentYear = new Date(map.timeDimension.getCurrentTime()).getFullYear();
        updateMacroChart(currentYear); 
        filterMarkersByTime();
    }, 30); 
}
// ✨ 新增：根据时间绘制地铁线路
function renderMetroLines(currentDateStr) {
    // 如果之前有图层，先移除
    if (currentMetroLayerGroup) {
        map.removeLayer(currentMetroLayerGroup);
    }
    currentMetroLayerGroup = L.layerGroup().addTo(map);

    metroLines.forEach(line => {
        const lineDate = `${line.year}-${String(line.month).padStart(2, '0')}-${String(line.day).padStart(2, '0')}`;
        
        // 如果当前时间 >= 线路开通日期，则绘制
        if (lineDate <= currentDateStr) {
            const polyline = L.polyline(line.path, {
                color: line.color,
                weight: 4,          // 线宽，高德风格
                opacity: 0.9,       // 透明度
                lineCap: 'round',   // 圆角端点
                lineJoin: 'round',  // 圆角连接
                pane: 'overlayPane' // 确保线路在区划上方
            }).bindTooltip(line.name, { sticky: true }); // 鼠标悬浮显示线路名

            currentMetroLayerGroup.addLayer(polyline);
            line.path.forEach(point => {
                const stationMarker = L.circleMarker(point, {
                    radius: 3, // 小圆点
                    fillColor: '#fff',
                    color: line.color,
                    weight: 2,
                    fillOpacity: 1
                });
                currentMetroLayerGroup.addLayer(stationMarker);
            });
        }
    });
}
// ==========================================
// 3. 加载西安市区划边界面 & 写入字典
// ==========================================
fetch('xian_county.geojson') // ⚠️ 确保你的文件名叫这个，且里面有 name 属性
    .then(res => res.json())
    .then(data => {
        L.geoJSON(data, {
            pane: 'areasPane', // ✨ 新增：让面永远在点的下面
            style: function() {
                return { 
                    color: '#3388ff', weight: 1.5, opacity: 0.5, 
                    fillColor: '#3388ff', fillOpacity: 0.02, 
                };
            },
            onEachFeature: function (feature, layer) {
                const props = feature.properties || {};
                const areaName = props.name || props.NAME || props.Name || props.fullname || props.FULLNAME || props.district || "未知区域";
                
                // ✨ 核心：把图层存入字典
                if (areaName !== "未知区域") {
                    areaLayers[areaName] = layer;
                }

                layer.on('mouseover', function() {
                    layer.setStyle({ weight: 3, color: '#ff7800', fillOpacity: 0.3 });
                });
                layer.on('mouseout', function() {
                    // 如果这个区没在闪烁高亮状态，才恢复默认蓝色
                    if (!layer.isHighlighted) {
                        layer.setStyle({ weight: 1.5, color: '#3388ff', fillOpacity: 0.08 });
                    }
                });

                layer.bindTooltip(areaName, { permanent: false, direction: 'center', className: 'area-tooltip' });
                layer.bindPopup(`<b style="font-size:16px;">📍 ${areaName}</b>`);
            }
        }).addTo(map);
    })
    .catch(err => console.log("区划面文件未找到或格式错误，跳过加载。", err));

// ==========================================
// 4. 颜色映射
// ==========================================
function getColor(category) {
    if (category === '交通') return '#007bff';
    if (category === '规划') return '#dc3545';
    if (category === '文化') return '#28a745';
    if (category === '经济') return '#6f42c1';
    if (category === '生态') return '#17a2b8';
    if (category === '区划') return '#fd7e14';
    if (category === '政策') return '#e83e8c';
    return '#6c757d';
}

// ==========================================
// 5. ✨ 新增：区划面高亮动画函数 (精准版)
// ==========================================
function highlightArea(regionName, duration = 3000) {
    if (!regionName) return;

    // 遍历我们存好的区划图层字典
    for (let areaName in areaLayers) {
        // 如果传入的区名和图层名称互相包含（比如"高新"和"高新区"）
        if (areaName.includes(regionName) || regionName.includes(areaName)) {
            const targetLayer = areaLayers[areaName];
            
            // 1. 变红变亮
            targetLayer.isHighlighted = true;
            targetLayer.setStyle({
                color: '#ff0000', weight: 4, fillColor: '#ff0000', fillOpacity: 0.4
            });
            targetLayer.bringToFront(); 

            // 2. 延时恢复原样
            if (targetLayer._highlightTimer) clearTimeout(targetLayer._highlightTimer);
            targetLayer._highlightTimer = setTimeout(() => {
                targetLayer.isHighlighted = false;
                targetLayer.setStyle({
                    color: '#3388ff', weight: 1.5, fillColor: '#3388ff', fillOpacity: 0.08
                });
            }, duration);
        }
    }
}

// ==========================================
// 6. 图表更新逻辑
// ==========================================
function updateChartData(eventsArray) {
    const currentYear = new Date(map.timeDimension.getCurrentTime()).getFullYear();
    const yearCounts = {};
    eventsArray.forEach(e => { yearCounts[e.year] = (yearCounts[e.year] || 0) + 1; });
    const years = Object.keys(yearCounts).sort((a, b) => a - b);
    const counts = years.map(y => yearCounts[y]);

    barChart.setOption({
        title: { text: '事件年份分布', left: 'center', textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        grid: { left: '5%', right: '5%', bottom: '10%', top: '20%', containLabel: true },
        xAxis: { type: 'category', data: years, axisLabel: { interval: 0, fontSize: 11 } },
        yAxis: { type: 'value', minInterval: 1 },
        series: [{
            name: '事件数', type: 'bar', data: counts, barMaxWidth: 30,
            itemStyle: { color: function(params) { return parseInt(years[params.dataIndex]) <= currentYear ? '#5470c6' : '#e0e0e0'; } }
        }]
    }, true);

    const catCounts = {};
    eventsArray.forEach(e => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
    const pieData = Object.keys(catCounts).map(cat => ({
        name: cat, value: catCounts[cat], itemStyle: { color: getColor(cat) }
    }));

    pieChart.setOption({
        title: { text: '事件类型占比', left: 'center', textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'item', formatter: '{b}: {c}个 ({d}%)' },
        series: [{
            type: 'pie', radius: ['35%', '65%'], center: ['50%', '55%'],
            data: pieData, label: { show: true, fontSize: 11 }
        }]
    }, true);
}
// ✨ 更新宏观折线图（随年份动态生长）
function updateMacroChart(currentYear) {
    // 找出当前年份对应的数据索引（确保不超过数据最大年份）
    let maxIdx = macroData.years.findIndex(y => y === currentYear);
    if (maxIdx === -1) {
        if (currentYear > 2023) maxIdx = macroData.years.length - 1;
        else if (currentYear < 2010) maxIdx = 0;
    }

    // 只截取到当前年份的数据
    const displayYears = macroData.years.slice(0, maxIdx + 1);
    const displayGdp = macroData.gdp.slice(0, maxIdx + 1);
    const displayPop = macroData.population.slice(0, maxIdx + 1);

    lineChart.setOption({
        title: { text: '西安宏观经济指标', left: 'center', textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 25, data: ['GDP(亿元)', '常住人口(万人)'], textStyle: { fontSize: 10 } },
        grid: { left: '10%', right: '10%', bottom: '15%', top: '30%', containLabel: true },
        xAxis: { type: 'category', data: displayYears, axisLabel: { fontSize: 10 } },
        yAxis: [
            { type: 'value', name: 'GDP', axisLabel: { fontSize: 10 }, splitLine: { show: false } },
            { type: 'value', name: '人口', axisLabel: { fontSize: 10 }, splitLine: { show: false } }
        ],
        series: [
            {
                name: 'GDP(亿元)', type: 'line', yAxisIndex: 0, data: displayGdp,
                smooth: true, itemStyle: { color: '#e83e8c' },
                areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{offset: 0, color: 'rgba(232,62,140,0.5)'}, {offset: 1, color: 'rgba(232,62,140,0)'}]) }
            },
            {
                name: '常住人口(万人)', type: 'line', yAxisIndex: 1, data: displayPop,
                smooth: true, itemStyle: { color: '#007bff' }
            }
        ]
    }, true);
}

// ==========================================
// 7. 地图渲染逻辑
// ==========================================
function eventsToGeoJSON(events) {
    return {
        type: 'FeatureCollection',
        features: events.map(e => {
            // 兜底处理：如果没有写月和日，默认1月1日
            const m = e.month ? String(e.month).padStart(2, '0') : '01';
            const d = e.day ? String(e.day).padStart(2, '0') : '01';
            const fullDate = `${e.year}-${m}-${d}`;

            return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
                properties: { 
                    time: fullDate, // 精确到日
                    title: e.title, year: e.year, category: e.category, 
                    desc: e.desc, source: e.source, image: e.image, link: e.link,
                    region: e.region
                }
            };
        })
    };
}

function renderData(eventsArray) {
    if (currentGeoJsonLayer) { map.removeLayer(currentGeoJsonLayer); }
    if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
    currentMarkers = [];

    // 1. 画线
    eventsArray.forEach(e => {
    });

    // 2. 画点
   const geojsonData = eventsToGeoJSON(eventsArray);
    geojsonData.features.forEach(f => {
        // 在原本的经纬度上加上一个极小极小的随机数（大概在10米范围内）
        f.geometry.coordinates[0] += (Math.random() - 0.5) * 0.0001;
        f.geometry.coordinates[1] += (Math.random() - 0.5) * 0.0001;
    });
    currentGeoJsonLayer = L.geoJSON(geojsonData, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, { radius: 7, fillColor: getColor(feature.properties.category), color: '#fff', weight: 2, opacity: 1, fillOpacity: 1 });
        },
        onEachFeature: function (feature, layer) {
    layer.myDate = feature.properties.time;
            currentMarkers.push(layer);
            const p = feature.properties;
            layer.bindTooltip(`${p.year} · ${p.title}`, { direction: 'top', offset: [0, -10] });
            
            layer.on('click', function() {
                // 弹窗逻辑
                const panel = document.getElementById('side-panel');
                document.getElementById('panel-title').textContent = `${p.year} · ${p.title}`;
// 替换原本的 textContent 设置
const descEl = document.getElementById('panel-desc');
// 将描述中的“地铁”、“规划”、“生态”等关键词加粗变色
let formattedDesc = p.desc;
if (p.desc) {
    formattedDesc = formattedDesc.replace(/(地铁|规划|生态|高新区|西咸新区|全运会|一带一路)/g, '<span style="color: #007bff; font-weight: bold;">$1</span>');
}
// 如果有关联的年份或项目名称，也可以加粗
descEl.innerHTML = formattedDesc;

// 来源标签美化
const sourceEl = document.getElementById('panel-source');
sourceEl.innerHTML = `<span style="background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:4px; font-size:12px;">官方认证：${p.source}</span>`;
                document.getElementById('panel-year').textContent = p.year + '年';
                document.getElementById('panel-category').textContent = p.category;
                document.getElementById('panel-source').textContent = p.source;
                
                const imgEl = document.getElementById('panel-img');
                if (p.image) { imgEl.src = p.image; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; }
                
                const linkEl = document.getElementById('panel-link');
                if (p.link) { linkEl.href = p.link; linkEl.style.display = 'block'; } else { linkEl.style.display = 'none'; }
                
                panel.classList.add('active');

                // ✨ 核心触发：联动高亮
                highlightArea(p.region || p.title); 
            });
        }
    });
    currentGeoJsonLayer.addTo(map);

    // 3. 准备热力图数据
    const heatPoints = eventsArray.map(e => [e.lat, e.lng, 1]);
    heatLayer = L.heatLayer(heatPoints, {
        radius: 35, blur: 20, maxZoom: 13, willReadFrequently: true,
        gradient: {0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1: 'red'}
    });

    filterMarkersByTime();
}

// ==========================================
// 8. 时间过滤与显示逻辑
// ==========================================
function filterMarkersByTime() {
    if (!map || !map.timeDimension) return;
    
    // 获取当前时间轴的具体日期（YYYY-MM-DD格式）
    const currentTimeDate = new Date(map.timeDimension.getCurrentTime());
    const currentYear = currentTimeDate.getFullYear();
    const currentMonth = String(currentTimeDate.getMonth() + 1).padStart(2, '0');
    const currentDay = String(currentTimeDate.getDate()).padStart(2, '0');
    const currentDateStr = `${currentYear}-${currentMonth}-${currentDay}`;
    renderMetroLines(currentDateStr);
    if (isHeatMode) {
        if (currentGeoJsonLayer && map.hasLayer(currentGeoJsonLayer)) map.removeLayer(currentGeoJsonLayer);
        currentMarkers.forEach(m => { if (m instanceof L.Polyline) m.setStyle({ opacity: 0 }); });
        
        if (heatLayer && map.hasLayer(heatLayer)) {
            // 热力图也同步按精确时间过滤
            const currentEvents = getFilteredEvents().filter(e => {
                const m = e.month ? String(e.month).padStart(2, '0') : '01';
                const d = e.day ? String(e.day).padStart(2, '0') : '01';
                return `${e.year}-${m}-${d}` <= currentDateStr;
            });
            heatLayer.setLatLngs(currentEvents.map(e => [e.lat, e.lng, 1]));
        } else if (heatLayer && !map.hasLayer(heatLayer)) {
            heatLayer.addTo(map);
        }
        return;
    }

    if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    if (currentGeoJsonLayer && !map.hasLayer(currentGeoJsonLayer)) currentGeoJsonLayer.addTo(map);

    currentMarkers.forEach(layer => {
        // 改用字符串比对，字典序即时间序
        if (layer && layer.myDate) {
            const isVisible = layer.myDate <= currentDateStr;
            if (layer.setStyle) {
                if (layer instanceof L.Polyline) layer.setStyle({ opacity: isVisible ? 1 : 0 });
                else layer.setStyle({ opacity: isVisible ? 1 : 0, fillOpacity: isVisible ? 1 : 0 });
            }
            if (typeof layer.getElement === 'function') {
                const el = layer.getElement();
                if (el) el.style.pointerEvents = isVisible ? 'auto' : 'none';
            }
        }
    });
}

// ==========================================
// 9. 数据过滤逻辑
// ==========================================
function getFilteredEvents() {
    const keyword = document.getElementById('search-input').value.trim();
    const selectedCats = Array.from(document.querySelectorAll('.cat-filter:checked')).map(cb => cb.value);
    return allEvents.filter(item => {
        const matchKeyword = keyword === '' || item.title.includes(keyword) || item.desc.includes(keyword) || item.category.includes(keyword);
        return matchKeyword && selectedCats.includes(item.category);
    });
}

function applyFilters() {
    const filtered = getFilteredEvents();
    document.getElementById('stats-text').textContent = `当前展示 ${filtered.length} / 共 ${allEvents.length} 个事件`;
    updateChartData(filtered); 
    renderData(filtered);
    const currentYear = new Date(map.timeDimension.getCurrentTime()).getFullYear();
    updateMacroChart(currentYear);
}

// ==========================================
// 10. 事件监听与初始化
// ==========================================
document.getElementById('close-panel').addEventListener('click', function() {
    document.getElementById('side-panel').classList.remove('active');
});
map.on('click', function(e) {
    if (e.originalEvent.target.id === 'map' || e.originalEvent.target.classList.contains('leaflet-container')) {
        document.getElementById('side-panel').classList.remove('active');
    }
});

document.getElementById('heat-mode-toggle').addEventListener('change', function(e) {
    isHeatMode = e.target.checked;
    filterMarkersByTime();
});
// 先加载地铁线路数据
fetch('metro_lines.json')
    .then(res => res.json())
    .then(data => {
        metroLines = data;
        console.log('地铁线路数据已加载:', metroLines.length, '条线路');
    })
    .catch(err => console.error('加载 metro_lines.json 失败:', err));
        fetch('events.json')
            .then(response => response.json())
            .then(events => {
                // 先做智能坐标吸附
                allEvents = events.map(ev => {
                    let finalLat = ev.lat;
                    let finalLng = ev.lng;
                    let matchedRegion = "";
                    const contentToCheck = (ev.title || "") + (ev.desc || "");
                    for (let key in regionCenters) {
                        if (contentToCheck.includes(key)) {
                            finalLat = regionCenters[key][0];
                            finalLng = regionCenters[key][1];
                            matchedRegion = key;
                            break;
                        }
                    }
                    return { ...ev, lat: finalLat, lng: finalLng, region: matchedRegion };
                });

                // ✨ 时间轴范围从精确到日
                const allTimes = allEvents.map(e => {
                    const m = e.month ? String(e.month).padStart(2, '0') : '01';
                    const d = e.day ? String(e.day).padStart(2, '0') : '01';
                    return `${e.year}-${m}-${d}T00:00:00Z`;
                }).sort();
                
                // 去重并设置给时间轴
                map.timeDimension.setAvailableTimes([...new Set(allTimes)], true);
                applyFilters();

                setTimeout(() => {
                    document.getElementById('loading-overlay').classList.add('hidden');
                    // 默认跳到最新的时间
                    const latestTime = new Date(allTimes[allTimes.length - 1]).getTime();
                    setTimeout(() => { map.timeDimension.setCurrentTime(latestTime); }, 200);
                }, 500);

                map.timeDimension.on('timeload', function(e) { 
                    debouncedUpdateChart(); 

                    const currentDate = new Date(map.timeDimension.getCurrentTime());
                    const currY = currentDate.getFullYear();
                    const currM = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const currD = String(currentDate.getDate()).padStart(2, '0');
                    const currentDateStr = `${currY}-${currM}-${currD}`;

                    clearTimeout(flyTimeout);
                    flyTimeout = setTimeout(() => {
                        // ✨ 运镜匹配也精确到日
                        const eventsThisDay = allEvents.filter(ev => {
                            const m = ev.month ? String(ev.month).padStart(2, '0') : '01';
                            const d = ev.day ? String(ev.day).padStart(2, '0') : '01';
                            return `${ev.year}-${m}-${d}` === currentDateStr;
                        });
                        
                        // 如果当天没事件，退回到“当年”找
                        let target = eventsThisDay.length > 0 ? eventsThisDay[0] : null;
                        if (!target) {
                            const eventsThisYear = allEvents.filter(ev => ev.year === currY);
                            if (eventsThisYear.length > 0) target = eventsThisYear[0];
                        }
                        
                        if (target) {
                            map.flyTo([target.lat, target.lng], 12, { animate: true, duration: 2.0 });
                        }
                    }, 600); // 稍微拉长一点点延迟，给时间轴停留的时间
                });
                
                // ... 后面的搜索框、图表点击等监听保持不变


        
        document.getElementById('search-input').addEventListener('input', applyFilters);
        document.querySelectorAll('.cat-filter').forEach(cb => cb.addEventListener('change', applyFilters));

        barChart.on('click', function (params) {
            map.timeDimension.setCurrentTime(new Date(`${parseInt(params.name)}-06-01T00:00:00`).getTime());
        });
        pieChart.on('click', function (params) {
            document.querySelectorAll('.cat-filter').forEach(cb => { cb.checked = (cb.value === params.name); });
            applyFilters();
        });
    })
    .catch(error => { 
        console.error('加载失败:', error); 
        document.getElementById('loading-overlay').innerHTML = '<div style="color:red; font-size:20px;">数据加载失败，请检查 events.json 格式</div>';
    });

window.addEventListener('resize', function() { barChart.resize(); pieChart.resize(); });
// ==========================================
// ==========================================
// ==========================================
// 11. 大屏纯净看板模式
// ==========================================
const fullscreenBtn = document.getElementById('fullscreen-btn');
const exitDashboardBtn = document.getElementById('exit-dashboard-btn');

if (fullscreenBtn && exitDashboardBtn) {
    fullscreenBtn.addEventListener('click', () => {
        document.body.classList.add('dashboard-mode');
        // 地图全屏后必须刷新尺寸，否则会出现灰边
        setTimeout(() => { map.invalidateSize(); }, 300);
    });
    
    exitDashboardBtn.addEventListener('click', () => {
        document.body.classList.remove('dashboard-mode');
        setTimeout(() => { 
            map.invalidateSize(); 
            barChart.resize(); 
            pieChart.resize();
            lineChart.resize();
        }, 300);
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('dashboard-mode')) {
            document.body.classList.remove('dashboard-mode');
            setTimeout(() => { map.invalidateSize(); barChart.resize(); pieChart.resize(); }, 300);
        }
    });
} else {
    console.warn("找不到大屏模式按钮，请检查 index.html。");
}

// ==========================================
// 12. 政策库模态框
// ==========================================
const policyBtn = document.getElementById('policy-btn');
const policyModal = document.getElementById('policy-modal');
const closePolicyBtn = document.getElementById('close-policy');
const policyListContainer = document.getElementById('policy-list-container');

if (policyBtn && policyModal && closePolicyBtn && policyListContainer) {
    policyBtn.addEventListener('click', () => {
        renderPolicyList();
        policyModal.classList.add('active');
    });
    
    closePolicyBtn.addEventListener('click', () => {
        policyModal.classList.remove('active');
    });
    
    policyModal.addEventListener('click', (e) => {
        if (e.target === policyModal) policyModal.classList.remove('active');
    });
} else {
    console.warn("找不到政策库相关元素，请检查 index.html。");
}

// --- 渲染政策列表函数 ---
function renderPolicyList() {
    if (!policyListContainer) return;
    
    policyListContainer.innerHTML = ''; 
    const policies = allEvents.filter(e => e.category === '政策').sort((a, b) => b.year - a.year);

    if (policies.length === 0) {
        policyListContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">暂无政策数据，请运行 Python 爬虫抓取并合并到 events.json。</div>';
        return;
    }

    policies.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'policy-item';
        div.innerHTML = `
            <div class="policy-item-title">${p.title}</div>
            <div class="policy-item-meta">
                📅 ${p.year}年 | 🏷️ ${p.category} | 来源：${p.source}
            </div>
        `;
        
        div.addEventListener('click', () => {
            policyModal.classList.remove('active'); 
            
            // 1. 时间轴跳转
            const targetDate = new Date(`${p.year}-06-01T00:00:00`);
            map.timeDimension.setCurrentTime(targetDate.getTime());
            
            // 2. 地图飞向点位
            map.flyTo([p.lat, p.lng], 14, { duration: 1.5 });
            
            // 3. 打开侧边栏展示详情
            const panel = document.getElementById('side-panel');
            document.getElementById('panel-title').textContent = `${p.year} · ${p.title}`;
            document.getElementById('panel-desc').textContent = p.desc;
            document.getElementById('panel-year').textContent = p.year + '年';
            document.getElementById('panel-category').textContent = p.category;
            document.getElementById('panel-source').textContent = p.source;
            
            const imgEl = document.getElementById('panel-img');
            if (p.image) { imgEl.src = p.image; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; }
            
            const linkEl = document.getElementById('panel-link');
            if (p.link) { linkEl.href = p.link; linkEl.style.display = 'block'; } else { linkEl.style.display = 'none'; }
            
            panel.classList.add('active');
            
            // 4. 触发区划高亮
            highlightArea(p.region || p.title);
        });
        
        policyListContainer.appendChild(div);
    });
}
// ==========================================
// 13. 一键生成专属海报
// ==========================================
document.getElementById('poster-btn').addEventListener('click', function() {
    // 1. 获取当前侧边栏展示的数据
    const title = document.getElementById('panel-title').textContent;
    // 如果有类似 "2011 · 标题" 的格式，我们拆分一下
    const titleParts = title.split(' · ');
    const pureTitle = titleParts.length > 1 ? titleParts[1] : title;
    
    const year = document.getElementById('panel-year').textContent;
    const cat = document.getElementById('panel-category').textContent;
    const desc = document.getElementById('panel-desc').textContent;

    // 2. 填充到隐藏的海报模板中
    document.getElementById('poster-title').textContent = pureTitle;
    document.getElementById('poster-year').textContent = year;
    document.getElementById('poster-cat').textContent = cat;
    
    // 描述太长截断一下，防止溢出
    document.getElementById('poster-desc').textContent = desc.length > 120 ? desc.substring(0, 120) + '...' : desc;

    // 3. 改变按钮状态
    const btn = document.getElementById('poster-btn');
    const originalText = btn.textContent;
    btn.textContent = "⏳ 正在生成中...";
    btn.disabled = true;

    // 4. 截取当前地图画面
    // 注意：需要等地图拖拽动画结束才能截图，我们先让地图飞回当前中心点
    const currentCenter = map.getCenter();
    map.flyTo(currentCenter, map.getZoom(), { animate: false });

    setTimeout(() => {
        html2canvas(document.getElementById('map'), {
            useCORS: true, // 允许跨域图片
            allowTaint: false,
            backgroundColor: '#111'
        }).then(mapCanvas => {
            // 将截取的地图转换为图片
            const mapImg = mapCanvas.toDataURL("image/jpeg");
            
            // 塞入海报模板中
            const mapContainer = document.getElementById('poster-map-container');
            mapContainer.innerHTML = `<img src="${mapImg}" style="width:100%; height:100%; object-fit:cover;">`;

            // 5. 生成最终海报
            setTimeout(() => {
                html2canvas(document.getElementById('poster-template'), {
                    useCORS: true,
                    scale: 2, // 提高清晰度
                    backgroundColor: '#ffffff'
                }).then(posterCanvas => {
                    // 将海报转换为可下载的图片
                    const finalImg = posterCanvas.toDataURL("image/jpeg", 0.9);
                    
                    // 创建一个 a 标签自动下载
                    const a = document.createElement('a');
                    a.href = finalImg;
                    a.download = `西安城市档案_${pureTitle}.jpg`;
                    a.click();

                    // 恢复按钮
                    btn.textContent = originalText;
                    btn.disabled = false;
                });
            }, 500); // 给地图图片加载留一点时间
        });
    }, 100);
});
window.addEventListener('resize', function() { 
    barChart.resize(); 
    pieChart.resize(); 
    lineChart.resize(); 
});
// ==========================================
// 14. AI 时代切片（免费 API 版）
// ==========================================
const SILICON_API_KEY = "sk-emeyldsjqjrtcirhoysurblcdjfthoettwkomtotufhbvhsz"; // ⚠️ 替换成你的 Key
const SILICON_URL = "https://api.siliconflow.cn/v1/chat/completions";

document.getElementById('ai-slice-btn').addEventListener('click', async function() {
    const currentYear = new Date(map.timeDimension.getCurrentTime()).getFullYear();
    const yearEvents = allEvents.filter(e => e.year === currentYear);

    if (yearEvents.length === 0) {
        alert(`${currentYear} 年暂时没有收录事件，拖动时间轴试试其他年份吧。`);
        return;
    }

    // 提取当年事件标题，拼接成 Prompt
    const titles = yearEvents.map(e => `- ${e.title}`).join('\n');
    const prompt = `你是一位专业的城市历史学家。请根据以下 ${currentYear} 年西安发生的事件，写一段 100 字左右的“年度时代切片”总结。要求语言生动、有历史纵深感，突出这一年在西安城市发展进程中的特点。\n\n事件列表：\n${titles}`;

    const btn = this;
    const originalText = btn.textContent;
    btn.textContent = "⏳ AI 正在思考...";
    btn.disabled = true;

    try {
        const response = await fetch(SILICON_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SILICON_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "Qwen/Qwen2.5-7B-Instruct", // 免费模型
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
        const data = await response.json();
        const aiText = data.choices[0].message.content;

        // 在底部面板上方弹出一个漂亮的提示框
        showAISlice(`${currentYear} 年 · 时代切片`, aiText);

    } catch (error) {
        console.error(error);
        alert("AI 生成失败，请检查 API Key 和网络。");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// 辅助函数：显示 AI 结果
function showAISlice(title, text) {
    let sliceDiv = document.getElementById('ai-slice-result');
    if (!sliceDiv) {
        sliceDiv = document.createElement('div');
        sliceDiv.id = 'ai-slice-result';
        sliceDiv.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); max-width:600px; background:rgba(0,0,0,0.85); color:#fff; padding:20px 30px; border-radius:12px; z-index:10000; box-shadow:0 10px 30px rgba(0,0,0,0.5); line-height:1.7; font-size:15px; backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1);';
        document.body.appendChild(sliceDiv);
    }
    sliceDiv.innerHTML = `<b style="color:#00BFFF; font-size:16px;">✨ ${title}</b><br><br>${text}`;
    sliceDiv.style.display = 'block';

    // 10秒后自动淡出
    clearTimeout(sliceDiv._timer);
    sliceDiv._timer = setTimeout(() => { sliceDiv.style.display = 'none'; }, 10000);
}