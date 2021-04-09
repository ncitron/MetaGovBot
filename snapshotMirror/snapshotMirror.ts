import { default as axios } from "axios";
import { ethers, Wallet, providers } from "ethers";
import postToSnapshot, { rawPost } from "../utils/postToSnapshot";

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
    
        let newProps = currentProps.filter(prop => !this._currentProps.includes(prop));

        if (newProps.length > 0) {
            const res = await axios.get("https://ipfs.io/ipfs/" + newProps[0]);
            this._postToSnapshot(newProps[0], res.data);
        }

        this._currentProps = currentProps;
    }

    async _getCurrentProposals(): Promise<string[]> {
        return (await Promise.all(this._spaces.map(async space => {
            const res = await axios.get(`https://hub.snapshot.page/api/${space}/proposals`)
            return Object.keys(res.data);
        }))).flat();
    }

    async _postToSnapshot(hash: string, prop) {
        const provider: providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL);
        const signer: Wallet = new Wallet(process.env.PRIV_KEY, provider);

        const msg = JSON.parse(prop.msg);
        const space: string = msg.space;
        const spaceName = space.replace(".eth", "").toUpperCase();
        const payload = msg.payload;
        rawPost(
            signer,
            `[${spaceName}] ${payload.name}`,
            `This proposal is for voting on ${spaceName}'s newest proposal using DPI. Please review the proposal here: https://snapshot.org/#/${space}/proposal/${hash}`,
            payload.end - 24 * 60 * 60,
            process.env.SPACE_NAME,
            payload.choices
        );
    }

}