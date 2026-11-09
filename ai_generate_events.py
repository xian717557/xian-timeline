import requests
import json
import time

# ⚠️ 替换成你自己的免费 API Key
API_KEY = "sk-emeyldsjqjrtcirhoysurblcdjfthoettwkomtotufhbvhsz" 
API_URL = "https://api.siliconflow.cn/v1/chat/completions"
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"

def generate_events_for_decade(start_year, end_year):
    print(f"正在让 AI 生成 {start_year} - {end_year} 年的事件...")
    
    prompt = f"""
    你是一个西安城市历史专家。请列出 {start_year} 年到 {end_year} 年期间，西安发生的 {5} 件重大城市发展事件（如：交通、经济、规划、文化、生态等）。
    必须严格按照以下 JSON 数组格式输出，不要包含任何其他废话或 markdown 标记：
    [
      {{
        "year": 年份(数字),
        "month": 月份(数字,不明确填1),
        "title": "事件标题",
        "category": "分类(只能是:交通/规划/文化/经济/生态/区划/政策)",
        "lat": 纬度(约34.xx),
        "lng": 经度(约108.xx),
        "desc": "100字左右的详细描述",
        "source": "来源(如：公开新闻/西安市志)"
      }}
    ]
    """
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }

    try:
        response = requests.post(API_URL, headers=headers, json=data)
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # 清洗可能存在的 markdown 标记
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
            
        # 解析为 JSON
        new_events = json.loads(content)
        return new_events
        
    except Exception as e:
        print(f"生成失败，原因: {e}")
        return []

def merge_to_events_json(new_events):
    # 1. 读取现有数据
    try:
        with open('events.json', 'r', encoding='utf-8') as f:
            existing_events = json.load(f)
    except FileNotFoundError:
        existing_events = []

    # 2. 去重与合并
    existing_titles = {e['title'] for e in existing_events}
    added_count = 0

    for ev in new_events:
        if ev['title'] not in existing_titles:
            existing_events.append(ev)
            existing_titles.add(ev['title'])
            added_count += 1

    # 3. 按年份、月份排序
    existing_events.sort(key=lambda x: (x.get('year', 0), x.get('month', 1), x.get('day', 1)))

    # 4. 写入文件
    with open('events.json', 'w', encoding='utf-8') as f:
        json.dump(existing_events, f, ensure_ascii=False, indent=2)

    print(f"✅ 成功新增了 {added_count} 条数据！当前数据总量：{len(existing_events)} 条。")

if __name__ == "__main__":
    # 我们来生成一下 2000-2010 年这十年间的事件
    new_data = generate_events_for_decade(2010, 2020)
    
    if new_data:
        print("AI 生成的数据如下：")
        for item in new_data:
            print(f"- {item['year']}年: {item['title']}")
        
        merge_to_events_json(new_data)
    else:
        print("没有获取到有效数据。")