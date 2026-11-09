import { macroData, getColor } from './config.js';

export const barChart = echarts.init(document.getElementById('bar-chart'));
export const pieChart = echarts.init(document.getElementById('pie-chart'));
export const lineChart = echarts.init(document.getElementById('line-chart'));

export function updateChartData(eventsArray, currentYear) {
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

export function updateMacroChart(currentYear) {
    let maxIdx = macroData.years.findIndex(y => y === currentYear);
    if (maxIdx === -1) {
        if (currentYear > 2023) maxIdx = macroData.years.length - 1;
        else if (currentYear < 2010) maxIdx = 0;
    }

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
            { name: '常住人口(万人)', type: 'line', yAxisIndex: 1, data: displayPop, smooth: true, itemStyle: { color: '#007bff' } }
        ]
    }, true);
}