const jwt = require('jsonwebtoken');
const { prisma } = require('../db/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'worksphere-enterprise-ultra-secure-jwt-secret-key-2026-prod';

/**
 * Generate a cryptographically signed JWT token for an authenticated user
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Strict JWT Authentication Middleware
 * 
 * Cryptographically verifies Bearer token on every protected request.
 * Completely rejects unauthenticated callers and does NOT trust spoofed x-user-id headers.
 */
async function authMiddleware(req, res, next) {
  // Public bypass paths
  const originalPath = req.originalUrl.split('?')[0];
  const publicPaths = [
    '/api/health',
    '/api/users/login',
    '/api/users/register',
    '/health',
    '/users/login',
    '/users/register'
  ];

  if (publicPaths.includes(originalPath) || publicPaths.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // Reject missing token
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Missing JWT Bearer authentication token',
      hint: 'Include a valid token in the Authorization: Bearer <token> header'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Look up the active user in the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        created_at: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized: Authenticated user no longer exists in database',
        userId: decoded.userId
      });
    }

    // Attach verified user identity
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or expired JWT token',
      details: err.message
    });
  }
}

module.exports = {
  authMiddleware,
  generateToken,
  JWT_SECRET
};
