# -- coding: utf-8 --
import uvicorn
from settings import Site

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