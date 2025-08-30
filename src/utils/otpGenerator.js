// Generate a 6-digit OTP
const generateOTP = () => {
  // For development, return a fixed OTP
  if (process.env.NODE_ENV === 'development') {
    return '123456';
  }
  
  // For production, generate random OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = {
  generateOTP
};
