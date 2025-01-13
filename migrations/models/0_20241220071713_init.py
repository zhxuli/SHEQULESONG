from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "user" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "username" VARCHAR(50) NOT NULL UNIQUE,
    "password" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMP NOT NULL  DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "site" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "wechat" VARCHAR(50),
    "description" TEXT,
    "business_hours" VARCHAR(100),
    "is_open" INT NOT NULL  DEFAULT 1,
    "created_at" TIMESTAMP NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    "admin_id" INT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "community" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(200) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    "site_id" INT NOT NULL REFERENCES "site" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "building" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    "community_id" INT NOT NULL REFERENCES "community" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "menuitem" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price" VARCHAR(40) NOT NULL,
    "description" TEXT,
    "note" TEXT,
    "is_available" INT NOT NULL  DEFAULT 1,
    "created_at" TIMESTAMP NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    "site_id" INT NOT NULL REFERENCES "site" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "menuitemoption" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price" VARCHAR(40) NOT NULL,
    "description" TEXT,
    "is_available" INT NOT NULL  DEFAULT 1,
    "created_at" TIMESTAMP NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    "menu_item_id" INT NOT NULL REFERENCES "menuitem" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "order" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "customer_name" VARCHAR(100) NOT NULL,
    "customer_phone" VARCHAR(20) NOT NULL,
    "total_amount" VARCHAR(40) NOT NULL,
    "delivery_time" TIMESTAMP,
    "note" TEXT,
    "is_paid" INT NOT NULL  DEFAULT 0,
    "status" VARCHAR(10) NOT NULL  DEFAULT 'ordered' /* ORDERED: ordered\nDELIVERING: delivering\nCOMPLETED: completed\nCANCELLED: cancelled */,
    "created_at" TIMESTAMP NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    "room_number" VARCHAR(50) NOT NULL,
    "building_id" INT NOT NULL REFERENCES "building" ("id") ON DELETE CASCADE,
    "deliverer_id" INT REFERENCES "user" ("id") ON DELETE CASCADE,
    "site_id" INT NOT NULL REFERENCES "site" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "orderitem" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "quantity" INT NOT NULL,
    "selected_options" JSON NOT NULL,
    "price" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMP NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    "menu_item_id" INT NOT NULL REFERENCES "menuitem" ("id") ON DELETE CASCADE,
    "order_id" INT NOT NULL REFERENCES "order" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "staffmember" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "role" VARCHAR(5) NOT NULL  DEFAULT 'staff' /* ADMIN: admin\nSTAFF: staff */,
    "permissions" JSON NOT NULL,
    "created_at" TIMESTAMP NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    "site_id" INT NOT NULL REFERENCES "site" ("id") ON DELETE CASCADE,
    "user_id" INT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "aerich" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "version" VARCHAR(255) NOT NULL,
    "app" VARCHAR(100) NOT NULL,
    "content" JSON NOT NULL
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """
