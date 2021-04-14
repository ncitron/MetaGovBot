import { Wallet } from "ethers";
import { Result } from "ethers/lib/utils";
import { default as axios } from "axios";
import * as bs58 from "bs58";

import postToDiscord from "../utils/postToDiscord";
import postToSnapshot from "../utils/postToSnapshot";
import { watch } from "../utils/watcher";

require("dotenv").config();


export const watchAave = async () => {

    const eventName = "ProposalCreated";
    const eventSignature = "ProposalCreated(uint256,address,address,address[],uint256[],string[],bytes[],bool[],uint256,uint256,address,bytes32)";
    const eventReadable = ["event ProposalCreated(uint256 id,address indexed creator, address indexed executor, address[] targets, uint256[] values,string[] signatures,bytes[] calldatas,bool[] withDelegatecalls,uint256 startBlock,uint256 endBlock,address strategy,bytes32 ipfsHash)"];

    watch(process.env.AAVE_GOVERNANCE_ADDRESS, eventName, eventSignature, eventReadable, onEvent);
}

const onEvent = async (event: Result, signer: Wallet, spaceName: string, webhook: string) => {
    const id = event.id.toNumber();
    const endBlock = event.endBlock.toNumber();
    const propIpfsRaw = event.ipfsHash.replace("0x", "");

    const bytes = Buffer.from("1220" + propIpfsRaw, 'hex');
    const propIpfs = bs58.encode(bytes);
    
    const res = await axios.get("https://ipfs.io/ipfs/" + propIpfs);
    const titleRaw = res.data.title;
    const title = titleRaw.length < 250 ? titleRaw : "";

    const ipfsHash = await makeAaveSnapshot(signer, id, propIpfs, title, endBlock, spaceName);
    await messageDiscord(ipfsHash, id, title, spaceName, webhook);

    console.log(ipfsHash);
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