
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_KEY);

const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const msg = {
            to,
            from: process.env.SENDGRID_FROM_EMAIL, 
            subject,
            text,
            html: html || text
        };

        const response = await sgMail.send(msg);
        console.log('Email sent:', response[0].statusCode);
        return response;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = { sendEmail };
