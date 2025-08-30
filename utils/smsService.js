import { TwilioVerify } from './twilioClient.js';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export const SMS = {
  async sendGuestInvitation(phoneNumber, guestName, hostName, completionLink, visitDate) {
    try {
      const message = `Hi ${guestName}! ${hostName} invited you to visit Frontier Tower on ${visitDate}. Complete your registration: ${completionLink}`;
      
      const result = await client.messages.create({
        body: message,
        to: phoneNumber,
        from: '+15109746838' // Your Twilio phone number
      });
      
      return {
        success: true,
        sid: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('SMS guest invitation error:', error);
      throw new Error(`Failed to send SMS invitation: ${error.message}`);
    }
  },

  async sendVerificationCode(phoneNumber) {
    return TwilioVerify.sendVerificationCode(phoneNumber);
  },

  async checkVerificationCode(phoneNumber, code) {
    return TwilioVerify.checkVerificationCode(phoneNumber, code);
  }
};