const request = require('supertest');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');
let originalDb;

const server = require('./server');

beforeAll(() => {
  originalDb = fs.readFileSync(DB_PATH, 'utf8');
});

afterEach(() => {
  // Restore db to original state after each test to avoid cross-test pollution
  fs.writeFileSync(DB_PATH, originalDb, 'utf8');
});

afterAll(() => {
  fs.writeFileSync(DB_PATH, originalDb, 'utf8');
});

function getDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

const VALID_TOKEN = 'maeve-static-jwt-token-2026';

// ─── Articles CRUD ───────────────────────────────────────────────────────────

describe('GET /api/articles', () => {
  test('returns articles array with count', async () => {
    const res = await request(server).get('/api/articles');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.articles)).toBe(true);
    expect(typeof res.body.articlesCount).toBe('number');
    expect(res.body.articlesCount).toBe(res.body.articles.length);
  });

  test('filters by tag', async () => {
    const res = await request(server).get('/api/articles?tag=desert');
    expect(res.status).toBe(200);
    res.body.articles.forEach((a) => {
      expect(a.tagList).toContain('desert');
    });
  });

  test('filters by author', async () => {
    const res = await request(server).get('/api/articles?author=golfhistorian');
    expect(res.status).toBe(200);
    expect(res.body.articles.length).toBeGreaterThan(0);
    res.body.articles.forEach((a) => {
      expect(a.author.username).toBe('golfhistorian');
    });
  });

  test('filters by favorited', async () => {
    // First favorite an article so there's data to filter on
    await request(server).post('/api/articles/pebble-beach-golf-links/favorite');
    const res = await request(server).get('/api/articles?favorited=true');
    expect(res.status).toBe(200);
    res.body.articles.forEach((a) => {
      expect(a.favorited).toBe(true);
    });
  });

  test('supports limit and offset pagination', async () => {
    const all = await request(server).get('/api/articles');
    const res = await request(server).get('/api/articles?limit=2&offset=1');
    expect(res.status).toBe(200);
    expect(res.body.articles.length).toBe(2);
    // The first article in the paginated response should be the second article overall
    expect(res.body.articles[0].slug).toBe(all.body.articles[1].slug);
  });
});

describe('GET /api/articles/feed', () => {
  test('returns empty feed', async () => {
    const res = await request(server).get('/api/articles/feed');
    expect(res.status).toBe(200);
    expect(res.body.articles).toEqual([]);
    expect(res.body.articlesCount).toBe(0);
  });
});

describe('GET /api/articles/:slug', () => {
  test('returns article by slug', async () => {
    const res = await request(server).get('/api/articles/pebble-beach-golf-links');
    expect(res.status).toBe(200);
    expect(res.body.article).toBeDefined();
    expect(res.body.article.slug).toBe('pebble-beach-golf-links');
    expect(res.body.article.title).toBeTruthy();
  });

  test('returns 404 for unknown slug', async () => {
    const res = await request(server).get('/api/articles/nonexistent-slug-xyz');
    expect(res.status).toBe(404);
    expect(res.body.errors).toBeDefined();
  });
});

describe('POST /api/articles', () => {
  test('creates article with correct slug and author from token', async () => {
    const res = await request(server)
      .post('/api/articles')
      .set('Authorization', `Token ${VALID_TOKEN}`)
      .send({
        article: {
          title: 'My New Test Article',
          description: 'A test description',
          body: 'Test body content',
          tagList: ['test', 'jest'],
        },
      });
    expect(res.status).toBe(201);
    expect(res.body.article.slug).toBe('my-new-test-article');
    expect(res.body.article.title).toBe('My New Test Article');
    expect(res.body.article.author.username).toBe('Maeve_Horseman');
    expect(res.body.article.favorited).toBe(false);
    expect(res.body.article.favoritesCount).toBe(0);
    expect(res.body.article.tagList).toEqual(['test', 'jest']);

    // Verify it's actually persisted in the db
    const db = getDb();
    expect(db.articles[0].slug).toBe('my-new-test-article');
  });
});

describe('DELETE /api/articles/:slug', () => {
  test('removes article by slug', async () => {
    const dbBefore = getDb();
    const countBefore = dbBefore.articles.length;
    const slugToDelete = dbBefore.articles[0].slug;

    const res = await request(server).delete(`/api/articles/${slugToDelete}`);
    expect(res.status).toBe(200);

    const dbAfter = getDb();
    expect(dbAfter.articles.length).toBe(countBefore - 1);
    expect(dbAfter.articles.find((a) => a.slug === slugToDelete)).toBeUndefined();
  });

  test('returns 404 for unknown slug', async () => {
    const res = await request(server).delete('/api/articles/nonexistent-slug-xyz');
    expect(res.status).toBe(404);
    expect(res.body.errors).toBeDefined();
  });
});

// ─── Favorites ───────────────────────────────────────────────────────────────

describe('POST /api/articles/:slug/favorite', () => {
  test('marks article as favorited and increments count', async () => {
    const slug = 'pebble-beach-golf-links';
    const dbBefore = getDb();
    const articleBefore = dbBefore.articles.find((a) => a.slug === slug);
    const countBefore = articleBefore.favoritesCount;

    const res = await request(server).post(`/api/articles/${slug}/favorite`);
    expect(res.status).toBe(200);
    expect(res.body.article.favorited).toBe(true);
    expect(res.body.article.favoritesCount).toBe(countBefore + 1);
  });

  test('returns 404 for unknown slug', async () => {
    const res = await request(server).post('/api/articles/nonexistent-slug/favorite');
    expect(res.status).toBe(404);
    expect(res.body.errors).toBeDefined();
  });
});

