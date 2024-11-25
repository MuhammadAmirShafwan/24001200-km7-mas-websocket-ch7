require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;
const socketIo = require('socket.io');
const path = require('path');
const router = require('./routes/index');
const cookieParser = require('cookie-parser');
const http = require('http');
const server = http.createServer(app);
const io = socketIo(server);

app.use(cookieParser());
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN tidak diatur. Pastikan Anda memiliki DSN untuk menggunakan Sentry.');
} else {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            new Tracing.Integrations.Express({ app }),
        ],
        tracesSampleRate: 1.0,
    });

    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}

app.use(express.static(path.join(__dirname, 'public')));

app.use(router);

app.set('views', path.join(__dirname, 'views'));

app.use(Sentry.Handlers.errorHandler());

server.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    socket.on('sendNotification', (data) => {
        try {
            io.emit('notification', data);
        } catch (error) {
            Sentry.captureException(error);
            console.error('Error in sendNotification:', error);
        }
    });
});


module.exports = io;