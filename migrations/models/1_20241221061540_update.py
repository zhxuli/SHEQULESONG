from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "order_item_options" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "option_id" INT NOT NULL REFERENCES "menuitemoption" ("id") ON DELETE CASCADE,
    "order_item_id" INT NOT NULL REFERENCES "orderitem" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_order_item__order_i_ce4cb2" UNIQUE ("order_item_id", "option_id")
) /* 订单项选项关联表 */;;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "order_item_options";"""
