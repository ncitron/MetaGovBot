import { Wallet } from "ethers";
import { Result } from "ethers/lib/utils";
import postToDiscord from "../utils/postToDiscord";
import postToSnapshot from "../utils/postToSnapshot";
import { watch } from "../utils/watcher";

require("dotenv").config();


export const watchUniswap = () => {

    const eventName = "ProposalCreated"
    const eventSignature = "ProposalCreated(uint256,address,address[],uint256[],string[],bytes[],uint256,uint256,string)"
    const eventReadable = ["event ProposalCreated(uint id, address proposer, address[] targets, uint[] values, string[] signatures, bytes[] calldatas, uint startBlock, uint endBlock, string description)"]

    watch(process.env.UNISWAP_GOVERNANCE_ADDRESS, eventName, eventSignature, eventReadable, onEvent);
}

const onEvent = async (event: Result, signer: Wallet, spaceName: string, webhook: string) => {
    const id: number = event.id.toNumber();
    const endBlock: number = event.endBlock.toNumber();
    const desc: string = event.description;

    const d = desc.split("#")
    const propTitleRaw = d.length > 1 ? d[1].trim() : "";
    const propTitle = propTitleRaw.length < 250 ? propTitleRaw : "";

    const ipfsHash = await makeUniSnapshot(signer, id, propTitle, endBlock, spaceName);
    await messageDiscord(ipfsHash, id, propTitle, spaceName, webhook);

    console.log(ipfsHash);
}

const makeUniSnapshot = async (signer: Wallet, id: number, desc: string, endBlock: number, spaceName: string) => {

    const description = `This proposal is for voting on Uniswap's proposal #${id} using DPI. Please review the proposal here: https://app.uniswap.org/#/vote/${id}`
    const title = `[UNISWAP-${id}] ${desc}`

    return postToSnapshot(signer, title, description, endBlock, spaceName, ["For","Against"]);
}

const messageDiscord = async (ipfsHash: string, id: number, desc: string, spaceName: string, webhook: string) => {
    const message = `A new proposal has been created for [UNISWAP-${id}] ${desc}. This proposal is for voting on Uniswap's proposal #${id} using DPI. Please review the proposal here: https://snapshot.org/#/${spaceName}/proposal/${ipfsHash}`
    return await postToDiscord(message, webhook);
}