-- Cakes n Bakes 365 schema and seed data

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT,
  whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  subtotal NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique ON products(category_id, name);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);

INSERT INTO categories (name)
VALUES ('Bakery'), ('Fast Food'), ('Snacks'), ('Drinks')
ON CONFLICT DO NOTHING;

-- Bakery items
INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Chocolate Truffle Cake', 'Rich chocolate sponge layered with silky ganache.', 550,
  'https://images.unsplash.com/photo-1542826438-bd32f43d626f?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Bakery'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Red Velvet Cake', 'Classic red velvet with cream cheese frosting.', 600,
  'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Bakery'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Black Forest Cake', 'Chocolate cake with cherries and whipped cream.', 450,
  'https://images.unsplash.com/photo-1505253213348-cee40f0f1ca3?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Bakery'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Fresh Cream Pastry', 'Light vanilla sponge topped with fresh cream.', 80,
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Bakery'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Chocolate Brownie', 'Fudgy brownie with a crackled top.', 120,
  'https://images.unsplash.com/photo-1514517220017-8ce97a34a7b6?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Bakery'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Butter Croissant', 'Flaky, buttery croissant baked fresh daily.', 90,
  'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Bakery'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Assorted Cookies (250g)', 'Crispy butter cookies with choco chips.', 180,
  'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Bakery'
ON CONFLICT DO NOTHING;

-- Fast Food items
INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Classic Veg Burger', 'Loaded veg patty with fresh lettuce and cheese.', 50,
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Cheese Burger', 'Extra cheesy burger with a toasted bun.', 70,
  'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Sandwich', 'Freshly layered sandwich with tangy spread.', 30,
  'https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Grilled Sandwich', 'Golden grilled sandwich with melted cheese.', 90,
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Cheese Pasta', 'Creamy red/white sauce pasta with veggies.', 120,
  'https://images.unsplash.com/photo-1521389508051-d7ffb5dc8d3d?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'French Fries', 'Crispy golden fries with seasoning.', 70,
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Chilly Paneer Gravy', 'Paneer tossed in spicy, tangy gravy.', 240,
  'https://images.unsplash.com/photo-1604909053049-9f8a2d6f6c78?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Manchurian Dry', 'Crispy veg balls in a spicy glaze.', 200,
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Hakka Noodles', 'Wok-tossed noodles with fresh veggies.', 140,
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Fried Rice', 'Aromatic fried rice with herbs.', 120,
  'https://images.unsplash.com/photo-1546069901-5ec6a79120b0?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Chilly Paneer Dry', 'Spicy paneer tossed with peppers and onions.', 220,
  'https://images.unsplash.com/photo-1604909053049-9f8a2d6f6c78?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Manchurian Gravy', 'Veg balls in a tangy gravy.', 220,
  'https://images.unsplash.com/photo-1546069901-5ec6a79120b0?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Manchurian Gravy (Half)', 'Half portion of veg manchurian gravy.', 120,
  'https://images.unsplash.com/photo-1546069901-5ec6a79120b0?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Manchurian Dry (Half)', 'Half portion of veg manchurian dry.', 120,
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Crispy Honey Chilly Potato', 'Crispy potato tossed in honey chilli sauce.', 150,
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Spring Roll', 'Golden spring rolls with veggie filling.', 100,
  'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Chowmein', 'Stir-fried chowmein with veggies.', 100,
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Chowmein (Half)', 'Half portion of veg chowmein.', 60,
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Hakka Noodles (Half)', 'Half portion of veg hakka noodles.', 80,
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Garlic Noodles', 'Garlic-infused noodles with veggies.', 130,
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Garlic Noodles (Half)', 'Half portion of veg garlic noodles.', 80,
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Exotic Hakka Noodles', 'Spicy hakka noodles with exotic veggies.', 150,
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Exotic Hakka Noodles (Half)', 'Half portion of exotic hakka noodles.', 90,
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Fried Rice (Half)', 'Half portion of veg fried rice.', 70,
  'https://images.unsplash.com/photo-1546069901-5ec6a79120b0?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Garlic Fried Rice', 'Garlic fried rice with herbs.', 140,
  'https://images.unsplash.com/photo-1546069901-5ec6a79120b0?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Garlic Fried Rice (Half)', 'Half portion of garlic fried rice.', 80,
  'https://images.unsplash.com/photo-1546069901-5ec6a79120b0?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Fast Food'
ON CONFLICT DO NOTHING;

-- Snacks items
INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Cheese Corn Nuggets (8 pcs)', 'Crunchy nuggets with sweet corn and cheese.', 80,
  'https://images.unsplash.com/photo-1546069901-5ec6a79120b0?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Snacks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Hara Bhara Kebab (8 pcs)', 'Herby, shallow-fried veg kebabs.', 80,
  'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Snacks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Seekh Kebab (3 pcs)', 'Smoky seekh kebabs with mild spices.', 100,
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Snacks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Kurkure Momos (6 pcs)', 'Crispy momos with spicy chutney.', 100,
  'https://images.unsplash.com/photo-1546069901-5ec6a79120b0?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Snacks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Hot & Sour Soup', 'Classic hot and sour soup.', 50,
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Snacks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Veg Sweet Corn Soup', 'Comforting sweet corn soup.', 50,
  'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Snacks'
ON CONFLICT DO NOTHING;

-- Drinks items
INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Cold Coffee', 'Chilled coffee blended with milk.', 70,
  'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Cold Coffee with Ice Cream', 'Thick cold coffee topped with ice cream.', 90,
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Strawberry Shake', 'Creamy strawberry shake made fresh.', 70,
  'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Mango Shake', 'Seasonal mango shake with rich cream.', 80,
  'https://images.unsplash.com/photo-1464306076886-da185f6a7803?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Oreo Shake', 'Chocolatey Oreo shake with cookie crumble.', 80,
  'https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Hot Coffee', 'Freshly brewed hot coffee.', 40,
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Hot Chocolate', 'Velvety hot chocolate.', 80,
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Tea', 'Classic hot tea.', 20,
  'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Mojito', 'Refreshing mint-lime cooler.', 60,
  'https://images.unsplash.com/photo-1455621481073-d5bc1c40e3cb?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Fresh Lime Soda', 'Sparkling lime soda with a zing.', 50,
  'https://images.unsplash.com/photo-1527169402691-feff5539e52c?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;

INSERT INTO products (category_id, name, description, price, image_url)
SELECT id, 'Shikanji', 'Traditional lemon drink with spices.', 50,
  'https://images.unsplash.com/photo-1527169402691-feff5539e52c?auto=format&fit=crop&w=900&q=80'
FROM categories WHERE name = 'Drinks'
ON CONFLICT DO NOTHING;
