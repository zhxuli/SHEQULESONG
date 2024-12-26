from typing import Optional, List
from pydantic import BaseModel
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"

class PermissionType(str, Enum):
    ORDER = "ORDER"          # 接单权限
    DELIVERY = "DELIVERY"    # 配送权限
    ORDER_MANAGE = "ORDER_MANAGE"    # 订单管理权限
    MENU_MANAGE = "MENU_MANAGE"      # 菜单管理权限
    ADDRESS_MANAGE = "ADDRESS_MANAGE" # 地址管理权限

class DeliveryStatus(str, Enum):
    ORDERED = "ordered"
    DELIVERING = "delivering"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class SiteCreate(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    wechat: Optional[str] = None

class SiteUpdate(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    wechat: Optional[str] = None
    description: Optional[str] = None  # 站点简介
    business_hours: Optional[str] = None  # 营业时间
    is_open: bool = True  # 营业状态

class StaffCreate(BaseModel):
    username: str
    permissions: List[PermissionType]

class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int
    selected_options: List[int] = []

class OrderCreate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    building_id: int
    room_number: str
    delivery_time: Optional[datetime] = None
    note: Optional[str] = None
    is_paid: bool = False
    status: DeliveryStatus = DeliveryStatus.ORDERED  # 添加状态字段
    items: List[OrderItemCreate]

class OrderUpdate(BaseModel):
    status: DeliveryStatus

class CommunityCreate(BaseModel):
    name: str
    address: str
    note: Optional[str] = None

class CommunityUpdate(BaseModel):
    name: str
    address: str
    note: Optional[str] = None

class BuildingCreate(BaseModel):
    name: str
    note: Optional[str] = None

class BuildingBatchCreate(BaseModel):
    start_num: int
    end_num: int
    suffix: str = "号楼"  # 默认后缀
    note: Optional[str] = None

class BuildingUpdate(BaseModel):
    name: str
    note: Optional[str] = None

class MenuItemOptionCreate(BaseModel):
    name: str
    price: float
    description: Optional[str] = None

class MenuItemOptionUpdate(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    is_available: bool

class MenuItemCreate(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    note: Optional[str] = None
    options: Optional[List[MenuItemOptionCreate]] = None

class MenuItemUpdate(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    note: Optional[str] = None
    is_available: bool
    options: Optional[List[MenuItemOptionCreate]] = None
  