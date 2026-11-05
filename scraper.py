import requests
from bs4 import BeautifulSoup
import json
import time

def fetch_latest_policies():
    # 西安市人民政府-政府文件列表页（新网址）
    url = "https://www.xa.gov.cn/zzzb/xwdt/zfwj/list/1.html"
    
    # 注意这里的缩进，和上面的 url 必须完全对齐
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    print("正在访问西安市政府官网...")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status() # 检查请求是否成功
        response.encoding = 'utf-8' # 确保中文不乱码
    except Exception as e:
        print(f"访问失败: {e}")
        return []

    soup = BeautifulSoup(response.text, 'lxml')
    policies = []

    # 寻找包含文件列表的 HTML 元素
    items = soup.select('li') # 用更宽泛的选择器，先抓所有 li

    for item in items:
        a_tag = item.find('a')
        if a_tag and 'href' in a_tag.attrs:
            title = a_tag.get_text(strip=True)
            link = a_tag['href']
            
            # 补全相对链接
            if link.startswith('/'):
                link = "https://www.xa.gov.cn" + link
            
            # 过滤，只保留看起来像政策文件的条目
            if len(title) > 8 and link.endswith('.html') and ('通知' in title or '办法' in title or '规划' in title or '批复' in title):
                # 简单提取年份
                import re
                year_match = re.search(r'20\d{2}', item.get_text())
                year = int(year_match.group()) if year_match else 2024

                policies.append({
                    "year": year,
                    "title": title,
                    "link": link,
                    "date": f"{year}-01-01"
                })

    print(f"抓取到 {len(policies)} 条疑似政策文件。")
    return policies

if __name__ == "__main__":
    new_data = fetch_latest_policies()
    with open('raw_policies.json', 'w', encoding='utf-8') as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
    print("原始数据已保存至 raw_policies.json")