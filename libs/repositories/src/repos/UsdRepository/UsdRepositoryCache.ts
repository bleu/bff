import { inject, injectable } from 'inversify';
import {
  PricePoint,
  PriceStrategy,
  UsdRepository,
  deserializePricePoints,
  serializePricePoints,
} from './UsdRepository';
import { SupportedChainId } from '@cowprotocol/shared';
import { CacheRepository } from '../CacheRepository/CacheRepository';
import { getCacheKey, PartialCacheKey } from '../../utils/cache';

const NULL_VALUE = 'null';

@injectable()
export class UsdRepositoryCache implements UsdRepository {
  private baseCacheKey: PartialCacheKey[];

  constructor(
    private proxy: UsdRepository,
    private cache: CacheRepository,
    private cacheName: string,
    private cacheTimeValueSeconds: number,
    private cacheTimeNullSeconds: number
  ) {
    this.baseCacheKey = ['repos', this.cacheName];
  }

  async getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null> {
    // Get price from cache
    const key = getCacheKey(
      ...this.baseCacheKey,
      'usd-price',
      chainId,
      tokenAddress
    );
    const usdPriceCached = await this.getValueFromCache({
      key,
      convertFn: parseFloat,
    });

    if (usdPriceCached !== undefined) {
      // Return cached price (if available)
      return usdPriceCached;
    }

    // Get the usd Price (delegate call)
    const usdPrice = await this.proxy.getUsdPrice(chainId, tokenAddress);

    // Cache price (or absence of it)
    this.cacheValue({
      key,
      value: usdPrice?.toString() || null,
    });

    return usdPrice;
  }
  async getUsdPrices(
    chainId: SupportedChainId,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    const key = getCacheKey(
      ...this.baseCacheKey,
      'usd-prices',
      chainId,
      tokenAddress,
      priceStrategy
    );

    // Get price from cache
    const usdPriceCached = await this.getValueFromCache({
      key,
      convertFn: deserializePricePoints,
    });

    if (usdPriceCached !== undefined) {
      // Return cached prices (if available)
      return usdPriceCached;
    }

    // Get the usd Prices (delegate call)
    const usdPrices = await this.proxy.getUsdPrices(
      chainId,
      tokenAddress,
      priceStrategy
    );

    // Cache prices (or absence of it)
    this.cacheValue({
      key,
      value: usdPrices ? serializePricePoints(usdPrices) : null,
    });

    return usdPrices;
  }

  private async getValueFromCache<T>(props: {
    key: string;
    convertFn: (value: string) => T;
  }): Promise<T | null | undefined> {
    const { key, convertFn } = props;

    const valueString = await this.cache.get(key);
    if (valueString) {
      return valueString === NULL_VALUE ? null : convertFn(valueString);
    }

    return undefined;
  }

  private async cacheValue<T>(props: {
    key: string;
    value: string | null;
  }): Promise<void> {
    const { key, value } = props;

    const cacheTimeSeconds =
      value === null ? this.cacheTimeNullSeconds : this.cacheTimeValueSeconds;

    await this.cache.set(
      key,
      value === null ? NULL_VALUE : value,
      cacheTimeSeconds
    );
  }
}
