import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e) - Complete Security Matrix', () => {
  let app: INestApplication;

  // --- ACTORS ---
  let adminToken: string;
  let ownerToken: string;
  let hackerToken: string;

  // --- DATA IDs ---
  let ownerUserId: number;
  let tagId: number;
  let snippetId: string;

  // --- DYNAMIC DATA ---
  const timestamp = Date.now();
  const uniqueTag = `final-tag-${timestamp}`;

  // 1. Define Users
  // Note: We assume your CreateUserDto allows passing 'role'. 
  // If not, you'd need to manually set the Admin role in the DB.
  const adminUser = { username: `khetadmin`, password: 'adminkhet123'};
  const ownerUser = { username: `owner_${timestamp}`, password: 'password123' };
  const hackerUser = { username: `hacker_${timestamp}`, password: 'password123' };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  // =================================================================
  // 1. AUTHENTICATION (Register & Login)
  // =================================================================
  describe('1. Auth: Register & Login (All Roles)', () => {
    it('POST /auth/register - Create Admin, Owner, Hacker', async () => {
      // await request(app.getHttpServer()).post('/api/auth/register').send(adminUser).expect(201);
      await request(app.getHttpServer()).post('/api/auth/register').send(ownerUser).expect(201);
      await request(app.getHttpServer()).post('/api/auth/register').send(hackerUser).expect(201);
    });

    it('POST /auth/login - Get Tokens', async () => {
      // Admin
      const aRes = await request(app.getHttpServer()).post('/api/auth/login').send(adminUser).expect(201);
      adminToken = aRes.body.access_token || aRes.body.accessToken;

      // Owner
      const oRes = await request(app.getHttpServer()).post('/api/auth/login').send(ownerUser).expect(201);
      ownerToken = oRes.body.access_token || oRes.body.accessToken;
      ownerUserId = oRes.body.user.id;

      // Hacker
      const hRes = await request(app.getHttpServer()).post('/api/auth/login').send(hackerUser).expect(201);
      hackerToken = hRes.body.access_token || hRes.body.accessToken;
    });
  });

  // =================================================================
  // 2. TAGS (Global Data - Admin Managed)
  // =================================================================
  describe('2. Tags Endpoints', () => {
    it('POST /tags - Guest blocked (401)', () => {
      return request(app.getHttpServer()).post('/api/tags').send({ name: 'fail' }).expect(401);
    });

    it('POST /tags - Owner Creates Tag (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: uniqueTag })
        .expect(201);
      tagId = res.body.id;
    });

    it('GET /tags - Public Access (200)', () => {
      return request(app.getHttpServer()).get('/api/tags').expect(200);
    });

    it('GET /tags/:id - Public Access (200)', () => {
      return request(app.getHttpServer()).get(`/api/tags/${tagId}`).expect(200);
    });

    // 🔴 PATCH /tags/:id (You were worried about missing this)
    it('PATCH /tags/:id - Guest blocked (401)', () => {
       return request(app.getHttpServer()).patch(`/api/tags/${tagId}`).send({ name: 'fail' }).expect(401);
    });

    it('PATCH /tags/:id - Owner Updates (200)', () => {
      return request(app.getHttpServer())
        .patch(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: `${uniqueTag}-edited` })
        .expect(200);
    });

    // 🔒 DELETION SECURITY
    it('DELETE /tags/:id - Guest blocked (401)', () => {
      return request(app.getHttpServer()).delete(`/api/tags/${tagId}`).expect(401);
    });

    it('DELETE /tags/:id - Hacker blocked (403)', () => {
      return request(app.getHttpServer()).delete(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${hackerToken}`).expect(403);
    });

    it('DELETE /tags/:id - Owner blocked (403)', () => {
      // Regular users cannot delete global tags
      return request(app.getHttpServer()).delete(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${ownerToken}`).expect(403);
    });

    // ✅ PROOF: Only Admin can delete tags
    it('DELETE /tags/:id - Admin Success (200)', () => {
      return request(app.getHttpServer()).delete(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
    });
  });

  // =================================================================
  // 3. SNIPPETS (Private Data)
  // =================================================================
  describe('3. Snippets Endpoints', () => {
    it('POST /snippets - Guest blocked (401)', () => {
      return request(app.getHttpServer()).post('/api/snippets').expect(401);
    });

    it('POST /snippets - Owner Creates Private Snippet (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/snippets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ 
          title: 'Private Data', 
          content: 'secret', 
          language: 'txt', 
          visibility: 'PRIVATE', 
          tags: [] 
        })
        .expect(201);
      snippetId = res.body.id;
    });
    
    // 🔴 PUBLIC LIST (Snippet List)
    it('GET /snippets - Public Access (200)', () => {
        return request(app.getHttpServer()).get('/api/snippets').expect(200);
    });

    // 🔒 READ SECURITY
    it('GET /snippets/:id - Hacker blocked (403)', () => {
      return request(app.getHttpServer()).get(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${hackerToken}`).expect(403);
    });

    it('GET /snippets/:id - Owner Success (200)', () => {
      return request(app.getHttpServer()).get(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    });

    // 🔒 UPDATE SECURITY
    it('PATCH /snippets/:id - Hacker blocked (403)', () => {
      return request(app.getHttpServer()).patch(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${hackerToken}`)
        .send({ title: 'Hacked' }).expect(403);
    });

    it('PATCH /snippets/:id - Owner Success (200)', () => {
      return request(app.getHttpServer()).patch(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Safe' }).expect(200);
    });

    // 🔴 LIKE ENDPOINT (Specific Logic)
    it('POST /snippets/:id/like - Guest blocked (401)', () => {
         return request(app.getHttpServer()).post(`/api/snippets/${snippetId}/like`).expect(401);
    });

    it('POST /snippets/:id/like - Owner Likes (201)', () => {
        return request(app.getHttpServer()).post(`/api/snippets/${snippetId}/like`)
            .set('Authorization', `Bearer ${ownerToken}`).expect(201);
    });

    // 🔒 DELETE SECURITY (Moderation)
    it('DELETE /snippets/:id - Hacker blocked (403)', () => {
      return request(app.getHttpServer()).delete(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${hackerToken}`).expect(403);
    });

    // ✅ PROOF: Admin can delete ANY snippet (Moderation)
    it('DELETE /snippets/:id - Admin Success (200)', () => {
      return request(app.getHttpServer()).delete(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
    });
  });

  // =================================================================
  // 4. USERS (Admin View)
  // =================================================================
  describe('4. Users Endpoints', () => {
    // 🔒 LIST SECURITY
    it('GET /users - Guest blocked (401)', () => {
      return request(app.getHttpServer()).get('/api/users').expect(401);
    });

    it('GET /users - Hacker blocked (403)', () => {
      return request(app.getHttpServer()).get('/api/users')
        .set('Authorization', `Bearer ${hackerToken}`).expect(403);
    });

    it('GET /users - Owner blocked (403)', () => {
      return request(app.getHttpServer()).get('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`).expect(403);
    });

    // ✅ PROOF: Admin CAN view users
    it('GET /users - Admin Success (200)', () => {
      return request(app.getHttpServer()).get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
    });

    // 🔴 GET SINGLE USER (Missing from short version)
    it('GET /users/:id - Owner views self (200)', () => {
         return request(app.getHttpServer()).get(`/api/users/${ownerUserId}`)
             .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    });

    // 🔒 DELETE SECURITY
    it('DELETE /users/:id - Hacker blocked from deleting Owner (403)', () => {
      return request(app.getHttpServer()).delete(`/api/users/${ownerUserId}`)
        .set('Authorization', `Bearer ${hackerToken}`).expect(403);
    });

    // ✅ PROOF: Owner CAN delete themselves
    it('DELETE /users/:id - Owner Self-Delete (200)', () => {
      return request(app.getHttpServer()).delete(`/api/users/${ownerUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    });
  });

  it('DELETE /users/:id - Admin deletes Hacker (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const hackerUser = res.body.find(u => u.username.startsWith('hacker_'));
      
      if (hackerUser) {
        return request(app.getHttpServer())
          .delete(`/api/users/${hackerUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });

  afterAll(async () => {
    await app.close();
  });
});