require('dotenv').config();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.loginToken;

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const verify = jwt.verify(token, JWT_SECRET);

        if (verify) {
            const io = require('../app');

            io.emit('newNotification', { message: `Authenticated: ${verify.email}` });

        }

        if (!verify) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.user = verify;
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = auth;
