from fastapi import FastAPI, WebSocket, Depends, HTTPException, WebSocketDisconnect, Response
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from tortoise.queryset import Q
from auth import get_current_user, create_access_token, get_password_hash, verify_password
from schemas import *
from models import *
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from settings import TORTOISE_ORM, SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES
import sys

app = FastAPI()

# 注册数据库
register_tortoise(
    app,
    config=TORTOISE_ORM,
    generate_schemas=True,
    add_exception_handlers=True,
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.31.2:8322"],  # 允许的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 在CORS中间件之后添加
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    # 检查用户是否已存在
    if await User.filter(username=user_data.username).exists():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # 创建新用户
    hashed_password = get_password_hash(user_data.password)
    user = await User.create(
        username=user_data.username,
        password=hashed_password,
    )
    
    # 创建访问令牌
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login")
async def login(user_data: UserLogin, response: Response):
    user = await User.get_or_none(username=user_data.username)
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="用户名或密码错误"
        )
    
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # 设置cookie
    response.set_cookie(
        key="session_token",
        value=access_token,
        httponly=True,  # 防止JavaScript访问
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",  # 防止CSRF攻击
        secure=False,  # 开发环境设置为False
        path="/"  # 设置cookie的路径为根路径
    )
    
    return {"message": "登录成功"}

@app.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="session_token",
        path="/"  # 确保与设置cookie时使用相同的路径
    )
    return {"message": "退出成功"}

@app.post("/sites", response_model=dict)
async def create_site(site_data: SiteCreate, current_user: User = Depends(get_current_user)):
    print(f"Creating site for user: {current_user.username}")
    site = await Site.create(
        name=site_data.name,
        address=site_data.address,
        phone=site_data.phone,
        wechat=site_data.wechat,
        admin=current_user
    )
    return {"message": "站点创建成功", "site_id": site.id}

@app.get("/sites", response_model=List[dict])
async def get_sites(current_user: User = Depends(get_current_user)):
    # 获取用户作为管理员的站点
    admin_sites = await Site.filter(admin=current_user).prefetch_related('admin')
    # 获取用户作为员工的站点
    staff_sites = await Site.filter(staff_members__user=current_user).prefetch_related('admin')
    
    # 用集合去重，防止一个点被添加多次
    all_sites = set()
    
    # 添加管理员的站点
    for site in admin_sites:
        site_dict = {
            "id": site.id,
            "name": site.name,
            "address": site.address,
            "phone": site.phone,
            "wechat": site.wechat,
            "is_open": site.is_open,
            "description": site.description,
            "business_hours": site.business_hours,
            "role": "admin"
        }
        all_sites.add(tuple(site_dict.items()))
    
    # 添加员工的站点
    for site in staff_sites:
        site_dict = {
            "id": site.id,
            "name": site.name,
            "address": site.address,
            "phone": site.phone,
            "wechat": site.wechat,
            "role": "staff"
        }
        all_sites.add(tuple(site_dict.items()))
    
    # 转换回字典列表
    return [dict(site_items) for site_items in all_sites]

# WebSocket连接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

# 员工管理路由
@app.post("/sites/{site_id}/staff")
async def add_staff(site_id: int, staff_data: StaffCreate, current_user: User = Depends(get_current_user)):
    # 验证当前用户是否是站点管理员
    site = await Site.get_or_none(id=site_id, admin=current_user)
    if not site:
        raise HTTPException(status_code=403, detail="您不是该站点的管理员")
    
    # 验证要添加的用户是否存在
    staff_user = await User.get_or_none(username=staff_data.username)
    if not staff_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 检查用户是否已经是该站点的员工
    existing_staff = await StaffMember.get_or_none(user=staff_user, site=site)
    if existing_staff:
        raise HTTPException(status_code=400, detail="该用户已经是站点员工")
    
    # 创建员工记录
    staff_member = await StaffMember.create(
        user=staff_user,
        site=site,
        role=UserRole.STAFF,
        permissions=staff_data.permissions
    )
    
    return {"message": "员工添加成功", "staff_id": staff_member.id}

@app.get("/sites/{site_id}/staff", response_model=List[dict])
async def get_staff(site_id: int, current_user: User = Depends(get_current_user)):
    # 验证前用户是否是站点管理员
    site = await Site.get_or_none(id=site_id, admin=current_user)
    if not site:
        raise HTTPException(status_code=403, detail="您不是该站点的管理员")
    
    staff_members = await StaffMember.filter(site=site).prefetch_related('user')
    return [
        {
            "id": staff.id,
            "user_id": staff.user.id,
            "username": staff.user.username,
            "role": staff.role,
            "permissions": staff.permissions
        }
        for staff in staff_members
    ]

@app.put("/sites/{site_id}/staff/{staff_id}")
async def update_staff_permissions(
    site_id: int, 
    staff_id: int, 
    permissions: List[PermissionType],
    current_user: User = Depends(get_current_user)
):
    # 验证当前用户是否是站点管理员
    site = await Site.get_or_none(id=site_id, admin=current_user)
    if not site:
        raise HTTPException(status_code=403, detail="您不是该站点的管理员")
    
    staff_member = await StaffMember.get_or_none(id=staff_id, site=site)
    if not staff_member:
        raise HTTPException(status_code=404, detail="员工不存在")
    
    # 更新权限
    staff_member.permissions = permissions
    await staff_member.save()
    
    return {"message": "权限更新成功"}

