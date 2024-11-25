require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { EMAIL, JWT_SECRET, PASSWORD } = process.env;




const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    auth: {
        user: EMAIL,
        pass: PASSWORD
    }
})


exports.handleRegister = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await prisma.user.create({
            data: {
                name: name,
                email: email,
                password: password,
            },
        });

        const io = require('../app');

        io.emit('newNotification', { message: `Pengguna ${user.email} telah mendaftar!` });

        const message = 'User created successfully';
        return res.status(200).render('confirm', { message });
    } catch (error) {
        console.log(error);
    }
}

exports.handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: {
                email: email,
            },
        });
        if (!user) {
            return res.status(404).json({ message: 'Invalid email or password' });
        }
        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const token = jwt.sign({
            id: user.id,
            email: user.email
        }, JWT_SECRET, { expiresIn: '1h' });

        res.cookie('loginToken', token, {
            httpOnly: true,
            maxAge: 3600000,
        });

        const io = require('../app');

        io.emit('newNotification', { message: `Pengguna ${user.email} telah login!` });


        return res.status(200).redirect('/auth');

    } catch (error) {
        console.log(error);
    }
}

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await prisma.user.findUnique({
            where: {
                email: email,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = jwt.sign({
            id: user.id,
            email: user.email
        }, JWT_SECRET, { expiresIn: '1h' });
        const link = `http://localhost:3000/reset-password?token=${token}`;
        const mailOptions = {
            from: EMAIL,
            to: email,
            subject: 'Reset Password',
            html: `
                <h3>Reset Password</h3>
                <p>Klik link berikut untuk melakukan reset</p>
                <a href="${link}">Klik disini</a>
                <p>atau</p>
                <a href="${link}">${link}</a>
            `,
        };

        const sendMail = await transporter.sendMail(mailOptions);

        if (sendMail) {
            const io = require('../app');

            io.emit('newNotification', { message: `Email berhasil dikirim ke ${user.email} ` });
        }

        res.cookie('resetToken', token, {
            httpOnly: true,
            maxAge: 3600000,
        });

        return res.status(200).render('confirm', { message: 'Please check your email to reset your password' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'An error occurred' });
    }
};

exports.handleToken = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).render('confirm', { message: 'Token dibutuhkan' });
        }

        const verify = jwt.verify(token, JWT_SECRET);

        if (!verify) {
            return res.status(401).render('confirm', { message: 'Unauthorized' })
        }

        res.render('reset');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
    }
};


exports.handleResetPassword = async (req, res) => {
    try {
        const token = req.cookies.resetToken;
        const { password, confirmPassword } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        if (!password || !confirmPassword) {
            return res.status(400).json({ message: 'Password and confirm password are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Password and confirm password do not match' });
        }

        let decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        const user = await prisma.user.findUnique({
            where: {
                id: decoded.id,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const reset = await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                password: password,
            },
        });

        if (reset) {
            const mailOptions = {
                from: EMAIL,
                to: decoded.email,
                subject: 'Password Reset Successful',
                html: `
                    <h3>Password Reset Successful</h3>
                `,
            };

            await transporter.sendMail(mailOptions);
        }

        if (reset) {
            const io = require('../app');

            io.emit('newNotification', { message: `Password berhasil direset untuk ${user.email} ` });
        }

        res.clearCookie('resetToken');

        return res.status(200).redirect('/login')
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'An error occurred' });
    }
};
