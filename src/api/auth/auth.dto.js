class RegisterDTO {
  constructor(body) {
    this.fullName = body.fullName?.trim();
    this.email = body.email?.trim().toLowerCase();
    this.password = body.password;
    this.guestToken = body.guestToken;
    this.gender = body.gender || '';
  }

  validate() {
    const errors = [];

    if (!this.fullName || this.fullName.length < 3) {
      errors.push('نام باید حداقل ۳ کاراکتر باشد');
    }

    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('ایمیل نامعتبر است');
    }

    if (!this.password || this.password.length < 8) {
      errors.push('رمز عبور باید حداقل ۸ کاراکتر باشد');
    } else {
      if (!/[A-Za-z]/.test(this.password)) {
        errors.push('رمز عبور باید حداقل یک حرف انگلیسی داشته باشد');
      }
      if (!/[0-9]/.test(this.password)) {
        errors.push('رمز عبور باید حداقل یک عدد داشته باشد');
      }
    }

    return errors;
  }
}

class LoginDTO {
  constructor(body) {
    this.email = body.email?.trim().toLowerCase();
    this.password = body.password;
  }

  validate() {
    const errors = [];

    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('ایمیل نامعتبر است');
    }

    if (!this.password) {
      errors.push('رمز عبور الزامی است');
    }

    return errors;
  }
}

module.exports = { RegisterDTO, LoginDTO };
