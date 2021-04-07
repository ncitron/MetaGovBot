import { ethers, Wallet, providers } from "ethers";
import { default as axios } from "axios";
import * as bs58 from "bs58";

import postToDiscord from "../utils/postToDiscord";
import postToSnapshot from "../utils/postToSnapshot";


export const watchAave = async () => {

    const provider: providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL);
    const signer: Wallet = new Wallet(process.env.PRIV_KEY, provider);

    const spaceName = process.env.SPACE_NAME;
    const webhook = process.env.DISCORD_WEBHOOK;

    const eventSignature = "ProposalCreated(uint256,address,address,address[],uint256[],string[],bytes[],bool[],uint256,uint256,address,bytes32)";
    const eventReadable = ["event ProposalCreated(uint256 id,address indexed creator, address indexed executor, address[] targets, uint256[] values,string[] signatures,bytes[] calldatas,bool[] withDelegatecalls,uint256 startBlock,uint256 endBlock,address strategy,bytes32 ipfsHash)"];

    const filter = {
        address: process.env.AAVE_GOVERNANCE_ADDRESS,
        topics: [
            ethers.utils.id(eventSignature)
        ]
    }

    provider.on(filter, async (log, _) => {
        const iface = new ethers.utils.Interface(eventReadable);
        const decodedEvent = iface.decodeEventLog("ProposalCreated", log.data);

        const id = decodedEvent.id.toNumber();
        const endBlock = decodedEvent.endBlock.toNumber();
        const propIpfsRaw = decodedEvent.ipfsHash.replace("0x", "");

        const bytes = Buffer.from("1220" + propIpfsRaw, 'hex');
        const propIpfs = bs58.encode(bytes);
        
        const res = await axios.get("https://ipfs.io/ipfs/" + propIpfs);
        const title = res.data.title;

        const ipfsHash = await makeAaveSnapshot(signer, id, propIpfs, title, endBlock, spaceName);
        await messageDiscord(ipfsHash, id, title, spaceName, webhook);

        console.log(ipfsHash);
    });
}

const makeAaveSnapshot = async (signer: Wallet, id: number, hash: string, propTitle: string, endBlock: number, spaceName: string) => {

    const description = `This proposal is for voting on Aave's proposal #${id+5} using DPI. Please review the proposal here: https://app.aave.com/governance/${id}-${hash}`
    const title = `[AAVE-${id+5}] ${propTitle}`

    return postToSnapshot(signer, title, description, endBlock, spaceName, ["For","Against"]);
}

const messageDiscord = async (ipfsHash: string, id: number, title: string, spaceName: string, webhook: string) => {
    const message = `A new proposal has been created for [AAVE-${id+5}] ${title}. This proposal is for voting on Aave's proposal #${id+5} using DPI. Please review the proposal here: https://snapshot.org/#/${spaceName}/proposal/${ipfsHash}`
    return await postToDiscord(message, webhook);
}