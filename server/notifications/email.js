const nodemailer = require('nodemailer');
require('dotenv').config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@zenrix.com';

let transporter;
function createTransporter(){
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_PORT) return null;
  transporter = nodemailer.createTransport({ host: SMTP_HOST, port: parseInt(SMTP_PORT,10), secure: SMTP_PORT == 465, auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined });
  return transporter;
}

async function sendMail(opts){
  const t = createTransporter();
  if (!t) return Promise.reject(new Error('SMTP not configured'));
  return t.sendMail(opts);
}

async function sendTicketConfirmation(ticket){
  const t = createTransporter();
  if (!t) return Promise.resolve(); // silently skip if no SMTP
  const to = ticket.guestEmail || (ticket.user && ticket.user.email) || null;
  if (!to) return Promise.resolve();
  const subject = `Zenrix Support: Ticket received (${ticket._id})`;
  const text = `Hi ${ticket.guestName || ''},\n\nWe've received your support request. Our team will get back to you soon. Ticket ID: ${ticket._id}\n\nSubject: ${ticket.subject}\n\nMessage: ${ticket.messages && ticket.messages[0] && ticket.messages[0].message}\n\nThanks,\nZenrix Support Team`;
  return sendMail({ from: EMAIL_FROM, to, subject, text });
}

module.exports = { sendMail, sendTicketConfirmation };
