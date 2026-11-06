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
const vecLayer = L.tileLayer('https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', { maxZoom: 19 }).addTo(map);
const satLayer = L.tileLayer('https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', { maxZoom: 19 });
L.control.layers({ "现代矢量图": vecLayer, "卫星实景图": satLayer }, null, { position: 'topright' }).addTo(map);

// ==========================================
// 2. 全局变量
// ==========================================
const barChart = echarts.init(document.getElementById('bar-chart'));
const pieChart = echarts.init(document.getElementById('pie-chart'));

let allEvents = [];
let currentGeoJsonLayer = null;
let currentMarkers = [];
let heatLayer = null; 
let isHeatMode = false; 
let areaLayers = {}; // ✨ 新增：用来存放所有区划图层，方便联动

let chartUpdateTimeout = null;
function debouncedUpdateChart() {
    clearTimeout(chartUpdateTimeout);
    chartUpdateTimeout = setTimeout(() => {
        updateChartData(getFilteredEvents());
        filterMarkersByTime();
    }, 30); 
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
                    color: '#3388ff', weight: 1.5, opacity: 0.6, 
                    fillColor: '#3388ff', fillOpacity: 0.08, dashArray: '5, 5' 
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

// ==========================================
// 7. 地图渲染逻辑
// ==========================================
function eventsToGeoJSON(events) {
    return {
        type: 'FeatureCollection',
        features: events.map(e => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
            properties: { 
                time: `${e.year}-01-01`, title: e.title, year: e.year, category: e.category, 
                desc: e.desc, source: e.source, image: e.image, link: e.link 
            }
        }))
    };
}

function renderData(eventsArray) {
    if (currentGeoJsonLayer) { map.removeLayer(currentGeoJsonLayer); }
    if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
    currentMarkers = [];

    // 1. 画线
    eventsArray.forEach(e => {
        if (e.path && e.path.length > 0) {
            const antLine = L.polyline.antPath(e.path, {
                "color": getColor(e.category), "weight": 4, "opacity": 1, "delay": 800,
                "dashArray": [10, 20], "pulseColor": "#FFFFFF", "paused": false
            });
            antLine.myYear = e.year; 
            currentMarkers.push(antLine);
            antLine.addTo(map);
        }
    });

    // 2. 画点
    const geojsonData = eventsToGeoJSON(eventsArray);
    currentGeoJsonLayer = L.geoJSON(geojsonData, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, { radius: 7, fillColor: getColor(feature.properties.category), color: '#fff', weight: 2, opacity: 1, fillOpacity: 1 });
        },
        onEachFeature: function (feature, layer) {
            layer.myYear = feature.properties.year; 
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
    const currentYear = new Date(map.timeDimension.getCurrentTime()).getFullYear();
    
    if (isHeatMode) {
        if (currentGeoJsonLayer && map.hasLayer(currentGeoJsonLayer)) map.removeLayer(currentGeoJsonLayer);
        currentMarkers.forEach(m => { if (m instanceof L.Polyline) m.setStyle({ opacity: 0 }); });
        
        if (heatLayer && map.hasLayer(heatLayer)) {
            const currentEvents = getFilteredEvents().filter(e => e.year <= currentYear);
            heatLayer.setLatLngs(currentEvents.map(e => [e.lat, e.lng, 1]));
        } else if (heatLayer && !map.hasLayer(heatLayer)) {
            heatLayer.addTo(map);
        }
        return;
    }

    if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    if (currentGeoJsonLayer && !map.hasLayer(currentGeoJsonLayer)) currentGeoJsonLayer.addTo(map);

    currentMarkers.forEach(layer => {
        if (layer && layer.myYear) {
            const isVisible = layer.myYear <= currentYear;
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

fetch('events.json')
    .then(response => response.json())
        fetch('events.json')
            .then(response => response.json())
            .then(events => {
                // ✨ 核心：智能坐标吸附与数据清洗
                allEvents = events.map(ev => {
                    let finalLat = ev.lat;
                    let finalLng = ev.lng;
                    let matchedRegion = "";

                    // 检查标题和描述中是否包含区县关键词
                    const contentToCheck = (ev.title || "") + (ev.desc || "");
                    for (let key in regionCenters) {
                        if (contentToCheck.includes(key)) {
                            // 如果匹配到，就吸取该区中心点坐标
                            finalLat = regionCenters[key][0];
                            finalLng = regionCenters[key][1];
                            matchedRegion = key;
                            break; // 找到第一个匹配的就跳出
                        }
                    }

                    // 对于本来就写死坐标的交通/大型项目，如果不包含区县词，就保留原坐标
                    return {
                        ...ev,
                        lat: finalLat,
                        lng: finalLng,
                        region: matchedRegion // 把匹配到的区存下来，方便后面高亮
                    };
                });

                const allTimes = [...new Set(allEvents.map(e => `${e.year}-01-01T00:00:00Z`))].sort();
                map.timeDimension.setAvailableTimes(allTimes, true);
                applyFilters();

                // 加载动画与初始时间设置
                setTimeout(() => {
                    document.getElementById('loading-overlay').classList.add('hidden');
                    setTimeout(() => { map.timeDimension.setCurrentTime(new Date('2024-12-31T23:59:59Z').getTime()); }, 200);
                }, 500);
                
                // ... 下面的时间轴联动和按钮监听保持你原来的不变 ...

        // 增加一个防抖变量，防止手动拖动时间轴时镜头乱飞导致眩晕
        let flyTimeout = null;

        map.timeDimension.on('timeload', function(e) { 
            debouncedUpdateChart(); 

            // ✨ 电影级运镜逻辑
            const currentDate = new Date(map.timeDimension.getCurrentTime());
            const currentYear = currentDate.getFullYear();

            // 当时间轴停下（或自动播放跳转）500毫秒后，镜头开始飞行
            clearTimeout(flyTimeout);
            flyTimeout = setTimeout(() => {
                // 找出当前年份匹配的所有事件
                const eventsThisYear = allEvents.filter(ev => ev.year === currentYear && ev.lat && ev.lng);
                
                if (eventsThisYear.length > 0) {
                    // 选取当前年份的第一个事件作为飞行目标
                    const target = eventsThisYear[0];
                    
                    // map.flyTo(坐标, 缩放级别, 动画配置)
                    // 缩放级别 12 大概是能看到一个行政区划的视野
                    map.flyTo([target.lat, target.lng], 12, {
                        animate: true,
                        duration: 2.0 // 飞行时间 2 秒
                    });
                }
            }, 500); // 500毫秒防抖延迟
        });
        
        document.getElementById('search-input').addEventListener('input', applyFilters);
        document.querySelectorAll('.cat-filter').forEach(cb => cb.addEventListener('change', applyFilters));

        barChart.on('click', function (params) {
            map.timeDimension.setCurrentTime(new Date(`${parseInt(params.name)}-01-01T00:00:00`).getTime());
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