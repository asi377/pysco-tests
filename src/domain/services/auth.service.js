const User = require('../../models/User');
const AppError = require('../errors/AppError');

class AuthService {
  async register({ fullName, email, password, guestToken, gender }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('این ایمیل قبلاً ثبت شده است', 400, 'EMAIL_EXISTS');
    }

    let user;
    let upgraded = false;

    if (guestToken) {
      const guestUser = await User.findOne({ guestToken, isGuest: true });
      if (!guestUser) {
        throw new AppError('توکن مهمان نامعتبر است', 400, 'INVALID_GUEST_TOKEN');
      }
      guestUser.fullName = fullName;
      guestUser.email = email;
      guestUser.password = password;
      guestUser.isGuest = false;
      guestUser.guestToken = undefined;
      await guestUser.save();
      user = guestUser;
      upgraded = true;
    } else {
      user = await User.create({ fullName, email, password, gender: gender || '' });
    }

    return { user, upgraded };
  }

  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('ایمیل یا رمز عبور اشتباه است', 401, 'INVALID_CREDENTIALS');
    }
    if (user.isGuest) {
      throw new AppError('این حساب یک حساب مهمان است. لطفاً ثبت‌نام کنید', 401, 'GUEST_ACCOUNT');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('ایمیل یا رمز عبور اشتباه است', 401, 'INVALID_CREDENTIALS');
    }

    return user;
  }
}

module.exports = new AuthService();
