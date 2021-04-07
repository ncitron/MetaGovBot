import { Wallet } from "ethers";
import { default as axios } from "axios";

export default async (signer: Wallet, title: string, description: string, endBlock: number, spaceName: string, choices: string[]) => {
    const space = await (await axios.get("https://hub.snapshot.page/api/spaces/" + spaceName)).data;

    const now = Math.floor(Date.now()/1000);
    const endTime = now + 13 * (endBlock - await signer.provider.getBlockNumber()) - 24 * 60 * 60;

    const prop = {
        version: "0.1.3",
        timestamp: (now-600) + "",
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
        url: 'https://hub.snapshot.org/api/message',
        headers: { 
            'Content-Type': 'application/json', 
        },
        data : data
    };

    const res = await axios(config as any);
    return res.data.ipfsHash;
}