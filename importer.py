import json

def merge_data():
    # 1. 读取现有数据
    try:
        with open('events.json', 'r', encoding='utf-8') as f:
            existing_events = json.load(f)
    except FileNotFoundError:
        existing_events = []

    # 2. 读取新抓取的数据
    try:
        with open('raw_policies.json', 'r', encoding='utf-8') as f:
            new_policies = json.load(f)
    except FileNotFoundError:
        print("未找到 raw_policies.json，请先运行 scraper.py")
        return

    # 3. 去重逻辑：根据标题判断是否已存在
    existing_titles = {e['title'] for e in existing_events}
    added_count = 0

    for policy in new_policies:
        if policy['title'] not in existing_titles:
            # 构造符合 events.json 格式的数据
            # 注意：这里我们缺少 lat/lng 等地图信息，先赋默认值或留空
            # 实际上，政策类事件通常不直接对应一个精确坐标，可以用市中心坐标代替
            new_event = {
                "year": policy['year'],
                "title": policy['title'],
                "category": "规划", # 默认分类为规划，你可以手动修改
                "lat": 34.3416,     # 默认西安市中心坐标
                "lng": 108.9398,
                "desc": f"来源：西安市政府官网。{policy['title']}",
                "source": "西安市政府官网",
                "link": policy['link'] # 保留链接，方便回溯
            }
            existing_events.append(new_event)
            existing_titles.add(policy['title'])
            added_count += 1

    # 4. 排序：按年份升序，同年按标题排序（可选）
    existing_events.sort(key=lambda x: (x['year'], x['title']))

    # 5. 写入文件
    with open('events.json', 'w', encoding='utf-8') as f:
        json.dump(existing_events, f, ensure_ascii=False, indent=2)

    print(f"导入完成！新增了 {added_count} 条数据。当前数据总量：{len(existing_events)} 条。")

if __name__ == "__main__":
    merge_data()