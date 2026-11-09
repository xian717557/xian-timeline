// 负责地图初始化、底图、卷帘门
export const map = L.map('map', {
    center: [34.3416, 108.9398], zoom: 11,
    timeDimension: true, timeDimensionControl: true,
    timeDimensionControlOptions: {
        position: 'bottomleft', autoPlay: false, minSpeed: 1, maxSpeed: 10,
        timeSliderDragUpdate: true, loop: false
    }
});

map.createPane('areasPane');
map.getPane('areasPane').style.zIndex = 350;

export const vecLayer = L.tileLayer('https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', { maxZoom: 19, crossOrigin: true }).addTo(map);
export const satLayer = L.tileLayer('https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', { maxZoom: 19, crossOrigin: true }).addTo(map);

satLayer.setOpacity(0);
L.control.layers({ "现代矢量图": vecLayer, "卫星实景图": satLayer }, null, { position: 'topright' }).addTo(map);

// 卷帘门逻辑封装
export function initSwipe() {
    let isSwipeMode = false;
    let swipeSlider = null;
    let swipeLine = null;
    const mapContainer = map.getContainer();

    document.getElementById('swipe-btn').addEventListener('click', function() {
        isSwipeMode = !isSwipeMode;
        const btn = this;

        if (isSwipeMode) {
            btn.style.background = '#28a745'; btn.style.color = '#fff';
            vecLayer.setOpacity(1); satLayer.setOpacity(1);
            mapContainer.classList.add('swipe-active');

            if (!swipeSlider) {
                swipeSlider = document.createElement('div');
                swipeSlider.className = 'swipe-slider';
                swipeSlider.style.left = '50%';
                
                swipeLine = document.createElement('div');
                swipeLine.style.position = 'absolute';
                swipeLine.style.top = '0'; swipeLine.style.bottom = '0';
                swipeLine.style.width = '2px'; swipeLine.style.backgroundColor = '#fff';
                swipeLine.style.left = '50%'; swipeLine.style.zIndex = '9998';
                swipeLine.style.pointerEvents = 'none';

                mapContainer.appendChild(swipeLine);
                mapContainer.appendChild(swipeSlider);
            }
            updateSwipePosition(50);
        } else {
            btn.style.background = '#f0f0f0'; btn.style.color = '#333';
            mapContainer.classList.remove('swipe-active');
            satLayer.setOpacity(0);
            if (swipeSlider) swipeSlider.remove();
            if (swipeLine) swipeLine.remove();
            resetSwipe();
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (!isSwipeMode) return;
        const rect = mapContainer.getBoundingClientRect();
        let x = e.clientX - rect.left;
        if (x < 0) x = 0;
        if (x > rect.width) x = rect.width;
        updateSwipePosition((x / rect.width) * 100);
    });

    function updateSwipePosition(percent) {
        if (swipeSlider) swipeSlider.style.left = percent + '%';
        if (swipeLine) swipeLine.style.left = percent + '%';
        const satPanes = document.querySelectorAll('.leaflet-layer');
        if (satPanes.length >= 2) {
            satPanes[1].style.clipPath = `inset(0 0 0 ${percent}%)`;
        }
    }

    function resetSwipe() {
        const satPanes = document.querySelectorAll('.leaflet-layer');
        if (satPanes.length >= 2) satPanes[1].style.clipPath = 'none';
    }
}