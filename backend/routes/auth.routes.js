const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const {
  registerRules,
  loginRules,
  googleLoginRules,
  telegramLoginRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require("../validators/auth.validator");
const validate = require("../middleware/validate.middleware");
const { requireAuth } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimit.middleware");

router.post(
  "/register",
  authLimiter,
  registerRules,
  validate,
  authController.register,
);
router.post("/login", authLimiter, loginRules, validate, authController.login);
router.post("/logout", authController.logout);
router.get("/me", authController.me);

// Public config for the sign-in buttons (no secrets in these responses)
router.get("/google/config", authController.googleConfig);
router.get("/telegram/config", authController.telegramConfig);

router.post(
  "/google",
  authLimiter,
  googleLoginRules,
  validate,
  authController.google,
);
router.post(
  "/telegram",
  authLimiter,
  telegramLoginRules,
  validate,
  authController.telegram,
);

router.post(
  "/forgot-password",
  authLimiter,
  forgotPasswordRules,
  validate,
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  resetPasswordRules,
  validate,
  authController.resetPassword,
);

module.exports = router;
