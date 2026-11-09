import { map } from './mapCore.js';
import { barChart, pieChart, lineChart } from './chartCore.js';
import * as core from './renderCore.js';
import { SILICON_API_KEY, SILICON_URL } from './config.js';

export function initUI() {
    // 侧边栏关闭
    document.getElementById('close-panel').addEventListener('click', () => {
        document.getElementById('side-panel').classList.remove('active');
    });
    map.on('click', (e) => {
        if (e.originalEvent.target.id === 'map' || e.originalEvent.target.classList.contains('leaflet-container')) {
            document.getElementById('side-panel').classList.remove('active');
        }
    });

    // 热力图开关
    document.getElementById('heat-mode-toggle').addEventListener('change', (e) => {
        core.setHeatMode(e.target.checked);
        core.filterMarkersByTime();
    });

    // 大屏模式
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const exitDashboardBtn = document.getElementById('exit-dashboard-btn');
    if (fullscreenBtn && exitDashboardBtn) {
        fullscreenBtn.addEventListener('click', () => {
            document.body.classList.add('dashboard-mode');
            setTimeout(() => { map.invalidateSize(); }, 300);
        });
        exitDashboardBtn.addEventListener('click', () => {
            document.body.classList.remove('dashboard-mode');
            setTimeout(() => { map.invalidateSize(); barChart.resize(); pieChart.resize(); lineChart.resize(); }, 300);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('dashboard-mode')) {
                document.body.classList.remove('dashboard-mode');
                setTimeout(() => { map.invalidateSize(); barChart.resize(); pieChart.resize(); }, 300);
            }
        });
    }

    // 政策库模态框
    const policyBtn = document.getElementById('policy-btn');
    const policyModal = document.getElementById('policy-modal');
    if (policyBtn && policyModal) {
        policyBtn.addEventListener('click', () => {
            renderPolicyList();
            policyModal.classList.add('active');
        });
        document.getElementById('close-policy').addEventListener('click', () => policyModal.classList.remove('active'));
        policyModal.addEventListener('click', (e) => { if (e.target === policyModal) policyModal.classList.remove('active'); });
    }

    // 生成海报
    document.getElementById('poster-btn').addEventListener('click', generatePoster);

    // AI 时代切片
    document.getElementById('ai-slice-btn').addEventListener('click', generateAISlice);

    // 电影模式
    document.getElementById('cinema-btn').addEventListener('click', startCinema);
    document.getElementById('exit-cinema-btn').addEventListener('click', stopCinema);
}

// --- 以下为内部具体功能实现 ---

function renderPolicyList() {
    const policyListContainer = document.getElementById('policy-list-container');
    if (!policyListContainer) return;
    policyListContainer.innerHTML = ''; 
    
    const policies = core.allEvents.filter(e => e.category === '政策').sort((a, b) => b.year - a.year);
    if (policies.length === 0) {
        policyListContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">暂无政策数据。</div>';
        return;
    }

    policies.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'policy-item';
        div.innerHTML = `<div class="policy-item-title">${p.title}</div><div class="policy-item-meta">📅 ${p.year}年 | 来源：${p.source}</div>`;
        div.addEventListener('click', () => {
            document.getElementById('policy-modal').classList.remove('active'); 
            map.timeDimension.setCurrentTime(new Date(`${p.year}-06-01T00:00:00`).getTime());
            map.flyTo([p.lat, p.lng], 14, { duration: 1.5 });
            
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
            
            core.highlightArea(p.region || p.title);
        });
        policyListContainer.appendChild(div);
    });
}

function generatePoster() {
    const title = document.getElementById('panel-title').textContent;
    const titleParts = title.split(' · ');
    const pureTitle = titleParts.length > 1 ? titleParts[1] : title;
    const year = document.getElementById('panel-year').textContent;
    const cat = document.getElementById('panel-category').textContent;
    const desc = document.getElementById('panel-desc').textContent;

    document.getElementById('poster-title').textContent = pureTitle;
    document.getElementById('poster-year').textContent = year;
    document.getElementById('poster-cat').textContent = cat;
    document.getElementById('poster-desc').textContent = desc.length > 120 ? desc.substring(0, 120) + '...' : desc;

    const btn = document.getElementById('poster-btn');
    const originalText = btn.textContent;
    btn.textContent = "⏳ 正在生成中...";
    btn.disabled = true;

    const currentCenter = map.getCenter();
    map.flyTo(currentCenter, map.getZoom(), { animate: false });

    setTimeout(() => {
        html2canvas(document.getElementById('map'), { useCORS: true, backgroundColor: '#111' }).then(mapCanvas => {
            const mapImg = mapCanvas.toDataURL("image/jpeg");
            document.getElementById('poster-map-container').innerHTML = `<img src="${mapImg}" style="width:100%; height:100%; object-fit:cover;">`;
            
            setTimeout(() => {
                html2canvas(document.getElementById('poster-template'), { useCORS: true, scale: 2, backgroundColor: '#ffffff' }).then(posterCanvas => {
                    const finalImg = posterCanvas.toDataURL("image/jpeg", 0.9);
                    const a = document.createElement('a');
                    a.href = finalImg;
                    a.download = `西安城市档案_${pureTitle}.jpg`;
                    a.click();
                    btn.textContent = originalText;
                    btn.disabled = false;
                });
            }, 500);
        });
    }, 100);
}

