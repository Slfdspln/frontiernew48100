import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

export const TwilioVerify = {
  async sendVerificationCode(phoneNumber) {
    try {
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications
        .create({ 
          to: phoneNumber, 
          channel: 'sms' 
        });
      
      return {
        success: true,
        status: verification.status,
        sid: verification.sid
      };
    } catch (error) {
      console.error('Twilio send verification error:', error);
      throw new Error(`SMS verification failed: ${error.message}`);
    }
  },

  async checkVerificationCode(phoneNumber, code) {
    try {
      const verificationCheck = await client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks
        .create({ 
          to: phoneNumber, 
          code: code 
        });
      
      return {
        success: verificationCheck.status === 'approved',
        status: verificationCheck.status,
        sid: verificationCheck.sid
      };
    } catch (error) {
      console.error('Twilio check verification error:', error);
      throw new Error(`SMS verification check failed: ${error.message}`);
    }
  }
};