describe('DELETE /api/articles/:slug/favorite', () => {
  test('unfavorites article and decrements count', async () => {
    const slug = 'pebble-beach-golf-links';
    // First favorite it
    await request(server).post(`/api/articles/${slug}/favorite`);
    const dbAfterFav = getDb();
    const countAfterFav = dbAfterFav.articles.find((a) => a.slug === slug).favoritesCount;

    // Now unfavorite
    const res = await request(server).delete(`/api/articles/${slug}/favorite`);
    expect(res.status).toBe(200);
    expect(res.body.article.favorited).toBe(false);
    expect(res.body.article.favoritesCount).toBe(countAfterFav - 1);
  });

  test('returns 404 for unknown slug', async () => {
    const res = await request(server).delete('/api/articles/nonexistent-slug/favorite');
    expect(res.status).toBe(404);
    expect(res.body.errors).toBeDefined();
  });
});

// ─── Authentication ──────────────────────────────────────────────────────────

describe('POST /api/users/login', () => {
  test('with valid credentials returns user without password', async () => {
    const res = await request(server)
      .post('/api/users/login')
      .send({ user: { email: 'maeve@example.com', password: 'password123' } });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('maeve@example.com');
    expect(res.body.user.username).toBe('Maeve_Horseman');
    expect(res.body.user.token).toBeTruthy();
    expect(res.body.user.password).toBeUndefined();
  });

  test('with invalid credentials returns 422', async () => {
    const res = await request(server)
      .post('/api/users/login')
      .send({ user: { email: 'maeve@example.com', password: 'wrongpassword' } });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });
});

describe('POST /api/users (register)', () => {
  test('registers new user with token', async () => {
    const res = await request(server)
      .post('/api/users')
      .send({
        user: {
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'secret123',
        },
      });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('newuser@example.com');
    expect(res.body.user.username).toBe('newuser');
    expect(res.body.user.token).toBeTruthy();
    expect(res.body.user.password).toBeUndefined();
  });

  test('returns 422 for duplicate user', async () => {
    const res = await request(server)
      .post('/api/users')
      .send({
        user: {
          email: 'maeve@example.com',
          username: 'Maeve_Horseman',
          password: 'password123',
        },
      });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });
});

describe('GET /api/user', () => {
  test('with valid token returns current user', async () => {
    const res = await request(server)
      .get('/api/user')
      .set('Authorization', `Token ${VALID_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('Maeve_Horseman');
    expect(res.body.user.password).toBeUndefined();
  });

  test('without token returns 401', async () => {
    const res = await request(server).get('/api/user');
    expect(res.status).toBe(401);
    expect(res.body.errors).toBeDefined();
  });
});

describe('PUT /api/user', () => {
  test('updates current user fields', async () => {
    const res = await request(server)
      .put('/api/user')
      .set('Authorization', `Token ${VALID_TOKEN}`)
      .send({ user: { bio: 'Updated bio', username: 'Maeve_Updated' } });
    expect(res.status).toBe(200);
    expect(res.body.user.bio).toBe('Updated bio');
    expect(res.body.user.username).toBe('Maeve_Updated');
    expect(res.body.user.password).toBeUndefined();
  });

  test('without token returns 401', async () => {
    const res = await request(server)
      .put('/api/user')
      .send({ user: { bio: 'Should fail' } });
    expect(res.status).toBe(401);
    expect(res.body.errors).toBeDefined();
  });
});

// ─── Other Endpoints ─────────────────────────────────────────────────────────

describe('GET /api/tags', () => {
  test('returns tags array', async () => {
    const res = await request(server).get('/api/tags');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tags)).toBe(true);
    expect(res.body.tags.length).toBeGreaterThan(0);
  });
});

describe('GET /api/profiles/:username', () => {
  test('returns profile from article authors', async () => {
    const res = await request(server).get('/api/profiles/golfcalifornia');
    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.username).toBe('golfcalifornia');
    expect(res.body.profile.bio).toBeTruthy();
  });

  test('returns default profile for unknown username', async () => {
    const res = await request(server).get('/api/profiles/unknownuser123');
    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.username).toBe('unknownuser123');
    expect(res.body.profile.bio).toBeNull();
    expect(res.body.profile.image).toBeNull();
    expect(res.body.profile.following).toBe(false);
  });
});

describe('GET /api/articles/:slug/comments', () => {
  test('returns empty comments array', async () => {
    const res = await request(server).get('/api/articles/pebble-beach-golf-links/comments');
    expect(res.status).toBe(200);
    expect(res.body.comments).toEqual([]);
  });
});

describe('OPTIONS (CORS preflight)', () => {
  test('returns 200 with CORS headers', async () => {
    const res = await request(server).options('/api/articles');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-methods']).toContain('GET');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-methods']).toContain('DELETE');
    expect(res.headers['access-control-allow-headers']).toContain('Authorization');
  });
});

describe('Unknown route', () => {
  test('returns 404', async () => {
    const res = await request(server).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.errors).toBeDefined();
  });
});