@app.get("/sites/{site_id}")
async def get_site_settings(
    site_id: int,
    current_user: User = Depends(get_current_user)
):
    # 验证当前用户是否是站点管理员
    site = await Site.get_or_none(id=site_id, admin=current_user)
    if not site:
        raise HTTPException(status_code=403, detail="您不是该站点的管理员")
    
    return {
        "name": site.name,
        "address": site.address,
        "phone": site.phone,
        "wechat": site.wechat,
        "is_open": site.is_open,
        "description": site.description,
        "business_hours": site.business_hours,
        
    }

@app.put("/sites/{site_id}")
async def update_site_settings(
    site_id: int,
    site_data: SiteUpdate,
    current_user: User = Depends(get_current_user)
):
    # 验证当前用户是否是站点管理员
    site = await Site.get_or_none(id=site_id, admin=current_user)
    if not site:
        raise HTTPException(status_code=403, detail="您不是该站点的管理员")
    
    # 更新站点信息
    site.name = site_data.name
    site.address = site_data.address
    site.phone = site_data.phone
    site.wechat = site_data.wechat
    site.is_open = site_data.is_open
    site.description = site_data.description
    site.business_hours = site_data.business_hours
    await site.save()
    
    return {"message": "站点设置更新成功"}

# 订单管理路由
@app.post("/sites/{site_id}/orders")
async def create_order(
    site_id: int, 
    order_data: OrderCreate, 
    current_user: User = Depends(get_current_user)
):
    # 验证用户是否有权限创建订单
    staff = await StaffMember.get_or_none(
        user=current_user,
        site_id=site_id
    )
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    if not (staff and PermissionType.ORDER in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有创建订单的权限")
    
    # 验证楼栋是否存在且属于该站点
    building = await Building.get_or_none(
        id=order_data.building_id,
        community__site_id=site_id
    )
    if not building:
        raise HTTPException(status_code=404, detail="楼栋不存在")
    
    # 计算订单总金额
    total_amount = 0
    order_items = []
    
    for item_data in order_data.items:
        menu_item = await MenuItem.get_or_none(id=item_data.menu_item_id, site_id=site_id)
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"菜品ID {item_data.menu_item_id} 不存在")
        
        # 计算单项总价（包含选项价格）
        item_price = float(menu_item.price)
        selected_options = []
        if item_data.selected_options:
            options = await MenuItemOption.filter(
                id__in=item_data.selected_options,
                menu_item_id=menu_item.id
            )
            selected_options = options  # 保存选项对象列表
            for option in options:
                item_price += float(option.price)
        
        item_total = item_price * item_data.quantity
        total_amount += item_total
        
        order_items.append({
            "menu_item": menu_item,
            "quantity": item_data.quantity,
            "selected_options": selected_options,  # 使用选项对象列表
            "price": item_total
        })
    
    # 创建订单
    order = await Order.create(
        site=site,
        building=building,
        room_number=order_data.room_number,
        customer_name=order_data.customer_name,
        customer_phone=order_data.customer_phone,
        total_amount=total_amount,
        delivery_time=order_data.delivery_time,
        note=order_data.note,
        is_paid=order_data.is_paid,
        status=DeliveryStatus.ORDERED
    )
    
    # 创建订单项
    for item in order_items:
        # 创建订单项
        order_item = await OrderItem.create(
            order=order,
            menu_item=item["menu_item"],
            quantity=item["quantity"],
            price=item["price"]
        )
        # 建立选项的多对多关系
        if item["selected_options"]:
            # 使用 through 表直接创建关联
            for option in item["selected_options"]:
                await OrderItemOption.create(
                    order_item=order_item,
                    option=option
                )
    
    # 通过WebSocket广播新订单消息
    await manager.broadcast({
        "type": "new_order",
        "site_id": site_id,
        "order": {
            "id": order.id,
            "customer_name": order.customer_name,
            "total_amount": str(order.total_amount),
            "status": order.status
        }
    })
    
    return {"message": "订单创建成功", "order_id": order.id}

