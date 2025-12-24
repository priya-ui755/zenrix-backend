const request = require('supertest');
const { expect } = require('chai');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

describe('Products API - delete & auth flow', function() {
  this.timeout(20000);
  let mongoServer;
  let app;
  let token;
  let createdProductId = null;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.ADMIN_PASSWORD = 'testpass';
    process.env.JWT_SECRET = 'testsecret';
    // Require app after envs are set
    app = require('../server');
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('should login as admin', async function() {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ password: 'testpass' })
      .set('Accept', 'application/json');

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token');
    token = res.body.token;
  });

  it('should create a product (protected)', async function() {
    const product = {
      name: 'Test Delete Product',
      price: 9.99,
      description: 'Temporary product for delete test',
      image: 'https://example.com/img.png',
      category: 'other',
      stock: 1,
      featured: false,
      rating: 4.0
    };

    const res = await request(app)
      .post('/api/products')
      .send(product)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + token);

    expect(res.status).to.be.oneOf([200,201]);
    expect(res.body).to.have.property('success', true);
    expect(res.body).to.have.property('data');
    createdProductId = res.body.data._id;
  });

  it('should update the product (protected)', async function() {
    const res = await request(app)
      .put(`/api/products/${createdProductId}`)
      .send({ price: 19.99 })
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + token);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success', true);
    expect(res.body.data).to.have.property('price', 19.99);
  });

  it('should delete the product (protected)', async function() {
    const res = await request(app)
      .delete(`/api/products/${createdProductId}`)
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer ' + token);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('success', true);
    expect(res.body).to.have.property('deletedId', createdProductId);
  });

  it('deleted product should not be retrievable', async function() {
    const res = await request(app)
      .get(`/api/products/${createdProductId}`)
      .set('Accept', 'application/json');

    expect(res.status).to.equal(404);
    expect(res.body).to.have.property('success', false);
  });
});