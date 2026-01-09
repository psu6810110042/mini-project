import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as http from 'http';
import { AppModule } from '../src/app.module';

// Interfaces for type-safe response bodies
interface LoginResponse {
  accessToken?: string;
  access_token?: string;
  user: {
    id: number;
  };
}
interface Tag {
  id: number;
  name: string;
}
interface Snippet {
  id: string;
}
interface User {
  id: number;
  username: string;
}

describe('AppController (e2e) - Complete Security Matrix', () => {
  let app: INestApplication;
  let server: http.Server;

  let adminToken: string;
  let ownerToken: string;
  let hackerToken: string;

  let ownerUserId: number;
  let tagId: number;
  let snippetId: string;

  const timestamp = Date.now();
  const uniqueTag = `final-tag-${timestamp}`;

  const adminUser = { username: `khetadmin`, password: 'adminkhet123' };
  const ownerUser = { username: `owner_${timestamp}`, password: 'password123' };
  const hackerUser = {
    username: `hacker_${timestamp}`,
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    server = app.getHttpServer() as http.Server;
  });

  // =================================================================
  // 1. AUTHENTICATION (Register & Login)
  // =================================================================
  describe('1. Auth: Register & Login (All Roles)', () => {
    it('POST /auth/register - Create Admin, Owner, Hacker', async () => {
      await request(server)
        .post('/api/auth/register')
        .send(ownerUser)
        .expect(201);
      await request(server)
        .post('/api/auth/register')
        .send(hackerUser)
        .expect(201);
    });

    it('POST /auth/login - Get Tokens', async () => {
      // Admin
      const aRes = await request(server)
        .post('/api/auth/login')
        .send(adminUser)
        .expect(201);
      const adminBody = aRes.body as LoginResponse;
      adminToken = (adminBody.access_token || adminBody.accessToken) as string;

      // Owner
      const oRes = await request(server)
        .post('/api/auth/login')
        .send(ownerUser)
        .expect(201);
      const ownerBody = oRes.body as LoginResponse;
      ownerToken = (ownerBody.access_token || ownerBody.accessToken) as string;
      ownerUserId = ownerBody.user.id;

      // Hacker
      const hRes = await request(server)
        .post('/api/auth/login')
        .send(hackerUser)
        .expect(201);
      const hackerBody = hRes.body as LoginResponse;
      hackerToken = (hackerBody.access_token ||
        hackerBody.accessToken) as string;
    });
  });

  // =================================================================
  // 2. TAGS (Global Data - Admin Managed)
  // =================================================================
  describe('2. Tags Endpoints', () => {
    it('POST /tags - Guest blocked (401)', () => {
      return request(server)
        .post('/api/tags')
        .send({ name: 'fail' })
        .expect(401);
    });

    it('POST /tags - Owner Creates Tag (201)', async () => {
      const res = await request(server)
        .post('/api/tags')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: uniqueTag })
        .expect(201);
      tagId = (res.body as Tag).id;
    });

    it('GET /tags - Public Access (200)', () => {
      return request(server).get('/api/tags').expect(200);
    });

    it('GET /tags/:id - Public Access (200)', () => {
      return request(server).get(`/api/tags/${tagId}`).expect(200);
    });

    it('PATCH /tags/:id - Guest blocked (401)', () => {
      return request(server)
        .patch(`/api/tags/${tagId}`)
        .send({ name: 'fail' })
        .expect(401);
    });

    it('PATCH /tags/:id - Owner Updates (200)', () => {
      return request(server)
        .patch(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: `${uniqueTag}-edited` })
        .expect(200);
    });

    it('DELETE /tags/:id - Guest blocked (401)', () => {
      return request(server).delete(`/api/tags/${tagId}`).expect(401);
    });

    it('DELETE /tags/:id - Hacker blocked (403)', () => {
      return request(server)
        .delete(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${hackerToken}`)
        .expect(403);
    });

    it('DELETE /tags/:id - Owner blocked (403)', () => {
      // Regular users cannot delete global tags
      return request(server)
        .delete(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('DELETE /tags/:id - Admin Success (200)', () => {
      return request(server)
        .delete(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // =================================================================
  // 3. SNIPPETS (Private Data)
  // =================================================================
  describe('3. Snippets Endpoints', () => {
    it('POST /snippets - Guest blocked (401)', () => {
      return request(server).post('/api/snippets').expect(401);
    });

    it('POST /snippets - Owner Creates Private Snippet (201)', async () => {
      const res = await request(server)
        .post('/api/snippets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Private Data',
          content: 'secret',
          language: 'txt',
          visibility: 'PRIVATE',
          tags: [],
        })
        .expect(201);
      snippetId = (res.body as Snippet).id;
    });

    it('GET /snippets - Public Access (200)', () => {
      return request(server).get('/api/snippets').expect(200);
    });

    it('GET /snippets/:id - Hacker blocked (403)', () => {
      return request(server)
        .get(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${hackerToken}`)
        .expect(403);
    });

    it('GET /snippets/:id - Owner Success (200)', () => {
      return request(server)
        .get(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('PATCH /snippets/:id - Hacker blocked (403)', () => {
      return request(server)
        .patch(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${hackerToken}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });

    it('PATCH /snippets/:id - Owner Success (200)', () => {
      return request(server)
        .patch(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Safe' })
        .expect(200);
    });

    it('POST /snippets/:id/like - Guest blocked (401)', () => {
      return request(server)
        .post(`/api/snippets/${snippetId}/like`)
        .expect(401);
    });

    it('POST /snippets/:id/like - Owner Likes (201)', () => {
      return request(server)
        .post(`/api/snippets/${snippetId}/like`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);
    });

    it('DELETE /snippets/:id - Hacker blocked (403)', () => {
      return request(server)
        .delete(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${hackerToken}`)
        .expect(403);
    });

    it('DELETE /snippets/:id - Admin Success (200)', () => {
      return request(server)
        .delete(`/api/snippets/${snippetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // =================================================================
  // 4. USERS (Admin View)
  // =================================================================
  describe('4. Users Endpoints', () => {
    it('GET /users - Guest blocked (401)', () => {
      return request(server).get('/api/users').expect(401);
    });

    it('GET /users - Hacker blocked (403)', () => {
      return request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${hackerToken}`)
        .expect(403);
    });

    it('GET /users - Owner blocked (403)', () => {
      return request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });

    it('GET /users - Admin Success (200)', () => {
      return request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('GET /users/:id - Owner views self (200)', () => {
      return request(server)
        .get(`/api/users/${ownerUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('DELETE /users/:id - Hacker blocked from deleting Owner (403)', () => {
      return request(server)
        .delete(`/api/users/${ownerUserId}`)
        .set('Authorization', `Bearer ${hackerToken}`)
        .expect(403);
    });

    it('DELETE /users/:id - Owner Self-Delete (200)', () => {
      return request(server)
        .delete(`/api/users/${ownerUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('DELETE /users/:id - Admin deletes Hacker (200)', async () => {
      const res = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const users = res.body as User[];
      const hackerUser = users.find((u) => u.username.startsWith('hacker_'));
      expect(hackerUser).toBeDefined();

      await request(server)
        .delete(`/api/users/${hackerUser!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
