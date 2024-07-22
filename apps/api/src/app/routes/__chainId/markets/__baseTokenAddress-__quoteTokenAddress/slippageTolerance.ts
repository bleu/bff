import { SlippageService, slippageServiceSymbol } from '@cowprotocol/services';
import { ChainIdSchema, ETHEREUM_ADDRESS_PATTERN } from '../../../../schemas';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../../inversify.config';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../../utils/cache';
import { deprecate } from 'util';

const CACHE_SECONDS = 120;

const routeSchema = {
  type: 'object',
  required: ['chainId', 'baseTokenAddress', 'quoteTokenAddress'],
  additionalProperties: false,
  properties: {
    chainId: ChainIdSchema,
    baseTokenAddress: {
      title: 'Base token address',
      description: 'Currency that is being bought or sold.',
      type: 'string',
      pattern: ETHEREUM_ADDRESS_PATTERN,
    },
    quoteTokenAddress: {
      title: 'Quote token address',
      description: ' Currency in which the price of the base token is quoted.',
      type: 'string',
      pattern: ETHEREUM_ADDRESS_PATTERN,
    },
  },
} as const satisfies JSONSchema;
const successSchema = {
  type: 'object',
  required: ['slippageBps'],
  additionalProperties: false,
  properties: {
    slippageBps: {
      title: 'Slippage tolerance in basis points',
      description:
        'Slippage tolerance in basis points. One basis point is equivalent to 0.01% (1/100th of a percent)',
      type: 'number',
      examples: [50, 100, 200],
      minimum: 0,
      maximum: 10000,
    },
  },
} as const satisfies JSONSchema;

type RouteSchema = FromSchema<typeof routeSchema>;
type SuccessSchema = FromSchema<typeof successSchema>;

const slippageService: SlippageService = apiContainer.get(
  slippageServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // example: http://localhost:3010/1/markets/0x6b175474e89094c44da98b954eedeac495271d0f-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599/slippageTolerance
  fastify.get<{
    Params: RouteSchema;
    Reply: SuccessSchema;
  }>(
    '/slippageTolerance',
    {
      schema: {
        params: routeSchema,
        response: {
          '2XX': successSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId, baseTokenAddress, quoteTokenAddress } = request.params;
      fastify.log.info(
        `Get default slippage for market ${baseTokenAddress}-${quoteTokenAddress} on chain ${chainId}`
      );
      const slippageBps = await slippageService.getSlippageBps(
        baseTokenAddress,
        quoteTokenAddress
      );
      reply.header(
        CACHE_CONTROL_HEADER,
        getCacheControlHeaderValue(CACHE_SECONDS)
      );
      reply.send({ slippageBps });
    }
  );
};

export default root;
