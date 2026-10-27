const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret, defineString } = require('firebase-functions/params');
const nodemailer = require('nodemailer');

const smtpHost = defineString('SMTP_HOST');
const smtpPort = defineString('SMTP_PORT', { default: '465' });
const smtpUser = defineString('SMTP_USER');
const smtpPassword = defineSecret('SMTP_PASSWORD');
const recipient = 'ritaawuor53@gmail.com';

function validEmail(value) {
  return typeof value === 'string'
    && value.length <= 160
    && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

exports.emailNewEnquiry = onDocumentCreated(
  { document: 'enquiries/{enquiryId}', secrets: [smtpPassword], retry: false },
  async (event) => {
    const enquiry = event.data && event.data.data();
    if (!enquiry || typeof enquiry.name !== 'string' || !validEmail(enquiry.email)
      || typeof enquiry.message !== 'string') {
      console.warn('Skipped email for invalid enquiry', event.params.enquiryId);
      return;
    }

    const port = Number(smtpPort.value());
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('SMTP_PORT must be a valid port number.');
    }

    const transport = nodemailer.createTransport({
      host: smtpHost.value(),
      port,
      secure: port === 465,
      auth: { user: smtpUser.value(), pass: smtpPassword.value() }
    });
    const lines = [
      'A new general enquiry was submitted through the Vineyard Children\'s Home website.',
      '',
      `Name: ${enquiry.name}`,
      `Email: ${enquiry.email}`,
      `Telephone: ${typeof enquiry.phone === 'string' ? enquiry.phone : 'Not provided'}`,
      `Topic: ${typeof enquiry.interest === 'string' ? enquiry.interest : 'Not provided'}`,
      '',
      'Message:',
      enquiry.message,
      '',
      `Enquiry reference: ${event.params.enquiryId}`
    ];

    await transport.sendMail({
      from: smtpUser.value(),
      to: recipient,
      replyTo: enquiry.email,
      subject: 'New website enquiry - Vineyard Children\'s Home',
      text: lines.join('\n')
    });
    console.info('Email notification sent for enquiry', event.params.enquiryId);
  }
);
