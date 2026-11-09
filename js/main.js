// ✨ 新增：从全局 window 对象获取 Leaflet
const L = window.L;

import { regionCenters } from './config.js';
import { map, initSwipe } from './mapCore.js';
import { barChart, pieChart, lineChart, updateChartData, updateMacroChart } from './chartCore.js';
import * as core from './renderCore.js';
import * as ui from './uiCore.js';

// 1. 初始化静态图层和交互
initSwipe();
ui.initUI();

// 2. 加载数据并启动
fetch('metro_lines.json')
    .then(res => res.json())
    .then(data => {
        core.setMetroLines(data);
        
        // 等地铁加载完再加载事件
        fetch('events.json')
            .then(response => response.json())
            .then(events => {
                const processedEvents = events.map(ev => {
                    let finalLat = ev.lat, finalLng = ev.lng, matchedRegion = "";
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
                
                core.setAllEvents(processedEvents);
                core.initAreaLayers();

                const allTimes = processedEvents.map(e => {
                    const m = e.month ? String(e.month).padStart(2, '0') : '01';
                    const d = e.day ? String(e.day).padStart(2, '0') : '01';
                    return `${e.year}-${m}-${d}T00:00:00`;
                }).sort();
                
                 // ✨ 核心保护：如果时间轴插件加载失败，给出提示，而不是白屏
                if (!map.timeDimension) {
                    console.error("TimeDimension 插件未成功加载！请检查 index.html 的 CDN 链接。");
                    document.getElementById('loading-overlay').innerHTML = '<div style="color:red; font-size:20px;">时间轴插件加载失败，请刷新重试</div>';
                    return; // 终止后续执行
                }

                map.timeDimension.setAvailableTimes([...new Set(allTimes)], true);
                
                // 初次渲染
                renderAll();

                setTimeout(() => {
                    document.getElementById('loading-overlay').classList.add('hidden');
                    const latestTime = new Date(allTimes[allTimes.length - 1]).getTime();
                    setTimeout(() => { map.timeDimension.setCurrentTime(latestTime); }, 200);
                }, 500);

                // 绑定图表点击
                barChart.on('click', params => map.timeDimension.setCurrentTime(new Date(`${parseInt(params.name)}-06-01T00:00:00`).getTime()));
                pieChart.on('click', params => {
                    document.querySelectorAll('.cat-filter').forEach(cb => { cb.checked = (cb.value === params.name); });
                    renderAll();
                });

                // 搜索与勾选
                document.getElementById('search-input').addEventListener('input', renderAll);
                document.querySelectorAll('.cat-filter').forEach(cb => cb.addEventListener('change', renderAll));

                // ✨ 时间轴绑定的终极运镜与图表刷新
                let flyTimeout = null;
                map.timeDimension.on('timeload', () => {
                    clearTimeout(chartUpdateTimeout);
                    chartUpdateTimeout = setTimeout(() => {
                        const currY = new Date(map.timeDimension.getCurrentTime()).getFullYear();
                        updateChartData(core.getFilteredEvents(), currY);
                        updateMacroChart(currY);
                        core.filterMarkersByTime();
                    }, 30);

                    // 电影模式字幕
                    if (document.body.classList.contains('cinema-mode')) {
                        const currY = new Date(map.timeDimension.getCurrentTime()).getFullYear();
                        const eventsThisYear = core.allEvents.filter(ev => parseInt(ev.year) === currY);
                        if (eventsThisYear.length > 0) {
                            document.getElementById('cinema-year').textContent = `${currY} 年`;
                            document.getElementById('cinema-event').textContent = eventsThisYear[0].title;
                            const overlay = document.getElementById('cinema-text-overlay');
                            overlay.classList.remove('cinema-subtitle');
                            void overlay.offsetWidth; 
                            overlay.classList.add('cinema-subtitle');
                        }
                    }

                    // 运镜防抖
                    clearTimeout(flyTimeout);
                    flyTimeout = setTimeout(() => {
                        const currentDate = new Date(map.timeDimension.getCurrentTime());
                        const currY = currentDate.getFullYear();
                        const currM = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const currD = String(currentDate.getDate()).padStart(2, '0');
                        const currentDateStr = `${currY}-${currM}-${currD}`;

                        const eventsThisDay = core.allEvents.filter(ev => {
                            const m = ev.month ? String(ev.month).padStart(2, '0') : '01';
                            const d = ev.day ? String(ev.day).padStart(2, '0') : '01';
                            return `${ev.year}-${m}-${d}` === currentDateStr;
                        });
                        
                        let target = eventsThisDay.length > 0 ? eventsThisDay[0] : null;
                        if (!target) {
                            const eventsThisYear = core.allEvents.filter(ev => ev.year === currY);
                            if (eventsThisYear.length > 0) target = eventsThisYear[0];
                        }
                        if (target) map.flyTo([target.lat, target.lng], 12, { animate: true, duration: 2.0 });
                    }, 600);
                });
            })
            .catch(error => { 
                console.error('加载 events.json 失败:', error); 
                document.getElementById('loading-overlay').innerHTML = '<div style="color:red; font-size:20px;">数据加载失败，请检查 events.json 格式</div>';
            });
    })
    .catch(err => console.error('加载 metro_lines.json 失败:', err));

// 统一刷新渲染函数
let chartUpdateTimeout = null;
function renderAll() {
    const filtered = core.getFilteredEvents();
    document.getElementById('stats-text').textContent = `当前展示 ${filtered.length} / 共 ${core.allEvents.length} 个事件`;
    
    const currYear = new Date(map.timeDimension.getCurrentTime()).getFullYear();
    updateChartData(filtered, currYear); 
    core.renderData(filtered);
    updateMacroChart(currYear);
}

// 窗口自适应
window.addEventListener('resize', () => { 
    barChart.resize(); pieChart.resize(); lineChart.resize(); 
});