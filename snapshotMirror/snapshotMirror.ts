import { default as axios } from "axios";
import { ethers, Wallet, providers } from "ethers";
import postToDiscord from "../utils/postToDiscord";
import { postToSnapshot } from "../utils/postToSnapshot";

require("dotenv").config();

export class SnapshotMirror {

    _spaces: string[];
    _currentProps: string[];

    constructor(spaces: string[]) {
        this._spaces = spaces;
    }

    async watchSnapshot() {
        this._currentProps = await this._getCurrentProposals();
        setInterval(async () => await this._checkNewProp(), 5000)
    }

    async _checkNewProp() {
        const currentProps = await this._getCurrentProposals();
    
        const newProps = currentProps.filter(prop => !this._currentProps.includes(prop));

        if (newProps.length > 0) {
            const res = await axios.get("https://ipfs.io/ipfs/" + newProps[0]);
            const hash = await this._postToSnapshot(newProps[0], res.data);
            console.log(hash);
            this._postToDiscord(hash, res.data);
        }

        this._currentProps = currentProps;
    }

    async _getCurrentProposals(): Promise<string[]> {
        return (await Promise.all(this._spaces.map(async space => {
            const coreMembers = (await axios.get(process.env.SNAPSHOT_HUB + `/api/spaces/${space}`)).data.members;
            const res = await axios.get(process.env.SNAPSHOT_HUB + `/api/${space}/proposals`)
            const props = res.data;
            const propHashes = Object.keys(res.data);
            return propHashes.filter(hash => coreMembers.includes(props[hash].address));
        }))).flat();
    }

    async _postToSnapshot(hash: string, prop) {
        const provider: providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const signer: Wallet = new Wallet(process.env.PRIV_KEY, provider);

        const msg = JSON.parse(prop.msg);
        const space: string = msg.space;
        const spaceName = (await axios.get(process.env.SNAPSHOT_HUB + `/api/spaces/${space}`)).data.name.toUpperCase();
        const payload = msg.payload;
        return await postToSnapshot(
            signer,
            `[${spaceName}] ${payload.name}`,
            `This proposal is for voting on ${spaceName}'s newest proposal using DPI. Please review the proposal here: https://snapshot.org/#/${space}/proposal/${hash}`,
            payload.end - 24 * 60 * 60,
            process.env.SPACE_NAME,
            payload.choices
        );
    }

    async _postToDiscord(hash: string, prop) {
        const msg = JSON.parse(prop.msg);
        const space: string = msg.space;
        const spaceName = (await axios.get(process.env.SNAPSHOT_HUB + `/api/spaces/${space}`)).data.name.toUpperCase();
        const payload = msg.payload;

        const message = `A new proposal has been created for [${spaceName}] ${payload.name}. This proposal is for voting on ${spaceName}'s newest proposal using DPI. Please review the proposal here: https://snapshot.org/#/${process.env.SPACE_NAME}/proposal/${hash}`
        postToDiscord(message, process.env.DISCORD_WEBHOOK);
    }

}