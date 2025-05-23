import { UsdRepository, usdRepositorySymbol } from '@cowprotocol/repositories';
import { SupportedChainId } from '@cowprotocol/shared';
import { injectable, inject } from 'inversify';

export interface UsdService {
  getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null>;
}

export const usdServiceSymbol = Symbol.for('UsdService');

@injectable()
export class UsdServiceMain implements UsdService {
  constructor(
    @inject(usdRepositorySymbol)
    private usdRepository: UsdRepository
  ) {}

  async getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null> {
    return this.usdRepository.getUsdPrice(chainId, tokenAddress);
  }
}
