const Joi = require("joi");
const validateWith = require("../middleware/validation");
const router = require("express").Router();
const bcrypt = require("bcrypt");
const passwordGenerator = require("generate-password");
const verifyToken = require("../middleware/verifyToken");
const nodemailer = require("nodemailer");
const querystring = require("querystring");
const multer = require("multer");
const fs = require("fs");
const customEmail = require("./email");

const ROLE = require("../config/roleEnum");
const imgHelper = require("../helpers/imageFilter");
const imgStorage = require("../config/storageConfig");

const db = require("../models");
const Login = db.login;
const UserProfile = db.userProfile;

const schema = Joi.object({
  fullName: Joi.string().required(),
  address: Joi.string().required(),
  phone: Joi.string().required(),
  nic: Joi.string().required(),
  dob: Joi.date().required(),
  province: Joi.string().required(),
  district: Joi.string().required(),
  city: Joi.string().required(),
  gender: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  avatar: Joi.any(),
});

const schemaRegisterStep1 = Joi.object({
  nic: Joi.string().required().min(10),
  email: Joi.string().email().required(),
});

const signOutSchema = Joi.object({
  email: Joi.string().email().required(),
});

router.post(
  "/signout",
  verifyToken,
  validateWith(signOutSchema),
  async (req, res) => {
    const { email } = req.body;
    const user = await Login.findOne({ where: { email: email } });
    if (user) {
      //Update status,lastLogin
      user.set({
        lastLogin: Date.now(),
        status: "offline",
      });
      await user.save();
      return res.status(200).send({ data: `${email} Signed out` });
    }
    /*
    cannot manually expire a token after it has been created.
    Thus, you cannot log out with JWT on the server-side as you do with sessions.
    JWT is stateless, meaning that you should store everything you need in the payload
    and skip performing a DB query on every request.
    */
    return res
      .status(400)
      .send({ error: "A user with the given email not exists." });
  }
);

//Sign Up step 01 - admin make account
router.post(
  "/makeAccount/:role",
  validateWith(schemaRegisterStep1),
  async (req, res) => {
    const role = req.params.role;
    const { nic, email } = req.body;

    //Check email already exists
    const lo_res = await Login.findOne({
      where: { email: email },
    });
    if (lo_res)
      return res.status(400).send({
        error: `Account already exits for given email address: ${email}`,
      });
    //Check NIC already exists
    const lo_userP = await UserProfile.findOne({
      where: { nic: nic },
    });
    if (lo_userP)
      return res.status(400).send({
        error: `Account already exits for given NIC: ${nic}`,
      });

    //Genarate random password
    const userPassword = passwordGenerator.generate({
      length: 7,
      numbers: true,
    });

    //Default/Initial avatar
    let imageFile = "uploads\\userempty.png"; //req.file.path;

    //store in Db
    encryptedPassword = await bcrypt.hash(userPassword, 5);
    let uData = {
      userProfile: {
        fullName: "",
        address: "",
        phone: "",
        nic: nic,
        dob: "2000-01-01",
        province: "",
        district: "",
        city: "",
        gender: "",
        login: {
          username: nic,
          email: email,
          password: encryptedPassword,
          role: "",
          avatar: imageFile,
        },
      },
    };

    switch (role) {
      case ROLE.APP_USER:
        uData.userProfile.login.role = ROLE.APP_USER;
        break;
      case ROLE.ADMIN:
        uData.userProfile.login.role = ROLE.ADMIN;
        break;
      default:
        return res.status(400).send({ error: "Error! Invalid user type" });
    }

    //status , lastLogin has default values no need to set here
    //Create user
    newUser = await UserProfile.create(uData.userProfile, {
      include: [Login],
    });

    if (!newUser)
      return res
        .status(400)
        .send({ error: "Error! Server having some trubles" });

    const tempuser = {
      email: email, //Email that send with request.
      name: nic,
      password: userPassword, // tempory password
    };

    /** Two things do before send emails:
       1. Enable Less secure app access 
          https://myaccount.google.com/lesssecureapps

      2.Allow access to your Google account   
          https://accounts.google.com/b/0/DisplayUnlockCaptcha
    */
    sendMail(tempuser, "new-account", "COVID-19 Self-care Account!", (info) => {
      return res.status(200).send({
        data: `Done! ${role} Account Created for ${nic} and email has been sent to ${email}`,
      });
    });
  }
);

