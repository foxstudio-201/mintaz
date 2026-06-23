// JWT auth wiring as a Fastify plugin.
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { config } from '../config.js';

async function authPlugin(fastify) {
  fastify.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.tokenTtl },
  });

  // Guard for protected routes.
  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });
}

export default fp(authPlugin);
