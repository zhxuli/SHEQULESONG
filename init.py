# -- coding: utf-8 --
import os
from settings import Site

if __name__ == '__main__':
    print(f'正在初始化{Site.name}数据库...')
    
    if not os.path.exists('db.sqlite3'):
        print('正在初始化数据库...')
        os.system('aerich init -t settings.TORTOISE_ORM')
        os.system('aerich init-db')
    
    print('正在更新数据库...')
    os.system('aerich migrate --name update')
    print('正在执行迁移...')
    os.system('aerich upgrade') 