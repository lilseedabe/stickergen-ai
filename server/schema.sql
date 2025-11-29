-- Database Schema for Credit System

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  credits INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Credit packages
CREATE TABLE credit_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  credits INT NOT NULL,
  price_jpy INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_percentage INT DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default packages
INSERT INTO credit_packages (name, credits, price_jpy, unit_price, discount_percentage, description) VALUES
('お試し', 50, 480, 9.6, 4, '10回生成 = 120個のスタンプ'),
('スターター', 100, 900, 9.0, 10, '20回生成 = 240個のスタンプ'),
('ベーシック', 300, 2400, 8.0, 20, '60回生成 = 720個のスタンプ'),
('プロ', 500, 3750, 7.5, 25, '100回生成 = 1,200個のスタンプ'),
('クリエイター', 1000, 7000, 7.0, 30, '200回生成 = 2,400個のスタンプ');

-- Purchase history
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id INT NOT NULL REFERENCES credit_packages(id),
  credits_purchased INT NOT NULL,
  amount_paid_jpy INT NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit usage history
CREATE TABLE credit_usage (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits_used INT NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'generate_1k' or 'generate_4k'
  stamps_generated INT DEFAULT 12,
  resolution VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit costs (for tracking price changes)
CREATE TABLE credit_costs (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,
  credits_required INT NOT NULL,
  stamps_generated INT DEFAULT 12,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert current costs
INSERT INTO credit_costs (action_type, credits_required, stamps_generated, is_active) VALUES
('generate_1k', 5, 12, TRUE),
('generate_4k', 9, 12, TRUE);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX idx_credit_usage_created_at ON credit_usage(created_at);
