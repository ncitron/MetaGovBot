import { default as axios } from "axios";
import axiosRetry from "axios-retry";
import { ethers, Wallet, providers } from "ethers";
import getQuorum from "../utils/getQuorum";
import postToDiscord from "../utils/postToDiscord";
import postToSlack from "../utils/postToSlack";
import { postToSnapshot } from "../utils/postToSnapshot";

require("dotenv").config();

axiosRetry(axios, { retries: 3 });

export class SnapshotMirror {

    _spaces: string[];
    _currentProps: string[];

    constructor(spaces: string[]) {
        this._spaces = spaces;
    }

    async watchSnapshot() {
        this._currentProps = await this._getCurrentProposals();
        setInterval(async () => await this._checkNewProp(), parseInt(process.env.DELAY));
    }

    async _checkNewProp() {
        const currentProps = await this._getCurrentProposals();
    
        const newProps = currentProps.filter(prop => !this._currentProps.includes(prop));

        if (newProps.length > 0) {
            const res = await axios.get("https://ipfs.io/ipfs/" + newProps[0]).catch(err => {
                console.error(err);
                throw err;
            });

            const quorum = await getQuorum();
            const hash = await this._postToSnapshot(newProps[0], res.data, quorum);
            console.log(hash);
            this._postToDiscord(hash, res.data, quorum);
        }

        this._currentProps = currentProps;
    }

    async _getCurrentProposals(): Promise<string[]> {
        return (await Promise.all(this._spaces.map(async space => {

            var data = JSON.stringify({
              query: `{
                proposals (
                    where: {space_in: ["${space}"]},
                    orderBy: "created",
                    first: 1000000
                ) {
                    id
                    ipfs
                    title
                    created
                }
            }`,
              variables: {}
            });
            
            var config = {
              method: 'get',
              url: 'https://hub.snapshot.org/graphql',
              headers: { 
                'Content-Type': 'application/json'
              },
              data : data
            };
            
            const rawProps = (await axios(config as any)).data.data.proposals;
            return rawProps.map(prop => prop.ipfs);

        }))).flat();
    }

    async _postToSnapshot(hash: string, prop, quorum: string) {
        const provider: providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        const signer: Wallet = new Wallet(process.env.PRIV_KEY, provider);

        const msg = JSON.parse(prop.msg);
        const space: string = msg.space;
        const res = await axios.get(process.env.SNAPSHOT_HUB + `/api/spaces/${space}`).catch(err => {
            console.error(err);
            throw err;
        });
        const spaceName = res.data.name.toUpperCase();
        const payload = msg.payload;
        return await postToSnapshot(
            signer,
            `[${spaceName}] ${payload.name}`,
            `This proposal is for voting on ${spaceName}'s newest proposal using DPI. Please review the proposal here: https://snapshot.org/#/${space}/proposal/${hash} \n\n Quorum for this vote is ${quorum} INDEX.`,
            payload.end - 24 * 60 * 60,
            process.env.SPACE_NAME,
            payload.choices
        );
    }

    async _postToDiscord(hash: string, prop, quorum: string) {
        const msg = JSON.parse(prop.msg);
        const space: string = msg.space;
        const res = await axios.get(process.env.SNAPSHOT_HUB + `/api/spaces/${space}`).catch(err => {
            console.error(err);
            return null;
        })
        const spaceName = res.data.name.toUpperCase();
        const payload = msg.payload;

        const message = `A new proposal has been created for [${spaceName}] ${payload.name}. This proposal is for voting on ${spaceName}'s newest proposal using DPI. Please review the proposal here: https://snapshot.org/#/${process.env.SPACE_NAME}/proposal/${hash} \n\n Quorum for this vote is ${quorum} INDEX.`
        postToSlack(message, process.env.SLACK_WEBHOOK);
        postToDiscord(message, process.env.DISCORD_WEBHOOK);
    }

}