# -- coding: utf-8 --
from pathlib import Path
from datetime import datetime
import os

'''
aerich init -t settings.TORTOISE_ORM 初始化配置
aerich init-db 初始化数据库
aerich migrate 更新模型并进行迁移
aerich upgrade 升级
aerich downgrade 回到上一个版本
'''

# 基础配置
BASE_DIR = Path(__file__).resolve().parent
SECRET_KEY = "your-secret-key-keep-it-secret"
ACCESS_TOKEN_EXPIRE_MINUTES = 60*24*365*100

# 数据库配置
TORTOISE_ORM = {
    'connections': {'default': 'sqlite://db.sqlite3'},
    'apps': {
        'models': {
            'models': ['models', 'aerich.models'],
            'default_connection': 'default',
        },
    },
}

# 站点配置
class Site:
    name = "社区派送服务"
    description = "便捷的社区派送管理平台"

# 初始化/更新数据库
if __name__ == '__main__':
    current_path = os.path.abspath(__file__)
    parent_path = os.path.dirname(current_path)
    os.chdir(parent_path)
    
    if not os.path.exists('db.sqlite3'):
        print('正在初始化数据库...')
        os.system('aerich init -t settings.TORTOISE_ORM')
        os.system('aerich init-db')
    
    print('正在更新数据库...')
    os.system('aerich migrate --name update')
    print('正在执行迁移...')
    os.system('aerich upgrade') 