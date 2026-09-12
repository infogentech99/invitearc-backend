import nodemailer from 'nodemailer';

const sendEmail = async(email, subject, message)=>{
const transporter = nodemailer.createTransport({
    host:'smtp.gmail.com',
    port:587,
    secure:false,


        family: 4,
        
    connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
    auth:{
        user:process.env.MY_EMAIL,
        pass:process.env.EMAIL_PASSWORD,
    }
});

await transporter.sendMail({
    from:'"InviteArc" <' + process.env.MY_EMAIL + '>',
    to:email,
    subject,
    // text:message
    html: message,
})


}

export default sendEmail;