@app.get("/sites/{site_id}/orders")
async def get_orders(
    site_id: int,
    current_user: User = Depends(get_current_user),
    status: Optional[DeliveryStatus] = None,
    page: int = 1,  # 当前页码
    page_size: int = 10  # 每页显示的订单数量
):
    # 验证用户是否是该站点的成员
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员或员工
    if not staff and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="您不是该站点的成员")
    
    # 构建查询条件
    query = {"site_id": site_id}
    if status:
        query["status"] = status
    
    # 计算总订单数
    total_orders = await Order.filter(**query).count()
    
    # 计算偏移量
    offset = (page - 1) * page_size
    
    # 获取订单数据
    orders = await Order.filter(**query).offset(offset).limit(page_size).prefetch_related(
        'deliverer', 
        'building__community', 
        'items__menu_item',
        'items__item_options__option'  # 通过中间表获取选项
    )

    return {
        "total_orders": total_orders,
        "page": page,
        "page_size": page_size,
        "orders": [
            {
                "id": order.id,
                "customer_name": order.customer_name,
                "customer_phone": order.customer_phone,
                "room_number": order.room_number,
                "building": {
                    "id": order.building.id,
                    "name": order.building.name,
                    "community_id": order.building.community_id,
                    "community_name": order.building.community.name,
                    "address": order.building.community.address,
                    "room_number": order.room_number
                },
                "total_amount": str(order.total_amount),
                "delivery_time": order.delivery_time.isoformat() if order.delivery_time else None,
                "note": order.note,
                "is_paid": order.is_paid,
                "status": order.status,
                "deliverer": order.deliverer.username if order.deliverer else None,
                "created_at": order.created_at.isoformat(),
                "items": [
                    {
                        "id": item.id,
                        "menu_item": {
                            "id": item.menu_item.id,
                            "name": item.menu_item.name,
                            "price": str(item.menu_item.price)
                        },
                        "quantity": item.quantity,
                        "price": str(item.price),
                        "selected_options": [
                            {
                                "id": item_option.option.id,
                                "name": item_option.option.name,
                                "price": str(item_option.option.price)
                            }
                            for item_option in item.item_options
                        ]
                    }
                    for item in order.items
                ]
            }
            for order in orders
        ]
    }