async function generateAISlice() {
    const currentYear = new Date(map.timeDimension.getCurrentTime()).getFullYear();
    const yearEvents = core.allEvents.filter(e => e.year === currentYear);

    if (yearEvents.length === 0) {
        alert(`${currentYear} 年暂时没有收录事件，拖动时间轴试试其他年份吧。`);
        return;
    }

    const titles = yearEvents.map(e => `- ${e.title}`).join('\n');
    const prompt = `你是一位专业的城市历史学家。请根据以下 ${currentYear} 年西安发生的事件，写一段 100 字左右的“年度时代切片”总结。要求语言生动、有历史纵深感。\n\n${titles}`;
    
    const btn = document.getElementById('ai-slice-btn');
    const originalText = btn.textContent;
    btn.textContent = "⏳ AI 正在思考...";
    btn.disabled = true;

    try {
        const response = await fetch(SILICON_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SILICON_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "Qwen/Qwen2.5-7B-Instruct", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 300 })
        });
        if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
        const data = await response.json();
        const aiText = data.choices[0].message.content;
        showAISlice(`${currentYear} 年 · 时代切片`, aiText);
    } catch (error) {
        console.error(error);
        alert("AI 生成失败，请检查 API Key 和网络。");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function showAISlice(title, text) {
    let sliceDiv = document.getElementById('ai-slice-result');
    if (!sliceDiv) {
        sliceDiv = document.createElement('div');
        sliceDiv.id = 'ai-slice-result';
        sliceDiv.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); max-width:600px; background:rgba(0,0,0,0.85); color:#fff; padding:20px 30px; border-radius:12px; z-index:10000; line-height:1.7; font-size:15px; backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1);';
        document.body.appendChild(sliceDiv);
    }
    sliceDiv.innerHTML = `<b style="color:#00BFFF; font-size:16px;">✨ ${title}</b><br><br>${text}`;
    sliceDiv.style.display = 'block';
    clearTimeout(sliceDiv._timer);
    sliceDiv._timer = setTimeout(() => { sliceDiv.style.display = 'none'; }, 10000);
}

// 电影模式
let cinemaInterval = null;
let isCinemaPlaying = false;

function startCinema() {
    if (isCinemaPlaying) return;
    isCinemaPlaying = true;
    document.body.classList.add('cinema-mode');
    document.getElementById('cinema-text-overlay').style.display = 'block';
    document.getElementById('cinema-btn').textContent = "🎬 演示中...";

    const availableTimes = map.timeDimension.getAvailableTimes();
    if (!availableTimes || availableTimes.length === 0) return;

    const yearToIndexMap = {};
    availableTimes.forEach((timeStr, index) => {
        const y = new Date(timeStr).getFullYear();
        if (!yearToIndexMap[y]) yearToIndexMap[y] = index;
    });

    const currentYear = new Date().getFullYear();
    const validYears = Object.keys(yearToIndexMap).map(Number).filter(y => y <= currentYear).sort((a, b) => a - b);
    if (validYears.length === 0) return;
    
    let currentIndex = 0;
    map.timeDimension.setCurrentTimeIndex(yearToIndexMap[validYears[0]]);

    clearInterval(cinemaInterval);
    cinemaInterval = setInterval(() => {
        currentIndex++;
        if (currentIndex >= validYears.length) {
            stopCinema();
            return;
        }
        map.timeDimension.setCurrentTimeIndex(yearToIndexMap[validYears[currentIndex]]);
    }, 3500); 
}

function stopCinema() {
    isCinemaPlaying = false;
    clearInterval(cinemaInterval);
    document.body.classList.remove('cinema-mode');
    document.getElementById('cinema-text-overlay').style.display = 'none';
    document.getElementById('cinema-btn').textContent = "🎬 自动演示";
}