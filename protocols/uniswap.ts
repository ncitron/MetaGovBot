import { ethers, providers, Wallet } from "ethers";
import postToDiscord from "../utils/postToDiscord";
import postToSnapshot from "../utils/postToSnapshot";

require("dotenv").config();

export const watchUniswap = () => {
    const provider: providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL);
    const signer: Wallet = new Wallet(process.env.PRIV_KEY, provider);

    const spaceName = process.env.SPACE_NAME;
    const webhook = process.env.DISCORD_WEBHOOK;

    const eventSignature = "ProposalCreated(uint256,address,address[],uint256[],string[],bytes[],uint256,uint256,string)"
    const eventReadable = ["event ProposalCreated(uint id, address proposer, address[] targets, uint[] values, string[] signatures, bytes[] calldatas, uint startBlock, uint endBlock, string description)"]

    const filter = {
        address: process.env.UNISWAP_GOVERNANCE_ADDRESS,
        topics: [
            ethers.utils.id(eventSignature)
        ]
    }

    provider.on(filter, async (log, _) => {
        const iface = new ethers.utils.Interface(eventReadable);
        const decodedEvent = iface.decodeEventLog("ProposalCreated", log.data);

        const id = decodedEvent.id.toNumber();
        const endBlock = decodedEvent.endBlock.toNumber();
        const desc = decodedEvent.description;

        const ipfsHash = await makeUniSnapshot(signer, id, desc, endBlock, spaceName);
        await messageDiscord(ipfsHash, id, desc, spaceName, webhook);

        console.log(ipfsHash);
    });
}

const makeUniSnapshot = async (signer: Wallet, id: number, desc: string, endBlock: number, spaceName: string) => {

    const description = `This proposal is for voting on Uniswap's proposal #${id} using DPI. Please review the proposal here: https://app.uniswap.org/#/vote/${id}`
    const title = `[UNISWAP-${id}] ${desc.split("#")[1].trim()}`

    return postToSnapshot(signer, title, description, endBlock, spaceName);
}

const messageDiscord = async (ipfsHash: string, id: number, desc: string, spaceName: string, webhook: string) => {
    const message = `A new proposal has been created for [UNISWAP-${id}] ${desc.split("#")[1].trim()}. This proposal is for voting on Uniswap's proposal #${id} using DPI. Please review the proposal here: https://snapshot.org/#/${spaceName}/proposal/${ipfsHash}`
    return await postToDiscord(message, webhook);
}