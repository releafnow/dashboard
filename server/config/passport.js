const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');

// Only initialize Google OAuth strategy if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this Google ID
          let userResult = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);

          if (userResult.rows.length > 0) {
            return done(null, userResult.rows[0]);
          }

          // Check if user exists with this email
          userResult = await pool.query('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);

          if (userResult.rows.length > 0) {
            // Update existing user with Google ID
            await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, userResult.rows[0].id]);
            return done(null, userResult.rows[0]);
          }

          // Create new user
          const newUserResult = await pool.query(
            'INSERT INTO users (email, name, google_id, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [profile.emails[0].value, profile.displayName, profile.id, 'member']
          );

          return done(null, newUserResult.rows[0]);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log('✅ Google OAuth strategy configured');
} else {
  console.log('⚠️  Google OAuth not configured (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing)');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;





