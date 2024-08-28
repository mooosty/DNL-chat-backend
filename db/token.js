const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JW_TOKEN, {
    expiresIn: "30d",
  });
};

module.exports = generateToken;
