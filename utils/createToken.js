const jwt = require('jsonwebtoken');

const createToken = (payload) =>
  jwt.sign({ userId: payload }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE_TIME,
  });


  const createQrToken = (subscriptionId) => {
  return jwt.sign(
    { subId: subscriptionId },
    process.env.JWT_SECRET_QRKEY,
    { expiresIn: "2m" } // دقيقتين فقط
  );
};


const verifyQrToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_QRKEY);
  } catch (err) {
    return null;
  }
};

module.exports = {createToken, createQrToken, verifyQrToken};