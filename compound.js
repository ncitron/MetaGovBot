const { default: axios } = require('axios');
const { ethers } = require("ethers");
require("dotenv").config()

const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL);
const signer = new ethers.Wallet(process.env.PRIV_KEY, provider);

const spaceName = process.env.SPACE_NAME;
const webhook = process.env.DISCORD_WEBHOOK;

const eventSignature = "ProposalCreated(uint256,address,address[],uint256[],string[],bytes[],uint256,uint256,string)"
const eventReadable = ["event ProposalCreated(uint id, address proposer, address[] targets, uint[] values, string[] signatures, bytes[] calldatas, uint startBlock, uint endBlock, string description)"]

const filter = {
    address: process.env.COMPOUND_BRAVO_ADDRESS,
    topics: [
        ethers.utils.id(eventSignature)
    ]
}

provider.on(filter, async (log, event) => {
    const interface = new ethers.utils.Interface(eventReadable);
    const decodedEvent = interface.decodeEventLog("ProposalCreated", log.data);

    const id = decodedEvent.id.toNumber();
    const endBlock = decodedEvent.endBlock.toNumber();
    const desc = decodedEvent.description;

    const ipfsHash = await makeCompSnapshot(signer, id, desc, endBlock);
    await messageDiscord(ipfsHash, id, desc);

    console.log(ipfsHash);
});

const makeCompSnapshot = async (signer, id, desc, endBlock) => {

    const space = await (await axios.get("https://hub.snapshot.page/api/spaces/" + spaceName)).data;
    const description = `This proposal is for voting on Compound's proposal #${id} using DPI. Please review the proposal here: https://compound.finance/governance/proposals/${id}`
    
    const now = Math.floor(Date.now()/1000);
    const endTime = now + 13 * (endBlock - await signer.provider.getBlockNumber()) - 24 * 60 * 60;

    const prop = {
        version: "0.1.3",
        timestamp: (now-600) + "",
        space: spaceName,
        type: "proposal",
        payload: {
            name: `[COMPOUND-${id}] ${desc.split("#")[1].trim()}`,
            body: description,
            choices: ["For","Against"],
            start: now,
            end: endTime,
            snapshot: await signer.provider.getBlockNumber(),
            metadata: {
                strategies: space.strategies
            }
        }
    }

    const data = {
        address: await signer.getAddress(),
        msg: JSON.stringify(prop),
        sig: await signer.signMessage(JSON.stringify(prop))
    }
    
    const config = {
        method: 'post',
        url: 'https://hub.snapshot.org/api/message',
        headers: { 
            'Content-Type': 'application/json', 
        },
        data : data
    };

    const res = await axios(config);
    return res.data.ipfsHash;
}

const messageDiscord = async (ipfsHash, id, desc) => {
    const message = `A new proposal has been created for [COMPOUND-${id}] ${desc.split("#")[1].trim()}. This proposal is for voting on Compound's proposal #${id} using DPI. Please review the proposal here: https://snapshot.org/#/${spaceName}/proposal/${ipfsHash}`
    const data = JSON.stringify({ content: message });
    const config = {
        method: 'post',
        url: webhook,
        headers: { 
            'Content-Type': 'application/json', 
        },
        data : data
    }

    return await axios(config);
}