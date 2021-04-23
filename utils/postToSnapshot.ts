import { Wallet } from "ethers";
import { default as axios } from "axios";

require("dotenv").config();

export const postToSnapshotBlocknum = async (signer: Wallet, title: string, description: string, endBlock: number, spaceName: string, choices: string[]) => {
    const now = Math.floor(Date.now()/1000);
    const endTime = now + 13 * (endBlock - await signer.provider.getBlockNumber()) - 24 * 60 * 60;
    
    return postToSnapshot(signer, title, description, endTime, spaceName, choices);
}

export const postToSnapshot = async (signer: Wallet, title: string, description: string, endTime: number, spaceName: string, choices: string[]) => {

    const space = await (await axios.get(process.env.SNAPSHOT_HUB + "/api/spaces/" + spaceName)).data;
    const version = await (await axios.get(process.env.SNAPSHOT_HUB + "/api")).data.version;

    const now = Math.floor(Date.now()/1000);

    const prop = {
        version: version,
        timestamp: (now-60) + "",
        space: spaceName,
        type: "proposal",
        payload: {
            name: title,
            body: description,
            choices: choices,
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
        url: process.env.SNAPSHOT_HUB + '/api/message',
        headers: { 
            'Content-Type': 'application/json', 
        },
        data : data
    };

    try {
        const res = await axios(config as any);
        return res.data.ipfsHash;
    } catch (e) {
        console.error(e);
    }
}