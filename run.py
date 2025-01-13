# -- coding: utf-8 --
import uvicorn
from settings import Site
import os

# 获取当前脚本文件的绝对路径

script_path = os.path.abspath(__file__)

# 获取当前脚本文件所在目录的路径

script_directory = os.path.dirname(script_path)

# 切换当前工作目录到脚本文件所在目录

os.chdir(os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    print(f"启动{Site.name}服务...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8322,
        reload=True,
        lifespan="on",
        loop="asyncio"
    ) 