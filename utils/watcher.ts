import { ethers, providers, Wallet } from "ethers";
import { Result } from "ethers/lib/utils";

require("dotenv").config();


type Callback = (event: Result, signer: Wallet, spaceName: string, webhook: string) => void

export const watch = async (address: string, eventName: string, eventSignature: string, eventReadable: string[], callBack: Callback) => {

    const provider: providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const signer: Wallet = new Wallet(process.env.PRIV_KEY, provider);

    const spaceName = process.env.SPACE_NAME;
    const webhook = process.env.DISCORD_WEBHOOK;

    const filter = {
        address: address,
        topics: [
            ethers.utils.id(eventSignature)
        ]
    }

    provider.on(filter, async (log, _) => {
        const iface = new ethers.utils.Interface(eventReadable);
        const decodedEvent = iface.decodeEventLog(eventName, log.data);
        callBack(decodedEvent, signer, spaceName, webhook);
    });
}