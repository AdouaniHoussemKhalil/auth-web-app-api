import { Recipient } from "./models/recipient";
const nodemailer = require("nodemailer");
const config = require("config");

export const sendMailAsync = async (
  recipient: Recipient,
  resetCode: string
) => {
  const smtp = config.get("email.smtp");
  const emailInfos = config.get("email.info");

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.auth.user,
      pass: smtp.auth.pass,
    },
  });

  const getHtml = (recipientFullName: string, resetCode: string): string => {
    const html = `
      <div style=${emailInfos.image}>
        <img src="https://cdn.pixabay.com/photo/2017/04/10/12/18/castle-2218358_1280.jpg" alt="Logo" style="width: 100px; height: auto; display: block; margin-bottom: 20px;">
        <h3>Bonjour ${recipientFullName},</h3>
        <p>Pour confirmer votre mot de passe, vous pouvez utiliser ce code de confirmation :</p>
        <p style="font-size: 18px; font-weight: bold;">Code de confirmation: <strong>${resetCode}</strong></p>
      </div>
    `;
    return html;
  };

  const info = await transporter.sendMail({
    from: "",
    to: recipient.email,
    subject: emailInfos.subject,
    html: getHtml(recipient.fullName, resetCode),
  });

  console.log(info, "... sent mail to : ", recipient.email);
};
