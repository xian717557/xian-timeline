import geopandas as gpd
from pyogrio import set_gdal_config_options

# 开启自动重建 SHX 配置
set_gdal_config_options({"SHAPE_RESTORE_SHX": "YES"})

shp_file_path = r"D:\gis_data\县级边界_610100.shp"
print("正在读取 SHP 文件...")
gdf = gpd.read_file(shp_file_path)

# 2. 统一坐标系为 WGS84 (网页地图通用的经纬度坐标系)
if gdf.crs and gdf.crs.to_string() != 'EPSG:4326':
    gdf = gdf.to_crs(epsg=4326)

# 3. 导出为 GeoJSON，命名为 xian_county.geojson
output_path = "xian_county.geojson"
gdf.to_file(output_path, driver='GeoJSON')
print(f"✅ 转换成功！文件已保存为：{output_path}")   