// Sign Up step 02 - user continue registration
// OR can use to Update user's details
router.patch("/register", async (req, res) => {
  const upload = multer({
    storage: imgStorage.storage,
    limits: { fileSize: 1024 * 1024 * 5 },
    fileFilter: imgHelper.imageFilter,
  }).single("avatar");

  upload(req, res, async function (err) {
    // req.file contains information of uploaded file
    // req.body contains information of text fields, if there were any

    let imageFile = "uploads\\userempty.png"; //req.file.path;
    let isImagePresent = false;

    if (req.fileValidationError) {
      //*** Uncomment when image is required
      //return res.status(400).send({ error: req.fileValidationError });
    } else if (!req.file) {
      //*** Uncomment when image is required
      //return res
      //  .status(400)
      //  .send({ error: "Please select an image to upload" });
    } else if (err instanceof multer.MulterError) {
      //*** Uncomment when image is required
      // return res.status(400).send({ error: err });
    } else if (err) {
      //*** Uncomment when image is required
      //  return res.status(400).send({ error: err });
    } else {
      imageFile = req.file.path;
      isImagePresent = true;
    }

    const { error, value } = schema.validate({
      fullName: req.body.fullName,
      address: req.body.address,
      phone: req.body.phone,
      nic: req.body.nic,
      dob: req.body.dob,
      province: req.body.province,
      district: req.body.district,
      city: req.body.city,
      gender: req.body.gender,
      email: req.body.email,
      password: req.body.password,
    });
    if (error) return res.status(400).send({ error: error.details[0].message });

    //Check admin make account for this user
    const lo_343 = await UserProfile.findOne({
      where: { nic: req.body.nic },
      attributes: ["id"],
      include: {
        model: Login,
        attributes: ["id", "avatar", "role"],
        where: { email: req.body.email },
      },
    });

    if (!lo_343) {
      //Remove uploaded file from ./uploads folder
      if (req.fileValidationError) {
      } else if (!req.file) {
      } else if (err instanceof multer.MulterError) {
      } else if (err) {
      } else {
        //User provided such image. -> gonna delete
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error(err);
          }
          //file removed success
        });
      }
      return res.status(400).send({
        error: `Acount not found for given NIC: ${req.body.nic} and given email ${req.body.email}`,
      });
    }
    if (isImagePresent && lo_343.login.avatar != "uploads\\userempty.png") {
      //Remove existing file from ./uploads folder
      fs.unlink(lo_343.login.avatar, (err) => {
        if (err) {
          console.error(err);
        }
        //file removed success
      });
    }
    if (
      isImagePresent === false &&
      lo_343.login.avatar != "uploads\\userempty.png"
    ) {
      //Keep existing file secure
      imageFile = lo_343.login.avatar;
    } else {
      // imageFile = "uploads\\userempty.png";
    }

    //store in Db
    // encript new password
    encryptedPassword = await bcrypt.hash(req.body.password, 5);
    let uData = {
      fullName: req.body.fullName,
      address: req.body.address,
      phone: req.body.phone,
      nic: req.body.nic,
      dob: req.body.dob,
      province: req.body.province,
      district: req.body.district,
      city: req.body.city,
      gender: req.body.gender,
      email: req.body.email,
      avatar: imageFile,
    };

    /** Managed transactions (Committing and rolling back the transaction done automatically) : https://sequelize.org/master/manual/transactions.html
     try {

        const result = await sequelize.transaction(async (t) => {

          const user = await User.create({
            firstName: 'Abraham',
            lastName: 'Lincoln'
          }, { transaction: t });

          await user.setShooter({
            firstName: 'John',
            lastName: 'Boothe'
          }, { transaction: t });

          return user;

        });

        // If the execution reaches this line, the transaction has been committed successfully
        // `result` is whatever was returned from the transaction callback (the `user`, in this case)

      } catch (error) {
        // If the execution reaches this line, an error occurred.
        // The transaction has already been rolled back automatically by Sequelize!
      }
     */

    //status , lastLogin has default values no need to set here

    //Begin Unmanaged Transaction (Committing and rolling back the transaction done manually):::::::::::::::::::::::::::::::::::::::::::::
    const t = await db.sequelize.transaction();
    try {
      //Set UserProfile data
      newUserProf = await UserProfile.findOne({
        where: { nic: uData.nic },
      });

      newUserProf.set({
        fullName: uData.fullName,
        address: uData.address,
        phone: uData.phone,
        dob: uData.dob,
        province: uData.province,
        district: uData.district,
        city: uData.city,
        gender: uData.gender,
      });
      await newUserProf.save();

      //Set new Login password
      newUserLog = await Login.findOne({
        where: { email: uData.email },
      });

      newUserLog.set({
        password: encryptedPassword,
        avatar: uData.avatar,
        isActive: true,
      });
      await newUserLog.save();

      if (!newUserLog) {
        await t.rollback(); //End & rollback the transaction.
        return res
          .status(400)
          .send({ error: "Error! Server having some trubles" });
      }

      await t.commit(); // End & commit the transaction.
      const tempuser = {
        email: uData.email, //Email that send with request.
        name: uData.nic,
        password: req.body.password,
      };

      return res.status(200).send({
        data: `${tempuser.email} (${uData.nic}) has been registered as a ${lo_343.login.role}`,
      });
    } catch (error) {
      await t.rollback(); //End & rollback the transaction.
      console.log(error);
      //Remove uploaded file from ./uploads folder
      //code :
      //file removed success
      return res
        .status(400)
        .send({ error: "Error! Data didn`t saved, Try again" });
    }
    // END transaction :::::::::::::::::::::::::::::::::::::::::::::

    /* Simulate slow N/W
      setTimeout(() => { todo()
        }, 1000);
  */
  });
});