@app.put("/sites/{site_id}/orders/{order_id}/status")
async def update_order_status(
    site_id: int,
    order_id: int,
    status_data: dict,
    current_user: User = Depends(get_current_user)
):
    # 从请求体中获取状态
    try:
        status = DeliveryStatus(status_data.get("status"))
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail="无效的状态值")
    
    # 验证用户权限
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 修改权限检查逻辑，允许管理员和具配送权限的员工
    if not (staff and PermissionType.DELIVERY in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有更新订单状态的权限")
    
    # 获取订单并验证其存在
    order = await Order.get_or_none(id=order_id, site_id=site_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # 更新订单状态
    order.status = status
    if status == DeliveryStatus.DELIVERING:
        order.deliverer = current_user
    elif status == DeliveryStatus.COMPLETED:
        order.delivery_time = datetime.now()  # 设置交付时间为当前时间
    await order.save()
    
    # 广播订单状态更新
    await manager.broadcast({
        "type": "order_status_update",
        "site_id": site_id,
        "order": {
            "id": order.id,
            "status": status,
            "deliverer": current_user.username if status == DeliveryStatus.DELIVERING else None
        }
    })
    
    return {"message": "订单状态更新成功"}

# WebSocket由用于实时更新
@app.websocket("/ws/{site_id}")
async def websocket_endpoint(websocket: WebSocket, site_id: int):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # 处理收到的消息
            await manager.broadcast({"site_id": site_id, "message": data})
    except WebSocketDisconnect:
        await manager.disconnect(websocket)

@app.get("/")
async def read_index():
    return FileResponse('index.html')

@app.get("/shop/{site_id}")
async def get_shop_page(site_id: int):
    return FileResponse('static/shop.html')

@app.get("/sites/{site_id}/verify")
async def verify_site_access(site_id: int, current_user: User = Depends(get_current_user)):
    # 验证用户是否有权限访问该站点
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员
    if site.admin_id == current_user.id:
        return {
            "name": site.name,
            "role": "admin"
        }
    
    # 检查是否是员工
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not staff:
        raise HTTPException(status_code=403, detail="您不是该站点的成员")
    
    return {
        "name": site.name,
        "role": "staff",
        "permissions": staff.permissions
    }

@app.get("/debug/token")
async def debug_token(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "user_id": current_user.id
    }

# 地址管理 - 小区
@app.post("/sites/{site_id}/communities")
async def create_community(
    site_id: int,
    community_data: CommunityCreate,
    current_user: User = Depends(get_current_user)
):
    """创建小区"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    # 修改权限检查：管理员或有地址管理权限的员工可以创建
    if not (staff and PermissionType.ADDRESS_MANAGE in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有地址管理权限")
    
    community = await Community.create(
        site=site,
        name=community_data.name,
        address=community_data.address,
        note=community_data.note
    )
    return {"message": "小区创建成功", "community_id": community.id}

@app.get("/sites/{site_id}/communities")
async def get_communities(
    site_id: int,
    current_user: User = Depends(get_current_user)
):
    """获取小区列表"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员或员工
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not staff and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="您不是该站点的成员")
    
    # 获取所有小区及其楼栋信息
    communities = await Community.filter(site_id=site_id).prefetch_related('buildings')
    
    return [
        {
            "id": community.id,
            "name": community.name,
            "address": community.address,
            "note": community.note,
            "buildings": [
                {
                    "id": building.id,
                    "name": building.name,
                    "note": building.note
                }
                for building in community.buildings
            ]
        }
        for community in communities
    ]

@app.get("/sites/{site_id}/communities/{community_id}")
async def get_community(
    site_id: int,
    community_id: int,
    current_user: User = Depends(get_current_user)
):
    """获取单个小区信息"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员或员工
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not staff and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="您不是该站点的成员")
    
    community = await Community.get_or_none(id=community_id, site_id=site_id)
    if not community:
        raise HTTPException(status_code=404, detail="小区不存在")
    
    buildings = await Building.filter(community_id=community_id)
    
    return {
        "id": community.id,
        "name": community.name,
        "address": community.address,
        "note": community.note,
        "buildings": [
            {
                "id": building.id,
                "name": building.name,
                "note": building.note
            }
            for building in buildings
        ]
    }

@app.put("/sites/{site_id}/communities/{community_id}")
async def update_community(
    site_id: int,
    community_id: int,
    community_data: CommunityUpdate,
    current_user: User = Depends(get_current_user)
):
    """更新小区信息"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    # 修改权限检查：管理员或有地址管理权限的员工可以更新
    if not (staff and PermissionType.ADDRESS_MANAGE in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有地址管理权限")
    
    community = await Community.get_or_none(id=community_id, site_id=site_id)
    if not community:
        raise HTTPException(status_code=404, detail="小区不存在")
    
    community.name = community_data.name
    community.address = community_data.address
    community.note = community_data.note
    await community.save()
    return {"message": "小区信息更新成功"}

@app.delete("/sites/{site_id}/communities/{community_id}")
async def delete_community(
    site_id: int,
    community_id: int,
    current_user: User = Depends(get_current_user)
):
    """删除小区"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    # 修改权限检查：管理员或有地址管理权限的员工可以删除
    if not (staff and PermissionType.ADDRESS_MANAGE in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有地址管理权限")
    
    community = await Community.get_or_none(id=community_id, site_id=site_id)
    if not community:
        raise HTTPException(status_code=404, detail="小区不存在")
    
    await community.delete()
    return {"message": "小区删除成功"}

# 地址管理 - 楼栋
@app.post("/sites/{site_id}/communities/{community_id}/buildings")
async def create_building(
    site_id: int,
    community_id: int,
    building_data: BuildingCreate,
    current_user: User = Depends(get_current_user)
):
    """创建楼栋"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    # 修改权限检查：管理员或有地址管理权限的员工可以创建
    if not (staff and PermissionType.ADDRESS_MANAGE in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有地址管理权限")
    
    community = await Community.get_or_none(id=community_id, site_id=site_id)
    if not community:
        raise HTTPException(status_code=404, detail="小区不存在")
    
    # 检查楼栋名称是否已存在
    existing = await Building.get_or_none(community_id=community_id, name=building_data.name)
    if existing:
        raise HTTPException(status_code=400, detail="该楼栋名称已存在")
    
    building = await Building.create(
        community=community,
        name=building_data.name,
        note=building_data.note
    )
    return {"message": "楼栋创建成功", "building_id": building.id}

@app.post("/sites/{site_id}/communities/{community_id}/buildings/batch")
async def batch_create_buildings(
    site_id: int,
    community_id: int,
    building_data: BuildingBatchCreate,
    current_user: User = Depends(get_current_user)
):
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=403, detail="您没有该站点的地址管理权限")
    
    community = await Community.get_or_none(id=community_id, site_id=site_id)
    if not community:
        raise HTTPException(status_code=404, detail="小区不存在")
    
    if building_data.start_num > building_data.end_num:
        raise HTTPException(status_code=400, detail="起始号不能大于结束号")
    
    created_count = 0
    skipped_count = 0
    
    for num in range(building_data.start_num, building_data.end_num + 1):
        building_name = f"{num}{building_data.suffix}"
        
        # 检查楼栋名称是否已存在
        existing = await Building.get_or_none(community_id=community_id, name=building_name)
        if existing:
            skipped_count += 1
            continue
        
        await Building.create(
            community=community,
            name=building_name,
            note=building_data.note
        )
        created_count += 1
    
    return {
        "message": "批量创建完成",
        "created_count": created_count,
        "skipped_count": skipped_count
    }

@app.put("/sites/{site_id}/communities/{community_id}/buildings/{building_id}")
async def update_building(
    site_id: int,
    community_id: int,
    building_id: int,
    building_data: BuildingUpdate,
    current_user: User = Depends(get_current_user)
):
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    # 修改权限检查：管理员或有地址管理权限的员工可以更新
    if not (staff and PermissionType.ADDRESS_MANAGE in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有地址管理权限")
    
    building = await Building.get_or_none(
        id=building_id,
        community_id=community_id,
        community__site_id=site_id
    )
    if not building:
        raise HTTPException(status_code=404, detail="楼栋不存在")
    
    building.name = building_data.name
    building.note = building_data.note
    await building.save()
    return {"message": "楼栋信息更新成功"}

@app.delete("/sites/{site_id}/communities/{community_id}/buildings/{building_id}")
async def delete_building(
    site_id: int,
    community_id: int,
    building_id: int,
    current_user: User = Depends(get_current_user)
):
    """删除楼栋"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员或有地址管理权限的员工
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not (site.admin_id == current_user.id or (staff and PermissionType.ADDRESS_MANAGE in staff.permissions)):
        raise HTTPException(status_code=403, detail="没有地址管理权限")
    
    # 验证小区是否存在
    community = await Community.get_or_none(id=community_id, site_id=site_id)
    if not community:
        raise HTTPException(status_code=404, detail="小区不存在")
    
    # 验证楼栋是否存在
    building = await Building.get_or_none(id=building_id, community_id=community_id)
    if not building:
        raise HTTPException(status_code=404, detail="楼栋不存在")
    
    # 删除楼栋
    await building.delete()
    return {"message": "楼栋删除成功"}

# 菜单管理
@app.post("/sites/{site_id}/menu-items")
async def create_menu_item(
    site_id: int,
    menu_item_data: MenuItemCreate,
    current_user: User = Depends(get_current_user)
):
    """创建菜品"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员或有菜单管理权限的员工
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not (site.admin_id == current_user.id or (staff and PermissionType.MENU_MANAGE in staff.permissions)):
        raise HTTPException(status_code=403, detail="没有菜单管理权限")
    
    # 创建菜品
    menu_item = await MenuItem.create(
        site=site,
        name=menu_item_data.name,
        price=menu_item_data.price,
        description=menu_item_data.description,
        note=menu_item_data.note
    )

    # 创建选项
    if menu_item_data.options:
        for option_data in menu_item_data.options:
            await MenuItemOption.create(
                menu_item=menu_item,
                name=option_data.name,
                price=option_data.price,
                description=option_data.description
            )
    
    return {"message": "菜品创建成功", "menu_item_id": menu_item.id}

@app.get("/sites/{site_id}/menu-items")
async def get_menu_items(
    site_id: int,
    current_user: User = Depends(get_current_user)
):
    """获取菜品列表"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员或员工
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not staff and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="您不是该站点的成员")
    
    # 获取所有菜品及其选项信息
    menu_items = await MenuItem.filter(site_id=site_id).prefetch_related('options')
    
    return [
        {
            "id": item.id,
            "name": item.name,
            "price": str(item.price),
            "description": item.description,
            "note": item.note,
            "is_available": item.is_available,
            "options": [
                {
                    "id": option.id,
                    "name": option.name,
                    "price": str(option.price),
                    "description": option.description
                }
                for option in item.options
            ]
        }
        for item in menu_items
    ]

@app.get("/sites/{site_id}/menu-items/{item_id}")
async def get_menu_item(
    site_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user)
):
    """获取单个菜品信息"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员或员工
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not staff and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="您不是该站点的成员")
    
    menu_item = await MenuItem.get_or_none(id=item_id, site_id=site_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    options = await MenuItemOption.filter(menu_item_id=item_id)
    
    return {
        "id": menu_item.id,
        "name": menu_item.name,
        "price": str(menu_item.price),
        "description": menu_item.description,
        "note": menu_item.note,
        "is_available": menu_item.is_available,
        "options": [
            {
                "id": option.id,
                "name": option.name,
                "price": str(option.price),
                "description": option.description
            }
            for option in options
        ]
    }

@app.put("/sites/{site_id}/menu-items/{item_id}")
async def update_menu_item(
    site_id: int,
    item_id: int,
    menu_item_data: MenuItemUpdate,
    current_user: User = Depends(get_current_user)
):
    """更新菜品信息"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员或有菜单管理权限的员工
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not (site.admin_id == current_user.id or (staff and PermissionType.MENU_MANAGE in staff.permissions)):
        raise HTTPException(status_code=403, detail="没有菜单管理权限")
    
    menu_item = await MenuItem.get_or_none(id=item_id, site_id=site_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    # 更新菜品基本信息
    menu_item.name = menu_item_data.name
    menu_item.price = menu_item_data.price
    menu_item.description = menu_item_data.description
    menu_item.note = menu_item_data.note
    menu_item.is_available = menu_item_data.is_available
    await menu_item.save()

    # 更新选项
    if menu_item_data.options is not None:
        # 删除现有选项
        await MenuItemOption.filter(menu_item_id=item_id).delete()
        # 创建新选项
        for option_data in menu_item_data.options:
            await MenuItemOption.create(
                menu_item=menu_item,
                name=option_data.name,
                price=option_data.price,
                description=option_data.description
            )
    
    return {"message": "菜品信息更新成功"}

@app.delete("/sites/{site_id}/menu-items/{item_id}")
async def delete_menu_item(
    site_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user)
):
    """删除菜品"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员或有菜单管理权限的员工
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not (site.admin_id == current_user.id or (staff and PermissionType.MENU_MANAGE in staff.permissions)):
        raise HTTPException(status_code=403, detail="没有菜单管理权限")
    
    menu_item = await MenuItem.get_or_none(id=item_id, site_id=site_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="菜品不存在")
    
    # 删除菜品（关联的选项会自动删除）
    await menu_item.delete()
    return {"message": "菜品删除成功"}

# 配送管理路由
@app.get("/sites/{site_id}/deliveries")
async def get_deliveries(
    site_id: int,
    status: Optional[DeliveryStatus] = None,
    current_user: User = Depends(get_current_user)
):
    """获取配送员的配送订单列表"""
    # 验证用户权限
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    if not (staff and PermissionType.DELIVERY in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有配送权限")
    
    # 获取今天的开始时间（0点）和结束时间（23:59:59）
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    # 分别查询不同状态的订单
    pending_orders = await Order.filter(
        site_id=site_id,
        status='ordered'
    ).prefetch_related('items__menu_item')

    delivering_orders = await Order.filter(
        site_id=site_id,
        status='delivering'
    ).prefetch_related('items__menu_item')

    completed_orders = await Order.filter(
        site_id=site_id,
        status='completed',
        delivery_time__gte=today,
        delivery_time__lt=tomorrow
    ).prefetch_related('items__menu_item')

    # 合并所有订单
    orders = pending_orders + delivering_orders + completed_orders
    
    return [
        {
            "id": order.id,
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "building": {
                "id": order.building.id,
                "name": order.building.name,
                "community_name": order.building.community.name
            },
            "total_amount": str(order.total_amount),
            "delivery_time": order.delivery_time.isoformat(),
            "note": order.note,
            "is_paid": order.is_paid,
            "status": order.status,
            "items": [
                {
                    "id": item.id,
                    "menu_item": {
                        "id": item.menu_item.id,
                        "name": item.menu_item.name
                    },
                    "quantity": item.quantity,
                    "price": str(item.price)
                }
                for item in order.items
            ]
        }
        for order in orders
    ]

@app.post("/sites/{site_id}/orders/{order_id}/take")
async def take_order(
    site_id: int,
    order_id: int,
    current_user: User = Depends(get_current_user)
):
    """配送员接单"""
    # 验证用户权限
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    if not (staff and PermissionType.DELIVERY in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有配送权限")
    
    # 获取订单
    order = await Order.get_or_none(id=order_id, site_id=site_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status != DeliveryStatus.ORDERED:
        raise HTTPException(status_code=400, detail="订单状态不正确")
    
    # 更新订单状态
    order.status = DeliveryStatus.DELIVERING
    order.deliverer = current_user
    await order.save()
    
    # 广播订单状态更新
    await manager.broadcast({
        "type": "order_status_update",
        "site_id": site_id,
        "order": {
            "id": order.id,
            "status": DeliveryStatus.DELIVERING,
            "deliverer": current_user.username
        }
    })
    
    return {"message": "接单成功"}

@app.post("/sites/{site_id}/orders/{order_id}/complete")
async def complete_order(
    site_id: int,
    order_id: int,
    current_user: User = Depends(get_current_user)
):
    """完成订单"""
    # 验证用户权限
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    if not (staff and PermissionType.DELIVERY in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有配送权限")
    
    # 获取订单
    order = await Order.get_or_none(id=order_id, site_id=site_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status != DeliveryStatus.DELIVERING:
        raise HTTPException(status_code=400, detail="订单状态不正确")
    
    if order.deliverer_id != current_user.id:
        raise HTTPException(status_code=403, detail="只有接单的配送员才能完成订单")
    
    # 更新订单状态
    order.status = DeliveryStatus.COMPLETED
    await order.save()
    
    # 广播订单状态更新
    await manager.broadcast({
        "type": "order_status_update",
        "site_id": site_id,
        "order": {
            "id": order.id,
            "status": DeliveryStatus.COMPLETED,
            "deliverer": current_user.username
        }
    })
    
    return {"message": "订单已完成"}

@app.post("/sites/{site_id}/orders/{order_id}/cancel")
async def cancel_order(
    site_id: int,
    order_id: int,
    current_user: User = Depends(get_current_user)
):
    """取消订单"""
    # 验证用户权限
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    if not staff and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限")
    
    # 获取订单
    order = await Order.get_or_none(id=order_id, site_id=site_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    if order.status == DeliveryStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="已完成的订单不能取消")
    
    # 更新订单状态
    order.status = DeliveryStatus.CANCELLED
    await order.save()
    
    # 广播订单状态更新
    await manager.broadcast({
        "type": "order_status_update",
        "site_id": site_id,
        "order": {
            "id": order.id,
            "status": DeliveryStatus.CANCELLED
        }
    })
    
    return {"message": "订单已取消"}

@app.delete("/sites/{site_id}/orders/{order_id}")
async def delete_order(
    site_id: int,
    order_id: int,
    current_user: User = Depends(get_current_user)
):
    """删除订单"""
    # 验证用户权限
    site = await Site.get_or_none(id=site_id, admin=current_user)
    if not site:
        raise HTTPException(status_code=403, detail="您不是该站点的管理员")
    
    # 获取订单
    order = await Order.get_or_none(id=order_id, site_id=site_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # 删除订单（关联的订单项会自动删除）
    await order.delete()
    
    # 广播订单删除消息
    await manager.broadcast({
        "type": "order_deleted",
        "site_id": site_id,
        "order_id": order_id
    })
    
    return {"message": "订单删除成功"}

@app.get("/sites/{site_id}/staff/current")
async def get_current_staff_info(
    site_id: int,
    current_user: User = Depends(get_current_user)
):
    """获取当前用户在站点的信息"""
    site = await Site.get_or_none(id=site_id)
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    # 检查是否是管理员
    if site.admin_id == current_user.id:
        return {
            "username": current_user.username,
            "role": "admin",
            "permissions": ["ORDER", "DELIVERY", "ORDER_MANAGE", "MENU_MANAGE", "ADDRESS_MANAGE"]
        }
    
    # 获取员工信息
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not staff:
        raise HTTPException(status_code=403, detail="您不是该站点的员工")
    
    return {
        "username": current_user.username,
        "role": "staff",
        "permissions": staff.permissions
    }

@app.put("/sites/{site_id}/orders/{order_id}")
async def update_order(
    site_id: int,
    order_id: int,
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    """更新订单"""
    # 验证用户权限
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    if not (staff and PermissionType.ORDER in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有更新订单的权限")
    
    # 获取订单
    order = await Order.get_or_none(id=order_id, site_id=site_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # 验证楼栋是否存在且属于该站点
    building = await Building.get_or_none(
        id=order_data.building_id,
        community__site_id=site_id
    )
    if not building:
        raise HTTPException(status_code=404, detail="楼栋不存在")
    
    # 计算订单总金额
    total_amount = 0
    order_items = []
    
    for item_data in order_data.items:
        menu_item = await MenuItem.get_or_none(id=item_data.menu_item_id, site_id=site_id)
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"菜品ID {item_data.menu_item_id} 不存在")
        
        # 计算单项总价（包含选项价格）
        item_price = float(menu_item.price)
        selected_options = []
        if item_data.selected_options:
            options = await MenuItemOption.filter(
                id__in=item_data.selected_options,
                menu_item_id=menu_item.id
            )
            selected_options = options
            for option in options:
                item_price += float(option.price)
        
        item_total = item_price * item_data.quantity
        total_amount += item_total
        
        order_items.append({
            "menu_item": menu_item,
            "quantity": item_data.quantity,
            "selected_options": selected_options,
            "price": item_total
        })
    
    # 更新订单基本信息
    order.building = building
    order.room_number = order_data.room_number
    order.customer_name = order_data.customer_name
    order.customer_phone = order_data.customer_phone
    order.total_amount = total_amount
    order.delivery_time = order_data.delivery_time
    order.note = order_data.note
    order.is_paid = order_data.is_paid
    order.status = order_data.status
    await order.save()
    
    # 删除原有的订单项
    await OrderItem.filter(order_id=order.id).delete()
    
    # 创建新的订单项
    for item in order_items:
        # 创建订单项
        order_item = await OrderItem.create(
            order=order,
            menu_item=item["menu_item"],
            quantity=item["quantity"],
            price=item["price"]
        )
        # 建立选项的多对多关系
        if item["selected_options"]:
            for option in item["selected_options"]:
                await OrderItemOption.create(
                    order_item=order_item,
                    option=option
                )
    
    return {"message": "订单更新成功"}

@app.delete("/sites/{site_id}/staff/leave")
async def leave_site(
    site_id: int,
    current_user: User = Depends(get_current_user)
):
    print("leave_site", site_id, current_user)
    sys.stdout.flush()  # 强制刷新输出
    # 验证用户是否是该站点的员工
    staff_member = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    if not staff_member:
        raise HTTPException(status_code=403, detail="您不是该站点的员工")

    # 删除员工记录
    await staff_member.delete()
    return {"message": "您已成功退出该站点"}


@app.delete("/sites/{site_id}/staff/{staff_id}")
async def remove_staff(
        site_id: int,
        staff_id: int,
        current_user: User = Depends(get_current_user)
):
    # 验证当前用户是否是站点管理员
    site = await Site.get_or_none(id=site_id, admin=current_user)
    if not site:
        raise HTTPException(status_code=403, detail="您不是该站点的管理员")

    # 删除员工记录
    staff_member = await StaffMember.get_or_none(id=staff_id, site=site)
    if not staff_member:
        raise HTTPException(status_code=404, detail="员工不存在")

    await staff_member.delete()
    return {"message": "员工移除成功"}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("static/favicon.svg")

@app.get("/sites/{site_id}/orders/today-stats")
async def get_today_orders_stats(
    site_id: int,
    current_user: User = Depends(get_current_user)
):
    # 验证用户是否是该站点的成员
    staff = await StaffMember.get_or_none(
        user=current_user,
        site_id=site_id
    )
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    if not (staff and PermissionType.ORDER in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="您没有权限访问该站点")

    # 获取今天的开始时间（0点）和结束时间（23:59:59）
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    # 使用Tortoise ORM查询今日已完成的订单
    completed_orders = await Order.filter(
        site_id=site_id,
        status=DeliveryStatus.COMPLETED,
        delivery_time__gte=today,
        delivery_time__lt=tomorrow
    ).prefetch_related('items')
    
    # 计算总订单数
    total_orders = 0    
    # 计算总金额
    total_amount = 0
    for order in completed_orders:
        total_orders += 1
        for item in order.items:
            total_amount += item.price

    # 返回总订单数和总金额
    return {
        "totalOrders": total_orders,
        "totalAmount": float(total_amount),
    }

@app.get("/sites/{site_id}/orders/monthly-stats")
async def get_monthly_orders_stats(
    site_id: int,
    current_user: User = Depends(get_current_user)
):
    """获取最近30天的订单数据"""
    # 验证用户是否是该站点的成员
    staff = await StaffMember.get_or_none(
        user=current_user,
        site_id=site_id
    )
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    if not (staff and PermissionType.ORDER in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="您没有权限访问该站点")

    # 获取30天前的日期
    thirty_days_ago = datetime.now() - timedelta(days=30)
    thirty_days_ago = thirty_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)

    # 查询最近30天的已完成订单
    completed_orders = await Order.filter(
        site_id=site_id,
        status=DeliveryStatus.COMPLETED,
        delivery_time__gte=thirty_days_ago
    ).prefetch_related('items')

    # 返回订单数据
    return [
        {
            "id": order.id,
            "delivery_time": order.delivery_time.isoformat(),
            "total_amount": str(sum(item.price for item in order.items))
        }
        for order in completed_orders
    ]

@app.put("/user/username")
async def update_username(
    username_data: dict,
    current_user: User = Depends(get_current_user)
):
    """修改用户名"""
    new_username = username_data.get("new_username")
    if not new_username:
        raise HTTPException(status_code=400, detail="新用户名不能为空")
    
    # 检查新用户名是否已存在
    if await User.filter(username=new_username).exists():
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    # 更新用户名
    current_user.username = new_username
    await current_user.save()
    
    return {"message": "用户名修改成功"}

@app.put("/user/password")
async def update_password(
    password_data: dict,
    current_user: User = Depends(get_current_user)
):
    """修改密码"""
    old_password = password_data.get("old_password")
    new_password = password_data.get("new_password")
    
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="密码不能为空")
    
    # 验证旧密码
    if not verify_password(old_password, current_user.password):
        raise HTTPException(status_code=400, detail="当前密码错误")
    
    # 更新密码
    current_user.password = get_password_hash(new_password)
    await current_user.save()
    
    return {"message": "密码修改成功"}

@app.delete("/sites/{site_id}")
async def delete_site(
    site_id: int,
    current_user: User = Depends(get_current_user)
):
    """删除站点（仅管理员可操作）"""
    # 验证用户是否是站点管理员
    site = await Site.get_or_none(id=site_id, admin=current_user)
    if not site:
        raise HTTPException(status_code=403, detail="您不是该站点的管理员")
    
    # 删除站点（关联的数据会自动删除）
    await site.delete()
    return {"message": "站点删除成功"}

@app.get("/sites/{site_id}/orders/item-stats")
async def get_item_order_stats(
    site_id: int,
    current_user: User = Depends(get_current_user)
):
    # 验证用户是否是该站点的成员
    staff = await StaffMember.get_or_none(user=current_user, site_id=site_id)
    site = await Site.get_or_none(id=site_id)
    
    if not site:
        raise HTTPException(status_code=404, detail="站点不存在")
    
    if not (staff and PermissionType.ORDER in staff.permissions) and site.admin_id != current_user.id:
        raise HTTPException(status_code=403, detail="您没有权限访问该站点")

    # 获取今天的开始时间（0点）和结束时间（23:59:59）
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    # 查询未派送的订单（不限时间）和当天已派送的订单
    orders = await Order.filter(
        Q(site_id=site_id, status='ordered') |  # 所有未派送订单
        Q(site_id=site_id, status='delivering') |  # 所有派送中订单
        Q(site_id=site_id, status='completed',  # 当天已完成订单
          delivery_time__gte=today,
          delivery_time__lt=tomorrow)
    ).prefetch_related('items__menu_item')

    item_stats = {}
    for order in orders:
        for item in order.items:
            item_name = item.menu_item.name
            if item_name not in item_stats:
                item_stats[item_name] = {
                    "pending_orders": 0,
                    "delivering_orders": 0,
                    "completed_orders": 0,
                    "pending_amount": 0.0,
                    "delivering_amount": 0.0,
                    "completed_amount": 0.0
                }
            
            # 根据订单状态累加到对应的统计中 因为item.pirce里面已经是计算过总价了,所以不需要再乘以数量
            if order.status == 'ordered':
                item_stats[item_name]["pending_orders"] += item.quantity
                item_stats[item_name]["pending_amount"] += float(item.price)
            elif order.status == 'delivering':
                item_stats[item_name]["delivering_orders"] += item.quantity
                item_stats[item_name]["delivering_amount"] += float(item.price)
            elif order.status == 'completed':
                item_stats[item_name]["completed_orders"] += item.quantity
                item_stats[item_name]["completed_amount"] += float(item.price)

    return item_stats
