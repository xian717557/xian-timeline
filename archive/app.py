import json
from pathlib import Path

import streamlit as st
import folium
from streamlit_folium import st_folium

st.set_page_config(page_title="西安城市发展时间线", layout="wide")
st.title("西安城市发展时间线")

# 1. 读取事件数据
data_path = Path(__file__).parent / "events.json"
events = json.loads(data_path.read_text(encoding="utf-8"))

# 2. 侧边栏筛选
years = sorted({e["year"] for e in events})
categories = sorted({e["category"] for e in events})

year_range = st.sidebar.slider(
    "选择年份范围",
    min_value=min(years),
    max_value=max(years),
    value=(min(years), max(years)),
)
selected_categories = st.sidebar.multiselect(
    "选择事件类型",
    categories,
    default=categories,
)

# 3. 按筛选条件过滤
filtered = [
    e for e in events
    if year_range[0] <= e["year"] <= year_range[1]
    and e["category"] in selected_categories
]

st.write(f"当前显示 **{len(filtered)}** 个事件（共 {len(events)} 条数据）")

# 4. 画地图
m = folium.Map(location=[34.3416, 108.9398], zoom_start=11)

for e in filtered:
    popup_html = (
        f"<b>{e['year']} · {e['title']}</b><br>"
        f"{e['desc']}<br>"
        f"<small>来源：{e['source']}</small>"
    )
    folium.Marker(
        location=[e["lat"], e["lng"]],
        popup=folium.Popup(popup_html, max_width=260),
        tooltip=f"{e['year']} · {e['title']}",
    ).add_to(m)

st_folium(m, height=550, use_container_width=True, key="xian_map")