const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DB_PATH = path.join(__dirname, 'db.json');
const PORT = 3000;

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return sendJson(res, 200, {});
  }

  const db = readDb();

  // GET /api/articles
  if (pathname === '/api/articles' && method === 'GET') {
    let articles = [...db.articles];
    const query = parsed.query;

    // Filter by tag
    if (query.tag) {
      articles = articles.filter(a => a.tagList.includes(query.tag));
    }
    // Filter by author
    if (query.author) {
      articles = articles.filter(a => a.author.username === query.author);
    }
    // Filter by favorited
    if (query.favorited) {
      articles = articles.filter(a => a.favorited);
    }

    const limit = parseInt(query.limit) || 10;
    const offset = parseInt(query.offset) || 0;

    return sendJson(res, 200, {
      articles: articles.slice(offset, offset + limit),
      articlesCount: articles.length,
    });
  }

  // GET /api/articles/feed
  if (pathname === '/api/articles/feed' && method === 'GET') {
    return sendJson(res, 200, {
      articles: [],
      articlesCount: 0,
    });
  }

  // GET /api/articles/:slug
  const articleMatch = pathname.match(/^\/api\/articles\/([^/]+)$/);
  if (articleMatch && method === 'GET') {
    const slug = decodeURIComponent(articleMatch[1]);
    const article = db.articles.find(a => a.slug === slug);
    if (article) {
      return sendJson(res, 200, { article });
    }
    return sendJson(res, 404, { errors: { article: ['not found'] } });
  }

  // POST /api/articles/:slug/favorite
  const favMatch = pathname.match(/^\/api\/articles\/([^/]+)\/favorite$/);
  if (favMatch && method === 'POST') {
    const slug = decodeURIComponent(favMatch[1]);
    const article = db.articles.find(a => a.slug === slug);
    if (article) {
      article.favorited = true;
      article.favoritesCount++;
      writeDb(db);
      return sendJson(res, 200, { article });
    }
    return sendJson(res, 404, { errors: { article: ['not found'] } });
  }

  // DELETE /api/articles/:slug/favorite
  if (favMatch && method === 'DELETE') {
    const slug = decodeURIComponent(favMatch[1]);
    const article = db.articles.find(a => a.slug === slug);
    if (article && article.favorited) {
      article.favorited = false;
      article.favoritesCount = Math.max(0, article.favoritesCount - 1);
      writeDb(db);
      return sendJson(res, 200, { article });
    }
    if (article) return sendJson(res, 200, { article });
    return sendJson(res, 404, { errors: { article: ['not found'] } });
  }

  // POST /api/articles
  if (pathname === '/api/articles' && method === 'POST') {
    const body = await parseBody(req);
    const articleData = body.article || {};
    const newArticle = {
      slug: (articleData.title || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      title: articleData.title || 'Untitled',
      description: articleData.description || '',
      body: articleData.body || '',
      tagList: articleData.tagList || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorited: false,
      favoritesCount: 0,
      author: (function() {
        const authUser = (function() {
          const authHeader = req.headers['authorization'] || '';
          const token = authHeader.replace('Token ', '');
          if (!token) return null;
          return (db.users || []).find(u => u.token === token) || null;
        })();
        if (authUser) {
          return { username: authUser.username, bio: authUser.bio, image: authUser.image, following: false };
        }
        return { username: 'guest', bio: null, image: 'https://api.dicebear.com/7.x/initials/svg?seed=G', following: false };
      })(),
    };
    db.articles.unshift(newArticle);
    writeDb(db);
    return sendJson(res, 201, { article: newArticle });
  }

  // DELETE /api/articles/:slug
  if (articleMatch && method === 'DELETE') {
    const slug = decodeURIComponent(articleMatch[1]);
    const idx = db.articles.findIndex(a => a.slug === slug);
    if (idx !== -1) {
      db.articles.splice(idx, 1);
      writeDb(db);
      return sendJson(res, 200, {});
    }
    return sendJson(res, 404, { errors: { article: ['not found'] } });
  }

  // GET /api/tags
  if (pathname === '/api/tags' && method === 'GET') {
    return sendJson(res, 200, { tags: db.tags });
  }

  // Helper: find user by token from Authorization header
  function getUserFromToken(req) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Token ', '');
    if (!token) return null;
    return (db.users || []).find(u => u.token === token) || null;
  }

  // POST /api/users/login
  if (pathname === '/api/users/login' && method === 'POST') {
    const body = await parseBody(req);
    const creds = body.user || {};
    const user = (db.users || []).find(
      u => u.email === creds.email && u.password === creds.password
    );
    if (user) {
      const { password, ...safeUser } = user;
      return sendJson(res, 200, { user: safeUser });
    }
    return sendJson(res, 422, { errors: { 'email or password': ['is invalid'] } });
  }

  // POST /api/users (register)
  if (pathname === '/api/users' && method === 'POST') {
    const body = await parseBody(req);
    const userData = body.user || {};
    const existing = (db.users || []).find(
      u => u.email === userData.email || u.username === userData.username
    );
    if (existing) {
      return sendJson(res, 422, { errors: { user: ['already exists'] } });
    }
    const newUser = {
      email: userData.email,
      username: userData.username,
      bio: null,
      image: `https://api.dicebear.com/7.x/initials/svg?seed=${(userData.username || 'U')[0]}`,
      password: userData.password,
      token: `token-${Date.now()}-${Math.random().toString(36).slice(2)}`
    };
    if (!db.users) db.users = [];
    db.users.push(newUser);
    writeDb(db);
    const { password, ...safeUser } = newUser;
    return sendJson(res, 201, { user: safeUser });
  }

  // GET /api/user (current user by token)
  if (pathname === '/api/user' && method === 'GET') {
    const user = getUserFromToken(req);
    if (user) {
      const { password, ...safeUser } = user;
      return sendJson(res, 200, { user: safeUser });
    }
    return sendJson(res, 401, { errors: { user: ['not authenticated'] } });
  }

  // PUT /api/user (update current user)
  if (pathname === '/api/user' && method === 'PUT') {
    const user = getUserFromToken(req);
    if (!user) {
      return sendJson(res, 401, { errors: { user: ['not authenticated'] } });
    }
    const body = await parseBody(req);
    const fields = body.user || {};
    if (fields.email) user.email = fields.email;
    if (fields.username) user.username = fields.username;
    if (fields.bio !== undefined) user.bio = fields.bio;
    if (fields.image !== undefined) user.image = fields.image;
    if (fields.password) user.password = fields.password;
    writeDb(db);
    const { password, ...safeUser } = user;
    return sendJson(res, 200, { user: safeUser });
  }

  // GET /api/profiles/:username
  const profileMatch = pathname.match(/^\/api\/profiles\/([^/]+)$/);
  if (profileMatch && method === 'GET') {
    const username = decodeURIComponent(profileMatch[1]);
    const authorArticle = db.articles.find(a => a.author.username === username);
    if (authorArticle) {
      return sendJson(res, 200, { profile: authorArticle.author });
    }
    return sendJson(res, 200, {
      profile: { username, bio: null, image: null, following: false },
    });
  }

  // GET /api/articles/:slug/comments
  const commentsMatch = pathname.match(/^\/api\/articles\/([^/]+)\/comments$/);
  if (commentsMatch && method === 'GET') {
    return sendJson(res, 200, { comments: [] });
  }

  // Fallback
  sendJson(res, 404, { errors: { message: ['route not found'] } });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Local Conduit API server running at http://localhost:${PORT}`);
    console.log(`Data stored in ${DB_PATH}`);
  });
}

module.exports = server;
