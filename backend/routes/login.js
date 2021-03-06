var express = require("express");
var router = express.Router();
var AWS = require("aws-sdk");
const nodemailer = require("nodemailer");
const {
  checkValidEmail,
  checkPassword,
  checkIfAcctExists,
  createForgotPassEmail,
  invalidEmail,
  createAcctSuccess,
  changePasswordSuccess,
  acctExist,
  createAcctdbError,
  changePassDbError,
  resetPassDbError,
  passwordMismatch,
  resetPasswordSuccess,
  userNotExist,
  failSend,
} = require("../tools/loginTools");

AWS.config.update({ region: "us-west-2" });
AWS.config.apiVersion = {
  dynamodb: "latest",
};

const db = new AWS.DynamoDB.DocumentClient();

// Routes
router.post("/checkLogin", checkLogin);
router.post("/createAccount", createAccount);
router.post("/changePassword", changePassword);
router.post("/resetPassword", resetPassword);

// Checks login credentials are correct
function checkLogin(req, res, next) {
  const username = req.body.username;
  const password = req.body.password;

  // Check if username is a valid email address
  if (checkValidEmail(username)) {
    res.status(400);
    res.json({ isLoggedIn: req.match, requestFeedback: invalidEmail });
    return;
  }

  checkPassword(username, password).then((queryRes) => {
    if (!queryRes.isCorrectPassword) {
      res.status(401);
    }
    res.json({
      isLoggedIn: queryRes.isCorrectPassword,
      requestFeedback: queryRes.requestFeedback,
    });
  });
}

function createAccount(req, res, next) {
  const username = req.body.username;
  const password = req.body.password;
  const repeatPassword = req.body.repeatPassword;

  // Check if username is a valid email address
  if (checkValidEmail(username)) {
    res.status(400);
    res.json({ requestFeedback: invalidEmail });
    return;
  }

  // Check if both passwords entered match
  if (password !== repeatPassword) {
    res.status(401);
    res.json({ requestFeedback: passwordMismatch });
    return;
  }
  let addAttribute = {
    TableName: "Users",
    Item: {
      username: "",
      password: "",
    },
  };
  addAttribute.Item.username = username;
  addAttribute.Item.password = password;
  checkIfAcctExists(username).then((acctStatus) => {
    if (acctStatus) {
      res.status(400);
      res.json({ requestFeedback: acctExist });
      return;
    }

    db.put(addAttribute, function (err, data) {
      if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        res.status(500);
        res.json({ requestFeedback: createAcctdbError });
      } else {
        res.json({ requestFeedback: createAcctSuccess });
      }
    });
  });
}

// Used to change the password for the given username with the new password
function changePassword(req, res, next) {
  const username = req.body.username;
  const currPassword = req.body.currPassword; // The current password of the user
  const newPassword = req.body.newPassword; // The new password the user wants to set
  const newRepeatPassword = req.body.newRepeatPassword; // The new password the user wants to set

  // Check if username is a valid email address
  if (checkValidEmail(username)) {
    res.status(400);
    res.json({ isPassChange: false, requestFeedback: invalidEmail });
    return;
  }

  // Check if both passwords entered match
  if (newPassword !== newRepeatPassword) {
    res.status(401);
    res.json({ requestFeedback: passwordMismatch });
    return;
  }

  checkPassword(username, currPassword).then((queryRes) => {
    // If incorrect password send feedback response and alert user that password
    // is incorrect
    if (!queryRes.isCorrectPassword) {
      res.status(401);
      res.json({
        isPassChange: false,
        requestFeedback: queryRes.requestFeedback,
      });
    }

    // Else, put the new password into the database
    else {
      let addAttribute = {
        TableName: "Users",
        Item: {
          username: "",
          password: "",
        },
      };
      addAttribute.Item.username = username;
      addAttribute.Item.password = newPassword;
      db.put(addAttribute, function (err, data) {
        if (err) {
          res.status(500);
          console.error(
            "Unable to query. Error:",
            JSON.stringify(err, null, 2)
          );
          res.json({ isPassChange: false, requestFeedback: changePassDbError });
        } else {
          res.json({
            isPassChange: true,
            requestFeedback: changePasswordSuccess,
          });
        }
      });
    }
  });
}

function resetPassword(req, res, next) {
  const username = req.body.username;

  // Check if username is a valid email address
  if (checkValidEmail(username)) {
    res.status(400);
    res.json({ isPassChange: false, requestFeedback: invalidEmail });
    return;
  }

  let searchParam = {
    TableName: "Users",
    Key: {
      username: "",
    },
  };

  // Get the password from the database and mail it to the user
  searchParam.Key.username = username;
  db.get(searchParam, function (err, data) {
    if (err) {
      res.status(500);
      res.json({ requestFeedback: resetPassDbError });
    } else {
      if (Object.keys(data).length == 0) {
        res.status(400);
        res.json({ requestFeedback: userNotExist });
      } else {
        // create reusable transporter object
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "vcracctreset@gmail.com",
            pass: "VCR1@3movie",
          },
        });

        const messageBody = createForgotPassEmail(username, data.Item.password);

        // Define mail options
        const mailOptions = {
          from: '"vcr-password-reset" <vcracctreset@gmail.com>', // sender address
          to: username, // list of receivers
          subject: "VCR Password Reset", // Subject line
          html: messageBody, // plain text body
        };

        // send mail with defined transport object
        transporter
          .sendMail(mailOptions)
          .then(() => {
            res.json({ requestFeedback: resetPasswordSuccess });
          })
          .catch((err) => {
            res.status(500);
            res.json({ requestFeedback: failSend });
          });
      }
    }
  });
}

module.exports = router;
