/*-
 *
 * Hedera Mirror Node Explorer
 *
 * Copyright (C) 2021 - 2024 Hedera Hashgraph, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {EntityCache} from "@/utils/cache/base/EntityCache";
import {Nft, Nfts} from "@/schemas/HederaSchemas";
import axios, {AxiosResponse} from "axios";
import {TokenInfoCache} from "@/utils/cache/TokenInfoCache";

export class NftCollectionCache extends EntityCache<string, NftCollectionInfo[]> {

    public static readonly instance = new NftCollectionCache()

    //
    // Cache
    //

    protected async load(accountId: string): Promise<NftCollectionInfo[]> {
        const result: NftCollectionInfo[] = []
        let nextURL: string | null = "api/v1/accounts/" + accountId + "/nfts"
        const params = {
            limit: 100 as number | undefined,
            order: 'ASC' as string | undefined
        }
        while (nextURL !== null) {
            const response: AxiosResponse<Nfts> = await axios.get<Nfts>(nextURL, {params: params})
            await this.appendNfts(response.data.nfts ?? [], result)
            nextURL = response.data.links?.next ?? null
            params.limit = undefined
            params.order = undefined
        }
        return Promise.resolve(result)
    }

    //
    // Private
    //

    private async appendNfts(nfts: Nft[], result: NftCollectionInfo[]) {
        for (const nft of nfts) {
           await this.appendNft(nft, result)
        }
    }

    private async appendNft(nft: Nft, result: NftCollectionInfo[]) {

        //
        // Nfts[] are returned in a specific order.
        // See https://testnet.mirrornode.hedera.com/api/v1/docs/#/accounts/listNftByAccountId
        // Logic below assumes this ordering
        //

        const lastCollection = result.length >= 1 ? result[result.length - 1] : null
        if (lastCollection !== null && lastCollection.tokenId === nft.token_id) {
            lastCollection.serials.push(nft.serial_number)
        } else {
           const info = await TokenInfoCache.instance.lookup(nft.token_id ?? '')
            result.push(new NftCollectionInfo(
                nft.token_id ?? null,
                info?.name ?? null,
                info?.symbol ?? null,
                nft.serial_number
            ))
        }
    }
}

export class NftCollectionInfo {

    public readonly tokenId: string | null
    public readonly tokenName: string | null
    public readonly tokenSymbol: string | null
    public serials: number[]

    public constructor(
        tokenId: string | null,
        tokenName: string | null,
        tokenSymbol: string | null,
        firstSample: number
    ) {
        this.tokenId = tokenId
        this.tokenName = tokenName
        this.tokenSymbol = tokenSymbol
        this.serials = [firstSample]
    }
}