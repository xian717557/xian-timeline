import { map } from './mapCore.js';
import { getColor } from './config.js';

export let allEvents = [];
export let currentGeoJsonLayer = null;
export let currentMarkers = [];
export let heatLayer = null; 
export let isHeatMode = false; 
export let areaLayers = {}; 
export let metroLines = []; 
export let currentMetroLayerGroup = null; 

export function setAllEvents(data) { allEvents = data; }
export function setMetroLines(data) { metroLines = data; }
export function setHeatMode(val) { isHeatMode = val; }

// 初始化区划面
export function initAreaLayers() {
    fetch('xian_county.geojson')
        .then(res => res.json())
        .then(data => {
            L.geoJSON(data, {
                pane: 'areasPane',
                style: function() {
                    return { color: '#3388ff', weight: 1.5, opacity: 0.5, fillColor: '#3388ff', fillOpacity: 0.02 };
                },
                onEachFeature: function (feature, layer) {
                    const props = feature.properties || {};
                    const areaName = props.name || props.NAME || "未知区域";
                    if (areaName !== "未知区域") areaLayers[areaName] = layer;

                    layer.on('mouseover', function() { layer.setStyle({ weight: 3, color: '#ff7800', fillOpacity: 0.3 }); });
                    layer.on('mouseout', function() {
                        if (!layer.isHighlighted) layer.setStyle({ weight: 1.5, color: '#3388ff', fillOpacity: 0.08 });
                    });
                    layer.bindTooltip(areaName, { permanent: false, direction: 'center', className: 'area-tooltip' });
                    layer.bindPopup(`<b style="font-size:16px;">📍 ${areaName}</b>`);
                }
            }).addTo(map);
        })
        .catch(err => console.log("区划面文件加载失败", err));
}

// 渲染地铁
export function renderMetroLines(currentDateStr) {
    if (currentMetroLayerGroup) map.removeLayer(currentMetroLayerGroup);
    currentMetroLayerGroup = L.layerGroup().addTo(map);

    metroLines.forEach(line => {
        const lineDate = `${line.year}-${String(line.month).padStart(2, '0')}-${String(line.day).padStart(2, '0')}`;
        if (lineDate <= currentDateStr) {
            const polyline = L.polyline(line.path, {
                color: line.color, weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round', pane: 'overlayPane'
            }).bindTooltip(line.name, { sticky: true });
            currentMetroLayerGroup.addLayer(polyline);

            line.path.forEach(point => {
                currentMetroLayerGroup.addLayer(L.circleMarker(point, {
                    radius: 3, fillColor: '#fff', color: line.color, weight: 2, fillOpacity: 1
                }));
            });
        }
    });
}

// 渲染事件点
export function renderData(eventsArray) {
    if (currentGeoJsonLayer) map.removeLayer(currentGeoJsonLayer);
    if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
    currentMarkers = [];

    const geojsonData = {
        type: 'FeatureCollection',
        features: eventsArray.map(e => {
            const m = e.month ? String(e.month).padStart(2, '0') : '01';
            const d = e.day ? String(e.day).padStart(2, '0') : '01';
            return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
                properties: { time: `${e.year}-${m}-${d}`, title: e.title, year: e.year, category: e.category, desc: e.desc, source: e.source, image: e.image, link: e.link, region: e.region }
            };
        })
    };

    geojsonData.features.forEach(f => {
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
                const panel = document.getElementById('side-panel');
                document.getElementById('panel-title').textContent = `${p.year} · ${p.title}`;
                
                const descEl = document.getElementById('panel-desc');
                let formattedDesc = p.desc;
                if (p.desc) formattedDesc = formattedDesc.replace(/(地铁|规划|生态|高新区|西咸新区|全运会|一带一路)/g, '<span style="color: #007bff; font-weight: bold;">$1</span>');
                descEl.innerHTML = formattedDesc;
                
                const sourceEl = document.getElementById('panel-source');
                sourceEl.innerHTML = `<span style="background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:4px; font-size:12px;">官方认证：${p.source}</span>`;
                document.getElementById('panel-year').textContent = p.year + '年';
                document.getElementById('panel-category').textContent = p.category;
                
                const imgEl = document.getElementById('panel-img');
                if (p.image) { imgEl.src = p.image; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; }
                
                const linkEl = document.getElementById('panel-link');
                if (p.link) { linkEl.href = p.link; linkEl.style.display = 'block'; } else { linkEl.style.display = 'none'; }
                
                panel.classList.add('active');
                highlightArea(p.region || p.title); 
            });
        }
    });
    currentGeoJsonLayer.addTo(map);

    const heatPoints = eventsArray.map(e => [e.lat, e.lng, 1]);
    heatLayer = L.heatLayer(heatPoints, {
        radius: 35, blur: 20, maxZoom: 13, willReadFrequently: true,
        gradient: {0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1: 'red'}
    });

    filterMarkersByTime();
}

// 时间过滤控制
export function filterMarkersByTime() {
    if (!map || !map.timeDimension) return;
    
    const currentTimeDate = new Date(map.timeDimension.getCurrentTime());
    const currentDateStr = `${currentTimeDate.getFullYear()}-${String(currentTimeDate.getMonth() + 1).padStart(2, '0')}-${String(currentTimeDate.getDate()).padStart(2, '0')}`;
    
    renderMetroLines(currentDateStr);

    if (isHeatMode) {
        if (currentGeoJsonLayer && map.hasLayer(currentGeoJsonLayer)) map.removeLayer(currentGeoJsonLayer);
        currentMarkers.forEach(m => { if (m instanceof L.Polyline) m.setStyle({ opacity: 0 }); });
        if (heatLayer && map.hasLayer(heatLayer)) {
            const currentEvents = getFilteredEvents().filter(e => {
                const m = e.month ? String(e.month).padStart(2, '0') : '01';
                const d = e.day ? String(e.day).padStart(2, '0') : '01';
                return `${e.year}-${m}-${d}` <= currentDateStr;
            });
            heatLayer.setLatLngs(currentEvents.map(e => [e.lat, e.lng, 1]));
        } else if (heatLayer && !map.hasLayer(heatLayer)) heatLayer.addTo(map);
        return;
    }

    if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    if (currentGeoJsonLayer && !map.hasLayer(currentGeoJsonLayer)) currentGeoJsonLayer.addTo(map);

    currentMarkers.forEach(layer => {
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

export function getFilteredEvents() {
    const keyword = document.getElementById('search-input').value.trim();
    const selectedCats = Array.from(document.querySelectorAll('.cat-filter:checked')).map(cb => cb.value);
    return allEvents.filter(item => {
        const matchKeyword = keyword === '' || item.title.includes(keyword) || item.desc.includes(keyword) || item.category.includes(keyword);
        return matchKeyword && selectedCats.includes(item.category);
    });
}

export function highlightArea(regionName, duration = 3000) {
    if (!regionName) return;
    for (let areaName in areaLayers) {
        if (areaName.includes(regionName) || regionName.includes(areaName)) {
            const targetLayer = areaLayers[areaName];
            targetLayer.isHighlighted = true;
            targetLayer.setStyle({ color: '#ff0000', weight: 4, fillColor: '#ff0000', fillOpacity: 0.4 });
            targetLayer.bringToFront(); 
            if (targetLayer._highlightTimer) clearTimeout(targetLayer._highlightTimer);
            targetLayer._highlightTimer = setTimeout(() => {
                targetLayer.isHighlighted = false;
                targetLayer.setStyle({ color: '#3388ff', weight: 1.5, fillColor: '#3388ff', fillOpacity: 0.08 });
            }, duration);
        }
    }
}