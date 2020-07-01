/* -------- 🎃 Any client accessing this route is implicitly a guest,-----
-------- hence eliminating the need for user role 🎃 --------- */

const User = require('../models/user');
const userRouter = require('express').Router();
const { registerValidation, loginValidation } = require('../utils/validation/joiValidation');
const {createVerificationLink} = require('../utils/EmailVerification');
const { auth, authorizeUser } = require('../utils/middleware');



userRouter.get('/active', auth, (req, res) => {
  res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.isAdmin,
    isAuth: true,
    isVerified: req.user.isEmailVerified,
    email: req.user.email,
    username: req.user.username,
  });
});

userRouter.post('/register', registerValidation(), async (request, response) => {
  // Register as guest
  const { email } = request.body;

  // Check if user email is taken in DB
  let user = await User.findOne({ email });

  if (user) {
    return response.status(403).json({
      success: false,
      message: 'Email address already in use',
    });
  }

  user = new User({ ...request.body });
  user = await user.save();

  // Send a confirmation link to email
  const mailStatus = await createVerificationLink(user, request);
  console.log(mailStatus);

  return response.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { ...user.toJSON() },
  });
});

userRouter.post("/login", loginValidation(), (req, res) => {
    User.findOne({ email: req.body.email }, (err, user) => {
        if (!user)
            return res.json({
                loginSuccess: false,
                message: "Auth failed, email not found"
            });

        user.comparePassword(req.body.password, (err, isMatch) => {
            if (!isMatch)
                return res.json({ loginSuccess: false, message: "Wrong password" });

            user.generateToken((err, user) => {
                if (err) return res.status(400).send(err);
                res.cookie("w_authExp", user.tokenExp);
                res
                    .cookie("w_auth", user.token)
                    .status(200)
                    .json({
                        loginSuccess: true, userId: user._id
                    });
            });
        });
    });
});

userRouter.get("/logout", auth, (req, res) => {
    User.findOneAndUpdate({ _id: req.user._id }, { token: "", tokenExp: "" }, (err, doc) => {
        if (err) return res.json({ success: false, err });
        return res.status(200).send({
            success: true,
            message: "successfully logged you out"
        });
    });
});

module.exports = userRouter;
