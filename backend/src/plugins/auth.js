import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { config } from '../config.js';

async function authPlugin(fastify) {
  fastify.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.tokenTtl },
  });

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });
}

export default fp(authPlugin);
