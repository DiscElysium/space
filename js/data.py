import os
import re
import json

# ================= 配置区 =================
IMAGE_DIR = './assets'       # 你的图片存放目录
DATA_FILE = './data.js'      # 你的原始数据文件
OUTPUT_FILE = './data_updated.js' # 处理后输出的新数据文件
# =========================================

def process_images_and_update_data():
    if not os.path.exists(IMAGE_DIR):
        print(f"错误: 找不到图片目录 '{IMAGE_DIR}'，请确保图片已放入该文件夹。")
        return

    print("1. 正在扫描图片目录...")
    image_mapping = {}
    
    # 遍历文件夹下的所有文件
    for filename in os.listdir(IMAGE_DIR):
        # 使用正则匹配开头为数字，紧跟下划线的图片 (例如 01_东方红一号.png, 02_实践.jpg)
        match = re.match(r'^(\d+)_', filename)
        if match:
            # 获取编号 (如 '01' 会被转为 1)
            num = int(match.group(1))
            image_mapping[num] = filename
            
    print(f"   成功扫描并解析到 {len(image_mapping)} 张带编号的图片。\n")

    print("2. 正在读取原始 data.js...")
    if not os.path.exists(DATA_FILE):
        print(f"错误: 找不到数据文件 '{DATA_FILE}'")
        return

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # 使用正则提取 export const rawData = [...] 内部的数组文本
    list_str_match = re.search(r'export const rawData = (\[.*?\]);', content, re.DOTALL)
    if not list_str_match:
        print("错误: 无法解析 data.js 中的数据格式，请确保格式为 'export const rawData = [...]'")
        return

    list_str = list_str_match.group(1)

    try:
        # 将 JS 数组文本解析为 Python 列表
        data_list = json.loads(list_str)
    except json.JSONDecodeError as e:
        print(f"错误: data.js 内部的数组不符合标准 JSON 格式。详细信息: {e}")
        return

    print("3. 正在将图片路径注入到数据中...")
    match_count = 0
    # 遍历数据列表，根据索引(从0开始)计算航天器编号(从1开始)
    for index, item in enumerate(data_list):
        # 假设你的 data.js 中的事件顺序正好对应编号 01, 02, 03...
        pic_number = index + 1 
        
        if pic_number in image_mapping:
            # 将完整路径写入 img 字段
            item['img'] = f"{IMAGE_DIR}/{image_mapping[pic_number]}"
            match_count += 1
        else:
            # 如果某一项没有找到对应编号的图片，可以默认给个空或者不操作
            print(f"   警告: 第 {pic_number} 项 ({item.get('m', '未知')}) 缺少对应的图片文件。")

    print(f"   注入完成！成功匹配 {match_count} 项。\n")

    print(f"4. 正在生成新的数据文件 '{OUTPUT_FILE}'...")
    # 将更新后的数据格式化转回 JSON 字符串
    new_list_str = json.dumps(data_list, ensure_ascii=False, indent=4)
    new_content = f"export const rawData = {new_list_str};\n"

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("✅ 处理完毕！你可以将原先的 data.js 替换为新生成的 data_updated.js 了。")

if __name__ == '__main__':
    process_images_and_update_data()