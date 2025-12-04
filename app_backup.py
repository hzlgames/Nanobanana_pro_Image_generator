"""
Gemini 图片生成 - 独立测试脚本
用于验证 Vertex AI API 调用是否正常工作
"""

import os
import sys
from pathlib import Path
from io import BytesIO
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def print_separator(title=""):
    print("\n" + "=" * 50)
    if title:
        print(f"  {title}")
        print("=" * 50)

def check_environment():
    """检查环境配置"""
    print_separator("环境检查")
    
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", os.getenv("PROJECT_ID", ""))
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
    
    print(f"凭证文件: {creds_path}")
    print(f"项目 ID: {project_id}")
    print(f"区域: {location}")
    
    # 检查凭证文件是否存在
    if creds_path and Path(creds_path).exists():
        print("✅ 凭证文件存在")
    else:
        print("❌ 凭证文件不存在或未设置")
        return False
    
    if not project_id:
        print("❌ 项目 ID 未设置")
        return False
    
    print("✅ 环境变量配置正确")
    return True

def test_client_init():
    """测试客户端初始化"""
    print_separator("客户端初始化测试")
    
    try:
        from google import genai
        
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", os.getenv("PROJECT_ID", ""))
        location = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
        
        client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location
        )
        print(f"✅ 客户端初始化成功")
        print(f"   Project: {project_id}")
        print(f"   Location: {location}")
        return client
    except Exception as e:
        print(f"❌ 客户端初始化失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_simple_text_generation(client):
    """测试简单文本生成"""
    print_separator("文本生成测试")
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents="Hello, say 'test successful' in Chinese"
        )
        print(f"✅ 文本生成成功")
        print(f"   响应: {response.text}")
        return True
    except Exception as e:
        print(f"❌ 文本生成失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_image_generation(client, prompt="A cute cat in space"):
    """测试图片生成"""
    print_separator("图片生成测试")
    
    try:
        from google.genai import types
        
        print(f"提示词: {prompt}")
        print("配置参数:")
        
        # 构建配置 - 使用正确的参数
        config = types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(
                aspect_ratio="1:1"
            )
        )
        print(f"   response_modalities: ['IMAGE']")
        print(f"   aspect_ratio: 1:1")
        
        print("\n正在生成...")
        
        # 使用流式传输
        response_stream = client.models.generate_content_stream(
            model="gemini-3-pro-image-preview",
            contents=prompt,
            config=config
        )
        
        thinking_text = ""
        image_data = None
        
        for chunk in response_stream:
            # 打印思考过程
            if chunk.text:
                thinking_text += chunk.text
                print(f"   [思考] {chunk.text[:100]}..." if len(chunk.text) > 100 else f"   [思考] {chunk.text}")
            
            # 检查图片数据
            if chunk.candidates and chunk.candidates[0].content.parts:
                for part in chunk.candidates[0].content.parts:
                    if part.inline_data:
                        image_data = part.inline_data.data
                        print(f"   [图片] 收到 {len(image_data)} 字节")
        
        if image_data:
            from PIL import Image
            
            img = Image.open(BytesIO(image_data))
            output_path = Path(__file__).parent / "test_output.png"
            img.save(output_path)
            print(f"\n✅ 图片生成成功!")
            print(f"   图片尺寸: {img.size}")
            print(f"   保存路径: {output_path}")
            return True
        else:
            print("\n❌ 未收到图片数据")
            if thinking_text:
                print(f"   模型思考: {thinking_text}")
            return False
            
    except Exception as e:
        print(f"\n❌ 图片生成失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_image_config_params(client):
    """测试 ImageConfig 的各种参数"""
    print_separator("ImageConfig 参数测试")
    
    from google.genai import types
    
    # 测试各种参数组合
    test_cases = [
        {
            "name": "只有 aspect_ratio",
            "config": types.ImageConfig(aspect_ratio="16:9")
        },
        # 如果需要测试其他参数，可以在这里添加
    ]
    
    for case in test_cases:
        print(f"\n测试: {case['name']}")
        try:
            config = types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=case["config"]
            )
            print(f"   ✅ 配置有效")
        except Exception as e:
            print(f"   ❌ 配置错误: {e}")

def list_available_models(client):
    """列出可用的模型"""
    print_separator("可用模型列表")
    
    try:
        # 列出包含 "image" 的模型
        models = client.models.list()
        image_models = []
        
        for model in models:
            if "image" in model.name.lower():
                image_models.append(model.name)
                print(f"   {model.name}")
        
        if not image_models:
            print("   未找到包含 'image' 的模型")
            print("   提示: gemini-3-pro-image-preview 可能是预览版模型")
        
        return True
    except Exception as e:
        print(f"❌ 列出模型失败: {e}")
        return False

def main():
    print("\n" + "🎨 Gemini 图片生成 - 调试测试脚本 🎨")
    print("=" * 50)
    
    # 1. 检查环境
    if not check_environment():
        print("\n❌ 环境检查失败，请检查配置后重试")
        sys.exit(1)
    
    # 2. 初始化客户端
    client = test_client_init()
    if not client:
        print("\n❌ 客户端初始化失败")
        sys.exit(1)
    
    # 3. 测试文本生成 (验证连接)
    if not test_simple_text_generation(client):
        print("\n⚠️ 文本生成失败，但继续测试图片生成...")
    
    # 4. 列出可用模型
    list_available_models(client)
    
    # 5. 测试 ImageConfig 参数
    test_image_config_params(client)
    
    # 6. 测试图片生成
    test_image_generation(client)
    
    print_separator("测试完成")

if __name__ == "__main__":
    main()
