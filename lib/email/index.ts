import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials not configured. Skipping email send:", subject);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"J.Caesar System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
};

export const sendAdminAlert = async (title: string, message: string, details?: any) => {
  const adminEmail = process.env.ADMIN_EMAIL || "haktanmustafas@gmail.com";
  
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border-radius: 8px; border: 1px solid #efefef;">
      <h2 style="color: #e11d48;">🚨 J.Caesar System Alert</h2>
      <h3 style="color: #18181b;">${title}</h3>
      <p style="color: #52525b; line-height: 1.5;">${message}</p>
      ${details ? `<pre style="background: #f4f4f5; padding: 12px; border-radius: 4px; overflow-x: auto; color: #18181b; font-size: 12px;">${JSON.stringify(details, null, 2)}</pre>` : ''}
      <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
      <p style="font-size: 12px; color: #a1a1aa;">This is an automated system alert from the J.Caesar infrastructure.</p>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `[J.Caesar Alert] ${title}`,
    html,
  });
};
