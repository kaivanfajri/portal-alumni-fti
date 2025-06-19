// index.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// ==== Middleware umum ====
app.use(helmet());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));

// ==== Security Middleware ===
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdn.tailwindcss.com', 'https://cdnjs.cloudflare.com'],
                scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdn.tailwindcss.com'],
                'script-src-attr': ["'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                fontSrc: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
            },
        },
    })
);

// ==== Session config ====
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'portalalumni_secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // true jika pakai https
            maxAge: 1000 * 60 * 60 * 2, // 2 jam
        },
    })
);

// ==== Rate Limiter (optional) ====
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // maksimal 100 request per IP
});
app.use(limiter);

// ==== View engine ====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==== Static folder ====
app.use(express.static(path.join(__dirname, 'public')));

// ==== Route imports ====
const alumniRoutes = require('./routes/alumniRoutes');
const adminRoutes = require('./routes/adminRoutes');
// ...tambahkan lainnya sesuai kebutuhan
// const beritaRoutes = require('./routes/beritaRoutes'); dll

// ==== Route handlers ====
app.use('/', alumniRoutes);
app.use('/alumni', alumniRoutes);
app.use('/admin', adminRoutes);
// app.use('/berita', beritaRoutes); dst

// ==== Halaman default ====
app.get('/', (req, res) => {
    res.render('index', { title: 'Portal Alumni' });
});

// 404 Handler - halaman tidak ditemukan
app.use((req, res, next) => {
    const error = new Error(`Halaman ${req.originalUrl} tidak ditemukan`);
    error.status = 404;
    next(error);
});

// Error Handler
app.use((err, req, res, next) => {
    // Set default error values
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Terjadi Kesalahan Internal Server';

    // Log error untuk debugging (optional)
    if (status === 500) {
        console.error('Server Error:', err);
    }

    // Set status code
    res.status(status);

    // Render error page dengan data yang diperlukan
    res.render('error', {
        title: `Error ${status}`,
        status: status,
        message: message,
        error: process.env.NODE_ENV !== 'production' ? err : {},
        stack: process.env.NODE_ENV !== 'production' ? err.stack : null,
    });
});

// ==== Start server ====
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
