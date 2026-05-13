const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const memberRoutes = require('./routes/member.routes');

dotenv.config();
initDb();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:8100',
    'http://localhost:4200',
    /\.netlify\.app$/,
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'fitness-tracker-api' });
});

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/user', memberRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
