from tortoise import fields, models
from enum import Enum
from tortoise.contrib.pydantic import pydantic_model_creator
from typing import List
from schemas import UserRole, PermissionType, DeliveryStatus

class User(models.Model):
    id = fields.IntField(pk=True)
    username = fields.CharField(max_length=50, unique=True)
    password = fields.CharField(max_length=128)
    created_at = fields.DatetimeField(auto_now_add=True)

class Site(models.Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=100)
    address = fields.CharField(max_length=255)
    phone = fields.CharField(max_length=20, null=True)
    wechat = fields.CharField(max_length=50, null=True)
    description = fields.TextField(null=True)  # 站点简介
    business_hours = fields.CharField(max_length=100, null=True)  # 营业时间
    is_open = fields.BooleanField(default=True)  # 营业状态
    admin = fields.ForeignKeyField('models.User', related_name='owned_sites')
    created_at = fields.DatetimeField(auto_now_add=True)

class StaffMember(models.Model):
    id = fields.IntField(pk=True)
    user = fields.ForeignKeyField('models.User', related_name='staff_memberships')
    site = fields.ForeignKeyField('models.Site', related_name='staff_members')
    role = fields.CharEnumField(UserRole, default=UserRole.STAFF)
    permissions = fields.JSONField()  # 存储权限列表
    created_at = fields.DatetimeField(auto_now_add=True)

class OrderItem(models.Model):
    id = fields.IntField(pk=True)
    order = fields.ForeignKeyField('models.Order', related_name='items')
    menu_item = fields.ForeignKeyField('models.MenuItem', related_name='order_items')
    quantity = fields.IntField()
    selected_options = fields.JSONField(default=[])  # 存储选中的选项ID列表
    price = fields.DecimalField(max_digits=10, decimal_places=2)  # 单项总价（包含选项价格）
    created_at = fields.DatetimeField(auto_now_add=True)

class Order(models.Model):
    id = fields.IntField(pk=True)
    site = fields.ForeignKeyField('models.Site', related_name='orders')
    building = fields.ForeignKeyField('models.Building', related_name='orders')  # 楼栋信息
    customer_name = fields.CharField(max_length=100)  # 客户姓名
    customer_phone = fields.CharField(max_length=20)  # 客户电话
    total_amount = fields.DecimalField(max_digits=10, decimal_places=2)  # 订单总金额
    delivery_time = fields.DatetimeField(null=True)  # 预约配送时间
    note = fields.TextField(null=True)  # 备注
    is_paid = fields.BooleanField(default=False)  # 是否已付款
    status = fields.CharEnumField(DeliveryStatus, default=DeliveryStatus.ORDERED)
    deliverer = fields.ForeignKeyField('models.User', null=True, related_name='deliveries')
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    room_number = fields.CharField(max_length=50)  # 添加房号字段

class Community(models.Model):
    id = fields.IntField(pk=True)
    site = fields.ForeignKeyField('models.Site', related_name='communities')
    name = fields.CharField(max_length=100)  # 小区名称
    address = fields.CharField(max_length=200)  # 小区地址
    note = fields.TextField(null=True)  # 备注
    created_at = fields.DatetimeField(auto_now_add=True)

class Building(models.Model):
    id = fields.IntField(pk=True)
    community = fields.ForeignKeyField('models.Community', related_name='buildings')
    name = fields.CharField(max_length=100)  # 楼栋名称，如"29号楼"
    note = fields.TextField(null=True)  # 备注
    created_at = fields.DatetimeField(auto_now_add=True)

class MenuItem(models.Model):
    id = fields.IntField(pk=True)
    site = fields.ForeignKeyField('models.Site', related_name='menu_items')
    name = fields.CharField(max_length=100)  # 菜品名称
    price = fields.DecimalField(max_digits=10, decimal_places=2)  # 价格
    description = fields.TextField(null=True)  # 描述
    note = fields.TextField(null=True)  # 备注
    is_available = fields.BooleanField(default=True)  # 是否可用
    created_at = fields.DatetimeField(auto_now_add=True)

class MenuItemOption(models.Model):
    id = fields.IntField(pk=True)
    menu_item = fields.ForeignKeyField('models.MenuItem', related_name='options')
    name = fields.CharField(max_length=100)  # 选项名称，如"加蛋"
    price = fields.DecimalField(max_digits=10, decimal_places=2)  # 额外价格
    description = fields.TextField(null=True)  # 描述
    is_available = fields.BooleanField(default=True)  # 是否可用
    created_at = fields.DatetimeField(auto_now_add=True)

class PermissionType(str, Enum):
    ORDER = "ORDER"          # 接单权限
    DELIVERY = "DELIVERY"    # 配送权限
    ORDER_MANAGE = "ORDER_MANAGE"    # 订单管理权限
    MENU_MANAGE = "MENU_MANAGE"      # 菜单管理权限
    ADDRESS_MANAGE = "ADDRESS_MANAGE" # 地址管理权限

class OrderItemOption(models.Model):
    """订单项选项关联表"""
    order_item = fields.ForeignKeyField('models.OrderItem', related_name='item_options')
    option = fields.ForeignKeyField('models.MenuItemOption', related_name='order_items')

    class Meta:
        table = "order_item_options"
        unique_together = (("order_item", "option"),)