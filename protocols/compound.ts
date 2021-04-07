import { Wallet } from "ethers";
import { Result } from "ethers/lib/utils";
import postToDiscord from "../utils/postToDiscord";
import postToSnapshot from "../utils/postToSnapshot";
import { watch } from "./watcher";

require("dotenv").config();

export const watchCompound = () => {

    const eventName = "ProposalCreated"
    const eventSignature = "ProposalCreated(uint256,address,address[],uint256[],string[],bytes[],uint256,uint256,string)"
    const eventReadable = ["event ProposalCreated(uint id, address proposer, address[] targets, uint[] values, string[] signatures, bytes[] calldatas, uint startBlock, uint endBlock, string description)"]

    watch(process.env.COMPOUND_BRAVO_ADDRESS, eventName, eventSignature, eventReadable, onEvent);
}

const onEvent = async (event: Result, signer: Wallet, spaceName: string, webhook: string) => {
    const id: number = event.id.toNumber();
    const endBlock: number = event.endBlock.toNumber();
    const desc: string = event.description;

    const d = desc.split("#")
    const propTitle = d.length > 1 ? d[1].trim() : "";

    const ipfsHash = await makeCompSnapshot(signer, id, propTitle, endBlock, spaceName);
    await messageDiscord(ipfsHash, id, propTitle, spaceName, webhook);

    console.log(ipfsHash);
}

const makeCompSnapshot = async (signer: Wallet, id: number, desc: string, endBlock: number, spaceName: string) => {

    const description = `This proposal is for voting on Compound's proposal #${id} using DPI. Please review the proposal here: https://compound.finance/governance/proposals/${id}`
    const title = `[COMPOUND-${id}] ${desc}`

    return postToSnapshot(signer, title, description, endBlock, spaceName, ["For","Against"]);
}

const messageDiscord = async (ipfsHash: string, id: number, desc: string, spaceName: string, webhook: string) => {
    const message = `A new proposal has been created for [COMPOUND-${id}] ${desc}. This proposal is for voting on Compound's proposal #${id} using DPI. Please review the proposal here: https://snapshot.org/#/${spaceName}/proposal/${ipfsHash}`
    console.log(id);
    console.log(message);
    return await postToDiscord(message, webhook);
}