import { default as axios } from "axios";

export default async (message: string, webhook: string) => {
    const data = JSON.stringify({ text: message });
    const config = {
        method: 'post',
        url: webhook,
        headers: { 
            'Content-Type': 'application/json', 
        },
        data : data
    }

    return await axios(config as any);
}