router.get("/get", async (req, res) => {
  const users = await UserProfile.findAll({
    attributes: { exclude: ["loginId", "createdAt", "updatedAt"] },
    include: {
      model: Login,
      attributes: { exclude: ["password", "createdAt", "updatedAt"] },
    },
  });

  if (users) res.status(200).send({ data: users });
});

router.get("/get/:id", async (req, res) => {
  const loginId = req.params.id;

  const users = await UserProfile.findOne({
    where: {
      loginId: loginId,
    },
    include: {
      model: Login,
      attributes: { exclude: ["password", "createdAt", "updatedAt"] },
    },
  });
  if (!users) return res.status(400).send({ error: "No any user found." });

  res.status(200).send(users);
});

router.get("/my-user-profile-id/:loginId", async (req, res) => {
  const loginId = req.params.loginId;
  const user = await UserProfile.findOne({
    where: {
      loginId: loginId,
    },
  });
  if (!user) return res.status(400).send({ error: "No any user found." });

  return res.status(200).send({ userProfileId: user.id });
});

router.post("/sendmail", (req, res) => {
  console.log("request came");
  let user = req.body;
  sendMail(user, "e-verify", "Test subject", (info) => {
    console.log(`The mail has beed send 😃 and the id is ${info.messageId}`);
    res.send(info);
  });
});

router.get("/e-verify/:loginId", async (req, res) => {
  const loginId = req.params.loginId;

  const user = await Login.findOne({ where: { id: loginId } });
  if (!user) return res.status(400).send({ error: "Invalid user LoginID" });

  //Update last login
  user.set({
    isActive: 1,
  });

  await user.save();
  return res.status(200).send(customEmail(0, user.name, "", "acc-activated"));
  //return res.status(200).send({ data: `${user.email} Account Activated` });
});

//Forget Password
router.post("/reset-password", async (req, res) => {
  const { email } = req.body;

  const user = await Login.findOne({ where: { email: email } });
  if (!user)
    /*Do not nofify invaid user mail provided, thus,:-*/ return res
      .status(200)
      .send({ data: "Password will be Rest soon...!" });

  const newPsw = passwordGenerator.generate({
    length: 7,
    numbers: true,
  });

  encryptedPws = await bcrypt.hash(newPsw, 4);

  //Update last login
  user.set({
    password: encryptedPws,
    isPasswordReset: true,
  });
  await user.save();

  const tempuser = {
    email: email, //Email that send with request.
    name: user.username,
    password: newPsw, // tempory password
  };

  sendMail(tempuser, "reset-psw", "Password reset succussfully!", (info) => {
    return res.status(200).send({
      data: "password has been reset Succussfully",
    });
  });
});

//Update Password
router.post("/update-password", async (req, res) => {
  const { loginId, oldPsw, newPsw } = req.body;

  const user = await Login.findOne({ where: { id: loginId } });
  if (!user) return res.status(400).send({ data: "Invalid loginID" });

  //Verify old password
  bcrypt.compare(oldPsw, user.password, async (err, result) => {
    if (result === false)
      return res.status(400).send({ error: "Previouse password not valid!" });

    encryptedPws = await bcrypt.hash(newPsw, 4);

    //Update last login
    user.set({
      password: encryptedPws,
      isPasswordReset: false,
    });
    await user.save();

    return res.status(200).send({ data: "Password updated successfully" });
  });
});

async function sendMail(user, mailType, subject, callback) {
  // create reusable transporter object using the default SMTP transport

  /** Two things do before send emails:
     1. Enable Less secure app access 
        https://myaccount.google.com/lesssecureapps

     2.Allow access to your Google account : go following link and press continue  
        https://accounts.google.com/b/0/DisplayUnlockCaptcha
    */
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    secure: true,
    auth: {
      user: "bindilshan255@gmail.com",
      pass: "Binara12345",
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  let mailOptions = {
    from: "bindilshan255@gmail.com", // sender address
    to: user.email, // list of receivers
    subject: subject, // Subject line
    html: customEmail(user.id, user.name, user.password, mailType),
  };

  // send mail with defined transport object
  let info = await transporter.sendMail(mailOptions);

  callback(info);
}

module.exports = router;
