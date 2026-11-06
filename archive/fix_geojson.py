import json

# 读取原文件
with open('xian_county.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 西安各区县的大致中心点(纬度, 经度)，用于匹配
districts = {
    "新城区": [34.266, 108.960], "碑林区": [34.230, 108.940],
    "莲湖区": [34.260, 108.900], "雁塔区": [34.210, 108.950],
    "未央区": [34.290, 108.940], "灞桥区": [34.270, 109.060],
    "长安区": [34.150, 108.940], "高陵区": [34.530, 109.080],
    "鄠邑区": [34.100, 108.600], "临潼区": [34.360, 109.210],
    "阎良区": [34.660, 109.220], "蓝田县": [34.150, 109.320],
    "周至县": [34.160, 108.220], "西咸新区": [34.330, 108.730]
}

# 遍历所有面，计算中心点，找到最近的区县名
for feature in data['features']:
    coords = feature['geometry']['coordinates'][0]
    # 简单的中心点估算（取第一个点的经纬度）
    lng, lat = coords[0][0], coords[0][1]
    
    closest_name = "未知区域"
    min_dist = float('inf')
    
    for name, center in districts.items():
        # 计算平面距离（粗略估算）
        dist = (lng - center[1])**2 + (lat - center[0])**2
        if dist < min_dist:
            min_dist = dist
            closest_name = name
            
    feature['properties'] = {"name": closest_name}

# 保存新文件
with open('xian_county_fixed.geojson', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("修复完成！已生成 xian_county_fixed.geojson")