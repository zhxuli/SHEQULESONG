# 社区乐送 - 社区配送管理系统

## 项目简介
社区乐送是一个专门为社区配送服务设计的管理系统，旨在提供高效、便捷的社区配送解决方案。系统支持多站点管理、订单处理、配送跟踪等功能，适用于社区商铺、小型配送服务等场景。

## 主要功能
- 🏪 **多站点管理**
  - 支持多个配送站点独立运营
  - 每个站点可设置独立的营业时间和配送范围
  - 灵活的站点设置和参数配置

- 👥 **员工管理**
  - 完善的权限管理系统
  - 支持多角色分配
  - 员工配送任务分配与跟踪

- 📦 **订单管理**
  - 实时订单处理
  - 订单状态跟踪
  - 配送进度实时更新
  - 历史订单查询

- 🏘️ **地址管理**
  - 小区信息管理
  - 楼栋信息管理
  - 配送地址快速选择

- 🍽️ **菜单管理**
  - 商品信息管理
  - 价格设置
  - 商品上下架
  - 商品分类管理

## 技术栈
- 前端：Vue.js + Element UI
- 后端：Python + FastAPI
- 数据库：SQLite
- 部署：支持Docker容器化部署

## 环境要求
- Python 3.8+
- Node.js 12+
- 现代浏览器（Chrome、Firefox、Safari、Edge等）

## 快速开始

### 1. 安装依赖
```bash
# 创建并激活虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows

# 安装Python依赖
pip install -r requirements.txt
```

### 2. 初始化数据库
```bash
# 运行数据库迁移
python settings.py
```

### 3. 启动服务
```bash
# 启动后端服务
python run.py
```

### 4. 访问系统
打开浏览器访问：`http://localhost:8322`

## 系统截图
- 登录界面
- 订单管理
- 配送管理
- 站点设置
（建议添加几张系统实际使用的截图）

## 贡献指南
欢迎提交问题和功能建议！如果你想为项目做出贡献，请：
1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m '添加一些新功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 版本历史
- v1.0.0 (2023-12-21)
  - 初始版本发布
  - 基础功能实现
  - 多站点管理支持

## 许可证
本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系方式
如有任何问题或建议，请通过以下方式联系我们：
- 项目主页：https://github.com/zhxuli/SHEQULESONG

## 致谢
感谢所有为这个项目做出贡献的开发者！ 