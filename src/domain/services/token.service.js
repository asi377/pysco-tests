const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../../models/RefreshToken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const TOKEN_EXPIRY_GUEST = '7d';
const TOKEN_EXPIRY_ADMIN = '1h';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

class TokenService {
  signAccessToken(user, type) {
    let payload;
    let expiresIn;

    if (type === 'guest') {
      payload = { guestToken: user.guestToken, type: 'guest' };
      expiresIn = TOKEN_EXPIRY_GUEST;
    } else {
      payload = { id: user._id, type: 'user' };
      expiresIn = ACCESS_TOKEN_EXPIRY;
    }

    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  signAdminToken() {
    return jwt.sign(
      { id: 'admin_hardcoded', type: 'user', role: 'admin' },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY_ADMIN },
    );
  }

  async signAndStoreRefreshToken(user) {
    const payload = { id: user._id, type: 'refresh' };
    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    return refreshToken;
  }
}

module.exports = new TokenService();
