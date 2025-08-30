// SMS Service for sending OTPs
// In production, integrate with SMS gateway like Twilio, MSG91, etc.

const sendOTP = async (phone, otp) => {
  try {
    // For development, just log the OTP
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 SMS to ${phone}: Your GramPulse OTP is ${otp}. Valid for 10 minutes.`);
      return { success: true, message: 'OTP sent successfully' };
    }

    // For production, integrate with actual SMS service
    // Example with a hypothetical SMS service:
    /*
    const response = await fetch('https://api.smsgateway.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMS_API_KEY}`
      },
      body: JSON.stringify({
        to: phone,
        message: `Your GramPulse OTP is ${otp}. Valid for 10 minutes.`
      })
    });

    if (response.ok) {
      return { success: true, message: 'OTP sent successfully' };
    } else {
      throw new Error('Failed to send SMS');
    }
    */

    return { success: true, message: 'OTP sent successfully' };

  } catch (error) {
    console.error('SMS sending error:', error);
    return { success: false, message: 'Failed to send OTP' };
  }
};

module.exports = {
  sendOTP
};
