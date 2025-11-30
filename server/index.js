const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const creditRoutes = require('./routes/credits');
const packageRoutes = require('./routes/packages');
const stripeRoutes = require('./routes/stripe');
const generateRoutes = require('./routes/generate'); // ← 追加

const app = express();
app.set('trust proxy', 1); // nginx経由のアクセスを信頼

// Stripe webhook requires raw body, so we need to handle it before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeRoutes);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  validate: { xForwardedForHeader: false } // nginx経由のため無効化
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/generate', generateRoutes); // ← 追加

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Purchase redirect handler
app.get('/purchase', (req, res) => {
  const { success, session_id, canceled } = req.query;

  // 本番環境では本番URLを使用
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://l-stickergen.iodo.co.jp'
    : 'http://localhost:3000';

  if (success && session_id) {
    // Redirect to frontend with success message
    res.redirect(`${baseUrl}?purchase=success&session_id=${session_id}`);
  } else if (canceled) {
    // Redirect to frontend with cancellation message
    res.redirect(`${baseUrl}?purchase=canceled`);
  } else {
    // Invalid request
    res.redirect(baseUrl);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});