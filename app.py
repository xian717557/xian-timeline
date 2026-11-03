import streamlit as st
import folium
from streamlit_folium import st_folium

st.title("西安城市发展时间线 · 第一个标记")

# 创建以西安为中心的地图
m = folium.Map(location=[34.3416, 108.9398], zoom_start=11)

# 在西安地铁2号线大致位置放一个标记
folium.Marker(
    location=[34.3416, 108.9398],
    popup="2011 · 西安地铁2号线开通",
    tooltip="点击查看",
).add_to(m)

# 把地图嵌入 Streamlit 页面
st_folium(m, width=800, height=500, key="xian_map")